# Supabase - Zunino Remates

Esta carpeta contiene el esquema versionado de la base de datos.

## Diagrama editable

El archivo `Zunino-Remates-ER.drawio` contiene el diagrama entidad-relación
editable. Se puede abrir desde [diagrams.net](https://app.diagrams.net/) usando
`File > Open From > Device`, o directamente con la aplicación de draw.io.

El diagrama incluye las tablas públicas, `auth.users`, `storage.objects`,
cardinalidades y referencias lógicas de archivos.

## Qué incluye

- Usuarios administrativos vinculados con Supabase Auth.
- Remates con estados `borrador`, `en_revision`, `publicado`, `finalizado` y `cancelado`.
- Requisitos, condiciones y lotes destacados relacionados.
- Preguntas frecuentes, pasos de participación y configuración general.
- Consultas de contacto preparadas para una Edge Function.
- Auditoría de modificaciones.
- Bucket privado para imágenes.
- Row Level Security en todas las tablas expuestas.
- Validación en PostgreSQL antes de publicar un remate.

La distribución exacta de permisos está documentada en
[`ACCESS_CONTROL.md`](ACCESS_CONTROL.md).

## Aplicar por primera vez

La forma más directa, sin instalar herramientas, es:

1. Abrir el proyecto en Supabase.
2. Ir a `SQL Editor`.
3. Crear una consulta nueva.
4. Pegar el contenido de `migrations/20260607000000_initial_schema.sql`.
5. Ejecutar la consulta una sola vez.

Para proyectos más avanzados conviene usar Supabase CLI y aplicar migraciones
versionadas. Esa instalación se hará por separado cuando decidamos adoptarla.

## Crear el primer administrador

1. En Supabase ir a `Authentication > Users`.
2. Crear el usuario con email y contraseña.
3. Copiar su UUID.
4. Ejecutar en `SQL Editor`, reemplazando los valores:

```sql
insert into public.admin_profiles (user_id, nombre, rol)
values (
  'UUID_DEL_USUARIO',
  'Nombre del administrador',
  'administrador'
);
```

Los siguientes usuarios pueden tener rol `administrador` o `editor`.

- `administrador`: puede eliminar remates y consultas, gestionar usuarios y
  leer la auditoría.
- `editor`: puede crear, editar, revisar y publicar contenido, actualizar la
  configuración y atender consultas sin eliminarlas.

Ninguno de estos roles puede insertar ni eliminar la fila de configuración
principal desde la aplicación.

La base tampoco permite desactivar, degradar ni eliminar al último administrador
activo.

## Reglas de publicación

Un remate puede guardarse incompleto como `borrador` o `en_revision`.

Para pasar a `publicado`, PostgreSQL exige:

- Título, subtítulo y slug.
- Fecha real o estado `Fecha a confirmar`.
- Lugar y ubicación detallada.
- Descripción breve y completa.
- Descripción y estado del catálogo.
- Al menos un requisito.
- Al menos una condición.

El panel puede consultar los errores antes de publicar:

```sql
select *
from public.validate_remate_for_publication('UUID_DEL_REMATE');
```

Aunque el frontend omitiera esa comprobación, el trigger de la base impediría una
publicación incompleta.

## Organización de Storage

Los buckets creados son:

- `lotes-remates`: JPEG, PNG o WebP, hasta 5 MB.

Cada archivo debe guardarse dentro de una carpeta cuyo nombre sea el UUID del
remate:

```text
lotes-remates/<remate-id>/<lote-id>.webp
```

El bucket es privado. La web puede descargar imágenes únicamente cuando la
carpeta pertenece a un remate publicado. Los borradores y remates en revisión no
exponen sus documentos aunque alguien conozca la ruta.

Solo los usuarios administrativos activos pueden subir, reemplazar o eliminar
objetos. En React usaremos `download()` o URLs firmadas; `getPublicUrl()` no
corresponde para este bucket.

## Formulario de contacto

La tabla `consultas_contacto` no permite inserciones directas desde el navegador.
La futura Edge Function validará captcha, límites de frecuencia y contenido, y
usará la clave de servicio únicamente del lado servidor.

La auditoría registra cambios de estado sin duplicar los datos personales de la
consulta. Solamente los administradores activos pueden leerla.

El nombre, email, mensaje, origen y datos técnicos de una consulta son
inmutables desde la aplicación. El equipo puede cambiar únicamente el estado,
las notas internas y los datos de atención.

## Pruebas de base de datos

Las pruebas pgTAP están en `tests/database` y verifican RLS, separación de roles,
protección de la configuración, auditoría y minimización de datos personales.

Cuando adoptemos Supabase CLI y tengamos la base local preparada, se ejecutarán
con:

```powershell
supabase test db
```

Estas pruebas no aplican cambios al proyecto remoto. Deben ejecutarse contra una
base local creada desde las migraciones.

## Variables futuras del frontend

Cuando conectemos React se necesitarán:

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=TU_CLAVE_PUBLICABLE
```

Nunca se debe incluir `service_role` en React ni en variables `VITE_*`.

## Datos pendientes antes de producción

- Completar contacto y ubicación reales en `configuracion_sitio`.
- Definir dominio, SEO e imagen Open Graph.
- Crear el usuario administrador definitivo.
- Configurar recuperación de contraseña y política de sesiones.
- Crear la Edge Function del formulario.
- Migrar los remates existentes desde `localStorage`.
