import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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
        <TableRow>
          <TableHead>Código</TableHead>
          <TableHead>Proveedor</TableHead>
          <TableHead>% ODN</TableHead>
          <TableHead>Construidos</TableHead>
          <TableHead>Pruebas ópticas</TableHead>
          <TableHead>Última actualización</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id} className="cursor-pointer">
            <TableCell className="font-medium">
              <Link href={`/dashboard/pds/${row.id}`} className="hover:underline">
                {row.code}
              </Link>
            </TableCell>
            <TableCell>{row.providerName ?? "—"}</TableCell>
            <TableCell>
              <Badge variant={row.pctOdn >= 100 ? "default" : "secondary"}>{row.pctOdn}%</Badge>
            </TableCell>
            <TableCell>
              {row.construidos}/{row.total}
            </TableCell>
            <TableCell>
              {row.pruebasOpticas}/{row.total}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {row.lastUpdate ?? "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
