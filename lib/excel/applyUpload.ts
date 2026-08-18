import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { diffNapCodes } from "@/lib/excel/diff";
import type { ParseExcelSuccess } from "@/lib/excel/parse";
import type { Pd } from "@/lib/types";

export type ApplyUploadParams = {
  supabase: SupabaseClient;
  regionId: string;
  parsed: ParseExcelSuccess;
  adminId: string;
  providerId?: string | null;
  originalFilename?: string | null;
};

export type ApplyUploadResult = {
  pd: Pd;
  created: boolean;
  addedCodes: string[];
  missingCodes: string[];
  status: "applied" | "pending_review";
};

export async function applyExcelUpload({
  supabase,
  regionId,
  parsed,
  adminId,
  providerId,
  originalFilename,
}: ApplyUploadParams): Promise<ApplyUploadResult> {
  const newCodes = parsed.naps.map((n) => n.code);

  const { data: existingPd, error: findError } = await supabase
    .from("pds")
    .select("*")
    .eq("code", parsed.pdCode)
    .eq("region_id", regionId)
    .maybeSingle();

  if (findError) throw new Error(`Error buscando PD existente: ${findError.message}`);

  if (!existingPd) {
    const { data: pd, error: pdError } = await supabase
      .from("pds")
      .insert({
        code: parsed.pdCode,
        region_id: regionId,
        provider_id: providerId ?? null,
        created_by: adminId,
        original_filename: originalFilename ?? null,
      })
      .select("*")
      .single();

    if (pdError || !pd) throw new Error(`Error creando la PD: ${pdError?.message}`);

    const { error: napsError } = await supabase.from("naps").insert(
      newCodes.map((code) => ({ pd_id: pd.id, code }))
    );

    if (napsError) throw new Error(`Error creando los NAPs: ${napsError.message}`);

    const { error: uploadError } = await supabase.from("pd_uploads").insert({
      pd_id: pd.id,
      uploaded_by: adminId,
      total_naps_in_file: parsed.totalNapRows,
      added_codes: newCodes,
      missing_codes: [],
      status: "applied",
    });

    if (uploadError) throw new Error(`Error guardando historial de carga: ${uploadError.message}`);

    return {
      pd: pd as Pd,
      created: true,
      addedCodes: newCodes,
      missingCodes: [],
      status: "applied",
    };
  }

  const pd = existingPd as Pd;

  const { data: existingNaps, error: existingNapsError } = await supabase
    .from("naps")
    .select("id, code, active")
    .eq("pd_id", pd.id);

  if (existingNapsError) throw new Error(`Error leyendo NAPs existentes: ${existingNapsError.message}`);

  const activeCodes = (existingNaps ?? []).filter((n) => n.active).map((n) => n.code);
  const inactiveByCode = new Map(
    (existingNaps ?? []).filter((n) => !n.active).map((n) => [n.code, n])
  );

  const diff = diffNapCodes(activeCodes, newCodes);

  const codesToReactivate = diff.addedCodes.filter((code) => inactiveByCode.has(code));
  const codesToInsert = diff.addedCodes.filter((code) => !inactiveByCode.has(code));

  if (codesToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("naps")
      .insert(codesToInsert.map((code) => ({ pd_id: pd.id, code })));
    if (insertError) throw new Error(`Error agregando NAPs nuevos: ${insertError.message}`);
  }

  for (const code of codesToReactivate) {
    const existing = inactiveByCode.get(code)!;
    const { error: reactivateError } = await supabase
      .from("naps")
      .update({ active: true, removed_by: null, removed_at: null })
      .eq("id", existing.id);
    if (reactivateError) throw new Error(`Error reactivando NAP ${code}: ${reactivateError.message}`);
  }

  const status = diff.missingCodes.length > 0 ? "pending_review" : "applied";

  const { error: uploadError } = await supabase.from("pd_uploads").insert({
    pd_id: pd.id,
    uploaded_by: adminId,
    total_naps_in_file: parsed.totalNapRows,
    added_codes: diff.addedCodes,
    missing_codes: diff.missingCodes,
    status,
  });

  if (uploadError) throw new Error(`Error guardando historial de carga: ${uploadError.message}`);

  if (originalFilename) {
    await supabase.from("pds").update({ original_filename: originalFilename }).eq("id", pd.id);
  }

  return {
    pd,
    created: false,
    addedCodes: diff.addedCodes,
    missingCodes: diff.missingCodes,
    status,
  };
}
