"use client";
import { CLEAN_SLATE_EPOCH } from "@/lib/wipeOperationalData";

import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from "react";
import { realtimeHub, RealtimeStatus } from "@/lib/realtime/realtimeHub";
import { CustomOrder, ShiftCutRecord, AppUser } from "@/types";
import { getStoredOrders, saveStoredOrders, extractOrderFromNotification, updateOrderStatus, deleteCustomOrder } from "@/lib/orders";
import { useAuth } from "@/context/AuthContext";
import { useBranch } from "@/context/BranchContext";
import OrderDetailModal from "@/components/pedidos/OrderDetailModal";
import OrderPaymentModal from "@/components/pedidos/OrderPaymentModal";
import OrderReceiptModal from "@/components/pedidos/OrderReceiptModal";
import ShiftCutDetailModal from "@/components/caja/ShiftCutDetailModal";
import { resolveBranchId } from "@/lib/utils";

export interface FBNotification {
  id: string;
  senderName: string;
  senderAvatar: string;
  badgeIcon: "harina" | "pastel" | "dinero" | "horno" | "cliente" | "alerta";
  title: string;
  highlightText: string;
  description: string;
  timeAgo: string;
  group: "recientes" | "anteriores";
  read: boolean;
  actionLabel?: string;
  actionLink?: string;
  secondaryActionLabel?: string;
  secondaryActionLink?: string;
  category: "inventario" | "pedidos" | "caja" | "produccion" | "clientes";
  orderId?: string;
  orderData?: CustomOrder;
  shiftCutData?: ShiftCutRecord;
  cutId?: string;
  branchId?: string;
  branchName?: string;
  operatingBranchId?: string;
  operatingBranchName?: string;
  timestamp?: number;
  createdAt?: string;
}

export function isAllowedNotification(notif: Partial<FBNotification>): boolean {
  if (!notif) return false;

  const idStr = (notif.id || "").toLowerCase();
  const titleStr = (notif.title || "").toLowerCase();
  const highStr = (notif.highlightText || "").toLowerCase();
  const descStr = (notif.description || "").toLowerCase();
  const senderStr = (notif.senderName || "").toLowerCase();
  const text = `${titleStr} ${highStr} ${descStr} ${senderStr}`;

  // Bloquear notificaciones secundarias de caja/ventas que no tienen un pedido real ni son un cierre de turno legítimo
  if (
    idStr.startsWith("sale-notif-") ||
    idStr.startsWith("mov-notif-") ||
    titleStr === "venta en mostrador" ||
    titleStr === "ingreso a caja" ||
    titleStr === "salida de dinero / gasto" ||
    titleStr === "saldo cobrado con éxito" ||
    (notif.category === "caja" && !notif.orderId && !notif.orderData && !/ped[-_]?\d+/i.test(text) && (
      text.includes("pedido liquidado") ||
      text.includes("saldo cobrado") ||
      text.includes("sigue listo en sucursal para entregarse")
    ))
  ) {
    return false;
  }

  // Si es un pedido de pan/pastelería explícito (con orderId, orderData, categoría pedidos o folio PED-XXX), se evalúa como pedido
  const hasOrderIdentifier =
    notif.category === "pedidos" ||
    Boolean(notif.orderId) ||
    Boolean(notif.orderData) ||
    idStr.startsWith("notif-order-") ||
    /ped[-_]?\d+/i.test(text);

  const isPedido =
    hasOrderIdentifier && (
      notif.category === "pedidos" ||
      Boolean(notif.orderId) ||
      Boolean(notif.orderData) ||
      text.includes("pedido") ||
      text.includes("encargo") ||
      text.includes("apartado") ||
      text.includes("anticipo") ||
      text.includes("liquidado") ||
      text.includes("abono") ||
      text.includes("abonó") ||
      text.includes("pagó") ||
      text.includes("entregad") ||
      text.includes("ped-")
    );

  // 1. Bloqueo estricto: Cero notificaciones de almacén, inventario, producción de hornos, insumos o escaneos
  if (
    !isPedido && (
      notif.category === "inventario" ||
      notif.category === "produccion" ||
      text.includes("almacén") ||
      text.includes("almacen") ||
      text.includes("stock") ||
      text.includes("harina") ||
      text.includes("insumo") ||
      text.includes("horno") ||
      text.includes("camioneta") ||
      text.includes("código") ||
      text.includes("codigo") ||
      text.includes("código de barras")
    )
  ) {
    return false;
  }

  // 2. Permitir exclusivamente Cierres de Turno / Cortes de Caja reales (nunca confundir pagos de pedidos con cortes)
  const isCierreTurno =
    !isPedido &&
    !text.includes("pedido") &&
    !text.includes("abono") &&
    !text.includes("anticipo") &&
    !text.includes("liquidado") &&
    !text.includes("saldo cobrado") &&
    (
      Boolean(notif.cutId) ||
      Boolean(notif.shiftCutData) ||
      idStr.startsWith("notif-cut-") ||
      text.includes("cierre de turno") ||
      text.includes("corte de turno") ||
      text.includes("corte de caja") ||
      (notif.category === "caja" && (
        text.includes("corte") ||
        text.includes("cierre") ||
        text.includes("cuadró") ||
        text.includes("cuadro") ||
        text.includes("diferencia")
      ))
    );

  return Boolean(isCierreTurno || isPedido);
}

export function getCanonicalBranchCode(branchIdOrName?: string): string {
  if (!branchIdOrName) return "";
  const s = branchIdOrName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  if (s.includes("angeles") || s.includes("suc-les")) return "branch-angeles";
  if (s.includes("ildefonso") || s.includes("1790889237862") || s.includes("ilf-04")) return "branch-1790889237862";
  if (s.includes("sanjuan") || s.includes("san juan") || s.includes("sju-02")) return "branch-sanjuan";
  if (s.includes("benito") || s.includes("ben-02")) return "branch-benito";
  if (s.includes("flores") || s.includes("flo-03")) return "branch-flores";
  if (s.includes("matriz") || s.includes("centro") || s.includes("mat-01")) return "branch-matriz";
  return s;
}

export function checkBranchMatch(
  info: {
    pickupBranchId?: string;
    pickupBranchName?: string;
    operatingBranchId?: string;
    operatingBranchName?: string;
    fullText?: string;
  },
  userBranchId?: string,
  userBranchName?: string
): boolean {
  const userCode = getCanonicalBranchCode(userBranchId || userBranchName);
  if (!userCode) return false;

  const destCode = getCanonicalBranchCode(info.pickupBranchId || info.pickupBranchName);
  if (destCode && destCode === userCode) return true;

  const originCode = getCanonicalBranchCode(info.operatingBranchId || info.operatingBranchName);
  if (originCode && originCode === userCode) return true;

  return false;
}

function findRealStoredOrderForNotification(n: Partial<FBNotification>): CustomOrder | null {
  try {
    const allOrders = getStoredOrders();
    if (Array.isArray(allOrders) && allOrders.length > 0) {
      const candidateIds = [n.orderId, n.orderData?.id, n.orderData?.orderNumber]
        .filter(Boolean)
        .map((s) => String(s).toLowerCase().trim());

      if (candidateIds.length > 0) {
        const matchId = allOrders.find((o) => {
          const oId = (o.id || "").toLowerCase().trim();
          const oNum = (o.orderNumber || "").toLowerCase().trim();
          return candidateIds.includes(oId) || candidateIds.includes(oNum);
        });
        if (matchId) {
          return n.orderData ? { ...n.orderData, ...matchId } : matchId;
        }
      }

      const text = `${n.id || ""} ${n.title || ""} ${n.highlightText || ""} ${n.description || ""} ${n.orderId || ""} ${n.orderData?.orderNumber || ""}`;
      const folioMatch = text.match(/PED[-_]?0*(\d+)/i);
      if (folioMatch) {
        const rawNumber = folioMatch[1];
        const matchFolio = allOrders.find((o) => {
          const oNum = o.orderNumber.replace(/\D/g, "").replace(/^0+/, "") || "0";
          return oNum === rawNumber || o.orderNumber.toUpperCase() === `PED-${rawNumber}`;
        });
        if (matchFolio) {
          return n.orderData ? { ...n.orderData, ...matchFolio } : matchFolio;
        }
      }

      if (n.highlightText) {
        const highLower = n.highlightText.toLowerCase();
        const matchCustomer = allOrders.find(
          (o) => o.customerName && o.customerName.trim().length > 2 && highLower.includes(o.customerName.toLowerCase().trim())
        );
        if (matchCustomer) {
          return n.orderData ? { ...n.orderData, ...matchCustomer } : matchCustomer;
        }
      }
    }
    if (n.orderData && n.orderData.orderNumber) return n.orderData;
  } catch {}
  return null;
}

export function extractOrderFolioOrId(n: Partial<FBNotification>): { folio: string | null; orderId: string | null } {
  const text = `${n.title || ""} ${n.highlightText || ""} ${n.description || ""} ${n.id || ""} ${n.orderId || ""} ${n.orderData?.orderNumber || ""}`;
  const m = text.match(/PED[-_]?0*(\d+)/i);
  let folio = m ? `ped-${m[1]}` : null;
  let rawId = (n.orderId || n.orderData?.id || "").toLowerCase().trim();

  if (!rawId && n.id) {
    const idMatch = n.id.match(/(ord-[a-z0-9]+(?:-[a-z0-9]+)?)/i);
    if (idMatch) {
      rawId = idMatch[1].toLowerCase().trim();
    }
  }

  if (!folio || !rawId) {
    const stored = findRealStoredOrderForNotification(n);
    if (stored) {
      if (!folio && stored.orderNumber) {
        const sm = stored.orderNumber.match(/PED[-_]?0*(\d+)/i);
        folio = sm ? `ped-${sm[1]}` : stored.orderNumber.toLowerCase().trim();
      }
      if (!rawId && stored.id) {
        rawId = stored.id.toLowerCase().trim();
      }
    }
  }

  const orderId = rawId || null;
  return { folio, orderId };
}

export function getOrderIdentityKeys(n: Partial<FBNotification>): string[] {
  const keys = new Set<string>();
  const { folio, orderId } = extractOrderFolioOrId(n);
  if (folio) keys.add(folio);
  if (orderId) keys.add(orderId);
  const stored = findRealStoredOrderForNotification(n);
  if (stored) {
    if (stored.id) keys.add(stored.id.toLowerCase().trim());
    if (stored.orderNumber) {
      const sm = stored.orderNumber.match(/PED[-_]?0*(\d+)/i);
      if (sm) keys.add(`ped-${sm[1]}`);
      keys.add(stored.orderNumber.toLowerCase().trim());
    }
  }
  return Array.from(keys);
}

export type OrderNotificationStage =
  | "cancelled"
  | "delivered"
  | "ready"
  | "paid"
  | "payment"
  | "created"
  | "other";

export function getNotificationIntrinsicStage(n: Partial<FBNotification>): OrderNotificationStage {
  const idStr = (n.id || "").toLowerCase();
  const titleStr = (n.title || "").toLowerCase();
  const highStr = (n.highlightText || "").toLowerCase();
  const descStr = (n.description || "").toLowerCase();
  const actionStr = (n.actionLabel || "").toLowerCase();
  const combined = `${idStr} ${titleStr} ${highStr} ${descStr} ${actionStr}`;

  if (
    idStr.includes("cancelado") ||
    idStr.includes("order-cancelled") ||
    actionStr.includes("pedido cancelado") ||
    /\bcancelad[oa]s?\b/i.test(titleStr) ||
    /\bcancelad[oa]s?\b/i.test(highStr) ||
    /\bdad[oa] de baja\b/i.test(titleStr) ||
    /\bdad[oa] de baja\b/i.test(highStr) ||
    /dado de baja|fue cancelado|ha sido cancelado|eliminado permanentemente/i.test(descStr)
  ) {
    return "cancelled";
  }

  if (
    idStr.includes("order-delivered") ||
    (idStr.includes("order-status") && idStr.includes("entregado")) ||
    actionStr.includes("pedido entregado") ||
    /\bentregad[oa]s?\b/i.test(titleStr) ||
    /\bentregad[oa]s?\b/i.test(highStr) ||
    /fue entregado|ha sido entregado|entregado al cliente|entregado satisfactoriamente|entregado con éxito|marcado como entregado/i.test(descStr)
  ) {
    return "delivered";
  }

  if (
    idStr.includes("order-pay") ||
    titleStr.includes("liquidado") ||
    titleStr.includes("abono") ||
    titleStr.includes("abonó") ||
    titleStr.includes("ya pagó") ||
    highStr.includes("abonó:") ||
    highStr.includes("ya pagó") ||
    descStr.includes("el cliente abonó") ||
    descStr.includes("el cliente ya pagó")
  ) {
    if (
      titleStr.includes("liquidado") ||
      titleStr.includes("ya pagó") ||
      highStr.includes("100% pagado") ||
      highStr.includes("ya pagó") ||
      highStr.includes("liquidado") ||
      descStr.includes("el cliente ya pagó")
    ) {
      return "paid";
    }
    return "payment";
  }

  if (
    (idStr.includes("order-status") && idStr.includes("listo")) ||
    titleStr.includes("ya está en sucursal") ||
    titleStr.includes("listo en sucursal") ||
    highStr.includes("listo en sucursal") ||
    highStr.includes("listo para entrega")
  ) {
    return "ready";
  }

  if (combined.includes("ped-") || n.category === "pedidos" || n.orderId) {
    return "created";
  }

  return "other";
}

