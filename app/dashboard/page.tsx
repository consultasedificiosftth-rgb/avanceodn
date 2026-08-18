import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAdmin } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { PdTable, type PdRow } from "@/components/dashboard/PdTable";
import { PdFilters } from "@/components/dashboard/PdFilters";
import { pctOdn } from "@/lib/types";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ provider?: string; status?: string }>;
}) {
  const { provider, status } = await searchParams;
  const admin = await getCurrentAdmin();
  const supabase = await createClient();

  const { data: pds } = await supabase
    .from("pds")
    .select("id, code, provider_id, providers(name)")
    .order("code", { ascending: true });

  const { data: providers } = await supabase.from("providers").select("id, name").eq("active", true);

  const pdIds = (pds ?? []).map((p) => p.id);

  const { data: naps } = pdIds.length
    ? await supabase.from("naps").select("pd_id, construido, pruebas_opticas").in("pd_id", pdIds).eq("active", true)
    : { data: [] };

  const { data: snapshots } = pdIds.length
    ? await supabase
        .from("pd_daily_snapshots")
        .select("pd_id, snapshot_date")
        .in("pd_id", pdIds)
        .order("snapshot_date", { ascending: false })
    : { data: [] };

  const lastUpdateByPd = new Map<string, string>();
  for (const s of snapshots ?? []) {
    if (!lastUpdateByPd.has(s.pd_id)) lastUpdateByPd.set(s.pd_id, s.snapshot_date);
  }

  const napsByPd = new Map<string, { construido: boolean; pruebas_opticas: boolean }[]>();
  for (const n of naps ?? []) {
    const arr = napsByPd.get(n.pd_id) ?? [];
    arr.push(n);
    napsByPd.set(n.pd_id, arr);
  }

  let rows: PdRow[] = (pds ?? []).map((pd) => {
    const pdNaps = napsByPd.get(pd.id) ?? [];
    const total = pdNaps.length;
    const construidos = pdNaps.filter((n) => n.construido).length;
    const pruebasOpticas = pdNaps.filter((n) => n.pruebas_opticas).length;
    return {
      id: pd.id,
      code: pd.code,
      providerName: (pd.providers as unknown as { name: string } | null)?.name ?? null,
      total,
      construidos,
      pruebasOpticas,
      pctOdn: pctOdn(construidos, total),
      lastUpdate: lastUpdateByPd.get(pd.id) ?? null,
    };
  });

  if (provider) rows = rows.filter((r) => (pds ?? []).find((p) => p.id === r.id)?.provider_id === provider);
  if (status === "not-started") rows = rows.filter((r) => r.pctOdn === 0);
  if (status === "in-progress") rows = rows.filter((r) => r.pctOdn > 0 && r.pctOdn < 100);
  if (status === "complete") rows = rows.filter((r) => r.pctOdn >= 100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          PDs {admin?.profile.role === "superadmin" ? "(todas las regiones)" : "de tu región"}
        </h1>
        <Button asChild>
          <Link href="/dashboard/pds/nueva">Nueva PD</Link>
        </Button>
      </div>

      <PdFilters providers={providers ?? []} />

      <div className="rounded-md border bg-background">
        <PdTable rows={rows} />
      </div>
    </div>
  );
}
