# Despliegue

Esta versión se puede desplegar en Vercel como demostración. Vercel detecta
Vite, ejecuta `npm run build` y publica el directorio `dist/`.

## Requisitos previos

- Contenido y datos de contacto reales.
- La interfaz pública todavía puede funcionar sin variables de entorno porque
  conserva los datos de demostración en el navegador.
- Revisar contenido y datos de contacto antes de compartir la URL.

La sesión administrativa y los datos se guardan localmente en el navegador.
Por eso esta publicación sirve para presentar la web, pero no para administrar
remates reales desde varias personas.

## Control de calidad

Antes de generar una versión:

```powershell
npm ci
npm test
npm run lint
npm run build
```

El resultado de producción se genera en `dist/`.

## Variables

La API de Vercel consume variables de servidor sin el prefijo `VITE_`:

```env
SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_PUBLISHABLE_KEY=TU_CLAVE_PUBLICABLE
SESSION_SECRET=UN_SECRETO_ALEATORIO_LARGO
```

`SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` son necesarias para comprobar la
conexión. `SESSION_SECRET` se utilizará cuando se implemente la autenticación
real y todavía no es necesaria para el endpoint de salud.

No configurar `SUPABASE_SERVICE_ROLE_KEY`, contraseñas ni otros secretos como
variables `VITE_*`: esos valores quedan disponibles en el navegador.

El proyecto Supabase actual se utiliza como desarrollo/staging. Producción debe
tener un proyecto separado y solo recibe migraciones ya verificadas en la rama
`desarrollo`.

## Rutas SPA

El servidor debe devolver `index.html` para rutas como:

```text
/remates/maquinaria-y-herramientas
/admin12345
```

El archivo [`vercel.json`](../vercel.json) ya contiene el rewrite necesario.

## Comprobación de la API

La ruta `GET /api/v1/health` verifica que la función de Vercel está activa y que
puede consultar Supabase. Una respuesta correcta tiene estado HTTP `200`:

```json
{
  "status": "ok",
  "checks": {
    "api": "ok",
    "database": "ok"
  },
  "requestId": "identificador-de-la-solicitud"
}
```

Si Supabase o la configuración no están disponibles, responde con HTTP `503`
sin exponer URLs, claves ni detalles internos del error.

## Supabase

1. Aplicar las migraciones pendientes.
2. Confirmar RLS en todas las tablas expuestas.
3. Crear o verificar los buckets privados.
4. Crear administradores mediante Auth y `admin_profiles`.
5. Configurar URLs permitidas y recuperación de contraseña.
6. Probar lectura pública y operaciones administrativas.

Consultar [`supabase/README.md`](../supabase/README.md).

## SEO y dominio

Antes de publicar:

- Reemplazar el dominio provisional en metadata, sitemap y robots.
- Configurar una imagen Open Graph.
- Revisar títulos y descripciones.
- Enviar el sitemap a Google Search Console.
- Confirmar redirección de HTTP a HTTPS.

## Headers recomendados

- `Content-Security-Policy`.
- `X-Content-Type-Options: nosniff`.
- `Referrer-Policy`.
- `Permissions-Policy`.
- Protección contra inclusión en iframes.
- HSTS después de confirmar HTTPS estable.

La política CSP debe ajustarse a Supabase, Google Maps, fuentes y al servicio de
contacto realmente utilizado.

## Verificación posterior

- Abrir la home desde escritorio y celular.
- Refrescar una ruta de detalle.
- Iniciar y cerrar sesión.
- Crear un borrador y verificar que no sea público.
- Publicar un remate y abrir su página de detalle.
- Probar formulario y emails.
- Revisar consola, errores de red y logs.

## Reversión

Conservar el build anterior y no eliminar migraciones aplicadas. Si una versión
falla:

1. Restaurar el despliegue anterior.
2. Desactivar contenido problemático desde el panel.
3. Revisar logs.
4. Corregir y repetir pruebas antes de desplegar nuevamente.
