# Matriz de acceso

Esta matriz describe los permisos esperados en PostgreSQL y Storage. La
interfaz puede ocultar acciones según el rol, pero la autorización definitiva
se aplica mediante Row Level Security (RLS).

## Roles

- `visitante`: persona no autenticada que usa la web pública.
- `editor`: integrante activo que administra contenido y atiende consultas.
- `administrador`: integrante activo que, además, gestiona usuarios, auditoría
  y eliminaciones sensibles.
- `inactivo`: usuario autenticado cuyo perfil administrativo está desactivado;
  conserva el acceso público y puede leer su propio perfil, pero no administrar.

## Permisos sobre datos

| Recurso | Visitante | Editor | Administrador |
| --- | --- | --- | --- |
| Remates publicados | Leer | Leer y actualizar | Leer, actualizar y eliminar |
| Borradores y remates en revisión | Sin acceso | Leer, crear y actualizar | Leer, crear, actualizar y eliminar |
| Requisitos y condiciones | Leer si el remate está publicado | Gestionar | Gestionar |
| Lotes destacados | Leer los visibles de remates publicados | Gestionar | Gestionar |
| Preguntas frecuentes y pasos | Leer los visibles | Gestionar | Gestionar |
| Configuración principal | Leer | Actualizar | Actualizar |
| Consultas de contacto | Sin acceso | Leer y actualizar estado, notas y atención | Leer, actualizar estado, notas y atención; eliminar |
| Perfiles administrativos | Sin acceso | Leer el perfil propio | Gestionar |
| Auditoría | Sin acceso | Sin acceso | Leer |

La fila `configuracion_sitio/principal` se crea mediante la migración. Ningún
rol de la aplicación puede insertarla ni eliminarla; una recuperación debe
realizarse con una migración controlada.

## Permisos sobre imágenes

| Acción en `lotes-remates` | Visitante | Editor | Administrador |
| --- | --- | --- | --- |
| Descargar | Solo si pertenece a un remate publicado | Sí | Sí |
| Subir o reemplazar | No | Sí, dentro de una carpeta de remate existente | Sí, dentro de una carpeta de remate existente |
| Eliminar | No | Sí | Sí |

## Auditoría y privacidad

- Los cambios en contenido, configuración, consultas y perfiles
  administrativos generan registros en `audit_log`.
- Solo un `administrador` activo puede leer la auditoría.
- La aplicación no puede insertar, actualizar ni eliminar registros de
  auditoría directamente; los generan triggers protegidos.
- El contenido original de una consulta es inmutable para la aplicación; solo
  pueden cambiar su estado, notas internas y datos de atención.
- La auditoría de `consultas_contacto` excluye `nombre`, `email`, `mensaje`,
  `notas_internas`, `user_agent` e `ip_hash` para no duplicar datos personales.
- Las acciones realizadas fuera de una sesión, por ejemplo desde SQL Editor,
  pueden quedar con `changed_by` vacío.
- La base impide desactivar, degradar o eliminar al último administrador activo.

## Implementación y verificación

- Políticas y permisos: [`migrations/20260607000000_initial_schema.sql`](migrations/20260607000000_initial_schema.sql).
- Pruebas RLS: [`tests/database/001_security_policies.test.sql`](tests/database/001_security_policies.test.sql).
- Guía general: [`../docs/security.md`](../docs/security.md).
