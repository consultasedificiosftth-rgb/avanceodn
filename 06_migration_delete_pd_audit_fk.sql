-- =====================================================================
-- MIGRACIÓN: soporte para el borrado real de una PD
-- Ejecutar en el SQL Editor de Supabase después de las migraciones
-- anteriores (03, 04, 05).
--
-- "Eliminar PD" (/dashboard/pds/[pdId]) borra de verdad la fila de pds,
-- lo que en cascada borra sus naps y nap_photos (esas FK ya son
-- "on delete cascade" desde 01_schema_supabase.sql). Pero audit_log
-- referencia pds/naps sin "on delete" explícito (=> NO ACTION), y
-- audit_log siempre tiene filas históricas apuntando a esos NAPs
-- (tilde/destilde de cada toggle del portal) además de la propia entrada
-- 'delete_pd' que se inserta justo antes de borrar. Con NO ACTION el
-- borrado en cascada fallaría por violación de FK.
--
-- Se cambian ambas FK a ON DELETE SET NULL: el historial de auditoría
-- sobrevive al borrado de la PD (con pd_id/nap_id en null), y el detail
-- jsonb de cada entrada ya guarda el código y los datos relevantes, así
-- que no se pierde contexto aunque el id ya no sea referenciable.
-- =====================================================================

alter table audit_log
  drop constraint audit_log_pd_id_fkey,
  add constraint audit_log_pd_id_fkey
    foreign key (pd_id) references pds(id) on delete set null;

alter table audit_log
  drop constraint audit_log_nap_id_fkey,
  add constraint audit_log_nap_id_fkey
    foreign key (nap_id) references naps(id) on delete set null;

-- El borrado real de una PD ya no es solo cosa de superadmin: cualquier
-- admin de la región de esa PD puede eliminarla (ver "Eliminar PD" en
-- /dashboard/pds/[pdId] y en el listado). El endpoint usa el cliente de
-- servicio (bypassa RLS) y valida el acceso a mano con
-- requireRegionAccess, pero se alinea igual esta policy con las de
-- select/update para no dejarla como la única más restrictiva.
drop policy "pds_delete_superadmin" on pds;
create policy "pds_delete_own_region" on pds for delete
  using (current_admin_role() = 'superadmin' or region_id = current_admin_region());
