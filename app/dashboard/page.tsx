import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAdmin } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { type PdRow } from "@/components/dashboard/PdTable";
import { PdDashboardBody } from "@/components/dashboard/PdDashboardBody";
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
    .select("id, code, provider_id, providers(name, link_token)")
    .order("code", { ascending: true });

  const { data: providers } = await supabase.from("providers").select("id, name").eq("active", true);

  const pdIds = (pds ?? []).map((p) => p.id);

  // Solo para el desplegable de "NAPs construidos" al expandir una fila:
  // ese sí necesita los códigos reales de naps, no vive en el snapshot.
  // Paginado en bloques porque PostgREST corta cualquier response en
  // db.max_rows (1000 por defecto en Supabase): con muchas PDs la suma de
  // naps activos supera esa cota y un fetch sin order()/range() se trunca
  // en silencio, dejando afuera del Map a las PDs cuyas filas caen después
  // del corte (mismo bug ya documentado para los conteos, ver
  // 07_migration_pd_latest_snapshots_view.sql).
  const naps: { pd_id: string; code: string; construido: boolean }[] = [];
  if (pdIds.length) {
    const PAGE_SIZE = 1000;
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data: page } = await supabase
        .from("naps")
        .select("pd_id, code, construido")
        .in("pd_id", pdIds)
        .eq("active", true)
        .order("pd_id", { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);
      naps.push(...(page ?? []));
      if (!page || page.length < PAGE_SIZE) break;
    }
  }

  // Conteos y % ODN del listado: se leen del snapshot más reciente de
  // cada PD (pd_latest_snapshots, ver 07_migration_pd_latest_snapshots_view.sql)
  // en vez de contarlos en vivo sobre naps, que se truncaba silenciosamente
  // para PDs con muchos NAPs activos (fetch sin order/límite > 1000 filas
  // por defecto de PostgREST).
  const { data: latestSnapshots } = pdIds.length
    ? await supabase
        .from("pd_latest_snapshots")
        .select("pd_id, snapshot_date, total_naps, construidos, pruebas_opticas")
        .in("pd_id", pdIds)
    : { data: [] };

  const snapshotByPd = new Map(
    (latestSnapshots ?? []).map((s) => [s.pd_id, s])
  );

  const napsByPd = new Map<string, { code: string; construido: boolean }[]>();
  for (const n of naps ?? []) {
    const arr = napsByPd.get(n.pd_id) ?? [];
    arr.push(n);
    napsByPd.set(n.pd_id, arr);
  }

  let rows: PdRow[] = (pds ?? []).map((pd) => {
    const snapshot = snapshotByPd.get(pd.id);
    const total = snapshot?.total_naps ?? 0;
    const construidos = snapshot?.construidos ?? 0;
    const pruebasOpticas = snapshot?.pruebas_opticas ?? 0;
    const constructedNapCodes = (napsByPd.get(pd.id) ?? [])
      .filter((n) => n.construido)
      .map((n) => n.code)
      .sort();
    const providerInfo = pd.providers as unknown as { name: string; link_token: string } | null;
    return {
      id: pd.id,
      code: pd.code,
      providerName: providerInfo?.name ?? null,
      providerLinkToken: providerInfo?.link_token ?? null,
      total,
      construidos,
      pruebasOpticas,
      pctOdn: pctOdn(construidos, total),
      lastUpdate: snapshot?.snapshot_date ?? null,
      constructedNapCodes,
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

      <PdDashboardBody rows={rows} providers={providers ?? []} />
    </div>
  );
}
