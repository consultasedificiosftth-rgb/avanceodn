import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PHOTO_LIMITS, type PhotoCategory } from "@/lib/types";

export const NAP_PHOTOS_BUCKET = "nap-photos";
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hora

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_").slice(-80);
}

export async function uploadNapPhoto(
  supabase: SupabaseClient,
  {
    napId,
    category,
    file,
  }: { napId: string; category: PhotoCategory; file: File }
): Promise<{ ok: true; photo: { id: string; storage_path: string } } | { ok: false; error: string }> {
  const { count, error: countError } = await supabase
    .from("nap_photos")
    .select("id", { count: "exact", head: true })
    .eq("nap_id", napId)
    .eq("category", category);

  if (countError) return { ok: false, error: countError.message };

  const limit = PHOTO_LIMITS[category];
  if ((count ?? 0) >= limit) {
    return {
      ok: false,
      error:
        category === "construido"
          ? "Ya existe una foto de Construido para este NAP (máximo 1). Borrala antes de subir otra."
          : `Se alcanzó el máximo de ${limit} fotos de pruebas ópticas para este NAP.`,
    };
  }

  const path = `${napId}/${category}/${crypto.randomUUID()}-${sanitizeFilename(file.name)}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(NAP_PHOTOS_BUCKET)
    .upload(path, buffer, { contentType: file.type || "image/jpeg" });

  if (uploadError) return { ok: false, error: uploadError.message };

  const { data: photo, error: insertError } = await supabase
    .from("nap_photos")
    .insert({ nap_id: napId, category, storage_path: path })
    .select("id, storage_path")
    .single();

  if (insertError || !photo) {
    await supabase.storage.from(NAP_PHOTOS_BUCKET).remove([path]);
    return { ok: false, error: insertError?.message ?? "Error guardando la foto." };
  }

  return { ok: true, photo };
}

export async function deleteNapPhoto(
  supabase: SupabaseClient,
  photoId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: photo, error: fetchError } = await supabase
    .from("nap_photos")
    .select("storage_path")
    .eq("id", photoId)
    .maybeSingle();

  if (fetchError) return { ok: false, error: fetchError.message };
  if (!photo) return { ok: false, error: "Foto no encontrada." };

  const { error: removeError } = await supabase.storage
    .from(NAP_PHOTOS_BUCKET)
    .remove([photo.storage_path]);
  if (removeError) return { ok: false, error: removeError.message };

  const { error: deleteError } = await supabase.from("nap_photos").delete().eq("id", photoId);
  if (deleteError) return { ok: false, error: deleteError.message };

  return { ok: true };
}

export async function signPhotoUrls(
  supabase: SupabaseClient,
  paths: string[]
): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data, error } = await supabase.storage
    .from(NAP_PHOTOS_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);

  if (error || !data) return {};

  const result: Record<string, string> = {};
  for (const item of data) {
    if (item.path && item.signedUrl) result[item.path] = item.signedUrl;
  }
  return result;
}
