function parseCsv(text) {
  var lines = text.trim().split(/\r?\n/);
  if (lines.length === 0) {
    return [];
  }

  var headers = splitCsvLine(lines[0]);

  return lines.slice(1).filter(Boolean).map(function (line) {
    var values = splitCsvLine(line);
    var row = {};

    headers.forEach(function (header, index) {
      row[header] = values[index] || "";
    });

    return row;
  });
}

function splitCsvLine(line) {
  var values = [];
  var current = "";
  var insideQuotes = false;

  for (var index = 0; index < line.length; index += 1) {
    var character = line[index];

    if (character === '"') {
      if (insideQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (character === "," && !insideQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  values.push(current);
  return values;
}

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
    recordsSrc: page ? page.dataset.recordsSrc : "data/fallecidos.csv",
    detailTemplate: page ? page.dataset.detailTemplate : "persona.html",
    detailContent: page ? page.dataset.detailContent : "data/persona-ejemplo.json"
  };
}

function buildDetailUrl(record, config) {
  var params = new URLSearchParams();
  params.set("data", config.detailContent);
  params.set("nombre", record.nombre || "");
  return config.detailTemplate + "?" + params.toString();
}

function renderTable(records) {
  var tbody = document.getElementById("records-body");
  var config = getPageConfig();

  if (!records.length) {
    tbody.innerHTML = '<tr><td colspan="3">No hay datos.</td></tr>';
    return;
  }

  tbody.innerHTML = records.map(function (record) {
    var detailUrl = buildDetailUrl(record, config);
    return (
      '<tr class="table-row-link">' +
        '<td><a class="row-link" href="' + escapeHtml(detailUrl) + '">' + escapeHtml(record.nombre) + "</a></td>" +
        '<td><a class="row-link" href="' + escapeHtml(detailUrl) + '">' + escapeHtml(record.fecha) + "</a></td>" +
        '<td><a class="row-link" href="' + escapeHtml(detailUrl) + '">' + escapeHtml(record.edad) + "</a></td>" +
      "</tr>"
    );
  }).join("");
}

function renderError() {
  var tbody = document.getElementById("records-body");
  tbody.innerHTML = '<tr><td colspan="3">No se pudo cargar el archivo CSV.</td></tr>';
}

function loadRecords() {
  var config = getPageConfig();

  fetch(config.recordsSrc)
    .then(function (response) {
      if (!response.ok) {
        throw new Error("CSV no disponible");
      }

      return response.text();
    })
    .then(function (text) {
      renderTable(parseCsv(text));
    })
    .catch(function () {
      renderError();
    });
}

document.addEventListener("DOMContentLoaded", loadRecords);