export function getOrderNotificationStage(n: Partial<FBNotification>): OrderNotificationStage {
  const intrinsic = getNotificationIntrinsicStage(n);
  const stored = findRealStoredOrderForNotification(n);

  if (intrinsic === "cancelled" || stored?.status === "cancelado") {
    return "cancelled";
  }

  if (intrinsic === "delivered" || stored?.status === "entregado") {
    return "delivered";
  }

  if (intrinsic === "paid" || intrinsic === "payment" || stored?.paymentStatus === "liquidado" || (Array.isArray(stored?.payments) && stored!.payments.length > 1)) {
    if (
      intrinsic === "paid" ||
      stored?.paymentStatus === "liquidado" ||
      stored?.remainingBalance === 0
    ) {
      return "paid";
    }
    if (intrinsic === "payment" || (Array.isArray(stored?.payments) && stored!.payments.length > 1)) {
      return "payment";
    }
  }

  if (intrinsic === "ready" || stored?.status === "listo") {
    return "ready";
  }

  return intrinsic;
}

export function isTerminalOrderNotification(n: Partial<FBNotification>): boolean {
  if (!n) return false;
  const text = `${n.id || ""} ${n.title || ""} ${n.highlightText || ""} ${n.description || ""}`.toLowerCase();
  const isOrder =
    n.category === "pedidos" ||
    Boolean(n.orderId) ||
    text.includes("ped-") ||
    text.includes("pedido");
  if (!isOrder) return false;
  const stage = getOrderNotificationStage(n);
  return stage === "delivered" || stage === "cancelled";
}

/**
 * Dos notificaciones pertenecen al mismo pedido si comparten el mismo folio (PED-XXX) o el mismo orderId.
 * Esto permite RECICLAR siempre la misma notificación por pedido y subirla hasta arriba cuando cambia de estado
 * (creado -> abono -> liquidado -> listo en sucursal -> entregado -> cancelado), evitando acumular múltiples tarjetas del mismo pedido.
 */
export function isSameOrderEvent(a: Partial<FBNotification>, b: Partial<FBNotification>): boolean {
  if (a.id && b.id && a.id === b.id) return true;

  const { folio: folioA, orderId: idA } = extractOrderFolioOrId(a);
  const { folio: folioB, orderId: idB } = extractOrderFolioOrId(b);

  if (folioA && folioB && folioA === folioB) return true;
  if (idA && idB && idA === idB) return true;
  if (folioA && idB && folioA === idB) return true;
  if (idA && folioB && idA === folioB) return true;

  return false;
}

export function mergeNotifications(existing: FBNotification, incoming: FBNotification): FBNotification {
  const existingTs = existing.timestamp || 0;
  const incomingTs = incoming.timestamp || 0;

  const stageRank: Record<OrderNotificationStage, number> = {
    other: 0,
    created: 1,
    payment: 2,
    paid: 3,
    ready: 4,
    delivered: 5,
    cancelled: 6,
  };

  const existingStage = getNotificationIntrinsicStage(existing);
  const incomingStage = getNotificationIntrinsicStage(incoming);

  // Determinar cuál notificación representa el estado más reciente del pedido
  const incomingIsNewer =
    incomingTs >= existingTs ||
    stageRank[incomingStage] > stageRank[existingStage];

  const primary = incomingIsNewer ? incoming : existing;
  const secondary = incomingIsNewer ? existing : incoming;

  const liveStoredOrder =
    findRealStoredOrderForNotification(primary) ||
    findRealStoredOrderForNotification(secondary);

  const storedOrder: CustomOrder | null = liveStoredOrder
    ? { ...(secondary.orderData || {}), ...(primary.orderData || {}), ...liveStoredOrder }
    : (primary.orderData || secondary.orderData || null);

  let activeStage = incomingIsNewer ? incomingStage : existingStage;
  if (storedOrder?.status === "cancelado") {
    activeStage = "cancelled";
  } else if (storedOrder?.status === "entregado") {
    activeStage = "delivered";
  } else if (activeStage !== "payment" && activeStage !== "paid") {
    if (storedOrder?.status === "listo") {
      activeStage = "ready";
    } else if (storedOrder?.paymentStatus === "liquidado" || (storedOrder?.remainingBalance !== undefined && Number(storedOrder.remainingBalance) <= 0)) {
      activeStage = "paid";
    } else if (Array.isArray(storedOrder?.payments) && storedOrder.payments.length > 1) {
      activeStage = "payment";
    }
  } else if (activeStage === "payment" && (storedOrder?.paymentStatus === "liquidado" || (storedOrder?.remainingBalance !== undefined && Number(storedOrder.remainingBalance) <= 0))) {
    activeStage = "paid";
  }

  const bestBranchId = primary.branchId || secondary.branchId || storedOrder?.branchId;
  const bestBranchName = primary.branchName || secondary.branchName || storedOrder?.branchName || "";
  const bestOperatingBranchId = primary.operatingBranchId || secondary.operatingBranchId || storedOrder?.operatingBranchId;
  const bestOperatingBranchName = primary.operatingBranchName || secondary.operatingBranchName || storedOrder?.operatingBranchName || "";

  const combinedText = `${existing.title} ${existing.highlightText} ${existing.description} ${incoming.title} ${incoming.highlightText} ${incoming.description}`;
  const folioMatch = combinedText.match(/PED-\d+/i);
  const folio = storedOrder?.orderNumber || (folioMatch ? folioMatch[0].toUpperCase() : "");
  const customerName = storedOrder?.customerName || "";
  const totalNum = storedOrder?.total !== undefined ? Number(storedOrder.total) : null;
  const depositNum = storedOrder?.deposit !== undefined ? Number(storedOrder.deposit) : null;
  const remNum = storedOrder?.remainingBalance !== undefined ? Number(storedOrder.remainingBalance) : (totalNum !== null && depositNum !== null ? Math.max(0, totalNum - depositNum) : 0);

  const paymentsList = Array.isArray(storedOrder?.payments) ? storedOrder!.payments : [];
  const lastPayment = paymentsList.length > 0 ? paymentsList[paymentsList.length - 1] : null;
  const abonoMatch = `${primary.title} ${primary.highlightText} ${primary.description}`.match(/(?:abon[óo]|abono de|pago de|último abono:?)\s*:?\s*\$?([0-9,]+(?:\.[0-9]+)?)/i);
  const parsedAbonoFromText = abonoMatch ? parseFloat(abonoMatch[1].replace(/,/g, "")) : 0;
  const lastAbonoNum = Number(lastPayment?.amount) || parsedAbonoFromText || 0;

  const isCross = Boolean(
    bestOperatingBranchName &&
    bestBranchName &&
    bestOperatingBranchName.toLowerCase().trim() !== bestBranchName.toLowerCase().trim()
  );

  const baseItemsDesc = storedOrder?.description ? `${storedOrder.description}. ` : "";
  const deliverySummary = storedOrder
    ? `${isCross ? `[Levantado en: ${bestOperatingBranchName} • Entrega en: ${bestBranchName}] ` : (storedOrder.deliveryType === "domicilio" ? `A domicilio: ${storedOrder.deliveryAddress || "Dirección registrada"}. ` : `Recoge en: ${bestBranchName || "Sucursal"}. `)}${storedOrder.deliveryDate ? `Entrega: ${storedOrder.deliveryDate}${storedOrder.deliveryTime ? ` a las ${storedOrder.deliveryTime} hrs` : ""}.` : ""}`
    : "";

  let bestTitle = primary.title || secondary.title;
  let bestHighlight = primary.highlightText || secondary.highlightText;
  let bestSenderName = primary.senderName || secondary.senderName;
  let bestAvatar = primary.senderAvatar || secondary.senderAvatar || "🎂";
  let bestDescription = primary.description || secondary.description;
  let bestActionLabel = primary.actionLabel || secondary.actionLabel;
  let bestSecondaryActionLabel = primary.secondaryActionLabel;
  let bestSecondaryActionLink = primary.secondaryActionLink;

  if (activeStage === "delivered") {
    bestAvatar = "📦";
    bestSenderName = `📦 Pedido Entregado (${bestBranchName || "Sucursal"})`;
    bestTitle = folio
      ? `Pedido Entregado con Éxito: ${folio}${totalNum ? ` • Total $${totalNum.toFixed(2)}` : ""}`
      : primary.title || "Pedido Entregado con Éxito";
    bestHighlight = customerName
      ? `${customerName} • Entregado al Cliente`
      : primary.highlightText || secondary.highlightText;
    bestDescription =
      primary.description && primary.description.toLowerCase().includes("entregad")
        ? `${baseItemsDesc && !primary.description.includes(storedOrder!.description!) ? baseItemsDesc : ""}${primary.description}`
        : `${baseItemsDesc}El pedido ${folio} de "${customerName || "Cliente"}" fue entregado satisfactoriamente en ${bestBranchName || "sucursal"}.`;
    bestActionLabel = "Ver Pedido Entregado";
    bestSecondaryActionLabel = undefined;
    bestSecondaryActionLink = undefined;
  } else if (activeStage === "cancelled") {
    bestAvatar = "🗑️";
    bestSenderName = `🗑️ Pedido Cancelado (${bestBranchName || "Sucursal"})`;
    bestTitle = folio
      ? `Pedido Cancelado / Dado de Baja: ${folio}${totalNum ? ` • Total $${totalNum.toFixed(2)}` : ""}`
      : primary.title || "Pedido Cancelado";
    bestHighlight = customerName
      ? `${customerName} • Dado de Baja`
      : primary.highlightText || secondary.highlightText;
    bestDescription =
      primary.description && (primary.description.toLowerCase().includes("baja") || primary.description.toLowerCase().includes("cancelad"))
        ? `${baseItemsDesc && !primary.description.includes(storedOrder!.description!) ? baseItemsDesc : ""}${primary.description}`
        : `${baseItemsDesc}El pedido ${folio} de "${customerName || "Cliente"}" fue dado de baja.`;
    bestActionLabel = "Ver Pedido Cancelado";
    bestSecondaryActionLabel = undefined;
    bestSecondaryActionLink = undefined;
  } else if (activeStage === "ready") {
    bestAvatar = "🎂";
    bestSenderName = `🎂 Listo en Sucursal (${bestBranchName || "Sucursal"})`;
    bestTitle = folio
      ? `El producto ya está en sucursal: ${folio}${totalNum ? ` • Total $${totalNum.toFixed(2)}` : ""}`
      : primary.title;
    bestHighlight = customerName
      ? `${customerName} • Listo en Sucursal${remNum > 0 ? ` • Pagado: $${(depositNum ?? 0).toFixed(2)} (Resta: $${remNum.toFixed(2)})` : " • ¡Cliente ya pagó! (Liquidado)"}`
      : primary.highlightText || secondary.highlightText;
    bestDescription = `${baseItemsDesc}El pedido ${folio} de "${customerName || "Cliente"}" ya está LISTO en ${bestBranchName || "sucursal"} para entrega. ${remNum > 0 ? `Saldo pendiente por cobrar: $${remNum.toFixed(2)}.` : "100% Liquidado."}`;
    bestActionLabel = remNum > 0 ? `Cobrar $${remNum.toFixed(2)}` : "Ver Detalle";
    bestSecondaryActionLabel = remNum > 0 ? "Ver Detalle" : undefined;
    bestSecondaryActionLink = remNum > 0 ? "/pedidos" : undefined;
  } else if (activeStage === "paid" || activeStage === "payment") {
    const isFullPaid = activeStage === "paid" || remNum <= 0;
    bestAvatar = "🎂";
    bestSenderName = isCross
      ? `🎂 ${bestOperatingBranchName} ➔ ${bestBranchName}`
      : isFullPaid
      ? `✅ Pedido Liquidado (${bestBranchName || "Sucursal"})`
      : `💰 Abono de Pedido (${bestBranchName || "Sucursal"})`;

    if (folio) {
      if (isFullPaid) {
        bestTitle = `Pedido ${folio}${totalNum ? `: Total $${totalNum.toFixed(2)}` : ""} • ¡Cliente ya pagó!`;
      } else {
        bestTitle = `Pedido ${folio}${totalNum ? `: Total $${totalNum.toFixed(2)}` : ""}${lastAbonoNum > 0 ? ` • Abonó $${lastAbonoNum.toFixed(2)}` : " • Abono registrado"}`;
      }
    }

    if (customerName) {
      bestHighlight = isFullPaid
        ? `${customerName} • ¡Cliente ya pagó!${totalNum ? ` (Total: $${totalNum.toFixed(2)})` : " (100% Pagado)"}`
        : `${customerName}${lastAbonoNum > 0 ? ` • Abonó: $${lastAbonoNum.toFixed(2)}` : ""} • Pagado: $${(depositNum ?? lastAbonoNum).toFixed(2)} (Resta: $${remNum.toFixed(2)})`;
    }

    bestDescription = isFullPaid
      ? `✅ El cliente ya pagó el total${totalNum ? ` ($${totalNum.toFixed(2)})` : ""}${lastAbonoNum > 0 ? ` • Último abono: $${lastAbonoNum.toFixed(2)}` : ""} — 100% Liquidado. ${baseItemsDesc}${deliverySummary || secondary.description || ""}`
      : `💰 El cliente abonó ${lastAbonoNum > 0 ? `$${lastAbonoNum.toFixed(2)}` : "dinero"} • Total pagado: $${(depositNum ?? lastAbonoNum).toFixed(2)} • Resta por pagar: $${remNum.toFixed(2)}. ${baseItemsDesc}${deliverySummary || secondary.description || ""}`;

    bestActionLabel = remNum > 0 ? `Cobrar $${remNum.toFixed(2)}` : "Ver Detalle";
    bestSecondaryActionLabel = remNum > 0 ? "Ver Detalle" : undefined;
    bestSecondaryActionLink = remNum > 0 ? "/pedidos" : undefined;
  } else if (activeStage === "created") {
    const totalMatch = combinedText.match(/Total:?\s*\$?([0-9,.]+)/i);
    if (folio && totalMatch) {
      bestTitle = `Nuevo Pedido ${folio}: Total $${totalMatch[1].replace(/^\$/, "")}`;
    } else if (folio && totalNum !== null) {
      bestTitle = `Nuevo Pedido ${folio}: Total $${totalNum.toFixed(2)}`;
    }
    if (isCross && bestOperatingBranchName && bestBranchName) {
      bestSenderName = `🎂 ${bestOperatingBranchName} ➔ ${bestBranchName}`;
    }
    if (secondary.description && secondary.description.length > (primary.description || "").length) {
      bestDescription = secondary.description;
    }
    bestActionLabel = remNum > 0 ? `Cobrar $${remNum.toFixed(2)}` : "Ver Detalle";
    bestSecondaryActionLabel = remNum > 0 ? "Ver Detalle" : undefined;
    bestSecondaryActionLink = remNum > 0 ? "/pedidos" : undefined;
  }

  const latestTs = Math.max(existingTs, incomingTs, storedOrder?.timestamp || 0) || Date.now();
  const resolvedOrderId = (storedOrder?.id || primary.orderId || secondary.orderId || folio || "").toLowerCase().trim();
  const mergedId = resolvedOrderId
    ? `notif-order-${resolvedOrderId}`
    : (existing.id?.startsWith("notif-order-") ? existing.id : primary.id || existing.id);

  return {
    ...secondary,
    ...primary,
    id: mergedId,
    category: "pedidos",
    badgeIcon: "pastel",
    title: bestTitle,
    senderName: bestSenderName,
    senderAvatar: bestAvatar,
    highlightText: bestHighlight,
    description: bestDescription,
    branchId: bestBranchId,
    branchName: bestBranchName,
    operatingBranchId: bestOperatingBranchId,
    operatingBranchName: bestOperatingBranchName,
    orderId: storedOrder?.id || primary.orderId || secondary.orderId,
    orderData: storedOrder || primary.orderData || secondary.orderData,
    createdAt: storedOrder?.createdAt || existing.createdAt || incoming.createdAt,
    actionLabel: bestActionLabel,
    actionLink: primary.actionLink || secondary.actionLink || "/pedidos",
    secondaryActionLabel: bestSecondaryActionLabel,
    secondaryActionLink: bestSecondaryActionLink,
    timestamp: latestTs,
    timeAgo: formatNotificationHour(latestTs),
    group: "recientes",
    read: incomingIsNewer ? false : existing.read,
  };
}

