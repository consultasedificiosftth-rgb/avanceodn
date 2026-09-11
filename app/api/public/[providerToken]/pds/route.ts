import { NextResponse, type NextRequest } from "next/server";
import { resolveProviderByToken } from "@/lib/api/publicAuth";
import { createPublicReadClient } from "@/lib/supabase/admin";
import { pctOdn } from "@/lib/types";

// Mismo motivo que en pds/[pdId]/naps/route.ts: sin esto, Next puede cachear
// esta respuesta (createAdminClient() no usa cookies()/headers()) y mostrar
// el % construido desactualizado al proveedor.
export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ providerToken: string }> }
) {
  const { providerToken } = await params;
  const provider = await resolveProviderByToken(providerToken);
  if (!provider) {
    return NextResponse.json({ error: "Link inválido o vencido." }, { status: 404 });
  }

  const supabase = createPublicReadClient();

  const { data: pds, error: pdsError } = await supabase
    .from("pds")
    .select("id, code, regions(name)")
    .eq("provider_id", provider.id)
    .order("code", { ascending: true });

  if (pdsError) {
    return NextResponse.json({ error: pdsError.message }, { status: 500 });
  }

  const pdIds = (pds ?? []).map((p) => p.id);

  // Conteos y % ODN: se leen del snapshot más reciente de cada PD
  // (pd_latest_snapshots, ver 07_migration_pd_latest_snapshots_view.sql)
  // en vez de contarlos en vivo sobre naps, que se truncaba silenciosamente
  // para PDs con muchos NAPs activos (fetch sin order/límite > 1000 filas
  // por defecto de PostgREST). Mismo fix aplicado en app/dashboard/page.tsx.
  const { data: latestSnapshots } = pdIds.length
    ? await supabase
        .from("pd_latest_snapshots")
        .select("pd_id, total_naps, construidos")
        .in("pd_id", pdIds)
    : { data: [] };

  const snapshotByPd = new Map((latestSnapshots ?? []).map((s) => [s.pd_id, s]));

  const pdsWithStats = (pds ?? []).map((pd) => {
    const snapshot = snapshotByPd.get(pd.id);
    const total = snapshot?.total_naps ?? 0;
    const construidos = snapshot?.construidos ?? 0;
    return {
      id: pd.id,
      code: pd.code,
      regionName: (pd.regions as unknown as { name: string } | null)?.name ?? "—",
      total,
      construidos,
      pctOdn: pctOdn(construidos, total),
    };
  });

  return NextResponse.json({
    provider: { id: provider.id, name: provider.name },
    pds: pdsWithStats,
  });
}
