import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(amount);
}

/**
 * Bloquea cualquier tecla que no sea número en el teclado físico o virtual
 */
export function onlyNumbersKeyDown(
  e: React.KeyboardEvent<HTMLInputElement>,
  allowDecimal: boolean = false
) {
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

