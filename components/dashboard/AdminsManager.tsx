"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

type Region = { id: string; name: string };
type AdminRow = {
  id: string;
  fullName: string | null;
  role: "admin" | "superadmin";
  regionId: string | null;
  regionName: string | null;
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"admin" | "superadmin">("admin");
  const [regionId, setRegionId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Email y contraseña son obligatorios.");
      return;
    }
    if (role === "admin" && !regionId) {
      toast.error("Seleccioná una región para el admin.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, fullName, role, regionId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Error creando el admin.");
        return;
      }
      toast.success("Admin creado.");
      setEmail("");
      setPassword("");
      setFullName("");
      setRole("admin");
      setRegionId("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

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

  return (
    <div className="space-y-6">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Región</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {admins.map((a) => (
            <TableRow key={a.id}>
              <TableCell>{a.fullName ?? "—"}</TableCell>
              <TableCell>{a.role === "superadmin" ? "Superadmin" : "Admin"}</TableCell>
              <TableCell>{a.regionName ?? "—"}</TableCell>
              <TableCell className="text-right">
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
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <form onSubmit={handleCreate} className="space-y-4 rounded-md border p-4">
        <h3 className="text-sm font-medium">Nuevo admin</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="admin-name">Nombre</Label>
            <Input id="admin-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-email">Email</Label>
            <Input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-password">Contraseña</Label>
            <Input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
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
        </div>
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Crear admin
        </Button>
      </form>
    </div>
  );
}
