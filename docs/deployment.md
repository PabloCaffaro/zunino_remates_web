# Despliegue

Esta guía describe el procedimiento previsto. El proveedor de hosting y el
dominio definitivo todavía no fueron elegidos.

## Requisitos previos

- Contenido y datos de contacto reales.
- Supabase conectado y migración aplicada.
- Usuario administrador definitivo.
- PDFs e imágenes migrados a Storage.
- Variables de producción configuradas.
- Dominio y URL canónica definidos.

No debe publicarse el login ni la persistencia local de demostración.

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

Configurar en el hosting:

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=TU_CLAVE_PUBLICABLE
```

No configurar `service_role` como variable del frontend.

## Rutas SPA

El servidor debe devolver `index.html` para rutas como:

```text
/remates/maquinaria-y-herramientas
/admin12345
```

La regla exacta depende del hosting:

- Vercel: rewrite en `vercel.json`.
- Netlify: regla en `_redirects`.
- Apache: regla en `.htaccess`.
- Nginx: `try_files`.

Se agregará solamente la configuración del proveedor elegido.

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
- Publicar un remate y abrir su catálogo.
- Probar formulario y emails.
- Revisar consola, errores de red y logs.

## Reversión

Conservar el build anterior y no eliminar migraciones aplicadas. Si una versión
falla:

1. Restaurar el despliegue anterior.
2. Desactivar contenido problemático desde el panel.
3. Revisar logs.
4. Corregir y repetir pruebas antes de desplegar nuevamente.

