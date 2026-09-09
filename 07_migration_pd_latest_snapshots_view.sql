-- =====================================================================
-- MIGRACIÓN: vista pd_latest_snapshots
-- Ejecutar en el SQL Editor de Supabase después de las migraciones
-- anteriores (03, 05, 06).
--
-- Bug: el listado de /dashboard calculaba "Construidos" / "Pruebas
-- ópticas" / % ODN contando en JS sobre un fetch de TODA la tabla naps
-- (select ... .in("pd_id", pdIds)), sin order() ni límite explícito.
-- PostgREST corta cualquier response en db.max_rows (1000 por defecto
-- en Supabase). Con esta PWA en producción la suma de NAPs activos de
-- todas las PDs ya supera esa cota, así que el fetch se trunca y las
-- PDs cuyas filas caen fuera del corte quedan sin ninguna fila de naps
-- en el Map => 0/0/0%. No es RLS (la policy de naps usa exactamente el
-- mismo scoping por región que la de pds, así que si la PD aparece en
-- el listado sus naps pasan la misma policy) ni un join roto (es un
-- reduce en JS, no una query SQL con join).
--
-- Fix: el listado pasa a leer los conteos y el % directamente del
-- snapshot más reciente de pd_daily_snapshots (ya se actualiza solo por
-- trigger, ver 01_schema_supabase.sql). Como pd_daily_snapshots también
-- puede tener miles de filas históricas (una por PD por día con
-- cambios), un simple "traer todo y quedarme con la primera por pd_id
-- en JS" tiene el mismo problema de fondo. Esta vista hace ese
-- "1 fila por pd_id, la más reciente" en el propio Postgres, así el
-- resultado nunca supera la cantidad de PDs.
--
-- security_invoker = true es necesario para que la vista respete la
-- policy "snapshots_select_own_region" del admin que hace la consulta
-- (por defecto una vista corre con los permisos de quien la creó, no
-- de quien la invoca, y eso saltaría el scoping por región).
-- =====================================================================

create or replace view pd_latest_snapshots
with (security_invoker = true) as
select distinct on (pd_id)
  pd_id,
  snapshot_date,
  total_naps,
  construidos,
  pruebas_opticas,
  pct_odn
from pd_daily_snapshots
order by pd_id, snapshot_date desc;
