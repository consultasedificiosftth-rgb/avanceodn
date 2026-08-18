import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin, requireRegionAccess } from "@/lib/api/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { collectExportRows } from "@/lib/export/collectData";
import { buildExcelBuffer } from "@/lib/export/buildExcel";
import { buildFullExportZip } from "@/lib/export/buildZip";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ napId: string }> }
) {
  const authResult = await requireAdmin();
  if ("response" in authResult) return authResult.response;
  const { admin } = authResult;

  const { napId } = await params;
  const supabase = createAdminClient();

  const { data: nap } = await supabase
    .from("naps")
    .select("id, code, pds(region_id)")
    .eq("id", napId)
    .maybeSingle();
  if (!nap) return NextResponse.json({ error: "NAP no encontrado." }, { status: 404 });

  const regionId = (nap as unknown as { pds: { region_id: string } }).pds.region_id;
  const regionError = requireRegionAccess(admin, regionId);
  if (regionError) return regionError;

  const rows = await collectExportRows(supabase, { napId });
  const excelBuffer = await buildExcelBuffer(rows);
  const zipBuffer = await buildFullExportZip(supabase, rows, excelBuffer, `NAP_${nap.code}.xlsx`);

  return new NextResponse(new Uint8Array(zipBuffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="NAP_${nap.code}.zip"`,
    },
  });
}
