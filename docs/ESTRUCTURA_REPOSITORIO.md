# Estructura de archivos

A partir de la versión 4.1.0c, los activos principales tienen nombres fijos:

```text
css/
  style.css
  admin.css

js/
  app.js
  admin.js
```

La versión no vuelve a incluirse en el nombre del fichero.

## Regla para futuras actualizaciones

Cada versión deberá sustituir siempre estos seis archivos:

```text
index.html
admin.html
css/style.css
css/admin.css
js/app.js
js/admin.js
```

Git conserva el historial completo. `CHANGELOG.md` conserva el historial funcional.

## Caché

`index.html` y `admin.html` incluyen un parámetro de versión en las referencias,
por ejemplo:

```text
js/app.js?v=4.1.0c
```

Así el navegador descarga los archivos nuevos sin acumular copias físicas.
