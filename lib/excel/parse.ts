import * as XLSX from "xlsx";

const SHEET_NAME = "Lista de registros";
const COL_ACTIVO = "Activo";
const COL_CLASIFICACION = "Clasificación";
const NAP_CLASSIFICATION = "NAP";
const PD_CODE_LENGTH = 4;

export type ParsedNap = {
  code: string;
};

export type ParseExcelSuccess = {
  ok: true;
  pdCode: string;
  naps: ParsedNap[];
  totalRowsInFile: number;
  totalNapRows: number;
  duplicatesSkipped: number;
};

export type ParseExcelFailure = {
  ok: false;
  error: string;
};

export type ParseExcelResult = ParseExcelSuccess | ParseExcelFailure;

function normalizeHeader(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function findColumnIndex(headerRow: unknown[], target: string): number {
  const normalizedTarget = normalizeHeader(target);
  return headerRow.findIndex((cell) => normalizeHeader(cell) === normalizedTarget);
}

export function parseNapExcel(buffer: ArrayBuffer | Buffer): ParseExcelResult {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer" });
  } catch {
    return { ok: false, error: "No se pudo leer el archivo. Verificá que sea un Excel válido (.xlsx)." };
  }

  const sheet = workbook.Sheets[SHEET_NAME];
  if (!sheet) {
    return {
      ok: false,
      error: `El archivo no contiene la hoja "${SHEET_NAME}". Hojas encontradas: ${workbook.SheetNames.join(", ")}.`,
    };
  }

  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    blankrows: false,
    defval: "",
  });

  if (rows.length < 2) {
    return { ok: false, error: "La hoja no tiene filas de datos." };
  }

  const [headerRow, ...dataRows] = rows;
  const activoIdx = findColumnIndex(headerRow, COL_ACTIVO);
  const clasificacionIdx = findColumnIndex(headerRow, COL_CLASIFICACION);

  if (activoIdx === -1 || clasificacionIdx === -1) {
    return {
      ok: false,
      error: `No se encontraron las columnas requeridas ("${COL_ACTIVO}", "${COL_CLASIFICACION}") en la hoja.`,
    };
  }

  const napRows = dataRows.filter((row) => {
    const clasificacion = String(row[clasificacionIdx] ?? "").trim().toUpperCase();
    return clasificacion === NAP_CLASSIFICATION;
  });

  if (napRows.length === 0) {
    return {
      ok: false,
      error: `No se encontraron filas con ${COL_CLASIFICACION} = "${NAP_CLASSIFICATION}" en el archivo.`,
    };
  }

  const codes: string[] = [];
  for (const row of napRows) {
    const raw = String(row[activoIdx] ?? "").trim();
    if (raw) codes.push(raw);
  }

  if (codes.length === 0) {
    return { ok: false, error: `Las filas NAP no tienen valores válidos en la columna "${COL_ACTIVO}".` };
  }

  const prefixes = new Set(codes.map((code) => code.slice(0, PD_CODE_LENGTH).toUpperCase()));
  if (prefixes.size > 1) {
    return {
      ok: false,
      error: `El archivo contiene NAPs de más de una PD (prefijos: ${Array.from(prefixes).sort().join(", ")}). Revisá el archivo y volvé a subirlo con un solo prefijo.`,
    };
  }

  const pdCode = Array.from(prefixes)[0];
  if (pdCode.length !== PD_CODE_LENGTH) {
    return { ok: false, error: `El código de PD inferido ("${pdCode}") no tiene ${PD_CODE_LENGTH} caracteres.` };
  }

  const seen = new Set<string>();
  const naps: ParsedNap[] = [];
  let duplicatesSkipped = 0;
  for (const code of codes) {
    const upper = code.toUpperCase();
    if (seen.has(upper)) {
      duplicatesSkipped += 1;
      continue;
    }
    seen.add(upper);
    naps.push({ code: upper });
  }

  return {
    ok: true,
    pdCode,
    naps,
    totalRowsInFile: dataRows.length,
    totalNapRows: napRows.length,
    duplicatesSkipped,
  };
}
