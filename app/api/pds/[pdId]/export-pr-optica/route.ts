import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin, requireRegionAccess } from "@/lib/api/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { collectExportRows } from "@/lib/export/collectData";
import { buildPrOpticaOnlyZip } from "@/lib/export/buildZip";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ pdId: string }> }
) {
  const authResult = await requireAdmin();
  if ("response" in authResult) return authResult.response;
  const { admin } = authResult;

  const { pdId } = await params;
  const supabase = createAdminClient();

  const { data: pd } = await supabase.from("pds").select("id, code, region_id").eq("id", pdId).maybeSingle();
  if (!pd) return NextResponse.json({ error: "PD no encontrada." }, { status: 404 });

  const regionError = requireRegionAccess(admin, pd.region_id);
  if (regionError) return regionError;

  const rows = await collectExportRows(supabase, { pdIds: [pdId] });
  const zipBuffer = await buildPrOpticaOnlyZip(supabase, rows);

  return new NextResponse(new Uint8Array(zipBuffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="PD_${pd.code}_PR_OPTICA.zip"`,
    },
  });
}
