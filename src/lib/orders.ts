import { CLEAN_SLATE_EPOCH } from "@/lib/wipeOperationalData";
import { CustomOrder, OrderItem, OrderPayment, CashIncome, Sale } from "@/types";
import { formatCurrency, formatDateTimeSafe, parseDateTimeSafe, getStoredShiftStartBoundary, resolveBranchId, formatTime24 } from "@/lib/utils";
import { realtimeHub } from "@/lib/realtime/realtimeHub";
import { createClient } from "@/lib/supabase/client";
import { enqueueSyncItem, markRecordIdsAsSynced } from "@/lib/sync/syncService";

export const STORAGE_ORDERS_KEY = "brito_custom_orders";

function formatNotificationHour(timestamp?: number): string {
  const ts = typeof timestamp === "number" && !isNaN(timestamp) && timestamp > 0 ? timestamp : Date.now();
  const d = new Date(ts);
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes} hrs`;
}

export const CANONICAL_BRANCH_NAMES: Record<string, string> = {
  "branch-matriz": "Sucursal Matriz (Centro)",
  "branch-sanjuan": "Sucursal San Juan",
  "branch-benito": "Sucursal San Benito (Mercado)",
  "branch-flores": "Sucursal Las Flores (Plaza)",
  "branch-angeles": "Sucursal Los Ángeles",
  "branch-1790889237862": "Sucursal San Ildefonso",
};

const RECENT_LOCAL_MUTATIONS = new Map<string, number>();

export function markOrderLocalMutation(order: Partial<CustomOrder> | null | undefined, ts: number = Date.now()) {
  if (!order) return;
  if (order.id) RECENT_LOCAL_MUTATIONS.set(order.id, ts);
  if (order.orderNumber) RECENT_LOCAL_MUTATIONS.set(order.orderNumber, ts);
}

export function hasRecentOrderLocalMutation(order: Partial<CustomOrder> | null | undefined, windowMs: number = 20000): boolean {
  if (!order) return false;
  const now = Date.now();
  const tsId = order.id ? RECENT_LOCAL_MUTATIONS.get(order.id) : undefined;
  const tsNum = order.orderNumber ? RECENT_LOCAL_MUTATIONS.get(order.orderNumber) : undefined;
  const ts = Math.max(tsId || 0, tsNum || 0);
  return ts > 0 && now - ts <= windowMs;
}

export const ORDER_STATUS_RANK: Record<string, number> = {
  pendiente: 0,
  en_horno: 1,
  listo: 2,
  entregado: 3,
  cancelado: 4,
};

export function orderToSupabasePayload(order: CustomOrder): any {
  // Destination/Pickup branch: where the customer picks up or receives the order
  const effPickupBranchId = resolveBranchId(order.branchId, undefined) || "branch-matriz";
  const effPickupBranchName = order.branchName || CANONICAL_BRANCH_NAMES[effPickupBranchId] || "Sucursal Matriz (Centro)";

  // Origin/Operating branch: where the cashier raised/created the order
  const rawNotes = order.notes || "";
  const originMatch = rawNotes.match(/\[Origen:\s*([^\|\]]+)(?:\|([^\]]+))?\]/);
  const originMetaId = originMatch ? originMatch[1].trim() : undefined;
  const originMetaName = originMatch && originMatch[2] ? originMatch[2].trim() : undefined;

  const cashierBranch = order.cashier ? resolveBranchId(undefined, order.cashier) : undefined;
  let effOperatingBranchId = originMetaId ? resolveBranchId(originMetaId, undefined) : undefined;
  if (!effOperatingBranchId && order.operatingBranchId && order.operatingBranchId !== order.branchId) {
    effOperatingBranchId = resolveBranchId(order.operatingBranchId, undefined);
  }
  if (!effOperatingBranchId && cashierBranch) {
    effOperatingBranchId = cashierBranch;
  }
  if (!effOperatingBranchId) {
    effOperatingBranchId = resolveBranchId(order.operatingBranchId || order.branchId, order.cashier);
  }

  const effOperatingBranchName =
    originMetaName ||
    (effOperatingBranchId && CANONICAL_BRANCH_NAMES[effOperatingBranchId]) ||
    order.operatingBranchName ||
    order.branchName ||
    "Sucursal Matriz (Centro)";

  // Embed origin branch and exact updated_at millisecond timestamp in notes metadata
  // so Supabase never loses modification timestamps across browser tabs
  let finalNotes = (order.notes || "").replace(/\[TS:[^\]]+\]/g, "").trim();
  if (effOperatingBranchId) {
    if (!finalNotes.includes("[Origen:")) {
      finalNotes = `[Origen: ${effOperatingBranchId}|${effOperatingBranchName}] ${finalNotes}`.trim();
    }
  }
  const effectiveTs = order.timestamp ? Number(order.timestamp) : Date.now();
  finalNotes = `[TS: ${effectiveTs}] ${finalNotes}`.trim();

  return {
    id: order.id || order.orderNumber,
    order_number: order.orderNumber || order.id,
    customer_id: order.customerId || null,
    customer_name: order.customerName || "Cliente Mostrador",
    phone: order.phone || "N/A",
    branch_id: effPickupBranchId,
    branch_name: effPickupBranchName,
    description: order.description || "Pedido de pastelería",
    items: Array.isArray(order.items) ? order.items : [],
    delivery_date: order.deliveryDate ? order.deliveryDate.split("T")[0].split(" ")[0] : new Date().toISOString().split("T")[0],
    delivery_time: order.deliveryTime || "16:00",
    delivery_type: order.deliveryType || "sucursal",
    delivery_address: order.deliveryAddress || null,
    status: order.status || "pendiente",
    total: Number(order.total) || 0,
    deposit: Number(order.deposit) || 0,
    remaining_balance: Number(order.remainingBalance) || 0,
    payment_status: order.paymentStatus || "anticipo",
    payment_method: order.paymentMethod || "efectivo",
    payments: Array.isArray(order.payments) ? order.payments : [],
    dedication: order.dedication || null,
    notes: finalNotes || null,
    cashier: order.cashier || "Don Toño Brito",
    shift_name: order.shiftName || null,
    created_at: order.createdAt || (order.timestamp ? new Date(order.timestamp).toISOString() : new Date().toISOString()),
  };
}

/**
 * Extrae y separa el nombre de la sucursal de origen y las notas limpias del cliente
 */
export function extractOrderOriginAndNotes(order?: Partial<CustomOrder> | { notes?: string | null; operatingBranchId?: string; operatingBranchName?: string; branchId?: string; branchName?: string } | null) {
  if (!order) {
    return {
      originId: undefined,
      originName: "Sucursal Matriz (Centro)",
      cleanNotes: "",
      isCrossBranch: false,
    };
  }

  const rawNotes = order.notes || "";
  const match = rawNotes.match(/\[Origen:\s*([^\|\]]+)(?:\|([^\]]+))?\]/);
  const cleanNotes = rawNotes
    .replace(/\[Origen:[^\]]+\]/g, "")
    .replace(/\[TS:[^\]]+\]/g, "")
    .trim();

  const originId = order.operatingBranchId || (match ? match[1].trim() : undefined) || order.branchId;
  const rawOriginName = order.operatingBranchName || (match && match[2] ? match[2].trim() : undefined) || order.branchName || "Sucursal Matriz (Centro)";
  const originName = rawOriginName.replace(/^branch-[^\s]+\s*/i, "").trim();

  const pickupName = order.branchName || "";
  const isCrossBranch = Boolean(
    (originId && order.branchId && originId !== order.branchId) ||
    (rawOriginName && pickupName && rawOriginName.toLowerCase().trim() !== pickupName.toLowerCase().trim())
  );

  return {
    originId,
    originName,
    cleanNotes,
    isCrossBranch,
  };
}

export function enqueueOrderOffline(order: CustomOrder) {
  if (typeof window === "undefined" || !order) return;
  try {
    enqueueSyncItem({
      type: "order",
      title: `Pedido ${order.orderNumber} - ${order.customerName}`,
      amount: order.deposit || order.total,
      branchId: order.branchId,
      data: order,
    });
  } catch (e) {
    console.warn("[Orders] Error encolando pedido offline:", e);
  }
}

export function broadcastOrderCreatedNotification(newOrder: CustomOrder) {
  if (typeof window === "undefined" || !realtimeHub?.broadcastNotification) return;
  const remaining = newOrder.remainingBalance || 0;
  const isCross = Boolean(
    newOrder.operatingBranchName &&
    newOrder.branchName &&
    newOrder.operatingBranchName.toLowerCase().trim() !== newOrder.branchName.toLowerCase().trim()
  );
  const branchSender = isCross
    ? `🎂 ${newOrder.operatingBranchName} ➔ ${newOrder.branchName}`
    : `🎂 Pedido Registrado (${newOrder.branchName || "Sucursal"})`;

  const notifPayload = {
    id: `notif-order-${newOrder.id}`,
    senderName: branchSender,
    senderAvatar: "🎂",
    badgeIcon: "pastel" as const,
    title: `Nuevo Pedido ${newOrder.orderNumber}: Total ${formatCurrency(newOrder.total)}`,
    highlightText: `${newOrder.customerName} • Anticipo: ${formatCurrency(newOrder.deposit)}${remaining > 0 ? ` (Resta: ${formatCurrency(remaining)})` : " (Liquidado)"}`,
    description: `${newOrder.description ? `${newOrder.description}. ` : ""}${isCross ? `[Levantado en: ${newOrder.operatingBranchName} • Entrega en: ${newOrder.branchName}] ` : `Recoge en: ${newOrder.branchName}. `}Entrega: ${newOrder.deliveryDate} a las ${newOrder.deliveryTime} hrs. Saldo restante: ${formatCurrency(remaining)}.`,
    timeAgo: formatNotificationHour(newOrder.timestamp),
    timestamp: newOrder.timestamp || Date.now(),
    group: "recientes" as const,
    read: false,
    category: "pedidos" as const,
    orderId: newOrder.id,
    branchId: newOrder.branchId,
    branchName: newOrder.branchName,
    operatingBranchId: newOrder.operatingBranchId,
    operatingBranchName: newOrder.operatingBranchName,
    actionLabel: remaining > 0 ? `Cobrar ${formatCurrency(remaining)}` : "Ver Detalle",
    actionLink: "/pedidos",
    secondaryActionLabel: remaining > 0 ? "Ver Detalle" : undefined,
    secondaryActionLink: remaining > 0 ? "/pedidos" : undefined,
    orderData: newOrder,
  };

  realtimeHub.broadcastNotification(notifPayload);
}

export async function persistOrderToSupabase(order: CustomOrder): Promise<boolean> {
  if (typeof window === "undefined" || !order) return false;
  const orderTs = order.timestamp ? Number(order.timestamp) : parseDateTimeSafe(order.createdAt);
  if (orderTs < CLEAN_SLATE_EPOCH) return false;
  try {
    const supabase = createClient();
    const payload = orderToSupabasePayload(order);
    let { error } = await supabase.from("custom_orders").upsert(payload, { onConflict: "id" });
    if (error) {
      // Si falla por FK de customer_id local o colisión de order_number previo, limpiar y reintentar
      const safePayload = { ...payload, customer_id: null };
      if (payload.order_number) {
        await supabase.from("custom_orders").delete().eq("order_number", payload.order_number).neq("id", payload.id);
      }
      const retry = await supabase.from("custom_orders").upsert(safePayload, { onConflict: "id" });
      error = retry.error;
    }
    if (error) {
      console.warn("[OrdersSupabase] Error al guardar pedido en Supabase, encolando offline:", error);
      enqueueOrderOffline(order);
      return false;
    } else {
      console.log("[OrdersSupabase] Pedido guardado exitosamente en Supabase:", payload.order_number);
      if (order.id) markRecordIdsAsSynced([order.id]);
      return true;
    }
  } catch (err) {
    console.warn("[OrdersSupabase] Excepción guardando pedido en Supabase (Modo Offline activo):", err);
    enqueueOrderOffline(order);
    return false;
  }
}

export async function persistOrderPaymentMovementToSupabase(params: {
  amount: number;
  orderNumber: string;
  orderId: string;
  customerName: string;
  cashier: string;
  branchId?: string;
  isLiquidation?: boolean;
}): Promise<boolean> {
  if (typeof window === "undefined" || params.amount <= 0) return false;
  const movId = `ING-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;
  const effBranch = resolveBranchId(params.branchId, params.cashier);
  try {
    const supabase = createClient();
    const { error } = await supabase.from("cash_movements").insert({
      id: movId,
      type: "entrada",
      category: "abono_pedido",
      category_label: params.isLiquidation ? "Liquidación de Pedido Especial" : "Anticipo de Pedido Especial",
      amount: params.amount,
      reason: `${params.isLiquidation ? "Liquidación final" : "Anticipo"} pedido ${params.orderNumber} - ${params.customerName}`,
      authorized_by: params.cashier || "Cajero",
      branch_id: effBranch,
    });
    if (error) {
      console.warn("[OrdersSupabase] Error registrando movimiento de dinero en Supabase, encolando offline:", error);
      enqueueSyncItem({
        type: "income",
        title: `${params.isLiquidation ? "Liquidación" : "Anticipo"} pedido ${params.orderNumber} (${params.customerName})`,
        amount: params.amount,
        branchId: effBranch,
        data: {
          id: movId,
          type: "entrada",
          category: "abono_pedido",
          category_label: params.isLiquidation ? "Liquidación de Pedido Especial" : "Anticipo de Pedido Especial",
          amount: params.amount,
          concept: `${params.isLiquidation ? "Liquidación final" : "Anticipo"} pedido ${params.orderNumber} - ${params.customerName}`,
          authorized_by: params.cashier || "Cajero",
          cashier: params.cashier || "Cajero",
          branchId: effBranch,
          orderId: params.orderId,
          orderNumber: params.orderNumber,
        },
      });
      return false;
    } else {
      markRecordIdsAsSynced([movId]);
      return true;
    }
  } catch (err) {
    console.warn("[OrdersSupabase] Excepción registrando movimiento en Supabase (Modo Offline):", err);
    try {
      enqueueSyncItem({
        type: "income",
        title: `${params.isLiquidation ? "Liquidación" : "Anticipo"} pedido ${params.orderNumber} (${params.customerName})`,
        amount: params.amount,
        branchId: effBranch,
        data: {
          id: movId,
          type: "entrada",
          category: "abono_pedido",
          category_label: params.isLiquidation ? "Liquidación de Pedido Especial" : "Anticipo de Pedido Especial",
          amount: params.amount,
          concept: `${params.isLiquidation ? "Liquidación final" : "Anticipo"} pedido ${params.orderNumber} - ${params.customerName}`,
          authorized_by: params.cashier || "Cajero",
          cashier: params.cashier || "Cajero",
          branchId: effBranch,
          orderId: params.orderId,
          orderNumber: params.orderNumber,
        },
      });
    } catch {}
    return false;
  }
}

