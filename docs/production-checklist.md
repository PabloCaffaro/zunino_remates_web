# Pendientes para producción

## Criterio de seguimiento

Por indicación del usuario, desde el 03/09/2026 registrar aquí cada solución
temporal, configuración de desarrollo o decisión que deba retirarse, cambiarse
o verificarse antes de producción. No se solicita una revisión retrospectiva:
este registro se completa a medida que se trabaja.

Cada pendiente debe indicar qué cambiar o comprobar, por qué, cómo validarlo y
su estado. No marcarlo como resuelto sin verificarlo. Consultar este registro
antes de proponer una promoción de desarrollo a main o un despliegue productivo.
Anotar un pendiente no autoriza implementarlo ni cambiar producción.

## Registro

### Autenticación y entornos

- **Pendiente:** crear un proyecto Supabase productivo separado, aplicar sus
  migraciones y crear allí el primer administrador. El proyecto actual continúa
  siendo desarrollo/staging. Validar acceso, permisos y cierre de sesión antes de
  promover `desarrollo` a `main`.
- **Pendiente:** configurar `SESSION_SECRET` con valores distintos y aleatorios
  para Preview/Development y Production. Nunca usar prefijo `VITE_`. Confirmar
  que la cookie sea `HttpOnly`, `Secure` y `SameSite=Strict` en el despliegue.
- **Pendiente:** revisar límites de intentos de Supabase Auth y agregar protección
  de fuerza bruta en Vercel si el tráfico real lo requiere.
- **Pendiente:** habilitar y validar la protección de Supabase Auth contra
  contraseñas filtradas antes de producción. El asesor de seguridad la reporta
  actualmente desactivada.

### Funcionalidad todavía diferida

- **Pendiente:** conectar edición de contenido general a la API y PostgreSQL.
- **Pendiente:** implementar Supabase Storage para imágenes, sus políticas y la
  limpieza de archivos huérfanos. Hasta entonces la API rechaza imágenes nuevas.
- **Pendiente:** validar el flujo completo en móvil, incluido el lightbox de lotes
  destacados a tamaño útil de pantalla.

### Verificación antes de producción

- **Pendiente:** ejecutar pruebas automatizadas, pruebas SQL, lint y build sobre
  la versión candidata, y repetir el circuito real de login, creación, edición,
  publicación, conflicto concurrente, cierre de sesión y acceso público.
- **Pendiente:** revisar y actualizar dependencias con avisos de seguridad antes
  de producción. La instalación actual reporta avisos que no deben corregirse en
  bloque sin analizar compatibilidad y alcance.
