-- V1: las columnas de catálogo permanecen como legado para preservar datos históricos.
-- La API nueva omite estos campos; las escrituras conservan los valores anteriores.
-- Aplicar antes de desplegar la aplicación. No ejecutar en QA ni producción en esta tarea.

create or replace function private.validate_remate_publication()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.estado <> 'publicado' then
    return new;
  end if;

  if nullif(btrim(new.titulo), '') is null then
    raise exception 'El título es obligatorio para publicar.'
      using errcode = '23514';
  end if;

  if nullif(btrim(new.slug), '') is null then
    raise exception 'El slug es obligatorio para publicar.'
      using errcode = '23514';
  end if;

  if nullif(btrim(new.subtitulo), '') is null then
    raise exception 'El subtítulo es obligatorio para publicar.'
      using errcode = '23514';
  end if;

  if not new.fecha_por_confirmar and new.fecha_hora is null then
    raise exception 'La fecha y hora son obligatorias para publicar.'
      using errcode = '23514';
  end if;

  if nullif(btrim(new.lugar), '') is null
    or nullif(btrim(new.ubicacion_detalle), '') is null then
    raise exception 'La ubicación es obligatoria para publicar.'
      using errcode = '23514';
  end if;

  if nullif(btrim(new.detalle), '') is null
    or nullif(btrim(new.descripcion_larga), '') is null then
    raise exception 'Las descripciones son obligatorias para publicar.'
      using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.remate_requisitos requisito
    where requisito.remate_id = new.id
  ) then
    raise exception 'Debe existir al menos un requisito para publicar.'
      using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.remate_condiciones condicion
    where condicion.remate_id = new.id
  ) then
    raise exception 'Debe existir al menos una condición para publicar.'
      using errcode = '23514';
  end if;

  new.publicado_en = coalesce(new.publicado_en, now());
  return new;
end;
$$;

create or replace function public.validate_remate_for_publication(p_remate_id uuid)
returns table (campo text, mensaje text)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  remate record;
begin
  if not exists (
    select 1
    from public.admin_profiles profile
    where profile.user_id = (select auth.uid())
      and profile.activo = true
  ) then
    raise exception 'No autorizado.' using errcode = '42501';
  end if;

  select
    titulo,
    slug,
    subtitulo,
    fecha_por_confirmar,
    fecha_hora,
    lugar,
    ubicacion_detalle,
    detalle,
    descripcion_larga
  into remate
  from public.remates
  where id = p_remate_id;

  if not found then
    raise exception 'Remate no encontrado.' using errcode = 'P0002';
  end if;

  if nullif(btrim(remate.titulo), '') is null then
    return query select 'titulo'::text, 'El título es obligatorio.'::text;
  end if;
  if nullif(btrim(remate.slug), '') is null then
    return query select 'slug'::text, 'La URL del remate es obligatoria.'::text;
  end if;
  if nullif(btrim(remate.subtitulo), '') is null then
    return query select 'subtitulo'::text, 'El subtítulo es obligatorio.'::text;
  end if;
  if not remate.fecha_por_confirmar and remate.fecha_hora is null then
    return query select 'fecha_hora'::text, 'La fecha y hora son obligatorias.'::text;
  end if;
  if nullif(btrim(remate.lugar), '') is null then
    return query select 'lugar'::text, 'El lugar es obligatorio.'::text;
  end if;
  if nullif(btrim(remate.ubicacion_detalle), '') is null then
    return query select 'ubicacion_detalle'::text, 'La ubicación detallada es obligatoria.'::text;
  end if;
  if nullif(btrim(remate.detalle), '') is null then
    return query select 'detalle'::text, 'La descripción breve es obligatoria.'::text;
  end if;
  if nullif(btrim(remate.descripcion_larga), '') is null then
    return query select 'descripcion_larga'::text, 'La descripción completa es obligatoria.'::text;
  end if;
  if not exists (
    select 1 from public.remate_requisitos where remate_id = p_remate_id
  ) then
    return query select 'requisitos'::text, 'Debe existir al menos un requisito.'::text;
  end if;
  if not exists (
    select 1 from public.remate_condiciones where remate_id = p_remate_id
  ) then
    return query select 'condiciones'::text, 'Debe existir al menos una condición.'::text;
  end if;