/**
 * Inserta o recicla una notificación existente del mismo pedido:
 * Si ya existe una notificación de ese pedido (ej. se levantó ayer y se entregó hoy),
 * recicla ese mismo mensaje con la información actualizada, lo marca como no leído ("recientes")
 * y lo sube hasta arriba (posición 0) como notificación principal para no saturar la bandeja.
 */
export function upsertAndRecycleNotification(
  list: FBNotification[],
  incoming: FBNotification,
  options?: { markUnreadOnUpdate?: boolean }
): FBNotification[] {
  const markUnread = options?.markUnreadOnUpdate ?? true;
  const matchingIndices: number[] = [];

  list.forEach((item, index) => {
    if (isSameOrderEvent(item, incoming)) {
      matchingIndices.push(index);
    }
  });

  if (matchingIndices.length === 0) {
    return [incoming, ...list];
  }

  // Fusionar todas las coincidencias previas con la nueva notificación
  let merged = list[matchingIndices[0]];
  for (let i = 1; i < matchingIndices.length; i++) {
    merged = mergeNotifications(merged, list[matchingIndices[i]]);
  }
  const nowTs = incoming.timestamp || Date.now();
  merged = mergeNotifications(merged, { ...incoming, timestamp: nowTs });

  if (markUnread) {
    merged = {
      ...merged,
      read: false,
      group: "recientes",
      timestamp: nowTs,
      timeAgo: formatNotificationHour(nowTs),
    };
  }

  // Eliminar cualquier duplicado previo de ese mismo pedido y subir la notificación reciclada hasta arriba (índice 0)
  const remaining = list.filter((_, idx) => !matchingIndices.includes(idx));
  return [merged, ...remaining];
}

const normalizeStr = (s?: string) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export function isNotificationVisibleForUser(
  notif: Partial<FBNotification>,
  user: AppUser | null,
  activeBranch?: { id: string; name?: string; shortName?: string } | null
): boolean {
  if (!notif) return false;
  if (!isAllowedNotification(notif)) return false;

  const normUser = normalizeStr(user?.name);
  const normUsername = normalizeStr(user?.username);
  const normEmail = normalizeStr(user?.email);

  // Perfil específico de Andrés Sánchez (o cualquier alias de Los Ángeles):
  const isAndres = Boolean(
    user?.id === "usr-andres" ||
    user?.id === "usr-angeles" ||
    normUsername === "andres" ||
    normUsername === "angeles" ||
    normUser.includes("andres") ||
    normUser.includes("sanchez") ||
    normEmail.includes("andres") ||
    user?.assignedBranchId === "branch-angeles" ||
    normalizeStr(user?.assignedBranchName).includes("angeles")
  );

  // 1. Administrador real (Don Toño Brito, Paulina Brito, Lic. Roberto Morales):
  // "en los perfiles administrativos como el de paulina y toño, en esos debo tener todos los botones que son administrastivos y deben ver corte de cajas, pedidos etc, pero solo los perfiles administrativos"
  const isAdmin = Boolean(
    user && 
    !isAndres &&
    (user.role === "admin" || user.role === "auxiliar_admin") &&
    (
      user.id === "usr-1" ||
      user.id === "usr-2" ||
      user.id === "usr-3" ||
      normUsername === "admin" ||
      normUsername === "paulina" ||
      normUsername === "roberto" ||
      normUser.includes("tono") ||
      normUser.includes("toño") ||
      normUser.includes("paulina") ||
      normUser.includes("morales") ||
      normUser.includes("dueno") ||
      normUser.includes("dueño") ||
      user.roleLabel?.toLowerCase().includes("administrad") ||
      user.jobTitle?.toLowerCase().includes("administrad") ||
      user.role === "admin"
    )
  );

  // Administrador: acceso completo garantizado a todos los cortes de caja de empleados, pedidos y avisos globales del negocio
  if (isAdmin) {
    return true;
  }

  // 2. Perfiles Operativos de Sucursal (Andrés Sánchez, etc.) o filtro de Sucursal específica:
  // "el perfil de andres sanchez me comenta que sigue viedo estos botones, cuando te dije que solo debe ver el boton de pedidos los demas quitalos"
  const text = `${notif.title || ""} ${notif.highlightText || ""} ${notif.description || ""} ${notif.senderName || ""}`.toLowerCase();

  const isPedido =
    notif.category === "pedidos" ||
    Boolean(notif.orderId) ||
    text.includes("ped-") ||
    text.includes("pedido") ||
    text.includes("liquidado") ||
    text.includes("abono") ||
    text.includes("pastel");

  // Bloqueo estricto: Andrés Sánchez, cajeros y personal de sucursales NUNCA ven cortes ni cierres de caja
  if (!isPedido) {
    return false;
  }

  // Identificar el código canónico de la sucursal asignada al usuario (prioridad estricta al perfil en no-administradores)
  let targetBranchId = "";
  if (isAndres) {
    targetBranchId = "branch-angeles";
  } else if (user?.assignedBranchId) {
    targetBranchId = user.assignedBranchId;
  } else if (user?.assignedBranchName) {
    targetBranchId = user.assignedBranchName;
  } else if (user) {
    targetBranchId = resolveBranchId("", user.name || user.username);
  }

  if (!targetBranchId && activeBranch?.id && activeBranch.id !== "all") {
    targetBranchId = activeBranch.id;
  }

  const cashierBranchCode = getCanonicalBranchCode(targetBranchId);
  if (!cashierBranchCode) {
    if (isAndres) return checkBranchMatchesTargetCode(notif, "branch-angeles");
    return false;
  }

  return checkBranchMatchesTargetCode(notif, cashierBranchCode);
}

function checkBranchMatchesTargetCode(notif: Partial<FBNotification>, targetCode: string): boolean {
  // 1. Destino (recogida/entrega)
  const notifDestCode = getCanonicalBranchCode(notif.branchId || notif.branchName);
  if (notifDestCode && notifDestCode === targetCode) {
    return true;
  }

  // 2. Origen (sucursal que levantó o cobró)
  const notifOriginCode = getCanonicalBranchCode(notif.operatingBranchId || notif.operatingBranchName);
  if (notifOriginCode && notifOriginCode === targetCode) {
    return true;
  }

  // 3. Datos del corte de turno (corte de caja)
  if (notif.shiftCutData) {
    const cutBranchCode = getCanonicalBranchCode(notif.shiftCutData.branchId || notif.shiftCutData.branchName);
    if (cutBranchCode && cutBranchCode === targetCode) {
      return true;
    }
  }

  // 4. Contrastar con los datos reales del pedido almacenado (incluyendo ambas sucursales independientes)
  const order = findOrderForNotification(notif as FBNotification);
  if (order) {
    const orderDestCode = getCanonicalBranchCode(order.branchId || order.branchName);
    if (orderDestCode && orderDestCode === targetCode) {
      return true;
    }

    const orderOriginCode = getCanonicalBranchCode(order.operatingBranchId || order.operatingBranchName);
    if (orderOriginCode && orderOriginCode === targetCode) {
      return true;
    }

    if (order.cashier) {
      const cashierBranchCode = getCanonicalBranchCode(resolveBranchId(undefined, order.cashier));
      if (cashierBranchCode && cashierBranchCode === targetCode) {
        return true;
      }
    }

    if (Array.isArray(order.payments) && order.payments.length > 0) {
      for (const p of order.payments) {
        if (p.cashier) {
          const payBranchCode = getCanonicalBranchCode(resolveBranchId(undefined, p.cashier));
          if (payBranchCode && payBranchCode === targetCode) {
            return true;
          }
        }
      }
    }
  }

  // 5. Búsqueda de palabra clave por sucursal en el texto y metadatos de notas
  const text = `${notif.title || ""} ${notif.highlightText || ""} ${notif.description || ""} ${notif.senderName || ""} ${order?.notes || ""}`.toLowerCase();
  if (targetCode === "branch-matriz" && (text.includes("matriz") || text.includes("centro"))) return true;
  if (targetCode === "branch-angeles" && (text.includes("angeles") || text.includes("ángeles"))) return true;
  if (targetCode === "branch-sanjuan" && (text.includes("san juan") || text.includes("sanjuan"))) return true;
  if (targetCode === "branch-benito" && (text.includes("benito") || text.includes("mercado"))) return true;
  if (targetCode === "branch-1790889237862" && text.includes("ildefonso")) return true;
  if (targetCode === "branch-flores" && (text.includes("flores") || text.includes("plaza"))) return true;

  return false;
}

const INITIAL_FB_NOTIFICATIONS: FBNotification[] = [];

export function findOrderForNotification(notif: FBNotification): CustomOrder | null {
  try {
    // 0. Buscar primero el estado más reciente en getStoredOrders() para no devolver un snapshot obsoleto
    const liveStored = findRealStoredOrderForNotification(notif);
    if (liveStored) {
      return liveStored;
    }

    // 1. Si no está en almacenamiento local pero la notificación incluye orderData
    if (notif.orderData) {
      return notif.orderData;
    }

    // 2. Si no se encontró en almacenamiento local, reconstruir usando el extractor centralizado
    const reconstructed = extractOrderFromNotification(notif);
    if (reconstructed) {
      return reconstructed;
    }
  } catch (e) {
    console.error("Error finding order for notification:", e);
  }

  return null;
}

