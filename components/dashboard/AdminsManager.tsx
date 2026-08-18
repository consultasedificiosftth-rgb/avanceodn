"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CreateAdminForm } from "@/components/dashboard/CreateAdminForm";
import { EditAdminDialog } from "@/components/dashboard/EditAdminDialog";
import { toast } from "sonner";

type Region = { id: string; name: string };
type AdminRow = {
  id: string;
  fullName: string | null;
  email: string | null;
  role: "admin" | "superadmin";
  regionId: string | null;
  regionName: string | null;
  forcePasswordChange: boolean;
};

export function AdminsManager({
  admins,
  regions,
  currentAdminId,
}: {
  admins: AdminRow[];
  regions: Region[];
  currentAdminId: string;
}) {
  const router = useRouter();
  const [editingAdmin, setEditingAdmin] = useState<AdminRow | null>(null);
  const [resettingAdmin, setResettingAdmin] = useState<AdminRow | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [resetSubmitting, setResetSubmitting] = useState(false);

  async function handleDelete(id: string) {
    setRemovingId(id);
    try {
      const res = await fetch(`/api/admins/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Error eliminando el admin.");
        return;
      }
      toast.success("Admin eliminado.");
      router.refresh();
    } finally {
      setRemovingId(null);
    }
  }

  async function handleResetPassword() {
    if (!resettingAdmin) return;
    setResetSubmitting(true);
    try {
      const res = await fetch(`/api/admins/${resettingAdmin.id}/reset-password`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Error blanqueando la contraseña.");
        return;
      }
      toast.success(`Contraseña blanqueada a "${data.password}". El admin va a tener que cambiarla al loguearse.`);
      setResettingAdmin(null);
      router.refresh();
    } finally {
      setResetSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto rounded-lg border border-line bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Subregión</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {admins.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium text-foreground">{a.fullName ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{a.email ?? "—"}</TableCell>
                <TableCell>{a.role === "superadmin" ? "Superadmin" : "Admin"}</TableCell>
                <TableCell>{a.regionName ?? "—"}</TableCell>
                <TableCell>
                  {a.forcePasswordChange && (
                    <Badge className="border-transparent bg-pending/15 text-pending">
                      Pendiente de primer login
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setEditingAdmin(a)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setResettingAdmin(a)}>
                      <KeyRound className="h-4 w-4" />
                    </Button>
                    {a.id !== currentAdminId && (
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={removingId === a.id}
                        onClick={() => handleDelete(a.id)}
                      >
                        {removingId === a.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-destructive" />
                        )}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <CreateAdminForm regions={regions} />

      {editingAdmin && (
        <EditAdminDialog
          admin={editingAdmin}
          regions={regions}
          open={editingAdmin !== null}
          onOpenChange={(open) => !open && setEditingAdmin(null)}
        />
      )}

      <Dialog open={resettingAdmin !== null} onOpenChange={(open) => !open && setResettingAdmin(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Blanquear contraseña de {resettingAdmin?.fullName ?? "este admin"}?</DialogTitle>
            <DialogDescription>
              Se le va a fijar una contraseña provisoria y va a tener que cambiarla en su próximo
              login.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResettingAdmin(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" disabled={resetSubmitting} onClick={handleResetPassword}>
              {resetSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Blanquear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
