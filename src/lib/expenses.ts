"use client";

import { ExpenseRecord, BranchCashMovement } from "@/types";
import { formatCurrency, formatDateTimeSafe } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { realtimeHub } from "@/lib/realtime/realtimeHub";

export const STORAGE_EXPENSES_KEY = "brito_gastos_registro";

export const GASTO_CATEGORIAS_MAP: Record<string, { id: string; label: string }> = {
  retiro_dueno: { id: "retiro_dueno", label: "Retiro Don Toño / Socios" },
  gasto_gas: { id: "gas_lp", label: "Gas LP para Hornos" },
  gas_lp: { id: "gas_lp", label: "Gas LP para Hornos" },
  compra_insumos: { id: "insumos", label: "Materia Prima & Harinas" },
  insumos: { id: "insumos", label: "Materia Prima & Harinas" },
  pago_proveedor: { id: "proveedores", label: "Pago a Proveedores" },
  proveedores: { id: "proveedores", label: "Pago a Proveedores" },
  empaques: { id: "empaques", label: "Bolsas Kraft & Empaques" },
  servicios: { id: "servicios", label: "Luz, Agua e Internet" },
  nomina: { id: "nomina", label: "Sueldos & Nómina" },
  gasolina: { id: "gasolina", label: "Gasolina & Repartos" },
  mantenimiento: { id: "mantenimiento", label: "Mantenimiento & Refacciones" },
  limpieza: { id: "otros", label: "Gastos Menores / Varios" },
  otro: { id: "otros", label: "Gastos Menores / Varios" },
  otros: { id: "otros", label: "Gastos Menores / Varios" },
};

export const DEFAULT_BRANCHES_NAMES: Record<string, string> = {
  "branch-matriz": "Matriz (Centro)",
  "branch-san-benito": "San Benito (Mercado)",
  "branch-las-flores": "Las Flores (Plaza)",
};

const getLocalDateISO = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export function getStoredExpenses(): ExpenseRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_EXPENSES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error("[Expenses] Error reading expenses from storage:", e);
  }
  return [];
}

export function saveStoredExpenses(expenses: ExpenseRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_EXPENSES_KEY, JSON.stringify(expenses));
    window.dispatchEvent(new CustomEvent("brito_gastos_updated", { detail: expenses }));
    window.dispatchEvent(new Event("storage"));
  } catch (e) {
    console.error("[Expenses] Error saving expenses to storage:", e);
  }
}

/**
 * Registra CUALQUIER salida de dinero (así sea solo $1) de cualquier sucursal
 * en el Historial Detallado de Gastos.
 */