export const INITIAL_ORDERS: CustomOrder[] = [];

export function normalizeOrder(order: any): CustomOrder {
  if (!order) return null as any;

  const total = Number(order.total) || 0;
  const deposit = Number(order.deposit) || 0;
  const rawRemaining = order.remaining_balance !== undefined ? Number(order.remaining_balance) : (order.remainingBalance !== undefined ? Number(order.remainingBalance) : undefined);
  const remaining = rawRemaining !== undefined && !isNaN(rawRemaining) ? Math.max(0, rawRemaining) : Math.max(0, total - deposit);
  const status = order.status || "pendiente";

  const orderNumber = order.orderNumber || order.order_number || order.id || `PED-${Date.now().toString().slice(-3)}`;
  const id = order.id || order.order_id || orderNumber;

  const customerId = order.customerId || order.customer_id || undefined;
  const customerName = order.customerName || order.customer_name || "Cliente Mostrador";
  const phone = order.phone || "N/A";

  const rawNotes = order.notes || "";
  const tsMatch = rawNotes.match(/\[TS:\s*(\d+)\]/);
  const tsFromNotes = tsMatch ? Number(tsMatch[1]) : 0;
  const originMatch = rawNotes.match(/\[Origen:\s*([^\|\]]+)(?:\|([^\]]+))?\]/);
  const originBranchId = originMatch ? originMatch[1].trim() : undefined;
  const originBranchName = originMatch && originMatch[2] ? originMatch[2].trim() : undefined;

  // Pickup Branch (branch_id en Supabase)
  const branchId = order.branchId || order.branch_id || "branch-matriz";
  const branchName = order.branchName || order.branch_name || CANONICAL_BRANCH_NAMES[branchId] || "Sucursal Matriz (Centro)";

  const cashier = order.cashier || "Don Toño Brito";
  const cashierBranchId = cashier ? resolveBranchId(undefined, cashier) : undefined;

  // Operating Branch (Origen donde se levantó/cobró el pedido)
  let operatingBranchId = originBranchId || order.operatingBranchId || order.operating_branch_id;
  let operatingBranchName = originBranchName || order.operatingBranchName || order.operating_branch_name;

  if (!operatingBranchId || (operatingBranchId === branchId && cashierBranchId && cashierBranchId !== branchId)) {
    if (cashierBranchId) {
      operatingBranchId = cashierBranchId;
      operatingBranchName = CANONICAL_BRANCH_NAMES[cashierBranchId] || operatingBranchName || branchName;
    } else {
      operatingBranchId = branchId;
      operatingBranchName = branchName;
    }
  }

  // Ensure origin metadata is stamped in notes if operating branch differs from pickup, and strip internal [TS: ...]
  let notes = rawNotes.replace(/\[TS:[^\]]+\]/g, "").trim();
  if (operatingBranchId && operatingBranchId !== branchId && !notes.includes("[Origen:")) {
    notes = `[Origen: ${operatingBranchId}|${operatingBranchName}] ${notes}`.trim();
  }

  const rawDate = order.deliveryDate || order.delivery_date;
  const deliveryDate = rawDate ? String(rawDate).split("T")[0].split(" ")[0] : new Date().toISOString().split("T")[0];

  const deliveryTime = order.deliveryTime || order.delivery_time || (rawDate && String(rawDate).includes(" ") ? String(rawDate).split(" ")[1] : "16:00");
  const deliveryType = order.deliveryType || order.delivery_type || "sucursal";
  const deliveryAddress = order.deliveryAddress || order.delivery_address || undefined;

  const paymentStatus = order.paymentStatus || order.payment_status || (remaining === 0 ? "liquidado" : deposit > 0 ? "anticipo" : "sin_anticipo");
  const paymentMethod = order.paymentMethod || order.payment_method || "efectivo";

  const rawCreated = order.createdAt || order.created_at || new Date().toISOString();
  const createdAt = typeof rawCreated === "string" ? rawCreated : new Date(rawCreated).toISOString();
  const createdTs = parseDateTimeSafe(createdAt) || Date.now();
  const explicitTs = order.timestamp ? Number(order.timestamp) : 0;
  const timestamp = Math.max(explicitTs, tsFromNotes, createdTs);

  const shiftName = order.shiftName || order.shift_name || undefined;

  let items = Array.isArray(order.items) && order.items.length > 0 ? order.items : [];
  if (items.length === 0) {
    items = [
      {
        name: order.description || "Pedido Especial",
        quantity: 1,
        unitPrice: total,
        subtotal: total,
      },
    ];
  }

  let payments = Array.isArray(order.payments) ? order.payments : [];
  if (payments.length === 0 && deposit > 0) {
    payments = [
      {
        id: `PAY-${orderNumber}-0`,
        date: formatDateTimeSafe(createdTs),
        amount: deposit,
        paymentMethod: paymentMethod,
        cashier: cashier,
        notes: "Anticipo inicial registrado",
      },
    ];
  }

  return {
    id,
    orderNumber,
    customerId,
    customerName,
    phone,
    branchId,
    branchName,
    operatingBranchId,
    operatingBranchName,
    description: order.description || (items.length > 0 ? items.map((it: any) => `${it.quantity}x ${it.name}`).join(", ") : "Pedido de panadería"),
    items,
    deliveryDate,
    deliveryTime,
    deliveryType,
    deliveryAddress,
    status,
    total,
    deposit,
    remainingBalance: remaining,
    paymentStatus,
    paymentMethod,
    dedication: order.dedication || "",
    notes,
    createdAt,
    timestamp,
    shiftName,
    cashier,
    payments,
  };
}

