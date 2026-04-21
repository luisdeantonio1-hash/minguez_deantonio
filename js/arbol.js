/**
 * arbol.js
 * Tree viewer based on:
 * - data/arbol.json      -> unions (ids only)
 * - data/personas-index.json -> fast id -> json path lookup
 * - data/personas/*.json -> person details
 */

(function () {
  "use strict";

  var NODE_W = 148;
  var NODE_H = 96;
  var H_GAP = 48;
  var V_GAP = 88;
  var ROW_STEP = NODE_H + V_GAP;
  var COL_STEP = NODE_W + H_GAP;

  var NS = "http://www.w3.org/2000/svg";

  var GENDER_COLOR = {
    male: "#4a7a9b",
    female: "#9b4a6e",
    unknown: "#7a9060"
  };

  var GENDER_EMOJI = {
    male: "M",
    female: "F",
    unknown: "?"
  };

  var transform = { x: 0, y: 0, scale: 1 };
  var dragging = false;
  var dragStart = null;

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function normalizeDataPath(value) {
    if (!value) {
      return "";
    }

    var normalized = String(value).replace(/\\/g, "/").trim();

    try {
      var parsed = new URL(normalized, window.location.href);
      if (parsed.origin === window.location.origin) {
        normalized = parsed.pathname;
      } else {
        normalized = parsed.href;
      }
    } catch (error) {
      // Keep raw value.
    }

    return normalized
      .replace(/^\.\/+/, "")
      .replace(/^\/+/, "");
  }

  function getLaunchTarget() {
    var params = new URLSearchParams(window.location.search);
    return {
      id: params.get("id") || "",
      dataPath: normalizeDataPath(params.get("data") || "")
    };
  }

  function svgEl(tag, attrs) {
    var element = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (key) {
      element.setAttribute(key, attrs[key]);
    });
    return element;
  }

  function fetchJson(path) {
    return fetch(path).then(function (response) {
      if (!response.ok) {
        throw new Error("No se pudo cargar " + path);
      }
      return response.json();
    });
  }

  function getFactValue(facts, label) {
    var expected = normalizeText(label);
    var list = Array.isArray(facts) ? facts : [];

    for (var i = 0; i < list.length; i += 1) {
      if (normalizeText(list[i].label) === expected) {
        return list[i].value || "";
      }
    }

    return "";
  }

  function extractYear(value) {
    if (!value) {
      return "";
    }

    var text = String(value).trim();
    var slash = text.match(/\/(\d{4})$/);
    if (slash) {
      return slash[1];
    }

    var plain = text.match(/\b(\d{4})\b/);
    return plain ? plain[1] : "";
  }

  function formatYears(person) {
    var born = getFactValue(person.facts, "Nacimiento") || person.born || "";
    var died = getFactValue(person.facts, "Fallecimiento") || person.died || "";
    var bornYear = extractYear(born);
    var diedYear = extractYear(died);

    if (!bornYear && !diedYear) {
      return "";
    }

    if (bornYear && diedYear) {
      return bornYear + " - " + diedYear;
    }

    if (bornYear) {
      return "n. " + bornYear;
    }

    return "+ " + diedYear;
  }

  function getReferencedIds(unions) {
    var set = {};

    (Array.isArray(unions) ? unions : []).forEach(function (union) {
      (union.partners || []).forEach(function (id) {
        if (id) {
          set[id] = true;
        }
      });
      (union.children || []).forEach(function (id) {
        if (id) {
          set[id] = true;
        }
      });
    });

    return Object.keys(set);
  }

  function loadPersonRecordsById(ids, byId) {
    var requests = ids.map(function (id) {
      var personPath = byId[id];
      if (!personPath) {
        return Promise.resolve(null);
      }

      return fetchJson(personPath)
        .then(function (record) {
          record.__id = record.id || id;
          record.__path = personPath;
          return record;
        })
        .catch(function () {
          return null;
        });
    });

    return Promise.all(requests).then(function (results) {
      return results.filter(Boolean);
    });
  }

  function sanitizeUnion(union) {
    return {
      id: union.id,
      partners: Array.isArray(union.partners) ? union.partners.slice() : [],
      children: Array.isArray(union.children) ? union.children.slice() : [],
      type: union.type || "married",
      married: union.married || null
    };
  }

  function buildGraph(unions, records, byId) {
    var nodes = {};
    var unionMap = {};
    var recordById = {};

    records.forEach(function (record) {
      if (record && record.id) {
        recordById[record.id] = record;
      }
      if (record && record.__id && !recordById[record.__id]) {
        recordById[record.__id] = record;
      }
    });

    getReferencedIds(unions).forEach(function (id) {
      var record = recordById[id] || null;
      nodes[id] = {
        id: id,
        record: record,
        name: record ? (record.name || id) : id,
        years: record ? formatYears(record) : "",
        photo: record && record.heroImage ? record.heroImage.src : null,
        gender: record && record.gender ? record.gender : "unknown",
        personPath: record ? record.__path : (byId[id] || null),
        parentUnion: null,
        unionIds: []
      };
    });

    (Array.isArray(unions) ? unions : []).forEach(function (union) {
      if (!union || !union.id) {
        return;
      }

      var clean = sanitizeUnion(union);
      unionMap[clean.id] = clean;

      clean.partners.forEach(function (id) {
        if (!nodes[id]) {
          nodes[id] = {
            id: id,
            record: null,
            name: id,
            years: "",
            photo: null,
            gender: "unknown",
            personPath: byId[id] || null,
            parentUnion: null,
            unionIds: []
          };
        }
        nodes[id].unionIds.push(clean.id);
      });

      clean.children.forEach(function (id) {
        if (!nodes[id]) {
          nodes[id] = {
            id: id,
            record: null,
            name: id,
            years: "",
            photo: null,
            gender: "unknown",
            personPath: byId[id] || null,
            parentUnion: null,
            unionIds: []
          };
        }
        nodes[id].parentUnion = clean.id;
      });
    });

    return { nodes: nodes, unionMap: unionMap };
  }

 function computeLayout(graph) {
   var nodes = graph.nodes;
   var unionMap = graph.unionMap;

   var generation = {};
   var changed = true;

   // 1️⃣ Inicializar generaciones
   Object.keys(nodes).forEach(function (id) {
     generation[id] = null;
   });

   // 2️⃣ Raíces reales (sin padres)
   Object.keys(nodes).forEach(function (id) {
     if (!nodes[id].parentUnion) {
       generation[id] = 0;
     }
   });

   // 3️⃣ Propagación iterativa
   var MAX_ITER = 10;
   var iter = 0;

   while (changed && iter < MAX_ITER) {
     changed = false;
     iter++;

     // 🔽 PADRES → HIJOS
     Object.keys(unionMap).forEach(function (unionId) {
       var union = unionMap[unionId];

       var parentGens = (union.partners || [])
         .map(function (id) { return generation[id]; })
         .filter(function (g) { return g !== null; });

       if (!parentGens.length) return;

       var baseGen = Math.max.apply(null, parentGens);

       (union.children || []).forEach(function (childId) {
         var newGen = baseGen + 2;

         if (generation[childId] === null || generation[childId] < newGen) {
           generation[childId] = newGen;
           changed = true;
         }
       });
     });

     // 🤝 ALINEAR PAREJAS (sin bajar generaciones)
     Object.keys(unionMap).forEach(function (unionId) {
       var union = unionMap[unionId];

       var partnerGens = (union.partners || [])
         .map(function (id) { return generation[id]; })
         .filter(function (g) { return g !== null; });

       if (!partnerGens.length) return;

       var maxGen = Math.max.apply(null, partnerGens);

       (union.partners || []).forEach(function (id) {
         if (generation[id] === null || generation[id] < maxGen) {
           generation[id] = maxGen;
           changed = true;
         }
       });
     });
   }

   // 4️⃣ Fallback: nodos sueltos
   Object.keys(nodes).forEach(function (id) {
     if (generation[id] === null) {
       generation[id] = 0;
     }
   });

   // =========================
   // 📐 ORDEN Y POSICIONADO
   // =========================

   var byGeneration = {};

   Object.keys(generation).forEach(function (id) {
     var g = generation[id];
     if (!byGeneration[g]) byGeneration[g] = [];
     byGeneration[g].push(id);
   });

   var generationKeys = Object.keys(byGeneration)
     .map(Number)
     .sort(function (a, b) { return a - b; });

   var position = {};
   var row = 0;

   generationKeys.forEach(function (g) {
     var ids = byGeneration[g];

     // Agrupar parejas juntas
     var used = {};
     var ordered = [];

     Object.keys(unionMap).forEach(function (unionId) {
       var partners = (unionMap[unionId].partners || []).filter(function (id) {
         return ids.indexOf(id) !== -1;
       });

       if (partners.length < 2) return;

       var hasUnused = partners.some(function (id) {
         return !used[id];
       });

       if (!hasUnused) return;

       partners.forEach(function (id) {
         if (!used[id]) {
           ordered.push(id);
           used[id] = true;
         }
       });
     });

     var rest = ids.filter(function (id) {
       return !used[id];
     });

     rest.sort(function (a, b) {
       return a.localeCompare(b, "es", { sensitivity: "base" });
     });

     ids = ordered.concat(rest);

     var total = ids.length;

     ids.forEach(function (id, index) {
       position[id] = {
         x: (index - (total - 1) / 2) * COL_STEP,
         y: row * ROW_STEP
       };
     });

     row++;
   });

   // =========================
   // 💠 POSICIÓN DE UNIONES
   // =========================

   var unionPosition = {};

   Object.keys(unionMap).forEach(function (unionId) {
     var union = unionMap[unionId];

     if (!union.partners || union.partners.length < 2) return;

     var a = position[union.partners[0]];
     var b = position[union.partners[1]];

     if (!a || !b) return;

     unionPosition[unionId] = {
       x: (a.x + b.x) / 2,
       y: (a.y + b.y) / 2
     };
   });

   return {
     pos: position,
     unionPos: unionPosition
   };
 }

  function renderConnectors(graph, layout) {
    var group = document.getElementById("tree-connectors");
    group.innerHTML = "";

    Object.keys(graph.unionMap).forEach(function (unionId) {
      var union = graph.unionMap[unionId];
      if (!union.partners || union.partners.length < 2) {
        return;
      }

      var a = layout.pos[union.partners[0]];
      var b = layout.pos[union.partners[1]];
      var mid = layout.unionPos[unionId];
      if (!a || !b || !mid) {
        return;
      }

      var type = union.type || "married";
      var x1 = a.x + NODE_W / 2;
      var y1 = a.y + NODE_H / 2;
      var x2 = b.x + NODE_W / 2;
      var y2 = b.y + NODE_H / 2;

      group.appendChild(svgEl("line", {
        x1: x1,
        y1: y1,
        x2: x2,
        y2: y2,
        "class": "tree-conn-partner tree-conn-partner--" + type
      }));

      var cx = mid.x + NODE_W / 2;
      var cy = mid.y + NODE_H / 2;
      var size = 5;

      group.appendChild(svgEl("polygon", {
        points:
          cx + "," + (cy - size) + " " +
          (cx + size) + "," + cy + " " +
          cx + "," + (cy + size) + " " +
          (cx - size) + "," + cy,
        "class": "tree-union-diamond tree-union-diamond--" + type
      }));

      var childAnchors = (union.children || []).map(function (childId) {
        var child = layout.pos[childId];
        if (!child) {
          return null;
        }
        return {
          x: child.x + NODE_W / 2,
          y: child.y - 8
        };
      }).filter(Boolean);

      if (!childAnchors.length) {
        return;
      }

      var startY = cy + size;
      var minChildY = Math.min.apply(null, childAnchors.map(function (point) { return point.y; }));
      var busY = Math.min(minChildY - 18, startY + 94);
      if (busY < startY + 14) {
        busY = startY + 14;
      }

      group.appendChild(svgEl("line", {
        x1: cx,
        y1: startY,
        x2: cx,
        y2: busY,
        "class": "tree-conn-child"
      }));

      var minX = Math.min.apply(null, childAnchors.map(function (point) { return point.x; }));
      var maxX = Math.max.apply(null, childAnchors.map(function (point) { return point.x; }));

      var H_MIN = 0;

      var xStart = minX;
      var xEnd = maxX;

      // 👇 caso 1 solo hijo → forzar pequeño tramo horizontal
      if (minX === maxX) {
        xStart = Math.min(cx, minX) - H_MIN / 2;
        xEnd = Math.max(cx, maxX) + H_MIN / 2;
      }

      group.appendChild(svgEl("line", {
        x1: xStart,
        y1: busY,
        x2: xEnd,
        y2: busY,
        "class": "tree-conn-child"
      }));

      childAnchors.forEach(function (point) {
        group.appendChild(svgEl("line", {
          x1: point.x,
          y1: busY,
          x2: point.x,
          y2: point.y + 50,
          "class": "tree-conn-child"
        }));
      });
    });
  }

  function renderNodes(graph, layout, onClick) {
    var group = document.getElementById("tree-nodes");
    group.innerHTML = "";

    Object.keys(graph.nodes).forEach(function (id) {
      var node = graph.nodes[id];
      var point = layout.pos[id];
      if (!point) {
        return;
      }

      var accent = GENDER_COLOR[node.gender] || GENDER_COLOR.unknown;
      var foreign = svgEl("foreignObject", {
        x: point.x,
        y: point.y,
        width: NODE_W,
        height: NODE_H,
        overflow: "visible"
      });
      foreign.dataset.pid = id;

      var card = document.createElement("div");
      card.className = "tree-node-card";
      card.style.setProperty("--node-accent", accent);
      card.setAttribute("tabindex", "0");
      card.setAttribute("role", "button");
      card.setAttribute("aria-label", "Ver ficha de " + node.name);

      var avatar = document.createElement("div");
      avatar.className = "tree-node-avatar";
      avatar.style.borderColor = accent + "55";

      if (node.photo) {
        var image = document.createElement("img");
        image.src = node.photo;
        image.alt = node.name;
        avatar.appendChild(image);
      } else {
        avatar.textContent = GENDER_EMOJI[node.gender] || "?";
      }

      var name = document.createElement("div");
      name.className = "tree-node-name";
      name.textContent = node.name;

      var years = document.createElement("div");
      years.className = "tree-node-years";
      years.textContent = node.years;

      card.appendChild(avatar);
      card.appendChild(name);
      card.appendChild(years);

      card.addEventListener("click", function (event) {
        event.stopPropagation();
        onClick(id);
      });

      card.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick(id);
        }
      });

      foreign.appendChild(card);
      group.appendChild(foreign);
    });
  }

  function buildDetailUrl(node, detailTemplate) {
    var template = detailTemplate || "persona.html";
    var params = new URLSearchParams();

    params.set("id", node.id);
    if (node.personPath) {
      params.set("data", node.personPath);
    }

    return template + "?" + params.toString();
  }

  function openPanel(personId, graph, layout, detailTemplate) {
    var node = graph.nodes[personId];
    if (!node) {
      return;
    }

    document.querySelectorAll(".tree-node-card--selected").forEach(function (element) {
      element.classList.remove("tree-node-card--selected");
    });

    var foreign = document.querySelector("#tree-nodes foreignObject[data-pid='" + personId + "']");
    if (foreign) {
      var card = foreign.querySelector(".tree-node-card");
      if (card) {
        card.classList.add("tree-node-card--selected");
      }
    }

    var panel = document.getElementById("tree-panel");
    var header = document.getElementById("tree-panel-header");
    var body = document.getElementById("tree-panel-body");

    var accent = GENDER_COLOR[node.gender] || GENDER_COLOR.unknown;
    var avatarHtml = node.photo
      ? '<img src="' + escapeHtml(node.photo) + '" alt="' + escapeHtml(node.name) + '">'
      : escapeHtml(GENDER_EMOJI[node.gender] || "?");

    header.innerHTML =
      '<div class="tree-panel__avatar" style="border-color:' + accent + '55">' + avatarHtml + "</div>" +
      '<p class="tree-panel__name">' + escapeHtml(node.name) + "</p>" +
      '<p class="tree-panel__years">' + escapeHtml(node.years) + "</p>";

    var html = "";

    if (node.record && node.record.summary) {
      html +=
        '<div class="tree-panel__section">' +
          '<p class="tree-panel__section-label">Resumen</p>' +
          '<p class="tree-panel__section-text">' + escapeHtml(node.record.summary) + '</p>' +
        '</div>';
    }

    if (node.parentUnion && graph.unionMap[node.parentUnion]) {
      var parentUnion = graph.unionMap[node.parentUnion];
      html += '<div class="tree-panel__section"><p class="tree-panel__section-label">Padres</p>';

      parentUnion.partners.forEach(function (parentId) {
        var parentNode = graph.nodes[parentId];
        if (!parentNode) {
          return;
        }

        var parentColor = GENDER_COLOR[parentNode.gender] || GENDER_COLOR.unknown;
        var role = parentNode.gender === "male"
          ? "Padre"
          : parentNode.gender === "female"
            ? "Madre"
            : "Progenitor";

        html +=
          '<div class="tree-panel__ref" data-pid="' + escapeHtml(parentId) + '">' +
            '<div class="tree-panel__ref-dot" style="background:' + parentColor + '"></div>' +
            '<span class="tree-panel__ref-name">' + escapeHtml(parentNode.name) + '</span>' +
            '<span class="tree-panel__ref-role">' + role + '</span>' +
          '</div>';
      });

      html += '</div>';
    }

    node.unionIds.forEach(function (unionId) {
      var union = graph.unionMap[unionId];
      if (!union) {
        return;
      }

      var typeLabel = {
        married: "Matrimonio",
        divorced: "Divorciados",
        unmarried: "Sin matrimonio"
      }[union.type] || "Union";

      var dateSuffix = union.married ? " · " + union.married : "";

      html +=
        '<div class="tree-panel__section">' +
          '<p class="tree-panel__section-label">' + escapeHtml(typeLabel + dateSuffix) + '</p>';

      union.partners.forEach(function (partnerId) {
        if (partnerId === personId) {
          return;
        }

        var partnerNode = graph.nodes[partnerId];
        if (!partnerNode) {
          return;
        }

        var partnerColor = GENDER_COLOR[partnerNode.gender] || GENDER_COLOR.unknown;

        html +=
          '<div class="tree-panel__ref" data-pid="' + escapeHtml(partnerId) + '">' +
            '<div class="tree-panel__ref-dot" style="background:' + partnerColor + '"></div>' +
            '<span class="tree-panel__ref-name">' + escapeHtml(partnerNode.name) + '</span>' +
            '<span class="tree-panel__ref-role">Pareja</span>' +
          '</div>';
      });

      if (union.children && union.children.length) {
        html += '<p class="tree-panel__section-label" style="margin-top:.5rem">Hijos</p>';

        union.children.forEach(function (childId) {
          var childNode = graph.nodes[childId];
          if (!childNode) {
            return;
          }

          var childColor = GENDER_COLOR[childNode.gender] || GENDER_COLOR.unknown;
          var childRole = childNode.gender === "male"
            ? "Hijo"
            : childNode.gender === "female"
              ? "Hija"
              : "Hijo/a";

          html +=
            '<div class="tree-panel__ref" data-pid="' + escapeHtml(childId) + '">' +
              '<div class="tree-panel__ref-dot" style="background:' + childColor + '"></div>' +
              '<span class="tree-panel__ref-name">' + escapeHtml(childNode.name) + '</span>' +
              '<span class="tree-panel__ref-role">' + childRole + '</span>' +
            '</div>';
        });
      }

      html += '</div>';
    });

    if (node.personPath || node.id) {
      html +=
        '<a class="tree-panel__profile-link" href="' +
        escapeHtml(buildDetailUrl(node, detailTemplate)) +
        '">Ver ficha completa -></a>';
    }

    body.innerHTML = html;

    body.querySelectorAll(".tree-panel__ref[data-pid]").forEach(function (element) {
      element.addEventListener("click", function () {
        var targetId = element.dataset.pid;
        openPanel(targetId, graph, layout, detailTemplate);
        centerOn(targetId, layout);
      });
    });

    panel.hidden = false;
  }

  function closePanel() {
    var panel = document.getElementById("tree-panel");
    panel.hidden = true;

    document.querySelectorAll(".tree-node-card--selected").forEach(function (element) {
      element.classList.remove("tree-node-card--selected");
    });
  }

  function applyTransform() {
    var viewport = document.getElementById("tree-viewport");
    viewport.setAttribute(
      "transform",
      "translate(" + transform.x + "," + transform.y + ") scale(" + transform.scale + ")"
    );
  }

  function zoom(factor, cx, cy) {
    var wrapper = document.getElementById("tree-wrapper");
    var rect = wrapper.getBoundingClientRect();
    var mouseX = cx !== undefined ? cx : rect.width / 2;
    var mouseY = cy !== undefined ? cy : rect.height / 2;

    var nextScale = Math.max(0.15, Math.min(3, transform.scale * factor));
    var ratio = nextScale / transform.scale;

    transform.x = mouseX - ratio * (mouseX - transform.x);
    transform.y = mouseY - ratio * (mouseY - transform.y);
    transform.scale = nextScale;

    applyTransform();
  }

  function fitAll(layout) {
    var ids = Object.keys(layout.pos);
    if (!ids.length) {
      return;
    }

    var xs = ids.map(function (id) { return layout.pos[id].x; });
    var ys = ids.map(function (id) { return layout.pos[id].y; });

    var minX = Math.min.apply(null, xs);
    var maxX = Math.max.apply(null, xs) + NODE_W;
    var minY = Math.min.apply(null, ys);
    var maxY = Math.max.apply(null, ys) + NODE_H;

    var wrapper = document.getElementById("tree-wrapper");
    var width = wrapper.clientWidth;
    var height = wrapper.clientHeight;
    var padding = 48;

    var scaleX = (width - padding * 2) / (maxX - minX);
    var scaleY = (height - padding * 2) / (maxY - minY);

    transform.scale = Math.min(scaleX, scaleY, 1.2);
    transform.x = width / 2 - (minX + (maxX - minX) / 2) * transform.scale;
    transform.y = height / 2 - (minY + (maxY - minY) / 2) * transform.scale;

    applyTransform();
  }

  function centerOn(personId, layout) {
    var point = layout.pos[personId];
    if (!point) {
      return;
    }

    var wrapper = document.getElementById("tree-wrapper");
    var width = wrapper.clientWidth;
    var height = wrapper.clientHeight;

    transform.x = width / 2 - (point.x + NODE_W / 2) * transform.scale;
    transform.y = height / 2 - (point.y + NODE_H / 2) * transform.scale;

    applyTransform();
  }

  function initPanZoom(layout) {
    var wrapper = document.getElementById("tree-wrapper");

    wrapper.addEventListener("mousedown", function (event) {
      if (event.target.closest(".tree-node-card, .tree-union-diamond")) {
        return;
      }
      dragging = true;
      dragStart = {
        x: event.clientX - transform.x,
        y: event.clientY - transform.y
      };
    });

    window.addEventListener("mousemove", function (event) {
      if (!dragging) {
        return;
      }
      transform.x = event.clientX - dragStart.x;
      transform.y = event.clientY - dragStart.y;
      applyTransform();
    });

    window.addEventListener("mouseup", function () {
      dragging = false;
    });

    wrapper.addEventListener("wheel", function (event) {
      event.preventDefault();
      var rect = wrapper.getBoundingClientRect();
      var factor = event.deltaY < 0 ? 1.1 : 0.9;
      zoom(factor, event.clientX - rect.left, event.clientY - rect.top);
    }, { passive: false });

    var lastTouch = null;

    wrapper.addEventListener("touchstart", function (event) {
      if (event.touches.length === 1) {
        lastTouch = {
          x: event.touches[0].clientX,
          y: event.touches[0].clientY
        };
      }
    }, { passive: true });

    wrapper.addEventListener("touchmove", function (event) {
      if (event.touches.length === 1 && lastTouch) {
        var dx = event.touches[0].clientX - lastTouch.x;
        var dy = event.touches[0].clientY - lastTouch.y;
        transform.x += dx;
        transform.y += dy;
        lastTouch = {
          x: event.touches[0].clientX,
          y: event.touches[0].clientY
        };
        applyTransform();
      }
    }, { passive: true });

    wrapper.addEventListener("touchend", function () {
      lastTouch = null;
    }, { passive: true });

    document.getElementById("btn-zoom-in").addEventListener("click", function () {
      zoom(1.15);
    });

    document.getElementById("btn-zoom-out").addEventListener("click", function () {
      zoom(1 / 1.15);
    });

    document.getElementById("btn-fit").addEventListener("click", function () {
      fitAll(layout);
    });
  }

  function openInitialTarget(target, graph, layout, detailTemplate) {
    if (target.id && graph.nodes[target.id]) {
      openPanel(target.id, graph, layout, detailTemplate);
      centerOn(target.id, layout);
      return;
    }

    if (!target.dataPath) {
      return;
    }

    var personId = Object.keys(graph.nodes).find(function (id) {
      return normalizeDataPath(graph.nodes[id].personPath) === target.dataPath;
    });

    if (personId) {
      openPanel(personId, graph, layout, detailTemplate);
      centerOn(personId, layout);
    }
  }

  function init() {
    var loadingElement = document.getElementById("tree-loading");
    var errorElement = document.getElementById("tree-error");
    var target = getLaunchTarget();

    Promise.all([
      fetchJson("data/arbol.json"),
      fetchJson("data/personas-index.json").catch(function () { return { byId: {} }; })
    ])
      .then(function (payload) {
        var config = payload[0] || {};
        var indexPayload = payload[1] || {};
        var byId = indexPayload.byId && typeof indexPayload.byId === "object" ? indexPayload.byId : {};
        var unions = Array.isArray(config.unions) ? config.unions : [];
        var detailTemplate = config.detailTemplate || "persona.html";
        var ids = getReferencedIds(unions);

        return loadPersonRecordsById(ids, byId).then(function (records) {
          return {
            graph: buildGraph(unions, records, byId),
            detailTemplate: detailTemplate
          };
        });
      })
      .then(function (payload) {
        var graph = payload.graph;
        var detailTemplate = payload.detailTemplate;
        var layout = computeLayout(graph);

        if (loadingElement) {
          loadingElement.remove();
        }

        renderConnectors(graph, layout);
        renderNodes(graph, layout, function (personId) {
          openPanel(personId, graph, layout, detailTemplate);
          centerOn(personId, layout);
        });

        initPanZoom(layout);
        fitAll(layout);
        openInitialTarget(target, graph, layout, detailTemplate);

        document.getElementById("tree-panel-close").addEventListener("click", closePanel);

        document.getElementById("tree-wrapper").addEventListener("click", function (event) {
          if (!event.target.closest(".tree-node-card")) {
            closePanel();
          }
        });
      })
      .catch(function (error) {
        console.error("arbol.js:", error);
        if (loadingElement) {
          loadingElement.remove();
        }
        if (errorElement) {
          errorElement.hidden = false;
        }
      });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
