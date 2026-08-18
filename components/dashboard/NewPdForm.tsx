"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2 } from "lucide-react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";

type Region = { id: string; name: string };
type Provider = { id: string; name: string };

type UploadResult = {
  pd: { id: string; code: string; provider_id: string | null };
  provider: { id: string; name: string; link_token: string } | null;
  created: boolean;
  addedCodes: string[];
  missingCodes: string[];
  status: "applied" | "pending_review";
};

export function NewPdForm({
  regions,
  providers,
  isSuperadmin,
  defaultRegionId,
}: {
  regions: Region[];
  providers: Provider[];
  isSuperadmin: boolean;
  defaultRegionId: string | null;
}) {
  const router = useRouter();
  const [regionId, setRegionId] = useState(defaultRegionId ?? "");
  const [providerId, setProviderId] = useState("");
  const [newProviderName, setNewProviderName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [copied, setCopied] = useState(false);

  const usingNewProvider = providerId === "__new__";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError("Subí el archivo Excel.");
      return;
    }
    if (!regionId) {
      setError("Seleccioná la región.");
      return;
    }
    if (!providerId) {
      setError("Seleccioná o creá un proveedor.");
      return;
    }
    if (usingNewProvider && !newProviderName.trim()) {
      setError("Ingresá el nombre del nuevo proveedor.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("regionId", regionId);
    if (usingNewProvider) {
      formData.append("newProviderName", newProviderName.trim());
    } else {
      formData.append("providerId", providerId);
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/pds", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error subiendo el archivo.");
        return;
      }
      setResult(data);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  function providerLink(token: string) {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/p/${token}`;
  }

  async function copyLink() {
    if (!result?.provider) return;
    await navigator.clipboard.writeText(providerLink(result.provider.link_token));
    setCopied(true);
    toast.success("Link copiado");
    setTimeout(() => setCopied(false), 2000);
  }

  if (result) {
    return (
      <div className="space-y-4">
        <Alert className="border-line">
          <AlertTitle>
            PD <span className="font-mono">{result.pd.code}</span>{" "}
            {result.created ? "creada" : "actualizada"}
          </AlertTitle>
          <AlertDescription>
            {result.created
              ? `Se cargaron ${result.addedCodes.length} NAPs.`
              : `Se agregaron ${result.addedCodes.length} NAPs nuevos.`}
            {result.status === "pending_review" && (
              <p className="mt-1 text-pending">
                Hay {result.missingCodes.length} NAPs que ya no aparecen en el archivo. Revisalos
                en el detalle de la PD.
              </p>
            )}
          </AlertDescription>
        </Alert>

        {result.provider && (
          <div className="space-y-2">
            <Label>
              Esta PD ya está disponible en el link de <span className="font-medium">{result.provider.name}</span>
            </Label>
            <div className="flex gap-2">
              <Input readOnly value={providerLink(result.provider.link_token)} className="font-mono text-sm" />
              <Button type="button" variant="outline" onClick={copyLink}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => router.push(`/dashboard/pds/${result.pd.id}`)}>Ver PD</Button>
          {result.provider && (
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/links?provider=${result.provider!.id}`)}
            >
              Ver en Links de proveedores
            </Button>
          )}
          <Button variant="outline" onClick={() => setResult(null)}>
            Cargar otra
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Región</Label>
        <Select value={regionId} onValueChange={setRegionId} disabled={!isSuperadmin && !!defaultRegionId}>
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

      <div className="space-y-2">
        <Label>Proveedor</Label>
        <Select value={providerId} onValueChange={setProviderId}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccioná un proveedor" />
          </SelectTrigger>
          <SelectContent>
            {providers.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
            <SelectItem value="__new__">+ Crear proveedor nuevo</SelectItem>
          </SelectContent>
        </Select>
        {usingNewProvider && (
          <Input
            placeholder="Nombre del proveedor"
            value={newProviderName}
            onChange={(e) => setNewProviderName(e.target.value)}
          />
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="file">Archivo Excel</Label>
        <Input
          id="file"
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={submitting}>
        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Subir y crear PD
      </Button>
    </form>
  );
}
