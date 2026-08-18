-- =====================================================================
-- PORTAL DE SEGUIMIENTO ODN — ESQUEMA COMPLETO PARA SUPABASE
-- Ejecutar de arriba hacia abajo en el SQL Editor de Supabase.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. EXTENSIONES
-- ---------------------------------------------------------------------
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ---------------------------------------------------------------------
-- 1. REGIONES
-- ---------------------------------------------------------------------
create table regions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique
);

insert into regions (name, slug) values
  ('CABA', 'caba'),
  ('GBA Oeste', 'gba-oeste'),
  ('GBA Sur', 'gba-sur'),
  ('GBA Norte', 'gba-norte');

-- ---------------------------------------------------------------------
-- 2. PERFILES DE ADMIN (extiende auth.users)
-- ---------------------------------------------------------------------
create table admin_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null check (role in ('admin','superadmin')),
  region_id uuid references regions(id), -- null si es superadmin
  created_at timestamptz not null default now()
);

-- Un admin regional SIEMPRE debe tener region_id; superadmin siempre null.
alter table admin_profiles add constraint chk_admin_region
  check (
    (role = 'admin' and region_id is not null) or
    (role = 'superadmin' and region_id is null)
  );

-- ---------------------------------------------------------------------
-- 3. PROVEEDORES
-- ---------------------------------------------------------------------
create table providers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 4. PDs
-- ---------------------------------------------------------------------
create table pds (
  id uuid primary key default gen_random_uuid(),
  code text not null,                    -- prefijo de 4 letras (ej: RDOQ)
  region_id uuid not null references regions(id),
  provider_id uuid references providers(id),
  link_token uuid not null default gen_random_uuid(), -- token del link público
  original_filename text,
  created_by uuid references admin_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (code, region_id)
);

create unique index pds_link_token_idx on pds(link_token);
create index pds_region_idx on pds(region_id);

-- ---------------------------------------------------------------------
-- 5. NAPs
-- ---------------------------------------------------------------------
create table naps (
  id uuid primary key default gen_random_uuid(),
  pd_id uuid not null references pds(id) on delete cascade,
  code text not null,                    -- código completo del NAP (ej: RDOQB17)
  construido boolean not null default false,
  construido_at timestamptz,
  pruebas_opticas boolean not null default false,
  pruebas_opticas_at timestamptz,
  active boolean not null default true,  -- false = dado de baja por superadmin
  removed_by uuid references admin_profiles(id),
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pd_id, code)
);

create index naps_pd_idx on naps(pd_id);

-- ---------------------------------------------------------------------
-- 6. FOTOS POR NAP (separadas por categoría)
-- ---------------------------------------------------------------------
create table nap_photos (
  id uuid primary key default gen_random_uuid(),
  nap_id uuid not null references naps(id) on delete cascade,
  category text not null check (category in ('construido','pr_optica')),
  storage_path text not null,            -- path dentro del bucket 'nap-photos'
  uploaded_at timestamptz not null default now()
);

create index nap_photos_nap_idx on nap_photos(nap_id);

-- Límite: 1 foto para 'construido', 10 fotos para 'pr_optica'
create or replace function check_photo_limits() returns trigger as $$
declare
  cnt int;
begin
  if new.category = 'construido' then
    select count(*) into cnt from nap_photos
      where nap_id = new.nap_id and category = 'construido';
    if cnt >= 1 then
      raise exception 'Ya existe una foto de construcción para este NAP (máximo 1)';
    end if;
  elsif new.category = 'pr_optica' then
    select count(*) into cnt from nap_photos
      where nap_id = new.nap_id and category = 'pr_optica';
    if cnt >= 10 then
      raise exception 'Se alcanzó el máximo de 10 fotos de pruebas ópticas para este NAP';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_check_photo_limits
before insert on nap_photos
for each row execute function check_photo_limits();

-- ---------------------------------------------------------------------
-- 7. LÍNEA DE TIEMPO POR PD (snapshot diario)
-- ---------------------------------------------------------------------
create table pd_daily_snapshots (
  id uuid primary key default gen_random_uuid(),
  pd_id uuid not null references pds(id) on delete cascade,
  snapshot_date date not null,
  total_naps int not null,
  construidos int not null,
  pruebas_opticas int not null,
  pct_odn numeric(5,2) not null,
  unique (pd_id, snapshot_date)
);

create index snapshots_pd_idx on pd_daily_snapshots(pd_id, snapshot_date);

