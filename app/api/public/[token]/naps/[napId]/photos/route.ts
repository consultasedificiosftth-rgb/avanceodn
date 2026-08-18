import { NextResponse, type NextRequest } from "next/server";
import { resolvePdByToken } from "@/lib/api/publicAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { uploadNapPhoto, deleteNapPhoto, signPhotoUrls } from "@/lib/storage";
import type { PhotoCategory } from "@/lib/types";

async function loadActiveNap(supabase: ReturnType<typeof createAdminClient>, pdId: string, napId: string) {
  const { data: nap } = await supabase
    .from("naps")
    .select("*")
    .eq("id", napId)
    .eq("pd_id", pdId)
    .eq("active", true)
    .maybeSingle();
  return nap;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; napId: string }> }
) {
  const { token, napId } = await params;
  const pd = await resolvePdByToken(token);
  if (!pd) {
    return NextResponse.json({ error: "Link inválido o vencido." }, { status: 404 });
  }

  const supabase = createAdminClient();
  const nap = await loadActiveNap(supabase, pd.id, napId);
  if (!nap) {
    return NextResponse.json({ error: "NAP no encontrado." }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const category = String(formData.get("category") ?? "") as PhotoCategory;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo." }, { status: 400 });
  }
  if (category !== "construido" && category !== "pr_optica") {
    return NextResponse.json({ error: "Categoría inválida." }, { status: 400 });
  }

  const result = await uploadNapPhoto(supabase, { napId, category, file });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // Primera foto de pruebas ópticas: tilda el checkbox automáticamente.
  if (category === "pr_optica" && !nap.pruebas_opticas) {
    await supabase
      .from("naps")
      .update({ pruebas_opticas: true, pruebas_opticas_at: new Date().toISOString() })
      .eq("id", napId);
  }

  await supabase.from("audit_log").insert({
    pd_id: pd.id,
    nap_id: napId,
    actor_type: "provider_link",
    action: "upload_photo",
    detail: { category, nap_code: nap.code },
  });

  const signedUrls = await signPhotoUrls(supabase, [result.photo.storage_path]);

  return NextResponse.json({
    photo: { ...result.photo, category, url: signedUrls[result.photo.storage_path] ?? null },
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; napId: string }> }
) {
  const { token, napId } = await params;
  const pd = await resolvePdByToken(token);
  if (!pd) {
    return NextResponse.json({ error: "Link inválido o vencido." }, { status: 404 });
  }

  const supabase = createAdminClient();
  const nap = await loadActiveNap(supabase, pd.id, napId);
  if (!nap) {
    return NextResponse.json({ error: "NAP no encontrado." }, { status: 404 });
  }

  const photoId = request.nextUrl.searchParams.get("photoId");
  if (!photoId) {
    return NextResponse.json({ error: "Falta photoId." }, { status: 400 });
  }

  const { data: photo } = await supabase
    .from("nap_photos")
    .select("id, category")
    .eq("id", photoId)
    .eq("nap_id", napId)
    .maybeSingle();

  if (!photo) {
    return NextResponse.json({ error: "Foto no encontrada." }, { status: 404 });
  }

  const result = await deleteNapPhoto(supabase, photoId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  await supabase.from("audit_log").insert({
    pd_id: pd.id,
    nap_id: napId,
    actor_type: "provider_link",
    action: "delete_photo",
    detail: { category: photo.category, nap_code: nap.code },
  });

  return NextResponse.json({ ok: true });
}