export function findShiftCutForNotification(notif: FBNotification): ShiftCutRecord | null {
  try {
    // 1. Si la notificación ya contiene los datos completos estructurados
    if (notif.shiftCutData) {
      return notif.shiftCutData;
    }

    // 2. Buscar en el historial de cortes de caja en localStorage
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("brito_shift_cuts_history");
      if (stored) {
        const history: ShiftCutRecord[] = JSON.parse(stored);
        if (Array.isArray(history) && history.length > 0) {
          if (notif.cutId) {
            const found = history.find((c) => c.id === notif.cutId);
            if (found) return found;
          }
          // Buscar coincidencia por folio en texto (ej. CORTE-MAT-001)
          const folioMatch = `${notif.id} ${notif.title} ${notif.description}`.match(/CORTE[-_]?[A-Za-z0-9_-]+/i);
          if (folioMatch) {
            const targetFolio = folioMatch[0].toUpperCase();
            const found = history.find((c) => c.id.toUpperCase() === targetFolio);
            if (found) return found;
          }
        }
      }
    }

    // 3. Sintetizar ShiftCutRecord completo con los datos enriquecidos del texto
    const fullText = `${notif.title} ${notif.highlightText} ${notif.description}`;

    // Horario de turno: ej. "06:30 a 14:00 hrs"
    const horarioMatch = fullText.match(/(?:horario(?:\s*de\s*turno)?|turno)[:\s]*([0-9]{1,2}:[0-9]{2}\s*(?:a|al|-)\s*[0-9]{1,2}:[0-9]{2}(?:\s*hrs)?)/i);
    const closeTimeMatch = notif.title.match(/Cierre a las ([0-9]{1,2}:[0-9]{2})/i);
    const shiftRange = horarioMatch
      ? horarioMatch[1].trim()
      : closeTimeMatch
      ? `Turno hasta las ${closeTimeMatch[1]} hrs`
      : "06:30 a 14:00 hrs";

    // Con cuánto dinero se quedó la caja (Fondo para siguiente turno)
    const targetBId = notif.branchId || notif.operatingBranchId || "branch-matriz";
    const isBenito = targetBId === "branch-benito" || notif.senderName.includes("San Benito") || notif.title.includes("San Benito");
    const isFlores = targetBId === "branch-flores" || notif.senderName.includes("Las Flores") || notif.title.includes("Las Flores");
    const branchStandardFund = isBenito ? 800 : isFlores ? 1200 : 1000;

    const nextFundMatch = fullText.match(/(?:fondo(?: dejado| para nuevo turno)?|se qued[óo] en caja)[:\s]*\$?([0-9,]+(?:\.[0-9]+)?)/i);
    const parsedNext = nextFundMatch ? parseFloat(nextFundMatch[1].replace(/,/g, "")) : branchStandardFund;
    const nextFund = (!isBenito && parsedNext === 800) ? branchStandardFund : parsedNext;

    // Efectivo esperado y contado
    const expectedMatch = fullText.match(/(?:efectivo esperado|esperado)[:\s]*\$?([0-9,]+(?:\.[0-9]+)?)/i);
    const countedMatch = fullText.match(/(?:efectivo (?:en caja|contado)|contado)[:\s]*\$?([0-9,]+(?:\.[0-9]+)?)/i);

    let expectedCash = expectedMatch ? parseFloat(expectedMatch[1].replace(/,/g, "")) : 0;
    let countedCash = countedMatch ? parseFloat(countedMatch[1].replace(/,/g, "")) : 0;

    // Dictamen de cuadre / Faltante / Sobrante
    let difference = 0;
    const faltanteMatch = fullText.match(/(?:faltante|falt[óo])[:\s]*-?\$?([0-9,]+(?:\.[0-9]+)?)/i);
    const sobranteMatch = fullText.match(/(?:sobrante|sobr[óo])[:\s]*\+?\$?([0-9,]+(?:\.[0-9]+)?)/i);
    const isExact =
      fullText.toLowerCase().includes("cuadrada exacta") ||
      fullText.toLowerCase().includes("cuadró exacta") ||
      fullText.toLowerCase().includes("cuadro exacta") ||
      fullText.toLowerCase().includes("cuadró exacto") ||
      fullText.toLowerCase().includes("cuadro exacto") ||
      fullText.toLowerCase().includes("($0.00)");

    if (faltanteMatch) {
      difference = -Math.abs(parseFloat(faltanteMatch[1].replace(/,/g, "")));
    } else if (sobranteMatch) {
      difference = Math.abs(parseFloat(sobranteMatch[1].replace(/,/g, "")));
    } else if (isExact) {
      difference = 0;
    }

    if (countedCash === 0 && expectedCash > 0) {
      countedCash = expectedCash + difference;
    } else if (expectedCash === 0 && countedCash > 0) {
      expectedCash = countedCash - difference;
    } else if (expectedCash === 0 && countedCash === 0) {
      countedCash = difference < 0 ? 3870 : 4850;
      expectedCash = difference < 0 ? 3920 : 4850;
    }

    // Responsables y relevo
    const relevoMatch = notif.highlightText.match(/^(?:Cambio de Turno:\s*)?([^\➔\-]+)\s*[➔\-]\s*([^\.]+)/i);
    const outgoing = relevoMatch
      ? relevoMatch[1].trim()
      : notif.senderName.replace(/^🏁\s*Cierre de Turno\s*\(|\)$/g, "").trim() || "silvia puga";
    const incoming = relevoMatch ? relevoMatch[2].trim() : "Don Toño Brito";

    const initialFund = branchStandardFund;
    const cashSales = Math.max(0, expectedCash - initialFund);
    const totalSales = cashSales + 1200;

    return {
      id: notif.cutId || `CORTE-${notif.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10).toUpperCase() || "001"}`,
      date: new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
      timestamp: Date.now(),
      shiftRange,
      outgoingCashier: outgoing,
      incomingCashier: incoming,
      responsible: outgoing,
      branchName: notif.branchName || "Sucursal Matriz (Centro)",
      branchId: targetBId,
      previousShift: "Turno Saliente",
      nextShift: "Turno Entrante",
      initialFund,
      cashSales,
      cardSales: 850,
      transferSales: 350,
      totalSales,
      totalSalesAll: totalSales,
      totalExpenses: 200,
      totalIncomes: 0,
      expectedCash,
      countedCash,
      difference,
      nextFund,
      notes: notif.description,
      expensesList: [],
    };
  } catch (e) {
    console.error("Error synthesizing shift cut for notification:", e);
  }

  return null;
}

export interface FormattedNotificationTime {
  exactTime: string;      // ej. "14:55 hrs", "Ayer 18:30 hrs", "08/10 14:20 hrs"
  liveTimeAgo: string;    // ej. "Hace 15 seg", "Hace 1 min", "Hace 2 hrs", "Hace 1 día"
  fullTooltip: string;    // ej. "Viernes, 9 de octubre de 2026 a las 14:55:23 hrs"
  secondsAgo: number;
}

/**
 * Temporizador y formateador dinámico de tiempo para notificaciones.
 * Muestra segundos (0 a 59s), luego minutos (1 a 59m), luego horas (1 a 23h), luego días,
 * junto con la hora exacta local a la que se registró el evento.
 */
