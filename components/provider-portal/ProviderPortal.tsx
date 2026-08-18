"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Loader2, TriangleAlert } from "lucide-react";
import { NapCard, type NapWithPhotos } from "@/components/provider-portal/NapCard";
import { ProgressRing } from "@/components/ui/progress-ring";
import { pctOdn } from "@/lib/types";

type Stats = {
  total: number;
  construidos: number;
  pruebasOpticas: number;
  pctOdn: number;
};

export function ProviderPortal({
  providerToken,
  pdId,
}: {
  providerToken: string;
  pdId: string;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdCode, setPdCode] = useState<string>("");
  const [naps, setNaps] = useState<NapWithPhotos[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/public/${providerToken}/pds/${pdId}/naps`);
      const data = await res.json();
      if (cancelled) return;
      if (!res.ok) {
        setError(data.error ?? "Link inválido o vencido.");
        setLoading(false);
        return;
      }
      setPdCode(data.pd.code);
      setNaps(data.naps);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [providerToken, pdId]);

  const stats: Stats = {
    total: naps.length,
    construidos: naps.filter((n) => n.construido).length,
    pruebasOpticas: naps.filter((n) => n.pruebas_opticas).length,
    pctOdn: pctOdn(naps.filter((n) => n.construido).length, naps.length),
  };

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
        <div className="mx-auto max-w-3xl">
          <Link
            href={`/p/${providerToken}`}
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="size-4" /> Volver a mis PDs
          </Link>
          <div className="flex items-center gap-4">
            <ProgressRing value={stats.pctOdn} size={72} />
            <div className="min-w-0">
              <h1 className="font-mono text-2xl font-semibold tracking-tight text-foreground">
                {pdCode}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-sm text-muted-foreground">
                <span>
                  <span className="text-foreground">{stats.construidos}</span>/{stats.total} construidos
                </span>
                <span>
                  <span className="text-foreground">{stats.pruebasOpticas}</span>/{stats.total} pruebas ópticas
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto mt-4 max-w-3xl px-4">
        {naps.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Todavía no hay NAPs cargados en esta PD.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-line bg-card">
            {naps.map((nap) => (
              <NapCard
                key={nap.id}
                providerToken={providerToken}
                pdId={pdId}
                nap={nap}
                onChange={(updated) =>
                  setNaps((prev) => prev.map((n) => (n.id === updated.id ? updated : n)))
                }
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
