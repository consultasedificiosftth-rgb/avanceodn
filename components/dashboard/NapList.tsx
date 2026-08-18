"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PhotoCarousel } from "@/components/provider-portal/PhotoCarousel";
import { ExportButtons } from "@/components/dashboard/ExportButtons";
import { toast } from "sonner";

export type NapListItem = {
  id: string;
  code: string;
  construido: boolean;
  pruebas_opticas: boolean;
  photos: { construido: { id: string; url: string | null }[]; pr_optica: { id: string; url: string | null }[] };
};

export function NapList({ naps, canRemove }: { naps: NapListItem[]; canRemove: boolean }) {
  const router = useRouter();
  const [toRemove, setToRemove] = useState<NapListItem | null>(null);
  const [removing, setRemoving] = useState(false);

  async function confirmRemove() {
    if (!toRemove) return;
    setRemoving(true);
    try {
      const res = await fetch(`/api/naps/${toRemove.id}/remove`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo eliminar el NAP.");
        return;
      }
      toast.success(`NAP ${toRemove.code} eliminado.`);
      setToRemove(null);
      router.refresh();
    } finally {
      setRemoving(false);
    }
  }

  if (naps.length === 0) {
    return <p className="text-sm text-muted-foreground">Esta PD no tiene NAPs activos.</p>;
  }

  return (
    <div className="space-y-3">
      {naps.map((nap) => (
        <Card key={nap.id}>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <CardTitle className="text-base">{nap.code}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={nap.construido ? "default" : "secondary"}>
                {nap.construido ? "Construido" : "Sin construir"}
              </Badge>
              <Badge variant={nap.pruebas_opticas ? "default" : "secondary"}>
                {nap.pruebas_opticas ? "Con pruebas ópticas" : "Sin pruebas ópticas"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Construido</p>
                <PhotoCarousel photos={nap.photos.construido} readOnly />
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Pruebas ópticas</p>
                <PhotoCarousel photos={nap.photos.pr_optica} readOnly />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <ExportButtons scope="nap" napId={nap.id} />
              {canRemove && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setToRemove(nap)}
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" /> Eliminar NAP
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      <Dialog open={toRemove !== null} onOpenChange={(open) => !open && setToRemove(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar NAP {toRemove?.code}?</DialogTitle>
            <DialogDescription>
              Esta acción da de baja el NAP (no se puede deshacer desde el portal). Si tiene avance
              cargado, quedará registrado en la auditoría.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToRemove(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" disabled={removing} onClick={confirmRemove}>
              {removing && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
