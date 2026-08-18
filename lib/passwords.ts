import "server-only";
import { randomInt } from "crypto";

const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
const TEMP_PASSWORD_LENGTH = 12;

/**
 * Contraseña temporal aleatoria para el alta de administrativos.
 * Se muestra una sola vez al superadmin; el usuario la cambia en su
 * primer login (force_password_change).
 */
export function generateTempPassword(length = TEMP_PASSWORD_LENGTH): string {
  let password = "";
  for (let i = 0; i < length; i++) {
    password += CHARSET[randomInt(CHARSET.length)];
  }
  return password;
}

export const RESET_PASSWORD_VALUE = "12345678";
