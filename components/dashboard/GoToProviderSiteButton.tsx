import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export function GoToProviderSiteButton({
  pdId,
  linkToken,
  size = "sm",
}: {
  pdId: string;
  linkToken: string | null;
  size?: "xs" | "sm" | "default";
}) {
  if (!linkToken) {
    return (
      <Button type="button" variant="outline" size={size} disabled title="Asigná un proveedor primero">
        <ExternalLink className="mr-1.5 size-3.5" /> Ir al sitio
      </Button>
    );
  }

  return (
    <Button type="button" variant="outline" size={size} asChild>
      <a href={`/p/${linkToken}/${pdId}`} target="_blank" rel="noopener noreferrer">
        <ExternalLink className="mr-1.5 size-3.5" /> Ir al sitio
      </a>
    </Button>
  );
}
