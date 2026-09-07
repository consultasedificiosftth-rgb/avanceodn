"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProgressRing } from "@/components/ui/progress-ring";
import { DeletePdModal } from "@/components/dashboard/DeletePdModal";
import { GoToProviderSiteButton } from "@/components/dashboard/GoToProviderSiteButton";

export type PdRow = {
  id: string;
  code: string;
  providerName: string | null;
  total: number;
  construidos: number;
  pruebasOpticas: number;
  pctOdn: number;
  lastUpdate: string | null;
  constructedNapCodes: string[];
  providerLinkToken: string | null;
};

export function PdTable({ rows }: { rows: PdRow[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (rows.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No hay PDs para mostrar con los filtros actuales.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-line hover:bg-transparent">
          <TableHead className="w-8" />
          <TableHead className="w-14">% ODN</TableHead>
          <TableHead>Código</TableHead>
          <TableHead>Proveedor</TableHead>
          <TableHead>Construidos</TableHead>
          <TableHead>Pruebas ópticas</TableHead>
          <TableHead>Última actualización</TableHead>
          <TableHead className="w-px" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const expanded = expandedId === row.id;
          return (
            <Fragment key={row.id}>
              <TableRow className="border-line">
                <TableCell>
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-label={expanded ? "Contraer NAPs construidos" : "Ver NAPs construidos"}
                    onClick={() => setExpandedId(expanded ? null : row.id)}
                    className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                  </button>
                </TableCell>
                <TableCell>
                  <Link href={`/dashboard/pds/${row.id}`}>
                    <ProgressRing value={row.pctOdn} size={40} />
                  </Link>
                </TableCell>
                <TableCell className="font-mono font-medium">
                  <Link href={`/dashboard/pds/${row.id}`} className="hover:underline">
                    {row.code}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{row.providerName ?? "—"}</TableCell>
                <TableCell className="font-mono text-sm">
                  {row.construidos}/{row.total}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {row.pruebasOpticas}/{row.total}
                </TableCell>
                <TableCell className="text-muted-foreground">{row.lastUpdate ?? "—"}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <GoToProviderSiteButton pdId={row.id} linkToken={row.providerLinkToken} size="xs" />
                    <DeletePdModal pdId={row.id} pdCode={row.code} size="xs" />
                  </div>
                </TableCell>
              </TableRow>
              {expanded && (
                <TableRow className="border-line hover:bg-transparent">
                  <TableCell colSpan={8} className="whitespace-normal bg-muted/30 py-3">
                    {row.constructedNapCodes.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Todavía no hay NAPs construidos en esta PD.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                        {row.constructedNapCodes.map((code) => (
                          <span key={code} className="font-mono text-sm text-foreground">
                            {code}
                          </span>
                        ))}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}
