begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(15);
insert into auth.users (id, email) values
 ('90000000-0000-4000-8000-000000000001', 'qa-admin@example.invalid'),
 ('90000000-0000-4000-8000-000000000002', 'qa-editor@example.invalid');
insert into public.admin_profiles (user_id, nombre, rol) values
 ('90000000-0000-4000-8000-000000000001', 'QA administrador', 'administrador'),
 ('90000000-0000-4000-8000-000000000002', 'QA editor', 'editor');
select set_config('test.payload', '{"id":"90000000-0000-4000-8000-000000000003","slug":"qa-transaccion","titulo":"QA remate","subtitulo":"QA subtítulo","fechaHora":null,"fechaPorConfirmar":true,"lugar":"QA lugar","ubicacionDetalle":"QA ubicación","detalle":"QA breve","descripcionLarga":"QA completa","catalogoEstado":"QA catálogo","catalogoPublicacionEstado":"preliminar","estadoAdmin":"borrador","requisitos":["QA requisito"],"condiciones":["QA condición"]}', true);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"90000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select is(public.admin_session_active(), false, 'Un JWT sin sesión activa no pasa el control de sesión');
select is(public.admin_save_remate(current_setting('test.payload')::jsonb, 0)->>'status', 'saved', 'Editor crea borrador');
select is((public.admin_remate_snapshot('90000000-0000-4000-8000-000000000003')->>'version')::integer, 2, 'La versión la asigna PostgreSQL');
select is(public.admin_save_remate(current_setting('test.payload')::jsonb || '{"estadoAdmin":"publicado"}', 2)->>'status', 'saved', 'Publica directamente desde borrador');
select is(public.admin_remate_snapshot('90000000-0000-4000-8000-000000000003')->>'estadoAdmin', 'publicado', 'El estado queda publicado');
select is(public.admin_save_remate(current_setting('test.payload')::jsonb || '{"titulo":"No debe guardarse"}', 2)->>'status', 'conflict', 'Una versión vieja no sobrescribe');
select is(public.admin_remate_snapshot('90000000-0000-4000-8000-000000000003')->>'titulo', 'QA remate', 'Conserva el título ante conflicto');
select throws_ok($$select public.admin_save_remate(current_setting('test.payload')::jsonb || '{"estadoAdmin":"publicado","titulo":"","requisitos":["No debe guardarse"]}', 3)$$, '23514', null, 'La validación rechaza publicación inválida');
select is(public.admin_remate_snapshot('90000000-0000-4000-8000-000000000003')->'requisitos'->>0, 'QA requisito', 'La operación fallida revierte también sus listas');
select throws_ok($$select public.admin_save_remate(current_setting('test.payload')::jsonb || '{"estadoAdmin":"publicado","slug":"otra-ruta"}', 3)$$, '23514', null, 'El slug publicado permanece fijo');
select is(public.admin_change_remate_status('90000000-0000-4000-8000-000000000003', 3, 'oculto')->>'status', 'saved', 'Oculta con versión correcta');
select is(public.admin_change_remate_status('90000000-0000-4000-8000-000000000003', 4, 'publicado')->>'status', 'saved', 'Vuelve a publicar');
select throws_ok($$select public.admin_delete_remate('90000000-0000-4000-8000-000000000003', 5)$$, '42501', null, 'Editor no puede eliminar');
select set_config('request.jwt.claims', '{"sub":"90000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is(public.admin_delete_remate('90000000-0000-4000-8000-000000000003', 5)->>'status', 'saved', 'Administrador elimina');
set local role anon;
select throws_ok($$select public.admin_list_remates()$$, '42501', null, 'Visitante no puede listar datos administrativos');
reset role;
select * from finish();
rollback;
