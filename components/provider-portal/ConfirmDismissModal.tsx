"use client";

import { AlertTriangle } from "lucide-react";
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
          <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-pending/15 text-pending">
            <AlertTriangle className="size-5" />
          </div>
          <DialogTitle>¿Destildar {label}?</DialogTitle>
          <DialogDescription>
            Se va a perder el estado de avance de este ítem.
            {keepsPhotos ? " Las fotos ya subidas no se van a borrar." : ""}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
          <Button
            variant="ghost"
            className="text-danger hover:bg-danger/10 hover:text-danger"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            Sí, destildar
          </Button>
          <Button onClick={() => onOpenChange(false)}>Cancelar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
