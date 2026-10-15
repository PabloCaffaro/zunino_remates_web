-- Reemplaza las FAQ dentro de la misma transacción sin mantener las filas
-- anteriores mientras se insertan las nuevas. Así el guardado de contacto y
-- contenido no queda bloqueado por la sincronización de preguntas.
create or replace function public.admin_save_content(p_content jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not private.is_active_admin() then
    raise insufficient_privilege;
  end if;

  if jsonb_typeof(p_content->'faqs') is distinct from 'array'
    or jsonb_array_length(p_content->'faqs') > 100 then
    raise exception 'Preguntas inválidas.' using errcode = '22023';
  end if;

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

  if not found then
    raise exception 'Configuración principal no encontrada.' using errcode = 'P0002';
  end if;

  delete from public.preguntas_frecuentes;
  insert into public.preguntas_frecuentes (pregunta, respuesta, visible, orden)
    select btrim(value->>'pregunta'), btrim(value->>'respuesta'), true, ordinality::integer - 1
    from jsonb_array_elements(p_content->'faqs') with ordinality;

  return public.admin_content_snapshot();
end;
$$;

revoke all on function public.admin_save_content(jsonb) from public, anon;
grant execute on function public.admin_save_content(jsonb) to authenticated;