export function recordCashOutflowAsExpense(options: {
  amount: number;
  description: string;
  category?: string;
  branchId?: string;
  branchName?: string;
  cashier?: string;
  paymentMethod?: "efectivo" | "tarjeta" | "transferencia";
  accountOrigin?: string;
  supplier?: string;
  notes?: string;
  folio?: string;
  date?: string;
}): ExpenseRecord | null {
  const parsedAmount = Number(options.amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return null;
  }

  const finalDescription = options.description ? options.description.trim() : "Salida de efectivo";
  const branchId = options.branchId || "branch-matriz";
  const branchName =
    options.branchName ||
    DEFAULT_BRANCHES_NAMES[branchId] ||
    (branchId.includes("matriz") ? "Matriz (Centro)" : branchId.includes("benito") ? "San Benito (Mercado)" : "Las Flores (Plaza)");

  const categoryKey = options.category ? options.category.toLowerCase().trim() : "otros";
  const catDef = GASTO_CATEGORIAS_MAP[categoryKey] || {
    id: "otros",
    label: "Gastos Menores / Varios",
  };

  const now = new Date();
  const timeStr = now.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
  const dateStr = options.date || getLocalDateISO(now);

  const existingExpenses = getStoredExpenses();

  // Generar folio único tipo GST-XXXX
  let folio = options.folio;
  if (!folio) {
    let attempts = 0;
    while (!folio || (existingExpenses.some((g) => g.id === folio) && attempts < 20)) {
      folio = `GST-${Math.floor(1000 + Math.random() * 9000)}`;
      attempts++;
    }
  }

  const newExpense: ExpenseRecord = {
    id: folio,
    date: dateStr,
    displayDate: `Hoy, ${timeStr}`,
    category: catDef.id,
    categoryLabel: catDef.label,
    branchId,
    branchName,
    description: finalDescription,
    amount: parsedAmount,
    paymentMethod: options.paymentMethod || "efectivo",
    accountOrigin: options.accountOrigin || "Caja Mostrador (Efectivo Turno)",
    supplier: options.supplier ? options.supplier.trim() : undefined,
    notes: options.notes ? options.notes.trim() : undefined,
    cashier: options.cashier || "Cajero de Turno",
    status: "activo",
    timestamp: now.toISOString(),
  };

  // Guardar en la base de datos local
  const updatedExpenses = [newExpense, ...existingExpenses];
  saveStoredExpenses(updatedExpenses);

  // Intentar guardar en Supabase si hay conexión
  if (typeof window !== "undefined") {
    try {
      const supabase = createClient();
      Promise.resolve(
        supabase.from("cash_movements").insert({
          type: "salida",
          category: catDef.id,
          amount: newExpense.amount,
          reason: `[${newExpense.id}] ${newExpense.categoryLabel}: ${newExpense.description} (${newExpense.branchName})`,
          authorized_by: newExpense.cashier,
        })
      ).catch(() => {});
    } catch {}
  }

  // Transmitir en tiempo real a los demás dispositivos / sucursales
  if (typeof window !== "undefined" && realtimeHub?.broadcastCashMovement) {
    realtimeHub.broadcastCashMovement({
      id: newExpense.id,
      branchId: newExpense.branchId,
      branchName: newExpense.branchName,
      type: "salida",
      category: newExpense.category as any,
      categoryLabel: newExpense.categoryLabel,
      amount: newExpense.amount,
      reason: newExpense.description,
      authorizedBy: newExpense.cashier,
      timestamp: timeStr,
    });
  }

  return newExpense;
}

// Sincronización reactiva automática en segundo plano:
// Cuando llega un cash_movement remoto de tipo "salida", lo incorporamos al registro de gastos si no existe
if (typeof window !== "undefined" && realtimeHub?.onCashMovement) {
  realtimeHub.onCashMovement((payload) => {
    try {
      if (!payload || payload.type !== "salida") return;
      const current = getStoredExpenses();
      // Evitar duplicados por id o coincidencia exacta de tiempo/monto
      if (current.some((g) => g.id === payload.id || (g.amount === payload.amount && g.description === payload.reason && g.branchId === payload.branchId))) {
        return;
      }

      const catDef = GASTO_CATEGORIAS_MAP[payload.category] || {
        id: "otros",
        label: payload.categoryLabel || "Gastos Menores / Varios",
      };

      const remoteExpense: ExpenseRecord = {
        id: payload.id.startsWith("GST-") ? payload.id : `GST-${Date.now().toString().slice(-4)}`,
        date: getLocalDateISO(new Date(payload.timestamp || Date.now())),
        displayDate: `Hoy, ${payload.timestamp || new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}`,
        category: catDef.id,
        categoryLabel: catDef.label,
        branchId: payload.branchId,
        branchName: payload.branchName,
        description: payload.reason || "Salida de efectivo remota",
        amount: Number(payload.amount),
        paymentMethod: "efectivo",
        accountOrigin: "Caja Mostrador (Efectivo Turno)",
        cashier: payload.authorizedBy || "Cajero",
        status: "activo",
        timestamp: new Date().toISOString(),
      };

      saveStoredExpenses([remoteExpense, ...current]);
    } catch (err) {
      console.error("[ExpensesRealtime] Error incorporando salida remota:", err);
    }
  });
}
