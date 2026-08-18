-- =====================================================================
-- MIGRACIÓN: cambio de contraseña obligatorio en primer login
-- Ejecutar en el SQL Editor de Supabase después de 01_schema_supabase.sql.
-- =====================================================================

alter table admin_profiles
  add column force_password_change boolean not null default true;

comment on column admin_profiles.force_password_change is
  'Si es true, el admin debe cambiar su contraseña antes de poder usar /dashboard. '
  'Se pone en true al crear un admin o al blanquearle la contraseña, y se pone en '
  'false cuando el propio usuario la cambia desde /change-password.';