-- Recalcula y upsertea el snapshot del día actual cada vez que cambia un NAP
create or replace function upsert_pd_snapshot() returns trigger as $$
declare
  v_pd_id uuid;
  v_total int;
  v_construidos int;
  v_pruebas int;
  v_pct numeric(5,2);
begin
  v_pd_id := coalesce(new.pd_id, old.pd_id);

  select count(*),
         count(*) filter (where construido),
         count(*) filter (where pruebas_opticas)
    into v_total, v_construidos, v_pruebas
    from naps
    where pd_id = v_pd_id and active = true;

  v_pct := case when v_total = 0 then 0
                else round((v_construidos::numeric / v_total) * 100, 2) end;

  insert into pd_daily_snapshots (pd_id, snapshot_date, total_naps, construidos, pruebas_opticas, pct_odn)
  values (v_pd_id, current_date, v_total, v_construidos, v_pruebas, v_pct)
  on conflict (pd_id, snapshot_date) do update
    set total_naps = excluded.total_naps,
        construidos = excluded.construidos,
        pruebas_opticas = excluded.pruebas_opticas,
        pct_odn = excluded.pct_odn;

  return new;
end;
$$ language plpgsql;

create trigger trg_naps_snapshot
after insert or update or delete on naps
for each row execute function upsert_pd_snapshot();

-- ---------------------------------------------------------------------
-- 8. HISTORIAL DE CARGAS DE EXCEL (para el flujo de "más/menos NAPs")
-- ---------------------------------------------------------------------
create table pd_uploads (
  id uuid primary key default gen_random_uuid(),
  pd_id uuid not null references pds(id) on delete cascade,
  uploaded_by uuid references admin_profiles(id),
  uploaded_at timestamptz not null default now(),
  total_naps_in_file int not null,
  added_codes text[] not null default '{}',
  missing_codes text[] not null default '{}',
  status text not null default 'applied'
    check (status in ('applied','pending_review')),
  resolved_by uuid references admin_profiles(id),
  resolved_at timestamptz
);

create index pd_uploads_pd_idx on pd_uploads(pd_id);

-- ---------------------------------------------------------------------
-- 9. AUDITORÍA (destildes, borrados, resoluciones)
-- ---------------------------------------------------------------------
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  pd_id uuid references pds(id),
  nap_id uuid references naps(id),
  actor_type text not null check (actor_type in ('admin','provider_link')),
  actor_id uuid,             -- admin_profiles.id si actor_type = 'admin'
  action text not null,      -- ej: 'tilde_construido', 'destilde_pr_optica', 'remove_nap'
  detail jsonb,
  created_at timestamptz not null default now()
);

create index audit_pd_idx on audit_log(pd_id);

-- ---------------------------------------------------------------------
-- 10. TRIGGER GENÉRICO updated_at
-- ---------------------------------------------------------------------
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_pds_updated_at before update on pds
  for each row execute function set_updated_at();
create trigger trg_naps_updated_at before update on naps
  for each row execute function set_updated_at();

-- =====================================================================
-- 11. FUNCIONES HELPER PARA RLS (leen el perfil del usuario logueado)
-- =====================================================================
create or replace function current_admin_role() returns text as $$
  select role from admin_profiles where id = auth.uid();
$$ language sql stable security definer;

create or replace function current_admin_region() returns uuid as $$
  select region_id from admin_profiles where id = auth.uid();
$$ language sql stable security definer;

-- =====================================================================
-- 12. RPC: eliminar NAP (solo superadmin si ya tiene avance cargado)
-- =====================================================================
create or replace function remove_nap(p_nap_id uuid) returns void as $$
declare
  v_role text;
  v_touched boolean;
begin
  v_role := current_admin_role();

  select (construido or pruebas_opticas or
          exists(select 1 from nap_photos where nap_id = p_nap_id))
    into v_touched
    from naps where id = p_nap_id;

  if v_touched and v_role <> 'superadmin' then
    raise exception 'Este NAP ya tiene avance cargado. Solo el superadmin puede eliminarlo.';
  end if;

  update naps
    set active = false, removed_by = auth.uid(), removed_at = now()
    where id = p_nap_id;

  insert into audit_log (pd_id, nap_id, actor_type, actor_id, action, detail)
  select pd_id, id, 'admin', auth.uid(), 'remove_nap', jsonb_build_object('was_touched', v_touched)
  from naps where id = p_nap_id;
end;
$$ language plpgsql security definer;

-- =====================================================================
-- 13. ROW LEVEL SECURITY
-- Nota de arquitectura: el portal público del proveedor (sin login) NO
-- usa estas políticas — todas sus escrituras/lecturas pasan por rutas
-- API de Next.js que usan la service role key (bypassea RLS) y validan
-- el link_token a mano. Estas políticas RLS son solo para el panel de
-- admins autenticados.
-- =====================================================================

