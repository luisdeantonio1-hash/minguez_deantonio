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
    recordsSrc: page ? page.dataset.recordsSrc : "data/fallecidos.json",
    detailTemplate: page ? page.dataset.detailTemplate : "persona.html",
    detailContent: page ? page.dataset.detailContent : "data/personas/domingo-minguez-paez.json"
  };
}

function isPrimitiveValue(value) {
  return value === null || ["string", "number", "boolean"].indexOf(typeof value) !== -1;
}

function getColumns(records) {
  var columns = [];

  records.forEach(function (record) {
    Object.keys(record).forEach(function (key) {
      if (!isPrimitiveValue(record[key])) {
        return;
      }

      if (columns.indexOf(key) === -1) {
        columns.push(key);
      }
    });
  });

  return columns;
}

function getCellValue(record, key) {
  var value = record[key];
  return value === null || value === undefined ? "" : String(value);
}

function formatColumnLabel(key) {
  if (!key) {
    return "";
  }

  return key.charAt(0).toUpperCase() + key.slice(1);
}

function buildDetailUrl(record, config) {
  var detailConfig = record.detail && typeof record.detail === "object" ? record.detail : {};
  var params = new URLSearchParams();
  params.set("data", detailConfig.data || config.detailContent);
  params.set("nombre", record.nombre || "");
  return (detailConfig.template || config.detailTemplate) + "?" + params.toString();
}

function renderTable(records) {
  var thead = document.getElementById("records-head");
  var tbody = document.getElementById("records-body");
  var config = getPageConfig();
  var columns = getColumns(records);

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
        return "<th>" + escapeHtml(formatColumnLabel(column)) + "</th>";
      }).join("") +
      "</tr>";
  }

  tbody.innerHTML = records.map(function (record) {
    var detailUrl = buildDetailUrl(record, config);
    return (
      '<tr class="table-row-link">' +
        columns.map(function (column) {
          return (
            '<td><a class="row-link" href="' + escapeHtml(detailUrl) + '">' +
              escapeHtml(getCellValue(record, column)) +
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
  var config = getPageConfig();

  fetch(config.recordsSrc)
    .then(function (response) {
      if (!response.ok) {
        throw new Error("JSON no disponible");
      }

      return response.json();
    })
    .then(function (payload) {
      var records = Array.isArray(payload) ? payload : payload.records;
      renderTable(Array.isArray(records) ? records : []);
    })
    .catch(function () {
      renderError();
    });
}

document.addEventListener("DOMContentLoaded", loadRecords);
