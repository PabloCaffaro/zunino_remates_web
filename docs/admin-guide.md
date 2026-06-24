# Guía del panel administrativo

## Alcance actual

El panel se encuentra en `/admin12345`. El acceso y los datos actuales son de
demostración y no deben utilizarse en una publicación real.

Las credenciales temporales están centralizadas en `src/admin/adminConfig.ts`.
Antes de producción serán reemplazadas por Supabase Auth.

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
- Finalizar un evento publicado.
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
4. Cargar catálogo y condiciones.
5. Enviar a `En revisión`.
6. Verificar la información y los archivos.
7. Publicar.

Una carga en borrador o revisión no aparece en la web pública.

## Datos obligatorios para publicar

- Título, subtítulo y slug.
- Fecha resumida y fecha completa.
- Lugar y ubicación detallada.
- Descripción breve y completa.
- Texto sobre el catálogo.
- Ruta y nombre del PDF.
- Al menos un requisito.
- Al menos una condición.

Los lotes destacados son opcionales.

## Catálogos e imágenes

En la demostración, el navegador admite archivos pequeños mediante Data URL:

- PDF de hasta aproximadamente 1,5 MB.
- Imagen de hasta aproximadamente 700 KB.

Al conectar Supabase Storage, los límites previstos serán:

- PDF de hasta 15 MB.
- JPEG, PNG o WebP de hasta 5 MB.

Los archivos se organizarán dentro de una carpeta identificada por el UUID del
remate.

## Estados

- `Borrador`: carga incompleta.
- `En revisión`: pendiente de verificación.
- `Publicado`: visible para visitantes.
- `Finalizado`: ya no figura como próximo remate.
- `Cancelado`: evento suspendido.

Conviene finalizar o cancelar antes que eliminar. La eliminación debería
reservarse para duplicados o cargas erróneas.

## Verificación previa

Antes de publicar:

- Revisar fecha, hora y ubicación.
- Abrir el PDF cargado.
- Comprobar requisitos y condiciones.
- Revisar ortografía y datos de contacto.
- Confirmar que el evento debe quedar visible.
- Abrir la página pública del remate después de publicar.

