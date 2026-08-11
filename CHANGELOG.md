# Historial de versiones

## 4.2.0-alpha10 — EP-004.5 · Árbol completo para escritorio
- Nueva vista `Árbol completo`, disponible solo en PC.
- Representa todas las personas públicas y sus relaciones conocidas.
- Agrupa parejas en la misma generación.
- Distribuye generaciones automáticamente.
- Mantiene tarjetas clicables y panel rápido.
- Zoom y desplazamiento reutilizan los controles existentes.
- Nuevo botón `Ajustar todo`.
- La vista normal del árbol permanece intacta.
- En iPhone y otros móviles no se muestra la opción.
- Manual de Continuidad actualizado con el uso de la nueva vista.


## 4.2.0-alpha9 — EP-004.4 · Cumpleaños y continuidad
- Toast de cumpleaños únicamente para personas vivas.
- Soporte para fechas numéricas y fechas textuales españolas.
- Edad calculada y acceso directo a la ficha.
- Varios cumpleaños agrupados.
- Una aparición por sesión y cierre automático.
- Inicio de `MANUAL_DE_CONTINUIDAD.md`.


## 4.2.0-alpha8 — Corrección de notas en ficha pública
- `notas` admite ahora tanto texto como arrays.
- Las notas de texto multilínea se muestran línea a línea.
- Se elimina la llamada insegura a `person.notas.map()` cuando `notas` es una cadena.
- No se modifica `personas.json`.
- Sin cambios en documentos, fotografías, relaciones ni árbol.


## 4.2.0-alpha7 — EP-004.3B: avatar unificado
- Sustituida la fotografía panorámica del panel rápido por un avatar circular grande.
- Reutilización de la misma lógica visual del árbol.
- Avatar de 142 px en PC y 112 px en iPhone.
- Mismo encuadre individual y mismo fallback sin fotografía.
- Nombre limitado a dos líneas.
- Panel más compacto y robusto ante fotografías de cualquier proporción.


## 4.2.0-alpha6 — Corrección de fotografía del panel rápido
- El bloque fotográfico del panel lateral pasa a una proporción 4:3.
- Se reduce el recorte vertical de fotografías horizontales.
- Se conserva el encuadre individual guardado en `fotoPosicion`.
- Ajuste específico para la hoja inferior en iPhone.
- Sin cambios en navegación, relaciones ni datos.


## 4.2.0-alpha5 — EP-004.3 Fase A: tarjetas clicables
- Clic en cualquier tarjeta del árbol abre un panel rápido.
- Panel lateral en PC y hoja inferior en iPhone.
- Navegación directa entre padres, cónyuges, hijos y hermanos.
- Recentrado del árbol desde el panel.
- Acceso a la ficha pública completa.
- Línea de vida común y corrección de defunciones documentadas en evidencias.


## 4.2.0-alpha4 — EP-004.2 Fase B: pulido e iPhone
- Persona central más destacada.
- Tarjetas con acabado de ficha de archivo.
- Fotografías ligeramente mayores.
- Contadores convertidos en indicadores compactos.
- En iPhone, el árbol se abre centrado en la persona con escala legible.
- Cabecera y controles móviles más compactos.
- `VERSION.txt` sincronizado con la versión real.
- Comprobación automática de versión para evitar cachés antiguas.


## 4.2.0-alpha3 — Corrección de tarjetas del árbol
- Corregida la llamada a `escapeHtml()`, inexistente en la aplicación pública.
- Las tarjetas usan ahora la función `esc()` ya existente.
- Sin cambios en diseño, motor, datos ni navegación.


## 4.2.0-alpha2 — EP-004.2 Fase A: tarjetas del árbol
- Fotografías circulares en las tarjetas.
- Nombre, años de vida y profesión.
- Contadores de fotografías y documentos.
- Indicador discreto del nivel documental.
- Sin cambios en el motor, zoom, arrastre o navegación.


## 4.2.0-alpha1 — EP-004.1: nuevo motor del árbol
- Índice genealógico construido una sola vez al cargar los datos.
- Fuente principal: `padre`, `madre` y `conyuges`.
- Hijos y hermanos derivados desde el índice.
- Orden estable de padre y madre.
- Eliminadas funciones duplicadas del árbol.
- Compatibilidad temporal con registros heredados.
- Sin cambios visuales en esta primera entrega.


## 4.1.1 — Versión estable
- Editor de relaciones familiares validado con uso real.
- Padre y madre explícitos.
- Cónyuges recíprocos.
- Hijos y hermanos calculados automáticamente.
- Búsqueda de personas por nombre o identificador.
- Guardado de relaciones en `data/personas.json`.
- Modelo de relaciones normalizado y compatible con datos anteriores.
- Repositorio reorganizado con nombres fijos para CSS y JavaScript.
- Validada mediante incorporación de nuevas personas, fotografías y documentos.

## 4.1.0 — Consolidación de Administración
- Cabecera profesional del expediente.
- Navegación por pestañas.
- Espacios independientes para fotografías, documentos y datos biográficos.
- Mejora de accesibilidad y navegación por teclado.
- Gestión documental y fotográfica integrada.

## 4.0.3 — Gestión documental
- Visor de imágenes y documentos.
- Mejoras en Administración.
