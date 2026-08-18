"use client";

import { useRef, useState } from "react";
import { Camera, Plus } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PhotoCarousel } from "@/components/provider-portal/PhotoCarousel";
import { ConfirmDismissModal } from "@/components/provider-portal/ConfirmDismissModal";
import { NapToggle } from "@/components/provider-portal/NapToggle";
import { compressImage } from "@/lib/image/compress";
import { PHOTO_LIMITS, type Nap, type NapPhoto } from "@/lib/types";
import { toast } from "sonner";

export type NapWithPhotos = Nap & { nap_photos: (NapPhoto & { url: string | null })[] };

export function NapCard({
  token,
  nap,
  onChange,
}: {
  token: string;
  nap: NapWithPhotos;
  onChange: (updated: NapWithPhotos) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [confirmField, setConfirmField] = useState<"construido" | "pruebas_opticas" | null>(null);
  const construidoInputRef = useRef<HTMLInputElement>(null);
  const pruebasInputRef = useRef<HTMLInputElement>(null);
  const pruebasExtraInputRef = useRef<HTMLInputElement>(null);

  const construidoPhotos = nap.nap_photos.filter((p) => p.category === "construido");
  const pruebasPhotos = nap.nap_photos.filter((p) => p.category === "pr_optica");

  async function patchField(field: "construido" | "pruebas_opticas", value: boolean) {
    setBusy(true);
    try {
      const res = await fetch(`/api/public/${token}/naps/${nap.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, value }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Error actualizando el NAP.");
        return;
      }
      onChange({ ...nap, ...data.nap });
    } finally {
      setBusy(false);
    }
  }

  async function uploadPhotos(files: FileList, category: "construido" | "pr_optica") {
    setBusy(true);
    try {
      let latestNapPatch: Partial<Nap> = {};
      const uploaded: (NapPhoto & { url: string | null })[] = [];

      for (const rawFile of Array.from(files)) {
        const file = await compressImage(rawFile);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("category", category);

        const res = await fetch(`/api/public/${token}/naps/${nap.id}/photos`, {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error ?? "Error subiendo la foto.");
          continue;
        }
        uploaded.push(data.photo);
        if (category === "pr_optica" && !nap.pruebas_opticas) {
          latestNapPatch = { pruebas_opticas: true, pruebas_opticas_at: new Date().toISOString() };
        }
      }

      if (uploaded.length > 0) {
        onChange({
          ...nap,
          ...latestNapPatch,
          nap_photos: [...nap.nap_photos, ...uploaded],
        });
      }
    } finally {
      setBusy(false);
    }
  }

  async function deletePhoto(photoId: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/public/${token}/naps/${nap.id}/photos?photoId=${photoId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Error borrando la foto.");
        return;
      }
      onChange({ ...nap, nap_photos: nap.nap_photos.filter((p) => p.id !== photoId) });
    } finally {
      setBusy(false);
    }
  }

  function handleConstruidoToggle(checked: boolean) {
    if (checked) {
      patchField("construido", true);
    } else {
      setConfirmField("construido");
    }
  }

  function handlePruebasToggle(checked: boolean) {
    if (!checked) {
      setConfirmField("pruebas_opticas");
      return;
    }
    if (pruebasPhotos.length > 0) {
      patchField("pruebas_opticas", true);
    } else {
      pruebasInputRef.current?.click();
    }
  }

  const pruebasRemaining = PHOTO_LIMITS.pr_optica - pruebasPhotos.length;

  return (
    <Card className="gap-4 border-line bg-card py-4">
      <CardHeader className="px-4">
        <span className="font-mono text-xl font-semibold tracking-tight text-foreground">
          {nap.code}
        </span>
      </CardHeader>
      <CardContent className="space-y-5 px-4">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="space-y-2.5">
            <NapToggle
              id={`construido-${nap.id}`}
              label="Construido"
              checked={nap.construido}
              disabled={busy}
              busy={busy}
              onCheckedChange={handleConstruidoToggle}
            />
            <PhotoCarousel
              photos={construidoPhotos.map((p) => ({ id: p.id, url: p.url }))}
              onDelete={deletePhoto}
            />
            {construidoPhotos.length === 0 && (
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full"
                disabled={busy}
                onClick={() => construidoInputRef.current?.click()}
              >
                <Camera className="mr-1.5 size-4" /> Subir foto
              </Button>
            )}
            <input
              ref={construidoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) uploadPhotos(e.target.files, "construido");
                e.target.value = "";
              }}
            />
          </div>

          <div className="space-y-2.5">
            <NapToggle
              id={`pruebas-${nap.id}`}
              label="Pruebas ópticas"
              checked={nap.pruebas_opticas}
              disabled={busy}
              busy={busy}
              onCheckedChange={handlePruebasToggle}
            />
            <PhotoCarousel
              photos={pruebasPhotos.map((p) => ({ id: p.id, url: p.url }))}
              onDelete={deletePhoto}
            />
            {pruebasRemaining > 0 && (
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full"
                disabled={busy}
                onClick={() => pruebasExtraInputRef.current?.click()}
              >
                <Plus className="mr-1.5 size-4" /> Agregar foto ({pruebasPhotos.length}/{PHOTO_LIMITS.pr_optica})
              </Button>
            )}
            <input
              ref={pruebasInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) uploadPhotos(e.target.files, "pr_optica");
                e.target.value = "";
              }}
            />
            <input
              ref={pruebasExtraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) uploadPhotos(e.target.files, "pr_optica");
                e.target.value = "";
              }}
            />
          </div>
        </div>
      </CardContent>

      <ConfirmDismissModal
        open={confirmField !== null}
        onOpenChange={(open) => !open && setConfirmField(null)}
        label={confirmField === "construido" ? "Construido" : "Pruebas ópticas"}
        keepsPhotos={confirmField === "pruebas_opticas"}
        onConfirm={() => confirmField && patchField(confirmField, false)}
      />
    </Card>
  );
}
