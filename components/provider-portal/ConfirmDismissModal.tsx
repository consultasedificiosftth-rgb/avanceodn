"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function ConfirmDismissModal({
  open,
  onOpenChange,
  label,
  keepsPhotos,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label: string;
  keepsPhotos?: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Destildar {label}?</DialogTitle>
          <DialogDescription>
            Se perderá el estado de avance de este ítem.
            {keepsPhotos ? " Las fotos ya subidas no se van a borrar." : ""}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            Destildar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
