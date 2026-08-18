export type NapDiff = {
  addedCodes: string[];
  missingCodes: string[];
  unchangedCodes: string[];
};

/**
 * Compara los códigos de NAP activos existentes contra los códigos que
 * vienen en una nueva carga de Excel para la misma PD.
 */
export function diffNapCodes(existingActiveCodes: string[], newCodes: string[]): NapDiff {
  const existingSet = new Set(existingActiveCodes.map((c) => c.toUpperCase()));
  const newSet = new Set(newCodes.map((c) => c.toUpperCase()));

  const addedCodes = Array.from(newSet).filter((code) => !existingSet.has(code)).sort();
  const missingCodes = Array.from(existingSet).filter((code) => !newSet.has(code)).sort();
  const unchangedCodes = Array.from(newSet).filter((code) => existingSet.has(code)).sort();

  return { addedCodes, missingCodes, unchangedCodes };
}
