"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Trash2, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";

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
      <div className="flex h-32 w-full items-center justify-center rounded-md border border-dashed bg-muted/30 text-muted-foreground">
        <ImageOff className="mr-2 h-4 w-4" />
        <span className="text-xs">Sin fotos</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative flex h-40 w-full items-center justify-center overflow-hidden rounded-md border bg-black/5">
        {current?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current.url}
            alt="Foto NAP"
            className="h-full w-full object-contain"
          />
        ) : (
          <span className="text-xs text-muted-foreground">No se pudo cargar</span>
        )}

        {multiple && (
          <>
            <button
              type="button"
              onClick={() => setIndex((i) => (i - 1 + photos.length) % photos.length)}
              className="absolute left-1 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-1 shadow hover:bg-background"
              aria-label="Foto anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setIndex((i) => (i + 1) % photos.length)}
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-1 shadow hover:bg-background"
              aria-label="Foto siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}

        {!readOnly && onDelete && current && (
          <Button
            type="button"
            size="icon"
            variant="destructive"
            className="absolute right-1 top-1 h-7 w-7"
            onClick={() => onDelete(current.id)}
            aria-label="Borrar foto"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {multiple && (
        <div className="mt-2 flex justify-center gap-1">
          {photos.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setIndex(i)}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                i === clampedIndex ? "bg-foreground" : "bg-muted-foreground/30"
              }`}
              aria-label={`Ir a foto ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
