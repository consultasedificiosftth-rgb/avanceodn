import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProgressRing } from "@/components/ui/progress-ring";

export type PdRow = {
  id: string;
  code: string;
  providerName: string | null;
  total: number;
  construidos: number;
  pruebasOpticas: number;
  pctOdn: number;
  lastUpdate: string | null;
};

export function PdTable({ rows }: { rows: PdRow[] }) {
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
          <TableHead className="w-14">% ODN</TableHead>
          <TableHead>Código</TableHead>
          <TableHead>Proveedor</TableHead>
          <TableHead>Construidos</TableHead>
          <TableHead>Pruebas ópticas</TableHead>
          <TableHead>Última actualización</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id} className="border-line">
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
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
