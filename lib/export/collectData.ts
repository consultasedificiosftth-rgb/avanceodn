import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { pctOdn, type PhotoCategory } from "@/lib/types";

export type ExportPhoto = {
  category: PhotoCategory;
  storagePath: string;
  filename: string;
};

export type ExportNapRow = {
  providerName: string;
  regionName: string;
  pdCode: string;
  napCode: string;
  construido: boolean;
  construidoAt: string | null;
  pruebasOpticas: boolean;
  pruebasOpticasAt: string | null;
  pctOdnOfPd: number;
  photos: ExportPhoto[];
};

function photoFilename(storagePath: string): string {
  const parts = storagePath.split("/");
  return parts[parts.length - 1];
}

export async function collectExportRows(
  supabase: SupabaseClient,
  filter: { pdIds?: string[]; napId?: string }
): Promise<ExportNapRow[]> {
  let query = supabase
    .from("naps")
    .select(
      "code, construido, construido_at, pruebas_opticas, pruebas_opticas_at, pd_id, nap_photos(category, storage_path), pds(code, provider_id, region_id, providers(name), regions(name))"
    )
    .eq("active", true);

  if (filter.napId) {
    query = query.eq("id", filter.napId);
  } else if (filter.pdIds) {
    query = query.in("pd_id", filter.pdIds);
  }

  const { data: naps, error } = await query;
  if (error) throw new Error(`Error leyendo NAPs para exportar: ${error.message}`);

  const rows = naps ?? [];

  const totalsByPd = new Map<string, { total: number; construidos: number }>();
  for (const n of rows) {
    const t = totalsByPd.get(n.pd_id) ?? { total: 0, construidos: 0 };
    t.total += 1;
    if (n.construido) t.construidos += 1;
    totalsByPd.set(n.pd_id, t);
  }

  return rows.map((n) => {
    const pd = n.pds as unknown as {
      code: string;
      providers: { name: string } | null;
      regions: { name: string } | null;
    };
    const totals = totalsByPd.get(n.pd_id)!;

    return {
      providerName: pd.providers?.name ?? "Sin proveedor",
      regionName: pd.regions?.name ?? "—",
      pdCode: pd.code,
      napCode: n.code,
      construido: n.construido,
      construidoAt: n.construido_at,
      pruebasOpticas: n.pruebas_opticas,
      pruebasOpticasAt: n.pruebas_opticas_at,
      pctOdnOfPd: pctOdn(totals.construidos, totals.total),
      photos: (n.nap_photos as { category: PhotoCategory; storage_path: string }[]).map((p) => ({
        category: p.category,
        storagePath: p.storage_path,
        filename: photoFilename(p.storage_path),
      })),
    };
  });
}
