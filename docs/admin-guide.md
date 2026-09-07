# Guía del panel administrativo

## Alcance actual

El panel se encuentra en `/admin12345`. En `desarrollo`, el acceso utiliza
Supabase Auth y los datos se guardan mediante la API de Vercel en PostgreSQL y
Storage. El proyecto Supabase actual sigue siendo de staging, no de producción.

## Pantallas

### Resumen

Muestra la cantidad de remates por estado y las cargas pendientes de revisión.
Desde allí se puede crear un remate o abrir una carga pendiente.

### Remates

Permite:

- Crear y editar remates.
- Guardar información incompleta como borrador.
- Enviar una carga a revisión.
- Publicar cuando se completan los datos obligatorios.
- Ocultar temporalmente un remate publicado y volver a publicarlo.
- Finalizar o cancelar un evento con confirmación previa.
- Eliminar con confirmación.

### Contenido general

Permite modificar:

- Textos de portada y empresa.
- Datos de contacto y ubicación.
- Enlace de Google Maps.
- Preguntas frecuentes.

## Carga de un remate

Flujo recomendado:

1. Crear el remate.
2. Completar la información disponible.
3. Guardar como `Borrador`.
4. Cargar la información del catálogo y las condiciones.
5. Enviar a `En revisión`.
6. Verificar la información y los archivos.
7. Publicar.

Una carga en borrador o revisión no aparece en la web pública.

## Datos obligatorios para publicar

- Título y subtítulo. El slug se genera desde el título mientras el remate está
  en borrador o revisión, y queda fijo después de publicar.
- Fecha y hora en formato `dd/mm/yyyy HH:mm`, o la opción `Fecha a confirmar`.
- Lugar y ubicación detallada.
- Descripción breve y completa.
- Texto sobre el catálogo.
- Al menos un requisito.
- Al menos una condición.

Los lotes destacados son opcionales. Si se agrega una foto, su nombre es
obligatorio incluso al guardar como borrador.

## Catálogos e imágenes

En esta versión, el catálogo se describe mediante texto y estado de publicación.
No se cargan archivos de catálogo. Los lotes destacados y sus imágenes son
opcionales.

El navegador prepara la carga y la API valida nuevamente formato, firma y peso
antes de guardar el archivo en Storage privado.

Se pueden arrastrar varias fotos juntas a la zona de carga o seleccionarlas desde
el dispositivo. Cada archivo crea una tarjeta con miniatura y un campo de nombre.
La zona permanece visible debajo de las tarjetas para agregar más fotos en
cualquier momento.

- JPEG, PNG o WebP de hasta 700.000 bytes por archivo.

Los archivos se organizarán dentro de una carpeta identificada por el UUID del
remate.

## Estados

- `Borrador`: carga incompleta.
- `En revisión`: pendiente de verificación.
- `Publicado`: visible para visitantes.
- `Oculto`: retirado temporalmente de la web pública; puede volver a publicarse.
- `Finalizado`: ya no figura como próximo remate.
- `Cancelado`: evento suspendido.

`Finalizar` y `Cancelar` son estados terminales: el panel solicita confirmación
antes de aplicarlos y luego no permite volver a publicar el remate. `Ocultar` sí
es reversible y conserva el slug para una publicación posterior.

Las transiciones admitidas son:

```text
borrador → en_revision | publicado
en_revision → borrador | publicado
publicado → oculto | finalizado | cancelado
oculto → publicado | finalizado | cancelado
```

Cada guardado incrementa la versión del remate. Si otra persona guardó primero,
el panel conserva los cambios locales y avisa el conflicto en lugar de
sobrescribir silenciosamente la versión más reciente.

Conviene finalizar o cancelar antes que eliminar. La eliminación debería
reservarse para duplicados o cargas erróneas.

## Verificación previa

Antes de publicar:

- Revisar fecha, hora y ubicación.
- Comprobar el estado y la descripción del catálogo.
- Comprobar requisitos y condiciones.
- Revisar ortografía y datos de contacto.
- Confirmar que el evento debe quedar visible.
- Abrir la página pública del remate después de publicar.
