# Modelo de relaciones — EP-003.0

## Modelo canónico futuro

```json
{
  "padre": "P00012",
  "madre": "P00013",
  "conyuges": ["P00025"]
}
```

## Relaciones derivadas

- hijos
- hermanos
- abuelos
- nietos
- tíos
- primos

## Compatibilidad de lectura

Temporalmente se siguen leyendo:

- `padres[]`
- `hijos[]`
- `hijas[]`
- `conyuge`
- `hermanos[]`
- `hermanas[]`

No se migra automáticamente el JSON en esta versión.
