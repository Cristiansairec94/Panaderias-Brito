"use client";

import { ExpenseRecord, BranchCashMovement } from "@/types";
import { formatCurrency, formatDateTimeSafe, resolveBranchId, formatTime24 } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { realtimeHub } from "@/lib/realtime/realtimeHub";

export const STORAGE_EXPENSES_KEY = "brito_gastos_registro";
export const DELETED_EXPENSES_KEY = "brito_deleted_expense_ids";

export function getDeletedExpenseIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(DELETED_EXPENSES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set(parsed);
    }
  } catch {}
  return new Set();
}

export function markExpenseIdAsDeleted(id: string): void {
  if (typeof window === "undefined" || !id) return;
  try {
    const set = getDeletedExpenseIds();
    const baseId = id.replace(/^mov-/, "");
    set.add(id);
    set.add(baseId);
    set.add(`mov-${baseId}`);
    localStorage.setItem(DELETED_EXPENSES_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

export function unmarkExpenseIdAsDeleted(id: string): void {
  if (typeof window === "undefined" || !id) return;
  try {
    const set = getDeletedExpenseIds();
    const baseId = id.replace(/^mov-/, "");
    const changed = set.delete(id) || set.delete(baseId) || set.delete(`mov-${baseId}`);
    if (changed) {
      localStorage.setItem(DELETED_EXPENSES_KEY, JSON.stringify(Array.from(set)));
    }
  } catch {}
}

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
    const deletedIds = getDeletedExpenseIds();
    const raw = localStorage.getItem(STORAGE_EXPENSES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((g) => g && g.id && !deletedIds.has(g.id));
      }
    }
  } catch (e) {
    console.error("[Expenses] Error reading expenses from storage:", e);
  }
  return [];
}

