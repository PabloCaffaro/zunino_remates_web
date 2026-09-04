-- La consulta de sesiones se limita a la identidad del JWT actual.
grant usage on schema private to authenticated;
-- El panel muestra fechas de creación y modificación; los actores internos siguen privados.
grant select (created_at, updated_at) on public.remates to authenticated;
create or replace function private.current_session_active()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from auth.sessions s
    where s.id = nullif(auth.jwt()->>'session_id', '')::uuid
      and s.user_id = auth.uid()
      and (s.not_after is null or s.not_after > now())
  );
$$;
revoke all on function private.current_session_active() from public, anon, authenticated;
grant execute on function private.current_session_active() to authenticated;

create or replace function public.admin_session_active()
returns boolean language sql stable security invoker set search_path = '' as $$
  select private.current_session_active();
$$;
revoke all on function public.admin_session_active() from public, anon;
grant execute on function public.admin_session_active() to authenticated;

-- DTO del agregado: una sola consulta obtiene una versión coherente del remate y sus listas.
create or replace function public.admin_remate_snapshot(p_id uuid)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare r record; result jsonb;
begin
  if not private.is_active_admin() then raise insufficient_privilege; end if;
  select id, slug, titulo, subtitulo, fecha_hora, fecha_por_confirmar, lugar, ubicacion_detalle, detalle, descripcion_larga, catalogo_descripcion, catalogo_estado, estado, version, created_at, updated_at into r from public.remates where id = p_id;
  if not found then return null; end if;
  result := jsonb_build_object(
    'id', r.id, 'slug', r.slug, 'titulo', r.titulo, 'subtitulo', r.subtitulo,
    'fechaHora', r.fecha_hora, 'fechaPorConfirmar', r.fecha_por_confirmar,
    'lugar', r.lugar, 'ubicacionDetalle', r.ubicacion_detalle, 'detalle', r.detalle,
    'descripcionLarga', r.descripcion_larga, 'catalogoEstado', r.catalogo_descripcion,
    'catalogoPublicacionEstado', r.catalogo_estado,
    'enlace', case when r.catalogo_estado = 'disponible' then 'Catálogo disponible' else 'Catálogo próximamente' end,
    'estadoAdmin', r.estado, 'version', r.version,
    'creadoEn', r.created_at, 'actualizadoEn', r.updated_at, 'destacados', '[]'::jsonb,
    'requisitos', coalesce((select jsonb_agg(contenido order by orden, id) from public.remate_requisitos where remate_id = p_id), '[]'::jsonb),
    'condiciones', coalesce((select jsonb_agg(contenido order by orden, id) from public.remate_condiciones where remate_id = p_id), '[]'::jsonb)
  );
  return result;
end;
$$;
revoke all on function public.admin_remate_snapshot(uuid) from public, anon;
grant execute on function public.admin_remate_snapshot(uuid) to authenticated;

create or replace function public.admin_list_remates()
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
begin
  if not private.is_active_admin() then raise insufficient_privilege; end if;
  return coalesce((select jsonb_agg(public.admin_remate_snapshot(id) order by created_at desc, id) from public.remates), '[]'::jsonb);
end;
$$;
revoke all on function public.admin_list_remates() from public, anon;
grant execute on function public.admin_list_remates() to authenticated;

create or replace function public.admin_save_remate(p_remate jsonb, p_expected_version integer)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  r record;
  remate_id uuid := (p_remate->>'id')::uuid;
  target_status public.remate_estado := (p_remate->>'estadoAdmin')::public.remate_estado;
  previous_requirements uuid[];
  previous_conditions uuid[];
  new_record boolean;
