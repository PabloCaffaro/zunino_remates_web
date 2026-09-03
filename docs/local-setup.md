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

Copiar `.env.example` como `.env.local` cuando comience la conexión con Supabase:

```powershell
Copy-Item .env.example .env.local
```

Completar con variables de servidor, sin prefijo `VITE_`:

```env
SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_PUBLISHABLE_KEY=TU_CLAVE_PUBLICABLE
SESSION_SECRET=UN_SECRETO_ALEATORIO_LARGO
```

Actualmente estas variables están documentadas, pero la aplicación todavía no
las utiliza. React consumirá `/api/v1/*` y no recibirá configuración de
Supabase. Todo valor que comienza con `VITE_` queda disponible en el navegador,
por lo que no se usará para esta integración.

## Datos de demostración

Mientras Supabase no esté conectado:

- El contenido se inicializa desde `src/data/`.
- Los cambios del panel se guardan en `localStorage`.
- La sesión administrativa se guarda en `sessionStorage`.
- La información puede perderse al limpiar los datos del navegador.

El panel incluye una opción para restablecer los datos iniciales.

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

El esquema aún no debe asumirse aplicado. Las instrucciones están en
[`supabase/README.md`](../supabase/README.md).

Cuando se conecte:

1. Aplicar la migración.
2. Crear el primer usuario administrativo.
3. Configurar `.env.local`.
4. Instalar el cliente oficial de Supabase para el código servidor.
5. Crear la API de Vercel y reemplazar autenticación y persistencia local.

Las instalaciones se realizan manualmente y deben acordarse antes de modificar
dependencias.

## Problemas frecuentes

- Si una ruta interna devuelve `404`, falta la regla SPA del servidor.
- Si los cambios del panel desaparecen, revisar el almacenamiento del navegador.
- Si npm reporta certificados, probar `npm ping` desde la terminal local.
- Si aparecen caracteres incorrectos, confirmar que el archivo esté en UTF-8.
