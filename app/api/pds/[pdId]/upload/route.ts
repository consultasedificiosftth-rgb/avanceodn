import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin, requireRegionAccess } from "@/lib/api/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseNapExcel } from "@/lib/excel/parse";
import { applyExcelUpload } from "@/lib/excel/applyUpload";

export async function POST(
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
    .select("*")
    .eq("id", pdId)
    .maybeSingle();

  if (pdError || !pd) {
    return NextResponse.json({ error: "PD no encontrada." }, { status: 404 });
  }

  const regionError = requireRegionAccess(admin, pd.region_id);
  if (regionError) return regionError;

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo Excel." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const parsed = parseNapExcel(buffer);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  if (parsed.pdCode !== pd.code) {
    return NextResponse.json(
      {
        error: `El archivo corresponde a la PD "${parsed.pdCode}", pero estás recargando la PD "${pd.code}". Revisá el archivo.`,
      },
      { status: 400 }
    );
  }

  try {
    const result = await applyExcelUpload({
      supabase,
      regionId: pd.region_id,
      parsed,
      adminId: admin.userId,
      originalFilename: file.name,
    });

    return NextResponse.json({
      pd: result.pd,
      created: result.created,
      addedCodes: result.addedCodes,
      missingCodes: result.missingCodes,
      status: result.status,
      duplicatesSkipped: parsed.duplicatesSkipped,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error procesando el archivo." },
      { status: 500 }
    );
  }
}
