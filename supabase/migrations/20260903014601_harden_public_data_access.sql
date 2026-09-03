-- Reduce la superficie expuesta por Data API sin alterar la matriz RLS.

-- Los helpers conservan su identidad interna, por lo que las políticas ya
-- creadas siguen apuntando a las mismas funciones aunque cambie el esquema.
alter function public.is_active_admin() set schema private;
alter function public.is_full_admin() set schema private;

revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function private.is_active_admin() to authenticated;
grant execute on function private.is_full_admin() to authenticated;

-- Esta función sí forma parte de la API administrativa. No necesita omitir
-- RLS: el perfil propio y los remates ya son legibles para un integrante activo.
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
    descripcion_larga,
    catalogo_descripcion
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
  if nullif(btrim(remate.catalogo_descripcion), '') is null then
    return query select 'catalogo_descripcion'::text, 'La descripción del catálogo es obligatoria.'::text;
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

revoke all on function public.validate_remate_for_publication(uuid)
from public, anon;
grant execute on function public.validate_remate_for_publication(uuid)
to authenticated;

-- RLS limita filas; estos permisos limitan también las columnas que una
-- consulta directa puede solicitar.
revoke select on
  public.remates,
  public.remate_requisitos,
  public.remate_condiciones,
  public.lotes_destacados,
  public.preguntas_frecuentes,
  public.pasos_participacion,
  public.configuracion_sitio
from anon, authenticated;

grant select (
  id, slug, estado, titulo, subtitulo, fecha_hora, fecha_por_confirmar,
  lugar, ubicacion_detalle, detalle, descripcion_larga,
  catalogo_descripcion, catalogo_estado, destacado, orden, publicado_en
) on public.remates to anon;

grant select (
  id, slug, estado, titulo, subtitulo, fecha_hora, fecha_por_confirmar,
  lugar, ubicacion_detalle, detalle, descripcion_larga,
  catalogo_descripcion, catalogo_estado, destacado, orden, publicado_en,
  version
) on public.remates to authenticated;

grant select (id, remate_id, contenido, orden)
on public.remate_requisitos to anon, authenticated;
grant select (id, remate_id, contenido, orden)
on public.remate_condiciones to anon, authenticated;
grant select (id, remate_id, nombre, imagen_storage_path, imagen_alt, visible, orden)
on public.lotes_destacados to anon, authenticated;
grant select (id, pregunta, respuesta, visible, orden)
on public.preguntas_frecuentes to anon, authenticated;
grant select (id, numero, titulo, detalle, visible, orden)
on public.pasos_participacion to anon, authenticated;
grant select (
  id, hero_eyebrow, hero_titulo, hero_descripcion,
  empresa_titulo, empresa_parrafo_1, empresa_parrafo_2,
  ubicacion_titulo, ubicacion_descripcion, email_publico, telefono_publico,
  direccion, horario, map_embed_url, site_name, seo_titulo,
  seo_descripcion, canonical_base_url, og_image_storage_path
) on public.configuracion_sitio to anon, authenticated;

drop policy if exists "Público descarga archivos publicados"
on storage.objects;

create policy "Público descarga imágenes de lotes visibles"
on storage.objects for select
to anon, authenticated
using (
  bucket_id = 'lotes-remates'
  and exists (
    select 1
    from public.lotes_destacados lote
    join public.remates remate on remate.id = lote.remate_id
    where lote.imagen_storage_path = storage.objects.name
      and lote.visible = true
      and remate.estado = 'publicado'
      and (storage.foldername(storage.objects.name))[1] = lote.remate_id::text
  )
);