begin
  if not private.is_active_admin() then raise insufficient_privilege; end if;
  if p_expected_version is null or p_expected_version < 0 or target_status is null then
    raise exception 'Solicitud inválida.' using errcode = '22023';
  end if;
  if jsonb_typeof(p_remate->'requisitos') is distinct from 'array'
    or jsonb_typeof(p_remate->'condiciones') is distinct from 'array'
    or jsonb_array_length(p_remate->'requisitos') > 100
    or jsonb_array_length(p_remate->'condiciones') > 100 then
    raise exception 'Listas inválidas.' using errcode = '22023';
  end if;
  select id, version into r from public.remates where id = remate_id for update;
  new_record := not found;
  if (new_record and p_expected_version <> 0) or (not new_record and r.version <> p_expected_version) then
    return jsonb_build_object('status', 'conflict', 'current', public.admin_remate_snapshot(remate_id));
  end if;
  if new_record then
    if target_status not in ('borrador', 'en_revision', 'publicado') then
      raise exception 'Estado inicial inválido.' using errcode = '23514';
    end if;
    -- Nace como borrador para poder crear sus listas antes de validar la publicación.
    insert into public.remates (id, slug) values (remate_id, p_remate->>'slug');
  end if;

  select array_agg(q.id) into previous_requirements from public.remate_requisitos q where q.remate_id = r.id;
  select array_agg(q.id) into previous_conditions from public.remate_condiciones q where q.remate_id = r.id;
  -- Primero se insertan las nuevas listas: nunca se elimina el último requisito de un publicado.
  insert into public.remate_requisitos (remate_id, contenido, orden)
    select remate_id, value, ordinality::integer - 1 from jsonb_array_elements_text(p_remate->'requisitos') with ordinality;
  insert into public.remate_condiciones (remate_id, contenido, orden)
    select remate_id, value, ordinality::integer - 1 from jsonb_array_elements_text(p_remate->'condiciones') with ordinality;

  if target_status = 'publicado' and (jsonb_array_length(p_remate->'requisitos') = 0 or jsonb_array_length(p_remate->'condiciones') = 0) then
    raise exception 'Se requieren requisitos y condiciones para publicar.' using errcode = '23514';
  end if;
  update public.remates set
    slug = p_remate->>'slug', titulo = p_remate->>'titulo', subtitulo = p_remate->>'subtitulo',
    fecha_hora = nullif(p_remate->>'fechaHora','')::timestamptz,
    fecha_por_confirmar = (p_remate->>'fechaPorConfirmar')::boolean,
    lugar = p_remate->>'lugar', ubicacion_detalle = p_remate->>'ubicacionDetalle',
    detalle = p_remate->>'detalle', descripcion_larga = p_remate->>'descripcionLarga',
    catalogo_descripcion = p_remate->>'catalogoEstado',
    catalogo_estado = (p_remate->>'catalogoPublicacionEstado')::public.catalogo_estado,
    estado = target_status
  where id = remate_id;
  delete from public.remate_requisitos where id = any(previous_requirements);
  delete from public.remate_condiciones where id = any(previous_conditions);
  return jsonb_build_object('status', 'saved', 'remate', public.admin_remate_snapshot(remate_id));
end;
$$;
revoke all on function public.admin_save_remate(jsonb, integer) from public, anon;
grant execute on function public.admin_save_remate(jsonb, integer) to authenticated;

create or replace function public.admin_change_remate_status(p_id uuid, p_expected_version integer, p_status public.remate_estado)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare r record;
begin
  if not private.is_active_admin() then raise insufficient_privilege; end if;
  select id, version into r from public.remates where id = p_id for update;
  if not found or r.version is distinct from p_expected_version then
    return jsonb_build_object('status', 'conflict', 'current', public.admin_remate_snapshot(p_id));
  end if;
  update public.remates set estado = p_status where id = p_id;
  return jsonb_build_object('status', 'saved', 'remate', public.admin_remate_snapshot(p_id));
end;
$$;
revoke all on function public.admin_change_remate_status(uuid, integer, public.remate_estado) from public, anon;
grant execute on function public.admin_change_remate_status(uuid, integer, public.remate_estado) to authenticated;

create or replace function public.admin_delete_remate(p_id uuid, p_expected_version integer)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare r record;
begin
  if not private.is_full_admin() then raise insufficient_privilege; end if;
  select id, version into r from public.remates where id = p_id for update;
  if not found or r.version is distinct from p_expected_version then
    return jsonb_build_object('status', 'conflict', 'current', public.admin_remate_snapshot(p_id));
  end if;
  if exists(select 1 from public.lotes_destacados where remate_id = p_id) then
    raise exception 'La eliminación con imágenes se habilitará al conectar Storage.' using errcode = '23514';
  end if;
  delete from public.remates where id = p_id;
  return jsonb_build_object('status', 'saved');
end;
$$;
revoke all on function public.admin_delete_remate(uuid, integer) from public, anon;
grant execute on function public.admin_delete_remate(uuid, integer) to authenticated;
