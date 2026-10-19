"use client";

import { createClient } from "@/lib/supabase/client";

// Epoch timestamp for clean slate: all operational data and fictitious demo records before this epoch are discarded
export const CLEAN_SLATE_EPOCH = 1792447800000; // 2026-10-19T22:10:00.000Z
export const WIPE_VERSION_KEY = `brito_clean_slate_epoch_${CLEAN_SLATE_EPOCH}`;

const PRESERVED_ADMIN_USER_IDS = new Set(["usr-1", "usr-2"]);

function sanitizeStoredUsersToAdminsOnly() {
  if (typeof window === "undefined") return;
  try {
    const cleanList = (raw: string | null) => {
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return null;
        return parsed.filter((u: any) => u && PRESERVED_ADMIN_USER_IDS.has(String(u.id)));
      } catch {
        return null;
      }
    };

    const cleanedCustom = cleanList(localStorage.getItem("brito_custom_users"));
    if (cleanedCustom) {
      localStorage.setItem("brito_custom_users", JSON.stringify(cleanedCustom));
    } else {
      localStorage.removeItem("brito_custom_users");
    }

    const cleanedUsersList = cleanList(localStorage.getItem("brito_users_list"));
    if (cleanedUsersList) {
      localStorage.setItem("brito_users_list", JSON.stringify(cleanedUsersList));
    } else {
      localStorage.removeItem("brito_users_list");
    }

    const rawAuth = localStorage.getItem("brito_auth_user");
    if (rawAuth) {
      try {
        const authUser = JSON.parse(rawAuth);
        if (authUser && !PRESERVED_ADMIN_USER_IDS.has(String(authUser.id))) {
          localStorage.removeItem("brito_auth_user");
        }
      } catch {}
    }
  } catch {}
}

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
        "brito_inventory_items",
        "brito_inventory_movements",
        "brito_products",
        "brito_products_v6",
        "brito_customers",
        "brito_current_shift_start_timestamp",
      ];
      keysToEmpty.forEach((k) => {
        try {
          localStorage.setItem(k, "[]");
        } catch (e) {}
      });
      sanitizeStoredUsersToAdminsOnly();
      localStorage.setItem("brito_orders_initialized", "true");
      localStorage.setItem("brito_incomes_initialized", "true");
      localStorage.setItem("brito_gastos_initialized", "true");
      localStorage.setItem("brito_inventory_initialized", "true");
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
            k.startsWith("brito_current_shift_cashier_") ||
            k.startsWith("brito_current_shift_name_") ||
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
      window.dispatchEvent(new Event("brito_products_updated"));
      window.dispatchEvent(new Event("brito_customers_updated"));
      window.dispatchEvent(new Event("brito_inventory_updated"));
      window.dispatchEvent(new Event("brito_users_updated"));
      window.dispatchEvent(new Event("brito_branches_updated"));
      window.dispatchEvent(new Event("brito_branches_data_updated"));
    }
  } catch (e) {}
}

/**
 * Realiza un vaciado total y definitivo de datos operativos y ficticios:
 * - Conserva únicamente a los 2 administradores principales (Don Toño Brito y PAULINA BRITO)
 * - Limpia productos, clientes, inventario, ventas, pedidos, gastos, ingresos, cortes y notificaciones
 */
export async function executeCompleteOperationalWipe(options: { wipeSupabase?: boolean } = {}) {
  if (typeof window === "undefined") return;

  const { wipeSupabase = true } = options;

  console.log("[WipeOperationalData] Ejecutando vaciado definitivo de datos ficticios y operativos...");

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
    "brito_inventory_items",
    "brito_inventory_movements",
    "brito_products",
    "brito_products_v6",
    "brito_customers",
    "brito_current_shift_start_timestamp",
  ];

  keysToEmpty.forEach((key) => {
    try {
      localStorage.setItem(key, JSON.stringify([]));
    } catch (e) {
      console.warn("[WipeOperationalData] Error setting empty array for:", key, e);
    }
  });

  sanitizeStoredUsersToAdminsOnly();

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
          k.startsWith("brito_current_shift_cashier_") ||
          k.startsWith("brito_current_shift_name_") ||
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
    localStorage.setItem("brito_inventory_initialized", "true");
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
      await supabase.from("products").delete().neq("id", "none");
      await supabase.from("customers").delete().neq("id", "cli-general");
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
    window.dispatchEvent(new Event("brito_products_updated"));
    window.dispatchEvent(new Event("brito_customers_updated"));
    window.dispatchEvent(new Event("brito_inventory_updated"));
    window.dispatchEvent(new Event("brito_users_updated"));
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
