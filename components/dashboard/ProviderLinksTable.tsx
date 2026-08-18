"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type ProviderLinkRow = {
  id: string;
  name: string;
  linkToken: string;
  pds: { id: string; code: string }[];
};

function providerLink(token: string): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/p/${token}`;
}

export function ProviderLinksTable({
  rows,
  highlightProviderId,
}: {
  rows: ProviderLinkRow[];
  highlightProviderId: string | null;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(highlightProviderId);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const highlightRef = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    if (highlightProviderId) {
      highlightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightProviderId]);

  async function copyLink(row: ProviderLinkRow) {
    await navigator.clipboard.writeText(providerLink(row.linkToken));
    setCopiedId(row.id);
    toast.success("Link copiado");
    setTimeout(() => setCopiedId(null), 2000);
  }

  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-line bg-card p-6 text-center text-sm text-muted-foreground">
        Todavía no hay proveedores con PDs asignadas.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-card">
      <Table>
        <TableHeader>
          <TableRow className="border-line hover:bg-transparent">
            <TableHead>Proveedor</TableHead>
            <TableHead>PDs asignadas</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const expanded = expandedId === row.id;
            const isHighlighted = highlightProviderId === row.id;
            return (
              <Fragment key={row.id}>
                <TableRow
                  ref={isHighlighted ? highlightRef : undefined}
                  className={cn("border-line", isHighlighted && "bg-signal/10")}
                >
                  <TableCell className="font-medium text-foreground">{row.name}</TableCell>
                  <TableCell className="font-mono text-sm">{row.pds.length}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => copyLink(row)}>
                        {copiedId === row.id ? (
                          <Check className="mr-1 size-3.5" />
                        ) : (
                          <Copy className="mr-1 size-3.5" />
                        )}
                        Copiar link
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedId(expanded ? null : row.id)}
                      >
                        Ver PDs asignadas
                        <ChevronDown
                          className={cn("ml-1 size-3.5 transition-transform", expanded && "rotate-180")}
                        />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                {expanded && (
                  <TableRow key={`${row.id}-expanded`} className="border-line hover:bg-transparent">
                    <TableCell colSpan={3} className="bg-surface">
                      <div className="flex flex-wrap gap-2 py-1">
                        {row.pds.map((pd) => (
                          <Link
                            key={pd.id}
                            href={`/dashboard/pds/${pd.id}`}
                            className="rounded-full border border-line bg-card px-3 py-1 font-mono text-xs text-foreground transition-colors hover:border-signal hover:text-signal"
                          >
                            {pd.code}
                          </Link>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
