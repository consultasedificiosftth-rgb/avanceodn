import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin, requireRegionAccess } from "@/lib/api/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseNapExcel } from "@/lib/excel/parse";
import { applyExcelUpload } from "@/lib/excel/applyUpload";

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin();
  if ("response" in authResult) return authResult.response;
  const { admin } = authResult;

  const formData = await request.formData();
  const file = formData.get("file");
  const regionId = String(formData.get("regionId") ?? "");
  const providerId = formData.get("providerId") ? String(formData.get("providerId")) : null;
  const newProviderName = formData.get("newProviderName")
    ? String(formData.get("newProviderName")).trim()
    : null;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo Excel." }, { status: 400 });
  }
  if (!regionId) {
    return NextResponse.json({ error: "Falta la región." }, { status: 400 });
  }

  const regionError = requireRegionAccess(admin, regionId);
  if (regionError) return regionError;

  const buffer = Buffer.from(await file.arrayBuffer());
  const parsed = parseNapExcel(buffer);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const supabase = createAdminClient();

  let finalProviderId = providerId;
  if (!finalProviderId && newProviderName) {
    const { data: newProvider, error: providerError } = await supabase
      .from("providers")
      .insert({ name: newProviderName })
      .select("id")
      .single();
    if (providerError || !newProvider) {
      return NextResponse.json(
        { error: `Error creando el proveedor: ${providerError?.message ?? "desconocido"}` },
        { status: 400 }
      );
    }
    finalProviderId = newProvider.id;
  }

  try {
    const result = await applyExcelUpload({
      supabase,
      regionId,
      parsed,
      adminId: admin.userId,
      providerId: finalProviderId,
      originalFilename: file.name,
    });

    const { data: provider } = await supabase
      .from("providers")
      .select("id, name, link_token")
      .eq("id", result.pd.provider_id)
      .maybeSingle();

    return NextResponse.json({
      pd: result.pd,
      provider,
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
