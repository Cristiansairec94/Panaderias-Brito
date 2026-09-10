import { SyncItem, SyncType } from "@/types";
import { createClient } from "@/lib/supabase/client";

export const STORAGE_SYNC_QUEUE_KEY = "brito_offline_sync_queue";
export const STORAGE_LAST_SYNC_KEY = "brito_last_sync_time";
export const STORAGE_SIMULATE_OFFLINE_KEY = "brito_simulate_offline";

// ─── LECTURA Y ESCRITURA DE LA COLA ──────────────────────────────────────────

export function getSyncQueue(): SyncItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_SYNC_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("[SyncService] Error al leer cola de sincronización:", err);
    return [];
  }
}

export function saveSyncQueue(queue: SyncItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_SYNC_QUEUE_KEY, JSON.stringify(queue));
    window.dispatchEvent(new Event("brito_sync_queue_updated"));
  } catch (err) {
    console.error("[SyncService] Error al guardar cola de sincronización:", err);
  }
}

export function enqueueSyncItem(params: {
  type: SyncType;
  title: string;
  amount?: number;
  branchId?: string;
  data: any;
}): SyncItem {
  const current = getSyncQueue();
  const newItem: SyncItem = {
    id: `sync_${params.type}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    type: params.type,
    title: params.title,
    amount: params.amount,
    branchId: params.branchId,
    data: params.data,
    createdAt: new Date().toISOString(),
    status: "pending",
    attempts: 0,
  };

  current.push(newItem);
  saveSyncQueue(current);
  console.log(`[SyncService] Encolado registro offline: ${newItem.title} (${newItem.id})`);
  return newItem;
}

export function removeSyncItem(id: string): void {
  const current = getSyncQueue();
  const filtered = current.filter((item) => item.id !== id);
  saveSyncQueue(filtered);
}

export function clearSyncQueue(): void {
  saveSyncQueue([]);
}

export function getPendingSyncCount(): number {
  return getSyncQueue().filter((item) => item.status === "pending" || item.status === "failed").length;
}

// ─── ESTADO DE ÚLTIMA SINCRONIZACIÓN ─────────────────────────────────────────

export function getLastSyncTime(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_LAST_SYNC_KEY);
}

export function setLastSyncTime(isoString: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_LAST_SYNC_KEY, isoString);
  window.dispatchEvent(new Event("brito_sync_time_updated"));
}

// ─── MODO SIMULAR OFFLINE (Para pruebas) ──────────────────────────────────────

export function isSimulatedOffline(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_SIMULATE_OFFLINE_KEY) === "true";
}

export function setSimulatedOffline(val: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_SIMULATE_OFFLINE_KEY, val ? "true" : "false");
  window.dispatchEvent(new Event("brito_network_status_changed"));
}

// ─── VERIFICACIÓN DE CONEXIÓN REAL ───────────────────────────────────────────

export async function checkRealOnlineStatus(): Promise<{
  isOnline: boolean;
  latencyMs?: number;
  detail: string;
}> {
  if (typeof window === "undefined") return { isOnline: false, detail: "Entorno no navegador" };

  // 1. Si el usuario activó la simulación forzada
  if (isSimulatedOffline()) {
    return { isOnline: false, detail: "Modo fuera de línea simulado activado para pruebas" };
  }

  // 2. Si el navegador reporta desconexión física de red
  if (!navigator.onLine) {
    return { isOnline: false, detail: "Dispositivo sin conexión a red (WiFi/Ethernet desconectado)" };
  }

  // 3. Ping real a la base de datos Supabase
  const startTime = Date.now();
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from("products")
      .select("id")
      .limit(1)
      .maybeSingle();

    const latency = Date.now() - startTime;
    if (error) {
      // Podría haber un error de autenticación o tabla, pero si respondió, hay conexión
      if (error.message?.includes("fetch") || error.message?.includes("network")) {
        return { isOnline: false, detail: "Fallo de red al contactar servidor Supabase" };
      }
      return { isOnline: true, latencyMs: latency, detail: "Servidor conectado (aviso: " + error.message + ")" };
    }

    return { isOnline: true, latencyMs: latency, detail: "Conexión activa con Supabase PostgreSQL" };
  } catch (err: any) {
    return {
      isOnline: false,
      detail: err?.message || "Sin acceso al servidor en la nube",
    };
  }
}

// ─── MOTOR DE SINCRONIZACIÓN AUTOMÁTICA ───────────────────────────────────────

export async function processSyncQueue(): Promise<{
  total: number;
  synced: number;
  failed: number;
  errors: string[];
}> {
  const status = await checkRealOnlineStatus();
  if (!status.isOnline) {
    return {
      total: getSyncQueue().length,
      synced: 0,
      failed: getSyncQueue().length,
      errors: [status.detail],
    };
  }

  const queue = getSyncQueue();
  if (queue.length === 0) {
    setLastSyncTime(new Date().toISOString());
    return { total: 0, synced: 0, failed: 0, errors: [] };
  }

  const supabase = createClient();
  let syncedCount = 0;
  let failedCount = 0;
  const errors: string[] = [];
  const remainingQueue: SyncItem[] = [];

  for (const item of queue) {
    try {
      if (item.type === "sale") {
        const { total, paymentMethod, cashier, items } = item.data;

        // 1. Insertar encabezado de venta
        const { data: saleData, error: saleErr } = await supabase
          .from("sales")
          .insert({
            total: Number(total),
            payment_method: paymentMethod || "efectivo",
            cashier: cashier || "Caja Mostrador",
          })
          .select()
          .single();

        if (saleErr || !saleData) {
          throw new Error(saleErr?.message || "Error al insertar venta en Supabase");
        }

        // 2. Insertar partidas de la venta
        if (Array.isArray(items) && items.length > 0) {
          const itemsPayload = items.map((it: any) => ({
            sale_id: saleData.id,
            product_id: it.productId && it.productId.includes("-") ? it.productId : null,
            product_name: it.name || it.productName || "Producto",
            quantity: Number(it.quantity) || 1,
            unit_price: Number(it.price || it.unitPrice) || 0,
            subtotal: Number(it.subtotal) || 0,
          }));

          const { error: itemsErr } = await supabase.from("sale_items").insert(itemsPayload);
          if (itemsErr) {
            console.warn("[SyncService] Error no bloqueante al insertar partidas:", itemsErr);
          }

          // 3. Descontar stock en Supabase
          for (const it of items) {
            if (it.productId && it.productId.includes("-")) {
              try {
                const { data: currentProd } = await supabase
                  .from("products")
                  .select("stock")
                  .eq("id", it.productId)
                  .single();

                if (currentProd) {
                  const newStock = Math.max(0, (currentProd.stock || 0) - (Number(it.quantity) || 1));
                  await supabase
                    .from("products")
                    .update({ stock: newStock })
                    .eq("id", it.productId);
                }
              } catch (stockErr) {
                console.warn("[SyncService] Error al actualizar stock:", stockErr);
              }
            }
          }
        }

        syncedCount++;
      } else if (item.type === "expense") {
        const { amount, category, description, cashier } = item.data;
        const { error: expErr } = await supabase.from("cash_expenses").insert({
          amount: Number(amount),
          category: category || "general",
          description: description || "Gasto de caja",
          cashier: cashier || "Don Toño Brito",
        });

        if (expErr) throw new Error(expErr.message);
        syncedCount++;
      } else {
        // Tipos adicionales o genéricos
        syncedCount++;
      }
    } catch (itemErr: any) {
      failedCount++;
      const msg = itemErr?.message || "Fallo desconocido al sincronizar registro";
      errors.push(`${item.title}: ${msg}`);
      remainingQueue.push({
        ...item,
        attempts: item.attempts + 1,
        lastAttempt: new Date().toISOString(),
        error: msg,
        status: "failed",
      });
    }
  }

  saveSyncQueue(remainingQueue);
  setLastSyncTime(new Date().toISOString());

  return {
    total: queue.length,
    synced: syncedCount,
    failed: failedCount,
    errors,
  };
}

// ─── EXPORTAR RESPALDO DE EMERGENCIA (JSON) ──────────────────────────────────

export function exportLocalEmergencyBackup(): void {
  if (typeof window === "undefined") return;

  const backupData = {
    exportedAt: new Date().toISOString(),
    system: "Panadería Brito ERP & POS",
    syncQueue: getSyncQueue(),
    lastSyncTime: getLastSyncTime(),
    recentSales: (() => {
      try {
        return JSON.parse(localStorage.getItem("brito_recent_sales") || "[]");
      } catch {
        return [];
      }
    })(),
    orders: (() => {
      try {
        return JSON.parse(localStorage.getItem("brito_custom_orders") || "[]");
      } catch {
        return [];
      }
    })(),
    cashIncomes: (() => {
      try {
        return JSON.parse(localStorage.getItem("brito_cash_incomes") || "[]");
      } catch {
        return [];
      }
    })(),
    shiftCuts: (() => {
      try {
        return JSON.parse(localStorage.getItem("brito_shift_cuts_history") || "[]");
      } catch {
        return [];
      }
    })(),
  };

  const jsonStr = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const dateSuffix = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  a.href = url;
  a.download = `respaldo_panaderia_brito_offline_${dateSuffix}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── PRECARGA DE CATÁLOGO COMPLETO PARA OFFLINE ──────────────────────────────

export async function preloadCatalogForOffline(): Promise<{
  success: boolean;
  count: number;
  message: string;
}> {
  try {
    const supabase = createClient();
    const { data: prodData, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (error || !prodData) {
      throw new Error(error?.message || "No se pudo consultar el catálogo de Supabase");
    }

    const mapped = prodData.map((p: any) => ({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      category: p.category_id || "pan_dulce",
      icon: p.icon || "🥐",
      stock: p.stock || 0,
      image: p.image || null,
      description: p.description || "",
      tag: `Pan $${p.price}`,
    }));

    localStorage.setItem("brito_products", JSON.stringify(mapped));
    window.dispatchEvent(new Event("brito_products_updated"));

    return {
      success: true,
      count: mapped.length,
      message: `Se precargaron ${mapped.length} productos en la memoria local para funcionar sin internet.`,
    };
  } catch (err: any) {
    return {
      success: false,
      count: 0,
      message: err?.message || "Error al precargar catálogo",
    };
  }
}
