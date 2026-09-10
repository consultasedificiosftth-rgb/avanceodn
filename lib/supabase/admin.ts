import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente con la service role key. Bypassea RLS.
 * Nunca importar desde código que se ejecute en el cliente (browser).
 * Usar únicamente dentro de API routes / server actions.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/**
 * Igual que createAdminClient(), pero manda Cache-Control/Pragma: no-cache
 * en cada request a PostgREST. Usar solo en las rutas públicas del portal
 * de proveedor que leen naps (GET .../pds y GET .../pds/[pdId]/naps), que
 * mostraban construido/updated_at desactualizados pese a que el edge de
 * Vercel confirmaba MISS en esas respuestas.
 */
export function createPublicReadClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      },
    }
  );
}