export interface OrderShiftCollection {
  isInShift: boolean;
  isCreatedInShift: boolean;
  orderTotalInShift: number;
  collectedTotal: number;
  collectedCash: number;
  collectedCard: number;
  collectedTransfer: number;
}

/**
 * Calcula con precisión contable cuánto dinero de un pedido especial ingresó
 * estrictamente dentro del turno activo (>= shiftBoundary), evitando que pedidos
 * de días o turnos anteriores inflen la caja actual.
 */
export function getOrderShiftCollection(order: any, shiftBoundary: number, targetBranchId?: string): OrderShiftCollection {
  const empty: OrderShiftCollection = {
    isInShift: false,
    isCreatedInShift: false,
    orderTotalInShift: 0,
    collectedTotal: 0,
    collectedCash: 0,
    collectedCard: 0,
    collectedTransfer: 0,
  };
  if (!order || order.status === "cancelado") return empty;

  const effectiveBoundary = Math.max(shiftBoundary || 0, CLEAN_SLATE_EPOCH);

  const rawNotes = String(order.notes || "");
  const originMatch = rawNotes.match(/\[Origen:\s*([^\|\]\r\n]+)(?:\|([^\]\r\n]+))?\]/);
  const originBranchId = originMatch && originMatch[1] ? originMatch[1].trim() : undefined;
  const opId = order.operatingBranchId || order.operating_branch_id;
  const pId = order.branchId || order.branch_id;
  const ordCashierBranch = order.cashier && !/don toño|admin|carlos/i.test(String(order.cashier))
    ? resolveBranchId(undefined, order.cashier)
    : undefined;
  const orderOriginBranch = originBranchId
    ? resolveBranchId(originBranchId, order.cashier)
    : opId
    ? resolveBranchId(opId, order.cashier)
    : (ordCashierBranch || resolveBranchId(pId, order.cashier));

  const createdRaw = order.createdAt || order.created_at || order.date;
  const createdTs = parseDateTimeSafe(createdRaw);
  const isOriginBranchMatch = !targetBranchId || targetBranchId === "all" || orderOriginBranch === targetBranchId;
  const isCreatedInShift = isOriginBranchMatch && createdTs > effectiveBoundary && createdTs <= Date.now() + 60000;

  const total = Number(order.total) || 0;
  const deposit = Number(order.deposit) || 0;
  const defaultMethod = (order.paymentMethod || order.payment_method || "efectivo") as "efectivo" | "tarjeta" | "transferencia";
  const payments: any[] = Array.isArray(order.payments) ? order.payments : [];

  let cash = 0;
  let card = 0;
  let transfer = 0;

  if (payments.length > 0) {
    for (let i = 0; i < payments.length; i++) {
      const p = payments[i];
      if (!p) continue;
      const amt = Number(p.amount) || 0;
      if (amt <= 0) continue;

      const pCashier = p.cashier || order.cashier;
      const pBranch = p.operatingBranchId
        ? resolveBranchId(p.operatingBranchId, pCashier)
        : (pCashier && !/don toño|admin|carlos/i.test(String(pCashier))
            ? resolveBranchId(undefined, pCashier)
            : orderOriginBranch);

      if (targetBranchId && targetBranchId !== "all" && pBranch !== targetBranchId) {
        continue;
      }

      const rawPTs = parseDateTimeSafe((p as any).timestamp || p.date || (p as any).createdAt);
      const pTs = i === 0 && createdTs > 0 ? createdTs : Math.max(rawPTs, createdTs);

      if (pTs > effectiveBoundary && pTs <= Date.now() + 60000) {
        const m = p.paymentMethod || defaultMethod;
        if (m === "tarjeta") card += amt;
        else if (m === "transferencia") transfer += amt;
        else cash += amt;
      }
    }
  } else if (isCreatedInShift && deposit > 0) {
    if (defaultMethod === "tarjeta") card = deposit;
    else if (defaultMethod === "transferencia") transfer = deposit;
    else cash = deposit;
  }

  const collectedTotal = cash + card + transfer;
  if (isCreatedInShift || collectedTotal > 0) {
    return {
      isInShift: true,
      isCreatedInShift,
      orderTotalInShift: isCreatedInShift ? total : collectedTotal,
      collectedTotal,
      collectedCash: cash,
      collectedCard: card,
      collectedTransfer: transfer,
    };
  }

  return empty;
}

/**
 * Extrae o reconstruye un CustomOrder completo a partir de los datos enriquecidos de una notificación,
 * garantizando que el historial de pedidos y las notificaciones estén 100% vinculados y sincronizados.
 */
