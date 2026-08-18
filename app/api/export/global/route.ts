import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { collectExportRows } from "@/lib/export/collectData";
import { buildExcelBuffer } from "@/lib/export/buildExcel";
import { buildFullExportZip } from "@/lib/export/buildZip";

export async function GET() {
  const authResult = await requireAdmin();
  if ("response" in authResult) return authResult.response;
  const { admin } = authResult;

  const supabase = createAdminClient();

  let pdQuery = supabase.from("pds").select("id");
  if (admin.profile.role !== "superadmin" && admin.profile.region_id) {
    pdQuery = pdQuery.eq("region_id", admin.profile.region_id);
  }
  const { data: pds } = await pdQuery;
  const pdIds = (pds ?? []).map((p) => p.id);

  if (pdIds.length === 0) {
    return NextResponse.json({ error: "No hay PDs para exportar." }, { status: 404 });
  }

  const rows = await collectExportRows(supabase, { pdIds });
  const excelBuffer = await buildExcelBuffer(rows);
  const zipBuffer = await buildFullExportZip(supabase, rows, excelBuffer, "reporte_global.xlsx");

  return new NextResponse(new Uint8Array(zipBuffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="export_global.zip"`,
    },
  });
}
