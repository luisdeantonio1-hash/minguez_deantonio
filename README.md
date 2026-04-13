# minguez_deantonio

Web estática para mostrar el listado memorial y fichas personales.

## Estructura

- `index.html`: portada con la tabla principal.
- `persona.html`: plantilla de ficha personal.
- `data/fallecidos.json`: datos de la tabla principal.
- `data/personas/<slug>.json`: fichas personales, una por cada entrada.
- `js/app.js`: carga el JSON de la lista, genera las columnas dinámicamente y crea los enlaces desde la tabla.
- `js/detail.js`: carga el JSON externo y rellena la ficha personal.
- `css/tokens.css`: variables de tema.
- `css/styles.css`: estilos de la portada, tabla y ficha.
- `images/personas/<slug>/`: imágenes asociadas a cada ficha personal.

## Configuración desde la portada

En `index.html`, el elemento principal define:

- `data-records-src`: JSON de la tabla.
- `data-detail-template`: plantilla HTML a la que enlazan las filas.
- `data-detail-content`: archivo JSON usado para rellenar esa plantilla.

La portada mantiene un valor por defecto, pero cada fila puede sobrescribirlo con su objeto `detail` dentro de `data/fallecidos.json`.

## Modelo de datos recomendado

La lista principal ya no usa CSV. Ahora usa JSON porque encaja mejor con el siguiente paso del proyecto:

- permite añadir campos nuevos sin cambiar el HTML;
- permite guardar metadatos por fila, como la ficha de detalle, sin mostrarlos como columnas;
- facilita vincular cada persona con su propio JSON de detalle;
- evita tener que mantener parseo manual de CSV.

La tabla principal se genera con todas las claves simples de cada registro. Si añades una columna nueva en `data/fallecidos.json`, aparecerá automáticamente en la web.

## Cómo crear una ficha nueva

1. Crea el fichero `data/personas/<slug>.json`.
2. Crea la carpeta paralela `images/personas/<slug>/`.
3. Cambia en el JSON los textos, datos e imágenes.
4. Actualiza el objeto `detail` del registro correspondiente en `data/fallecidos.json`.

## Estructura por persona

Cada persona ya tiene una base creada con este esquema:

- `data/personas/<slug>.json`
- `images/personas/<slug>/retrato.svg`
- `images/personas/<slug>/documento.svg`

El mismo `slug` se reutiliza en datos e imágenes para mantener una organización congruente.

## Nota

La carga de JSON se hace con `fetch`.
Si el navegador bloquea la lectura al abrir el HTML directamente, sirve la carpeta con un servidor estático simple.
