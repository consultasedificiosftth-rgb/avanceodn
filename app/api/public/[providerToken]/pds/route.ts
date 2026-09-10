import { NextResponse, type NextRequest } from "next/server";
import { resolveProviderByToken } from "@/lib/api/publicAuth";
import { createAdminClient } from "@/lib/supabase/admin";
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

  const supabase = createAdminClient();

  const { data: pds, error: pdsError } = await supabase
    .from("pds")
    .select("id, code, regions(name)")
    .eq("provider_id", provider.id)
    .order("code", { ascending: true });

  if (pdsError) {
    return NextResponse.json({ error: pdsError.message }, { status: 500 });
  }

  const pdIds = (pds ?? []).map((p) => p.id);

  const { data: naps } = pdIds.length
    ? await supabase.from("naps").select("pd_id, construido").in("pd_id", pdIds).eq("active", true)
    : { data: [] };

  const totalsByPd = new Map<string, { total: number; construidos: number }>();
  for (const n of naps ?? []) {
    const t = totalsByPd.get(n.pd_id) ?? { total: 0, construidos: 0 };
    t.total += 1;
    if (n.construido) t.construidos += 1;
    totalsByPd.set(n.pd_id, t);
  }

  const pdsWithStats = (pds ?? []).map((pd) => {
    const totals = totalsByPd.get(pd.id) ?? { total: 0, construidos: 0 };
    return {
      id: pd.id,
      code: pd.code,
      regionName: (pd.regions as unknown as { name: string } | null)?.name ?? "—",
      total: totals.total,
      construidos: totals.construidos,
      pctOdn: pctOdn(totals.construidos, totals.total),
    };
  });

  return NextResponse.json({
    provider: { id: provider.id, name: provider.name },
    pds: pdsWithStats,
  });
}