alter table regions enable row level security;
alter table admin_profiles enable row level security;
alter table providers enable row level security;
alter table pds enable row level security;
alter table naps enable row level security;
alter table nap_photos enable row level security;
alter table pd_daily_snapshots enable row level security;
alter table pd_uploads enable row level security;
alter table audit_log enable row level security;

-- regions: lectura para cualquier admin logueado
create policy "regions_select_all" on regions for select
  using (auth.uid() is not null);

-- admin_profiles: cada admin ve su propio perfil; superadmin ve todos
create policy "admin_profiles_select" on admin_profiles for select
  using (id = auth.uid() or current_admin_role() = 'superadmin');
create policy "admin_profiles_update_own" on admin_profiles for update
  using (id = auth.uid() or current_admin_role() = 'superadmin');
create policy "admin_profiles_insert_superadmin" on admin_profiles for insert
  with check (current_admin_role() = 'superadmin');

-- providers: cualquier admin puede ver y crear; solo superadmin desactiva
create policy "providers_select_all" on providers for select
  using (auth.uid() is not null);
create policy "providers_insert_any_admin" on providers for insert
  with check (auth.uid() is not null);
create policy "providers_update_superadmin" on providers for update
  using (current_admin_role() = 'superadmin');

-- pds: admin regional ve/gestiona solo su región; superadmin todas
create policy "pds_select_own_region" on pds for select
  using (current_admin_role() = 'superadmin' or region_id = current_admin_region());
create policy "pds_insert_own_region" on pds for insert
  with check (current_admin_role() = 'superadmin' or region_id = current_admin_region());
create policy "pds_update_own_region" on pds for update
  using (current_admin_role() = 'superadmin' or region_id = current_admin_region());
create policy "pds_delete_superadmin" on pds for delete
  using (current_admin_role() = 'superadmin');

-- naps: heredan el scoping de su PD
create policy "naps_select_own_region" on naps for select
  using (exists (
    select 1 from pds p where p.id = naps.pd_id
    and (current_admin_role() = 'superadmin' or p.region_id = current_admin_region())
  ));
create policy "naps_update_own_region" on naps for update
  using (exists (
    select 1 from pds p where p.id = naps.pd_id
    and (current_admin_role() = 'superadmin' or p.region_id = current_admin_region())
  ));
-- No hay policy de delete directa: las bajas van por la función remove_nap()

-- nap_photos: heredan el scoping vía nap -> pd
create policy "nap_photos_select_own_region" on nap_photos for select
  using (exists (
    select 1 from naps n join pds p on p.id = n.pd_id
    where n.id = nap_photos.nap_id
    and (current_admin_role() = 'superadmin' or p.region_id = current_admin_region())
  ));

-- pd_daily_snapshots: mismo scoping
create policy "snapshots_select_own_region" on pd_daily_snapshots for select
  using (exists (
    select 1 from pds p where p.id = pd_daily_snapshots.pd_id
    and (current_admin_role() = 'superadmin' or p.region_id = current_admin_region())
  ));

-- pd_uploads: mismo scoping
create policy "pd_uploads_select_own_region" on pd_uploads for select
  using (exists (
    select 1 from pds p where p.id = pd_uploads.pd_id
    and (current_admin_role() = 'superadmin' or p.region_id = current_admin_region())
  ));
create policy "pd_uploads_insert_own_region" on pd_uploads for insert
  with check (exists (
    select 1 from pds p where p.id = pd_uploads.pd_id
    and (current_admin_role() = 'superadmin' or p.region_id = current_admin_region())
  ));
create policy "pd_uploads_update_own_region" on pd_uploads for update
  using (exists (
    select 1 from pds p where p.id = pd_uploads.pd_id
    and (current_admin_role() = 'superadmin' or p.region_id = current_admin_region())
  ));

-- audit_log: mismo scoping, solo lectura desde el panel
create policy "audit_select_own_region" on audit_log for select
  using (pd_id is null or exists (
    select 1 from pds p where p.id = audit_log.pd_id
    and (current_admin_role() = 'superadmin' or p.region_id = current_admin_region())
  ));

-- =====================================================================
-- 14. STORAGE — bucket privado de fotos
-- Se crea manualmente desde el dashboard de Supabase (Storage > New bucket
-- > "nap-photos" > Private). No se necesitan políticas de Storage porque
-- todo el acceso (lectura y escritura) pasa por rutas API server-side
-- con la service role key.
-- =====================================================================
