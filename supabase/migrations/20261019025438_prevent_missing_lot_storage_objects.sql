-- Evita confirmar un remate cuyos lotes apunten a objetos ausentes o ajenos.
-- Las filas de Storage se bloquean durante el RPC para cerrar la carrera entre
-- la comprobación de existencia y la escritura del agregado en PostgreSQL.
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
    descripcion_larga = p_remate->>'descripcionLarga', catalogo_descripcion = p_remate->>'catalogoEstado',
    catalogo_estado = (p_remate->>'catalogoPublicacionEstado')::public.catalogo_estado, estado = target_status
  where id = target_id;
  delete from public.remate_requisitos where id = any(previous_requirements);
  delete from public.remate_condiciones where id = any(previous_conditions);
  return jsonb_build_object('status', 'saved', 'remate', public.admin_remate_snapshot(target_id));
end;
$$;

revoke all on function public.admin_save_remate(jsonb, integer) from public, anon;
grant execute on function public.admin_save_remate(jsonb, integer) to authenticated;
