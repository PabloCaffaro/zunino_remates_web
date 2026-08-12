begin;

create extension if not exists pgtap with schema extensions;

select plan(36);

-- Estos usuarios representan cada nivel de acceso sin depender de datos reales.
insert into auth.users (id, email)
values
  ('10000000-0000-0000-0000-000000000001', 'admin-test@example.com'),
  ('10000000-0000-0000-0000-000000000002', 'editor-test@example.com'),
  ('10000000-0000-0000-0000-000000000003', 'inactivo-test@example.com'),
  ('10000000-0000-0000-0000-000000000004', 'sin-perfil-test@example.com'),
  ('10000000-0000-0000-0000-000000000005', 'nuevo-admin-test@example.com');

insert into public.admin_profiles (user_id, nombre, rol, activo)
values
  ('10000000-0000-0000-0000-000000000001', 'Administrador de prueba', 'administrador', true),
  ('10000000-0000-0000-0000-000000000002', 'Editor de prueba', 'editor', true),
  ('10000000-0000-0000-0000-000000000003', 'Usuario inactivo', 'editor', false);

insert into public.remates (
  id,
  slug,
  estado,
  titulo,
  subtitulo,
  fecha_por_confirmar,
  lugar,
  ubicacion_detalle,
  detalle,
  descripcion_larga,
  catalogo_descripcion
)
values
  (
    '20000000-0000-0000-0000-000000000001',
    'remate-borrador-prueba',
    'borrador',
    'Remate borrador',
    'Contenido privado',
    true,
    'Montevideo',
    'Dirección de prueba',
    'Descripción breve de prueba',
    'Descripción completa de prueba',
    'Catálogo en preparación'
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    'remate-publicado-prueba',
    'borrador',
    'Remate publicado',
    'Contenido visible',
    true,
    'Montevideo',
    'Dirección de prueba',
    'Descripción breve de prueba',
    'Descripción completa de prueba',
    'Catálogo disponible en la página'
  );

insert into public.remate_requisitos (remate_id, contenido)
values ('20000000-0000-0000-0000-000000000002', 'Presentar documento de identidad');

insert into public.remate_condiciones (remate_id, contenido)
values ('20000000-0000-0000-0000-000000000002', 'Aceptar las condiciones del remate');

update public.remates
set estado = 'publicado'
where id = '20000000-0000-0000-0000-000000000002';

insert into public.consultas_contacto (
  id,
  nombre,
  email,
  mensaje,
  notas_internas,
  user_agent,
  ip_hash
)
values (
  '30000000-0000-0000-0000-000000000001',
  'Persona de prueba',
  'contacto-test@example.com',
  'Mensaje privado utilizado solamente por la prueba.',
  'Nota interna privada',
  'Navegador de prueba',
  'hash-de-prueba'
);

insert into storage.objects (bucket_id, name)
values
  ('lotes-remates', '20000000-0000-0000-0000-000000000001/lote-borrador.webp'),
  ('lotes-remates', '20000000-0000-0000-0000-000000000002/lote-publicado.webp');

select ok(
  (
    select count(*) = 10
    from pg_catalog.pg_class relation
    join pg_catalog.pg_namespace namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = any(array[
        'admin_profiles',
        'remates',
        'remate_requisitos',
        'remate_condiciones',
        'lotes_destacados',
        'preguntas_frecuentes',
        'pasos_participacion',
        'configuracion_sitio',
        'consultas_contacto',
        'audit_log'
      ])
      and relation.relrowsecurity
  ),
  'RLS está habilitado en todas las tablas públicas de la aplicación'
);

select ok(
  not has_table_privilege('anon', 'public.consultas_contacto', 'SELECT'),
  'El visitante no tiene permiso de tabla sobre consultas de contacto'
);

select ok(
  not has_table_privilege('authenticated', 'public.configuracion_sitio', 'INSERT'),
  'Los usuarios autenticados no pueden insertar la configuración principal'
);

select ok(
  not has_table_privilege('authenticated', 'public.configuracion_sitio', 'DELETE'),
  'Los usuarios autenticados no pueden eliminar la configuración principal'
);

