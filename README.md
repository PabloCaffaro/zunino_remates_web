# Zunino Remates Web

Sitio web para promocionar remates presenciales, presentar sus catálogos y
administrar el contenido de la empresa.

El proyecto incluye una web pública, páginas de detalle por remate y un panel
administrativo. En la rama `desarrollo`, la web pública y el panel utilizan una
API del mismo origen conectada con Supabase Auth, PostgreSQL y Storage privado.
Los datos públicos y administrativos se obtienen mediante la API conectada a Supabase.

## Tecnologías

- React 18 y TypeScript.
- Vite.
- React Router.
- Vitest y React Testing Library.
- Supabase para Auth, PostgreSQL y Storage.

## Requisitos

- Node.js 24 LTS.
- npm 11 o compatible.

## Inicio rápido

```powershell
npm install
npm run dev
```

Vite mostrará la dirección local, normalmente `http://localhost:5173`.

## Comandos

```powershell
npm run dev        # Servidor de desarrollo
npm test           # Suite automática
npm run test:watch # Pruebas en modo continuo
npm run test:e2e:smoke # Smoke E2E sobre el Preview protegido (Microsoft Edge)
npm run test:e2e   # Todas las pruebas E2E presentes y futuras
npm run test:e2e:regression # Regresiones marcadas con @regression
npm run lint       # Revisión estática
npm run build      # Compilación de producción
npm run preview    # Vista previa del build
```

## Pruebas E2E con Playwright

El smoke E2E usa Microsoft Edge instalado en el equipo (`channel: "msedge"`) y
no requiere descargar navegadores de Playwright. Desde una instalación limpia:

1. Instalá Node.js 24 LTS y Microsoft Edge.
2. Copiá la configuración local autorizada a `.env.local` e incluí
   `VERCEL_AUTOMATION_BYPASS_SECRET`. No confirmes ese archivo en Git.
3. Instalá exactamente las dependencias bloqueadas por el repositorio:

   ```powershell
   $env:PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1"
   npm ci
   ```

4. Ejecutá el smoke desde la raíz del repositorio:

   ```powershell
   npm run test:e2e:smoke
   ```

El objetivo predeterminado es el Preview asociado al commit
`7b5e179383e8c1dff0d112e30dfd82f994fb0493`. Para otro Preview se puede definir
`E2E_BASE_URL` con una URL HTTPS. La preparación obtiene una cookie temporal con
el mecanismo oficial de Vercel; la cabecera que contiene el secreto se envía en
una única solicitud al origen configurado y no se agrega al contexto del
navegador. La autenticación del panel es independiente: el smoke solo comprueba
el formulario y nunca inicia sesión.

Los resultados temporales se guardan en rutas ignoradas por Git y la cookie se
elimina al finalizar normalmente. `npm test` continúa reservado para Vitest;
Playwright detecta sus pruebas únicamente dentro de `tests/e2e`.

Las regresiones administrativas reutilizan los fixtures QA existentes y exigen
credenciales locales en `.qa-credentials.local`. Se ejecutan de forma
independiente con `npm run test:e2e:regression`; no crean ni modifican remates.
Los detalles de acceso y mantenimiento están en
[Pruebas E2E y acceso a Previews QA](docs/qa/e2e.md).

Antes de integrar o publicar un cambio deben pasar:

```powershell
npm test
npm run lint
npm run build
```

## Rutas

- `/`: página principal.
- `/remates/:slug`: detalle de un remate publicado.
- `/admin12345`: panel administrativo protegido por sesión de servidor.

La ruta administrativa no es una medida de seguridad: el acceso se protege con
Supabase Auth, cookie cifrada `HttpOnly`, API del mismo origen y políticas RLS.

## Estructura

```text
src/
├── admin/       # Configuración y reglas del panel
├── components/  # Componentes compartidos y secciones
├── context/     # Estado remoto y proveedores de datos
├── data/        # Clientes de API, formato y selectores
├── pages/       # Páginas y rutas
├── test/        # Configuración y datos para pruebas
└── types/       # Tipos TypeScript

docs/            # Documentación de mantenimiento
public/          # Archivos estáticos del sitio
supabase/        # Migraciones, modelo y diagrama de base de datos
```

## Estado del proyecto

Implementado:

- Diseño responsive y accesibilidad básica.
- Remates, catálogos y páginas de detalle.
- Formulario de contacto mediante FormSubmit.
- Panel administrativo conectado a Supabase en `desarrollo`.
- Validación previa a la publicación.
- Pruebas unitarias y de integración.
- Lectura pública, CRUD administrativo, contenido general e imágenes mediante Supabase.

Pendiente antes de producción:

- Crear y validar un proyecto Supabase separado para producción.
- Migrar y revisar los datos reales.
- Implementar el formulario seguro mediante la API de Vercel.
- Configurar hosting, dominio, variables, rutas SPA y headers.
- Completar contenido, SEO y pruebas finales.

## Documentación

- [Arquitectura](docs/architecture.md)
- [Configuración local](docs/local-setup.md)
- [Guía del panel](docs/admin-guide.md)
- [Despliegue](docs/deployment.md)
- [Seguridad](docs/security.md)
- [Supabase](supabase/README.md)
- [Modelo de datos](supabase/SCHEMA.md)
- [Diagrama editable](supabase/Zunino-Remates-ER.drawio)
