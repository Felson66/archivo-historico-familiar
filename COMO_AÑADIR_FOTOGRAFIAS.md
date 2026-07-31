# Cómo añadir fotografías a cualquier persona

El sistema fotográfico ya es reutilizable. No hay que tocar `app.js`, `style.css` ni `index.html`.

## 1. Localiza el identificador de la persona

Abre `data/personas.json` y busca su nombre. Cada persona tiene un identificador como:

```json
"id": "P0027"
```

## 2. Crea su carpeta de fotografías

Dentro de:

```text
assets/fotos/
```

crea una carpeta con ese mismo identificador:

```text
assets/fotos/P0027/
```

## 3. Copia las fotografías

Usa nombres sencillos y ordenados:

```text
001-principal.jpg
002.jpg
003.jpg
```

Se recomiendan JPG o WEBP. Evita espacios, tildes y nombres muy largos.

## 4. Añade las líneas en `personas.json`

Dentro de la ficha de la persona, usa esta estructura:

```json
"fotografia_principal": "assets/fotos/P0027/001-principal.jpg",
"fotografias": [
  {
    "src": "assets/fotos/P0027/001-principal.jpg",
    "titulo": "Retrato principal",
    "fecha": "2026",
    "lugar": "Bilbao",
    "descripcion": "Descripción de la fotografía.",
    "personas": ["P0027"],
    "etiquetas": ["retrato"]
  },
  {
    "src": "assets/fotos/P0027/002.jpg",
    "titulo": "Segunda fotografía",
    "fecha": "",
    "lugar": "",
    "descripcion": "",
    "personas": ["P0027"],
    "etiquetas": []
  }
]
```

La primera fotografía no tiene que ser obligatoriamente la principal, pero normalmente conviene que coincidan.

## 5. Publica

Guarda `personas.json`, abre GitHub Desktop y realiza:

1. Commit to main
2. Push origin

La web mostrará automáticamente:

- foto en la tarjeta de la persona;
- foto grande en la cabecera;
- número total de fotografías;
- mosaico fotográfico;
- pies de foto;
- visor a pantalla completa.

## Campos

- `src`: ruta exacta del archivo; obligatorio.
- `titulo`: título breve visible en el mosaico y el visor.
- `fecha`: puede ser año, mes y año o fecha completa.
- `lugar`: localidad o emplazamiento.
- `descripcion`: explicación más amplia para el visor.
- `personas`: identificadores de quienes aparecen.
- `etiquetas`: palabras para futuras búsquedas, como `boda`, `viaje`, `Navidad` o `retrato`.

También se incluye `data/plantilla-fotografias.json` para copiar y adaptar.
