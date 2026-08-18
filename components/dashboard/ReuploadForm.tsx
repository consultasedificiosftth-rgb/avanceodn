"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function ReuploadForm({ pdId }: { pdId: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setSubmitting(true);
    try {
      const res = await fetch(`/api/pds/${pdId}/upload`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Error recargando el archivo.");
        return;
      }
      toast.success(
        `Carga aplicada: ${data.addedCodes.length} NAPs agregados${
          data.missingCodes.length ? `, ${data.missingCodes.length} faltantes a revisar` : ""
        }.`
      );
      setFile(null);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      <Input
        type="file"
        accept=".xlsx,.xls"
        className="w-64"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <Button type="submit" variant="outline" size="sm" disabled={!file || submitting}>
        {submitting ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-1 h-3.5 w-3.5" />}
        Re-cargar Excel
      </Button>
    </form>
  );
}
