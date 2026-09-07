import { useCallback, useState, type DragEvent } from "react";

/**
 * Encapsula el manejo de eventos de drag & drop (con el chequeo de
 * relatedTarget para que el highlight no titile al pasar por hijos) y
 * delega los archivos soltados al mismo callback que procesa la
 * selección tradicional por input.
 */
export function useFileDrop(onFiles: (files: FileList) => void, disabled = false) {
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const onDragOver = useCallback(
    (e: DragEvent) => {
      if (disabled) return;
      e.preventDefault();
    },
    [disabled]
  );

  const onDragEnter = useCallback(
    (e: DragEvent) => {
      if (disabled) return;
      e.preventDefault();
      setIsDraggingOver(true);
    },
    [disabled]
  );

  const onDragLeave = useCallback(
    (e: DragEvent<HTMLElement>) => {
      if (disabled) return;
      if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
      setIsDraggingOver(false);
    },
    [disabled]
  );

  const onDrop = useCallback(
    (e: DragEvent) => {
      if (disabled) return;
      e.preventDefault();
      setIsDraggingOver(false);
      if (e.dataTransfer.files?.length) onFiles(e.dataTransfer.files);
    },
    [disabled, onFiles]
  );

  return { isDraggingOver, dropHandlers: { onDragOver, onDragEnter, onDragLeave, onDrop } };
}
