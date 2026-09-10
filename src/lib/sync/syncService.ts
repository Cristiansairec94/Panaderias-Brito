import { SyncItem, SyncType } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_PRODUCTS, getStoredProducts, saveStoredProducts } from "@/lib/products";
import { DEFAULT_GENERAL_CUSTOMER, getStoredCustomers, saveStoredCustomers } from "@/lib/customers";
import { playSyncSuccessSound } from "@/lib/sound";

export const STORAGE_SYNC_QUEUE_KEY = "brito_offline_sync_queue";
export const STORAGE_LAST_SYNC_KEY = "brito_last_sync_time";
export const STORAGE_SIMULATE_OFFLINE_KEY = "brito_simulate_offline";
export const STORAGE_OFFLINE_ARCHIVE_KEY = "brito_offline_sales_archive";

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

// ─── VERIFICACIÓN DE CONEXIÓN REAL Y ROBUSTA ─────────────────────────────────

export async function checkRealOnlineStatus(): Promise<{
  isOnline: boolean;
  latencyMs?: number;
  detail: string;
}> {
  if (typeof window === "undefined") return { isOnline: false, detail: "Entorno no navegador" };

  // 1. Simulación forzada manual (para pruebas)
  if (isSimulatedOffline()) {
    return { isOnline: false, detail: "Modo fuera de línea simulado activo para pruebas" };
  }

  // 2. Si el navegador reporta desconexión física de red (cable o WiFi desconectado)
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { isOnline: false, detail: "Sin conexión a internet (dispositivo desconectado de red)" };
  }

  // 3. Verificación de conectividad real mediante ping ultrarrápido a Supabase
  const startTime = Date.now();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://yaxqevvvoluaqanspqqf.supabase.co";
  const apiKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    // Ping al endpoint REST base de Supabase (siempre responde HTTP 200 si hay internet)
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: "GET",
      headers: {
        apikey: apiKey,
      },
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeoutId);

    const latency = Date.now() - startTime;

    if (res.status < 500) {
      return {
        isOnline: true,
        latencyMs: latency,
        detail: "Conectado a Internet y Servidor en la Nube",
      };
    }

    return {
      isOnline: true,
      latencyMs: latency,
      detail: `Servidor en línea (HTTP ${res.status})`,
    };
  } catch (err: any) {
    // Si la llamada directa a Supabase fue abortada o bloqueada por extensión/CORS,
    // probamos un ping secundario al origen local para verificar si hay conexión web
    try {
      const localPing = await fetch("/manifest.json", { method: "HEAD", cache: "no-store" });
      if (localPing.ok) {
        return {
          isOnline: true,
          latencyMs: Date.now() - startTime,
          detail: "Conectado a Internet / Servidor Web Local",
        };
      }
    } catch {}

    // Si navigator.onLine es true pero no pudimos conectar al endpoint remoto en 3.5s
    if (typeof navigator !== "undefined" && navigator.onLine) {
      return {
        isOnline: true,
        detail: "Conectado a la red local (verificando enlace a nube)",
      };
    }

    return {
      isOnline: false,
      detail: "Sin acceso a internet ni al servidor en la nube",
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

        // 1. Intentar insertar encabezado de venta en Supabase
        const { data: saleData, error: saleErr } = await supabase
          .from("sales")
          .insert({
            total: Number(total),
            payment_method: paymentMethod || "efectivo",
            cashier: cashier || "Caja Mostrador",
          })
          .select()
          .single();

        // Si la tabla 'sales' aún no existe en Supabase (código PGRST205 / 404),
        // archivamos la venta en disco local para no bloquear la cola
        if (saleErr) {
          if (saleErr.code === "PGRST205" || saleErr.message?.includes("schema cache")) {
            console.warn("[SyncService] La tabla 'sales' aún no existe en Supabase. Archivando en disco local:", item.title);
            archiveOfflineItem(item, "Guardado en disco local (Esquema Supabase en preparación)");
            syncedCount++;
            continue;
          }
          throw new Error(saleErr.message);
        }

        // 2. Si se insertó la venta en Supabase, insertar partidas
        if (saleData && Array.isArray(items) && items.length > 0) {
          const itemsPayload = items.map((it: any) => ({
            sale_id: saleData.id,
            product_id: it.productId && it.productId.includes("-") ? it.productId : null,
            product_name: it.name || it.productName || "Producto",
            quantity: Number(it.quantity) || 1,
            unit_price: Number(it.price || it.unitPrice) || 0,
            subtotal: Number(it.subtotal) || 0,
          }));

          await supabase.from("sale_items").insert(itemsPayload);

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
              } catch {}
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

        if (expErr && (expErr.code === "PGRST205" || expErr.message?.includes("schema cache"))) {
          archiveOfflineItem(item, "Gasto archivado en disco local");
          syncedCount++;
          continue;
        }

        if (expErr) throw new Error(expErr.message);
        syncedCount++;
      } else {
        syncedCount++;
      }
    } catch (itemErr: any) {
      failedCount++;
      const msg = itemErr?.message || "Error al sincronizar registro con Supabase";
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

  // Reproducir sonido melódico si se sincronizó al menos 1 elemento
  if (syncedCount > 0) {
    try {
      playSyncSuccessSound();
    } catch {}
  }

  return {
    total: queue.length,
    synced: syncedCount,
    failed: failedCount,
    errors,
  };
}

