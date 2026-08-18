import { NextResponse, type NextRequest } from "next/server";
import { resolveProviderByToken, resolvePdForProvider } from "@/lib/api/publicAuth";
import { createAdminClient } from "@/lib/supabase/admin";

type ToggleField = "construido" | "pruebas_opticas";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ providerToken: string; pdId: string; napId: string }> }
) {
  const { providerToken, pdId, napId } = await params;
  const provider = await resolveProviderByToken(providerToken);
  if (!provider) {
    return NextResponse.json({ error: "Link inválido o vencido." }, { status: 404 });
  }

  const pd = await resolvePdForProvider(provider.id, pdId);
  if (!pd) {
    return NextResponse.json({ error: "Link inválido o vencido." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const field = body.field as ToggleField;
  const value = Boolean(body.value);

  if (field !== "construido" && field !== "pruebas_opticas") {
    return NextResponse.json({ error: "Campo inválido." }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: nap, error: napError } = await supabase
    .from("naps")
    .select("*")
    .eq("id", napId)
    .eq("pd_id", pd.id)
    .eq("active", true)
    .maybeSingle();

  if (napError || !nap) {
    return NextResponse.json({ error: "NAP no encontrado." }, { status: 404 });
  }

  if (field === "pruebas_opticas" && value) {
    const { count } = await supabase
      .from("nap_photos")
      .select("id", { count: "exact", head: true })
      .eq("nap_id", napId)
      .eq("category", "pr_optica");

    if (!count || count === 0) {
      return NextResponse.json(
        { error: "Pruebas ópticas requiere al menos 1 foto. Subí una foto primero." },
        { status: 400 }
      );
    }
  }

  const atColumn = field === "construido" ? "construido_at" : "pruebas_opticas_at";
  const { data: updated, error: updateError } = await supabase
    .from("naps")
    .update({ [field]: value, [atColumn]: value ? new Date().toISOString() : null })
    .eq("id", napId)
    .select("*")
    .single();

  if (updateError || !updated) {
    return NextResponse.json({ error: updateError?.message ?? "Error actualizando el NAP." }, { status: 500 });
  }

  await supabase.from("audit_log").insert({
    pd_id: pd.id,
    nap_id: napId,
    actor_type: "provider_link",
    action: `${value ? "tilde" : "destilde"}_${field}`,
    detail: { nap_code: nap.code },
  });

  return NextResponse.json({ nap: updated });
}
