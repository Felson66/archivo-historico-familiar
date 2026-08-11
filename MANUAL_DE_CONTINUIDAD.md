# Manual de continuidad de Raíces

**Versión:** 0.1 — borrador inicial  
**Compatible con:** Raíces 4.2.x  
**Última revisión:** agosto de 2026

## Si tienes que continuar Raíces
No necesitas saber programar. Raíces es un Archivo Histórico Familiar creado para conservar personas, parentescos, fotografías, documentos, recuerdos y evidencias para futuras generaciones.

Antes de modificar nada:
1. Conserva intacta la copia que has recibido.
2. Haz una segunda copia completa.
3. Comprueba que existen `index.html`, `admin.html`, `data`, `assets`, `js` y `css`.
4. Abre Raíces y comprueba Personas y Árbol.
5. Haz primero un cambio pequeño y verifica el resultado antes de continuar.

## Principio documental
Un recuerdo familiar es una pista valiosa, pero no equivale automáticamente a un hecho documentado. Conserva la evidencia de donde procede cada dato. Si dos fuentes se contradicen, conserva la duda hasta poder resolverla.

## Antes de cada cambio
Haz copia de seguridad. No reutilices identificadores. No borres archivos sin comprobar sus asociaciones. Haz pocos cambios cada vez y comprueba fichas y árbol.

## Tareas habituales
**Personas:** utiliza Administración, guarda y comprueba después la ficha pública.  
**Relaciones:** guarda padres, hijos, hermanos y pareja y verifica ambos extremos y el árbol.  
**Fotografías:** incorpora la imagen y comprueba miniatura y ficha.  
**Documentos:** asocia el documento, añade una descripción comprensible y comprueba que se abre.

## Personas vivas y fallecidas
Mantén expresamente la situación vital. No la deduzcas por edad ni por ausencia de fecha de defunción. Raíces usa este dato para funciones como los cumpleaños.

## Publicación
Actualmente se utiliza GitHub Desktop y GitHub Pages. Esta sección tendrá instrucciones paso a paso antes de la versión 1.0 del manual.

## Copias y recuperación
Se documentarán ubicación de copias maestras, periodicidad, restauración y transferencia de responsabilidad. **Nunca guardes contraseñas dentro de este manual.**

## Si algo falla
Conserva la última versión que funcionaba y revisa qué cambió desde entonces. No intentes corregir muchas cosas simultáneamente. Si recurres a una IA, entrégale una copia completa actual y explica qué funcionaba antes y qué ha fallado. No permitas sustituir datos familiares por una copia antigua sin comparar primero.

## Objetivo del manual
Este documento no pretende explicar cómo está programado Raíces. Su finalidad es que cualquier persona pueda continuar el Archivo.

## Pendiente para v1.0
Acceso y publicación; copias de seguridad; recuperación; cuentas necesarias sin contraseñas; transferencia de responsabilidad; guía completa de Administración; comprobaciones tras publicar; entrega del proyecto a una futura IA o desarrollador; e historia y propósito del proyecto escrita por su creador.

## Árbol completo en ordenador

En ordenadores de escritorio, la vista Árbol dispone de un botón **Árbol completo**.
Esta vista intenta representar de una sola vez todas las personas públicas existentes en
Raíces y sus relaciones conocidas.

- Utiliza **+** y **−** o la rueda del ratón para ampliar y reducir.
- Arrastra el fondo para desplazarte por el árbol.
- **Ajustar todo** recupera una vista general si te pierdes.
- Las personas siguen siendo pulsables y abren el panel rápido.
- Esta opción no se muestra en teléfonos móviles, donde se mantiene el árbol centrado en
  una persona por ser más legible.

Si el árbol completo parece desordenado después de añadir relaciones nuevas, comprueba
primero que padres, hijos y parejas están correctamente relacionados en Administración.

### Aprovechamiento de pantalla en PC
Desde la versión 4.2.0-alpha11, al activar **Árbol completo** el área del árbol se ensancha
automáticamente hasta ocupar casi todo el monitor. Al volver a **Vista normal**, la página
recupera el ancho habitual. El botón **Ajustar todo** recalcula la escala con el espacio disponible.

### Ajustar todo
Desde 4.2.0-alpha12, **Ajustar todo** toma como referencia el espacio realmente ocupado
por las personas del árbol completo, en lugar del tamaño teórico de todo el lienzo.
Esto permite aprovechar mejor el monitor y mostrar las tarjetas a mayor escala sin
dejar personas fuera del área visible.
