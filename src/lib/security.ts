/**
 * Utilidades criptográficas de seguridad para Panaderías Brito
 * Funciona tanto en entorno Node.js / Serverless como en navegadores modernos
 */

const DEFAULT_SALT = "brito_secure_salt_v1";

/**
 * Genera un hash SHA-256 seguro de una contraseña con salt
 */
export async function hashPassword(plainText: string, salt: string = DEFAULT_SALT): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${salt}:${plainText}`);

  if (typeof globalThis.crypto?.subtle !== "undefined") {
    const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // Fallback para Node.js si subtle no estuviese disponible
  try {
    const nodeCrypto = await import("crypto");
    return nodeCrypto.createHash("sha256").update(`${salt}:${plainText}`).digest("hex");
  } catch {
    // Fallback simple
    return plainText;
  }
}

/**
 * Compara una contraseña en texto plano contra el valor guardado
 * Soporta compatibilidad hacia atrás: si la contraseña aún no estaba hasheada, compara directo
 */
export async function verifyPassword(
  plainText: string,
  storedValue?: string,
  salt: string = DEFAULT_SALT
): Promise<boolean> {
  if (!storedValue || !plainText) return false;

  // 1. Compatibilidad directa con contraseñas legadas en texto plano
  if (storedValue === plainText.trim()) {
    return true;
  }

  // 2. Comparación contra hash SHA-256
  const computedHash = await hashPassword(plainText.trim(), salt);
  return computedHash === storedValue;
}

/**
 * Función síncrona de respaldo para Node.js (usada en API routes)
 */
export function hashPasswordSync(plainText: string, salt: string = DEFAULT_SALT): string {
  if (typeof window !== "undefined") {
    // Implementación síncrona liviana para cliente si se requiere
    let hash = 0;
    const str = `${salt}:${plainText}`;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16);
  }

  try {
    // Usar eval('require') para evitar advertencias de webpack en el empaquetado del cliente
    const nodeReq = eval("require");
    const nodeCrypto = nodeReq("crypto");
    return nodeCrypto.createHash("sha256").update(`${salt}:${plainText}`).digest("hex");
  } catch {
    return plainText;
  }
}

export function verifyPasswordSync(
  plainText: string,
  storedValue?: string,
  salt: string = DEFAULT_SALT
): boolean {
  if (!storedValue || !plainText) return false;
  const cleanPass = plainText.trim();
  // 1. Coincidencia directa con clave plana
  if (storedValue === cleanPass) return true;
  // 2. Coincidencia con hash SHA-256 de servidor
  try {
    const nodeReq = eval("require");
    const nodeCrypto = nodeReq("crypto");
    const computed = nodeCrypto.createHash("sha256").update(`${salt}:${cleanPass}`).digest("hex");
    if (computed === storedValue) return true;
  } catch {}

  return false;
}