end;
$$;

create or replace function public.admin_remate_snapshot(p_id uuid)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare r record; result jsonb;
begin
  if not private.is_active_admin() then raise insufficient_privilege; end if;
  select id, slug, titulo, subtitulo, fecha_hora, fecha_por_confirmar, lugar, ubicacion_detalle, detalle, descripcion_larga, estado, version, created_at, updated_at into r from public.remates where id = p_id;
  if not found then return null; end if;
  result := jsonb_build_object(
    'id', r.id, 'slug', r.slug, 'titulo', r.titulo, 'subtitulo', r.subtitulo,
    'fechaHora', r.fecha_hora, 'fechaPorConfirmar', r.fecha_por_confirmar,
    'lugar', r.lugar, 'ubicacionDetalle', r.ubicacion_detalle, 'detalle', r.detalle,
    'descripcionLarga', r.descripcion_larga,
    'estadoAdmin', r.estado, 'version', r.version,
    'creadoEn', r.created_at, 'actualizadoEn', r.updated_at,
    'destacados', coalesce((select jsonb_agg(jsonb_build_object(
      'id', id, 'nombre', nombre, 'storagePath', imagen_storage_path,
      'imagen', jsonb_build_object('url', '', 'alt', imagen_alt)
    ) order by orden, id) from public.lotes_destacados where remate_id = p_id), '[]'::jsonb),
    'requisitos', coalesce((select jsonb_agg(contenido order by orden, id) from public.remate_requisitos where remate_id = p_id), '[]'::jsonb),
    'condiciones', coalesce((select jsonb_agg(contenido order by orden, id) from public.remate_condiciones where remate_id = p_id), '[]'::jsonb)
  );
  return result;
end;
$$;

create or replace function public.admin_save_remate(p_remate jsonb, p_expected_version integer)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  r record;
  target_id uuid := (p_remate->>'id')::uuid;
  target_status public.remate_estado := (p_remate->>'estadoAdmin')::public.remate_estado;
  previous_requirements uuid[];
  previous_conditions uuid[];
  new_record boolean;
