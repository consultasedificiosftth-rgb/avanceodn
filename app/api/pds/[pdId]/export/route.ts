import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin, requireRegionAccess } from "@/lib/api/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { collectExportRows } from "@/lib/export/collectData";
import { buildExcelBuffer } from "@/lib/export/buildExcel";
import { buildExportZip, type ExportCategoriesOption } from "@/lib/export/buildZip";

const VALID_CATEGORIES: ExportCategoriesOption[] = ["both", "construido", "pr_optica"];
const ZIP_SUFFIX: Record<ExportCategoriesOption, string> = {
  both: "",
  construido: "_CONSTRUIDO",
  pr_optica: "_PR_OPTICA",
};

export async function GET(
  request: NextRequest,
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

  const categoriesParam = request.nextUrl.searchParams.get("categories") ?? "both";
  const categories = VALID_CATEGORIES.includes(categoriesParam as ExportCategoriesOption)
    ? (categoriesParam as ExportCategoriesOption)
    : "both";

  const rows = await collectExportRows(supabase, { pdIds: [pdId] });
  const excelBuffer = await buildExcelBuffer(rows);
  const zipBuffer = await buildExportZip(supabase, rows, {
    categories,
    excelBuffer,
    excelFilename: `PD_${pd.code}.xlsx`,
  });

  return new NextResponse(new Uint8Array(zipBuffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="PD_${pd.code}${ZIP_SUFFIX[categories]}.zip"`,
    },
  });
}
