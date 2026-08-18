export type AdminRole = "admin" | "superadmin";

export type Region = {
  id: string;
  name: string;
  slug: string;
};

export type AdminProfile = {
  id: string;
  full_name: string | null;
  role: AdminRole;
  region_id: string | null;
  force_password_change: boolean;
  created_at: string;
};

export type Provider = {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
};

export type Pd = {
  id: string;
  code: string;
  region_id: string;
  provider_id: string | null;
  link_token: string;
  original_filename: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Nap = {
  id: string;
  pd_id: string;
  code: string;
  construido: boolean;
  construido_at: string | null;
  pruebas_opticas: boolean;
  pruebas_opticas_at: string | null;
  active: boolean;
  removed_by: string | null;
  removed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PhotoCategory = "construido" | "pr_optica";

export type NapPhoto = {
  id: string;
  nap_id: string;
  category: PhotoCategory;
  storage_path: string;
  uploaded_at: string;
};

export type PdDailySnapshot = {
  id: string;
  pd_id: string;
  snapshot_date: string;
  total_naps: number;
  construidos: number;
  pruebas_opticas: number;
  pct_odn: number;
};

export type PdUploadStatus = "applied" | "pending_review";

export type PdUpload = {
  id: string;
  pd_id: string;
  uploaded_by: string | null;
  uploaded_at: string;
  total_naps_in_file: number;
  added_codes: string[];
  missing_codes: string[];
  status: PdUploadStatus;
  resolved_by: string | null;
  resolved_at: string | null;
};

export type AuditActorType = "admin" | "provider_link";

export type AuditLog = {
  id: string;
  pd_id: string | null;
  nap_id: string | null;
  actor_type: AuditActorType;
  actor_id: string | null;
  action: string;
  detail: Record<string, unknown> | null;
  created_at: string;
};

export const PHOTO_LIMITS: Record<PhotoCategory, number> = {
  construido: 1,
  pr_optica: 10,
};

export function pctOdn(construidos: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((construidos / total) * 10000) / 100;
}
