"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export function PdFilters({
  providers,
  search,
  onSearchChange,
}: {
  providers: { id: string; name: string }[];
  search: string;
  onSearchChange: (value: string) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete(key);
    else params.set(key, value);
    router.push(`/dashboard?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <Input
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Buscar PD…"
        className="w-full sm:w-48"
      />

      <Select
        defaultValue={searchParams.get("provider") ?? "all"}
        onValueChange={(v) => setParam("provider", v)}
      >
        <SelectTrigger className="w-full sm:w-48">
          <SelectValue placeholder="Proveedor" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los proveedores</SelectItem>
          {providers.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        defaultValue={searchParams.get("status") ?? "all"}
        onValueChange={(v) => setParam("status", v)}
      >
        <SelectTrigger className="w-full sm:w-48">
          <SelectValue placeholder="Estado de avance" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los estados</SelectItem>
          <SelectItem value="not-started">Sin avance (0%)</SelectItem>
          <SelectItem value="in-progress">En progreso</SelectItem>
          <SelectItem value="complete">Completo (100%)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