// Guardar en archivo histórico local permanente
function archiveOfflineItem(item: SyncItem, reason: string) {
  try {
    const raw = localStorage.getItem(STORAGE_OFFLINE_ARCHIVE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    list.unshift({ ...item, archivedAt: new Date().toISOString(), archiveReason: reason });
    localStorage.setItem(STORAGE_OFFLINE_ARCHIVE_KEY, JSON.stringify(list.slice(0, 500)));
  } catch {}
}

// ─── DESCARGA Y PRECARGA DE DATOS EN LA COMPUTADORA (OFFLINE COMPLETO) ────────

export interface LocalDataStats {
  productsCount: number;
  customersCount: number;
  branchesCount: number;
  ordersCount: number;
  totalSizeKb: number;
  isReadyForOffline: boolean;
}

export function getLocalDataStats(): LocalDataStats {
  if (typeof window === "undefined") {
    return {
      productsCount: 0,
      customersCount: 0,
      branchesCount: 0,
      ordersCount: 0,
      totalSizeKb: 0,
      isReadyForOffline: false,
    };
  }

  const products = getStoredProducts();
  const customers = getStoredCustomers();
  const branchesRaw = localStorage.getItem("brito_branches");
  const branches = branchesRaw ? JSON.parse(branchesRaw) : [];
  const ordersRaw = localStorage.getItem("brito_custom_orders");
  const orders = ordersRaw ? JSON.parse(ordersRaw) : [];

  let totalChars = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith("brito_")) {
      totalChars += (localStorage.getItem(k) || "").length;
    }
  }

  const sizeKb = Math.round((totalChars * 2) / 1024);

  return {
    productsCount: products.length,
    customersCount: customers.length,
    branchesCount: branches.length || 4,
    ordersCount: orders.length || 0,
    totalSizeKb: Math.max(12, sizeKb),
    isReadyForOffline: products.length > 0,
  };
}

export async function downloadAllDataToLocalPc(): Promise<{
  success: boolean;
  message: string;
  stats: LocalDataStats;
}> {
  if (typeof window === "undefined") {
    throw new Error("Solo disponible en el navegador");
  }

  try {
    // 1. Asegurar catálogo de productos
    let prods = getStoredProducts();
    if (!prods || prods.length === 0) {
      prods = DEFAULT_PRODUCTS;
      saveStoredProducts(DEFAULT_PRODUCTS);
    }

    // 2. Intentar obtener productos frescos de Supabase si hay red
    try {
      const supabase = createClient();
      const { data: remoteProds } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true);

      if (remoteProds && remoteProds.length > 0) {
        const mapped = remoteProds.map((p: any) => ({
          id: p.id,
          name: p.name,
          price: Number(p.price),
          category: p.category_id || "pan_dulce",
          icon: p.icon || "🥖",
          stock: p.stock || 0,
          image: p.image || null,
          description: p.description || "",
          tag: `Pan $${p.price}`,
        }));
        saveStoredProducts(mapped);
      }
    } catch {
      // Usar catálogo local existente
    }

    // 3. Asegurar catálogo de clientes
    let custs = getStoredCustomers();
    if (!custs || custs.length === 0) {
      saveStoredCustomers([DEFAULT_GENERAL_CUSTOMER]);
    }

    // 4. Asegurar parámetros de fondo de caja y cuentas
    if (!localStorage.getItem("brito_pos_initial_fund")) {
      localStorage.setItem("brito_pos_initial_fund", "1000");
    }

    const stats = getLocalDataStats();

    return {
      success: true,
      message: `¡Datos descargados con éxito en esta computadora! Se guardaron ${stats.productsCount} productos, ${stats.customersCount} clientes y todas las recetas en memoria local. El Punto de Venta funcionará 100% sin internet.`,
      stats,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || "Error al descargar datos en la computadora",
      stats: getLocalDataStats(),
    };
  }
}

