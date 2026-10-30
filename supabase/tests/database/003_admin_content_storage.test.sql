begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(22);

insert into auth.users (id, email)
values ('91000000-0000-4000-8000-000000000001', 'qa-contenido@example.invalid');
insert into public.admin_profiles (user_id, nombre, rol)
values ('91000000-0000-4000-8000-000000000001', 'QA contenido', 'administrador');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"91000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select ok(public.admin_content_snapshot() ? 'contacto', 'El administrador recibe los datos de contacto');
select ok(public.admin_content_snapshot() ? 'faqs', 'El administrador recibe las preguntas frecuentes');
select isnt((select prosecdef from pg_catalog.pg_proc where oid = 'public.admin_content_snapshot()'::regprocedure), true, 'La lectura de contenido no eleva privilegios');
select isnt((select prosecdef from pg_catalog.pg_proc where oid = 'public.admin_save_content(jsonb)'::regprocedure), true, 'La escritura de contenido no eleva privilegios');
select is((select provolatile::text from pg_catalog.pg_proc where oid = 'public.admin_content_snapshot()'::regprocedure), 'v', 'El snapshot puede ver los cambios hechos dentro del mismo RPC');
select set_config('test.content_payload', jsonb_build_object(
  'contacto', jsonb_build_object(
    'email', 'qa+contenido@example.invalid',
    'telefono', '+598 99 123 456',
    'direccion', 'Av. José Belloni 1.234, Montevideo',
    'horario', E'Lunes a viernes\n9:00 a 18:00',
    'mapEmbedUrl', 'https://www.google.com/maps?q=Av.%20Jos%C3%A9%20Belloni%201234&output=embed'
  ),
  'copy', jsonb_build_object(
    'heroEyebrow', 'Remates & negocios',
    'heroTitle', 'Título "QA"',
    'heroDescription', E'Línea uno con ñ\nLínea dos & más',
    'empresaTitle', 'Zunino Remates',
    'empresaParagraph1', 'Primer párrafo',
    'empresaParagraph2', 'Segundo párrafo',
    'ubicacionTitle', 'Cómo llegar',
    'ubicacionDescription', E'Atención con coordinación\nprevia'
  ),
  'faqs', jsonb_build_array(jsonb_build_object(
    'pregunta', '¿Cómo participo?',
    'respuesta', E'En sala, con cédula & registro.\nTambién online.'
  ))
)::text, true);
select set_config('test.saved_content', public.admin_save_content(current_setting('test.content_payload')::jsonb)::text, true);
select is(
  current_setting('test.saved_content')::jsonb->'faqs'->0->>'pregunta',
  '¿Cómo participo?',
  'El contenido se guarda y devuelve en una sola transacción'
);
select is(current_setting('test.saved_content')::jsonb->'contacto'->>'email', 'qa+contenido@example.invalid', 'La respuesta confirma el email guardado');
select is(current_setting('test.saved_content')::jsonb->'contacto'->>'telefono', '+598 99 123 456', 'La respuesta confirma el teléfono guardado');
select is(current_setting('test.saved_content')::jsonb->'contacto'->>'direccion', 'Av. José Belloni 1.234, Montevideo', 'La respuesta confirma la dirección guardada');
select is(current_setting('test.saved_content')::jsonb->'contacto'->>'horario', E'Lunes a viernes\n9:00 a 18:00', 'La respuesta conserva los saltos de línea del horario');
select is(current_setting('test.saved_content')::jsonb->'copy'->>'heroDescription', E'Línea uno con ñ\nLínea dos & más', 'La respuesta conserva caracteres especiales y saltos de línea');
select is(current_setting('test.saved_content')::jsonb->'faqs'->0->>'respuesta', E'En sala, con cédula & registro.\nTambién online.', 'La respuesta conserva caracteres especiales en las FAQ');
select is(public.admin_content_snapshot()->'contacto'->>'direccion', 'Av. José Belloni 1.234, Montevideo', 'Una lectura posterior confirma la persistencia del contacto');
select is((select count(*)::integer from public.preguntas_frecuentes), 1, 'La lista de preguntas queda sincronizada');

-- Fuerza una respuesta distinta de lo pedido al final del RPC. La excepción
-- debe revertir también las escrituras que ya ocurrieron dentro del llamado.
reset role;
create function pg_temp.keep_previous_content_address()
returns trigger
language plpgsql
as $$
begin
  new.direccion := old.direccion;
  return new;
end;
$$;
create trigger zz_test_keep_previous_content_address
before update on public.configuracion_sitio
for each row execute function pg_temp.keep_previous_content_address();

set local role authenticated;
select throws_ok(
  $$
    select public.admin_save_content(
      jsonb_set(
        jsonb_set(
          current_setting('test.content_payload')::jsonb,
          '{contacto,direccion}',
          to_jsonb('Dirección que debe revertirse'::text)
        ),
        '{faqs,0,pregunta}',
        to_jsonb('Pregunta que debe revertirse'::text)
      )
    )
  $$,
  'P0001',
  'No se pudo confirmar el contenido guardado.',
  'Una confirmación inconsistente falla dentro de admin_save_content'
);
select is(
  public.admin_content_snapshot()->'contacto'->>'direccion',
  'Av. José Belloni 1.234, Montevideo',
  'El fallo de confirmación revierte el contacto'
);
select is(
  public.admin_content_snapshot()->'faqs'->0->>'pregunta',
  '¿Cómo participo?',
  'El fallo de confirmación revierte también las FAQ'
);
reset role;
drop trigger zz_test_keep_previous_content_address on public.configuracion_sitio;

set local role authenticated;
select set_config('test.lot_payload', '{"id":"91000000-0000-4000-8000-000000000002","slug":"qa-storage","titulo":"QA Storage","subtitulo":"QA subtítulo","fechaHora":null,"fechaPorConfirmar":true,"lugar":"QA lugar","ubicacionDetalle":"QA ubicación","detalle":"QA breve","descripcionLarga":"QA completa","estadoAdmin":"borrador","destacados":[{"id":"91000000-0000-4000-8000-000000000003","nombre":"Lote QA","storagePath":"91000000-0000-4000-8000-000000000002/91000000-0000-4000-8000-000000000003.jpg","imagen":{"alt":"Imagen QA"}}],"requisitos":["QA requisito"],"condiciones":["QA condición"]}', true);
select throws_ok(
  $$select public.admin_save_remate(current_setting('test.lot_payload')::jsonb, 0)$$,
  '22023', 'Una fotografía no existe en Storage.',
  'Rechaza un lote sin objeto de Storage antes de guardar el remate'
);
reset role;
insert into storage.objects (bucket_id, name) values (
  'lotes-remates',
  '91000000-0000-4000-8000-000000000002/91000000-0000-4000-8000-000000000003.jpg'
);
set local role authenticated;
select is(public.admin_save_remate(current_setting('test.lot_payload')::jsonb, 0)->>'status', 'saved', 'Guarda un remate con metadatos del lote');
select is(public.admin_remate_snapshot('91000000-0000-4000-8000-000000000002')->'destacados'->0->>'nombre', 'Lote QA', 'La lectura administrativa incluye el lote');
select is(public.admin_delete_remate('91000000-0000-4000-8000-000000000002', 2)->'storagePaths'->>0, '91000000-0000-4000-8000-000000000002/91000000-0000-4000-8000-000000000003.jpg', 'La eliminación devuelve la ruta que debe limpiarse de Storage');

set local role anon;
select throws_ok($$select public.admin_content_snapshot()$$, '42501', null, 'Un visitante no accede al contenido administrativo');
reset role;
select * from finish();
rollback;
