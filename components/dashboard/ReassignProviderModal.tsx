"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type Provider = { id: string; name: string };

export function ReassignProviderModal({
  pdId,
  currentProviderId,
  currentProviderName,
  providers,
}: {
  pdId: string;
  currentProviderId: string | null;
  currentProviderName: string;
  providers: Provider[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [providerId, setProviderId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const options = providers.filter((p) => p.id !== currentProviderId);

  function handleOpenChange(next: boolean) {
    if (submitting) return;
    setOpen(next);
    if (!next) setProviderId("");
  }

  async function confirmReassign() {
    if (!providerId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/pds/${pdId}/reassign-provider`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Error reasignando el proveedor.");
        return;
      }
      toast.success(`PD reasignada a ${data.provider.name}.`);
      setOpen(false);
      setProviderId("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Repeat className="mr-1.5 size-3.5" /> Reasignar proveedor
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reasignar proveedor</DialogTitle>
            <DialogDescription>
              Proveedor actual: <span className="font-medium text-foreground">{currentProviderName}</span>.
              Los NAPs, fotos y el historial de avance de esta PD no se modifican — solo cambia a quién
              pertenece y en qué link de proveedor aparece de acá en adelante.
            </DialogDescription>
          </DialogHeader>

          {options.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay otros proveedores activos disponibles para reasignar.
            </p>
          ) : (
            <Select value={providerId} onValueChange={setProviderId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccioná el nuevo proveedor" />
              </SelectTrigger>
              <SelectContent>
                {options.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button disabled={!providerId || submitting} onClick={confirmReassign}>
              {submitting && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
