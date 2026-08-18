import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin, requireRegionAccess } from "@/lib/api/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { collectExportRows } from "@/lib/export/collectData";
import { buildExcelBuffer } from "@/lib/export/buildExcel";
import { buildFullExportZip } from "@/lib/export/buildZip";

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
  const excelBuffer = await buildExcelBuffer(rows);
  const zipBuffer = await buildFullExportZip(supabase, rows, excelBuffer, `PD_${pd.code}.xlsx`);

  return new NextResponse(new Uint8Array(zipBuffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="PD_${pd.code}.zip"`,
    },
  });
}