export function saveStoredExpenses(expenses: ExpenseRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    const deletedIds = getDeletedExpenseIds();
    const filtered = expenses.filter((g) => g && g.id && !deletedIds.has(g.id));
    localStorage.setItem(STORAGE_EXPENSES_KEY, JSON.stringify(filtered));
    localStorage.setItem("brito_gastos_initialized", "true");
    window.dispatchEvent(new CustomEvent("brito_gastos_updated", { detail: filtered }));
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
      : branchId.includes("sanjuan")
      ? "San Juan"
      : branchId.includes("benito")
      ? "San Benito (Mercado)"
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
  const timeStr = formatTime24(now);
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

  unmarkExpenseIdAsDeleted(folio);

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
  if (!options.skipSupabaseAndBroadcast && typeof window !== "undefined") {
    if (realtimeHub?.broadcastExpense) {
      realtimeHub.broadcastExpense("create", newExpense);
    }
    if (realtimeHub?.broadcastCashMovement) {
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
  }

  return newExpense;
}

/**
 * Actualiza un gasto (o anulación) en Supabase y lo transmite en tiempo real sin bloquear la interfaz.
 */
export function updateExpenseInDb(expense: ExpenseRecord): void {
  if (typeof window === "undefined") return;
  try {
    if (realtimeHub?.broadcastExpense) {
      realtimeHub.broadcastExpense("update", expense);
    }
  } catch {}

  void (async () => {
    try {
      const supabase = createClient();
      const baseId = expense.id.replace(/^mov-/, "");
      const movId = `mov-${baseId}`;
      const effectiveAmount = expense.status === "anulado" ? 0 : expense.amount;
      await Promise.allSettled([
        supabase.from("cash_expenses").upsert({
          id: baseId,
          amount: effectiveAmount,
          category: expense.category || "otros",
          description: `[${expense.categoryLabel}] ${expense.description}`,
          cashier: expense.cashier || "Cajero",
          branch_id: expense.branchId || "branch-matriz",
        }),
        supabase.from("cash_movements").upsert({
          id: movId,
          type: "salida",
          category: expense.category || "otros",
          category_label: expense.categoryLabel || "Gasto",
          amount: effectiveAmount,
          reason: `[${baseId}] ${expense.categoryLabel}: ${expense.description} (${expense.branchName})`,
          authorized_by: expense.cashier || "Cajero",
          branch_id: expense.branchId || "branch-matriz",
        }),
        supabase.from("cash_movements").upsert({
          id: baseId,
          type: "salida",
          category: expense.category || "otros",
          category_label: expense.categoryLabel || "Gasto",
          amount: effectiveAmount,
          reason: `[${baseId}] ${expense.categoryLabel}: ${expense.description} (${expense.branchName})`,
          authorized_by: expense.cashier || "Cajero",
          branch_id: expense.branchId || "branch-matriz",
        }),
      ]);
    } catch (err) {
      console.warn("[Expenses] Error updating expense in Supabase:", err);
    }
  })();
}

/**
 * Elimina un gasto permanentemente de localStorage, lo transmite en tiempo real y lo borra de Supabase en segundo plano.
 */
export function deleteExpenseInDb(id: string): void {
  if (typeof window === "undefined" || !id) return;
  const baseId = id.replace(/^mov-/, "");
  const movId = `mov-${baseId}`;

  markExpenseIdAsDeleted(id);
  const current = getStoredExpenses();
  saveStoredExpenses(current.filter((g) => g.id !== id && g.id !== baseId && g.id !== movId));

  try {
    const rawCur = localStorage.getItem("brito_pos_current_expenses");
    if (rawCur) {
      const parsed = JSON.parse(rawCur);
      if (Array.isArray(parsed)) {
        localStorage.setItem(
          "brito_pos_current_expenses",
          JSON.stringify(parsed.filter((e: any) => e && e.id !== id && e.id !== baseId && e.id !== movId))
        );
      }
    }
  } catch {}

  try {
    if (realtimeHub?.broadcastExpense) {
      realtimeHub.broadcastExpense("delete", { id: baseId });
    }
  } catch {}

  void (async () => {
    try {
      const supabase = createClient();
      await Promise.allSettled([
        supabase.from("cash_expenses").delete().eq("id", baseId),
        supabase.from("cash_expenses").delete().eq("id", id),
        supabase.from("cash_movements").delete().eq("id", movId),
        supabase.from("cash_movements").delete().eq("id", baseId),
        supabase.from("cash_movements").delete().eq("id", id),
      ]);
    } catch (err) {
      console.warn("[Expenses] Error deleting expense from Supabase:", err);
    }
  })();
}

/**
 * Descarga y fusiona gastos desde Supabase (cash_expenses y cash_movements tipo salida).
 */
export async function fetchAndSyncExpensesFromSupabase(): Promise<ExpenseRecord[]> {
  if (typeof window === "undefined") return [];
  if (!navigator.onLine || localStorage.getItem("brito_simulate_offline") === "true") {
    return getStoredExpenses();
  }
  try {
    const supabase = createClient();
    const [{ data: expData }, { data: movData }] = await Promise.all([
      supabase.from("cash_expenses").select("*").order("created_at", { ascending: false }).limit(250),
      supabase.from("cash_movements").select("*").eq("type", "salida").order("created_at", { ascending: false }).limit(250),
    ]);

    const deletedIds = getDeletedExpenseIds();
    const local = getStoredExpenses();
    const map = new Map<string, ExpenseRecord>();
    for (const item of local) {
      if (item && item.id && !deletedIds.has(item.id)) {
        map.set(item.id.replace(/^mov-/, ""), item);
      }
    }

    if (Array.isArray(expData)) {
      for (const row of expData) {
        if (!row || !row.id) continue;
        const baseId = String(row.id).replace(/^mov-/, "");
        if (deletedIds.has(row.id) || deletedIds.has(baseId)) continue;
        if (map.has(baseId)) continue;
        const catDef = GASTO_CATEGORIAS_MAP[row.category || "otros"] || {
          id: "otros",
          label: "Gastos Menores / Varios",
        };
        const bId = resolveBranchId(row.branch_id, row.cashier);
        const dt = row.created_at ? new Date(row.created_at) : new Date();
        map.set(baseId, {
          id: baseId,
          date: getLocalDateISO(dt),
          displayDate: formatDateTimeSafe(dt),
          category: catDef.id,
          categoryLabel: catDef.label,
          branchId: bId,
          branchName: DEFAULT_BRANCHES_NAMES[bId] || "Sucursal",
          description: String(row.description || "Gasto en caja").replace(/^\[[^\]]+\]\s*/, ""),
          amount: Number(row.amount) || 0,
          paymentMethod: "efectivo",
          accountOrigin: "Caja Mostrador (Efectivo Turno)",
          cashier: row.cashier || "Cajero",
          status: Number(row.amount) === 0 ? "anulado" : "activo",
          timestamp: row.created_at || dt.toISOString(),
        });
      }
    }

    if (Array.isArray(movData)) {
      for (const row of movData) {
        if (!row || !row.id) continue;
        if (row.category === "corte_caja" || row.category === "corte") continue;
        const baseId = String(row.id).replace(/^mov-/, "");
        if (deletedIds.has(row.id) || deletedIds.has(baseId)) continue;
        if (map.has(baseId)) continue;
        const catDef = GASTO_CATEGORIAS_MAP[row.category || "otros"] || {
          id: "otros",
          label: row.category_label || "Gastos Menores / Varios",
        };
        const bId = resolveBranchId(row.branch_id, row.authorized_by);
        const dt = row.created_at ? new Date(row.created_at) : new Date();
        map.set(baseId, {
          id: baseId,
          date: getLocalDateISO(dt),
          displayDate: formatDateTimeSafe(dt),
          category: catDef.id,
          categoryLabel: catDef.label,
          branchId: bId,
          branchName: DEFAULT_BRANCHES_NAMES[bId] || "Sucursal",
          description: String(row.reason || "Salida de efectivo").replace(/^\[[^\]]+\]\s*/, ""),
          amount: Number(row.amount) || 0,
          paymentMethod: "efectivo",
          accountOrigin: "Caja Mostrador (Efectivo Turno)",
          cashier: row.authorized_by || "Cajero",
          status: Number(row.amount) === 0 ? "anulado" : "activo",
          timestamp: row.created_at || dt.toISOString(),
        });
      }
    }

    const merged = Array.from(map.values());
    if (merged.length !== local.length) {
      saveStoredExpenses(merged);
    }
    return merged;
  } catch (err) {
    console.warn("[Expenses] Error fetching expenses from Supabase:", err);
    return getStoredExpenses();
  }
}

