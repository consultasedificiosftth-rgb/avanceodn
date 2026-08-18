import { NextResponse, type NextRequest } from "next/server";
import { requireSuperadmin } from "@/lib/api/guards";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ adminId: string }> }
) {
  const authResult = await requireSuperadmin();
  if ("response" in authResult) return authResult.response;

  const { adminId } = await params;
  const body = await request.json().catch(() => ({}));
  const role = body.role === "superadmin" ? "superadmin" : "admin";
  const regionId = role === "superadmin" ? null : (body.regionId ? String(body.regionId) : null);

  if (role === "admin" && !regionId) {
    return NextResponse.json({ error: "Un admin regional necesita una región." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: profile, error } = await supabase
    .from("admin_profiles")
    .update({ role, region_id: regionId })
    .eq("id", adminId)
    .select("*")
    .single();

  if (error || !profile) {
    return NextResponse.json({ error: error?.message ?? "Error actualizando el admin." }, { status: 400 });
  }

  return NextResponse.json({ profile });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ adminId: string }> }
) {
  const authResult = await requireSuperadmin();
  if ("response" in authResult) return authResult.response;
  const { admin } = authResult;

  const { adminId } = await params;
  if (adminId === admin.userId) {
    return NextResponse.json({ error: "No podés eliminar tu propia cuenta." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.auth.admin.deleteUser(adminId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