export function extractOrderFromNotification(notif: any): CustomOrder | null {
  if (!notif) return null;

  try {
    // 1. Si la notificación ya contiene el objeto de pedido completo incrustado
    if (notif.orderData && (notif.orderData.id || notif.orderData.orderNumber)) {
      return normalizeOrder(notif.orderData);
    }

    const fullText = `${notif.id || ""} ${notif.title || ""} ${notif.highlightText || ""} ${notif.description || ""} ${notif.senderName || ""}`;
    const fullTextLower = fullText.toLowerCase();

    const isPedido =
      notif.category === "pedidos" ||
      Boolean(notif.orderId) ||
      fullTextLower.includes("ped-") ||
      fullTextLower.includes("pedido") ||
      fullTextLower.includes("liquidado") ||
      fullTextLower.includes("anticipo") ||
      fullTextLower.includes("abono");

    if (!isPedido) return null;

    // Folio (ej. "PED-101")
    const folioMatch = fullText.match(/PED[-_]?(\d+)/i);
    const folio = folioMatch ? `PED-${folioMatch[1]}` : (notif.orderId || "PED-101");

    // Montos: Total, Anticipo, Saldo Restante
    const totalMatch = fullText.match(/Total\s*\$?([\d,]+(?:\.\d+)?)/i);
    const depositMatch = fullText.match(/Anticipo:\s*\$?([\d,]+(?:\.\d+)?)/i);
    const balanceMatch = fullText.match(/(?:Saldo restante|Resta)[:\s]*\$?([\d,]+(?:\.\d+)?)/i);

    let total = totalMatch ? parseFloat(totalMatch[1].replace(/,/g, "")) : 0;
    let deposit = depositMatch ? parseFloat(depositMatch[1].replace(/,/g, "")) : 0;
    let balance = balanceMatch ? parseFloat(balanceMatch[1].replace(/,/g, "")) : Math.max(0, total - deposit);

    const isLiquidado =
      fullTextLower.includes("liquidado") ||
      fullTextLower.includes("100% pagado") ||
      balance === 0 ||
      (deposit >= total && total > 0);

    if (isLiquidado) {
      if (total === 0 && deposit > 0) total = deposit;
      if (deposit === 0 && total > 0) deposit = total;
      balance = 0;
    } else if (deposit === 0 && balance > 0 && total > balance) {
      deposit = total - balance;
    } else if (total === 0 && (deposit > 0 || balance > 0)) {
      total = deposit + balance;
    }

    // Nombre de cliente: extraer texto antes de viñeta • o guion -
    let customerName = "Cliente";
    if (notif.highlightText) {
      const parts = notif.highlightText.split(/[•\-]/);
      const cand = parts[0]?.trim();
      if (cand && cand.length > 1 && !cand.toLowerCase().startsWith("pedido") && !cand.toLowerCase().startsWith("corte")) {
        customerName = cand;
      }
    }

    // Rutas y sucursales (Origen y Destino/Recogida)
    const routeMatch = fullText.match(/(?:🎂\s*)?([^\➔\-]+)\s*[➔\-]\s*([^\]\.\,\(]+)/);
    const originMatch = fullText.match(/Levantado en:\s*([^•\]]+)/i);
    const destMatch = fullText.match(/(?:Entrega en|Recoge en):\s*([^\]\.\,]+)/i);

    const rawOrigin = originMatch ? originMatch[1].trim() : routeMatch ? routeMatch[1].trim() : notif.operatingBranchName || notif.branchName;
    const rawDest = destMatch ? destMatch[1].trim() : routeMatch ? routeMatch[2].trim() : notif.branchName;

    const pickupBranchId = notif.branchId || resolveBranchId(rawDest, undefined) || "branch-matriz";
    const pickupBranchName = notif.branchName || CANONICAL_BRANCH_NAMES[pickupBranchId] || rawDest || "Sucursal Matriz (Centro)";

    const operatingBranchId = notif.operatingBranchId || resolveBranchId(rawOrigin, undefined) || pickupBranchId;
    const operatingBranchName = notif.operatingBranchName || CANONICAL_BRANCH_NAMES[operatingBranchId] || rawOrigin || pickupBranchName;

    // Fecha y hora de entrega
    const dateMatch = fullText.match(/Entrega:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/i);
    const timeMatch = fullText.match(/(?:a las|hrs)[:\s]*([0-9]{1,2}:[0-9]{2})/i);

    const deliveryDate = dateMatch ? dateMatch[1] : new Date(Date.now() + 86400000).toISOString().split("T")[0];
    const deliveryTime = timeMatch ? timeMatch[1] : "16:00";

    // Estado operativo
    let status: CustomOrder["status"] = "pendiente";
    if (fullTextLower.includes("entregad")) {
      status = "entregado";
    } else if (fullTextLower.includes("listo en sucursal") || fullTextLower.includes("producto listo")) {
      status = "listo";
    } else if (fullTextLower.includes("cancelad") || fullTextLower.includes("dado de baja")) {
      status = "cancelado";
    }

    // Descripción
    let description = notif.description || `Pedido Especial ${folio}`;
    const cleanDescMatch = description.match(/^([^\[\.]+)/);
    const itemDesc = cleanDescMatch ? cleanDescMatch[1].trim() : description;

    const ts = notif.timestamp || (notif.createdAt ? new Date(notif.createdAt).getTime() : Date.now());

    return normalizeOrder({
      id: notif.orderId || folio,
      orderNumber: folio,
      customerName,
      phone: "55 1234 5678",
      branchId: pickupBranchId,
      branchName: pickupBranchName,
      operatingBranchId: operatingBranchId,
      operatingBranchName: operatingBranchName,
      description: itemDesc || `Pedido Especial ${folio}`,
      deliveryDate,
      deliveryTime,
      deliveryType: fullTextLower.includes("domicilio") ? "domicilio" : "sucursal",
      status,
      total,
      deposit,
      remainingBalance: balance,
      paymentStatus: isLiquidado ? "liquidado" : deposit > 0 ? "anticipo" : "sin_anticipo",
      paymentMethod: "efectivo",
      dedication: "",
      notes: `[Origen: ${operatingBranchId}|${operatingBranchName}] ${notif.description || ""}`.trim(),
      createdAt: new Date(ts).toISOString(),
      timestamp: ts,
      cashier: "Don Toño Brito",
      items: [
        {
          name: itemDesc || `Pedido Especial (${folio})`,
          quantity: 1,
          unitPrice: total,
          subtotal: total,
          notes: isLiquidado ? "Liquidado al 100%" : `Anticipo registrado de $${deposit.toFixed(2)}`,
        },
      ],
      payments: deposit > 0 ? [
        {
          id: `PAY-${folio}-0`,
          date: new Date(ts).toLocaleDateString("es-MX", { dateStyle: "short" }),
          amount: deposit,
          paymentMethod: "efectivo",
          cashier: "Don Toño Brito",
          notes: isLiquidado ? "Liquidación completa" : "Anticipo inicial",
        },
      ] : [],
    });
  } catch (err) {
    console.error("Error reconstruyendo pedido de notificación:", err);
    return null;
  }
}

export function reconcileOrderPair(
  serverOrd: CustomOrder,
  localOrd: CustomOrder,
  isLocallyMutated: boolean
): { winner: CustomOrder; shouldPushLocal: boolean } {
  const serverRank = ORDER_STATUS_RANK[serverOrd.status] ?? 0;
  const localRank = ORDER_STATUS_RANK[localOrd.status] ?? 0;
  const serverDeposit = Number(serverOrd.deposit) || 0;
  const localDeposit = Number(localOrd.deposit) || 0;
  const serverPaymentsCount = Array.isArray(serverOrd.payments) ? serverOrd.payments.length : 0;
  const localPaymentsCount = Array.isArray(localOrd.payments) ? localOrd.payments.length : 0;
  const serverTs = serverOrd.timestamp || parseDateTimeSafe(serverOrd.createdAt) || 0;
  const localTs = localOrd.timestamp || parseDateTimeSafe(localOrd.createdAt) || 0;

  // 1. Si esta pestaña acaba de modificar este pedido recientemente, prevalece el cambio local
  if (isLocallyMutated && localTs >= serverTs) {
    const localDiffers =
      localOrd.status !== serverOrd.status ||
      localDeposit !== serverDeposit ||
      localPaymentsCount !== serverPaymentsCount ||
      localOrd.remainingBalance !== serverOrd.remainingBalance;
    return { winner: localOrd, shouldPushLocal: localDiffers };
  }

  // 2. Protección estricta contra regresión de estado:
  // Una pestaña pasiva jamás debe revertir un pedido "entregado", "cancelado" o "listo" a "pendiente"
  if (serverRank > localRank) {
    return { winner: serverOrd, shouldPushLocal: false };
  }
  if (localRank > serverRank) {
    return { winner: localOrd, shouldPushLocal: true };
  }

  // 3. Protección estricta contra pérdida de abonos o liquidación
  if (serverDeposit > localDeposit || serverPaymentsCount > localPaymentsCount) {
    return { winner: serverOrd, shouldPushLocal: false };
  }
  if (localDeposit > serverDeposit || localPaymentsCount > serverPaymentsCount) {
    return { winner: localOrd, shouldPushLocal: true };
  }

  // 4. Si ambos tienen el mismo estado y pagos, prevalece el servidor salvo mutación local más reciente
  if (isLocallyMutated && localTs > serverTs) {
    return { winner: localOrd, shouldPushLocal: true };
  }
  return { winner: serverOrd, shouldPushLocal: false };
}

export function getStoredOrders(): CustomOrder[] {
  if (typeof window === "undefined") {
    return INITIAL_ORDERS;
  }

  try {
    const isOrdersInit = localStorage.getItem("brito_orders_initialized") === "true";
    const raw = localStorage.getItem(STORAGE_ORDERS_KEY);
    let epochFiltered: any[] = [];
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        epochFiltered = parsed.filter((o: any) => {
          const ts = o.timestamp ? Number(o.timestamp) : parseDateTimeSafe(o.createdAt || o.created_at);
          return ts >= CLEAN_SLATE_EPOCH;
        });
      }
    }

    // Sincronización y vinculación 100% garantizada con notificaciones:
    // Si una notificación de pedido existe en el almacenamiento, debe existir obligatoriamente en el historial
    let changed = false;
    try {
      const notifsRaw = localStorage.getItem("brito_notifications");
      if (notifsRaw) {
        const notifs = JSON.parse(notifsRaw);
        if (Array.isArray(notifs) && notifs.length > 0) {
          for (const n of notifs) {
            const isPedido =
              n.category === "pedidos" ||
              Boolean(n.orderId) ||
              (n.title && n.title.toLowerCase().includes("ped-")) ||
              (n.title && n.title.toLowerCase().includes("pedido"));

            if (isPedido) {
              const existingIdx = epochFiltered.findIndex(
                (o: any) =>
                  (n.orderId && (o.id === n.orderId || o.orderNumber === n.orderId || o.order_number === n.orderId)) ||
                  (n.title && o.orderNumber && n.title.includes(o.orderNumber))
              );
              const recovered = extractOrderFromNotification(n);
              if (existingIdx === -1) {
                if (recovered) {
                  epochFiltered.unshift(recovered);
                  changed = true;
                }
              } else if (recovered) {
                const existingOrd = normalizeOrder(epochFiltered[existingIdx]);
                const recRank = ORDER_STATUS_RANK[recovered.status] ?? 0;
                const exRank = ORDER_STATUS_RANK[existingOrd.status] ?? 0;
                if (recRank > exRank) {
                  epochFiltered[existingIdx] = {
                    ...existingOrd,
                    status: recovered.status,
                    timestamp: Math.max(existingOrd.timestamp || 0, recovered.timestamp || 0),
                  };
                  changed = true;
                }
              }
            }
          }
        }
      }
    } catch (notifErr) {
      console.warn("Error reconciliando notificaciones con pedidos en getStoredOrders:", notifErr);
    }

    if (changed || (raw && epochFiltered.length !== JSON.parse(raw).length)) {
      localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(epochFiltered));
    } else if (!raw && !isOrdersInit) {
      localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(INITIAL_ORDERS));
    }

    return epochFiltered.map(normalizeOrder);
  } catch (err) {
    console.error("Error loading stored orders:", err);
    return INITIAL_ORDERS;
  }
}

