"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Trash2, ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

export type CarouselPhoto = {
  id: string;
  url: string | null;
};

export function PhotoCarousel({
  photos,
  onDelete,
  readOnly = false,
}: {
  photos: CarouselPhoto[];
  onDelete?: (photoId: string) => void;
  readOnly?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const clampedIndex = Math.min(index, Math.max(photos.length - 1, 0));
  const current = photos[clampedIndex];
  const multiple = photos.length > 1;

  if (photos.length === 0) {
    return (
      <div className="flex h-36 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-surface text-muted-foreground">
        <ImageOff className="size-4" />
        <span className="text-sm">Sin fotos</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative flex h-48 w-full items-center justify-center overflow-hidden rounded-xl border-2 border-line bg-surface sm:h-56">
        {current?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current.url}
            alt="Foto NAP"
            className="h-full w-full object-contain"
          />
        ) : (
          <span className="text-sm text-muted-foreground">No se pudo cargar</span>
        )}

        {multiple && (
          <>
            <button
              type="button"
              onClick={() => setIndex((i) => (i - 1 + photos.length) % photos.length)}
              className="absolute left-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface-raised/90 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-surface-raised"
              aria-label="Foto anterior"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => setIndex((i) => (i + 1) % photos.length)}
              className="absolute right-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface-raised/90 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-surface-raised"
              aria-label="Foto siguiente"
            >
              <ChevronRight className="size-5" />
            </button>
          </>
        )}

        {!readOnly && onDelete && current && (
          <button
            type="button"
            onClick={() => onDelete(current.id)}
            className="absolute right-2 top-2 flex size-10 items-center justify-center rounded-full bg-danger text-danger-foreground shadow-sm transition-transform active:scale-95"
            aria-label="Borrar foto"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>

      {multiple && (
        <div className="mt-2.5 flex justify-center gap-1.5">
          {photos.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setIndex(i)}
              className={cn(
                "size-2.5 rounded-full border border-line/80 transition-colors",
                i === clampedIndex ? "bg-foreground" : "bg-transparent"
              )}
              aria-label={`Ir a foto ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