select ok(
  not has_table_privilege('authenticated', 'public.audit_log', 'INSERT')
    and not has_table_privilege('authenticated', 'public.audit_log', 'UPDATE')
    and not has_table_privilege('authenticated', 'public.audit_log', 'DELETE'),
  'La aplicación no puede modificar directamente la auditoría'
);

select ok(
  not has_column_privilege(
    'authenticated',
    'public.consultas_contacto',
    'mensaje',
    'UPDATE'
  )
    and not has_column_privilege(
      'authenticated',
      'public.consultas_contacto',
      'email',
      'UPDATE'
    ),
  'El contenido original de una consulta no puede modificarse'
);

set local role anon;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000000';

select is(
  (select count(*) from public.remates),
  1::bigint,
  'El visitante solamente ve remates publicados'
);

select is(
  (select count(*) from public.configuracion_sitio where id = 'principal'),
  1::bigint,
  'El visitante puede leer la configuración pública'
);

select is(
  (select count(*) from storage.objects where bucket_id = 'lotes-remates'),
  1::bigint,
  'El visitante solamente ve imágenes de remates publicados'
);

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000004';

select is(
  (select count(*) from public.remates),
  1::bigint,
  'Un usuario sin perfil administrativo conserva únicamente el acceso público'
);

select is(
  (select count(*) from public.admin_profiles),
  0::bigint,
  'Un usuario sin perfil no puede leer perfiles administrativos'
);

select is(
  (select count(*) from public.audit_log),
  0::bigint,
  'Un usuario sin perfil no puede leer la auditoría'
);

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000003';

select is(
  (select count(*) from public.remates),
  1::bigint,
  'Un usuario inactivo conserva únicamente la lectura de contenido público'
);

select is(
  (select count(*) from public.admin_profiles),
  1::bigint,
  'Un usuario inactivo puede leer su propio perfil desactivado'
);

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000002';

select is(
  (select count(*) from public.remates),
  2::bigint,
  'El editor puede leer remates publicados y no publicados'
);

select is(
  (select count(*) from public.admin_profiles),
  1::bigint,
  'El editor solamente puede leer su propio perfil'
);

select is(
  (select count(*) from storage.objects where bucket_id = 'lotes-remates'),
  2::bigint,
  'El editor puede listar imágenes de remates publicados y no publicados'
);

select is(
  (
    with creadas as (
      insert into storage.objects (bucket_id, name)
      values (
        'lotes-remates',
        '20000000-0000-0000-0000-000000000001/lote-editor.webp'
      )
      returning 1
    )
    select count(*) from creadas
  ),
  1::bigint,
  'El editor puede subir una imagen dentro de una carpeta de remate existente'
);

select is(
  (
    with actualizadas as (
      update storage.objects
      set name = '20000000-0000-0000-0000-000000000001/lote-editor-actualizado.webp'
      where bucket_id = 'lotes-remates'
        and name = '20000000-0000-0000-0000-000000000001/lote-editor.webp'
      returning 1
    )
    select count(*) from actualizadas
  ),
  1::bigint,
  'El editor puede reemplazar una imagen de un remate existente'
);

select is(
  (
    with eliminadas as (
      delete from storage.objects
      where bucket_id = 'lotes-remates'
        and name = '20000000-0000-0000-0000-000000000001/lote-editor-actualizado.webp'
      returning 1
    )
    select count(*) from eliminadas
  ),
  1::bigint,
  'El editor puede eliminar una imagen de remate'
);

select is(
  (
    with actualizados as (
      update public.configuracion_sitio
      set hero_eyebrow = 'Texto actualizado por editor'
      where id = 'principal'
      returning 1
    )
    select count(*) from actualizados
  ),
  1::bigint,
  'El editor puede actualizar la configuración principal'
);

select is(
  (
    with eliminados as (
      delete from public.remates
      where id = '20000000-0000-0000-0000-000000000001'
      returning 1
    )
    select count(*) from eliminados
  ),
  0::bigint,
  'El editor no puede eliminar remates'
);

