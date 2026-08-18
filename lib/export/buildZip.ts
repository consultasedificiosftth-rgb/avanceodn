import "server-only";
import { Archiver, ZipArchive } from "archiver";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NAP_PHOTOS_BUCKET } from "@/lib/storage";
import type { ExportNapRow } from "@/lib/export/collectData";
import type { PhotoCategory } from "@/lib/types";

const CATEGORY_FOLDER: Record<PhotoCategory, string> = {
  construido: "CONSTRUIDO",
  pr_optica: "PR_OPTICA",
};

function sanitizeSegment(segment: string): string {
  return segment.replace(/[\\/:*?"<>|]/g, "_");
}

function collectZipBuffer(fill: (archive: Archiver) => Promise<void>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = new ZipArchive({ zlib: { level: 9 } });
    const chunks: Buffer[] = [];

    archive.on("data", (chunk: Buffer) => chunks.push(chunk));
    archive.on("error", (err: Error) => reject(err));
    archive.on("end", () => resolve(Buffer.concat(chunks)));

    fill(archive)
      .then(() => archive.finalize())
      .catch(reject);
  });
}

async function appendPhotos(
  archive: Archiver,
  supabase: SupabaseClient,
  rows: ExportNapRow[],
  categories: PhotoCategory[]
) {
  for (const row of rows) {
    for (const photo of row.photos) {
      if (!categories.includes(photo.category)) continue;

      const { data, error } = await supabase.storage
        .from(NAP_PHOTOS_BUCKET)
        .download(photo.storagePath);
      if (error || !data) continue;

      const buffer = Buffer.from(await data.arrayBuffer());
      const zipPath = [
        sanitizeSegment(row.providerName),
        sanitizeSegment(row.pdCode),
        sanitizeSegment(row.napCode),
        CATEGORY_FOLDER[photo.category],
        photo.filename,
      ].join("/");

      archive.append(buffer, { name: zipPath });
    }
  }
}

export async function buildFullExportZip(
  supabase: SupabaseClient,
  rows: ExportNapRow[],
  excelBuffer: Buffer,
  excelFilename = "reporte.xlsx"
): Promise<Buffer> {
  return collectZipBuffer(async (archive) => {
    archive.append(excelBuffer, { name: excelFilename });
    await appendPhotos(archive, supabase, rows, ["construido", "pr_optica"]);
  });
}

export async function buildPrOpticaOnlyZip(
  supabase: SupabaseClient,
  rows: ExportNapRow[]
): Promise<Buffer> {
  return collectZipBuffer(async (archive) => {
    await appendPhotos(archive, supabase, rows, ["pr_optica"]);
  });
}