// Sincronización reactiva automática en segundo plano:
if (typeof window !== "undefined") {
  setTimeout(() => {
    if (realtimeHub?.onExpense) {
      realtimeHub.onExpense((payload) => {
        try {
          if (!payload) return;
          const { action, expense, deletedId } = payload;
          const current = getStoredExpenses();
          if (action === "delete") {
            const targetId = deletedId || expense?.id;
            if (!targetId) return;
            const baseId = String(targetId).replace(/^mov-/, "");
            markExpenseIdAsDeleted(baseId);
            const filtered = current.filter((g) => g.id !== targetId && g.id !== baseId && g.id !== `mov-${baseId}`);
            if (filtered.length !== current.length) {
              saveStoredExpenses(filtered);
            }
          } else if (action === "update" && expense?.id) {
            const baseId = String(expense.id).replace(/^mov-/, "");
            const exists = current.some((g) => g.id === expense.id || g.id === baseId);
            if (exists) {
              saveStoredExpenses(
                current.map((g) => (g.id === expense.id || g.id === baseId ? { ...g, ...expense } : g))
              );
            } else {
              unmarkExpenseIdAsDeleted(baseId);
              saveStoredExpenses([expense, ...current]);
            }
          } else if (action === "create" && expense?.id) {
            const baseId = String(expense.id).replace(/^mov-/, "");
            unmarkExpenseIdAsDeleted(baseId);
            if (!current.some((g) => g.id === expense.id || g.id === baseId)) {
              saveStoredExpenses([expense, ...current]);
            }
          }
        } catch (err) {
          console.error("[ExpensesRealtime] Error procesando evento expense:", err);
        }
      });
    }

    if (realtimeHub?.onCashMovement) {
      realtimeHub.onCashMovement((payload) => {
        try {
          if (!payload || payload.type !== "salida") return;
          const current = getStoredExpenses();
          const rawId = payload.id || "";
          const baseId = rawId.replace(/^mov-/, "");
          if (getDeletedExpenseIds().has(baseId)) return;

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
            displayDate: `Hoy, ${payload.timestamp ? formatTime24(payload.timestamp) : formatTime24()}`,
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
  }, 0);
}

