import { NextResponse, type NextRequest } from "next/server";
import { resolveProviderByToken, resolvePdForProvider } from "@/lib/api/publicAuth";
import { createPublicReadClient } from "@/lib/supabase/admin";
import { signPhotoUrls } from "@/lib/storage";
import { pctOdn } from "@/lib/types";

// Este GET usa createAdminClient() (sin cookies()/headers()), así que Next lo
// trataría como estático y lo cachearía por combinación de params: el proveedor
// vería el estado de construido/pruebas_opticas congelado en la primera carga.
// fetchCache = "force-no-store" es necesario además de dynamic: fuerza que TODO
// fetch hecho dentro del handler (incluido el que hace supabase-js internamente)
// ignore el Data Cache de Next, incluso si esa librería pasara su propia opción
// `cache` al fetch — dynamic solo no lo garantiza en ese caso.
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ providerToken: string; pdId: string }> }
) {
  const { providerToken, pdId } = await params;
  const provider = await resolveProviderByToken(providerToken);
  if (!provider) {
    return NextResponse.json({ error: "Link inválido o vencido." }, { status: 404 });
  }

  const pd = await resolvePdForProvider(provider.id, pdId);
  if (!pd) {
    return NextResponse.json({ error: "Link inválido o vencido." }, { status: 404 });
  }

  const supabase = createPublicReadClient();

  const { data: naps, error: napsError } = await supabase
    .from("naps")
    .select("*, nap_photos(*)")
    .eq("pd_id", pd.id)
    .eq("active", true)
    .order("code", { ascending: true })
    .headers({ "Cache-Control": "no-cache", Pragma: "no-cache" });

  if (napsError) {
    return NextResponse.json({ error: napsError.message }, { status: 500 });
  }

  const allPaths = (naps ?? []).flatMap((n) =>
    (n.nap_photos ?? []).map((p: { storage_path: string }) => p.storage_path)
  );
  const signedUrls = await signPhotoUrls(supabase, allPaths);

  const napsWithUrls = (naps ?? []).map((n) => ({
    ...n,
    nap_photos: (n.nap_photos ?? []).map((p: { id: string; category: string; storage_path: string }) => ({
      ...p,
      url: signedUrls[p.storage_path] ?? null,
    })),
  }));

  const total = napsWithUrls.length;
  const construidos = napsWithUrls.filter((n) => n.construido).length;
  const pruebasOpticas = napsWithUrls.filter((n) => n.pruebas_opticas).length;

  return NextResponse.json(
    {
      pd: {
        id: pd.id,
        code: pd.code,
      },
      stats: {
        total,
        construidos,
        pruebasOpticas,
        pctOdn: pctOdn(construidos, total),
      },
      naps: napsWithUrls,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
