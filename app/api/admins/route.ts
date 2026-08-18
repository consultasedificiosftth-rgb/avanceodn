import { NextResponse, type NextRequest } from "next/server";
import { requireSuperadmin } from "@/lib/api/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateTempPassword } from "@/lib/passwords";

export async function POST(request: NextRequest) {
  const authResult = await requireSuperadmin();
  if ("response" in authResult) return authResult.response;

  const body = await request.json().catch(() => ({}));
  const email = String(body.email ?? "").trim();
  const fullName = body.fullName ? String(body.fullName).trim() : null;
  const role = body.role === "superadmin" ? "superadmin" : "admin";
  const regionId = role === "superadmin" ? null : (body.regionId ? String(body.regionId) : null);

  if (!email) {
    return NextResponse.json({ error: "El email es obligatorio." }, { status: 400 });
  }
  if (role === "admin" && !regionId) {
    return NextResponse.json({ error: "Un admin regional necesita una región." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const tempPassword = generateTempPassword();

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });

  if (createError || !created.user) {
    return NextResponse.json({ error: createError?.message ?? "Error creando el usuario." }, { status: 400 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("admin_profiles")
    .insert({
      id: created.user.id,
      full_name: fullName,
      role,
      region_id: regionId,
      force_password_change: true,
    })
    .select("*")
    .single();

  if (profileError || !profile) {
    await supabase.auth.admin.deleteUser(created.user.id);
    return NextResponse.json(
      { error: profileError?.message ?? "Error creando el perfil de admin." },
      { status: 400 }
    );
  }

  return NextResponse.json({ profile, email, tempPassword });
}
