-- Esquema inicial de producción para Zunino Remates.
-- Incluye contenido, administración, seguridad RLS, auditoría y Storage.

create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.remate_estado as enum (
  'borrador',
  'en_revision',
  'publicado',
  'finalizado',
  'cancelado'
);

create type public.catalogo_estado as enum (
  'proximamente',
  'preliminar',
  'disponible'
);

create type public.rol_administrativo as enum (
  'administrador',
  'editor'
);

create type public.consulta_estado as enum (
  'nueva',
  'en_proceso',
  'respondida',
  'spam'
);

create table public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null check (length(btrim(nombre)) between 2 and 120),
  rol public.rol_administrativo not null default 'editor',
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.remates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  estado public.remate_estado not null default 'borrador',
  titulo text not null default '',
  subtitulo text not null default '',
  fecha_hora timestamptz,
  fecha_por_confirmar boolean not null default true,
  lugar text not null default '',
  ubicacion_detalle text not null default '',
  detalle text not null default '',
  descripcion_larga text not null default '',
  catalogo_descripcion text not null default '',
  catalogo_estado public.catalogo_estado not null default 'proximamente',
  destacado boolean not null default false,
  orden integer not null default 0 check (orden >= 0),
  publicado_en timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint remates_slug_formato check (
    slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  )
);

