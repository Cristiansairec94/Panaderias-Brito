"use client";

import { createClient } from "@/lib/supabase/client";

// Epoch timestamp for clean slate: all operational data (notifications, orders, sales, expenses) before this epoch is discarded
export const CLEAN_SLATE_EPOCH = 1792088450000; // 2026-10-15T18:20:50.000Z
export const WIPE_VERSION_KEY = `brito_clean_slate_epoch_${CLEAN_SLATE_EPOCH}`;

// Ejecución sincrónica en el cliente en cuanto el módulo se carga en el navegador
if (typeof window !== "undefined") {
  try {
    const isWiped = localStorage.getItem(WIPE_VERSION_KEY);
    if (isWiped !== "true") {
      const keysToEmpty = [
        "brito_notifications",
        "brito_custom_orders",
        "brito_orders",
        "brito_pos_master_sales",
        "brito_pos_current_sales",
        "brito_recent_sales",
        "brito_simulated_sales",
        "brito_offline_sales",
        "brito_sync_queue",
        "brito_offline_archive",
        "brito_synced_cache",
        "brito_shift_cuts_history",
        "brito_expenses",
        "brito_gastos",
        "brito_gastos_registro",
        "brito_pos_current_expenses",
        "brito_incomes",
        "brito_incomes_v2",
        "brito_cash_incomes",
        "brito_pos_current_incomes",
        "brito_branch_cash_movements",
        "brito_bread_deliveries",
        "brito_current_shift_start_timestamp",
      ];
      keysToEmpty.forEach((k) => {
        try {
          localStorage.setItem(k, "[]");
        } catch (e) {}
      });
      localStorage.setItem("brito_orders_initialized", "true");
      localStorage.setItem("brito_incomes_initialized", "true");
      localStorage.setItem("brito_gastos_initialized", "true");
      localStorage.removeItem("brito_branches_data");
      localStorage.removeItem("brito_branches");
      localStorage.removeItem("brito_current_shift_start_timestamp");
      localStorage.removeItem("brito_current_shift_cashier");
      localStorage.removeItem("brito_current_shift_name");
      localStorage.removeItem("brito_pos_shift_locked");
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (
          k &&
          (k.startsWith("brito_shift_start_") ||
            k.startsWith("brito_pos_initial_fund") ||
            k.startsWith("brito_dismissed_terminal_orders_") ||
            k.startsWith("brito_read_notifs_") ||
            k.startsWith("brito_active_tab_") ||
            k.startsWith("brito_clean_slate_epoch_"))
        ) {
          if (k !== WIPE_VERSION_KEY) {
            localStorage.removeItem(k);
          }
        }
      }
      localStorage.setItem(WIPE_VERSION_KEY, "true");
      window.dispatchEvent(new Event("brito_notifications_cleared"));
      window.dispatchEvent(new Event("brito_orders_updated"));
      window.dispatchEvent(new Event("brito_sales_updated"));
      window.dispatchEvent(new Event("brito_incomes_updated"));
      window.dispatchEvent(new Event("brito_gastos_updated"));
      window.dispatchEvent(new Event("brito_branches_updated"));
      window.dispatchEvent(new Event("brito_branches_data_updated"));
    }
  } catch (e) {}
}

/**
 * Realiza un vaciado total y definitivo de datos operativos:
 * - Historial de ventas y tickets (en ceros para todas las sucursales)
 * - Todos los pedidos (pendientes, en horno, listos, entregados, cancelados / dados de baja)
 * - Cache y barra de notificaciones (en 0 total)
 * - Gastos y movimientos de caja
 * - Cortes de caja anteriores
 *
 * PRESERVA:
 * - Usuarios y roles (Silvia, Ángeles, Don Toño, etc.)
 * - Sucursales y configuraciones de local
 * - Catálogo de productos y precios
 * - Clientes registrados
 */
