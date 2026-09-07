"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export function DeletePdModal({
  pdId,
  pdCode,
  redirectTo,
  size = "sm",
}: {
  pdId: string;
  pdCode: string;
  redirectTo?: string;
  size?: "sm" | "xs" | "default";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typedCode, setTypedCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canConfirm = typedCode.trim() === pdCode;

  function handleOpenChange(next: boolean) {
    if (submitting) return;
    setOpen(next);
    if (!next) setTypedCode("");
  }

  async function confirmDelete() {
    if (!canConfirm) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/pds/${pdId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmCode: typedCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Error borrando la PD.");
        return;
      }
      toast.success(`PD ${pdCode} eliminada.`);
      setOpen(false);
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.refresh();
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size={size}
        className="text-danger hover:bg-danger/10 hover:text-danger"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <Trash2 className="mr-1.5 size-3.5" /> Eliminar PD
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-danger/15 text-danger">
              <AlertTriangle className="size-5" />
            </div>
            <DialogTitle>¿Eliminar la PD {pdCode}?</DialogTitle>
            <DialogDescription>
              Esta acción es <span className="font-medium text-danger">irreversible</span>: borra
              todos los NAPs de esta PD, sus fotos en el storage, y la propia PD. No es como
              destildar o eliminar un NAP suelto — acá no queda nada para recuperar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-code">
              Escribí el código <span className="font-mono">{pdCode}</span> para confirmar
            </Label>
            <Input
              id="confirm-code"
              autoComplete="off"
              value={typedCode}
              onChange={(e) => setTypedCode(e.target.value)}
              className="font-mono"
              placeholder={pdCode}
            />
          </div>

          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button variant="destructive" disabled={!canConfirm || submitting} onClick={confirmDelete}>
              {submitting && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
              Eliminar definitivamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