create table public.remate_requisitos (
  id uuid primary key default gen_random_uuid(),
  remate_id uuid not null references public.remates(id) on delete cascade,
  contenido text not null check (length(btrim(contenido)) > 0),
  orden integer not null default 0 check (orden >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.remate_condiciones (
  id uuid primary key default gen_random_uuid(),
  remate_id uuid not null references public.remates(id) on delete cascade,
  contenido text not null check (length(btrim(contenido)) > 0),
  orden integer not null default 0 check (orden >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lotes_destacados (
  id uuid primary key default gen_random_uuid(),
  remate_id uuid not null references public.remates(id) on delete cascade,
  nombre text not null check (length(btrim(nombre)) > 0),
  imagen_storage_path text not null check (length(btrim(imagen_storage_path)) > 0),
  imagen_alt text not null check (length(btrim(imagen_alt)) > 0),
  visible boolean not null default true,
  orden integer not null default 0 check (orden >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.preguntas_frecuentes (
  id uuid primary key default gen_random_uuid(),
  pregunta text not null check (length(btrim(pregunta)) > 0),
  respuesta text not null check (length(btrim(respuesta)) > 0),
  visible boolean not null default true,
  orden integer not null default 0 check (orden >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pasos_participacion (
  id uuid primary key default gen_random_uuid(),
  numero text not null check (length(btrim(numero)) > 0),
  titulo text not null check (length(btrim(titulo)) > 0),
  detalle text not null check (length(btrim(detalle)) > 0),
  visible boolean not null default true,
  orden integer not null default 0 check (orden >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.configuracion_sitio (
  id text primary key default 'principal',
  hero_eyebrow text not null default '',
  hero_titulo text not null default '',
  hero_descripcion text not null default '',
  empresa_titulo text not null default '',
  empresa_parrafo_1 text not null default '',
  empresa_parrafo_2 text not null default '',
  ubicacion_titulo text not null default '',
  ubicacion_descripcion text not null default '',
  email_publico text not null default '',
  telefono_publico text not null default '',
  direccion text not null default '',
  horario text not null default '',
  map_embed_url text not null default '',
  site_name text not null default 'Zunino Remates',
  seo_titulo text not null default '',
  seo_descripcion text not null default '',
  canonical_base_url text not null default '',
  og_image_storage_path text not null default '',
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint configuracion_sitio_unica check (id = 'principal')
);

create table public.consultas_contacto (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (length(btrim(nombre)) between 2 and 120),
  email text not null check (email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  mensaje text not null check (length(btrim(mensaje)) between 10 and 5000),
  estado public.consulta_estado not null default 'nueva',
  notas_internas text not null default '',
  origen text not null default 'web',
  user_agent text,
  ip_hash text,
  atendida_por uuid references auth.users(id) on delete set null,
  atendida_en timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  entidad text not null,
  registro_id text,
  accion text not null check (accion in ('INSERT', 'UPDATE', 'DELETE')),
  datos_anteriores jsonb,
  datos_nuevos jsonb,
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index remates_estado_fecha_idx
  on public.remates (estado, fecha_hora);
create index remates_orden_idx
  on public.remates (orden, fecha_hora);
create unique index remates_un_destacado_publicado_idx
  on public.remates (destacado)
  where destacado = true and estado = 'publicado';
create index remate_requisitos_remate_idx
  on public.remate_requisitos (remate_id, orden);
create index remate_condiciones_remate_idx
  on public.remate_condiciones (remate_id, orden);
create index lotes_destacados_remate_idx
  on public.lotes_destacados (remate_id, visible, orden);
create index preguntas_frecuentes_orden_idx
  on public.preguntas_frecuentes (visible, orden);
create index pasos_participacion_orden_idx
  on public.pasos_participacion (visible, orden);
create index consultas_contacto_estado_idx
  on public.consultas_contacto (estado, created_at desc);
create index audit_log_entidad_registro_idx
  on public.audit_log (entidad, registro_id, created_at desc);
create index admin_profiles_activos_idx
  on public.admin_profiles (user_id)
  where activo = true;

create or replace function public.is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_profiles profile
    where profile.user_id = (select auth.uid())
      and profile.activo = true
  );
$$;

create or replace function public.is_full_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_profiles profile
    where profile.user_id = (select auth.uid())
      and profile.activo = true
      and profile.rol = 'administrador'
  );
$$;

revoke all on function public.is_active_admin() from public, anon;
revoke all on function public.is_full_admin() from public, anon;
grant execute on function public.is_active_admin() to authenticated;
grant execute on function public.is_full_admin() to authenticated;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.ensure_active_administrator()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  removes_active_administrator boolean;
begin
  if tg_op = 'DELETE' then
    removes_active_administrator := old.rol = 'administrador' and old.activo;
  else
    removes_active_administrator := old.rol = 'administrador'
      and old.activo
      and (new.rol <> 'administrador' or not new.activo);
  end if;

  if removes_active_administrator then
    -- Serializa bajas concurrentes para que dos operaciones no eliminen al último administrador.
    perform pg_catalog.pg_advisory_xact_lock(1185657202::bigint);

    if not exists (
      select 1
      from public.admin_profiles profile
      where profile.user_id <> old.user_id
        and profile.rol = 'administrador'
        and profile.activo = true
    ) then
      raise exception 'Debe existir al menos un administrador activo.'
        using errcode = '23514';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create or replace function private.set_remate_actor()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();

  if tg_op = 'INSERT' then
    new.created_by = coalesce(new.created_by, (select auth.uid()));
  end if;

  if (select auth.uid()) is not null then
    new.updated_by = (select auth.uid());
  end if;

  return new;
end;
$$;

create or replace function private.set_config_actor()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();

  if (select auth.uid()) is not null then
    new.updated_by = (select auth.uid());
  end if;

  return new;
end;
$$;

create or replace function private.validate_remate_publication()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.estado <> 'publicado' then
    return new;
  end if;

  if nullif(btrim(new.titulo), '') is null then
    raise exception 'El título es obligatorio para publicar.'
      using errcode = '23514';
  end if;

  if nullif(btrim(new.slug), '') is null then
    raise exception 'El slug es obligatorio para publicar.'
      using errcode = '23514';
  end if;

  if nullif(btrim(new.subtitulo), '') is null then
    raise exception 'El subtítulo es obligatorio para publicar.'
      using errcode = '23514';
  end if;

  if not new.fecha_por_confirmar and new.fecha_hora is null then
    raise exception 'La fecha y hora son obligatorias para publicar.'
      using errcode = '23514';
  end if;

  if nullif(btrim(new.lugar), '') is null
    or nullif(btrim(new.ubicacion_detalle), '') is null then
    raise exception 'La ubicación es obligatoria para publicar.'
      using errcode = '23514';
  end if;

  if nullif(btrim(new.detalle), '') is null
    or nullif(btrim(new.descripcion_larga), '') is null then
    raise exception 'Las descripciones son obligatorias para publicar.'
      using errcode = '23514';
  end if;

  if nullif(btrim(new.catalogo_descripcion), '') is null then
    raise exception 'La descripción del catálogo es obligatoria para publicar.'
      using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.remate_requisitos requisito
    where requisito.remate_id = new.id
  ) then
    raise exception 'Debe existir al menos un requisito para publicar.'
      using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.remate_condiciones condicion
    where condicion.remate_id = new.id
  ) then
    raise exception 'Debe existir al menos una condición para publicar.'
      using errcode = '23514';
  end if;

  new.publicado_en = coalesce(new.publicado_en, now());
  return new;
end;
$$;

create or replace function private.prevent_remate_relation_move()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.remate_id <> new.remate_id then
    raise exception 'No se puede mover un registro relacionado a otro remate.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create or replace function private.ensure_published_remate_children()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  parent_status public.remate_estado;
  remaining_count integer;
begin
  select remate.estado
    into parent_status
  from public.remates remate
  where remate.id = old.remate_id;

  if parent_status is null or parent_status <> 'publicado' then
    return old;
  end if;

  if tg_table_name = 'remate_requisitos' then
    select count(*)
      into remaining_count
    from public.remate_requisitos requisito
    where requisito.remate_id = old.remate_id;
  else
    select count(*)
      into remaining_count
    from public.remate_condiciones condicion
    where condicion.remate_id = old.remate_id;
  end if;

  if remaining_count = 0 then
    raise exception 'Un remate publicado debe conservar al menos un requisito y una condición.'
      using errcode = '23514';
  end if;

  return old;
end;
$$;

create or replace function private.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_data jsonb;
  new_data jsonb;
  record_id text;
begin
  old_data := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end;
  new_data := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end;

  -- Las consultas contienen datos personales que no deben duplicarse en auditoría.
  if tg_table_schema = 'public' and tg_table_name = 'consultas_contacto' then
    if old_data is not null then
      old_data := old_data - array[
        'nombre',
        'email',
        'mensaje',
        'notas_internas',
        'user_agent',
        'ip_hash'
      ]::text[];
    end if;

    if new_data is not null then
      new_data := new_data - array[
        'nombre',
        'email',
        'mensaje',
        'notas_internas',
        'user_agent',
        'ip_hash'
      ]::text[];
    end if;
  end if;

  record_id := coalesce(
    new_data ->> 'id',
    old_data ->> 'id',
    new_data ->> 'user_id',
    old_data ->> 'user_id'
  );

  insert into public.audit_log (
    entidad,
    registro_id,
    accion,
    datos_anteriores,
    datos_nuevos,
    changed_by
  )
  values (
    tg_table_name,
    record_id,
    tg_op,
    old_data,
    new_data,
    (select auth.uid())
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create or replace function public.validate_remate_for_publication(p_remate_id uuid)
returns table (campo text, mensaje text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  remate public.remates%rowtype;
begin
  if not public.is_active_admin() then
    raise exception 'No autorizado.'
      using errcode = '42501';
  end if;

  select *
    into remate
  from public.remates
  where id = p_remate_id;

  if not found then
    raise exception 'Remate no encontrado.'
      using errcode = 'P0002';
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

revoke all on function public.validate_remate_for_publication(uuid) from public, anon;
grant execute on function public.validate_remate_for_publication(uuid) to authenticated;

create trigger admin_profiles_set_updated_at
before update on public.admin_profiles
for each row execute function private.set_updated_at();

create trigger admin_profiles_keep_active_administrator
before update or delete on public.admin_profiles
for each row execute function private.ensure_active_administrator();

create trigger admin_profiles_audit
after insert or update or delete on public.admin_profiles
for each row execute function private.write_audit_log();

create trigger remates_set_actor
before insert or update on public.remates
for each row execute function private.set_remate_actor();

create trigger remates_validate_publication
before insert or update on public.remates
for each row execute function private.validate_remate_publication();

create trigger requisitos_set_updated_at
before update on public.remate_requisitos
for each row execute function private.set_updated_at();

create trigger requisitos_prevent_move
before update on public.remate_requisitos
for each row execute function private.prevent_remate_relation_move();

create trigger requisitos_keep_published_valid
after delete on public.remate_requisitos
for each row execute function private.ensure_published_remate_children();

create trigger condiciones_set_updated_at
before update on public.remate_condiciones
for each row execute function private.set_updated_at();

create trigger condiciones_prevent_move
before update on public.remate_condiciones
for each row execute function private.prevent_remate_relation_move();

create trigger condiciones_keep_published_valid
after delete on public.remate_condiciones
for each row execute function private.ensure_published_remate_children();

create trigger lotes_set_updated_at
before update on public.lotes_destacados
for each row execute function private.set_updated_at();

create trigger faq_set_updated_at
before update on public.preguntas_frecuentes
for each row execute function private.set_updated_at();

create trigger pasos_set_updated_at
before update on public.pasos_participacion
for each row execute function private.set_updated_at();

create trigger configuracion_set_actor
before update on public.configuracion_sitio
for each row execute function private.set_config_actor();

create trigger consultas_set_updated_at
before update on public.consultas_contacto
for each row execute function private.set_updated_at();

create trigger remates_audit
after insert or update or delete on public.remates
for each row execute function private.write_audit_log();
create trigger requisitos_audit
after insert or update or delete on public.remate_requisitos
for each row execute function private.write_audit_log();
create trigger condiciones_audit
after insert or update or delete on public.remate_condiciones
for each row execute function private.write_audit_log();
create trigger lotes_audit
after insert or update or delete on public.lotes_destacados
for each row execute function private.write_audit_log();
create trigger faq_audit
after insert or update or delete on public.preguntas_frecuentes
for each row execute function private.write_audit_log();
create trigger pasos_audit
after insert or update or delete on public.pasos_participacion
for each row execute function private.write_audit_log();
create trigger configuracion_audit
after insert or update or delete on public.configuracion_sitio
for each row execute function private.write_audit_log();
create trigger consultas_audit
after update or delete on public.consultas_contacto
for each row execute function private.write_audit_log();

alter table public.admin_profiles enable row level security;
alter table public.remates enable row level security;
alter table public.remate_requisitos enable row level security;
alter table public.remate_condiciones enable row level security;
alter table public.lotes_destacados enable row level security;
alter table public.preguntas_frecuentes enable row level security;
alter table public.pasos_participacion enable row level security;
alter table public.configuracion_sitio enable row level security;
alter table public.consultas_contacto enable row level security;
alter table public.audit_log enable row level security;

create policy "Usuarios ven su perfil administrativo"
on public.admin_profiles for select
to authenticated
using (
  user_id = (select auth.uid())
  or public.is_full_admin()
);

create policy "Administradores gestionan perfiles"
on public.admin_profiles for all
to authenticated
using (public.is_full_admin())
with check (public.is_full_admin());

create policy "Público ve remates publicados"
on public.remates for select
to anon, authenticated
using (estado = 'publicado');

create policy "Equipo ve todos los remates"
on public.remates for select
to authenticated
using (public.is_active_admin());

create policy "Equipo crea remates"
on public.remates for insert
to authenticated
with check (public.is_active_admin());

create policy "Equipo actualiza remates"
on public.remates for update
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());

create policy "Administradores eliminan remates"
on public.remates for delete
to authenticated
using (public.is_full_admin());

create policy "Público ve requisitos publicados"
on public.remate_requisitos for select
to anon, authenticated
using (
  exists (
    select 1 from public.remates
    where remates.id = remate_requisitos.remate_id
      and remates.estado = 'publicado'
  )
);

create policy "Equipo gestiona requisitos"
on public.remate_requisitos for all
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());

create policy "Público ve condiciones publicadas"
on public.remate_condiciones for select
to anon, authenticated
using (
  exists (
    select 1 from public.remates
    where remates.id = remate_condiciones.remate_id
      and remates.estado = 'publicado'
  )
);

create policy "Equipo gestiona condiciones"
on public.remate_condiciones for all
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());

create policy "Público ve lotes publicados"
on public.lotes_destacados for select
to anon, authenticated
using (
  visible = true
  and exists (
    select 1 from public.remates
    where remates.id = lotes_destacados.remate_id
      and remates.estado = 'publicado'
  )
);

create policy "Equipo gestiona lotes"
on public.lotes_destacados for all
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());

create policy "Público ve preguntas visibles"
on public.preguntas_frecuentes for select
to anon, authenticated
using (visible = true);

create policy "Equipo gestiona preguntas"
on public.preguntas_frecuentes for all
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());

create policy "Público ve pasos visibles"
on public.pasos_participacion for select
to anon, authenticated
using (visible = true);

create policy "Equipo gestiona pasos"
on public.pasos_participacion for all
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());

create policy "Público ve configuración"
on public.configuracion_sitio for select
to anon, authenticated
using (id = 'principal');

create policy "Equipo actualiza configuración"
on public.configuracion_sitio for update
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin() and id = 'principal');

create policy "Equipo ve consultas"
on public.consultas_contacto for select
to authenticated
using (public.is_active_admin());

create policy "Equipo actualiza consultas"
on public.consultas_contacto for update
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());

create policy "Administradores eliminan consultas"
on public.consultas_contacto for delete
to authenticated
using (public.is_full_admin());

create policy "Administradores ven auditoría"
on public.audit_log for select
to authenticated
using (public.is_full_admin());

-- Supabase puede definir privilegios amplios por defecto en el esquema público.
-- Se revocan para que los permisos siguientes sean deterministas y mínimos.
revoke all privileges on table
  public.admin_profiles,
  public.remates,
  public.remate_requisitos,
  public.remate_condiciones,
  public.lotes_destacados,
  public.preguntas_frecuentes,
  public.pasos_participacion,
  public.configuracion_sitio,
  public.consultas_contacto,
  public.audit_log
from anon, authenticated;

grant select on public.remates to anon, authenticated;
grant select on public.remate_requisitos to anon, authenticated;
grant select on public.remate_condiciones to anon, authenticated;
grant select on public.lotes_destacados to anon, authenticated;
grant select on public.preguntas_frecuentes to anon, authenticated;
grant select on public.pasos_participacion to anon, authenticated;
grant select on public.configuracion_sitio to anon, authenticated;

grant select, insert, update, delete on public.remates to authenticated;
grant select, insert, update, delete on public.remate_requisitos to authenticated;
grant select, insert, update, delete on public.remate_condiciones to authenticated;
grant select, insert, update, delete on public.lotes_destacados to authenticated;
grant select, insert, update, delete on public.preguntas_frecuentes to authenticated;
grant select, insert, update, delete on public.pasos_participacion to authenticated;
grant select, update on public.configuracion_sitio to authenticated;
grant select, delete on public.consultas_contacto to authenticated;
grant update (estado, notas_internas, atendida_por, atendida_en)
  on public.consultas_contacto to authenticated;
grant select on public.audit_log to authenticated;
grant select, insert, update, delete on public.admin_profiles to authenticated;

insert into public.configuracion_sitio (
  id,
  hero_eyebrow,
  hero_titulo,
  hero_descripcion,
  empresa_titulo,
  empresa_parrafo_1,
  empresa_parrafo_2,
  ubicacion_titulo,
  ubicacion_descripcion,
  site_name
)
values (
  'principal',
  'Remates presenciales con respaldo profesional',
  'Participá en remates en vivo con catálogos claros y reglas transparentes.',
  'En Zunino Remates organizamos subastas presenciales con información completa de cada lote, atención cercana y un proceso ágil para compradores y vendedores.',
  'Experiencia local y trato directo',
  'Zunino Remates es una empresa familiar con foco en remates presenciales.',
  'Trabajamos con empresas, productores y particulares con transparencia y atención directa.',
  'Visitá nuestra oficina',
  'Acercate para realizar consultas, coordinar inspecciones y conocer próximos remates.',
  'Zunino Remates'
)
on conflict (id) do nothing;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
    'lotes-remates',
    'lotes-remates',
    false,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp']
  )
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Público descarga archivos publicados"
on storage.objects for select
to anon, authenticated
using (
  bucket_id = 'lotes-remates'
  and exists (
    select 1
    from public.remates
    where remates.id::text = (storage.foldername(name))[1]
      and remates.estado = 'publicado'
  )
);

create policy "Equipo lista archivos de remates"
on storage.objects for select
to authenticated
using (
  bucket_id = 'lotes-remates'
  and public.is_active_admin()
);

create policy "Equipo sube archivos de remates"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'lotes-remates'
  and public.is_active_admin()
  and exists (
    select 1
    from public.remates
    where remates.id::text = (storage.foldername(name))[1]
  )
);

create policy "Equipo actualiza archivos de remates"
on storage.objects for update
to authenticated
using (
  bucket_id = 'lotes-remates'
  and public.is_active_admin()
)
with check (
  bucket_id = 'lotes-remates'
  and public.is_active_admin()
  and exists (
    select 1
    from public.remates
    where remates.id::text = (storage.foldername(name))[1]
  )
);

create policy "Equipo elimina archivos de remates"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'lotes-remates'
  and public.is_active_admin()
);
