# Configuración local

## Requisitos

- Node.js 24 LTS.
- npm 11 o compatible.
- Git.
- Un editor con soporte para TypeScript.

Verificación:

```powershell
node --version
npm --version
```

## Preparar el proyecto

Desde la raíz:

```powershell
npm install
npm run dev
```

La instalación solo es necesaria al descargar el proyecto o cuando cambia
`package.json`.

## Variables de entorno

Copiar `.env.example` como `.env.local`:

```powershell
Copy-Item .env.example .env.local
```

Completar con variables de servidor, sin prefijo `VITE_`:

```env
SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_PUBLISHABLE_KEY=TU_CLAVE_PUBLICABLE
SESSION_SECRET=UN_SECRETO_ALEATORIO_LARGO
```

La API utiliza `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` para lecturas,
autenticación y operaciones con la identidad del usuario. `SESSION_SECRET`
cifra y firma la cookie administrativa.
React consumirá `/api/v1/*` y no recibirá configuración de Supabase. Todo valor
que comienza con `VITE_` queda disponible en el navegador, por lo que no se
usará para esta integración.

`npm run dev` inicia solamente Vite y no ejecuta las funciones de `api/`. Para
probar en una misma dirección la interfaz y la API será necesario usar el
entorno local de Vercel. Esa herramienta no forma parte todavía de las
dependencias del proyecto y su instalación debe acordarse antes de realizarla.

Mientras se usa solamente `npm run dev`, las solicitudes a `/api/v1/public/*`
no estarán disponibles y la página mostrará un error con opción de reintentar. Esto no
permite validar cambios realizados en Supabase.

## Datos de demostración

El proveedor local de `src/context` se conserva para pruebas automatizadas y
para `main` mientras no se promueva esta integración. En `desarrollo`, el panel
real no guarda sesión ni datos administrativos en el almacenamiento del navegador.

## Calidad

Ejecutar antes de entregar cambios:

```powershell
npm test
npm run lint
npm run build
```

Para desarrollar pruebas de manera continua:

```powershell
npm run test:watch
```

## Supabase

El esquema de staging está aplicado. Las instrucciones y el estado de las
migraciones están en [`supabase/README.md`](../supabase/README.md).

La conexión implementada incluye:

1. Configurar `.env.local`.
2. Cliente oficial de Supabase para el código servidor.
3. Crear la API de Vercel y comprobar la conexión con `/api/v1/health`.
4. Supabase Auth y sesión de servidor cifrada.
5. Lecturas y escrituras administrativas mediante endpoints.
6. Contenido general e imágenes privadas con URLs firmadas temporales.

Las instalaciones se realizan manualmente y deben acordarse antes de modificar
dependencias.

## Problemas frecuentes

- Si una ruta interna devuelve `404`, falta la regla SPA del servidor.
- Si el panel no carga, revisar las variables, la sesión y los logs de `/api/v1/admin/*`.
- Si npm reporta certificados, probar `npm ping` desde la terminal local.
- Si aparecen caracteres incorrectos, confirmar que el archivo esté en UTF-8.
