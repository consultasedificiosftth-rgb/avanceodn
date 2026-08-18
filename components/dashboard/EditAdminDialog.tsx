"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type Region = { id: string; name: string };
type AdminRow = {
  id: string;
  fullName: string | null;
  role: "admin" | "superadmin";
  regionId: string | null;
};

export function EditAdminDialog({
  admin,
  regions,
  open,
  onOpenChange,
}: {
  admin: AdminRow;
  regions: Region[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [role, setRole] = useState<"admin" | "superadmin">(admin.role);
  const [regionId, setRegionId] = useState(admin.regionId ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function handleSave() {
    if (role === "admin" && !regionId) {
      toast.error("Seleccioná una región para el admin.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admins/${admin.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, regionId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Error actualizando el admin.");
        return;
      }
      toast.success("Admin actualizado.");
      onOpenChange(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setRole(admin.role);
          setRegionId(admin.regionId ?? "");
        }
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar {admin.fullName ?? "admin"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Rol</Label>
            <Select value={role} onValueChange={(v) => setRole(v as "admin" | "superadmin")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin regional</SelectItem>
                <SelectItem value="superadmin">Superadmin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {role === "admin" && (
            <div className="space-y-2">
              <Label>Región</Label>
              <Select value={regionId} onValueChange={setRegionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná una región" />
                </SelectTrigger>
                <SelectContent>
                  {regions.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {role === "superadmin" && (
            <p className="text-xs text-muted-foreground">
              Un superadmin ve todas las regiones; no aplica asignar una subregión.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
