-- admin_save_content modifica la configuración y las FAQ antes de pedir el
-- snapshot de respuesta. Un snapshot STABLE conserva la vista anterior al RPC
-- y puede devolver contenido obsoleto aunque la transacción haya escrito bien.
alter function public.admin_content_snapshot() volatile;

-- La confirmación se realiza dentro del RPC: una respuesta inconsistente debe
-- abortar la misma transacción que modificó la configuración y las FAQ.
create or replace function public.admin_save_content(p_content jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  saved_content jsonb;
  expected_contact jsonb;
  expected_copy jsonb;
  expected_faqs jsonb;
  saved_faqs jsonb;
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

  saved_content := public.admin_content_snapshot();
  expected_contact := jsonb_build_object(
    'email', p_content->'contacto'->>'email',
    'telefono', p_content->'contacto'->>'telefono',
    'direccion', p_content->'contacto'->>'direccion',
    'horario', p_content->'contacto'->>'horario',
    'mapEmbedUrl', p_content->'contacto'->>'mapEmbedUrl'
  );
  expected_copy := jsonb_build_object(
    'heroEyebrow', p_content->'copy'->>'heroEyebrow',
    'heroTitle', p_content->'copy'->>'heroTitle',
    'heroDescription', p_content->'copy'->>'heroDescription',
    'empresaTitle', p_content->'copy'->>'empresaTitle',
    'empresaParagraph1', p_content->'copy'->>'empresaParagraph1',
    'empresaParagraph2', p_content->'copy'->>'empresaParagraph2',
    'ubicacionTitle', p_content->'copy'->>'ubicacionTitle',
    'ubicacionDescription', p_content->'copy'->>'ubicacionDescription'
  );
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'pregunta', btrim(value->>'pregunta'),
      'respuesta', btrim(value->>'respuesta')
    ) order by ordinality
  ), '[]'::jsonb)
  into expected_faqs
  from jsonb_array_elements(p_content->'faqs') with ordinality;
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'pregunta', value->>'pregunta',
      'respuesta', value->>'respuesta'
    ) order by ordinality
  ), '[]'::jsonb)
  into saved_faqs
  from jsonb_array_elements(saved_content->'faqs') with ordinality;

  if saved_content->'contacto' is distinct from expected_contact
    or saved_content->'copy' is distinct from expected_copy
    or saved_faqs is distinct from expected_faqs then
    raise exception 'No se pudo confirmar el contenido guardado.' using errcode = 'P0001';
  end if;

  return saved_content;
end;
$$;
