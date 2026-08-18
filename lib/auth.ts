import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { AdminProfile } from "@/lib/types";

export type CurrentAdmin = {
  userId: string;
  email: string | null;
  profile: AdminProfile;
};

/**
 * Devuelve el admin logueado (auth + perfil) o null si no hay sesión.
 * Usar en Server Components / route handlers del panel /dashboard.
 */
export async function getCurrentAdmin(): Promise<CurrentAdmin | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("admin_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  return { userId: user.id, email: user.email ?? null, profile: profile as AdminProfile };
}

export function canAccessRegion(admin: CurrentAdmin, regionId: string): boolean {
  return admin.profile.role === "superadmin" || admin.profile.region_id === regionId;
}
