-- Los RPC de contenido usan los permisos y RLS del usuario autenticado.
create or replace function public.admin_content_snapshot()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  configuration record;
begin
  if not private.is_active_admin() then
    raise insufficient_privilege;
  end if;

  select
    email_publico,
    telefono_publico,
    direccion,
    horario,
    map_embed_url,
    hero_eyebrow,
    hero_titulo,
    hero_descripcion,
    empresa_titulo,
    empresa_parrafo_1,
    empresa_parrafo_2,
    ubicacion_titulo,
    ubicacion_descripcion
  into configuration
  from public.configuracion_sitio
  where id = 'principal';

  return jsonb_build_object(
    'contacto', jsonb_build_object(
      'email', configuration.email_publico,
      'telefono', configuration.telefono_publico,
      'direccion', configuration.direccion,
      'horario', configuration.horario,
      'mapEmbedUrl', configuration.map_embed_url
    ),
    'copy', jsonb_build_object(
      'heroEyebrow', configuration.hero_eyebrow,
      'heroTitle', configuration.hero_titulo,
      'heroDescription', configuration.hero_descripcion,
      'empresaTitle', configuration.empresa_titulo,
      'empresaParagraph1', configuration.empresa_parrafo_1,
      'empresaParagraph2', configuration.empresa_parrafo_2,
      'ubicacionTitle', configuration.ubicacion_titulo,
      'ubicacionDescription', configuration.ubicacion_descripcion
    ),
    'faqs', coalesce((
      select jsonb_agg(
        jsonb_build_object('id', id, 'pregunta', pregunta, 'respuesta', respuesta)
        order by orden, id
      )
      from public.preguntas_frecuentes
    ), '[]'::jsonb),
    'pasos', coalesce((
      select jsonb_agg(
        jsonb_build_object('id', id, 'numero', numero, 'titulo', titulo, 'detalle', detalle)
        order by orden, id
      )
      from public.pasos_participacion
    ), '[]'::jsonb)
  );
end;
$$;

alter function public.admin_save_content(jsonb) security invoker;

revoke all on function public.admin_content_snapshot() from public, anon;
revoke all on function public.admin_save_content(jsonb) from public, anon;
grant execute on function public.admin_content_snapshot() to authenticated;
grant execute on function public.admin_save_content(jsonb) to authenticated;
