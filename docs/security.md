# Seguridad

## Estado actual

La aplicación todavía tiene elementos de demostración:

- Usuario y contraseña dentro del frontend.
- Sesión almacenada en `sessionStorage`.
- Contenido persistido en `localStorage`.
- Formulario enviado mediante un servicio externo.

Estos mecanismos sirven para desarrollo, pero no protegen un entorno público.
La ruta `/admin12345` no es una medida de seguridad.

## Arquitectura prevista

- Supabase Auth para identidad y sesiones.
- `admin_profiles` para roles `administrador` y `editor`.
- RLS para autorizar cada operación.
- Storage privado con acceso según el estado del remate.
- Validación de publicación en React y PostgreSQL.
- API del mismo origen en Vercel para autenticación, datos y contacto.
- Auditoría para registrar modificaciones.

El esquema está en [`supabase/migrations`](../supabase/migrations).

## Secretos y variables

React no recibirá la URL, la clave publicable ni los tokens de Supabase. La API
de Vercel utilizará la clave publicable del lado servidor y conservará RLS al
propagar la identidad del usuario.

Nunca debe estar en React, Git ni variables `VITE_*`:

- `service_role`.
- Contraseñas.
- Claves privadas.
- Credenciales SMTP.
- Tokens de servicios externos.

Los secretos del servidor se configurarán como variables de Vercel sin prefijo
`VITE_`. El CRUD habitual no utilizará una clave que omita RLS.

## Roles

- `editor`: crea, edita, revisa y publica contenido; actualiza la configuración
  principal y atiende consultas.
- `administrador`: además gestiona usuarios, elimina registros sensibles y lee
  la auditoría.

Los permisos se validan en la base. Ocultar botones en la interfaz mejora la
experiencia, pero no reemplaza RLS.

La configuración principal no puede insertarse ni eliminarse desde la
aplicación. La matriz completa está en
[`supabase/ACCESS_CONTROL.md`](../supabase/ACCESS_CONTROL.md).

Cuando una persona deja de administrar el sitio:

1. Desactivar su registro en `admin_profiles`.
2. Cerrar o revocar sus sesiones.
3. Revisar auditoría reciente.

La base impide que una modificación deje al sistema sin ningún administrador
activo.

## Archivos

- Las imágenes de lotes se guardarán en un bucket privado.
- Solo el equipo autenticado podrá subir o eliminar.
- Los visitantes accederán a archivos asociados a remates publicados.
- Se validarán tipo, tamaño y nombre de archivo.
- No se aceptarán ejecutables ni tipos fuera de la lista permitida.

## Formulario de contacto

La versión de producción debe:

- Validar y limitar longitud del lado servidor.
- Aplicar rate limiting.
- Utilizar honeypot o captcha.
- Evitar incluir HTML sin sanitizar.
- No revelar detalles internos en mensajes de error.
- Registrar solamente los datos necesarios.

Si una operación futura necesita una clave privilegiada, deberá quedar aislada
en un endpoint específico y nunca reutilizarse para el CRUD habitual.

Los cambios de estado se auditan sin copiar nombre, email, mensaje, notas
internas, agente de usuario ni hash de IP. Solo un administrador activo puede
leer `audit_log`.

El contenido original de las consultas es inmutable desde la aplicación. El
equipo solo puede actualizar su estado, notas internas y datos de atención.

## Dependencias

Revisar periódicamente:

```powershell
npm audit --omit=dev
npm audit
```

No ejecutar `npm audit fix --force` sin revisar los cambios incompatibles.
Actualizar dependencias en cambios pequeños y ejecutar pruebas, lint y build.

## Producción

- HTTPS obligatorio.
- Headers de seguridad.
- Recuperación de contraseña configurada.
- Política de sesiones revisada.
- Backups de Supabase verificados.
- Logs y alertas disponibles.
- Cuenta administrativa con contraseña fuerte y MFA cuando esté disponible.

## Respuesta ante incidentes

Si se sospecha una exposición:

1. Revocar sesiones y credenciales comprometidas.
2. Desactivar administradores afectados.
3. Rotar secretos del servidor.
4. Revisar `audit_log`, Auth y logs de Storage.
5. Corregir la causa antes de restaurar el acceso.
6. Documentar el incidente y las medidas tomadas.
