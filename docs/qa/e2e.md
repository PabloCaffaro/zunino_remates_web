# Pruebas E2E y acceso a Previews QA

La instalación y el smoke reproducible se documentan en el
[README principal](../../README.md#pruebas-e2e-con-playwright). Esta guía cubre
el acceso protegido y las regresiones administrativas.

## Comandos

```powershell
npm run test:e2e:smoke
npm run test:e2e:regression
npm run test:e2e
```

El smoke no inicia sesión. Las regresiones leen `QA_ADMIN_EMAIL` y
`QA_ADMIN_PASSWORD` desde `.qa-credentials.local`. Las regresiones de permisos
también requieren `QA_EDITOR_EMAIL` y `QA_EDITOR_PASSWORD` en ese mismo archivo.
Las regresiones de solo lectura reutilizan fixtures QA existentes. Las que
ejercen escrituras crean únicamente fixtures descartables con UUID y prefijo QA,
registran su estado en un journal ignorado y verifican su eliminación antes de
finalizar. Cada caso corre en un contexto independiente, por lo que un fallo no
impide ejecutar los demás.

## Comprobaciones de Vercel

Antes de diagnosticar un Preview, confirmar identidad, proyecto, scope y URL
exacta del deployment:

```powershell
vercel whoami --format json
vercel project inspect --non-interactive --json
```

Para solicitudes HTTP usar `vercel curl` con el deployment explícito. Una ruta
sola podría resolver otro deployment:

```powershell
$preview = "https://DEPLOYMENT-EXACTO.vercel.app"
vercel curl /api/v1/health --deployment $preview -- --silent --show-error --max-redirs 0
```

Durante un diagnóstico no agregar `--location`. Registrar solamente el código
HTTP, `Content-Type`, el cuerpo JSON de la aplicación, `requestId` y
`x-request-id`. Nunca registrar headers internos de Vercel, tokens, cookies o
credenciales.

Playwright obtiene una cookie temporal mediante
`VERCEL_AUTOMATION_BYPASS_SECRET`. La cabecera secreta se limita a una única
solicitud al origen configurado y no se agrega al contexto del navegador. La
cookie se guarda en una ruta temporal ignorada y se elimina al finalizar.

## Separación de autenticaciones

- El bypass de Vercel y la sesión administrativa son mecanismos distintos.
- Las credenciales administrativas permanecen en `.qa-credentials.local`.
- No incluir credenciales en comandos, logs, capturas, scripts versionados ni
  reportes.
- Para diagnósticos manuales con cookies, usar un jar distinto por usuario,
  crearlo fuera del repositorio y eliminarlo al terminar.
- En solicitudes administrativas manuales, usar el origen exacto del deployment
  como `Origin`, `Content-Type: application/json` y
  `x-requested-with: zunino-admin`.

Si el acceso deja de funcionar, comprobar primero la versión de Vercel CLI,
`whoami`, el vínculo del proyecto y la URL exacta. No desactivar Deployment
Protection ni crear otro bypass sin autorización.
