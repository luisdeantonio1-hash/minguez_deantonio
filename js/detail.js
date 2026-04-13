function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getDetailDataPath() {
  var params = new URLSearchParams(window.location.search);
  return params.get("data");
}

function setText(id, value) {
  var element = document.getElementById(id);
  if (element) {
    element.textContent = value || "";
  }
}

function renderFacts(facts) {
  var target = document.getElementById("person-facts");
  if (!target) {
    return;
  }

  if (!facts || !facts.length) {
    target.innerHTML = "<div><dt>Información</dt><dd>No disponible.</dd></div>";
    return;
  }

  target.innerHTML = facts.map(function (fact) {
    return (
      "<div>" +
        "<dt>" + escapeHtml(fact.label) + "</dt>" +
        "<dd>" + escapeHtml(fact.value) + "</dd>" +
      "</div>"
    );
  }).join("");
}

function renderBiography(paragraphs) {
  var target = document.getElementById("person-biography");
  if (!target) {
    return;
  }

  if (!paragraphs || !paragraphs.length) {
    target.innerHTML = "<p>No hay biografía disponible.</p>";
    return;
  }

  target.innerHTML = paragraphs.map(function (paragraph) {
    return "<p>" + escapeHtml(paragraph) + "</p>";
  }).join("");
}

function renderHeroImage(image) {
  var imageElement = document.getElementById("person-image");
  var captionElement = document.getElementById("person-image-caption");

  if (!imageElement || !captionElement) {
    return;
  }

  if (!image) {
    imageElement.removeAttribute("src");
    imageElement.alt = "";
    captionElement.textContent = "Sin imagen principal.";
    return;
  }

  imageElement.src = image.src;
  imageElement.alt = image.alt || "";
  captionElement.textContent = image.caption || "";
}

function renderGallery(images) {
  var target = document.getElementById("person-gallery");
  if (!target) {
    return;
  }

  if (!images || !images.length) {
    target.innerHTML = "<p>No hay imágenes adicionales.</p>";
    return;
  }

  target.innerHTML = images.map(function (image) {
    return (
      '<figure class="gallery-card">' +
        '<img src="' + escapeHtml(image.src) + '" alt="' + escapeHtml(image.alt || "") + '">' +
        "<figcaption>" + escapeHtml(image.caption || "") + "</figcaption>" +
      "</figure>"
    );
  }).join("");
}

function renderDetailPage(data) {
  document.title = (data.name || "Ficha personal") + " | Familia Mínguez - De Antonio";
  setText("person-name", data.name || "Ficha personal");
  setText("person-subtitle", data.subtitle || "");
  setText("person-summary", data.summary || "");
  renderFacts(data.facts);
  renderHeroImage(data.heroImage);
  renderBiography(data.biography);
  renderGallery(data.gallery);
}

function renderError(message) {
  setText("person-name", "No se pudo cargar la ficha");
  setText("person-subtitle", "");
  setText("person-summary", message);
  renderFacts([]);
  renderHeroImage(null);
  renderBiography([]);
  renderGallery([]);
}

function loadDetailPage() {
  var dataPath = getDetailDataPath();

  if (!dataPath) {
    renderError("No se ha indicado ningún archivo de contenido.");
    return;
  }

  fetch(dataPath)
    .then(function (response) {
      if (!response.ok) {
        throw new Error("No se pudo leer el archivo de contenido.");
      }

      return response.json();
    })
    .then(function (data) {
      renderDetailPage(data);
    })
    .catch(function () {
      renderError("No se pudo cargar el archivo de contenido.");
    });
}

document.addEventListener("DOMContentLoaded", loadDetailPage);
