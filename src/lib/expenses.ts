"use client";

import { ExpenseRecord, BranchCashMovement } from "@/types";
import { formatCurrency, formatDateTimeSafe, resolveBranchId } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { realtimeHub } from "@/lib/realtime/realtimeHub";

export const STORAGE_EXPENSES_KEY = "brito_gastos_registro";

export const GASTO_CATEGORIAS_MAP: Record<string, { id: string; label: string }> = {
  retiro_dueno: { id: "retiro_dueno", label: "Retiro Don Toño / Socios" },
  retiro: { id: "retiro_dueno", label: "Retiro Don Toño / Socios" },
  corte: { id: "retiro_dueno", label: "Retiro Don Toño / Socios" },
  corte_caja: { id: "retiro_dueno", label: "Retiro Don Toño / Socios" },
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
  "branch-sanjuan": "San Juan",
  "branch-san-benito": "San Benito (Mercado)",
  "branch-benito": "San Benito (Mercado)",
  "branch-las-flores": "Las Flores (Plaza)",
  "branch-flores": "Las Flores (Plaza)",
  "branch-angeles": "Sucursal Los Ángeles",
  "branch-1790889237862": "San Ildefonso",
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
  id?: string;
  date?: string;
  skipSupabaseAndBroadcast?: boolean;
}): ExpenseRecord | null {
  const parsedAmount = Number(options.amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return null;
  }

  const finalDescription = options.description ? options.description.trim() : "Salida de efectivo";
  const branchId = resolveBranchId(options.branchId, options.cashier);
  const branchName =
    options.branchName ||
    DEFAULT_BRANCHES_NAMES[branchId] ||
    (branchId.includes("matriz")
      ? "Matriz (Centro)"
      : branchId.includes("angeles")
      ? "Sucursal Los Ángeles"
      : branchId.includes("1790889237862")
      ? "San Ildefonso"
      : (branchId.includes("sanjuan") || branchId.includes("benito"))
      ? "San Juan"
      : "Las Flores (Plaza)");

  let categoryKey = options.category ? options.category.toLowerCase().trim() : "otros";
  if (!options.category || categoryKey === "otros" || categoryKey === "gasto" || categoryKey === "salida" || categoryKey === "caja") {
    const descLower = finalDescription.toLowerCase();
    if (descLower.includes("cierre de turno") || descLower.includes("don toño") || descLower.includes("retiro") || descLower.includes("socio")) {
      categoryKey = "retiro_dueno";
    } else if (descLower.includes("gas") || descLower.includes("horno")) {
      categoryKey = "gas_lp";
    } else if (descLower.includes("harina") || descLower.includes("levadura") || descLower.includes("manteca") || descLower.includes("azucar") || descLower.includes("insumo")) {
      categoryKey = "insumos";
    } else if (descLower.includes("bolsa") || descLower.includes("empaque") || descLower.includes("papel")) {
      categoryKey = "empaques";
    } else if (descLower.includes("cfe") || descLower.includes("luz") || descLower.includes("agua") || descLower.includes("internet")) {
      categoryKey = "servicios";
    } else if (descLower.includes("gasolina") || descLower.includes("pemex") || descLower.includes("reparto")) {
      categoryKey = "gasolina";
    } else if (descLower.includes("proveedor") || descLower.includes("factura")) {
      categoryKey = "proveedores";
    } else if (descLower.includes("nomina") || descLower.includes("sueldo") || descLower.includes("semana")) {
      categoryKey = "nomina";
    } else if (descLower.includes("mantenimiento") || descLower.includes("refaccion") || descLower.includes("tecnico")) {
      categoryKey = "mantenimiento";
    }
  }

  const catDef = GASTO_CATEGORIAS_MAP[categoryKey] || {
    id: "otros",
    label: "Gastos Menores / Varios",
  };

  const now = new Date();
  const timeStr = now.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
  const dateStr = options.date || getLocalDateISO(now);

  const existingExpenses = getStoredExpenses();

  // Preservar ID original si fue provisto (ej. EXP-xxxx), o generar folio único tipo GST-XXXX
  let folio = options.id || options.folio;
  if (!folio) {
    let attempts = 0;
    while (!folio || (existingExpenses.some((g) => g.id === folio) && attempts < 20)) {
      folio = `GST-${Math.floor(1000 + Math.random() * 9000)}`;
      attempts++;
    }
  }

  // Detectar cajero inteligente si es genérico
  let finalCashier = (options.cashier || "Cajero de Turno").trim();
  if (finalCashier.toLowerCase() === "cajero" || finalCashier.toLowerCase() === "cajero de turno") {
    const match = finalDescription.match(/\(([^->\)]+)(?:\s*->|\s*➔|\))/i);
    if (match && match[1]) {
      const extracted = match[1].trim();
      finalCashier = extracted.charAt(0).toUpperCase() + extracted.slice(1);
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
    cashier: finalCashier,
    status: "activo",
    timestamp: now.toISOString(),
  };

  // Guardar en la base de datos local deduplicando por ID
  const cleanExisting = existingExpenses.filter((g) => g.id !== folio);
  const updatedExpenses = [newExpense, ...cleanExisting];
  saveStoredExpenses(updatedExpenses);

  // Guardar en Supabase para supervisión si no fue persistido previamente por la pantalla de origen
  if (!options.skipSupabaseAndBroadcast && typeof window !== "undefined") {
    try {
      const supabase = createClient();
      const expId = newExpense.id;

      Promise.allSettled([
        supabase.from("cash_expenses").upsert({
          id: expId,
          amount: newExpense.amount,
          category: catDef.id,
          description: `[${newExpense.categoryLabel}] ${newExpense.description}`,
          cashier: newExpense.cashier || "Cajero",
          branch_id: branchId,
        }),
        supabase.from("cash_movements").upsert({
          id: `mov-${expId}`,
          type: "salida",
          category: catDef.id,
          category_label: newExpense.categoryLabel,
          amount: newExpense.amount,
          reason: `[${expId}] ${newExpense.categoryLabel}: ${newExpense.description} (${newExpense.branchName})`,
          authorized_by: newExpense.cashier || "Cajero",
          branch_id: branchId,
        }),
      ]).catch(() => {});
    } catch {}
  }

  // Transmitir en tiempo real a los demás dispositivos / sucursales si no fue emitido previamente
  if (!options.skipSupabaseAndBroadcast && typeof window !== "undefined" && realtimeHub?.broadcastCashMovement) {
    realtimeHub.broadcastCashMovement({
      id: `mov-${newExpense.id}`,
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
      const rawId = payload.id || "";
      const baseId = rawId.replace(/^mov-/, "");

      // Evitar duplicados por id (con o sin prefijo mov-), o coincidencia exacta de monto/motivo/sucursal
      if (
        current.some(
          (g) =>
            g.id === payload.id ||
            g.id === baseId ||
            `mov-${g.id}` === payload.id ||
            (g.amount === payload.amount && g.description === payload.reason && g.branchId === payload.branchId)
        )
      ) {
        return;
      }

      const catDef = (payload.category && GASTO_CATEGORIAS_MAP[payload.category]) || {
        id: "otros",
        label: payload.categoryLabel || "Gastos Menores / Varios",
      };

      const finalId = baseId.length > 0 ? baseId : `GST-${Date.now().toString().slice(-4)}`;

      const remoteExpense: ExpenseRecord = {
        id: finalId,
        date: getLocalDateISO(new Date(payload.timestamp || Date.now())),
        displayDate: `Hoy, ${payload.timestamp || new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}`,
        category: catDef.id,
        categoryLabel: catDef.label,
        branchId: resolveBranchId(payload.branchId, payload.authorizedBy),
        branchName: payload.branchName || DEFAULT_BRANCHES_NAMES[resolveBranchId(payload.branchId, payload.authorizedBy)] || "Sucursal",
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