export function formatLiveNotificationTime(timestamp?: number, now: number = Date.now()): FormattedNotificationTime {
  const ts = typeof timestamp === "number" && !isNaN(timestamp) && timestamp > 0 ? timestamp : now;
  const diffMs = Math.max(0, now - ts);
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  // 1. Temporizador dinámico: segundos -> minutos -> horas -> días -> semanas
  let liveTimeAgo = "";
  if (diffSec < 60) {
    liveTimeAgo = `Hace ${diffSec} seg`;
  } else if (diffMin < 60) {
    liveTimeAgo = diffMin === 1 ? "Hace 1 min" : `Hace ${diffMin} min`;
  } else if (diffHours < 24) {
    liveTimeAgo = diffHours === 1 ? "Hace 1 hr" : `Hace ${diffHours} hrs`;
  } else if (diffDays < 7) {
    liveTimeAgo = diffDays === 1 ? "Hace 1 día" : `Hace ${diffDays} días`;
  } else {
    const weeks = Math.floor(diffDays / 7);
    liveTimeAgo = weeks === 1 ? "Hace 1 sem" : `Hace ${weeks} sem`;
  }

  // 2. Hora exacta legible
  const notifDate = new Date(ts);
  const nowDate = new Date(now);

  const isToday = notifDate.toDateString() === nowDate.toDateString();
  const yesterday = new Date(nowDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = notifDate.toDateString() === yesterday.toDateString();

  const hours = String(notifDate.getHours()).padStart(2, "0");
  const minutes = String(notifDate.getMinutes()).padStart(2, "0");
  const timeOnly = `${hours}:${minutes} hrs`;

  let exactTime = "";
  if (isToday) {
    exactTime = timeOnly;
  } else if (isYesterday) {
    exactTime = `Ayer ${timeOnly}`;
  } else {
    const day = String(notifDate.getDate()).padStart(2, "0");
    const month = String(notifDate.getMonth() + 1).padStart(2, "0");
    exactTime = `${day}/${month} ${timeOnly}`;
  }

  // 3. Tooltip completo con día de la semana, fecha, hora y segundos
  let fullTooltip = "";
  try {
    const dayName = notifDate.toLocaleDateString("es-MX", { weekday: "long" });
    const fullDate = notifDate.toLocaleDateString("es-MX", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const secs = String(notifDate.getSeconds()).padStart(2, "0");
    fullTooltip = `${dayName.charAt(0).toUpperCase() + dayName.slice(1)}, ${fullDate} a las ${hours}:${minutes}:${secs} hrs`;
  } catch (e) {
    fullTooltip = `${notifDate.toLocaleString("es-MX")} hrs`;
  }

  return {
    exactTime,
    liveTimeAgo,
    fullTooltip,
    secondsAgo: diffSec,
  };
}

/**
 * Formatea la hora exacta de la notificación (ej. "18:05 hrs")
 */
export function formatNotificationHour(timestamp?: number): string {
  const ts = typeof timestamp === "number" && !isNaN(timestamp) && timestamp > 0 ? timestamp : Date.now();
  const d = new Date(ts);
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes} hrs`;
}

/**
 * Resuelve y garantiza un timestamp numérico fiable para cualquier notificación,
 * buscando en sus datos de corte, pedido asociado, id o texto relativo previo.
 */
export function resolveNotificationTimestamp(notif: Partial<FBNotification>): number {
  if (typeof notif.timestamp === "number" && !isNaN(notif.timestamp) && notif.timestamp > 1000000000000) {
    return notif.timestamp;
  }
  if (typeof notif.timestamp === "string") {
    const parsedTs = Number(notif.timestamp) || new Date(notif.timestamp).getTime();
    if (!isNaN(parsedTs) && parsedTs > 1000000000000) return parsedTs;
  }

  if (notif.shiftCutData?.timestamp && typeof notif.shiftCutData.timestamp === "number" && notif.shiftCutData.timestamp > 1000000000000) {
    return notif.shiftCutData.timestamp;
  }

  const order = findRealStoredOrderForNotification(notif);
  if (order) {
    if (order.timestamp && typeof order.timestamp === "number" && order.timestamp > 1000000000000) {
      return order.timestamp;
    }
    if (order.createdAt) {
      const t = new Date(order.createdAt).getTime();
      if (!isNaN(t) && t > 1000000000000) return t;
    }
  }

  if (notif.id) {
    const tsMatch = notif.id.match(/\b(17\d{11})\b/);
    if (tsMatch && tsMatch[1]) {
      const parsed = parseInt(tsMatch[1], 10);
      if (!isNaN(parsed) && parsed > 1000000000000) return parsed;
    }
  }

  if (notif.createdAt) {
    const t = new Date(notif.createdAt).getTime();
    if (!isNaN(t) && t > 1000000000000) return t;
  }

  return 0;
}

interface NotificationContextType {
  notifications: FBNotification[];
  allNotifications?: FBNotification[];
  unreadCount: number;
  soundEnabled: boolean;
  nativePermission: NotificationPermission;
  realtimeStatus: RealtimeStatus;
  requestNativePermission: () => Promise<NotificationPermission>;
  toggleSound: () => void;
  markAsRead: (id: string) => void;
  markAsUnread: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
  addNotification: (notif: Omit<FBNotification, "id" | "read" | "timeAgo" | "group"> & Partial<FBNotification>) => void;
  openOrderDetail: (orderOrNotif: CustomOrder | FBNotification) => void;
  openOrderPayment: (orderOrNotif: CustomOrder | FBNotification) => void;
  closeOrderDetail: () => void;
  openShiftCutDetail: (cutOrNotif: ShiftCutRecord | FBNotification) => void;
  closeShiftCutDetail: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const STORAGE_NOTIFS_KEY = "brito_notifications";

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  // Conectar con el usuario actual y sucursal activa
  let authContext: any = null;
  let branchContext: any = null;
  try {
    authContext = useAuth();
  } catch (e) {}
  try {
    branchContext = useBranch();
  } catch (e) {}

  const user: AppUser | null = authContext?.user || null;
  const currentBranch = branchContext?.currentBranch || null;

  const userRef = useRef(user);
  userRef.current = user;
  const currentBranchRef = useRef(currentBranch);
  currentBranchRef.current = currentBranch;

  const [notifications, setNotifications] = useState<FBNotification[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_NOTIFS_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Filtrar estrictamente solo notificaciones posteriores al arranque limpio
            const epochFiltered = parsed.filter((item: FBNotification) => {
              if (!isAllowedNotification(item)) return false;
              const ts = resolveNotificationTimestamp(item);
              return ts >= CLEAN_SLATE_EPOCH;
            });

            if (epochFiltered.length === 0) {
              localStorage.setItem(STORAGE_NOTIFS_KEY, JSON.stringify([]));
              return [];
            }

            const allowed = epochFiltered.map((item: FBNotification) => {
              const enrichedTs = resolveNotificationTimestamp(item);
              const timeAgoClean = (!item.timeAgo || item.timeAgo === "Hace un momento" || item.timeAgo.toLowerCase() === "ahora")
                ? formatNotificationHour(enrichedTs)
                : item.timeAgo;
              return { ...item, timestamp: enrichedTs, timeAgo: timeAgoClean };
            });

            // Reciclar y colapsar cualquier notificación duplicada del mismo pedido (de más antigua a más reciente)
            const chronological = [...allowed].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
            let recycledList: FBNotification[] = [];
            for (const item of chronological) {
              recycledList = upsertAndRecycleNotification(recycledList, item, { markUnreadOnUpdate: false });
            }

            localStorage.setItem(STORAGE_NOTIFS_KEY, JSON.stringify(recycledList));
            return recycledList;
          }
        }
      } catch (e) {}
    }
    return [];
  });

  const notificationsRef = useRef(notifications);
  notificationsRef.current = notifications;

  useEffect(() => {
    setNotifications((prev) => {
      const valid = prev.filter((item) => {
        if (!isAllowedNotification(item)) return false;
        const ts = resolveNotificationTimestamp(item);
        return ts >= CLEAN_SLATE_EPOCH;
      });
      if (valid.length !== prev.length) {
        try {
          localStorage.setItem(STORAGE_NOTIFS_KEY, JSON.stringify(valid));
        } catch {}
        return valid;
      }
      return prev;
    });
  }, []);

  // Clave única por perfil para independencia total de lectura y de pedidos finalizados/entregados ocultados
  const profileKey = useMemo(() => {
    const raw = user?.id || user?.username || user?.name || "anon";
    return raw.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  }, [user?.id, user?.username, user?.name]);

  const [profileStateTick, setProfileStateTick] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOrdersOrProfileSync = () => {
      setProfileStateTick((t) => t + 1);
    };
    window.addEventListener("brito_orders_updated", handleOrdersOrProfileSync);
    return () => {
      window.removeEventListener("brito_orders_updated", handleOrdersOrProfileSync);
    };
  }, []);

  const getDismissedSetForProfile = (pKey: string): Set<string> => {
    if (typeof window === "undefined") return new Set();
    try {
      const saved = localStorage.getItem(`brito_dismissed_terminal_orders_${pKey}`);
      if (saved) {
        const arr = JSON.parse(saved);
        if (Array.isArray(arr)) return new Set(arr);
      }
    } catch {}
    return new Set();
  };

  const getReadMapForProfile = (pKey: string): Record<string, string> => {
    if (typeof window === "undefined") return {};
    try {
      const saved = localStorage.getItem(`brito_read_notifs_${pKey}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {}
    return {};
  };

  const getNotificationReadSignature = (notif: Partial<FBNotification>): string => {
    const stage = getOrderNotificationStage(notif);
    if (stage === "other") return "read";
    const stored = findRealStoredOrderForNotification(notif);
    const payVersion = stored
      ? `${stored.deposit ?? 0}_${stored.remainingBalance ?? ""}_${stored.payments?.length ?? 0}_${stored.status ?? ""}`
      : (notif.title || notif.highlightText || "");
    return `${stage}:${payVersion}`;
  };

  const markNotificationReadForProfile = (notif: Partial<FBNotification>) => {
    if (typeof window === "undefined") return;
    const keys = getOrderIdentityKeys(notif);
    if (notif.id) keys.push(notif.id.toLowerCase().trim());
    if (keys.length === 0) return;

    const sig = getNotificationReadSignature(notif);
    const currentMap = getReadMapForProfile(profileKey);
    keys.forEach((k) => {
      currentMap[k] = sig;
    });
    try {
      localStorage.setItem(`brito_read_notifs_${profileKey}`, JSON.stringify(currentMap));
    } catch {}
    setProfileStateTick((t) => t + 1);
  };

  const markNotificationUnreadForProfile = (notif: Partial<FBNotification>) => {
    if (typeof window === "undefined") return;
    const keys = getOrderIdentityKeys(notif);
    if (notif.id) keys.push(notif.id.toLowerCase().trim());
    if (keys.length === 0) return;

    try {
      const storageKeysToUpdate = new Set<string>([`brito_read_notifs_${profileKey}`]);
      for (let i = 0; i < localStorage.length; i++) {
        const sk = localStorage.key(i);
        if (sk && sk.startsWith("brito_read_notifs_")) {
          storageKeysToUpdate.add(sk);
        }
      }
      storageKeysToUpdate.forEach((sk) => {
        try {
          const saved = localStorage.getItem(sk);
          if (!saved) return;
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            let changed = false;
            keys.forEach((k) => {
              if (k in parsed) {
                delete parsed[k];
                changed = true;
              }
            });
            if (changed) {
              localStorage.setItem(sk, JSON.stringify(parsed));
            }
          }
        } catch {}
      });
    } catch {}
    setProfileStateTick((t) => t + 1);
  };

  const isNotificationReadForProfile = (
    notif: Partial<FBNotification>,
    readMap: Record<string, string>
  ): boolean => {
    const keys = getOrderIdentityKeys(notif);
    if (notif.id) keys.push(notif.id.toLowerCase().trim());
    const sig = getNotificationReadSignature(notif);
    return keys.some((k) => readMap[k] === sig);
  };

  const dismissTerminalOrderForProfile = (notif: Partial<FBNotification>) => {
    if (typeof window === "undefined") return;
    const keys = getOrderIdentityKeys(notif);
    if (notif.id) keys.push(notif.id.toLowerCase().trim());
    if (keys.length === 0) return;

    const stage = getOrderNotificationStage(notif);
    const next = getDismissedSetForProfile(profileKey);
    keys.forEach((k) => {
      next.add(`${k}::${stage}`);
      next.add(k);
    });
    try {
      localStorage.setItem(`brito_dismissed_terminal_orders_${profileKey}`, JSON.stringify(Array.from(next)));
    } catch {}
    setProfileStateTick((t) => t + 1);
  };

  const undismissOrderForProfile = (notif: Partial<FBNotification>) => {
    if (typeof window === "undefined") return;
    const keys = getOrderIdentityKeys(notif);
    if (notif.id) keys.push(notif.id.toLowerCase().trim());
    if (keys.length === 0) return;

    const stage = getOrderNotificationStage(notif);
    try {
      const storageKeysToUpdate = new Set<string>([`brito_dismissed_terminal_orders_${profileKey}`]);
      for (let i = 0; i < localStorage.length; i++) {
        const sk = localStorage.key(i);
        if (sk && sk.startsWith("brito_dismissed_terminal_orders_")) {
          storageKeysToUpdate.add(sk);
        }
      }
      storageKeysToUpdate.forEach((sk) => {
        try {
          const saved = localStorage.getItem(sk);
          if (!saved) return;
          const arr = JSON.parse(saved);
          if (!Array.isArray(arr)) return;
          const next = new Set<string>(arr);
          let changed = false;
          keys.forEach((k) => {
            if (next.has(k)) {
              next.delete(k);
              changed = true;
            }
            if (next.has(`${k}::${stage}`)) {
              next.delete(`${k}::${stage}`);
              changed = true;
            }
          });
          if (changed) {
            localStorage.setItem(sk, JSON.stringify(Array.from(next)));
          }
        } catch {}
      });
    } catch {}
    setProfileStateTick((t) => t + 1);
  };

  const isDismissedTerminalForProfile = (notif: Partial<FBNotification>, dismissedSet: Set<string>): boolean => {
    if (!isTerminalOrderNotification(notif)) return false;
    const stage = getOrderNotificationStage(notif);
    const keys = getOrderIdentityKeys(notif);
    if (notif.id) keys.push(notif.id.toLowerCase().trim());
    return keys.some((k) => dismissedSet.has(`${k}::${stage}`) || dismissedSet.has(k));
  };

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [nativePermission, setNativePermission] = useState<NotificationPermission>("default");
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>(() =>
    realtimeHub.getStatus ? realtimeHub.getStatus() : "disconnected"
  );
  const [activeToast, setActiveToast] = useState<FBNotification | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNativePermission(Notification.permission);
    }
  }, []);

  const triggerNativeNotification = (notif: FBNotification) => {
    if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") {
      return;
    }
    try {
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((reg) => {
          reg
            .showNotification(`🥖 ${notif.title}`, {
              body: `${notif.highlightText}\n${notif.description}`,
              icon: "/logo.png",
              badge: "/logo.png",
              tag: notif.id,
              data: { link: notif.actionLink || "/" },
            })
            .catch(() => {
              new Notification(`🥖 ${notif.title}`, {
                body: `${notif.highlightText}\n${notif.description}`,
                icon: "/logo.png",
                badge: "/logo.png",
                tag: notif.id,
              });
            });
        });
      } else {
        new Notification(`🥖 ${notif.title}`, {
          body: `${notif.highlightText}\n${notif.description}`,
          icon: "/logo.png",
          badge: "/logo.png",
          tag: notif.id,
        });
      }
    } catch (e) {
      console.warn("Error triggering native notification:", e);
    }
  };

  const requestNativePermission = async (): Promise<NotificationPermission> => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "denied";
    }
    try {
      const perm = await Notification.requestPermission();
      setNativePermission(perm);
      if (perm === "granted") {
        try {
          const isAdmin = Boolean(user && (user.role === "admin" || user.role === "auxiliar_admin"));
          triggerNativeNotification({
            id: `welcome-${Date.now()}`,
            senderName: "🥖 Panadería Brito",
            senderAvatar: "🥖",
            badgeIcon: isAdmin ? "dinero" : "pastel",
            title: isAdmin ? "Avisos de Turnos y Pedidos" : "Avisos de Pedidos en Sucursal",
            highlightText: "¡Notificaciones activas en tu dispositivo!",
            description: isAdmin
              ? "Te avisaremos de inmediato cada corte de caja (si cuadró o no) y pedidos de todas las sucursales."
              : `Te avisaremos de inmediato cuando se levante o entregue un pedido en tu sucursal (${user?.assignedBranchName || "Mostrador"}).`,
            timeAgo: "Ahora",
            group: "recientes",
            read: false,
            category: isAdmin ? "caja" : "pedidos",
          });
        } catch (e) {}
      }
      return perm;
    } catch (e) {
      return "denied";
    }
  };

  // Notificaciones filtradas según el rol y sucursal del usuario, con estado de lectura y ocultación de concluidos 100% independientes por perfil
  const visibleNotifications = useMemo(() => {
    // Referenciar profileStateTick para recalcular al instante ante cambios de perfil, lectura u órdenes
    void profileStateTick;
    const dismissedSet = getDismissedSetForProfile(profileKey);
    const readMap = getReadMapForProfile(profileKey);

    // 1. Enriquecer cada notificación de pedido con el estado actual del pedido almacenado y filtrar por sucursal/rol
    const enrichedAndFiltered: FBNotification[] = [];
    for (const rawNotif of notifications) {
      const ts = resolveNotificationTimestamp(rawNotif);
      if (ts < CLEAN_SLATE_EPOCH) continue;

      const isOrderNotif =
        rawNotif.category === "pedidos" ||
        Boolean(rawNotif.orderId) ||
        (rawNotif.title && rawNotif.title.toLowerCase().includes("ped-")) ||
        (rawNotif.title && rawNotif.title.toLowerCase().includes("pedido"));

      const notif = isOrderNotif ? mergeNotifications(rawNotif, rawNotif) : rawNotif;
      if (isDismissedTerminalForProfile(notif, dismissedSet)) continue;
      if (!isNotificationVisibleForUser(notif, user, currentBranch)) continue;
      enrichedAndFiltered.push(notif);
    }

    // 2. DEDUPLICACIÓN Y RECICLAJE EN TIEMPO DE RENDER: Garantía del 100% de 1 sola notificación por pedido
    const deduped: FBNotification[] = [];
    for (const item of enrichedAndFiltered) {
      const idx = deduped.findIndex((d) => isSameOrderEvent(d, item));
      if (idx === -1) {
        deduped.push(item);
      } else {
        deduped[idx] = mergeNotifications(deduped[idx], item);
      }
    }

    // 3. Proyectar estado de lectura (read) exclusivo e independiente para este perfil
    return deduped
      .filter((n) => !isDismissedTerminalForProfile(n, dismissedSet))
      .map((n) => ({
        ...n,
        read: isNotificationReadForProfile(n, readMap),
      }));
  }, [notifications, user, currentBranch, profileKey, profileStateTick]);

  // Conteo de no leídas calculado exclusivamente sobre las notificaciones visibles para el perfil activo
  const unreadCount = useMemo(() => {
    return visibleNotifications.filter((n) => !n.read).length;
  }, [visibleNotifications]);

  const persistNotifs = (list: FBNotification[]) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_NOTIFS_KEY, JSON.stringify(list));
      } catch (e) {}
    }
  };

  const playChime = () => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;
      const audioCtx = new AudioCtxClass();
      if (audioCtx.state === "suspended") {
        audioCtx.resume().catch(() => {});
      }
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch (e) {
      console.log(e);
    }
  };

  // Conectar con el Hub de Tiempo Real de Supabase para recibir alertas remotas
  useEffect(() => {
    if (typeof window === "undefined" || !realtimeHub.onNotification) return;

    const unsubNotification = realtimeHub.onNotification((incomingNotif) => {
      // Filtrar estrictamente: solo Cierres de Turno y Pedidos posteriores al epoch limpio
      if (!isAllowedNotification(incomingNotif)) return;
      const notifTs = resolveNotificationTimestamp(incomingNotif);
      if (!notifTs || notifTs < CLEAN_SLATE_EPOCH) return;

      const remoteNotif: FBNotification = {
        ...incomingNotif,
        timestamp: notifTs,
      };

      // Vincular 100% de inmediato con el almacenamiento de pedidos
      if (remoteNotif.orderData) {
        const stored = getStoredOrders();
        const existingIdx = stored.findIndex((o) => o.id === remoteNotif.orderData!.id || o.orderNumber === remoteNotif.orderData!.orderNumber);
        if (existingIdx === -1) {
          saveStoredOrders([remoteNotif.orderData, ...stored]);
        } else {
          const updated = [...stored];
          updated[existingIdx] = { ...updated[existingIdx], ...remoteNotif.orderData };
          saveStoredOrders(updated);
        }
      } else if (remoteNotif.category === "pedidos" || remoteNotif.orderId || (remoteNotif.title && remoteNotif.title.toLowerCase().includes("ped-"))) {
        const stored = getStoredOrders();
        const exists = stored.some(
          (o) =>
            (remoteNotif.orderId && (o.id === remoteNotif.orderId || o.orderNumber === remoteNotif.orderId)) ||
            (remoteNotif.title && o.orderNumber && remoteNotif.title.includes(o.orderNumber))
        );
        if (!exists) {
          const recovered = extractOrderFromNotification(remoteNotif);
          if (recovered) {
            saveStoredOrders([recovered, ...stored]);
          }
        }
      }

      const existingMatch = notificationsRef.current.find((n) => isSameOrderEvent(n, remoteNotif));
      const prevIntrinsicStage = existingMatch ? getNotificationIntrinsicStage(existingMatch) : null;
      const incomingStage = getOrderNotificationStage(remoteNotif);
      const prevDeposit = existingMatch?.orderData?.deposit;
      const incomingDeposit = remoteNotif.orderData?.deposit;
      const isSameStageEcho = Boolean(
        existingMatch &&
        prevIntrinsicStage === incomingStage &&
        (prevDeposit === undefined || incomingDeposit === undefined || Number(prevDeposit) === Number(incomingDeposit)) &&
        Math.abs((remoteNotif.timestamp || Date.now()) - (existingMatch.timestamp || 0)) < 4000
      );

      // Siempre des-ocultar y marcar como no leída al actualizarse la notificación reciclada del pedido
      undismissOrderForProfile(remoteNotif);
      markNotificationUnreadForProfile(remoteNotif);

      setNotifications((prev) => {
        const updated = upsertAndRecycleNotification(prev, remoteNotif, { markUnreadOnUpdate: true });
        persistNotifs(updated);
        return updated;
      });

      if (isSameStageEcho) {
        return;
      }

      // Efectos inmediatos en el celular SOLO si la notificación es visible para este usuario
      const isVisible = isNotificationVisibleForUser(remoteNotif, userRef.current, currentBranchRef.current);
      if (isVisible) {
        playChime();
        setActiveToast(remoteNotif);
        triggerNativeNotification(remoteNotif);
      }
    });

    const unsubStatus = realtimeHub.onStatusChange((status) => {
      setRealtimeStatus(status);
    });

    const unsubOrder = realtimeHub.onOrder
      ? realtimeHub.onOrder(({ action, order }) => {
          if (!order) return;
          const orderTs = order.timestamp || (order.createdAt ? new Date(order.createdAt).getTime() : 0);
          if (!orderTs || orderTs < CLEAN_SLATE_EPOCH) return;

          // Sincronizar y vincular 100% el pedido en el historial del almacenamiento local
          try {
            const stored = getStoredOrders();
            const existingIdx = stored.findIndex((o) => o.id === order.id || o.orderNumber === order.orderNumber);
            if (existingIdx === -1) {
              saveStoredOrders([order, ...stored]);
            } else {
              const updated = [...stored];
              updated[existingIdx] = { ...updated[existingIdx], ...order };
              saveStoredOrders(updated);
            }
          } catch (storageErr) {
            console.warn("Error actualizando pedido desde realtimeHub.onOrder:", storageErr);
          }

          if (action === "create") {
            const notifId = `notif-order-${order.id}`;
            const existingMatch = notificationsRef.current.find((n) =>
              isSameOrderEvent(n, { id: notifId, orderId: order.id, highlightText: order.orderNumber })
            );
            if (existingMatch && getNotificationIntrinsicStage(existingMatch) === "created") {
              return;
            }

            const totalNum = Number(order.total) || 0;
            const depositNum = Number(order.deposit) || 0;
            const remaining = Number(order.remainingBalance) !== undefined && !isNaN(Number(order.remainingBalance))
              ? Number(order.remainingBalance)
              : Math.max(0, totalNum - depositNum);
            const originName = order.operatingBranchName || "Sucursal";
            const currentOrDestName = order.branchName || "Sucursal";
            const isCross = Boolean(
              originName && currentOrDestName &&
              originName.toLowerCase().trim() !== currentOrDestName.toLowerCase().trim()
            );

            const branchSender = isCross
              ? `🎂 ${originName} ➔ ${currentOrDestName}`
              : `🎂 Pedido Registrado (${currentOrDestName})`;

            const notif: FBNotification = {
              id: notifId,
              senderName: branchSender,
              senderAvatar: "🎂",
              badgeIcon: "pastel",
              title: `Nuevo Pedido ${order.orderNumber}: Total $${totalNum.toFixed(2)}`,
              highlightText: `${order.customerName} • Anticipo: $${depositNum.toFixed(2)}${remaining > 0 ? ` (Resta: $${remaining.toFixed(2)})` : " (Liquidado)"}`,
              description: `${order.description ? `${order.description}. ` : ""}${isCross ? `[Levantado en: ${originName} • Entrega en: ${currentOrDestName}] ` : (order.deliveryType === "domicilio" ? `A domicilio: ${order.deliveryAddress || "Dirección registrada"}. ` : `Recoge en: ${currentOrDestName}. `)}Entrega: ${order.deliveryDate} a las ${order.deliveryTime} hrs. Saldo restante: $${remaining.toFixed(2)}.`,
              timeAgo: formatNotificationHour(order.timestamp || Date.now()),
              timestamp: order.timestamp || Date.now(),
              group: "recientes",
              read: false,
              category: "pedidos",
              orderId: order.id,
              orderData: order,
              branchId: order.branchId,
              branchName: order.branchName,
              operatingBranchId: order.operatingBranchId,
              operatingBranchName: order.operatingBranchName,
              actionLabel: remaining > 0 ? `Cobrar $${remaining.toFixed(2)}` : "Ver Detalle",
              actionLink: "/pedidos",
              secondaryActionLabel: remaining > 0 ? "Ver Detalle" : undefined,
              secondaryActionLink: remaining > 0 ? "/pedidos" : undefined,
            };

            setNotifications((prev) => {
              const updated = upsertAndRecycleNotification(prev, notif, { markUnreadOnUpdate: true });
              persistNotifs(updated);
              return updated;
            });

            const isVisible = isNotificationVisibleForUser(notif, userRef.current, currentBranchRef.current);
            if (isVisible) {
              playChime();
              setActiveToast(notif);
              triggerNativeNotification(notif);
            }
          } else if (action === "payment") {
            const totalNum = Number(order.total) || 0;
            const depositNum = Number(order.deposit) || 0;
            const remNum = Number(order.remainingBalance) || 0;
            const isPaid = remNum === 0 || order.paymentStatus === "liquidado";
            const lastPayment = Array.isArray(order.payments) && order.payments.length > 0 ? order.payments[order.payments.length - 1] : null;
            const paymentAmount = Number(lastPayment?.amount) || depositNum || 0;
            const notifId = `notif-order-${order.id}`;

            const originName = order.operatingBranchName || "Sucursal";
            const currentOrDestName = order.branchName || "Sucursal";
            const isCross = originName.toLowerCase().trim() !== currentOrDestName.toLowerCase().trim();
            const baseItemsDesc = order.description ? `${order.description}. ` : "";
            const deliverySummary = `${isCross ? `[Levantado en: ${originName} • Entrega en: ${currentOrDestName}] ` : `Recoge en: ${currentOrDestName}. `}Entrega: ${order.deliveryDate} a las ${order.deliveryTime} hrs.`;

            const notif: FBNotification = {
              id: notifId,
              senderName: isCross
                ? `🎂 ${originName} ➔ ${currentOrDestName}`
                : isPaid
                ? `✅ Pedido Liquidado (${currentOrDestName})`
                : `💰 Abono de Pedido (${currentOrDestName})`,
              senderAvatar: "🎂",
              badgeIcon: "pastel",
              title: isPaid
                ? `Pedido ${order.orderNumber}: Total $${totalNum.toFixed(2)} • ¡Cliente ya pagó!`
                : `Pedido ${order.orderNumber}: Total $${totalNum.toFixed(2)} • Abonó $${paymentAmount.toFixed(2)}`,
              highlightText: isPaid
                ? `${order.customerName} • ¡Cliente ya pagó! (Total: $${totalNum.toFixed(2)})`
                : `${order.customerName} • Abonó: $${paymentAmount.toFixed(2)} • Pagado: $${depositNum.toFixed(2)} (Resta: $${remNum.toFixed(2)})`,
              description: isPaid
                ? `✅ El cliente ya pagó el total ($${totalNum.toFixed(2)} • Último abono: $${paymentAmount.toFixed(2)}). ${baseItemsDesc}${deliverySummary}`
                : `💰 El cliente abonó $${paymentAmount.toFixed(2)} (Total pagado: $${depositNum.toFixed(2)} • Resta: $${remNum.toFixed(2)}). ${baseItemsDesc}${deliverySummary}`,
              timeAgo: formatNotificationHour(Date.now()),
              timestamp: Date.now(),
              group: "recientes",
              read: false,
              category: "pedidos",
              orderId: order.id,
              orderData: order,
              branchId: order.branchId,
              branchName: order.branchName,
              operatingBranchId: order.operatingBranchId,
              operatingBranchName: order.operatingBranchName,
              actionLabel: remNum > 0 ? `Cobrar $${remNum.toFixed(2)}` : "Ver Detalle",
              actionLink: "/pedidos",
              secondaryActionLabel: remNum > 0 ? "Ver Detalle" : undefined,
              secondaryActionLink: remNum > 0 ? "/pedidos" : undefined,
            };

            const existingMatch = notificationsRef.current.find((n) => isSameOrderEvent(n, notif));
            const prevDeposit = existingMatch?.orderData?.deposit;
            const isSamePaymentEcho = Boolean(
              existingMatch &&
              prevDeposit !== undefined &&
              Number(prevDeposit) === depositNum &&
              Math.abs(Date.now() - (existingMatch.timestamp || 0)) < 4000
            );

            undismissOrderForProfile(notif);
            markNotificationUnreadForProfile(notif);

            setNotifications((prev) => {
              const updated = upsertAndRecycleNotification(prev, notif, { markUnreadOnUpdate: true });
              persistNotifs(updated);
              return updated;
            });

            if (isSamePaymentEcho) return;

            const isVisible = isNotificationVisibleForUser(notif, userRef.current, currentBranchRef.current);
            if (isVisible) {
              playChime();
              setActiveToast(notif);
              triggerNativeNotification(notif);
            }
          } else if (action === "status") {
            const notifId = `notif-order-${order.id}`;
            const originName = order.operatingBranchName || "Sucursal";
            const delivBranchName = order.branchName || "Sucursal";
            const isCross = originName.toLowerCase().trim() !== delivBranchName.toLowerCase().trim();
            const totalNum = Number(order.total) || 0;
            const remNum = Number(order.remainingBalance) || 0;

            let title = `Pedido ${order.orderNumber}: Total $${totalNum.toFixed(2)}`;
            let description = `El pedido ${order.orderNumber} cambió a estado ${order.status}.`;
            let senderName = `📦 Pedido ${order.orderNumber} (${delivBranchName})`;
            let avatar = "📦";

            if (order.status === "entregado") {
              senderName = `📦 Pedido Entregado (${delivBranchName})`;
              avatar = "📦";
              title = `Pedido Entregado con Éxito: ${order.orderNumber}${totalNum ? ` • Total $${totalNum.toFixed(2)}` : ""}`;
              description = `${order.description ? `${order.description}. ` : ""}El pedido ${order.orderNumber} de "${order.customerName}" fue entregado satisfactoriamente en ${delivBranchName}.${isCross ? ` (Originado en: ${originName}).` : ""}`;
            } else if (order.status === "listo") {
              senderName = `🎂 Listo en Sucursal (${delivBranchName})`;
              avatar = "🎂";
              title = `El producto ya está en sucursal: ${order.orderNumber}${totalNum ? ` • Total $${totalNum.toFixed(2)}` : ""}`;
              description = `${order.description ? `${order.description}. ` : ""}El pedido ${order.orderNumber} de "${order.customerName}" ha sido marcado como LISTO en sucursal para entrega en ${delivBranchName}.`;
            } else if (order.status === "cancelado") {
              senderName = `🗑️ Pedido Cancelado (${delivBranchName})`;
              avatar = "🗑️";
              title = `Pedido Cancelado / Dado de Baja: ${order.orderNumber}${totalNum ? ` • Total $${totalNum.toFixed(2)}` : ""}`;
              description = `${order.description ? `${order.description}. ` : ""}El pedido ${order.orderNumber} de "${order.customerName}" ha sido dado de baja o cancelado.`;
            }

            const notif: FBNotification = {
              id: notifId,
              senderName,
              senderAvatar: avatar,
              badgeIcon: "pastel",
              title,
              highlightText: `${order.customerName} • ${order.status === "entregado" ? "Entregado al Cliente" : order.status === "cancelado" ? "Dado de Baja" : order.status === "listo" ? "Listo en Sucursal" : order.status}`,
              description,
              timeAgo: formatNotificationHour(Date.now()),
              timestamp: Date.now(),
              group: "recientes",
              read: false,
              category: "pedidos",
              orderId: order.id,
              orderData: order,
              branchId: order.branchId,
              branchName: order.branchName,
              operatingBranchId: order.operatingBranchId,
              operatingBranchName: order.operatingBranchName,
              actionLabel:
                order.status === "entregado"
                  ? "Ver Pedido Entregado"
                  : order.status === "cancelado"
                  ? "Ver Pedido Cancelado"
                  : remNum > 0
                  ? `Cobrar $${remNum.toFixed(2)}`
                  : "Ver Detalle",
              actionLink: "/pedidos",
              secondaryActionLabel: order.status !== "entregado" && order.status !== "cancelado" && remNum > 0 ? "Ver Detalle" : undefined,
              secondaryActionLink: order.status !== "entregado" && order.status !== "cancelado" && remNum > 0 ? "/pedidos" : undefined,
            };

            const existingMatch = notificationsRef.current.find((n) => isSameOrderEvent(n, notif));
            const prevIntrinsicStage = existingMatch ? getNotificationIntrinsicStage(existingMatch) : null;
            const incomingStage = getOrderNotificationStage(notif);
            const isSameStageEcho = Boolean(
              existingMatch &&
              prevIntrinsicStage === incomingStage &&
              Math.abs(Date.now() - (existingMatch.timestamp || 0)) < 4000
            );

            undismissOrderForProfile(notif);
            markNotificationUnreadForProfile(notif);

            setNotifications((prev) => {
              const updated = upsertAndRecycleNotification(prev, notif, { markUnreadOnUpdate: true });
              persistNotifs(updated);
              return updated;
            });

            if (isSameStageEcho) return;

            const isVisible = isNotificationVisibleForUser(notif, userRef.current, currentBranchRef.current);
            if (isVisible) {
              playChime();
              setActiveToast(notif);
              triggerNativeNotification(notif);
            }
          }
        })
      : undefined;

    return () => {
      unsubNotification();
      unsubStatus();
      if (unsubOrder) unsubOrder();
    };
  }, []);

  // Escuchar cambios de notificaciones generadas en otras pestañas locales
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_NOTIFS_KEY && e.newValue) {
        try {
          const rawRemoteList: FBNotification[] = JSON.parse(e.newValue);
          if (!Array.isArray(rawRemoteList)) return;
          const epochFiltered = rawRemoteList.filter((n) => {
            const ts = resolveNotificationTimestamp(n);
            return ts >= CLEAN_SLATE_EPOCH;
          });
          if (epochFiltered.length === 0) {
            setNotifications([]);
            return;
          }
          const remoteList = epochFiltered.map((n) => ({
            ...n,
            timestamp: resolveNotificationTimestamp(n),
          }));

          const chronological = [...remoteList].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
          let recycledRemoteList: FBNotification[] = [];
          for (const item of chronological) {
            recycledRemoteList = upsertAndRecycleNotification(recycledRemoteList, item, { markUnreadOnUpdate: false });
          }

          setNotifications((prev) => {
            const currentIds = new Set(prev.map((n) => n.id));
            const newNotifs = recycledRemoteList.filter(
              (n) => !currentIds.has(n.id) && !prev.some((p) => isSameOrderEvent(p, n))
            );

            if (newNotifs.length === 0) {
              return recycledRemoteList;
            }

            // Comprobar si alguna de las notificaciones nuevas es visible para este usuario en esta pestaña
            for (const n of newNotifs) {
              if (isNotificationVisibleForUser(n, userRef.current, currentBranchRef.current)) {
                playChime();
                setActiveToast(n);
                triggerNativeNotification(n);
                break;
              }
            }

            return recycledRemoteList;
          });
        } catch (err) {
          console.warn("[NotificationContext] Error parsing storage notifs:", err);
        }
      }
    };

    const handleClearEvent = () => {
      setNotifications([]);
    };
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("brito_notifications_cleared", handleClearEvent);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("brito_notifications_cleared", handleClearEvent);
    };
  }, []);

  const addNotification = (notif: Omit<FBNotification, "id" | "read" | "timeAgo" | "group"> & Partial<FBNotification>) => {
    // Filtrar estrictamente: excluir almacén/inventario y permitir solo Cierres de Turno y Pedidos
    if (!isAllowedNotification(notif)) {
      return;
    }

    const newId = notif.id || `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const timestamp = notif.timestamp || Date.now();
    const fullNotif: FBNotification = {
      id: newId,
      timeAgo: notif.timeAgo && notif.timeAgo !== "Hace un momento" ? notif.timeAgo : formatNotificationHour(timestamp),
      group: "recientes",
      read: false,
      ...notif,
      timestamp,
    };

    // Vincular 100% de inmediato con el almacenamiento de pedidos
    if (fullNotif.orderData) {
      const stored = getStoredOrders();
      const existingIdx = stored.findIndex((o) => o.id === fullNotif.orderData!.id || o.orderNumber === fullNotif.orderData!.orderNumber);
      if (existingIdx === -1) {
        saveStoredOrders([fullNotif.orderData, ...stored]);
      } else {
        const updated = [...stored];
        updated[existingIdx] = { ...updated[existingIdx], ...fullNotif.orderData };
        saveStoredOrders(updated);
      }
    } else if (fullNotif.category === "pedidos" || fullNotif.orderId || (fullNotif.title && fullNotif.title.toLowerCase().includes("ped-"))) {
      const stored = getStoredOrders();
      const exists = stored.some(
        (o) =>
          (fullNotif.orderId && (o.id === fullNotif.orderId || o.orderNumber === fullNotif.orderId)) ||
          (fullNotif.title && o.orderNumber && fullNotif.title.includes(o.orderNumber))
      );
      if (!exists) {
        const recovered = extractOrderFromNotification(fullNotif);
        if (recovered) {
          saveStoredOrders([recovered, ...stored]);
        }
      }
    }

    const existingMatch = notificationsRef.current.find((n) => isSameOrderEvent(n, fullNotif));
    const prevIntrinsicStage = existingMatch ? getNotificationIntrinsicStage(existingMatch) : null;
    const incomingStage = getOrderNotificationStage(fullNotif);
    const isSameStageEcho = Boolean(
      existingMatch &&
      prevIntrinsicStage === incomingStage &&
      Math.abs(timestamp - (existingMatch.timestamp || 0)) < 8000
    );

    // Siempre des-ocultar y marcar como NO leída la nueva etapa del pedido (para que quien le dio salida también la vea en azul hasta que la abra)
    undismissOrderForProfile(fullNotif);
    markNotificationUnreadForProfile(fullNotif);

    // Reciclar notificación del mismo pedido y subirla hasta arriba (posición 0) como notificación principal
    setNotifications((prev) => {
      const updated = upsertAndRecycleNotification(prev, fullNotif, { markUnreadOnUpdate: true });
      persistNotifs(updated);
      return updated;
    });

    // Transmitir en vivo por WebSocket a los demás celulares/computadoras del negocio
    if (realtimeHub.broadcastNotification) {
      realtimeHub.broadcastNotification(fullNotif);
    }

    if (isSameStageEcho) {
      return;
    }

    // Reproducir sonido y mostrar banner flotante visible SOLO si es visible para este usuario
    const isVisible = isNotificationVisibleForUser(fullNotif, user, currentBranch);
    if (isVisible) {
      playChime();
      setActiveToast(fullNotif);
      triggerNativeNotification(fullNotif);
    }
  };

  // Auto-desvanecer toast a los 5.5 segundos
  useEffect(() => {
    if (!activeToast) return;
    const timer = setTimeout(() => {
      setActiveToast(null);
    }, 5500);
    return () => clearTimeout(timer);
  }, [activeToast]);

  const markAsRead = (id: string) => {
    const target = visibleNotifications.find((n) => n.id === id) || notificationsRef.current.find((n) => n.id === id);
    if (!target) return;
    markNotificationReadForProfile(target);
    // Si el pedido ya fue entregado o cancelado y este perfil ya vio la notificación, desaparece ÚNICAMENTE de este perfil
    if (isTerminalOrderNotification(target)) {
      dismissTerminalOrderForProfile(target);
    }
  };

  const markAsUnread = (id: string) => {
    const target = visibleNotifications.find((n) => n.id === id) || notificationsRef.current.find((n) => n.id === id);
    if (!target) return;
    markNotificationUnreadForProfile(target);
  };

  const markAllAsRead = () => {
    playChime();
    visibleNotifications.forEach((n) => {
      markNotificationReadForProfile(n);
      if (isTerminalOrderNotification(n)) {
        dismissTerminalOrderForProfile(n);
      }
    });
  };

  const deleteNotification = (id: string) => {
    const target = visibleNotifications.find((n) => n.id === id) || notificationsRef.current.find((n) => n.id === id);
    // Las notificaciones NO pueden ocultarse ni eliminarse mientras el pedido esté activo;
    // cuando el pedido está entregado o cancelado, se oculta de forma independiente para el perfil actual
    if (!target || !isTerminalOrderNotification(target)) {
      return;
    }
    markNotificationReadForProfile(target);
    dismissTerminalOrderForProfile(target);
  };

  const clearAll = () => {
    visibleNotifications.forEach((n) => {
      if (isTerminalOrderNotification(n)) {
        markNotificationReadForProfile(n);
        dismissTerminalOrderForProfile(n);
      }
    });
  };

  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<CustomOrder | null>(null);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<CustomOrder | null>(null);
  const [selectedOrderForReceipt, setSelectedOrderForReceipt] = useState<CustomOrder | null>(null);
  const [selectedCutForDetail, setSelectedCutForDetail] = useState<ShiftCutRecord | null>(null);

  const openOrderDetail = (orderOrNotif: CustomOrder | FBNotification) => {
    if (!orderOrNotif) return;
    if ("items" in orderOrNotif || "orderNumber" in orderOrNotif) {
      const ord = orderOrNotif as CustomOrder;
      if (ord.status === "entregado" || ord.status === "cancelado") {
        const syntheticNotif: Partial<FBNotification> = {
          category: "pedidos",
          orderId: ord.id,
          orderData: ord,
          title: ord.orderNumber,
          highlightText: ord.status,
        };
        markNotificationReadForProfile(syntheticNotif);
        dismissTerminalOrderForProfile(syntheticNotif);
      }
      setSelectedOrderForDetail(ord);
    } else {
      const notif = orderOrNotif as FBNotification;
      const order = findOrderForNotification(notif);
      const isTerminal =
        isTerminalOrderNotification(notif) ||
        order?.status === "entregado" ||
        order?.status === "cancelado";

      markNotificationReadForProfile(notif);
      if (isTerminal) {
        dismissTerminalOrderForProfile(notif);
      }
      if (order) {
        setSelectedOrderForDetail(order);
      }
    }
  };

  const openOrderPayment = (orderOrNotif: CustomOrder | FBNotification) => {
    if (!orderOrNotif) return;
    if ("items" in orderOrNotif || "orderNumber" in orderOrNotif) {
      setSelectedOrderForPayment(orderOrNotif as CustomOrder);
    } else {
      const order = findOrderForNotification(orderOrNotif as FBNotification);
      if (order) {
        setSelectedOrderForPayment(order);
      }
    }
  };

  const closeOrderDetail = () => {
    setSelectedOrderForDetail(null);
  };

  const openShiftCutDetail = (cutOrNotif: ShiftCutRecord | FBNotification) => {
    if (!cutOrNotif) return;
    if ("countedCash" in cutOrNotif && "expectedCash" in cutOrNotif) {
      setSelectedCutForDetail(cutOrNotif as ShiftCutRecord);
    } else {
      const cut = findShiftCutForNotification(cutOrNotif as FBNotification);
      if (cut) {
        setSelectedCutForDetail(cut);
      }
    }
  };

  const closeShiftCutDetail = () => {
    setSelectedCutForDetail(null);
  };

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications: visibleNotifications,
        allNotifications: notifications,
        unreadCount,
        soundEnabled,
        nativePermission,
        realtimeStatus,
        requestNativePermission,
        toggleSound,
        markAsRead,
        markAsUnread,
        markAllAsRead,
        deleteNotification,
        clearAll,
        addNotification,
        openOrderDetail,
        openOrderPayment,
        closeOrderDetail,
        openShiftCutDetail,
        closeShiftCutDetail,
      }}
    >
      {children}

      {/* MODAL GLOBAL DE COMPROBANTE DE CORTE DE CAJA */}
      <ShiftCutDetailModal
        isOpen={!!selectedCutForDetail}
        onClose={() => setSelectedCutForDetail(null)}
        cut={selectedCutForDetail}
      />

      {/* MODAL GLOBAL DE DETALLES COMPLETOS DEL PEDIDO */}
      <OrderDetailModal
        isOpen={!!selectedOrderForDetail && !selectedOrderForPayment && !selectedOrderForReceipt}
        onClose={() => setSelectedOrderForDetail(null)}
        order={selectedOrderForDetail}
        isHistoryMode={selectedOrderForDetail?.status === "entregado" || selectedOrderForDetail?.status === "cancelado"}
        onPrintReceipt={(o) => {
          setSelectedOrderForReceipt(o);
        }}
        onOpenPayment={(o) => {
          setSelectedOrderForDetail(o);
          setSelectedOrderForPayment(o);
        }}
        onAdvanceStatus={(o) => {
          if (o.status === "entregado" || o.status === "cancelado") {
            alert("Este pedido pertenece al historial y no puede ser modificado.");
            return;
          }
          if (o.status === "listo") {
            return;
          }
          const updated = updateOrderStatus(o.id, "listo") || getStoredOrders().find((item) => item.id === o.id);
          if (updated) {
            setSelectedOrderForDetail(updated);
            const totalNum = Number(updated.total) || 0;
            addNotification({
              id: `notif-order-${updated.id}`,
              senderName: `🏪 ¡Ya en Sucursal! (${updated.branchName || "Sucursal"})`,
              senderAvatar: "🎂",
              badgeIcon: "pastel",
              title: `¡Ya en Sucursal!: ${updated.orderNumber}${totalNum ? ` • Total $${totalNum.toFixed(2)}` : ""}`,
              highlightText: `${updated.customerName} • ¡Ya en Sucursal!`,
              description: `${updated.description ? `${updated.description}. ` : ""}El pedido ${updated.orderNumber} de "${updated.customerName}" ya está en ${updated.branchName || "sucursal"} listo para entrega.`,
              category: "pedidos",
              orderId: updated.id,
              orderData: updated,
              branchId: updated.branchId,
              branchName: updated.branchName,
              operatingBranchId: updated.operatingBranchId,
              operatingBranchName: updated.operatingBranchName,
              actionLabel: (updated.remainingBalance || 0) > 0 ? `Cobrar $${Number(updated.remainingBalance).toFixed(2)}` : "Ver Detalle",
              actionLink: "/pedidos",
            });
          }
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("brito_orders_updated"));
          }
        }}
        onDeliverOrder={(o) => {
          if (o.status === "entregado" || o.status === "cancelado") {
            alert("Este pedido pertenece al historial.");
            return;
          }
          const updated = updateOrderStatus(o.id, "entregado") || getStoredOrders().find((item) => item.id === o.id);
          if (updated) {
            setSelectedOrderForDetail(null);
            if (updated.status === "entregado") {
              const totalNum = Number(updated.total) || 0;
              const isCross = updated.operatingBranchName && updated.branchName && updated.operatingBranchName !== updated.branchName;
              addNotification({
                id: `notif-order-${updated.id}`,
                senderName: `📦 Pedido Entregado (${updated.branchName || "Sucursal"})`,
                senderAvatar: "📦",
                badgeIcon: "pastel",
                title: `Pedido Entregado con Éxito: ${updated.orderNumber}${totalNum ? ` • Total $${totalNum.toFixed(2)}` : ""}`,
                highlightText: `${updated.customerName} • Entregado al Cliente`,
                description: `${updated.description ? `${updated.description}. ` : ""}El pedido ${updated.orderNumber} de "${updated.customerName}" fue entregado satisfactoriamente en ${updated.branchName || "sucursal"}.${isCross ? ` (Originado en: ${updated.operatingBranchName}).` : ""}`,
                category: "pedidos",
                orderId: updated.id,
                orderData: updated,
                branchId: updated.branchId,
                branchName: updated.branchName,
                operatingBranchId: updated.operatingBranchId,
                operatingBranchName: updated.operatingBranchName,
                actionLabel: "Ver Pedido Entregado",
                actionLink: "/pedidos",
              });
            }
          }
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("brito_orders_updated"));
          }
        }}
        onSendWhatsApp={(o) => {
          const phone = (o.phone || "").replace(/\D/g, "");
          if (!phone) {
            alert("Este pedido no tiene número de teléfono registrado.");
          } else {
            const message = encodeURIComponent(
              `Hola ${o.customerName}, le saludamos de Panadería Brito con respecto a su pedido ${o.orderNumber}.`
            );
            window.open(`https://wa.me/52${phone}?text=${message}`, "_blank");
          }
        }}
        onDarDeBaja={selectedOrderForDetail?.status !== "entregado" ? (o) => {
          if (o.status === "entregado") return;
          const isCancelled = o.status === "cancelado";
          const confirmMsg = isCancelled
            ? `¿Estás seguro de ELIMINAR PERMANENTEMENTE el pedido ${o.orderNumber} de "${o.customerName}"?\n\nEsta acción borrará el pedido por completo del registro histórico y no se podrá recuperar.`
            : `¿Estás seguro de DAR DE BAJA el pedido ${o.orderNumber} de "${o.customerName}"?\n\nEl pedido se marcará como dado de baja y te mandaremos directo al historial de "Productos que se dieron de baja".`;
          if (confirm(confirmMsg)) {
            if (isCancelled) {
              deleteCustomOrder(o.id);
              setNotifications((prev) => {
                const updatedNotifs = prev.filter((n) => !isSameOrderEvent(n, { orderId: o.id, title: o.orderNumber }));
                persistNotifs(updatedNotifs);
                return updatedNotifs;
              });
            } else {
              const updated = updateOrderStatus(o.id, "cancelado") || { ...o, status: "cancelado" as const };
              const totalNum = Number(updated.total) || 0;
              addNotification({
                id: `notif-order-${updated.id}`,
                senderName: `🗑️ Pedido Cancelado (${updated.branchName || "Sucursal"})`,
                senderAvatar: "🗑️",
                badgeIcon: "pastel",
                title: `Pedido Cancelado / Dado de Baja: ${updated.orderNumber}${totalNum ? ` • Total $${totalNum.toFixed(2)}` : ""}`,
                highlightText: `${updated.customerName} • Dado de Baja`,
                description: `${updated.description ? `${updated.description}. ` : ""}El pedido ${updated.orderNumber} de "${updated.customerName}" fue dado de baja.`,
                category: "pedidos",
                orderId: updated.id,
                orderData: updated,
                branchId: updated.branchId,
                branchName: updated.branchName,
                operatingBranchId: updated.operatingBranchId,
                operatingBranchName: updated.operatingBranchName,
                actionLabel: "Ver Pedido Cancelado",
                actionLink: "/pedidos",
              });
            }
            setSelectedOrderForDetail(null);
            if (typeof window !== "undefined") {
              window.dispatchEvent(new Event("brito_orders_updated"));
              if (!isCancelled) {
                window.location.href = "/pedidos?filter=cancelados";
              }
            }
          }
        } : undefined}
      />

      {/* MODAL GLOBAL DE COBRO / LIQUIDACIÓN DE PEDIDO */}
      <OrderPaymentModal
        isOpen={!!selectedOrderForPayment}
        onClose={() => {
          const currentOrd = selectedOrderForPayment
            ? getStoredOrders().find((o) => o.id === selectedOrderForPayment.id) || selectedOrderForPayment
            : null;
          setSelectedOrderForPayment(null);
          if (currentOrd && currentOrd.status !== "entregado" && currentOrd.status !== "cancelado") {
            setSelectedOrderForDetail(currentOrd);
          } else {
            setSelectedOrderForDetail(null);
          }
        }}
        order={selectedOrderForPayment}
        onPaymentSuccess={() => {
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("brito_orders_updated"));
          }
          const targetId = selectedOrderForPayment?.id || selectedOrderForDetail?.id;
          if (targetId) {
            const updated = getStoredOrders().find((o) => o.id === targetId);
            if (updated) {
              if (updated.status === "entregado" || updated.status === "cancelado") {
                setSelectedOrderForDetail(null);
              } else {
                setSelectedOrderForDetail(updated);
              }
            }
          }
        }}
      />

      {/* MODAL GLOBAL DE TICKET / COMPROBANTE DE PEDIDO */}
      <OrderReceiptModal
        isOpen={!!selectedOrderForReceipt}
        onClose={() => {
          const currentOrd = selectedOrderForReceipt
            ? getStoredOrders().find((o) => o.id === selectedOrderForReceipt.id) || selectedOrderForReceipt
            : null;
          setSelectedOrderForReceipt(null);
          if (currentOrd && !selectedOrderForDetail) {
            setSelectedOrderForDetail(currentOrd);
          }
        }}
        order={selectedOrderForReceipt}
      />

      {/* BANNER FLOTANTE DE NOTIFICACIÓN INMEDIATA (TOAST) */}
      {activeToast && (
        <div
          onClick={() => {
            if (activeToast.category === "pedidos" || activeToast.title.toLowerCase().includes("pedido")) {
              openOrderDetail(activeToast);
              setActiveToast(null);
            } else if (
              activeToast.category === "caja" ||
              activeToast.title.toLowerCase().includes("corte") ||
              activeToast.title.toLowerCase().includes("cierre")
            ) {
              openShiftCutDetail(activeToast);
              setActiveToast(null);
            }
          }}
          className={`fixed top-4 right-4 z-[9999] max-w-sm w-full bg-stone-900/95 text-white p-3.5 sm:p-4 rounded-2xl shadow-2xl border-2 border-amber-500/90 backdrop-blur-md flex items-start gap-3 animate-in slide-in-from-top-4 duration-300 ${
            activeToast.category === "pedidos" ||
            activeToast.title.toLowerCase().includes("pedido") ||
            activeToast.category === "caja" ||
            activeToast.title.toLowerCase().includes("corte") ||
            activeToast.title.toLowerCase().includes("cierre")
              ? "cursor-pointer hover:border-amber-400"
              : ""
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center text-xl font-black shrink-0 shadow-md">
            {activeToast.senderAvatar || "💰"}
          </div>
          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-md">
                {activeToast.title}
              </span>
              <div className="flex items-center gap-1.5 ml-auto pr-1">
                <span className="text-[10px] font-mono text-amber-300 font-bold bg-stone-800/90 px-1.5 py-0.5 rounded border border-amber-500/30">
                  🕒 {formatLiveNotificationTime(resolveNotificationTimestamp(activeToast)).exactTime}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveToast(null);
                  }}
                  className="text-stone-400 hover:text-white text-xs p-1 cursor-pointer"
                  title="Cerrar notificación"
                >
                  ✕
                </button>
              </div>
            </div>
            <p className="text-xs font-black text-white mt-1 leading-snug">
              {activeToast.highlightText}
            </p>
            <p className="text-[11px] text-stone-300 mt-0.5 line-clamp-2 leading-relaxed">
              {activeToast.description}
            </p>
            {activeToast.category === "pedidos" || activeToast.title.toLowerCase().includes("pedido") ? (
              <span className="inline-block mt-1 text-[10px] text-amber-400 font-bold underline">
                Toca para ver detalle completo →
              </span>
            ) : activeToast.category === "caja" ||
              activeToast.title.toLowerCase().includes("corte") ||
              activeToast.title.toLowerCase().includes("cierre") ? (
              <span className="inline-block mt-1 text-[10px] text-amber-400 font-bold underline">
                Toca para ver comprobante de corte →
              </span>
            ) : null}
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
