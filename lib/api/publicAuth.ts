import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Pd, Provider } from "@/lib/types";

const UUID_RE = /^[0-9a-f-]{36}$/i;

/**
 * Resuelve un link_token de la URL del portal del proveedor contra la
 * tabla providers. El portal público no tiene sesión de Supabase Auth:
 * esta es la única capa de autorización para ese flujo.
 */
export async function resolveProviderByToken(token: string): Promise<Provider | null> {
  if (!token || !UUID_RE.test(token)) return null;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("providers")
    .select("*")
    .eq("link_token", token)
    .maybeSingle();

  if (error || !data) return null;
  return data as Provider;
}

/**
 * Confirma que una PD pertenece efectivamente al proveedor del link
 * (provider_id coincide). Si alguien edita la URL a mano con el pdId de
 * otro proveedor, esto devuelve null.
 */
export async function resolvePdForProvider(providerId: string, pdId: string): Promise<Pd | null> {
  if (!pdId || !UUID_RE.test(pdId)) return null;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("pds")
    .select("*")
    .eq("id", pdId)
    .eq("provider_id", providerId)
    .maybeSingle();

  if (error || !data) return null;
  return data as Pd;
}
