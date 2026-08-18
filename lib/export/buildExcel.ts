import "server-only";
import ExcelJS from "exceljs";
import type { ExportNapRow } from "@/lib/export/collectData";

export async function buildExcelBuffer(rows: ExportNapRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("NAPs");

  sheet.columns = [
    { header: "Región", key: "region", width: 14 },
    { header: "Proveedor", key: "provider", width: 22 },
    { header: "PD", key: "pd", width: 10 },
    { header: "Código NAP", key: "nap", width: 16 },
    { header: "Construido", key: "construido", width: 12 },
    { header: "Fecha Construido", key: "construidoAt", width: 20 },
    { header: "Pruebas ópticas", key: "pruebas", width: 15 },
    { header: "Fecha Pruebas ópticas", key: "pruebasAt", width: 22 },
    { header: "% ODN de la PD", key: "pct", width: 15 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const row of rows) {
    sheet.addRow({
      region: row.regionName,
      provider: row.providerName,
      pd: row.pdCode,
      nap: row.napCode,
      construido: row.construido ? "Sí" : "No",
      construidoAt: row.construidoAt ? new Date(row.construidoAt).toLocaleString("es-AR") : "",
      pruebas: row.pruebasOpticas ? "Sí" : "No",
      pruebasAt: row.pruebasOpticasAt ? new Date(row.pruebasOpticasAt).toLocaleString("es-AR") : "",
      pct: `${row.pctOdnOfPd}%`,
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