select is(
  (
    with actualizados as (
      update public.admin_profiles
      set nombre = 'Editor modificado'
      where user_id = '10000000-0000-0000-0000-000000000002'
      returning 1
    )
    select count(*) from actualizados
  ),
  0::bigint,
  'El editor no puede modificar su perfil administrativo'
);

select is(
  (
    with actualizadas as (
      update public.consultas_contacto
      set estado = 'en_proceso'
      where id = '30000000-0000-0000-0000-000000000001'
      returning 1
    )
    select count(*) from actualizadas
  ),
  1::bigint,
  'El editor puede atender una consulta de contacto'
);

select is(
  (
    with eliminadas as (
      delete from public.consultas_contacto
      where id = '30000000-0000-0000-0000-000000000001'
      returning 1
    )
    select count(*) from eliminadas
  ),
  0::bigint,
  'El editor no puede eliminar consultas de contacto'
);

select is(
  (select count(*) from public.audit_log),
  0::bigint,
  'El editor no puede leer la auditoría'
);

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';

select is(
  (select count(*) from public.admin_profiles),
  3::bigint,
  'El administrador puede leer todos los perfiles administrativos'
);

select ok(
  (select count(*) > 0 from public.audit_log),
  'El administrador puede leer la auditoría'
);

select throws_ok(
  $$
    delete from public.admin_profiles
    where user_id = '10000000-0000-0000-0000-000000000001'
  $$,
  '23514',
  'Debe existir al menos un administrador activo.',
  'No se puede eliminar al último administrador activo'
);

select is(
  (
    with creados as (
      insert into public.admin_profiles (user_id, nombre, rol)
      values (
        '10000000-0000-0000-0000-000000000005',
        'Nuevo administrador',
        'administrador'
      )
      returning 1
    )
    select count(*) from creados
  ),
  1::bigint,
  'El administrador puede crear perfiles administrativos'
);

select ok(
  exists (
    select 1
    from public.audit_log
    where entidad = 'admin_profiles'
      and registro_id = '10000000-0000-0000-0000-000000000005'
      and accion = 'INSERT'
  ),
  'La creación de un perfil administrativo queda auditada'
);

update public.admin_profiles
set rol = 'editor'
where user_id = '10000000-0000-0000-0000-000000000005';

select ok(
  exists (
    select 1
    from public.audit_log
    where entidad = 'admin_profiles'
      and registro_id = '10000000-0000-0000-0000-000000000005'
      and accion = 'UPDATE'
  ),
  'La modificación de un perfil administrativo queda auditada'
);

delete from public.admin_profiles
where user_id = '10000000-0000-0000-0000-000000000005';

select ok(
  exists (
    select 1
    from public.audit_log
    where entidad = 'admin_profiles'
      and registro_id = '10000000-0000-0000-0000-000000000005'
      and accion = 'DELETE'
  ),
  'La eliminación de un perfil administrativo queda auditada'
);

select is(
  (
    with eliminadas as (
      delete from public.consultas_contacto
      where id = '30000000-0000-0000-0000-000000000001'
      returning 1
    )
    select count(*) from eliminadas
  ),
  1::bigint,
  'El administrador puede eliminar consultas de contacto'
);

select ok(
  not exists (
    select 1
    from public.audit_log
    where entidad = 'consultas_contacto'
      and (
        coalesce(datos_anteriores, '{}'::jsonb) ?| array[
          'nombre',
          'email',
          'mensaje',
          'notas_internas',
          'user_agent',
          'ip_hash'
        ]
        or coalesce(datos_nuevos, '{}'::jsonb) ?| array[
          'nombre',
          'email',
          'mensaje',
          'notas_internas',
          'user_agent',
          'ip_hash'
        ]
      )
  ),
  'La auditoría de contactos no duplica datos personales al actualizar ni eliminar'
);

select is(
  (
    with eliminados as (
      delete from public.remates
      where id = '20000000-0000-0000-0000-000000000001'
      returning 1
    )
    select count(*) from eliminados
  ),
  1::bigint,
  'El administrador puede eliminar remates'
);

reset role;

select * from finish();
rollback;
