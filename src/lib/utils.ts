import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string | undefined | null): string {
  const num = typeof amount === "number" && !isNaN(amount) ? amount : (Number(amount) || 0);
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(num);
}

/**
 * Bloquea cualquier tecla que no sea número en el teclado físico o virtual
 */
export function onlyNumbersKeyDown(
  e: React.KeyboardEvent<HTMLInputElement>,
  allowDecimal: boolean = false
) {
  // Prevenir expresamente las teclas de notación científica y signos (+, -, e, E)
  if (["e", "E", "+", "-"].includes(e.key)) {
    e.preventDefault();
    return;
  }
  if (
    [
      "Backspace",
      "Delete",
      "Tab",
      "Escape",
      "Enter",
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Home",
      "End",
    ].includes(e.key)
  ) {
    return;
  }
  if (e.ctrlKey || e.metaKey) {
    return; // Permitir atajos Ctrl+C, Ctrl+V, Ctrl+A
  }
  if (allowDecimal && e.key === "." && !e.currentTarget.value.includes(".")) {
    return;
  }
  if (!/^[0-9]$/.test(e.key)) {
    e.preventDefault();
  }
}

/**
 * Sanitiza el texto para permitir exclusivamente números enteros
 */
export function cleanOnlyNumbers(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Sanitiza el texto para permitir exclusivamente números y un punto decimal
 */
export function cleanDecimalNumbers(value: string): string {
  const parts = value.replace(/[^0-9.]/g, "").split(".");
  if (parts.length > 2) {
    return parts[0] + "." + parts.slice(1).join("");
  }
  return parts.join(".");
}

/**
 * Emite un sonido tipo pitido (beep) de confirmación o error para escáneres de código de barras
 */
export function playScanBeep(success: boolean = true) {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (success) {
      // Pitido positivo nítido de terminal punto de venta (1400Hz a 1800Hz)
      osc.type = "sine";
      osc.frequency.setValueAtTime(1400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1800, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);
    } else {
      // Zumbido grave de alerta para código no registrado (320Hz)
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch (e) {
    // Ignorar si el navegador bloquea audio antes de interacción
  }
}
/**
 * Formatea fecha y hora de forma 100% segura y compatible con todos los navegadores y WebViews,
 * evitando cualquier error por 'dateStyle' o 'timeStyle' de Intl.
 */
export function formatDateTimeSafe(inputDate?: Date | string | number): string {
  const d = inputDate ? (inputDate instanceof Date ? inputDate : new Date(inputDate)) : new Date();
  if (isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "p. m." : "a. m.";
  hours = hours % 12 || 12;
  const hoursStr = String(hours).padStart(2, "0");
  return `${day}/${month}/${year}, ${hoursStr}:${minutes} ${ampm}`;
}

/**
 * Parsea fechas en cualquier formato (ISO, timestamp numérico, formato DD/MM/YYYY hh:mm a. m., "Hoy, hh:mm AM", etc.)
 * y devuelve el valor numérico en milisegundos (timestamp) para ordenamiento cronológico preciso.
 */
export function parseDateTimeSafe(input?: Date | string | number | null): number {
  if (input === null || input === undefined || input === "") return 0;
  if (input instanceof Date) return isNaN(input.getTime()) ? 0 : input.getTime();
  if (typeof input === "number") return isNaN(input) ? 0 : input;

  const str = String(input).trim();
  if (!str) return 0;

  // 1. Número puro en string (ej. "1727195160000")
  if (/^\d{10,13}$/.test(str)) {
    const num = Number(str);
    if (!isNaN(num)) return num;
  }

  // 2. Si empieza con "Hoy" o "Ayer"
  const relMatch = str.match(/^(hoy|ayer),?\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(a\.?\s*m\.?|p\.?\s*m\.?|am|pm)?/i);
  if (relMatch) {
    const [, relWord, hoursStr, minStr, secStr, ampm] = relMatch;
    const d = new Date();
    if (relWord.toLowerCase() === "ayer") {
      d.setDate(d.getDate() - 1);
    }
    let hours = parseInt(hoursStr, 10);
    if (ampm) {
      const isPm = ampm.toLowerCase().includes("p");
      if (isPm && hours < 12) hours += 12;
      if (!isPm && hours === 12) hours = 0;
    }
    d.setHours(hours, parseInt(minStr, 10), secStr ? parseInt(secStr, 10) : 0, 0);
    return d.getTime();
  }

  // 3. Formato DD/MM/YYYY o DD-MM-YYYY con hora (generado por formatDateTimeSafe)
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4}),?\s*(?:at\s*)?(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(a\.?\s*m\.?|p\.?\s*m\.?|am|pm)?/i);
  if (dmyMatch) {
    const [, day, month, year, hoursStr, minStr, secStr, ampm] = dmyMatch;
    let hours = parseInt(hoursStr, 10);
    if (ampm) {
      const isPm = ampm.toLowerCase().includes("p");
      if (isPm && hours < 12) hours += 12;
      if (!isPm && hours === 12) hours = 0;
    }
    const d = new Date(
      parseInt(year, 10),
      parseInt(month, 10) - 1,
      parseInt(day, 10),
      hours,
      parseInt(minStr, 10),
      secStr ? parseInt(secStr, 10) : 0
    );
    const ts = d.getTime();
    if (!isNaN(ts)) return ts;
  }

  // 4. Formato YYYY-MM-DD
  const ymdMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (ymdMatch) {
    const [, year, month, day, hoursStr, minStr, secStr] = ymdMatch;
    const d = new Date(
      parseInt(year, 10),
      parseInt(month, 10) - 1,
      parseInt(day, 10),
      hoursStr ? parseInt(hoursStr, 10) : 0,
      minStr ? parseInt(minStr, 10) : 0,
      secStr ? parseInt(secStr, 10) : 0
    );
    const ts = d.getTime();
    if (!isNaN(ts)) return ts;
  }

  // 5. Fallback a Date.parse nativo (para ISO 8601 u otros formatos estándar)
  const directParse = Date.parse(str);
  if (!isNaN(directParse)) {
    return directParse;
  }

  return 0;
}

/**
 * Extrae la clave de ordenamiento (timestamp numérico y secuencia de ID) de cualquier movimiento.
 */
export function getMovementSortKey(item: {
  id?: string;
  date?: string;
  timestamp?: string | number;
  createdAt?: string;
}): { timestamp: number; seq: number } {
  let ts = 0;
  if (item.timestamp) {
    ts = parseDateTimeSafe(item.timestamp);
  }
  if (!ts && item.createdAt) {
    ts = parseDateTimeSafe(item.createdAt);
  }
  if (!ts && item.date) {
    ts = parseDateTimeSafe(item.date);
  }

  // Extraer secuencia numérica final del ID (ej. POS-160358 -> 160358)
  let seq = 0;
  if (item.id) {
    const idMatch = item.id.match(/\d+/g);
    if (idMatch && idMatch.length > 0) {
      const lastDigits = idMatch[idMatch.length - 1];
      seq = Number(lastDigits) || 0;
    }
  }

  return { timestamp: ts, seq };
}

/**
 * Comparador descendente para ordenar movimientos cronológicamente: los más recientes arriba.
 */
export function compareMovementsDesc(
  a: { id?: string; date?: string; timestamp?: string | number; createdAt?: string },
  b: { id?: string; date?: string; timestamp?: string | number; createdAt?: string }
): number {
  const keyA = getMovementSortKey(a);
  const keyB = getMovementSortKey(b);

  const diff = keyB.timestamp - keyA.timestamp;
  // Si la diferencia es de 1 minuto o más, priorizar el timestamp real
  if (Math.abs(diff) >= 60000) {
    return diff;
  }

  // Si están en el mismo minuto y ambos tienen secuencia numérica de ID, desempatar por secuencia
  if (keyB.seq && keyA.seq && keyB.seq !== keyA.seq) {
    return keyB.seq - keyA.seq;
  }

  // Si hay alguna diferencia de timestamp (sub-minuto)
  if (diff !== 0) {
    return diff;
  }

  return 0;
}

/**
 * Normaliza nombres de cajera/empleado para comparación estricta sin mezclar turnos
 */
export function normalizeCashierName(name?: string): string {
  if (!name) return "";
  const lower = name.toLowerCase().trim();
  if (lower.includes("cajera 1") || lower.includes("cajero 1")) return "cajera 1";
  if (lower.includes("cajera 2") || lower.includes("cajero 2")) return "cajera 2";
  return lower;
}

/**
 * Determina si dos nombres de cajera corresponden al mismo empleado
 */
export function matchesCashier(itemCashier?: string, targetCashier?: string): boolean {
  if (!itemCashier || !targetCashier) return false;
  const a = normalizeCashierName(itemCashier);
  const b = normalizeCashierName(targetCashier);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

/**
 * Obtiene el timestamp de inicio del turno actual a partir del último corte cerrado
 * o de la clave almacenada de inicio de turno.
 */
export function getStoredShiftStartBoundary(): number {
  if (typeof window === "undefined") return 0;
  try {
    const stored = localStorage.getItem("brito_current_shift_start_timestamp");
    if (stored && !isNaN(Number(stored)) && Number(stored) > 0) {
      return Number(stored);
    }
    const rawCuts = localStorage.getItem("brito_shift_cuts_history");
    if (rawCuts) {
      const parsed = JSON.parse(rawCuts);
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0].timestamp === "number") {
        return parsed[0].timestamp;
      }
    }
  } catch (e) {}
  return 0;
}

