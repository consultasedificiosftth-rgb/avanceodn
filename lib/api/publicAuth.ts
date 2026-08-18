import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Pd } from "@/lib/types";

/**
 * Resuelve un link_token de la URL del portal del proveedor contra la
 * tabla pds. El portal público no tiene sesión de Supabase Auth: esta
 * es la única capa de autorización para ese flujo.
 */
export async function resolvePdByToken(token: string): Promise<Pd | null> {
  if (!token || !/^[0-9a-f-]{36}$/i.test(token)) return null;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("pds")
    .select("*")
    .eq("link_token", token)
    .maybeSingle();

  if (error || !data) return null;
  return data as Pd;
}
