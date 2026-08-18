-- =====================================================================
-- MIGRACIÓN: link público por PROVEEDOR en vez de por PD
-- Ejecutar en el SQL Editor de Supabase después de las migraciones
-- anteriores (03, 04).
--
-- Antes: el link del portal del proveedor apuntaba a una sola PD
-- (pds.link_token). Ahora apunta a un proveedor (providers.link_token):
-- el proveedor entra, ve TODAS sus PDs (de cualquier región) y elige con
-- cuál trabajar.
-- =====================================================================

alter table providers
  add column link_token uuid not null default gen_random_uuid();

create unique index providers_link_token_idx on providers(link_token);

comment on column providers.link_token is
  'Token del link público del proveedor (/p/<link_token>). Reemplaza a '
  'pds.link_token como mecanismo de acceso — un solo link por proveedor, '
  'no uno por PD.';

comment on column pds.link_token is
  'DEPRECATED: ya no se usa para el acceso del proveedor (ver '
  'providers.link_token). Se mantiene la columna por compatibilidad de '
  'datos existentes, pero no se genera ni se muestra ningún link nuevo '
  'con este valor.';
