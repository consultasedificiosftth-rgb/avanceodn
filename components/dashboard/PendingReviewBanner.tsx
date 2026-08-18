"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function PendingReviewBanner({
  pdId,
  uploadId,
  missingCodes,
}: {
  pdId: string;
  uploadId: string;
  missingCodes: string[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"confirm" | "dismiss" | null>(null);

  async function resolve(action: "confirm_missing" | "dismiss") {
    setBusy(action === "confirm_missing" ? "confirm" : "dismiss");
    try {
      const res = await fetch(`/api/pds/${pdId}/uploads/${uploadId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Error resolviendo la alerta.");
        return;
      }
      if (!data.resolved) {
        toast.warning(
          `No se pudieron dar de baja ${data.failed.length} NAPs (ya tienen avance cargado, requiere superadmin).`
        );
      } else {
        toast.success("Alerta resuelta.");
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Hay {missingCodes.length} NAPs que faltan en la última carga</AlertTitle>
      <AlertDescription>
        <p className="mb-2 break-words">{missingCodes.join(", ")}</p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="destructive"
            disabled={busy !== null}
            onClick={() => resolve("confirm_missing")}
          >
            {busy === "confirm" && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
            Confirmar baja
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy !== null}
            onClick={() => resolve("dismiss")}
          >
            {busy === "dismiss" && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
            Descartar alerta
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