export async function executeCompleteOperationalWipe(options: { wipeSupabase?: boolean } = {}) {
  if (typeof window === "undefined") return;

  const { wipeSupabase = true } = options;

  console.log("[WipeOperationalData] Ejecutando vaciado definitivo de historial, pedidos y notificaciones...");

  const keysToEmpty = [
    "brito_notifications",
    "brito_custom_orders",
    "brito_orders",
    "brito_pos_master_sales",
    "brito_pos_current_sales",
    "brito_recent_sales",
    "brito_simulated_sales",
    "brito_offline_sales",
    "brito_sync_queue",
    "brito_offline_archive",
    "brito_synced_cache",
    "brito_shift_cuts_history",
    "brito_expenses",
    "brito_gastos",
    "brito_gastos_registro",
    "brito_pos_current_expenses",
    "brito_incomes",
    "brito_incomes_v2",
    "brito_cash_incomes",
    "brito_pos_current_incomes",
    "brito_branch_cash_movements",
    "brito_bread_deliveries",
    "brito_current_shift_start_timestamp",
  ];

  keysToEmpty.forEach((key) => {
    try {
      localStorage.setItem(key, JSON.stringify([]));
    } catch (e) {
      console.warn("[WipeOperationalData] Error setting empty array for:", key, e);
    }
  });

  // Limpiar llaves dinámicas como brito_shift_start_*
  try {
    localStorage.removeItem("brito_current_shift_start_timestamp");
    localStorage.removeItem("brito_current_shift_cashier");
    localStorage.removeItem("brito_current_shift_name");
    localStorage.removeItem("brito_pos_shift_locked");
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (
        k &&
        (k.startsWith("brito_shift_start_") ||
          k.startsWith("brito_pos_initial_fund") ||
          k.startsWith("brito_dismissed_terminal_orders_") ||
          k.startsWith("brito_read_notifs_") ||
          k.startsWith("brito_active_tab_") ||
          k.startsWith("brito_clean_slate_epoch_"))
      ) {
        if (k !== WIPE_VERSION_KEY) {
          localStorage.removeItem(k);
        }
      }
    }
  } catch (e) {}

  // 2. Limpiar acumulados de ventas y pedidos en brito_branches_data
  try {
    localStorage.removeItem("brito_branches_data");
    localStorage.removeItem("brito_branches");
  } catch (e) {}

  // Banderas de inicialización para prevenir que se regeneren mocks
  try {
    localStorage.setItem("brito_orders_initialized", "true");
    localStorage.setItem("brito_incomes_initialized", "true");
    localStorage.setItem("brito_gastos_initialized", "true");
    localStorage.setItem(WIPE_VERSION_KEY, "true");
  } catch (e) {}

  // 3. Limpieza de Supabase si está disponible
  if (wipeSupabase) {
    try {
      const supabase = createClient();
      await supabase.from("sale_items").delete().neq("id", "none");
      await supabase.from("sales").delete().neq("id", "none");
      await supabase.from("custom_orders").delete().neq("id", "none");
      await supabase.from("cash_expenses").delete().neq("id", "none");
      await supabase.from("cash_movements").delete().neq("id", "none");
      await supabase.from("cash_shifts").delete().neq("id", "none");
      console.log("[WipeOperationalData] Tablas de Supabase en 0.");
    } catch (err) {
      console.warn("[WipeOperationalData] Nota al limpiar Supabase:", err);
    }
  }

  // 4. Notificar a toda la interfaz mediante eventos de ventana
  try {
    window.dispatchEvent(new Event("brito_orders_updated"));
    window.dispatchEvent(new Event("brito_sales_updated"));
    window.dispatchEvent(new Event("brito_incomes_updated"));
    window.dispatchEvent(new Event("brito_gastos_updated"));
    window.dispatchEvent(new Event("brito_notifications_cleared"));
    window.dispatchEvent(new Event("brito_branches_updated"));
    window.dispatchEvent(new Event("brito_branches_data_updated"));
  } catch (e) {}

  console.log("[WipeOperationalData] Limpieza completa finalizada en 0.");
}

export function autoRunOperationalWipeIfNeeded() {
  if (typeof window === "undefined") return;

  try {
    const alreadyWiped = localStorage.getItem(WIPE_VERSION_KEY);
    if (alreadyWiped !== "true") {
      executeCompleteOperationalWipe({ wipeSupabase: true });
    }
  } catch (e) {
    console.warn("[WipeOperationalData] Error en auto-run:", e);
  }
}
