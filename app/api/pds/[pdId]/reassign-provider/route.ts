import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin, requireRegionAccess } from "@/lib/api/guards";
import { createAdminClient } from "@/lib/supabase/admin";

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
    .select("id, region_id, provider_id")
    .eq("id", pdId)
    .maybeSingle();

  if (pdError || !pd) {
    return NextResponse.json({ error: "PD no encontrada." }, { status: 404 });
  }

  const regionError = requireRegionAccess(admin, pd.region_id);
  if (regionError) return regionError;

  const body = await request.json().catch(() => null);
  const providerId = body?.providerId ? String(body.providerId) : "";
  if (!providerId) {
    return NextResponse.json({ error: "Falta el proveedor." }, { status: 400 });
  }
  if (providerId === pd.provider_id) {
    return NextResponse.json({ error: "La PD ya pertenece a ese proveedor." }, { status: 400 });
  }

  const { data: newProvider, error: providerError } = await supabase
    .from("providers")
    .select("id, name, link_token, active")
    .eq("id", providerId)
    .maybeSingle();

  if (providerError || !newProvider || !newProvider.active) {
    return NextResponse.json({ error: "Proveedor inválido o inactivo." }, { status: 400 });
  }

  let previousProviderName: string | null = null;
  if (pd.provider_id) {
    const { data: prevProvider } = await supabase
      .from("providers")
      .select("name")
      .eq("id", pd.provider_id)
      .maybeSingle();
    previousProviderName = prevProvider?.name ?? null;
  }

  const { error: updateError } = await supabase
    .from("pds")
    .update({ provider_id: newProvider.id })
    .eq("id", pdId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await supabase.from("audit_log").insert({
    pd_id: pdId,
    actor_type: "admin",
    actor_id: admin.userId,
    action: "reassign_provider",
    detail: {
      previous_provider_id: pd.provider_id,
      previous_provider_name: previousProviderName,
      new_provider_id: newProvider.id,
      new_provider_name: newProvider.name,
    },
  });

  return NextResponse.json({
    provider: { id: newProvider.id, name: newProvider.name, link_token: newProvider.link_token },
  });
}
