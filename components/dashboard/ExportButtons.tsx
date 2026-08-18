import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ExportButtons({
  scope,
  pdId,
  napId,
}: {
  scope: "global" | "pd" | "nap";
  pdId?: string;
  napId?: string;
}) {
  if (scope === "global") {
    return (
      <Button asChild variant="outline" size="sm">
        <a href="/api/export/global">
          <Download className="mr-1 h-3.5 w-3.5" /> Exportar todo
        </a>
      </Button>
    );
  }

  if (scope === "pd" && pdId) {
    return (
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <a href={`/api/pds/${pdId}/export`}>
            <Download className="mr-1 h-3.5 w-3.5" /> Exportar PD
          </a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href={`/api/pds/${pdId}/export-pr-optica`}>
            <Download className="mr-1 h-3.5 w-3.5" /> Solo pruebas ópticas
          </a>
        </Button>
      </div>
    );
  }

  if (scope === "nap" && napId) {
    return (
      <Button asChild variant="outline" size="sm">
        <a href={`/api/naps/${napId}/export`}>
          <Download className="mr-1 h-3.5 w-3.5" /> Exportar NAP
        </a>
      </Button>
    );
  }

  return null;
}
