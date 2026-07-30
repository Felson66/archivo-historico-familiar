# Archivo Histórico Familiar — v3.0.3

Corrección de carga de la galería fotográfica.

## Qué ocurría

La galería ya estaba incluida en la v3.0.2, pero el navegador seguía utilizando una copia anterior de `app.js` guardada en caché. Por eso aparecía el texto «3 fotografías asociadas» en lugar de las miniaturas.

## Corrección

- Se fuerza la carga de la versión nueva de `app.js`.
- Se fuerza la carga de la versión nueva de `style.css`.
- Se mantienen la foto principal, las tres miniaturas y el visor a pantalla completa.
- No es necesario borrar manualmente la caché.

## Actualización

Copia todo el contenido sobre el repositorio local, acepta sustituir los archivos y publica con GitHub Desktop:

1. Commit to main
2. Push origin