export function saveStoredOrders(orders: CustomOrder[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(orders));
    window.dispatchEvent(new Event("brito_orders_updated"));
  } catch (err) {
    console.error("Error saving stored orders:", err);
  }
}

/**
 * Sincroniza pedidos bidireccionalmente con Supabase y el servidor para que todos los perfiles
 * (administrador, cajeros como Silvia Puga, tablets) vean el 100% de los pedidos en tiempo real.
 */
export async function syncOrdersWithServer(): Promise<CustomOrder[]> {
  if (typeof window === "undefined") return INITIAL_ORDERS;

  try {
    const localOrders = getStoredOrders();
    let serverOrders: CustomOrder[] = [];
    let fetchedFromSupabase = false;

    // 1. Consultar directamente pedidos maestros en Supabase
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("custom_orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data)) {
        fetchedFromSupabase = true;
        if (data.length > 0) {
          serverOrders = data
            .filter((o: any) => {
              const ts = o.timestamp ? Number(o.timestamp) : parseDateTimeSafe(o.created_at);
              return ts >= CLEAN_SLATE_EPOCH;
            })
            .map(normalizeOrder);
        }
      }
    } catch (dbErr) {
      console.warn("[OrdersSync] Supabase no disponible temporalmente:", dbErr);
    }

    // 2. Si Supabase no devolvió pedidos, consultar /api/orders como fallback
    if (!fetchedFromSupabase && serverOrders.length === 0) {
      try {
        const res = await fetch("/api/orders", { method: "GET" });
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.orders)) {
            serverOrders = json.orders
              .filter((o: any) => {
                const ts = o.timestamp ? Number(o.timestamp) : parseDateTimeSafe(o.createdAt || o.created_at);
                return ts >= CLEAN_SLATE_EPOCH;
              })
              .map(normalizeOrder);
          }
        }
      } catch (apiErr) {
        console.warn("[OrdersSync] API fallback no disponible:", apiErr);
      }
    }

    // 3. Reconciliación / Merge inteligente de pedidos locales y de servidor
    const ordersMap = new Map<string, CustomOrder>();

    // Primero los de servidor
    for (const ord of serverOrders) {
      const norm = normalizeOrder(ord);
      if (norm.id) ordersMap.set(norm.id, norm);
      if (norm.orderNumber) ordersMap.set(norm.orderNumber, norm);
    }

    // Reconciliar con locales
    let hasLocalChangesToPush = false;
    const pendingPushList: CustomOrder[] = [];

    for (const rawOrd of localOrders) {
      const ord = normalizeOrder(rawOrd);
      const localTs = ord.timestamp || (ord.createdAt ? new Date(ord.createdAt).getTime() : 0);
      if (localTs < CLEAN_SLATE_EPOCH) continue;

      const existing = (ord.id && ordersMap.get(ord.id)) || (ord.orderNumber && ordersMap.get(ord.orderNumber));
      const isLocallyMutated = hasRecentOrderLocalMutation(ord);

      if (!existing) {
        // Pedido local que aún no existe en el servidor:
        // JAMÁS debe descartarse ni borrarse del almacenamiento local.
        // Se preserva en el mapa y se añade a la lista pendiente de subir a Supabase y al servidor.
        if (ord.id) ordersMap.set(ord.id, ord);
        if (ord.orderNumber) ordersMap.set(ord.orderNumber, ord);
        hasLocalChangesToPush = true;
        pendingPushList.push(ord);
      } else {
        const { winner, shouldPushLocal } = reconcileOrderPair(existing, ord, isLocallyMutated);
        if (winner.id) ordersMap.set(winner.id, winner);
        if (winner.orderNumber) ordersMap.set(winner.orderNumber, winner);
        if (shouldPushLocal) {
          hasLocalChangesToPush = true;
          pendingPushList.push(winner);
        }
      }
    }

    // Deduplicar por id único
    const uniqueOrders = new Map<string, CustomOrder>();
    for (const ord of ordersMap.values()) {
      const uniqueKey = ord.id || ord.orderNumber;
      if (uniqueKey && !uniqueOrders.has(uniqueKey)) {
        uniqueOrders.set(uniqueKey, ord);
      }
    }

    const mergedList = Array.from(uniqueOrders.values()).sort((a, b) => {
      const timeA = a.timestamp || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const timeB = b.timestamp || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return timeB - timeA;
    });

    // Guardar en el almacenamiento local del dispositivo (celular o PC)
    localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(mergedList));
    window.dispatchEvent(new Event("brito_orders_updated"));

    // Subir pedidos locales faltantes o actualizados a Supabase y al endpoint de respaldo
    if (hasLocalChangesToPush && pendingPushList.length > 0) {
      const validPending = pendingPushList.filter((o) => {
        const ts = o.timestamp ? Number(o.timestamp) : parseDateTimeSafe(o.createdAt);
        return ts >= CLEAN_SLATE_EPOCH;
      });

      if (validPending.length > 0) {
        try {
          const supabase = createClient();
          const payloads = validPending.map(orderToSupabasePayload);
          supabase.from("custom_orders").upsert(payloads, { onConflict: "id" }).then(({ error }) => {
            if (!error) {
              markRecordIdsAsSynced(validPending.map((p) => p.id));
            }
          });
        } catch {}

        for (const p of validPending) {
          if (p.deposit > 0) {
            persistOrderPaymentMovementToSupabase({
              amount: p.deposit,
              orderNumber: p.orderNumber,
              orderId: p.id,
              customerName: p.customerName,
              cashier: p.cashier,
              branchId: p.operatingBranchId || p.branchId,
              isLiquidation: p.remainingBalance === 0,
            });
          }
          if (realtimeHub?.broadcastOrder) {
            realtimeHub.broadcastOrder("create", p);
          }
          broadcastOrderCreatedNotification(p);
        }

        fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orders: validPending }),
        }).catch((e) => console.warn("[OrdersSync] Error actualizando cambios al servidor:", e));
      }
    }

    return mergedList;
  } catch (err) {
    console.error("[OrdersSync] Error sincronizando pedidos con servidor:", err);
    return getStoredOrders();
  }
}

// Sincronizar reactivamente pedidos especiales recibidos de otros dispositivos
if (typeof window !== "undefined" && realtimeHub?.onOrder) {
  realtimeHub.onOrder(({ action, order }) => {
    try {
      if (!order) return;
      const current = getStoredOrders();
      if (action === "create") {
        markOrderLocalMutation(order, order.timestamp || Date.now());
        if (!current.some((o) => o.id === order.id || o.orderNumber === order.orderNumber)) {
          saveStoredOrders([order, ...current]);
        }
      } else if (action === "payment" || action === "status") {
        markOrderLocalMutation(order, order.timestamp || Date.now());
        const idx = current.findIndex((o) => o.id === order.id || o.orderNumber === order.orderNumber);
        if (idx !== -1) {
          current[idx] = order;
          saveStoredOrders(current);
        } else {
          saveStoredOrders([order, ...current]);
        }
      } else if (action === "delete") {
        const filtered = current.filter((o) => o.id !== order.id && o.orderNumber !== order.orderNumber);
        saveStoredOrders(filtered);
      }
    } catch (err) {
      console.error("[OrdersRealtime] Error actualizando pedidos en memoria:", err);
    }
  });
}

/**
 * Registra un ingreso de dinero en brito_cash_incomes para que impacte en caja
 */
function recordOrderCashIncome(params: {
  amount: number;
  orderNumber: string;
  orderId: string;
  customerName: string;
  customerId?: string;
  cashier: string;
  branchId?: string;
  branchName?: string;
  paymentMethod: "efectivo" | "tarjeta" | "transferencia";
  isLiquidation?: boolean;
}) {
  if (typeof window === "undefined" || params.amount <= 0) return;
  try {
    const currentIncomesRaw = localStorage.getItem("brito_cash_incomes");
    const currentIncomes: CashIncome[] = currentIncomesRaw ? JSON.parse(currentIncomesRaw) : [];

    const now = new Date();
    const formattedDate = `Hoy, ${formatTime24(now)}`;

    const newIncome: CashIncome = {
      id: `ING-${Date.now().toString().slice(-6)}`,
      amount: params.amount,
      category: "abono_pedido",
      categoryLabel: params.isLiquidation ? "Liquidación de Pedido Especial" : "Anticipo de Pedido Especial",
      paymentMethod: params.paymentMethod,
      concept: `${params.isLiquidation ? "Liquidación final" : "Anticipo"} pedido ${params.orderNumber} - ${params.customerName}`,
      customerId: params.customerId,
      customerName: params.customerName,
      orderId: params.orderId,
      orderNumber: params.orderNumber,
      cashier: params.cashier,
      branchId: params.branchId,
      branchName: params.branchName,
      date: formattedDate,
      timestamp: now.toISOString(),
    };

    const updated = [newIncome, ...currentIncomes];
    localStorage.setItem("brito_cash_incomes", JSON.stringify(updated));

    try {
      const shiftIncomesRaw = localStorage.getItem("brito_pos_current_incomes");
      const shiftIncomes: CashIncome[] = shiftIncomesRaw ? JSON.parse(shiftIncomesRaw) : [];
      const updatedShiftIncomes = [newIncome, ...shiftIncomes.filter((i) => i.id !== newIncome.id)];
      localStorage.setItem("brito_pos_current_incomes", JSON.stringify(updatedShiftIncomes));
    } catch (e) {}

    window.dispatchEvent(new Event("brito_incomes_updated"));
  } catch (err) {
    console.error("Error logging cash income for order:", err);
  }
}