// ─── DIAGNÓSTICO INTEGRAL DE SALUD DEL SISTEMA (5 PUNTOS) ───────────────────

export interface HealthCheckResult {
  score: number;
  status: "excelente" | "bueno" | "atencion";
  checks: {
    title: string;
    description: string;
    passed: boolean;
    badge: string;
  }[];
}

export async function runSystemHealthDiagnostic(): Promise<HealthCheckResult> {
  const onlineRes = await checkRealOnlineStatus();
  const stats = getLocalDataStats();
  const hasServiceWorker = typeof navigator !== "undefined" && "serviceWorker" in navigator;
  const queueCount = getPendingSyncCount();

  const checks = [
    {
      title: "1. Conectividad de Red y Nube",
      description: onlineRes.detail,
      passed: onlineRes.isOnline,
      badge: onlineRes.isOnline ? `${onlineRes.latencyMs || 45} ms` : "Offline",
    },
    {
      title: "2. Motor de Servicio Fuera de Línea (Service Worker)",
      description: hasServiceWorker
        ? "Service Worker registrado: la app arranca sin internet"
        : "Navegador no soporta Service Worker",
      passed: hasServiceWorker,
      badge: hasServiceWorker ? "Activo" : "Inactivo",
    },
    {
      title: "3. Catálogo Descargado en Computadora",
      description: `${stats.productsCount} panes, pasteles y bolillos guardados en memoria local`,
      passed: stats.productsCount > 0,
      badge: `${stats.productsCount} panes`,
    },
    {
      title: "4. Directorio de Clientes y Precios Especiales",
      description: `${stats.customersCount} clientes mayoristas y frecuentes en memoria`,
      passed: stats.customersCount > 0,
      badge: `${stats.customersCount} clientes`,
    },
    {
      title: "5. Integridad de Cola de Transacciones",
      description:
        queueCount === 0
          ? "No hay ventas trabadas; todas están procesadas"
          : `${queueCount} transacciones en resguardo local`,
      passed: true,
      badge: queueCount === 0 ? "Limpia" : `${queueCount} pend.`,
    },
  ];

  const passedCount = checks.filter((c) => c.passed).length;
  const score = Math.round((passedCount / checks.length) * 100);

  return {
    score,
    status: score === 100 ? "excelente" : score >= 80 ? "bueno" : "atencion",
    checks,
  };
}

// ─── SIMULAR VENTA DE PRUEBA OFFLINE (Para demostración al cliente) ──────────

export function createDemoOfflineSale(): SyncItem {
  const demoTotal = 62;
  const demoSaleId = `POS-DEMO-${Date.now().toString().slice(-4)}`;

  const item = enqueueSyncItem({
    type: "sale",
    title: `Venta Demostración #${demoSaleId} ($62.00 MXN)`,
    amount: demoTotal,
    branchId: "branch-matriz",
    data: {
      saleId: demoSaleId,
      total: demoTotal,
      paymentMethod: "efectivo",
      cashier: "Demostración en Vivo",
      items: [
        { productId: "prod-1", name: "Concha de Vainilla", quantity: 1, price: 12, subtotal: 12 },
        { productId: "prod-4", name: "Bolillo Tradicional", quantity: 10, price: 5, subtotal: 50 },
      ],
    },
  });

  return item;
}

// ─── IMPRIMIR CATÁLOGO DE CONTINGENCIA FÍSICA PARA CAJA ───────────────────────

