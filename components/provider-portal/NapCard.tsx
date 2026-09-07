"use client";

import { useRef, useState } from "react";
import { Camera, ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhotoCarousel } from "@/components/provider-portal/PhotoCarousel";
import { ConfirmDismissModal } from "@/components/provider-portal/ConfirmDismissModal";
import { NapToggle } from "@/components/provider-portal/NapToggle";
import { compressImage } from "@/lib/image/compress";
import { PHOTO_LIMITS, type Nap, type NapPhoto } from "@/lib/types";
import { useFileDrop } from "@/lib/hooks/useFileDrop";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type NapWithPhotos = Nap & { nap_photos: (NapPhoto & { url: string | null })[] };

export function NapCard({
  providerToken,
  pdId,
  nap,
  onChange,
}: {
  providerToken: string;
  pdId: string;
  nap: NapWithPhotos;
  onChange: (updated: NapWithPhotos) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [confirmField, setConfirmField] = useState<"construido" | "pruebas_opticas" | null>(null);
  const construidoInputRef = useRef<HTMLInputElement>(null);
  const pruebasInputRef = useRef<HTMLInputElement>(null);
  const pruebasExtraInputRef = useRef<HTMLInputElement>(null);

  const construidoPhotos = nap.nap_photos.filter((p) => p.category === "construido");
  const pruebasPhotos = nap.nap_photos.filter((p) => p.category === "pr_optica");
  const totalPhotos = construidoPhotos.length + pruebasPhotos.length;
  const construidoRemaining = PHOTO_LIMITS.construido - construidoPhotos.length;
  const pruebasRemaining = PHOTO_LIMITS.pr_optica - pruebasPhotos.length;

  async function patchField(field: "construido" | "pruebas_opticas", value: boolean) {
    setBusy(true);
    try {
      const res = await fetch(`/api/public/${providerToken}/pds/${pdId}/naps/${nap.id}`, {
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

  async function uploadPhotos(files: FileList | File[], category: "construido" | "pr_optica") {
    setBusy(true);
    try {
      let latestNapPatch: Partial<Nap> = {};
      const uploaded: (NapPhoto & { url: string | null })[] = [];

      for (const rawFile of Array.from(files)) {
        const file = await compressImage(rawFile);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("category", category);

        const res = await fetch(`/api/public/${providerToken}/pds/${pdId}/naps/${nap.id}/photos`, {
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
      const res = await fetch(
        `/api/public/${providerToken}/pds/${pdId}/naps/${nap.id}/photos?photoId=${photoId}`,
        { method: "DELETE" }
      );
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
    // Se expande para que el carrusel quede a la vista apenas se suba la foto.
    setExpanded(true);
    if (pruebasPhotos.length > 0) {
      patchField("pruebas_opticas", true);
    } else {
      pruebasInputRef.current?.click();
    }
  }

  const { isDraggingOver: isDraggingConstruido, dropHandlers: construidoDropHandlers } = useFileDrop(
    (files) => {
      const toUpload = Array.from(files).slice(0, construidoRemaining);
      if (toUpload.length > 0) uploadPhotos(toUpload, "construido");
    },
    busy || construidoRemaining <= 0
  );

  const { isDraggingOver: isDraggingPruebas, dropHandlers: pruebasDropHandlers } = useFileDrop((files) => {
    const dropped = Array.from(files);
    const toUpload = dropped.slice(0, pruebasRemaining);
    const overflow = dropped.length - toUpload.length;
    if (toUpload.length > 0) uploadPhotos(toUpload, "pr_optica");
    if (overflow > 0) {
      toast.error(
        `${overflow} foto${overflow === 1 ? "" : "s"} no se subieron: se alcanzó el límite de ${PHOTO_LIMITS.pr_optica} fotos de pruebas ópticas.`
      );
    }
  }, busy || pruebasRemaining <= 0);

  return (
    <div className="border-b border-line last:border-b-0">
      <div className="flex min-h-14 items-center gap-2 px-3 py-2">
        <span className="min-w-0 flex-1 truncate font-mono text-sm font-semibold text-foreground">
          {nap.code}
        </span>

        <NapToggle
          id={`construido-${nap.id}`}
          label="Constr."
          checked={nap.construido}
          disabled={busy}
          busy={busy}
          onCheckedChange={handleConstruidoToggle}
        />
        <NapToggle
          id={`pruebas-${nap.id}`}
          label="P.O."
          checked={nap.pruebas_opticas}
          disabled={busy}
          busy={busy}
          onCheckedChange={handlePruebasToggle}
        />

        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded-lg px-1.5 text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground"
          aria-expanded={expanded}
          aria-label={expanded ? "Ocultar fotos" : "Ver fotos"}
        >
          <Camera className="size-4" />
          <span className="text-xs font-semibold tabular-nums">{totalPhotos}</span>
          <ChevronDown
            className={cn("size-3.5 transition-transform duration-200", expanded && "rotate-180")}
          />
        </button>
      </div>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
        aria-hidden={!expanded}
      >
        <div className="overflow-hidden">
          <div className="grid grid-cols-1 gap-4 border-t border-line/60 bg-surface/40 px-3 pb-4 pt-3 sm:grid-cols-2">
            <div
              {...construidoDropHandlers}
              className={cn(
                "space-y-2 rounded-lg border-2 border-dashed p-2 transition-colors",
                isDraggingConstruido ? "border-signal bg-signal/5" : "border-transparent"
              )}
            >
              <p className="text-xs font-medium text-muted-foreground">Construido</p>
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

            <div
              {...pruebasDropHandlers}
              className={cn(
                "space-y-2 rounded-lg border-2 border-dashed p-2 transition-colors",
                isDraggingPruebas ? "border-signal bg-signal/5" : "border-transparent"
              )}
            >
              <p className="text-xs font-medium text-muted-foreground">Pruebas ópticas</p>
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
        </div>
      </div>

      <ConfirmDismissModal
        open={confirmField !== null}
        onOpenChange={(open) => !open && setConfirmField(null)}
        label={confirmField === "construido" ? "Construido" : "Pruebas ópticas"}
        keepsPhotos={confirmField === "pruebas_opticas"}
        onConfirm={() => confirmField && patchField(confirmField, false)}
      />
    </div>
  );
}
