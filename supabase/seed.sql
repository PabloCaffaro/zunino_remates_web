-- Datos demostrativos repetibles para desarrollo y staging.

update public.configuracion_sitio
set
  hero_eyebrow = 'Remates presenciales con respaldo profesional',
  hero_titulo = 'Participá en remates en vivo con catálogos claros y reglas transparentes.',
  hero_descripcion = 'En Zunino Remates organizamos subastas presenciales con información completa de cada lote, atención cercana y un proceso ágil para compradores y vendedores.',
  empresa_titulo = 'Experiencia local y trato directo',
  empresa_parrafo_1 = 'Zunino Remates es una empresa familiar con foco en remates presenciales. Nuestra prioridad es generar confianza entre compradores y vendedores con información completa y un proceso ordenado.',
  empresa_parrafo_2 = 'Trabajamos con empresas, productores y particulares que necesitan vender activos con transparencia, cuidando cada detalle del evento.',
  ubicacion_titulo = 'Visitá nuestra oficina',
  ubicacion_descripcion = 'Acercate a nuestra oficina para hacer consultas, coordinar inspecciones y recibir información sobre próximos remates y catálogos disponibles.',
  email_publico = 'contacto@zuninoremates.com',
  telefono_publico = '+598 99 123 456',
  direccion = 'Av. 18 de Julio 1234, Centro, Montevideo',
  horario = 'Lun a Vie · 9:00 a 18:00',
  map_embed_url = 'https://www.google.com/maps?q=Av.%2018%20de%20Julio%201234,%20Montevideo&z=15&output=embed'
where id = 'principal';

insert into public.preguntas_frecuentes (id, pregunta, respuesta, visible, orden)
values
  ('10000000-0000-4000-8000-000000000001', '¿Qué documentación necesito para participar?', 'Documento de identidad vigente y datos de contacto. Empresas: datos fiscales.', true, 1),
  ('10000000-0000-4000-8000-000000000002', '¿Puedo inspeccionar los lotes antes del remate?', 'Sí. Coordinamos visitas programadas para que revises cada lote.', true, 2),
  ('10000000-0000-4000-8000-000000000003', '¿Qué formas de pago aceptan?', 'Transferencia bancaria, efectivo dentro de límites legales y cheques certificados.', true, 3),
  ('10000000-0000-4000-8000-000000000004', '¿Es necesario registrarse antes del remate?', 'No hay reserva previa de lugar. El registro se realiza de forma presencial en sala antes de participar, presentando la documentación requerida.', true, 4)
on conflict (id) do update set
  pregunta = excluded.pregunta,
  respuesta = excluded.respuesta,
  visible = excluded.visible,
  orden = excluded.orden;

insert into public.pasos_participacion (id, numero, titulo, detalle, visible, orden)
values
  ('20000000-0000-4000-8000-000000000001', '01', 'Revisá el catálogo', 'Verificá lotes, condiciones y fechas. Podés coordinar inspecciones.', true, 1),
  ('20000000-0000-4000-8000-000000000002', '02', 'Registrate en sala', 'Presentá tu documentación y recibí el número de oferente.', true, 2),
  ('20000000-0000-4000-8000-000000000003', '03', 'Participá del remate', 'Ofertá en vivo con reglas claras e incrementos informados.', true, 3),
  ('20000000-0000-4000-8000-000000000004', '04', 'Pagos y retiro', 'Confirmá la forma de pago y coordiná el retiro con el equipo.', true, 4)
on conflict (id) do update set
  numero = excluded.numero,
  titulo = excluded.titulo,
  detalle = excluded.detalle,
  visible = excluded.visible,
  orden = excluded.orden;

