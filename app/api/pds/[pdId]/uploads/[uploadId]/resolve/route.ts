import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin, requireRegionAccess } from "@/lib/api/guards";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type ResolveAction = "confirm_missing" | "dismiss";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pdId: string; uploadId: string }> }
) {
  const authResult = await requireAdmin();
  if ("response" in authResult) return authResult.response;
  const { admin } = authResult;

  const { pdId, uploadId } = await params;
  const body = await request.json().catch(() => ({}));
  const action = body.action as ResolveAction;

  if (action !== "confirm_missing" && action !== "dismiss") {
    return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
  }

  const adminClient = createAdminClient();

  const { data: pd, error: pdError } = await adminClient
    .from("pds")
    .select("id, region_id")
    .eq("id", pdId)
    .maybeSingle();
  if (pdError || !pd) {
    return NextResponse.json({ error: "PD no encontrada." }, { status: 404 });
  }

  const regionError = requireRegionAccess(admin, pd.region_id);
  if (regionError) return regionError;

  const { data: upload, error: uploadError } = await adminClient
    .from("pd_uploads")
    .select("*")
    .eq("id", uploadId)
    .eq("pd_id", pdId)
    .maybeSingle();
  if (uploadError || !upload) {
    return NextResponse.json({ error: "Carga no encontrada." }, { status: 404 });
  }
  if (upload.status !== "pending_review") {
    return NextResponse.json({ error: "Esta carga ya fue resuelta." }, { status: 400 });
  }

  const failed: { code: string; error: string }[] = [];

  if (action === "confirm_missing") {
    const sessionClient = await createClient();
    const missingCodes: string[] = upload.missing_codes ?? [];

    const { data: naps } = await adminClient
      .from("naps")
      .select("id, code")
      .eq("pd_id", pdId)
      .in("code", missingCodes)
      .eq("active", true);

    for (const nap of naps ?? []) {
      const { error: rpcError } = await sessionClient.rpc("remove_nap", { p_nap_id: nap.id });
      if (rpcError) failed.push({ code: nap.code, error: rpcError.message });
    }
  }

  const fullyResolved = action === "dismiss" || failed.length === 0;

  if (fullyResolved) {
    await adminClient
      .from("pd_uploads")
      .update({ status: "applied", resolved_by: admin.userId, resolved_at: new Date().toISOString() })
      .eq("id", uploadId);
  }

  return NextResponse.json({
    resolved: fullyResolved,
    failed,
  });
}
