"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ExportCategoriesOption } from "@/lib/export/buildZip";

const OPTIONS: { value: ExportCategoriesOption; label: string }[] = [
  { value: "both", label: "Ambas" },
  { value: "construido", label: "Solo construido" },
  { value: "pr_optica", label: "Solo pruebas ópticas" },
];

export function PdExportControl({ pdId }: { pdId: string }) {
  const [categories, setCategories] = useState<ExportCategoriesOption>("both");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={categories} onValueChange={(v) => setCategories(v as ExportCategoriesOption)}>
        <SelectTrigger className="h-7 w-44 text-[0.8rem]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button asChild variant="outline" size="sm">
        <a href={`/api/pds/${pdId}/export?categories=${categories}`}>
          <Download className="mr-1 h-3.5 w-3.5" /> Exportar PD
        </a>
      </Button>
    </div>
  );
}