insert into public.remates (
  id, slug, estado, titulo, subtitulo, fecha_hora, fecha_por_confirmar,
  lugar, ubicacion_detalle, detalle, descripcion_larga,
  catalogo_descripcion, catalogo_estado, destacado, orden
)
values
  (
    '30000000-0000-4000-8000-000000000001', 'maquinaria-y-herramientas', 'borrador',
    'Maquinaria y herramientas', 'Remate presencial de equipamiento industrial',
    '2026-10-18T17:00:00-03:00', false, 'Salón Central · Ruta 8 Km 45',
    'Salón Central, Ruta 8 Km 45, con inspección previa coordinada.',
    'Equipos industriales, compresores, tornos y lotes de taller.',
    'Una jornada pensada para compradores que buscan equipamiento industrial, herramientas de taller y lotes de uso inmediato. El evento contará con inspección previa, apoyo en sala y condiciones visibles desde el catálogo.',
    'Catálogo abierto con fichas técnicas, condiciones y retiro coordinado.',
    'disponible', true, 1
  ),
  (
    '30000000-0000-4000-8000-000000000002', 'vehiculos-utilitarios', 'borrador',
    'Vehículos utilitarios', 'Flota urbana y unidades de trabajo',
    '2026-11-08T19:00:00-03:00', false, 'Predio Zunino · Montevideo',
    'Predio Zunino, Montevideo, con agenda para ver unidades antes del remate.',
    'Pickups, furgones y flota urbana con inspección previa.',
    'Este remate reúne vehículos utilitarios seleccionados para trabajo urbano, logística y uso comercial. Cada unidad se presenta con datos base, estado general y su instancia de inspección previa.',
    'Catálogo de unidades con publicación escalonada y notas de inspección.',
    'disponible', false, 2
  ),
  (
    '30000000-0000-4000-8000-000000000003', 'agro-y-campo', 'borrador',
    'Agro y campo', 'Implementos rurales y herramientas de campo',
    '2026-11-22T16:30:00-03:00', false, 'Predio Rural · Canelones',
    'Predio Rural en Canelones, con recepción de público desde media tarde.',
    'Implementos agrícolas, trailers y herramientas de campo.',
    'Una propuesta orientada a productores, contratistas y compradores del rubro rural. El remate combina implementos agrícolas, accesorios y herramientas de uso intensivo para campo y mantenimiento.',
    'Listado preliminar publicado con ampliación prevista en la semana del remate.',
    'preliminar', false, 3
  )
on conflict (id) do update set
  titulo = excluded.titulo,
  subtitulo = excluded.subtitulo,
  fecha_hora = excluded.fecha_hora,
  fecha_por_confirmar = excluded.fecha_por_confirmar,
  lugar = excluded.lugar,
  ubicacion_detalle = excluded.ubicacion_detalle,
  detalle = excluded.detalle,
  descripcion_larga = excluded.descripcion_larga,
  catalogo_descripcion = excluded.catalogo_descripcion,
  catalogo_estado = excluded.catalogo_estado,
  destacado = excluded.destacado,
  orden = excluded.orden;

insert into public.remate_requisitos (id, remate_id, contenido, orden)
values
  ('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Documento de identidad vigente al registrarte', 1),
  ('40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', 'Datos de contacto actualizados para confirmar adjudicación', 2),
  ('40000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000001', 'Revisión previa del catálogo y condiciones de retiro', 3),
  ('40000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000002', 'Registro presencial antes del inicio del evento', 1),
  ('40000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000002', 'Verificación de identidad y datos de facturación', 2),
  ('40000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000002', 'Lectura previa de condiciones por unidad', 3),
  ('40000000-0000-4000-8000-000000000007', '30000000-0000-4000-8000-000000000003', 'Acreditación personal al ingreso al predio', 1),
  ('40000000-0000-4000-8000-000000000008', '30000000-0000-4000-8000-000000000003', 'Consulta previa del listado de lotes disponibles', 2),
  ('40000000-0000-4000-8000-000000000009', '30000000-0000-4000-8000-000000000003', 'Coordinación posterior para retiro de implementos grandes', 3)
on conflict (id) do update set
  contenido = excluded.contenido,
  orden = excluded.orden;

insert into public.remate_condiciones (id, remate_id, contenido, orden)
values
  ('50000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Remate presencial con incrementos informados en sala', 1),
  ('50000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', 'Pago dentro de los plazos comunicados el día del evento', 2),
  ('50000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000001', 'Retiro coordinado según cronograma del organizador', 3),
  ('50000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000002', 'Las unidades se rematan según orden de salida publicado', 1),
  ('50000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000002', 'La información visual no reemplaza inspección presencial', 2),
  ('50000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000002', 'Entrega sujeta a confirmación de pago y documentación', 3),
  ('50000000-0000-4000-8000-000000000007', '30000000-0000-4000-8000-000000000003', 'Remate sujeto a disponibilidad final de lotes publicados', 1),
  ('50000000-0000-4000-8000-000000000008', '30000000-0000-4000-8000-000000000003', 'Los lotes se entregan en el estado informado al momento del evento', 2),
  ('50000000-0000-4000-8000-000000000009', '30000000-0000-4000-8000-000000000003', 'El retiro de equipos grandes se agenda con anticipación', 3)
on conflict (id) do update set
  contenido = excluded.contenido,
  orden = excluded.orden;

update public.remates
set estado = 'publicado'
where id in (
  '30000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000002',
  '30000000-0000-4000-8000-000000000003'
);
