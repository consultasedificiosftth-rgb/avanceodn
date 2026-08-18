import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PdDailySnapshot } from "@/lib/types";
import { cn } from "@/lib/utils";

const CHART_WIDTH = 640;
const CHART_HEIGHT = 160;
const CHART_PADDING = 8;

function buildPath(values: number[], max: number): string {
  if (values.length === 0) return "";
  const usableWidth = CHART_WIDTH - CHART_PADDING * 2;
  const usableHeight = CHART_HEIGHT - CHART_PADDING * 2;
  const step = values.length > 1 ? usableWidth / (values.length - 1) : 0;

  return values
    .map((v, i) => {
      const x = CHART_PADDING + step * i;
      const y = CHART_PADDING + usableHeight * (1 - (max === 0 ? 0 : v / max));
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function TimelineChart({ chronological }: { chronological: PdDailySnapshot[] }) {
  const max = Math.max(1, ...chronological.map((s) => Math.max(s.construidos, s.pruebas_opticas)));
  const construidosPath = buildPath(chronological.map((s) => s.construidos), max);
  const pruebasPath = buildPath(chronological.map((s) => s.pruebas_opticas), max);
  const gridLines = [0.25, 0.5, 0.75];

  return (
    <div className="rounded-lg border border-line bg-card p-4">
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="h-40 w-full"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {gridLines.map((g) => (
          <line
            key={g}
            x1={0}
            x2={CHART_WIDTH}
            y1={CHART_PADDING + (CHART_HEIGHT - CHART_PADDING * 2) * g}
            y2={CHART_PADDING + (CHART_HEIGHT - CHART_PADDING * 2) * g}
            className="stroke-line"
            strokeWidth={1}
          />
        ))}
        <path d={pruebasPath} fill="none" className="stroke-pending" strokeWidth={2} strokeLinejoin="round" />
        <path d={construidosPath} fill="none" className="stroke-signal" strokeWidth={2.5} strokeLinejoin="round" />
      </svg>
      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-signal" /> Construidos
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-pending" /> Pruebas ópticas
        </span>
      </div>
    </div>
  );
}

export function PdTimeline({ snapshots }: { snapshots: PdDailySnapshot[] }) {
  if (snapshots.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-line bg-card p-6 text-center text-sm text-muted-foreground">
        Todavía no hay historial para esta PD.
      </p>
    );
  }

  const chronological = [...snapshots].sort(
    (a, b) => new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime()
  );
  const sorted = [...chronological].reverse();

  return (
    <div className="space-y-4">
      <TimelineChart chronological={chronological} />

      <div className="max-h-96 overflow-y-auto rounded-lg border border-line">
        <Table>
          <TableHeader>
            <TableRow className="border-line hover:bg-transparent">
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
                <TableRow
                  key={snap.id}
                  className={cn("border-line", noChange && "opacity-50")}
                >
                  <TableCell>{snap.snapshot_date}</TableCell>
                  <TableCell>{snap.pct_odn}%</TableCell>
                  <TableCell className="font-mono text-sm">{snap.construidos}</TableCell>
                  <TableCell className="font-mono text-sm">{snap.pruebas_opticas}</TableCell>
                  <TableCell>
                    {noChange ? (
                      <span className="text-xs text-muted-foreground">Sin cambios</span>
                    ) : (
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 font-mono text-xs font-medium",
                          delta >= 0 ? "bg-signal/15 text-signal" : "bg-danger/15 text-danger"
                        )}
                      >
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
    </div>
  );
}