begin
  if not private.is_active_admin() then raise insufficient_privilege; end if;
  if p_expected_version is null or p_expected_version < 0 or target_status is null then raise exception 'Solicitud inválida.' using errcode = '22023'; end if;
  if jsonb_typeof(p_remate->'requisitos') is distinct from 'array'
    or jsonb_typeof(p_remate->'condiciones') is distinct from 'array'
    or jsonb_typeof(p_remate->'destacados') is distinct from 'array'
    or jsonb_array_length(p_remate->'requisitos') > 100
    or jsonb_array_length(p_remate->'condiciones') > 100
    or jsonb_array_length(p_remate->'destacados') > 8 then raise exception 'Listas inválidas.' using errcode = '22023'; end if;
  if exists(select 1 from jsonb_array_elements(p_remate->'destacados') lot
    where nullif(btrim(lot->>'nombre'), '') is null
      or (lot->>'id')::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or lot->>'storagePath' !~* ('^' || target_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$')
      or lower(split_part(split_part(lot->>'storagePath', '/', 2), '.', 1)) is distinct from lower(lot->>'id')) then
    raise exception 'Lotes inválidos.' using errcode = '22023';
  end if;

  -- El bloqueo se mantiene hasta finalizar el RPC. Storage sigue siendo un
  -- sistema externo para el contenido binario, pero su metadato no puede
  -- eliminarse concurrentemente mientras se confirma este agregado.
  perform 1
  from storage.objects object
  where object.bucket_id = 'lotes-remates'
    and object.name in (
      select lot->>'storagePath'
      from jsonb_array_elements(p_remate->'destacados') lot
    )
  for key share;
  if (select count(distinct object.name)
      from storage.objects object
      where object.bucket_id = 'lotes-remates'
        and object.name in (
          select lot->>'storagePath'
          from jsonb_array_elements(p_remate->'destacados') lot
        )) is distinct from jsonb_array_length(p_remate->'destacados') then
    raise exception 'Una fotografía no existe en Storage.' using errcode = '22023';
  end if;

  select id, version into r from public.remates where id = target_id for update;
  new_record := not found;
  if (new_record and p_expected_version <> 0) or (not new_record and r.version <> p_expected_version) then
    return jsonb_build_object('status', 'conflict', 'current', public.admin_remate_snapshot(target_id));
  end if;
  if new_record then
    if target_status not in ('borrador', 'en_revision', 'publicado') then raise exception 'Estado inicial inválido.' using errcode = '23514'; end if;
    insert into public.remates (id, slug) values (target_id, p_remate->>'slug');
  end if;
  select array_agg(q.id) into previous_requirements from public.remate_requisitos q where q.remate_id = target_id;
  select array_agg(q.id) into previous_conditions from public.remate_condiciones q where q.remate_id = target_id;
  insert into public.remate_requisitos (remate_id, contenido, orden)
    select target_id, value, ordinality::integer - 1 from jsonb_array_elements_text(p_remate->'requisitos') with ordinality;
  insert into public.remate_condiciones (remate_id, contenido, orden)
    select target_id, value, ordinality::integer - 1 from jsonb_array_elements_text(p_remate->'condiciones') with ordinality;
  insert into public.lotes_destacados (id, remate_id, nombre, imagen_storage_path, imagen_alt, visible, orden)
    select (value->>'id')::uuid, target_id, btrim(value->>'nombre'), value->>'storagePath',
      coalesce(nullif(btrim(value->'imagen'->>'alt'), ''), 'Imagen de ' || btrim(value->>'nombre')),
      true, ordinality::integer - 1
    from jsonb_array_elements(p_remate->'destacados') with ordinality
    on conflict (id) do update set nombre = excluded.nombre, imagen_storage_path = excluded.imagen_storage_path,
      imagen_alt = excluded.imagen_alt, visible = true, orden = excluded.orden;
  delete from public.lotes_destacados lot where lot.remate_id = target_id
    and not exists(select 1 from jsonb_array_elements(p_remate->'destacados') item where (item->>'id')::uuid = lot.id);
  if target_status = 'publicado' and (jsonb_array_length(p_remate->'requisitos') = 0 or jsonb_array_length(p_remate->'condiciones') = 0) then raise exception 'Se requieren requisitos y condiciones para publicar.' using errcode = '23514'; end if;
  update public.remates set
    slug = p_remate->>'slug', titulo = p_remate->>'titulo', subtitulo = p_remate->>'subtitulo',
    fecha_hora = nullif(p_remate->>'fechaHora','')::timestamptz, fecha_por_confirmar = (p_remate->>'fechaPorConfirmar')::boolean,
    lugar = p_remate->>'lugar', ubicacion_detalle = p_remate->>'ubicacionDetalle', detalle = p_remate->>'detalle',
    descripcion_larga = p_remate->>'descripcionLarga', estado = target_status
  where id = target_id;
  delete from public.remate_requisitos where id = any(previous_requirements);
  delete from public.remate_condiciones where id = any(previous_conditions);
  return jsonb_build_object('status', 'saved', 'remate', public.admin_remate_snapshot(target_id));
end;
$$;

revoke all on function public.validate_remate_for_publication(uuid) from public, anon;
grant execute on function public.validate_remate_for_publication(uuid) to authenticated;
revoke all on function public.admin_remate_snapshot(uuid) from public, anon;
grant execute on function public.admin_remate_snapshot(uuid) to authenticated;
revoke all on function public.admin_save_remate(jsonb, integer) from public, anon;
grant execute on function public.admin_save_remate(jsonb, integer) to authenticated;

comment on column public.remates.catalogo_descripcion is
  'Legado previo a V1: conservar datos históricos; sin uso en la aplicación activa.';
comment on column public.remates.catalogo_estado is
  'Legado previo a V1: conservar datos históricos; sin uso en la aplicación activa.';

-- Las columnas legadas dejan de estar disponibles en consultas directas del Data API.
revoke select (catalogo_descripcion, catalogo_estado)
on public.remates from anon, authenticated;

