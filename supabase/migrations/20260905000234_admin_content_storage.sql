-- Contenido administrativo y lotes destacados con Storage privado.
update storage.buckets
set file_size_limit = 700000,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'lotes-remates';

drop policy if exists "Equipo sube archivos de remates" on storage.objects;
create policy "Equipo sube archivos de remates"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'lotes-remates'
  and private.is_active_admin()
  and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'
);

create or replace function public.admin_content_snapshot()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare configuration record;
begin
  if not private.is_active_admin() then raise insufficient_privilege; end if;
  select * into configuration from public.configuracion_sitio where id = 'principal';
  return jsonb_build_object(
    'contacto', jsonb_build_object(
      'email', configuration.email_publico, 'telefono', configuration.telefono_publico,
      'direccion', configuration.direccion, 'horario', configuration.horario,
      'mapEmbedUrl', configuration.map_embed_url
    ),
    'copy', jsonb_build_object(
      'heroEyebrow', configuration.hero_eyebrow, 'heroTitle', configuration.hero_titulo,
      'heroDescription', configuration.hero_descripcion,
      'empresaTitle', configuration.empresa_titulo,
      'empresaParagraph1', configuration.empresa_parrafo_1,
      'empresaParagraph2', configuration.empresa_parrafo_2,
      'ubicacionTitle', configuration.ubicacion_titulo,
      'ubicacionDescription', configuration.ubicacion_descripcion
    ),
    'faqs', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'pregunta', pregunta, 'respuesta', respuesta) order by orden, id) from public.preguntas_frecuentes), '[]'::jsonb),
    'pasos', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'numero', numero, 'titulo', titulo, 'detalle', detalle) order by orden, id) from public.pasos_participacion), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.admin_content_snapshot() from public, anon;
grant execute on function public.admin_content_snapshot() to authenticated;

create or replace function public.admin_save_content(p_content jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare old_faq_ids uuid[];
begin
  if not private.is_active_admin() then raise insufficient_privilege; end if;
  if jsonb_typeof(p_content->'faqs') is distinct from 'array'
    or jsonb_array_length(p_content->'faqs') > 100 then
    raise exception 'Preguntas inválidas.' using errcode = '22023';
  end if;
  perform 1 from public.configuracion_sitio where id = 'principal' for update;
  update public.configuracion_sitio set
    hero_eyebrow = p_content->'copy'->>'heroEyebrow',
    hero_titulo = p_content->'copy'->>'heroTitle',
    hero_descripcion = p_content->'copy'->>'heroDescription',
    empresa_titulo = p_content->'copy'->>'empresaTitle',
    empresa_parrafo_1 = p_content->'copy'->>'empresaParagraph1',
    empresa_parrafo_2 = p_content->'copy'->>'empresaParagraph2',
    ubicacion_titulo = p_content->'copy'->>'ubicacionTitle',
    ubicacion_descripcion = p_content->'copy'->>'ubicacionDescription',
    email_publico = p_content->'contacto'->>'email',
    telefono_publico = p_content->'contacto'->>'telefono',
    direccion = p_content->'contacto'->>'direccion',
    horario = p_content->'contacto'->>'horario',
    map_embed_url = p_content->'contacto'->>'mapEmbedUrl'
  where id = 'principal';
  select array_agg(id) into old_faq_ids from public.preguntas_frecuentes;
  insert into public.preguntas_frecuentes (pregunta, respuesta, visible, orden)
    select btrim(value->>'pregunta'), btrim(value->>'respuesta'), true, ordinality::integer - 1
    from jsonb_array_elements(p_content->'faqs') with ordinality;
  delete from public.preguntas_frecuentes where id = any(old_faq_ids);
  return public.admin_content_snapshot();
end;
$$;
revoke all on function public.admin_save_content(jsonb) from public, anon;
grant execute on function public.admin_save_content(jsonb) to authenticated;

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
      or lot->>'storagePath' !~* ('^' || target_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$')) then
    raise exception 'Lotes inválidos.' using errcode = '22023';
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

create or replace function public.admin_delete_remate(p_id uuid, p_expected_version integer)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare r record; paths jsonb;
begin
  if not private.is_full_admin() then raise insufficient_privilege; end if;
  select id, version into r from public.remates where id = p_id for update;
  if not found or r.version is distinct from p_expected_version then return jsonb_build_object('status', 'conflict', 'current', public.admin_remate_snapshot(p_id)); end if;
  select coalesce(jsonb_agg(imagen_storage_path), '[]'::jsonb) into paths from public.lotes_destacados where remate_id = p_id;
  delete from public.remates where id = p_id;
  return jsonb_build_object('status', 'saved', 'storagePaths', paths);
end;
$$;