/**
 * Registra un pedido especial (anticipo o liquidación) como una venta formal en el historial de ventas del POS
 */
export function recordOrderAsPosSale(params: {
  orderId: string;
  orderNumber: string;
  amount: number;
  totalOrderAmount?: number;
  customerName: string;
  customerId?: string;
  cashier: string;
  paymentMethod: "efectivo" | "tarjeta" | "transferencia";
  description?: string;
  items?: OrderItem[];
  isLiquidation?: boolean;
  branchId?: string;
  operatingBranchId?: string;
}) {
  if (typeof window === "undefined" || params.amount <= 0) return;
  try {
    const rawSales = localStorage.getItem("brito_pos_current_sales");
    const currentSales: Sale[] = rawSales ? JSON.parse(rawSales) : [];

    const saleId = params.isLiquidation 
      ? `LIQ-${params.orderNumber}` 
      : params.orderNumber || `PED-${params.orderId}`;

    // Evitar registros duplicados con el mismo ID de venta
    if (currentSales.some((s) => s.id === saleId)) return;

    const saleItems = (params.items && params.items.length > 0)
      ? params.items.map((i, idx) => ({
          product: {
            id: i.productId || `order-item-${idx}`,
            name: `🎂 [Pedido] ${i.name}`,
            price: Number(i.unitPrice) || Number(i.subtotal) || params.amount,
            category: "pasteles" as const,
            stock: 999,
          },
          quantity: Number(i.quantity) || 1,
        }))
      : [{
          product: {
            id: `order-item-${params.orderId}`,
            name: `🎂 [Pedido ${params.isLiquidation ? "Liquidación" : "Anticipo"}] ${params.description || params.orderNumber}`,
            price: params.amount,
            category: "pasteles" as const,
            stock: 999,
          },
          quantity: 1,
        }];

    const newSale: Sale = {
      id: saleId,
      date: formatDateTimeSafe(new Date()),
      items: saleItems,
      total: params.amount,
      paymentMethod: params.paymentMethod,
      cashier: params.cashier,
      customerName: params.customerName,
      customerId: params.customerId,
      customerType: "evento",
      timestamp: Date.now(),
      createdAt: new Date().toISOString(),
      isCustomOrder: true,
      orderNumber: params.orderNumber,
    };

    (newSale as any).branchId = params.operatingBranchId || params.branchId;
    (newSale as any).operatingBranchId = params.operatingBranchId;

    const branchIdForShift = params.operatingBranchId || params.branchId;
    const shiftStart = getStoredShiftStartBoundary(branchIdForShift);
    const cleanCurrentSales = currentSales.filter((s) => {
      if (!s) return false;
      const t = parseDateTimeSafe(s.timestamp || s.createdAt || s.date);
      return shiftStart <= 0 || (t > 0 && t >= shiftStart);
    });

    const nextSales = [newSale, ...cleanCurrentSales];
    localStorage.setItem("brito_pos_current_sales", JSON.stringify(nextSales));

    try {
      const rawMaster = localStorage.getItem("brito_pos_master_sales");
      const prevMaster: Sale[] = rawMaster ? JSON.parse(rawMaster) : [];
      const nextMaster = [newSale, ...prevMaster.filter((s) => s.id !== newSale.id)].slice(0, 1000);
      localStorage.setItem("brito_pos_master_sales", JSON.stringify(nextMaster));
    } catch (e) {}

    window.dispatchEvent(new Event("brito_sales_updated"));
  } catch (err) {
    console.error("Error logging order as POS sale:", err);
  }
}

/**
 * Genera el siguiente número de pedido único consecutivo (ej. PED-105)
 */
export function generateNextOrderNumber(): string {
  const current = getStoredOrders();
  let maxNum = 100;
  for (const order of current) {
    const match = order.orderNumber?.match(/PED-(\d+)/);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  return `PED-${maxNum + 1}`;
}

function formatOrderDateTime(d: Date = new Date()): string {
  return formatDateTimeSafe(d);
}

/**
 * Agrega un nuevo pedido al sistema y registra el anticipo en caja si aplica
 */
export function addCustomOrder(data: {
  customerName: string;
  phone: string;
  customerId?: string;
  branchId: string;
  branchName: string;
  operatingBranchId?: string;
  operatingBranchName?: string;
  description: string;
  items: OrderItem[];
  deliveryDate: string;
  deliveryTime: string;
  deliveryType: "sucursal" | "domicilio";
  deliveryAddress?: string;
  total: number;
  deposit: number;
  paymentMethod: "efectivo" | "tarjeta" | "transferencia";
  transferAccount?: string;
  cardTerminal?: string;
  paymentReference?: string;
  dedication?: string;
  notes?: string;
  cashier: string;
  shiftName?: string;
}): CustomOrder {
  const current = getStoredOrders();
  const orderNumber = generateNextOrderNumber();
  const orderId = `ord-${Date.now().toString().slice(-8)}-${Math.floor(1000 + Math.random() * 9000)}`;
  const cashierBranch = data.cashier ? resolveBranchId(undefined, data.cashier) : undefined;
  const effOperatingBranchId = data.operatingBranchId && data.operatingBranchId !== data.branchId
    ? resolveBranchId(data.operatingBranchId, undefined)
    : (cashierBranch || resolveBranchId(data.operatingBranchId || data.branchId, data.cashier));
  const effOperatingBranchName = data.operatingBranchName || (effOperatingBranchId && CANONICAL_BRANCH_NAMES[effOperatingBranchId]) || data.branchName || "Sucursal Matriz (Centro)";
  const effPickupBranchId = resolveBranchId(data.branchId, undefined);
  const effPickupBranchName = data.branchName || CANONICAL_BRANCH_NAMES[effPickupBranchId] || "Sucursal Matriz (Centro)";
  const deposit = Math.max(0, Math.min(data.total, Number(data.deposit) || 0));
  const remaining = Math.max(0, data.total - deposit);
  const paymentStatus: CustomOrder["paymentStatus"] =
    remaining === 0 ? "liquidado" : deposit > 0 ? "anticipo" : "sin_anticipo";

  const payments: OrderPayment[] = [];
  if (deposit > 0) {
    payments.push({
      id: `PAY-${orderNumber}-1`,
      date: formatOrderDateTime(),
      amount: deposit,
      paymentMethod: data.paymentMethod,
      cashier: data.cashier,
      transferAccount: data.transferAccount,
      cardTerminal: data.cardTerminal,
      paymentReference: data.paymentReference,
      notes: remaining === 0 ? "Pago total inmediato" : "Anticipo al levantar pedido",
    });

    // Registrar en ingresos de caja de la sucursal de quien opera el turno
    recordOrderCashIncome({
      amount: deposit,
      orderNumber,
      orderId,
      customerName: data.customerName,
      customerId: data.customerId,
      cashier: data.cashier,
      branchId: effOperatingBranchId,
      branchName: effOperatingBranchName,
      paymentMethod: data.paymentMethod,
      isLiquidation: remaining === 0,
    });

    // Registrar el anticipo del pedido como una venta en el historial de ventas del POS
    recordOrderAsPosSale({
      orderId,
      orderNumber,
      amount: deposit,
      totalOrderAmount: data.total,
      customerName: data.customerName,
      customerId: data.customerId,
      cashier: data.cashier,
      paymentMethod: data.paymentMethod,
      description: data.description,
      items: data.items,
      isLiquidation: remaining === 0,
      branchId: effPickupBranchId,
      operatingBranchId: effOperatingBranchId,
    });
  }

  let finalNotes = (data.notes || "").trim();
  if (effOperatingBranchId && effOperatingBranchId !== effPickupBranchId && !finalNotes.includes("[Origen:")) {
    finalNotes = `[Origen: ${effOperatingBranchId}|${effOperatingBranchName}] ${finalNotes}`.trim();
  }

  const newOrder: CustomOrder = {
    id: orderId,
    orderNumber: orderNumber,
    customerId: data.customerId,
    customerName: data.customerName.trim(),
    phone: data.phone.trim(),
    branchId: effPickupBranchId,
    branchName: effPickupBranchName,
    operatingBranchId: effOperatingBranchId,
    operatingBranchName: effOperatingBranchName,
    description: data.description.trim() || (data.items.length > 0 ? data.items.map(i => `${i.quantity}x ${i.name}`).join(", ") : "Encargo"),
    items: data.items,
    deliveryDate: data.deliveryDate,
    deliveryTime: data.deliveryTime,
    deliveryType: data.deliveryType,
    deliveryAddress: data.deliveryAddress?.trim(),
    status: "pendiente",
    total: data.total,
    deposit: deposit,
    remainingBalance: remaining,
    paymentStatus: paymentStatus,
    paymentMethod: data.paymentMethod,
    transferAccount: data.transferAccount,
    cardTerminal: data.cardTerminal,
    paymentReference: data.paymentReference,
    dedication: data.dedication?.trim(),
    notes: finalNotes || undefined,
    createdAt: new Date().toISOString(),
    timestamp: Date.now(),
    cashier: data.cashier,
    shiftName: data.shiftName || (typeof window !== "undefined" ? localStorage.getItem("brito_current_shift_name") || undefined : undefined),
    payments: payments,
  };

  markOrderLocalMutation(newOrder, newOrder.timestamp);
  saveStoredOrders([newOrder, ...current]);

  // Persistir pedido y anticipo directamente en Supabase para sincronización 100% en tiempo real
  persistOrderToSupabase(newOrder);

  if (deposit > 0) {
    persistOrderPaymentMovementToSupabase({
      amount: deposit,
      orderNumber,
      orderId,
      customerName: data.customerName,
      cashier: data.cashier,
      branchId: effOperatingBranchId,
      isLiquidation: remaining === 0,
    });

    if (typeof window !== "undefined" && realtimeHub?.broadcastCashMovement) {
      realtimeHub.broadcastCashMovement({
        id: `ING-ord-${orderNumber}`,
        branchId: effOperatingBranchId,
        branchName: data.operatingBranchName || data.branchName || "Sucursal",
        type: "entrada",
        category: "abono_pedido" as any,
        categoryLabel: remaining === 0 ? "Liquidación de Pedido Especial" : "Anticipo de Pedido Especial",
        amount: deposit,
        reason: `${remaining === 0 ? "Liquidación final" : "Anticipo"} pedido ${orderNumber} - ${data.customerName}`,
        authorizedBy: data.cashier || "Cajero",
        cashier: data.cashier,
        timestamp: formatTime24(new Date()),
      });
    }
  }

  // Respaldar y sincronizar con el servidor para que los celulares lo reciban al 100%
  if (typeof window !== "undefined") {
    fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: newOrder }),
    }).catch(() => {});
  }

  // Transmitir pedido y notificación en tiempo real a los celulares y computadoras
  if (typeof window !== "undefined") {
    if (realtimeHub?.broadcastOrder) {
      realtimeHub.broadcastOrder("create", newOrder);
    }
    broadcastOrderCreatedNotification(newOrder);
  }

  return newOrder;
}

