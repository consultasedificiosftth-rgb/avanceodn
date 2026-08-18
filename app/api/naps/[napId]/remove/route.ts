import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin, requireRegionAccess } from "@/lib/api/guards";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ napId: string }> }
) {
  const authResult = await requireAdmin();
  if ("response" in authResult) return authResult.response;
  const { admin } = authResult;

  const { napId } = await params;
  const adminClient = createAdminClient();

  const { data: nap, error: napError } = await adminClient
    .from("naps")
    .select("id, pd_id, pds(region_id)")
    .eq("id", napId)
    .maybeSingle();

  if (napError || !nap) {
    return NextResponse.json({ error: "NAP no encontrado." }, { status: 404 });
  }

  const regionId = (nap as unknown as { pds: { region_id: string } }).pds.region_id;
  const regionError = requireRegionAccess(admin, regionId);
  if (regionError) return regionError;

  const sessionClient = await createClient();
  const { error: rpcError } = await sessionClient.rpc("remove_nap", { p_nap_id: napId });

  if (rpcError) {
    return NextResponse.json({ error: rpcError.message }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}
