# Historial de versiones

## 4.2.0-alpha16c — Centrado automático al entrar en Árbol
- Corregido el desplazamiento del árbol al abrir su pestaña desde Personas.
- El centrado se ejecuta después de hacer visible el lienzo, usando dos ciclos de renderizado.
- No cambia la lógica de ramas ni `personas.json`.


## 4.2.0-alpha16b — Inicialización de rama persistida
- Corregido el arranque cuando la última rama guardada es Eduardo, Esther o Conjunta.
- La rama recuperada del navegador se aplica ahora mediante la misma lógica usada al cambiar de rama manualmente.
- Árbol, foco, selector de personas y buscador arrancan sincronizados con la rama activa.
- `personas.json` permanece intacto.


## 4.2.0-alpha16 — EP-005.4 · Buscador filtrado por rama
- El buscador de Personas obedece al selector global de rama.
- Rama Eduardo muestra únicamente las personas calculadas para Eduardo.
- Rama Esther muestra únicamente las personas calculadas para Esther.
- Rama Conjunta muestra la unión de ambas ramas sin duplicados.
- El contador de personas se actualiza según la rama activa.
- Cambiar de rama refresca inmediatamente el buscador y el árbol.
- `personas.json` permanece intacto.


## 4.2.0-alpha15d — EP-005.3 · Rama Conjunta con Vista normal
- Al seleccionar `Conjunta` se sigue abriendo inicialmente `Árbol completo`.
- Corregido el botón `Vista normal`: ya puede salir del árbol completo.
- En `Vista normal`, Conjunta mantiene como universo la unión Eduardo + Esther y permite centrar el árbol en cualquier persona de esa unión.
- Eduardo y Esther no cambian.
- `personas.json` permanece intacto.


## 4.2.0-alpha15c — EP-005.3 · Rama Conjunta corregida
- Corregido el comportamiento de Rama Conjunta.
- Conjunta ya no conserva el foco de la última rama individual.
- En PC, Conjunta abre directamente el Árbol completo con la unión Eduardo + Esther.
- Eduardo y Esther mantienen su vista normal centrada en la raíz de cada rama.
- El botón Árbol completo sigue disponible en las ramas individuales.
- `personas.json` permanece intacto.


## 4.2.0-alpha15b — EP-005.3 · Árbol filtrado por rama (corregida)
- Rehecha desde alpha14 estable.
- Corregido el fallo de inicialización de alpha15: `currentFamilyBranch` es una variable, no una función.
- El selector «Centrar árbol en» queda limitado a la rama activa.
- La vista normal filtra padres, abuelos, hermanos, parejas e hijos por la rama activa.
- Árbol completo usa únicamente las personas de la rama activa.
- Al cambiar Eduardo / Esther / Conjunta se reconstruyen selector y árbol inmediatamente.
- `personas.json` permanece intacto.
- El buscador de Personas sigue sin filtrar hasta EP-005.4.


## 4.2.0-alpha14 — EP-005.2 · Selector global de rama
- Selector global `Eduardo | Esther | Conjunta` visible en la aplicación.
- La selección persiste entre sesiones mediante almacenamiento local del navegador.
- Al elegir Eduardo o Esther, el árbol normal se centra automáticamente en la persona raíz correspondiente.
- La Rama conjunta conserva el contexto actual del árbol.
- Esta fase aún no filtra Personas ni el árbol completo: EP-005.3 y EP-005.4 aplicarán el motor a esas vistas.
- Eliminado definitivamente del encabezado el subtítulo de apellidos `Familias ...`.


## 4.2.0-alpha13 — EP-005.1 · Motor de ramas familiares
- Motor automático para Rama Eduardo, Rama Esther y Rama conjunta.
- Centros detectados en los datos: `P0015` — Eduardo de la Dehesa Liz y `P0027` — Esther García Reizabal.
- La pertenencia se calcula desde las relaciones; no se añade ningún campo de rama a `personas.json`.
- Recorre ascendientes, descendientes, hermanos y parejas relacionadas.
- Se añade diagnóstico interno antes de aplicar filtros visuales.
- Se elimina del encabezado la antigua enumeración de apellidos `Familias ...`.
- Árbol y buscador todavía no se filtran: corresponde a las siguientes fases de EP-005.


## 4.2.0-alpha12 — Árbol completo: Ajustar todo optimizado
- `Ajustar todo` calcula ahora el encuadre usando el área realmente ocupada por las tarjetas.
- Se elimina buena parte del espacio vacío que reducía innecesariamente el árbol en alpha11.
- El conjunto queda centrado horizontal y verticalmente.
- Se mantienen márgenes de seguridad para líneas y rótulos de generación.
- No se modifica la distribución genealógica ni el tamaño base de las tarjetas.
- Vista normal y móvil permanecen sin cambios.


## 4.2.0-alpha11 — Árbol completo: ancho de escritorio
- La vista `Árbol completo` aprovecha casi todo el ancho disponible del monitor.
- Se conservan márgenes laterales de 28 px para evitar que el lienzo quede pegado al borde.
- `Ajustar todo` utiliza automáticamente el nuevo tamaño del contenedor.
- No se aumenta artificialmente el tamaño de las tarjetas: la mejora procede del mayor espacio disponible.
- La `Vista normal` conserva exactamente su ancho anterior.
- Sin cambios en móvil.


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