/**
 * Registra un abono o liquidación total a un pedido existente
 */
export function addOrderPayment(
  orderId: string,
  params: {
    amount: number;
    paymentMethod: "efectivo" | "tarjeta" | "transferencia";
    cashier: string;
    operatingBranchId?: string;
    operatingBranchName?: string;
    notes?: string;
    markAsDelivered?: boolean;
  }
): CustomOrder | null {
  const current = getStoredOrders();
  const idx = current.findIndex(o => o.id === orderId || o.orderNumber === orderId);
  if (idx === -1) return null;

  const order = { ...current[idx] };
  const paymentAmount = Math.max(0, Math.min(order.remainingBalance, Number(params.amount) || 0));

  if (paymentAmount <= 0) return order;

  const newDeposit = order.deposit + paymentAmount;
  const newRemaining = Math.max(0, order.total - newDeposit);
  const isFullLiquidation = newRemaining === 0;

  const newPayment: OrderPayment = {
    id: `PAY-${order.orderNumber}-${(order.payments?.length || 0) + 1}`,
    date: formatOrderDateTime(),
    amount: paymentAmount,
    paymentMethod: params.paymentMethod,
    cashier: params.cashier,
    notes: params.notes || (isFullLiquidation ? "Liquidación de saldo pendiente" : "Abono a cuenta"),
  };

  order.deposit = newDeposit;
  order.remainingBalance = newRemaining;
  order.paymentStatus = isFullLiquidation ? "liquidado" : "anticipo";
  order.payments = [...(order.payments || []), newPayment];
  order.timestamp = Date.now();

  // Solo marcar como entregado si se solicitó explícitamente la entrega inmediata Y el pedido queda 100% liquidado ($0 restante)
  if (params.markAsDelivered && isFullLiquidation) {
    order.status = "entregado";
  }

  const paymentCashierBranch = params.cashier ? resolveBranchId(undefined, params.cashier) : undefined;
  const effOperatingBranchId = params.operatingBranchId
    ? resolveBranchId(params.operatingBranchId, undefined)
    : (paymentCashierBranch || resolveBranchId(order.operatingBranchId || order.branchId, params.cashier));
  const effOperatingBranchName = params.operatingBranchName || (effOperatingBranchId && CANONICAL_BRANCH_NAMES[effOperatingBranchId]) || order.operatingBranchName || order.branchName;

  // Registrar en ingresos de caja de quien opera el turno
  recordOrderCashIncome({
    amount: paymentAmount,
    orderNumber: order.orderNumber,
    orderId: order.id,
    customerName: order.customerName,
    customerId: order.customerId,
    cashier: params.cashier,
    branchId: effOperatingBranchId,
    branchName: effOperatingBranchName,
    paymentMethod: params.paymentMethod,
    isLiquidation: isFullLiquidation,
  });

  // Registrar el abono o liquidación como una venta en el historial de ventas del POS
  recordOrderAsPosSale({
    orderId: order.id,
    orderNumber: order.orderNumber,
    amount: paymentAmount,
    totalOrderAmount: order.total,
    customerName: order.customerName,
    customerId: order.customerId,
    cashier: params.cashier,
    paymentMethod: params.paymentMethod,
    description: order.description,
    items: order.items,
    isLiquidation: isFullLiquidation,
    branchId: order.branchId,
    operatingBranchId: effOperatingBranchId,
  });

  current[idx] = order;
  markOrderLocalMutation(order, order.timestamp);
  saveStoredOrders(current);

  // Persistir actualización de saldo y pagos en Supabase
  persistOrderToSupabase(order);
  persistOrderPaymentMovementToSupabase({
    amount: paymentAmount,
    orderNumber: order.orderNumber,
    orderId: order.id,
    customerName: order.customerName,
    cashier: params.cashier,
    branchId: effOperatingBranchId,
    isLiquidation: isFullLiquidation,
  });

  if (typeof window !== "undefined" && realtimeHub?.broadcastCashMovement) {
    realtimeHub.broadcastCashMovement({
      id: `ING-pay-${order.orderNumber}-${order.payments?.length || 1}`,
      branchId: effOperatingBranchId,
      branchName: params.operatingBranchName || (order as any).operatingBranchName || (order as any).branchName || "Sucursal",
      type: "entrada",
      category: "abono_pedido" as any,
      categoryLabel: isFullLiquidation ? "Liquidación de Pedido Especial" : "Abono a Pedido Especial",
      amount: paymentAmount,
      reason: `${isFullLiquidation ? "Liquidación final" : "Abono"} pedido ${order.orderNumber} - ${order.customerName}`,
      authorizedBy: params.cashier || "Cajero",
      cashier: params.cashier,
      timestamp: formatTime24(new Date()),
    });
  }

  // Sincronizar pago en servidor persistente para reflejo en celulares
  if (typeof window !== "undefined") {
    fetch("/api/orders", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderNumber: order.orderNumber,
        updates: {
          deposit: order.deposit,
          remainingBalance: order.remainingBalance,
          paymentStatus: order.paymentStatus,
          payments: order.payments,
          status: order.status,
          timestamp: order.timestamp,
        },
      }),
    }).catch(() => {});
  }

  // Transmitir abono / liquidación en tiempo real
  if (typeof window !== "undefined" && realtimeHub?.broadcastOrder) {
    realtimeHub.broadcastOrder("payment", order);
    if (params.markAsDelivered && isFullLiquidation) {
      realtimeHub.broadcastOrder("status", order);
    }
  }

  if (typeof window !== "undefined" && realtimeHub?.broadcastNotification) {
    const isDelivered = order.status === "entregado";
    const isPaid = order.remainingBalance === 0 || order.paymentStatus === "liquidado";
    const originName = order.operatingBranchName || "Sucursal";
    const destName = order.branchName || "Sucursal";
    const isCross = originName.toLowerCase().trim() !== destName.toLowerCase().trim();
    const totalNum = Number(order.total) || 0;
    const depositNum = Number(order.deposit) || 0;
    const remNum = Number(order.remainingBalance) || 0;
    const baseItemsDesc = order.description ? `${order.description}. ` : "";
    const deliverySummary = `${isCross ? `[Levantado en: ${originName} • Entrega en: ${destName}] ` : `Recoge en: ${destName}. `}Entrega: ${order.deliveryDate} a las ${order.deliveryTime} hrs.`;

    realtimeHub.broadcastNotification({
      id: `notif-order-${order.id}`,
      senderName: isDelivered
        ? `📦 Pedido Entregado (${destName})`
        : isCross
        ? `🎂 ${originName} ➔ ${destName}`
        : isPaid
        ? `✅ Pedido Liquidado (${destName})`
        : `💰 Abono de Pedido (${destName})`,
      senderAvatar: isDelivered ? "📦" : "🎂",
      badgeIcon: "pastel",
      title: isDelivered
        ? `Pedido Entregado con Éxito: ${order.orderNumber} • Total $${totalNum.toFixed(2)}`
        : isPaid
        ? `Pedido ${order.orderNumber}: Total $${totalNum.toFixed(2)} • ¡Cliente ya pagó!`
        : `Pedido ${order.orderNumber}: Total $${totalNum.toFixed(2)} • Abonó $${paymentAmount.toFixed(2)}`,
      highlightText: isDelivered
        ? `${order.customerName} • Entregado al Cliente`
        : isPaid
        ? `${order.customerName} • ¡Cliente ya pagó! (Total: $${totalNum.toFixed(2)})`
        : `${order.customerName} • Abonó: $${paymentAmount.toFixed(2)} • Pagado: $${depositNum.toFixed(2)} (Resta: $${remNum.toFixed(2)})`,
      description: isDelivered
        ? `${baseItemsDesc}El pedido ${order.orderNumber} de "${order.customerName}" fue liquidado y entregado satisfactoriamente en ${destName}.${isCross ? ` (Originado en: ${originName}).` : ""}`
        : isPaid
        ? `✅ El cliente ya pagó el total ($${totalNum.toFixed(2)} • Último abono: $${paymentAmount.toFixed(2)}). ${baseItemsDesc}${deliverySummary}`
        : `💰 El cliente abonó $${paymentAmount.toFixed(2)} (Total pagado: $${depositNum.toFixed(2)} • Resta: $${remNum.toFixed(2)}). ${baseItemsDesc}${deliverySummary}`,
      timeAgo: formatNotificationHour(Date.now()),
      timestamp: Date.now(),
      group: "recientes",
      read: false,
      category: "pedidos",
      orderId: order.id,
      branchId: order.branchId,
      branchName: order.branchName,
      operatingBranchId: order.operatingBranchId,
      operatingBranchName: order.operatingBranchName,
      actionLabel: isDelivered
        ? "Ver Pedido Entregado"
        : remNum > 0
        ? `Cobrar $${remNum.toFixed(2)}`
        : "Ver Detalle",
      actionLink: "/pedidos",
      secondaryActionLabel: !isDelivered && remNum > 0 ? "Ver Detalle" : undefined,
      secondaryActionLink: !isDelivered && remNum > 0 ? "/pedidos" : undefined,
      orderData: order,
    });
  }

  return order;
}

