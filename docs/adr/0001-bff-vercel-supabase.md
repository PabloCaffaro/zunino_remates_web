# ADR-0001: API intermedia en Vercel delante de Supabase

- Estado: aceptada
- Fecha: 2026-09-02

## Contexto

La aplicación actual es una SPA de React y Vite que conserva la sesión y los
datos de demostración en el navegador. La versión productiva necesita datos
compartidos, autenticación real y una separación clara entre la interfaz y la
infraestructura de Supabase.

Aunque el acceso directo desde React a Supabase puede protegerse con RLS,
expondría al navegador los contratos de tablas, la URL del proyecto y los
tokens de Supabase. Además acoplaría los componentes a la estructura física de
la base.

## Decisión

Se utilizará una API del mismo origen implementada con Vercel Functions:

```text
React/Vite -> /api/v1/* -> Vercel Functions -> Supabase Auth/PostgreSQL/Storage
```

- React consumirá DTO públicos o administrativos definidos por la API; nunca
  filas completas de PostgreSQL.
- Las lecturas públicas usarán una clave publicable y el rol anónimo.
- Las operaciones administrativas llegarán a Supabase con la identidad del
  usuario para que RLS siga siendo la autorización definitiva.
- No se usará una clave `service_role` o secreta para el CRUD habitual.
- Si una operación futura requiere privilegios elevados, quedará aislada en un
  módulo y endpoint específicos, con autorización y auditoría propias.
- La sesión administrativa será gestionada por la API mediante cookies
  `HttpOnly`, `Secure` y `SameSite`; React no almacenará tokens.
- Las mutaciones con cookies tendrán protección CSRF y las respuestas privadas
  usarán `Cache-Control: private, no-store`.
- El frontend y la API permanecerán en el mismo repositorio, pero `src/` será
  código de navegador y `api/` código de servidor sin importaciones cruzadas de
  secretos o infraestructura.

## Entornos y despliegue

El proyecto Supabase actual `jcidcoqxrnrbwlyrycfg` se considera desarrollo o
staging mientras no contenga datos productivos. La rama Git `desarrollo` se
validará contra ese entorno. La rama `main` y el entorno productivo solo
recibirán cambios después de aprobar pruebas y una promoción explícita.

Las migraciones se aplican primero en staging y avanzan siempre hacia adelante.
Un rollback del frontend utiliza un despliegue anterior; una corrección de base
utiliza una migración nueva, sin borrar migraciones ya aplicadas.

## Consecuencias

La API agrega código para sesión, CSRF, errores, DTO y observabilidad, pero
reduce la superficie visible, desacopla React de Supabase y conserva RLS como
defensa adicional. Los datos que la página necesita mostrar públicamente
seguirán siendo visibles para cualquier visitante; la separación protege datos
internos, borradores, credenciales y lógica privilegiada.

## Decisiones posteriores

Antes de conectar las escrituras se documentarán por separado:

- sesión, renovación y cierre de sesión;
- agregado transaccional de remate y control optimista por versión;
- carga firmada de imágenes y limpieza de archivos huérfanos;
- contratos DTO públicos y administrativos.
