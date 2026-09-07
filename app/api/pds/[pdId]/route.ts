import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin, requireRegionAccess } from "@/lib/api/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { NAP_PHOTOS_BUCKET } from "@/lib/storage";
import { pctOdn } from "@/lib/types";

const STORAGE_REMOVE_CHUNK = 100;

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ pdId: string }> }
) {
  const authResult = await requireAdmin();
  if ("response" in authResult) return authResult.response;
  const { admin } = authResult;

  const { pdId } = await params;
  const supabase = createAdminClient();

  const { data: pd, error: pdError } = await supabase
    .from("pds")
    .select("id, code, region_id")
    .eq("id", pdId)
    .maybeSingle();

  if (pdError || !pd) {
    return NextResponse.json({ error: "PD no encontrada." }, { status: 404 });
  }

  const regionError = requireRegionAccess(admin, pd.region_id);
  if (regionError) return regionError;

  const body = await request.json().catch(() => null);
  const confirmCode = body?.confirmCode ? String(body.confirmCode).trim() : "";
  if (confirmCode !== pd.code) {
    return NextResponse.json({ error: "El código no coincide con el de la PD." }, { status: 400 });
  }

  const { data: napsForStats, error: napsError } = await supabase
    .from("naps")
    .select("id, construido, active")
    .eq("pd_id", pdId);

  if (napsError) {
    return NextResponse.json({ error: napsError.message }, { status: 500 });
  }

  const activeNaps = (napsForStats ?? []).filter((n) => n.active);
  const construidos = activeNaps.filter((n) => n.construido).length;
  const totalNaps = activeNaps.length;

  const napIds = (napsForStats ?? []).map((n) => n.id);
  let storagePaths: string[] = [];
  if (napIds.length > 0) {
    const { data: photoRows, error: photosError } = await supabase
      .from("nap_photos")
      .select("storage_path")
      .in("nap_id", napIds);

    if (photosError) {
      return NextResponse.json({ error: photosError.message }, { status: 500 });
    }
    storagePaths = (photoRows ?? []).map((p) => p.storage_path);
  }

  for (let i = 0; i < storagePaths.length; i += STORAGE_REMOVE_CHUNK) {
    const chunk = storagePaths.slice(i, i + STORAGE_REMOVE_CHUNK);
    const { error: removeError } = await supabase.storage.from(NAP_PHOTOS_BUCKET).remove(chunk);
    if (removeError) {
      return NextResponse.json(
        { error: `Error borrando fotos del storage: ${removeError.message}` },
        { status: 500 }
      );
    }
  }

  await supabase.from("audit_log").insert({
    pd_id: pd.id,
    actor_type: "admin",
    actor_id: admin.userId,
    action: "delete_pd",
    detail: {
      code: pd.code,
      region_id: pd.region_id,
      total_naps: totalNaps,
      construidos,
      pct_odn: pctOdn(construidos, totalNaps),
    },
  });

  const { error: deleteError } = await supabase.from("pds").delete().eq("id", pdId);
  if (deleteError) {
    return NextResponse.json(
      {
        error: `No se pudo borrar la PD (¿se aplicó la migración 06_migration_delete_pd_audit_fk.sql?): ${deleteError.message}`,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, code: pd.code });
}