/**
 * Actualiza el estado operativo de un pedido (pendiente -> en_horno -> listo -> entregado -> cancelado)
 */
export function updateOrderStatus(orderId: string, status: CustomOrder["status"]): CustomOrder | null {
  const current = getStoredOrders();
  const idx = current.findIndex(o => o.id === orderId || o.orderNumber === orderId);
  if (idx === -1) return null;

  // Bloqueo de seguridad: No permitir marcar como entregado si aún tiene saldo pendiente
  if (status === "entregado" && (current[idx].remainingBalance || 0) > 0) {
    console.warn(`[orders] Bloqueado: Pedido #${current[idx].orderNumber} no puede entregarse porque tiene saldo pendiente de $${current[idx].remainingBalance}`);
    return current[idx];
  }

  const nowTs = Date.now();
  current[idx] = {
    ...current[idx],
    status,
    timestamp: nowTs,
  };

  markOrderLocalMutation(current[idx], nowTs);
  saveStoredOrders(current);

  // Persistir cambio de estado en Supabase
  persistOrderToSupabase(current[idx]);

  // Sincronizar cambio de estado en servidor para que el celular lo reciba de inmediato
  if (typeof window !== "undefined") {
    fetch("/api/orders", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, updates: { status, timestamp: current[idx].timestamp } }),
    }).catch(() => {});
  }

  // Transmitir cambio de estado operativo
  if (typeof window !== "undefined" && realtimeHub?.broadcastOrder) {
    realtimeHub.broadcastOrder("status", current[idx]);
  }

  if (typeof window !== "undefined" && realtimeHub?.broadcastNotification) {
    const statusMap: Record<string, string> = {
      pendiente: "Pendiente ⏳",
      en_horno: "En Horno 🔥",
      listo: "Listo en Sucursal 🎂",
      entregado: "Entregado al Cliente ✅",
      cancelado: "Dado de Baja ❌",
    };
    const isDelivered = status === "entregado";
    const isCancelled = status === "cancelado";
    const isReady = status === "listo";
    const ord = current[idx];
    const totalNum = Number(ord.total) || 0;
    const remNum = Number(ord.remainingBalance) || 0;
    const isCross = ord.operatingBranchName && ord.branchName && ord.operatingBranchName !== ord.branchName;
    const baseItemsDesc = ord.description ? `${ord.description}. ` : "";

    realtimeHub.broadcastNotification({
      id: `notif-order-${ord.id}`,
      senderName: isDelivered
        ? `📦 Pedido Entregado (${ord.branchName})`
        : isCancelled
        ? `🗑️ Pedido Cancelado (${ord.branchName})`
        : isReady
        ? `🎂 Listo en Sucursal (${ord.branchName})`
        : `👨‍🍳 ${ord.branchName}`,
      senderAvatar: isDelivered ? "📦" : isCancelled ? "🗑️" : isReady ? "🎂" : "👨‍🍳",
      badgeIcon: "pastel",
      title: isDelivered
        ? `Pedido Entregado con Éxito: ${ord.orderNumber}${totalNum ? ` • Total $${totalNum.toFixed(2)}` : ""}`
        : isCancelled
        ? `Pedido Cancelado / Dado de Baja: ${ord.orderNumber}${totalNum ? ` • Total $${totalNum.toFixed(2)}` : ""}`
        : isReady
        ? `El producto ya está en sucursal: ${ord.orderNumber}${totalNum ? ` • Total $${totalNum.toFixed(2)}` : ""}`
        : `Pedido ${ord.orderNumber}: Total $${totalNum.toFixed(2)}`,
      highlightText: isDelivered
        ? `${ord.customerName} • Entregado al Cliente`
        : isCancelled
        ? `${ord.customerName} • Dado de Baja`
        : `${ord.customerName} • ${statusMap[status] || status}${remNum > 0 ? ` (Resta: $${remNum.toFixed(2)})` : " (Liquidado)"}`,
      description: isDelivered
        ? `${baseItemsDesc}El pedido ${ord.orderNumber} de "${ord.customerName}" fue entregado satisfactoriamente en ${ord.branchName}.${isCross ? ` (Originado en: ${ord.operatingBranchName}).` : ""}`
        : isCancelled
        ? `${baseItemsDesc}El pedido ${ord.orderNumber} de "${ord.customerName}" fue dado de baja.`
        : isReady
        ? `${baseItemsDesc}El pedido ${ord.orderNumber} de "${ord.customerName}" ya está LISTO en ${ord.branchName} para entrega.`
        : `${baseItemsDesc}Cliente: ${ord.customerName} • Entrega: ${ord.deliveryDate} ${ord.deliveryTime}${isCross ? ` • Origen: ${ord.operatingBranchName}` : ""}`,
      timeAgo: formatNotificationHour(Date.now()),
      timestamp: Date.now(),
      group: "recientes",
      read: false,
      category: "pedidos",
      orderId: ord.id,
      branchId: ord.branchId,
      branchName: ord.branchName,
      operatingBranchId: ord.operatingBranchId,
      operatingBranchName: ord.operatingBranchName,
      actionLabel: isDelivered
        ? "Ver Pedido Entregado"
        : isCancelled
        ? "Ver Pedido Cancelado"
        : remNum > 0
        ? `Cobrar $${remNum.toFixed(2)}`
        : "Ver Detalle",
      actionLink: "/pedidos",
      secondaryActionLabel: !isDelivered && !isCancelled && remNum > 0 ? "Ver Detalle" : undefined,
      secondaryActionLink: !isDelivered && !isCancelled && remNum > 0 ? "/pedidos" : undefined,
      orderData: ord,
    });
  }

  return current[idx];
}

/**
 * Actualiza datos de un pedido existente
 */
export function updateCustomOrder(orderId: string, updates: Partial<CustomOrder>): CustomOrder | null {
  const current = getStoredOrders();
  const idx = current.findIndex(o => o.id === orderId || o.orderNumber === orderId);
  if (idx === -1) return null;

  const existing = current[idx];
  const nowTs = Date.now();
  const updated: CustomOrder = {
    ...existing,
    ...updates,
    timestamp: nowTs,
  };

  // Recalcular saldos si se modificó total o deposit
  if (updates.total !== undefined || updates.deposit !== undefined) {
    const total = Number(updated.total) || 0;
    const deposit = Number(updated.deposit) || 0;
    updated.total = total;
    updated.deposit = deposit;
    updated.remainingBalance = Math.max(0, total - deposit);
    updated.paymentStatus = updated.remainingBalance === 0 ? "liquidado" : deposit > 0 ? "anticipo" : "sin_anticipo";
  }

  current[idx] = updated;
  markOrderLocalMutation(updated, nowTs);
  saveStoredOrders(current);

  // Persistir cambios en Supabase
  persistOrderToSupabase(updated);

  // Sincronizar actualización con servidor y transmitir a celulares
  if (typeof window !== "undefined") {
    fetch("/api/orders", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, updates: { ...updates, timestamp: nowTs } }),
    }).catch(() => {});
    if (realtimeHub?.broadcastOrder) {
      realtimeHub.broadcastOrder("status", updated);
    }
  }

  return updated;
}

/**
 * Elimina o cancela un pedido
 */
export function deleteCustomOrder(orderId: string): boolean {
  const current = getStoredOrders();
  const filtered = current.filter(o => o.id !== orderId && o.orderNumber !== orderId);
  if (filtered.length !== current.length) {
    saveStoredOrders(filtered);

    // Eliminar en Supabase
    if (typeof window !== "undefined") {
      try {
        const supabase = createClient();
        supabase.from("custom_orders").delete().or(`id.eq.${orderId},order_number.eq.${orderId}`).then(() => {});
      } catch {}
      fetch(`/api/orders?id=${encodeURIComponent(orderId)}`, {
        method: "DELETE",
      }).catch(() => {});
      if (realtimeHub?.broadcastOrder) {
        realtimeHub.broadcastOrder("delete", { id: orderId, orderNumber: orderId } as CustomOrder);
      }
    }

    return true;
  }
  return false;
}
