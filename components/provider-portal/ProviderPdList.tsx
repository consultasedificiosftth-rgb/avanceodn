"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Loader2, TriangleAlert } from "lucide-react";
import { ProgressRing } from "@/components/ui/progress-ring";

type PdSummary = {
  id: string;
  code: string;
  regionName: string;
  total: number;
  construidos: number;
  pctOdn: number;
};

export function ProviderPdList({ providerToken }: { providerToken: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [providerName, setProviderName] = useState("");
  const [pds, setPds] = useState<PdSummary[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/public/${providerToken}/pds`);
      const data = await res.json();
      if (cancelled) return;
      if (!res.ok) {
        setError(data.error ?? "Link inválido o vencido.");
        setLoading(false);
        return;
      }
      setProviderName(data.provider.name);
      setPds(data.pds);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [providerToken]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="flex max-w-xs flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-danger/15 text-danger">
            <TriangleAlert className="size-6" />
          </div>
          <p className="text-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="sticky top-0 z-10 border-b border-line bg-background/95 px-4 py-4 backdrop-blur">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-lg font-semibold text-foreground">{providerName}</h1>
          <p className="text-sm text-muted-foreground">
            {pds.length} PD{pds.length === 1 ? "" : "s"} asignada{pds.length === 1 ? "" : "s"}
          </p>
        </div>
      </header>

      <main className="mx-auto mt-4 max-w-2xl space-y-2.5 px-4">
        {pds.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Todavía no tenés ninguna PD asignada.
          </p>
        ) : (
          pds.map((pd) => (
            <Link
              key={pd.id}
              href={`/p/${providerToken}/${pd.id}`}
              className="flex items-center gap-4 rounded-xl border border-line bg-card p-4 transition-colors active:bg-surface-raised"
            >
              <ProgressRing value={pd.pctOdn} size={56} />
              <div className="min-w-0 flex-1">
                <p className="font-mono text-lg font-semibold text-foreground">{pd.code}</p>
                <p className="text-sm text-muted-foreground">{pd.regionName}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  <span className="text-foreground">{pd.construidos}</span>/{pd.total} construidos
                </p>
              </div>
              <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
            </Link>
          ))
        )}
      </main>
    </div>
  );
}
