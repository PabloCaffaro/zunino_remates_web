-- Alinea PostgreSQL con el flujo del panel: un borrador completo puede
-- publicarse sin pasar obligatoriamente por el estado de revisión.
create or replace function private.prepare_remate_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  valid_transition boolean;
begin
  if old.estado <> new.estado then
    valid_transition := case old.estado
      when 'borrador' then new.estado in ('en_revision', 'publicado')
      when 'en_revision' then new.estado in ('borrador', 'publicado')
      when 'publicado' then new.estado in ('oculto', 'finalizado', 'cancelado')
      when 'oculto' then new.estado in ('publicado', 'finalizado', 'cancelado')
      else false
    end;

    if not valid_transition then
      raise exception 'La transición de estado solicitada no está permitida.'
        using errcode = '23514';
    end if;
  end if;

  if old.estado not in ('borrador', 'en_revision') and new.slug <> old.slug then
    raise exception 'El slug no puede cambiar después de publicar el remate.'
      using errcode = '23514';
  end if;

  -- La condición por versión se incluirá en cada UPDATE; el servidor incrementa la versión aceptada.
  new.version = old.version + 1;
  return new;
end;
$$;
