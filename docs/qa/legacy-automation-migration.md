# Migración de automatización QA heredada

El 22 de octubre de 2026 se preparó en Playwright Test la migración de los
scripts temporales que utilizaban `playwright-core` desde un sandbox externo.
La infraestructura vigente está en `playwright.config.ts` y `tests/e2e`.

## Cobertura migrada

| Caso | Cobertura conservada |
|---|---|
| MOB-004 | Apertura y cierre del menú móvil; navegación a Remates, editor, Contenido general y Resumen. |
| MOB-008 | Transiciones del menú, apertura del sitio público en otra pestaña y cierre de sesión. |
| MOB-013 | Visibilidad de cierre y backdrop al pasar de 390 px a 1024 px y volver. |
| MOB-014 | Overflow horizontal y accesibilidad de acciones/dropzone a 320, 390 y 456 px. |

Cada caso se ejecuta como una prueba `@regression` independiente. El resultado
histórico del script independiente aprobó MOB-004 y MOB-008; MOB-014 registró un
fallo funcional, no un error técnico. MOB-013 existía únicamente en la variante
combinada y también fue migrado.

## Información histórica conservada

El resultado histórico de CAT-016 confirmó rechazo de archivo vacío, GIF y PDF,
aceptación de PNG válido y ausencia de solicitudes a Storage durante la
selección. Esa prueba no se incorporó a esta migración porque el script que la
generó ya no estaba disponible; el resultado y log se conservaron para una
eventual reconstrucción.

Los originales, resultados, logs, renders `before/after`, guía Vercel previa y
SQL de recuperación se copiaron con verificación SHA-256 a la ubicación local
ignorada por Git:

```text
backups/auxiliary-cleanup-2026-10-22/
```

El respaldo no contiene valores de las credenciales locales ni tokens. No debe
publicarse ni sustituye las evidencias registradas en `docs/qa/evidence`.

## Estado de validación

El smoke del Preview objetivo y las cuatro regresiones pasaron con Edge. Las
credenciales QA se leen de forma literal para conservar caracteres que tienen
significado especial en archivos dotenv, sin copiarlas a otros archivos.

MOB-014 conserva los anchos y comprobaciones funcionales del script heredado,
pero mide el layout activo: excluye temporalmente el sidebar cerrado y los
tooltips con opacidad cero, restaura sus estilos inmediatamente y mantiene las
comprobaciones de ancho, acciones y dropzone. El diagnóstico confirmó que el
sidebar cerrado no aumentaba `scrollWidth`; los falsos positivos provenían de
elementos intencionalmente fuera del viewport o visualmente inactivos.

La cobertura útil quedó migrada a `tests/e2e` y la instalación temporal de
`playwright-core` dejó de ser necesaria.
