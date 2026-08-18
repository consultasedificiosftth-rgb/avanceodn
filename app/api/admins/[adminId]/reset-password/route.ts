import { NextResponse, type NextRequest } from "next/server";
import { requireSuperadmin } from "@/lib/api/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { RESET_PASSWORD_VALUE } from "@/lib/passwords";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ adminId: string }> }
) {
  const authResult = await requireSuperadmin();
  if ("response" in authResult) return authResult.response;

  const { adminId } = await params;
  const supabase = createAdminClient();

  const { error: authError } = await supabase.auth.admin.updateUserById(adminId, {
    password: RESET_PASSWORD_VALUE,
  });
  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  const { error: profileError } = await supabase
    .from("admin_profiles")
    .update({ force_password_change: true })
    .eq("id", adminId);
  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, password: RESET_PASSWORD_VALUE });
}