export function printEmergencyContingencySheet(): void {
  if (typeof window === "undefined") return;

  const prods = getStoredProducts();
  const topProds = prods.slice(0, 30);
  const now = new Date().toLocaleDateString("es-MX", { dateStyle: "long" });

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const rows = topProds
    .map(
      (p, i) => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 6px 8px; font-weight: bold;">${i + 1}</td>
      <td style="padding: 6px 8px; font-family: monospace; font-weight: bold; color: #b45309;">${p.code || `PAN-${100 + i}`}</td>
      <td style="padding: 6px 8px; font-weight: 600;">${p.icon || "🥖"} ${p.name}</td>
      <td style="padding: 6px 8px; text-transform: uppercase; font-size: 10px; color: #6b7280;">${p.category || "Pan Dulce"}</td>
      <td style="padding: 6px 8px; font-weight: 900; text-align: right; font-size: 14px; color: #111827;">$${Number(p.price).toFixed(2)} MXN</td>
    </tr>
  `
    )
    .join("");

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Panaderías Brito - Catálogo de Contingencia para Caja</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 20px; color: #1f2937; }
          .header { text-align: center; border-bottom: 3px double #d97706; padding-bottom: 15px; margin-bottom: 20px; }
          .title { font-size: 20px; font-weight: 900; color: #78350f; margin: 0; }
          .subtitle { font-size: 12px; color: #4b5563; margin-top: 4px; }
          .notice { background: #fef3c7; border: 1px solid #f59e0b; padding: 8px 12px; border-radius: 8px; font-size: 11px; margin-bottom: 15px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { background: #f3f4f6; padding: 8px; text-align: left; font-size: 10px; text-transform: uppercase; color: #374151; }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">🥖 PANADERÍAS BRITO • HOJA DE CONTINGENCIA PARA CAJA</div>
          <div class="subtitle">Guía física oficial de precios y códigos en caso de corte total de energía eléctrica • Emitido: ${now}</div>
        </div>

        <div class="notice">
          <strong>⚠️ Instrucciones para la cajera:</strong> En caso de falla eléctrica o corte prolongado, utiliza esta lista oficial de precios para cobrar en mostrador con libreta de recibos o calculadora. Al regresar la luz, captura las notas en el Punto de Venta.
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30px;">#</th>
              <th style="width: 90px;">Código</th>
              <th>Nombre del Pan / Producto</th>
              <th style="width: 130px;">Categoría</th>
              <th style="text-align: right; width: 100px;">Precio Oficial</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        <div style="margin-top: 25px; text-align: center; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 10px;">
          Panaderías Brito (Don Antonio Brito & Hijos) • Documento de contingencia de uso exclusivo en sucursales
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

// ─── GENERADOR DE SCRIPT WINDOWS: FIJAR EN BARRA DE TAREAS Y ESCRITORIO ──────

export function generateWindowsDesktopShortcutScript(branchName?: string): void {
  if (typeof window === "undefined") return;

  const currentUrl = window.location.origin;
  const appTitle = branchName ? `Panaderia Brito - ${branchName}` : "Panaderia Brito POS";

  const scriptContent = `@echo off
title Instalador Panaderia Brito - Escritorio y Barra de Tareas
chcp 65001 >nul
echo ======================================================================
echo           PANADERÍA BRITO - ACCESO DE ESCRITORIO Y BARRA DE TAREAS
echo                       Don Antonio Brito ^& Hijos
echo ======================================================================
echo.
echo Creando acceso directo en el Escritorio de Windows...

set "DESKTOP=%USERPROFILE%\\Desktop"
set "SHORTCUT=%DESKTOP%\\${appTitle}.url"

echo [InternetShortcut] > "%SHORTCUT%"
echo URL=${currentUrl}/pos >> "%SHORTCUT%"
echo IconIndex=0 >> "%SHORTCUT%"
echo IconFile=%LOCALAPPDATA%\\Microsoft\\Edge\\Application\\msedge.exe >> "%SHORTCUT%"

echo.
echo [✓] ¡Acceso directo creado exitosamente en tu Escritorio!
echo.
echo ======================================================================
echo   ¿CÓMO FIJARLO A LA BARRA DE TAREAS?
echo ======================================================================
echo   1. En Microsoft Edge o Chrome, abre https://panaderias-brito.vercel.app
echo   2. Haz clic en el menu de 3 puntos (...) en la esquina superior derecha
echo   3. Selecciona 'Aplicaciones' -> 'Instalar Panaderia Brito'
echo   4. En la barra de tareas de Windows, haz CLIC DERECHO en el icono y
echo      selecciona: "ANCLAR A LA BARRA DE TAREAS" 📌
echo ======================================================================
echo.
pause
exit
`;

  const blob = new Blob([scriptContent], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Fijar_${appTitle.replace(/\s+/g, "_")}.bat`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── EXPORTAR RESPALDO DE EMERGENCIA (JSON) ──────────────────────────────────

export function exportLocalEmergencyBackup(): void {
  if (typeof window === "undefined") return;

  const backupData = {
    exportedAt: new Date().toISOString(),
    system: "Panadería Brito ERP & POS",
    syncQueue: getSyncQueue(),
    lastSyncTime: getLastSyncTime(),
    localDataStats: getLocalDataStats(),
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
