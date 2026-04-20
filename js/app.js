function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getPageConfig() {
  var page = document.querySelector(".page");

  return {
    listSrc: page ? page.dataset.recordsSrc : "data/lista.json",
    detailTemplate: page ? page.dataset.detailTemplate : "persona.html"
  };
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatColumnLabel(key) {
  if (!key) {
    return "";
  }

  return key.charAt(0).toUpperCase() + key.slice(1);
}

function readPathValue(object, path) {
  if (!path) {
    return "";
  }

  return path.split(".").reduce(function (current, part) {
    if (current && Object.prototype.hasOwnProperty.call(current, part)) {
      return current[part];
    }

    return undefined;
  }, object);
}

function getFactValue(record, label) {
  var facts = Array.isArray(record.facts) ? record.facts : [];
  var targetLabel = normalizeText(label);

  for (var i = 0; i < facts.length; i += 1) {
    if (normalizeText(facts[i].label) === targetLabel) {
      return facts[i].value;
    }
  }

  return "";
}

function getColumnValue(record, column) {
  var source = column && column.source ? column.source : column.id;
  var value;

  if (!source) {
    return "";
  }

  if (source.indexOf("fact:") === 0) {
    value = getFactValue(record, source.slice(5));
  } else {
    value = readPathValue(record, source);
  }

  if (value === null || value === undefined || value === "") {
    return column && column.defaultValue ? column.defaultValue : "";
  }

  return String(value);
}

function getColumns(records, configuredColumns) {
  if (Array.isArray(configuredColumns) && configuredColumns.length) {
    return configuredColumns.map(function (column, index) {
      if (typeof column === "string") {
        return {
          id: column,
          label: formatColumnLabel(column),
          source: column
        };
      }

      return {
        id: column.id || column.source || "column-" + index,
        label: column.label || formatColumnLabel(column.id || column.source || ""),
        source: column.source || column.id,
        defaultValue: column.defaultValue || ""
      };
    });
  }

  var inferred = [];

  records.forEach(function (record) {
    Object.keys(record).forEach(function (key) {
      var value = record[key];
      var isPrimitive = value === null || ["string", "number", "boolean"].indexOf(typeof value) !== -1;

      if (isPrimitive && inferred.indexOf(key) === -1) {
        inferred.push(key);
      }
    });
  });

  return inferred.map(function (key) {
    return {
      id: key,
      label: formatColumnLabel(key),
      source: key
    };
  });
}

function sortRecords(records, sortConfig) {
  if (!sortConfig || !sortConfig.source) {
    return records;
  }

  var direction = normalizeText(sortConfig.direction) === "desc" ? -1 : 1;
  var column = {
    source: sortConfig.source,
    defaultValue: ""
  };

  return records.slice().sort(function (a, b) {
    var aValue = normalizeText(getColumnValue(a, column));
    var bValue = normalizeText(getColumnValue(b, column));

    if (aValue < bValue) {
      return -1 * direction;
    }

    if (aValue > bValue) {
      return 1 * direction;
    }

    return 0;
  });
}

function toUniqueList(values) {
  return values.filter(function (value, index) {
    return values.indexOf(value) === index;
  });
}

function resolveHref(baseUrl, href) {
  try {
    return new URL(href, baseUrl).href;
  } catch (error) {
    return "";
  }
}

function toPathOrUrl(value) {
  try {
    var url = new URL(value, window.location.href);
    if (url.origin === window.location.origin) {
      return url.pathname + url.search;
    }

    return url.href;
  } catch (error) {
    return value;
  }
}

function listPersonFiles(directoryUrl) {
  return fetch(directoryUrl)
    .then(function (response) {
      if (!response.ok) {
        throw new Error("Directorio no disponible");
      }

      return response.text().then(function (html) {
        return {
          html: html,
          baseUrl: response.url
        };
      });
    })
    .then(function (payload) {
      var parser = new DOMParser();
      var doc = parser.parseFromString(payload.html, "text/html");
      var links = Array.prototype.slice.call(doc.querySelectorAll("a[href]"));

      return toUniqueList(links.map(function (anchor) {
        var href = anchor.getAttribute("href") || "";
        return resolveHref(payload.baseUrl, href);
      }).filter(function (href) {
        return /\.json(?:\?.*)?$/i.test(href);
      }).map(toPathOrUrl));
    });
}

function loadPersonRecords(paths) {
  var requests = paths.map(function (path) {
    return fetch(path)
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Ficha no disponible");
        }

        return response.json();
      })
      .then(function (record) {
        record.__personPath = path;
        return record;
      });
  });

  return Promise.allSettled(requests).then(function (results) {
    return results.filter(function (result) {
      return result.status === "fulfilled";
    }).map(function (result) {
      return result.value;
    });
  });
}

function buildDetailUrl(record, config) {
  var params = new URLSearchParams();
  params.set("data", record.__personPath || "");
  return (config.detailTemplate || "persona.html") + "?" + params.toString();
}

function renderTable(records, listConfig) {
  var thead = document.getElementById("records-head");
  var tbody = document.getElementById("records-body");
  var columns = getColumns(records, listConfig.columns);

  if (!records.length) {
    if (thead) {
      thead.innerHTML = "";
    }
    tbody.innerHTML = '<tr><td>No hay datos.</td></tr>';
    return;
  }

  if (thead) {
    thead.innerHTML =
      "<tr>" +
      columns.map(function (column) {
        return "<th>" + escapeHtml(column.label) + "</th>";
      }).join("") +
      "</tr>";
  }

  tbody.innerHTML = records.map(function (record) {
    var detailUrl = buildDetailUrl(record, listConfig);

    return (
      '<tr class="table-row-link">' +
        columns.map(function (column) {
          return (
            '<td><a class="row-link" href="' + escapeHtml(detailUrl) + '">' +
              escapeHtml(getColumnValue(record, column)) +
            "</a></td>"
          );
        }).join("") +
      "</tr>"
    );
  }).join("");
}

function renderError() {
  var thead = document.getElementById("records-head");
  var tbody = document.getElementById("records-body");
  if (thead) {
    thead.innerHTML = "";
  }
  tbody.innerHTML = '<tr><td>No se pudo mostrar el listado en este momento.</td></tr>';
}

function loadRecords() {
  var pageConfig = getPageConfig();

  fetch(pageConfig.listSrc)
    .then(function (response) {
      if (!response.ok) {
        throw new Error("Configuracion no disponible");
      }

      return response.json();
    })
    .then(function (listConfig) {
      var directory = listConfig.personasPath || "data/personas/";
      var fallbackPaths = Array.isArray(listConfig.personas) ? listConfig.personas : [];

      return listPersonFiles(directory)
        .then(function (paths) {
          return paths.length ? paths : fallbackPaths;
        })
        .catch(function () {
          return fallbackPaths;
        })
        .then(function (paths) {
          return loadPersonRecords(paths).then(function (records) {
            var mergedConfig = {
              columns: listConfig.columns,
              sort: listConfig.sort,
              detailTemplate: listConfig.detailTemplate || pageConfig.detailTemplate
            };
            return {
              records: sortRecords(records, mergedConfig.sort),
              config: mergedConfig
            };
          });
        });
    })
    .then(function (payload) {
      renderTable(payload.records, payload.config);
    })
    .catch(function () {
      renderError();
    });
}

document.addEventListener("DOMContentLoaded", loadRecords);

