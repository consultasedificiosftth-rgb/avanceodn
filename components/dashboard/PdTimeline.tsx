import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PdDailySnapshot } from "@/lib/types";

export function PdTimeline({ snapshots }: { snapshots: PdDailySnapshot[] }) {
  if (snapshots.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay historial para esta PD.</p>;
  }

  const sorted = [...snapshots].sort(
    (a, b) => new Date(b.snapshot_date).getTime() - new Date(a.snapshot_date).getTime()
  );

  return (
    <div className="max-h-96 overflow-y-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>% ODN</TableHead>
            <TableHead>Construidos</TableHead>
            <TableHead>Pruebas ópticas</TableHead>
            <TableHead>Delta vs. día anterior</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((snap, i) => {
            const prev = sorted[i + 1];
            const delta = prev ? snap.construidos - prev.construidos : snap.construidos;
            const noChange = prev !== undefined && delta === 0;
            return (
              <TableRow key={snap.id} className={noChange ? "opacity-50" : undefined}>
                <TableCell>{snap.snapshot_date}</TableCell>
                <TableCell>{snap.pct_odn}%</TableCell>
                <TableCell>{snap.construidos}</TableCell>
                <TableCell>{snap.pruebas_opticas}</TableCell>
                <TableCell>
                  {noChange ? (
                    <span className="text-muted-foreground">Sin cambios</span>
                  ) : (
                    <span className={delta >= 0 ? "text-emerald-600" : "text-red-600"}>
                      {delta >= 0 ? "+" : ""}
                      {delta} construidos
                    </span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
