import { NextResponse, type NextRequest } from "next/server";
import { resolvePdByToken } from "@/lib/api/publicAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { signPhotoUrls } from "@/lib/storage";
import { pctOdn } from "@/lib/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const pd = await resolvePdByToken(token);
  if (!pd) {
    return NextResponse.json({ error: "Link inválido o vencido." }, { status: 404 });
  }

  const supabase = createAdminClient();

  const { data: naps, error: napsError } = await supabase
    .from("naps")
    .select("*, nap_photos(*)")
    .eq("pd_id", pd.id)
    .eq("active", true)
    .order("code", { ascending: true });

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

  return NextResponse.json({
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
  });
}
