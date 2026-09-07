begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(8);

insert into auth.users (id, email)
values ('91000000-0000-4000-8000-000000000001', 'qa-contenido@example.invalid');
insert into public.admin_profiles (user_id, nombre, rol)
values ('91000000-0000-4000-8000-000000000001', 'QA contenido', 'administrador');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"91000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select ok(public.admin_content_snapshot() ? 'contacto', 'El administrador recibe los datos de contacto');
select ok(public.admin_content_snapshot() ? 'faqs', 'El administrador recibe las preguntas frecuentes');
select is(
  public.admin_save_content(jsonb_build_object(
    'contacto', public.admin_content_snapshot()->'contacto',
    'copy', public.admin_content_snapshot()->'copy',
    'faqs', jsonb_build_array(jsonb_build_object('pregunta', 'Pregunta QA', 'respuesta', 'Respuesta QA'))
  ))->'faqs'->0->>'pregunta',
  'Pregunta QA',
  'El contenido se guarda y devuelve en una sola transacción'
);
select is((select count(*)::integer from public.preguntas_frecuentes), 1, 'La lista de preguntas queda sincronizada');

select set_config('test.lot_payload', '{"id":"91000000-0000-4000-8000-000000000002","slug":"qa-storage","titulo":"QA Storage","subtitulo":"QA subtítulo","fechaHora":null,"fechaPorConfirmar":true,"lugar":"QA lugar","ubicacionDetalle":"QA ubicación","detalle":"QA breve","descripcionLarga":"QA completa","catalogoEstado":"QA catálogo","catalogoPublicacionEstado":"preliminar","estadoAdmin":"borrador","destacados":[{"id":"91000000-0000-4000-8000-000000000003","nombre":"Lote QA","storagePath":"91000000-0000-4000-8000-000000000002/91000000-0000-4000-8000-000000000003.jpg","imagen":{"alt":"Imagen QA"}}],"requisitos":["QA requisito"],"condiciones":["QA condición"]}', true);
select is(public.admin_save_remate(current_setting('test.lot_payload')::jsonb, 0)->>'status', 'saved', 'Guarda un remate con metadatos del lote');
select is(public.admin_remate_snapshot('91000000-0000-4000-8000-000000000002')->'destacados'->0->>'nombre', 'Lote QA', 'La lectura administrativa incluye el lote');
select is(public.admin_delete_remate('91000000-0000-4000-8000-000000000002', 2)->'storagePaths'->>0, '91000000-0000-4000-8000-000000000002/91000000-0000-4000-8000-000000000003.jpg', 'La eliminación devuelve la ruta que debe limpiarse de Storage');

set local role anon;
select throws_ok($$select public.admin_content_snapshot()$$, '42501', null, 'Un visitante no accede al contenido administrativo');
reset role;
select * from finish();
rollback;
