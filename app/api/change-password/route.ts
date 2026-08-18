import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/api/guards";
import { createClient } from "@/lib/supabase/server";

const MIN_LENGTH = 8;

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin();
  if ("response" in authResult) return authResult.response;
  const { admin } = authResult;

  const body = await request.json().catch(() => ({}));
  const password = String(body.password ?? "");
  const confirmPassword = String(body.confirmPassword ?? "");

  if (password.length < MIN_LENGTH) {
    return NextResponse.json(
      { error: `La contraseña tiene que tener al menos ${MIN_LENGTH} caracteres.` },
      { status: 400 }
    );
  }
  if (password !== confirmPassword) {
    return NextResponse.json({ error: "Las contraseñas no coinciden." }, { status: 400 });
  }

  const supabase = await createClient();

  const { error: authError } = await supabase.auth.updateUser({ password });
  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  const { error: profileError } = await supabase
    .from("admin_profiles")
    .update({ force_password_change: false })
    .eq("id", admin.userId);
  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
