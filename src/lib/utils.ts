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

