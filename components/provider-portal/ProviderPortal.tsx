"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { NapCard, type NapWithPhotos } from "@/components/provider-portal/NapCard";
import { pctOdn } from "@/lib/types";

type Stats = {
  total: number;
  construidos: number;
  pruebasOpticas: number;
  pctOdn: number;
};

export function ProviderPortal({ token }: { token: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdCode, setPdCode] = useState<string>("");
  const [naps, setNaps] = useState<NapWithPhotos[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/public/${token}/naps`);
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
  }, [token]);

  const stats: Stats = {
    total: naps.length,
    construidos: naps.filter((n) => n.construido).length,
    pruebasOpticas: naps.filter((n) => n.pruebas_opticas).length,
    pctOdn: pctOdn(naps.filter((n) => n.construido).length, naps.length),
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <p className="text-center text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 pb-10">
      <header className="sticky top-0 z-10 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-lg font-semibold">PD {pdCode}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{stats.pctOdn}% ODN</span>
            <span>
              {stats.construidos} construidos de {stats.total}
            </span>
            <span>
              {stats.pruebasOpticas} con pruebas ópticas de {stats.total}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto mt-4 max-w-3xl space-y-3 px-4">
        {naps.map((nap) => (
          <NapCard
            key={nap.id}
            token={token}
            nap={nap}
            onChange={(updated) =>
              setNaps((prev) => prev.map((n) => (n.id === updated.id ? updated : n)))
            }
          />
        ))}
      </main>
    </div>
  );
}
