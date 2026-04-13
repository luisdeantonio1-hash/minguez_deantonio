# minguez_deantonio

Web estática para mostrar el listado memorial y fichas personales.

## Estructura

- `index.html`: portada con la tabla principal.
- `persona.html`: plantilla de ficha personal.
- `data/fallecidos.csv`: datos de la tabla.
- `data/persona-ejemplo.json`: ejemplo de contenido para rellenar la plantilla.
- `js/app.js`: carga el CSV y crea los enlaces desde la tabla.
- `js/detail.js`: carga el JSON externo y rellena la ficha personal.
- `css/tokens.css`: variables de tema.
- `css/styles.css`: estilos de la portada, tabla y ficha.
- `images/`: imágenes de ejemplo para la ficha.

## Configuración desde la portada

En `index.html`, el elemento principal define:

- `data-records-src`: CSV de la tabla.
- `data-detail-template`: plantilla HTML a la que enlazan las filas.
- `data-detail-content`: archivo JSON usado para rellenar esa plantilla.

Por ahora todas las filas enlazan al mismo archivo `data/persona-ejemplo.json`.

## Cómo crear una ficha nueva

1. Copia `data/persona-ejemplo.json`.
2. Cambia textos, datos e imágenes.
3. Ajusta `data-detail-content` en `index.html` si quieres que la tabla apunte a otro archivo.

## Nota

La carga de CSV y JSON se hace con `fetch`.
Si el navegador bloquea la lectura al abrir el HTML directamente, sirve la carpeta con un servidor estático simple.
