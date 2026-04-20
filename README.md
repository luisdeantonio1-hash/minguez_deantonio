# minguez_deantonio

Web estática para mostrar el listado memorial y fichas personales.

## Estructura

- `index.html`: portada con la tabla principal.
- `persona.html`: plantilla de ficha personal.
- `data/lista.json`: configuración de la tabla principal (columnas, orden, carpeta de personas).
- `data/personas/<slug>.json`: fichas personales, una por cada entrada.
- `js/app.js`: carga `data/lista.json`, descubre los JSON en `data/personas/` y genera el listado.
- `js/detail.js`: carga el JSON externo y rellena la ficha personal.
- `css/tokens.css`: variables de tema.
- `css/styles.css`: estilos de la portada, tabla y ficha.
- `images/personas/<slug>/`: imágenes asociadas a cada ficha personal.

## Configuración desde la portada

En `index.html`, el elemento principal define:

- `data-records-src`: JSON de configuración de lista.
- `data-detail-template`: plantilla HTML a la que enlazan las filas.

## Modelo de lista (`data/lista.json`)

`data/lista.json` ya no guarda datos personales. Solo configura cómo se pinta el listado.

Campos disponibles:

- `personasPath`: carpeta donde se buscarán automáticamente todos los `*.json` de personas.
- `personas`: listado de respaldo cuando el servidor no permite listar carpetas.
- `detailTemplate`: plantilla de detalle para cada fila.
- `columns`: columnas visibles en la tabla.
- `sort`: criterio de ordenación.

### Columnas

Cada entrada de `columns` puede definir:

- `id`: identificador interno.
- `label`: texto de cabecera.
- `source`: origen del valor.

`source` soporta:

- campos directos del JSON de persona, por ejemplo `name`, `summary` o `subtitle`.
- datos del bloque `facts` usando `fact:<Etiqueta>`, por ejemplo `fact:Fallecimiento` o `fact:Edad`.

## Cómo crear una ficha nueva

1. Crea el fichero `data/personas/<slug>.json`.
2. Crea la carpeta paralela `images/personas/<slug>/`.
3. Cambia en el JSON los textos, datos e imágenes.
4. No hace falta tocar el listado: la portada detecta automáticamente los nuevos JSON en `data/personas/`.

## Nota

La carga de JSON se hace con `fetch`.
Si el navegador bloquea la lectura al abrir el HTML directamente, sirve la carpeta con un servidor estático simple.
Si el servidor no expone listado de directorios, puedes añadir temporalmente un array `personas` en `data/lista.json` con rutas explícitas.

