"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from "react";
import { realtimeHub, RealtimeStatus } from "@/lib/realtime/realtimeHub";
import { CustomOrder, ShiftCutRecord, AppUser } from "@/types";
import { getStoredOrders, updateOrderStatus, deleteCustomOrder } from "@/lib/orders";
import { useAuth } from "@/context/AuthContext";
import { useBranch } from "@/context/BranchContext";
import OrderDetailModal from "@/components/pedidos/OrderDetailModal";
import OrderPaymentModal from "@/components/pedidos/OrderPaymentModal";
import OrderReceiptModal from "@/components/pedidos/OrderReceiptModal";
import ShiftCutDetailModal from "@/components/caja/ShiftCutDetailModal";

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
  shiftCutData?: ShiftCutRecord;
  cutId?: string;
  branchId?: string;
  branchName?: string;
  operatingBranchId?: string;
  operatingBranchName?: string;
  timestamp?: number;
}

export function isAllowedNotification(notif: Partial<FBNotification>): boolean {
  if (!notif) return false;

  const text = `${notif.title || ""} ${notif.highlightText || ""} ${notif.description || ""} ${notif.senderName || ""}`.toLowerCase();

  // Si es un pedido de pan/pastelería explícito, siempre se evalúa como pedido
  const isPedido =
    notif.category === "pedidos" ||
    Boolean(notif.orderId) ||
    text.includes("pedido") ||
    text.includes("encargo") ||
    text.includes("apartado") ||
    text.includes("anticipo") ||
    text.includes("liquidado") ||
    text.includes("abono") ||
    text.includes("entregad") ||
    text.includes("ped-");

  // 1. Bloqueo estricto: Cero notificaciones de almacén, inventario, producción de hornos, insumos o escaneos
  // (EXCEPTO si es un evento de pedido legítimo)
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

  // 2. Permitir exclusivamente Cierres de Turno / Cortes de Caja
  const isCierreTurno =
    (notif.category === "caja" &&
      (text.includes("corte") ||
       text.includes("turno") ||
       text.includes("cierre") ||
       text.includes("cuadró") ||
       text.includes("cuadro") ||
       text.includes("entrega") ||
       text.includes("diferencia"))) ||
    text.includes("cierre de turno") ||
    text.includes("corte de turno");

  return Boolean(isCierreTurno || isPedido);
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
  const stripAccents = (str?: string): string => {
    return (str || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  };

  const uId = stripAccents(userBranchId);
  const uName = stripAccents(userBranchName);

  // Helper para identificar palabras clave de sucursal
  const getBranchKeywords = (str: string): string[] => {
    const s = stripAccents(str);
    const keywords: string[] = [];
    if (s.includes("benito") || s.includes("ben-02")) keywords.push("benito");
    if (s.includes("flores") || s.includes("flo-03")) keywords.push("flores");
    if (s.includes("matriz") || s.includes("centro") || s.includes("mat-01")) keywords.push("matriz");
    if (s.includes("ildefonso") || s.includes("1790889237862") || s.includes("ilf-04")) keywords.push("ildefonso");
    if (s.includes("angeles") || s.includes("suc-les")) keywords.push("angeles");
    if (s.includes("sanjuan") || s.includes("san juan") || s.includes("sju-02")) keywords.push("sanjuan");
    return keywords;
  };

  const userKeywords = [...getBranchKeywords(uId), ...getBranchKeywords(uName)];

  const checkMatch = (targetId?: string, targetName?: string): boolean => {
    const tId = stripAccents(targetId);
    const tName = stripAccents(targetName);

    if (uId && tId && (uId === tId || uId.includes(tId) || tId.includes(uId))) {
      return true;
    }
    if (uName && tName && (uName === tName || uName.includes(tName) || tName.includes(uName))) {
      return true;
    }
    const targetKeywords = [...getBranchKeywords(tId), ...getBranchKeywords(tName)];
    if (userKeywords.some((k) => targetKeywords.includes(k))) {
      return true;
    }
    return false;
  };

  // 1. Coincidencia con sucursal de entrega / recogida
  if (checkMatch(info.pickupBranchId, info.pickupBranchName)) {
    return true;
  }

  // 2. Coincidencia con sucursal de origen / realización del pedido
  if (checkMatch(info.operatingBranchId, info.operatingBranchName)) {
    return true;
  }

  // 3. Coincidencia por texto libre si hay palabras clave reconocibles
  if (info.fullText && userKeywords.length > 0) {
    const textNorm = stripAccents(info.fullText);
    if (userKeywords.some((k) => textNorm.includes(k))) {
      return true;
    }
  }

  return false;
}

export function isSameOrderEvent(a: Partial<FBNotification>, b: Partial<FBNotification>): boolean {
  if (a.id && b.id && a.id === b.id) return true;

  // 1. Extraer folio único PED-XXX (prioridad absoluta porque es el folio único de negocio)
  const getOrderFolio = (n: Partial<FBNotification>): string | null => {
    const text = `${n.title || ""} ${n.highlightText || ""} ${n.description || ""} ${n.id || ""} ${n.orderId || ""}`;
    const m = text.match(/PED-(\d+)/i);
    return m ? `ped-${m[1]}` : null;
  };

  const folioA = getOrderFolio(a);
  const folioB = getOrderFolio(b);

  const getOrderId = (n: Partial<FBNotification>): string | null => {
    return n.orderId ? n.orderId.toLowerCase().trim() : null;
  };

  const idA = getOrderId(a);
  const idB = getOrderId(b);

  const sameOrder = Boolean((folioA && folioB && folioA === folioB) || (idA && idB && idA === idB));
  if (!sameOrder) return false;

  const isPayment = (n: Partial<FBNotification>) => {
    const t = `${n.id || ""} ${n.title || ""} ${n.highlightText || ""}`.toLowerCase();
    return t.includes("abono") || t.includes("liquidado") || t.includes("pagado") || (n.id || "").includes("order-pay");
  };

  const isDelivery = (n: Partial<FBNotification>) => {
    const t = `${n.id || ""} ${n.title || ""} ${n.highlightText || ""}`.toLowerCase();
    return t.includes("entregad") || (n.id || "").includes("order-delivered") || ((n.id || "").includes("order-status") && (n.id || "").includes("entregado"));
  };

  const isStatus = (n: Partial<FBNotification>) => {
    const t = `${n.id || ""} ${n.title || ""}`.toLowerCase();
    return t.includes("estado de pedido") || (n.id || "").includes("order-status");
  };

  const isPayA = isPayment(a);
  const isPayB = isPayment(b);
  const isDelivA = isDelivery(a);
  const isDelivB = isDelivery(b);
  const isStatA = isStatus(a);
  const isStatB = isStatus(b);

  // Un pago y una entrega son eventos DISTINTOS del mismo pedido y no se colapsan entre sí
  if ((isPayA && isDelivB) || (isDelivA && isPayB)) {
    return false;
  }

  // Una creación y un pago son eventos DISTINTOS del mismo pedido
  if ((!isPayA && isPayB) || (isPayA && !isPayB)) {
    return false;
  }

  // Una creación y una entrega son eventos DISTINTOS del mismo pedido
  if ((!isDelivA && isDelivB) || (isDelivA && !isDelivB)) {
    return false;
  }

  // Si ambos son pagos del mismo pedido
  if (isPayA && isPayB) {
    const extractAmount = (n: Partial<FBNotification>): string | null => {
      const m = `${n.title || ""} ${n.highlightText || ""} ${n.id || ""}`.match(/\$?([\d,]+(\.\d{2})?)/);
      return m ? m[1].replace(/,/g, "") : null;
    };
    const amtA = extractAmount(a);
    const amtB = extractAmount(b);
    return !amtA || !amtB || amtA === amtB;
  }

  // Si ambos son entregas del mismo pedido
  if (isDelivA && isDelivB) {
    return true;
  }

  // Si ambos son cambios de estado del mismo pedido
  if (isStatA && isStatB) {
    const getStatusType = (n: Partial<FBNotification>): string => {
      const s = `${n.id || ""} ${n.title || ""} ${n.highlightText || ""}`.toLowerCase();
      if (s.includes("entregad")) return "entregado";
      if (s.includes("listo")) return "listo";
      if (s.includes("cancelad") || s.includes("baja")) return "cancelado";
      if (s.includes("pendiente") || s.includes("preparaci")) return "pendiente";
      return "status";
    };
    return getStatusType(a) === getStatusType(b);
  }

  // Si ninguno es abono, ni entrega, ni cambio de estado: ambos son eventos de alta/creación del mismo pedido
  if (!isPayA && !isPayB && !isDelivA && !isDelivB && !isStatA && !isStatB) {
    return true;
  }

  return false;
}

export function mergeNotifications(existing: FBNotification, incoming: FBNotification): FBNotification {
  const isPayment = (n: Partial<FBNotification>) => {
    const t = `${n.id || ""} ${n.title || ""} ${n.highlightText || ""}`.toLowerCase();
    return t.includes("abono") || t.includes("liquidado") || t.includes("pagado") || (n.id || "").includes("order-pay");
  };

  const isDelivery = (n: Partial<FBNotification>) => {
    const t = `${n.id || ""} ${n.title || ""} ${n.highlightText || ""}`.toLowerCase();
    return t.includes("entregad") || (n.id || "").includes("order-delivered");
  };

  const incomingIsPay = isPayment(incoming);
  const existingIsPay = isPayment(existing);
  const incomingIsDeliv = isDelivery(incoming);
  const existingIsDeliv = isDelivery(existing);

  const bestBranchName = incoming.branchName || existing.branchName || "";
  const bestOperatingBranchName = incoming.operatingBranchName || existing.operatingBranchName || "";

  let bestTitle = incoming.title || existing.title;
  let bestHighlight = incoming.highlightText || existing.highlightText;
  let bestSenderName = incoming.senderName || existing.senderName;

  // Solo reconstruir título como "Nuevo Pedido" si es un evento de creación inicial
  if (!incomingIsPay && !existingIsPay && !incomingIsDeliv && !existingIsDeliv) {
    const combined = `${existing.title} ${existing.highlightText} ${existing.description} ${incoming.title} ${incoming.highlightText} ${incoming.description}`;
    const folioMatch = combined.match(/PED-\d+/i);
    const totalMatch = combined.match(/Total:?\s*\$?([0-9,.]+)/i);

    if (folioMatch && totalMatch) {
      bestTitle = `Nuevo Pedido ${folioMatch[0]}: Total $${totalMatch[1].replace(/^\$/, "")}`;
    } else if (incoming.title.toLowerCase().includes("total") && incoming.title.includes("PED-")) {
      bestTitle = incoming.title;
    }

    const customerMatch = combined.match(/(?:marcos sanchez|silvia puga|[A-Z][a-z]+\s+[A-Z][a-z]+)/i);
    const depositMatch = combined.match(/Anticipo:?\s*\$?([0-9,.]+)/i);
    const remainingMatch = combined.match(/(?:Saldo restante|Cobrar):?\s*\$?([0-9,.]+)/i);

    if (customerMatch && depositMatch) {
      const cust = customerMatch[0].trim();
      const dep = `$${depositMatch[1].replace(/^\$/, "")}`;
      const rem = remainingMatch ? `$${remainingMatch[1].replace(/^\$/, "")}` : null;
      bestHighlight = `${cust} • Anticipo: ${dep}${rem ? ` (Resta: ${rem})` : ""}`;
    }

    const isCross = Boolean(
      (bestOperatingBranchName && bestBranchName && bestOperatingBranchName !== bestBranchName) ||
      (incoming.senderName && incoming.senderName.includes("➔")) ||
      (existing.senderName && existing.senderName.includes("➔"))
    );
    if (isCross && bestOperatingBranchName && bestBranchName && bestOperatingBranchName !== bestBranchName) {
      bestSenderName = `🎂 ${bestOperatingBranchName} ➔ ${bestBranchName}`;
    }
  }

  // Priorizar la descripción más rica y detallada
  let bestDescription = existing.description;
  if (incoming.description && incoming.description.length > (existing.description || "").length) {
    bestDescription = incoming.description;
  }

  return {
    ...existing,
    ...incoming,
    id: existing.id.startsWith("notif-order-") ? existing.id : (incoming.id.startsWith("notif-order-") ? incoming.id : existing.id),
    title: bestTitle,
    senderName: bestSenderName,
    highlightText: bestHighlight,
    description: bestDescription,
    branchId: incoming.branchId || existing.branchId,
    branchName: bestBranchName,
    operatingBranchId: incoming.operatingBranchId || existing.operatingBranchId,
    operatingBranchName: bestOperatingBranchName,
    orderId: incoming.orderId || existing.orderId,
    actionLabel: incoming.actionLabel || existing.actionLabel,
    actionLink: incoming.actionLink || existing.actionLink,
    secondaryActionLabel: incoming.secondaryActionLabel || existing.secondaryActionLabel,
    secondaryActionLink: incoming.secondaryActionLink || existing.secondaryActionLink,
    read: existing.read,
  };
}

export function isNotificationVisibleForUser(
  notif: Partial<FBNotification>,
  user: AppUser | null,
  activeBranch?: { id: string; name?: string; shortName?: string } | null
): boolean {
  if (!notif) return false;
  if (!isAllowedNotification(notif)) return false;

  // 1. Administrador (Dueño o Auxiliar Admin):
  // Lleva el control y visualización de TODO (cortes de todas las sucursales,
  // dinero que entra/sale, y todos los pedidos de todas las sucursales)
  const isAdmin = !user || user.role === "admin" || user.role === "auxiliar_admin";
  if (isAdmin) {
    return true;
  }

  // 2. Roles Operativos (Cajeros, Panaderos, etc.):
  const text = `${notif.title || ""} ${notif.highlightText || ""} ${notif.description || ""} ${notif.senderName || ""}`.toLowerCase();

  const isPedido =
    notif.category === "pedidos" ||
    Boolean(notif.orderId) ||
    text.includes("ped-") ||
    text.includes("pedido") ||
    text.includes("liquidado") ||
    text.includes("abono") ||
    text.includes("pastel");

  const isCajaCategory =
    notif.category === "caja" ||
    notif.badgeIcon === "dinero" ||
    text.includes("corte") ||
    text.includes("cierre") ||
    text.includes("turno") ||
    text.includes("cuadró") ||
    text.includes("cuadro") ||
    text.includes("diferencia") ||
    text.includes("ingreso registrado") ||
    text.includes("entrada de caja") ||
    text.includes("gasto") ||
    text.includes("retiro") ||
    text.includes("fondo dejado") ||
    text.includes("ticket cancelado");

  if (isCajaCategory && !isPedido) {
    return false;
  }

  // REGLA 2: Notificaciones de PEDIDOS:
  // Llegan al cajero si el pedido involucra su sucursal:
  // - Sucursal donde se hizo/alzó el pedido (origen)
  // - Sucursal donde se entregará/recogerá (destino)
  // - Sucursal donde se cobró/liquidó el pedido
  // - O si coincide con el cajero que lo levantó
  const candidateBranches: Array<{ id: string; name: string }> = [];
  if (user?.assignedBranchId || user?.assignedBranchName) {
    candidateBranches.push({
      id: (user.assignedBranchId || "").trim(),
      name: (user.assignedBranchName || "").trim(),
    });
  }
  if (activeBranch?.id || activeBranch?.name || activeBranch?.shortName) {
    candidateBranches.push({
      id: (activeBranch.id || "").trim(),
      name: (activeBranch.name || activeBranch.shortName || "").trim(),
    });
  }

  // Si por alguna razón el usuario no tiene ninguna sucursal asignada ni activa
  if (candidateBranches.length === 0) {
    return true;
  }

  // Resolver sucursales directas de la notificación
  const pickupId = notif.branchId;
  const pickupName = notif.branchName;
  const operatingId = notif.operatingBranchId;
  const operatingName = notif.operatingBranchName;

  // 1. Revisar coincidencia directa con los datos de la notificación
  for (const cand of candidateBranches) {
    const matchesNotification = checkBranchMatch(
      {
        pickupBranchId: pickupId,
        pickupBranchName: pickupName,
        operatingBranchId: operatingId,
        operatingBranchName: operatingName,
        fullText: text,
      },
      cand.id,
      cand.name
    );
    if (matchesNotification) return true;
  }

  // 2. Buscar datos reales del pedido almacenado para contrastar origen y destino
  const order = findOrderForNotification(notif as FBNotification);
  if (order) {
    for (const cand of candidateBranches) {
      const matchesOrder = checkBranchMatch(
        {
          pickupBranchId: order.branchId,
          pickupBranchName: order.branchName,
          operatingBranchId: order.operatingBranchId,
          operatingBranchName: order.operatingBranchName,
          fullText: `${order.orderNumber} ${order.customerName} ${order.cashier || ""} ${order.description || ""}`,
        },
        cand.id,
        cand.name
      );
      if (matchesOrder) return true;
    }

    // 3. Revisar si el cajero del pedido es este usuario (ej. Silvia Puga, Andrés Sánchez)
    if (order.cashier && user?.name && order.cashier.toLowerCase().includes(user.name.toLowerCase().trim())) {
      return true;
    }
  }

  // 4. Si el nombre del usuario aparece directamente en el texto de la notificación
  if (user?.name && user.name.length >= 3 && text.includes(user.name.toLowerCase().trim())) {
    return true;
  }

  return false;
}

const INITIAL_FB_NOTIFICATIONS: FBNotification[] = [
  {
    id: "corte-turno-matutino-cuadro",
    senderName: "🏁 Cierre de Turno (silvia puga)",
    senderAvatar: "💰",
    badgeIcon: "dinero",
    title: "Cierre a las 14:00 hrs: ✓ CAJA CUADRADA EXACTA ($0.00)",
    highlightText: "silvia puga entregó turno a Don Toño Brito",
    description: "Horario de turno: 06:00 a 14:00 hrs. Efectivo en caja: $47,569.00. Cuadró exacto sin faltante ($0.00 de diferencia). Fondo dejado para nuevo turno: $1,000.00. Efectivo retirado: $46,569.00.",
    timeAgo: "Hace 15 min",
    timestamp: Date.now() - 15 * 60 * 1000,
    group: "recientes",
    read: false,
    actionLabel: "Ver Corte de Caja",
    actionLink: "/caja?tab=historial",
    category: "caja",
    cutId: "CORTE-MAT-001",
    shiftCutData: {
      id: "CORTE-MAT-001",
      date: new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
      timestamp: Date.now() - 15 * 60 * 1000,
      shiftRange: "06:00 a 14:00 hrs",
      outgoingCashier: "silvia puga",
      incomingCashier: "Don Toño Brito",
      responsible: "silvia puga",
      branchName: "Sucursal Matriz (Centro)",
      branchId: "branch-matriz",
      previousShift: "Matutino",
      nextShift: "Vespertino",
      initialFund: 1000,
      cashSales: 18979,
      cardSales: 0,
      transferSales: 0,
      totalSales: 18979,
      totalSalesAll: 18979,
      totalExpenses: 6000,
      totalIncomes: 33590,
      expectedCash: 47569,
      countedCash: 47569,
      difference: 0,
      nextFund: 1000,
      notes: "Cierre de turno matutino completado conforme y sin faltantes. Don Toño recibió el efectivo físico en mostrador.",
      expensesList: [
        {
          id: "EXP-M01",
          amount: 500,
          category: "compra_insumos",
          description: "Compra urgente de levadura fresca y mantequilla",
          cashier: "Lupita Brito",
          date: new Date().toISOString().split("T")[0],
          authorizedBy: "Don Toño Brito",
        },
      ],
      stockPieces: 320,
      stockValue: 3840,
    },
  },
  {
    id: "corte-turno-vespertino-alerta",
    senderName: "🏁 Cierre de Turno (Carlos R.)",
    senderAvatar: "⚠️",
    badgeIcon: "dinero",
    title: "Cierre a las 21:30 hrs: 🚨 NO CUADRÓ LA CAJA (Faltante -$50.00)",
    highlightText: "Carlos R. entregó turno a Don Toño Brito",
    description: "Horario de turno: 14:00 a 21:30 hrs. Efectivo esperado: $3,920.00 | Efectivo contado: $3,870.00. Faltante detectado: -$50.00 MXN en entrega de turno. Fondo dejado: $800.00.",
    timeAgo: "Hace 1 hora",
    timestamp: Date.now() - 60 * 60 * 1000,
    group: "recientes",
    read: false,
    actionLabel: "Ver Corte de Caja",
    actionLink: "/caja?tab=historial",
    category: "caja",
    cutId: "CORTE-VESP-002",
    shiftCutData: {
      id: "CORTE-VESP-002",
      date: new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
      timestamp: Date.now() - 60 * 60 * 1000,
      shiftRange: "14:00 a 21:30 hrs",
      outgoingCashier: "Carlos R.",
      incomingCashier: "Don Toño Brito",
      responsible: "Carlos R.",
      branchName: "Sucursal Matriz (Centro)",
      previousShift: "Vespertino",
      nextShift: "Nocturno / Cierre",
      initialFund: 1000,
      cashSales: 3320,
      cardSales: 850,
      transferSales: 400,
      totalSales: 4570,
      totalSalesAll: 4570,
      totalExpenses: 200,
      totalIncomes: 0,
      expectedCash: 3920,
      countedCash: 3870,
      difference: -50,
      nextFund: 1000,
      notes: "Faltante detectado de -$50.00 MXN en entrega de turno. Físico contado $3,870.00 contra $3,920.00 esperados. Reportado para aclaración.",
      expensesList: [
        {
          id: "EXP-V01",
          amount: 200,
          category: "limpieza",
          description: "Bolsas y productos de limpieza para cierre",
          cashier: "Carlos R.",
          date: new Date().toISOString().split("T")[0],
          authorizedBy: "Don Toño Brito",
        },
      ],
      stockPieces: 85,
      stockValue: 1020,
    },
  },
  {
    id: "pedido-ped-101",
    senderName: "🎂 Pedido Registrado (Matriz Centro)",
    senderAvatar: "🎂",
    badgeIcon: "pastel",
    title: "Nuevo Pedido PED-101: Total $950.00",
    highlightText: "Sra. María González - Anticipo: $500.00",
    description: "Pastel 3 Leches XV Años. Entrega: Mañana a las 16:00 hrs (Recoge en Sucursal Matriz Centro). Saldo restante: $450.00.",
    timeAgo: "Hace 28 min",
    timestamp: Date.now() - 28 * 60 * 1000,
    group: "recientes",
    read: false,
    actionLabel: "Cobrar $450",
    actionLink: "/caja",
    secondaryActionLabel: "Ver Detalle",
    secondaryActionLink: "/pedidos?order=PED-101",
    category: "pedidos",
    orderId: "PED-101",
    branchId: "branch-matriz",
    branchName: "Sucursal Matriz (Centro)",
    operatingBranchId: "branch-matriz",
    operatingBranchName: "Sucursal Matriz (Centro)",
  },
  {
    id: "pedido-ped-102",
    senderName: "🎂 Pedido Liquidado (San Juan)",
    senderAvatar: "🎂",
    badgeIcon: "pastel",
    title: "Pedido Liquidado PED-102: Total $1,200.00",
    highlightText: "Ing. Carlos Mendoza - 100% Pagado ($1,200.00)",
    description: "100 piezas de Mini Cuernitos Hojaldrados. Entrega: Hoy a las 08:30 hrs en Sucursal San Juan. Estado: Listo para entrega.",
    timeAgo: "Ayer a las 6:30 PM",
    timestamp: Date.now() - 24 * 60 * 60 * 1000,
    group: "anteriores",
    read: true,
    actionLabel: "Ver Detalle",
    actionLink: "/pedidos?order=PED-102",
    category: "pedidos",
    orderId: "PED-102",
    branchId: "branch-sanjuan",
    branchName: "Sucursal San Juan",
    operatingBranchId: "branch-sanjuan",
    operatingBranchName: "Sucursal San Juan",
  },
  {
    id: "pedido-ped-103",
    senderName: "🎂 Pedido Inter-Sucursal (Las Flores ➔ San Juan)",
    senderAvatar: "🎂",
    badgeIcon: "pastel",
    title: "Nuevo Pedido PED-103: Total $1,450.00",
    highlightText: "Lic. Andrea Romero - Anticipo: $700.00",
    description: "Pastel Gourmet Fondant y 50 Cupcakes. Creado en Sucursal Las Flores. Recoge en Sucursal San Juan a las 15:00 hrs. Saldo restante: $750.00.",
    timeAgo: "Hace 10 min",
    timestamp: Date.now() - 10 * 60 * 1000,
    group: "recientes",
    read: false,
    actionLabel: "Cobrar $750",
    actionLink: "/caja",
    secondaryActionLabel: "Ver Detalle",
    secondaryActionLink: "/pedidos?order=PED-103",
    category: "pedidos",
    orderId: "PED-103",
    branchId: "branch-sanjuan",
    branchName: "Sucursal San Juan",
    operatingBranchId: "branch-flores",
    operatingBranchName: "Sucursal Las Flores (Plaza)",
  },
  {
    id: "pedido-ped-189-liquidado",
    senderName: "📦✅ Pedido Liquidado y Entregado (Sucursal Los Ángeles)",
    senderAvatar: "📦",
    badgeIcon: "pastel",
    title: "Pedido Liquidado y Entregado PED-189: $500.00",
    highlightText: "Marcos Sánchez - 100% Pagado • Entregado en Sucursal Los Ángeles",
    description: "Se cobró liquidación final de $500.00 en Sucursal Los Ángeles. Pedido originado en Sucursal San Ildefonso. Entregado con éxito al cliente en mostrador.",
    timeAgo: "Hace 5 min",
    timestamp: Date.now() - 5 * 60 * 1000,
    group: "recientes",
    read: false,
    actionLabel: "Ver Detalle",
    actionLink: "/pedidos?order=PED-189",
    category: "pedidos",
    orderId: "PED-189",
    branchId: "branch-angeles",
    branchName: "Sucursal Los Ángeles",
    operatingBranchId: "branch-1790889237862",
    operatingBranchName: "Sucursal San Ildefonso",
  },
];

export function findOrderForNotification(notif: FBNotification): CustomOrder | null {
  try {
    const allOrders = getStoredOrders();

    // 1. Coincidencia directa por orderId
    if (notif.orderId) {
      const found = allOrders.find(
        (o) => o.id === notif.orderId || o.orderNumber.toLowerCase() === notif.orderId?.toLowerCase()
      );
      if (found) return found;
    }

    // 2. Extraer folio del título, id o texto (ej: "PED-101", "PED-102", "pedido-ped-101")
    const fullText = `${notif.id} ${notif.title} ${notif.highlightText} ${notif.description}`;
    const folioMatch = fullText.match(/PED[-_]?(\d+)/i);
    if (folioMatch) {
      const rawNumber = folioMatch[1];
      const found = allOrders.find((o) => {
        const oNum = o.orderNumber.replace(/\D/g, "");
        const oId = o.id.replace(/\D/g, "");
        return oNum === rawNumber || oId === rawNumber || o.orderNumber.toUpperCase() === `PED-${rawNumber}`;
      });
      if (found) return found;
    }

    // 3. Coincidencia por nombre de cliente si existe
    if (notif.highlightText) {
      const found = allOrders.find(
        (o) => o.customerName && notif.highlightText.toLowerCase().includes(o.customerName.toLowerCase())
      );
      if (found) return found;
    }

    // 4. Si no se encontró en almacenamiento local, sintetizar un CustomOrder completo con los datos enriquecidos de la notificación
    if (notif.category === "pedidos" || notif.title.toLowerCase().includes("pedido")) {
      const folio = folioMatch ? `PED-${folioMatch[1]}` : "PED-101";
      const totalMatch = notif.title.match(/Total\s*\$?([\d,]+(\.\d+)?)/i);
      const depositMatch = notif.highlightText.match(/Anticipo:\s*\$?([\d,]+(\.\d+)?)/i);
      const balanceMatch = notif.description.match(/Saldo restante:\s*\$?([\d,]+(\.\d+)?)/i);

      const total = totalMatch ? parseFloat(totalMatch[1].replace(/,/g, "")) : 950;
      const deposit = depositMatch ? parseFloat(depositMatch[1].replace(/,/g, "")) : 500;
      const balance = balanceMatch ? parseFloat(balanceMatch[1].replace(/,/g, "")) : (total - deposit);

      return {
        id: folio,
        orderNumber: folio,
        customerName: notif.highlightText.split("-")[0]?.trim() || "Sra. María González",
        phone: "55 1234 5678",
        branchId: notif.branchId || "branch-matriz",
        branchName: notif.branchName || notif.senderName.replace(/^[^\(]*\(|\)[^\)]*$/g, "") || "Sucursal Matriz (Centro)",
        operatingBranchId: notif.operatingBranchId || notif.branchId || "branch-matriz",
        operatingBranchName: notif.operatingBranchName || notif.branchName || "Sucursal Matriz (Centro)",
        description: notif.description,
        deliveryDate: new Date(Date.now() + 86400000).toISOString().split("T")[0],
        deliveryTime: "16:00",
        deliveryType: "sucursal",
        status: "pendiente",
        total,
        deposit,
        remainingBalance: balance,
        paymentStatus: balance <= 0 ? "liquidado" : "anticipo",
        paymentMethod: "efectivo",
        dedication: "¡Mis XV Años Mariana!",
        notes: notif.description,
        createdAt: new Date().toISOString(),
        cashier: "Lupita Brito",
        items: [
          {
            name: "Pastel 3 Leches Artesanal Grande (50 personas)",
            quantity: 1,
            unitPrice: 850,
            subtotal: 850,
            notes: "Relleno de duraznos en almíbar y cubierta en crema chantilly lila",
          },
          {
            name: "Pay de Queso con Zarzamora",
            quantity: 1,
            unitPrice: 100,
            subtotal: 100,
            notes: "Para mesa de postres",
          },
        ],
      };
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

  if (notif.shiftCutData?.timestamp && typeof notif.shiftCutData.timestamp === "number" && notif.shiftCutData.timestamp > 1000000000000) {
    return notif.shiftCutData.timestamp;
  }

  const order = findOrderForNotification(notif as FBNotification);
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

  if (notif.timeAgo) {
    const s = notif.timeAgo.toLowerCase().trim();
    const now = Date.now();
    // 1. Detectar si viene una hora fija como "18:05 hrs", "06:05 pm", "18:05"
    const timeMatch = s.match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      const d = new Date();
      let h = parseInt(timeMatch[1], 10);
      const m = parseInt(timeMatch[2], 10);
      if (s.includes("pm") && h < 12) h += 12;
      if (s.includes("am") && h === 12) h = 0;
      d.setHours(h, m, 0, 0);
      if (s.includes("ayer")) d.setDate(d.getDate() - 1);
      return d.getTime();
    }
    const minM = s.match(/hace\s*(\d+)\s*min/);
    if (minM) return now - parseInt(minM[1], 10) * 60 * 1000;
    const hourM = s.match(/hace\s*(\d+)\s*h/);
    if (hourM) return now - parseInt(hourM[1], 10) * 3600 * 1000;
    const secM = s.match(/hace\s*(\d+)\s*s/);
    if (secM) return now - parseInt(secM[1], 10) * 1000;
    if (s.includes("ayer")) return now - 24 * 3600 * 1000;
    if (s.includes("hace un momento") || s.includes("ahora")) return now - 45 * 1000;
  }

  return Date.now();
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
            // Purgar y excluir estrictamente cualquier notificación vieja de almacén / stock
            const allowed = parsed.filter(isAllowedNotification).map((item: FBNotification) => {
              const enrichedTs = resolveNotificationTimestamp(item);
              const timeAgoClean = (!item.timeAgo || item.timeAgo === "Hace un momento" || item.timeAgo.toLowerCase() === "ahora")
                ? formatNotificationHour(enrichedTs)
                : item.timeAgo;
              if (
                (item.category === "caja" ||
                 item.title.toLowerCase().includes("corte") ||
                 item.title.toLowerCase().includes("cierre")) &&
                !item.shiftCutData
              ) {
                const enriched = findShiftCutForNotification(item);
                if (enriched) {
                  return { ...item, timestamp: enrichedTs, timeAgo: timeAgoClean, shiftCutData: enriched, cutId: enriched.id };
                }
              }
              // Retro-compatibilidad: enriquecer pedidos antiguos con datos de sucursal
              if (item.category === "pedidos" && (!item.branchId || !item.operatingBranchId)) {
                const order = findOrderForNotification(item);
                if (order) {
                  return {
                    ...item,
                    timestamp: enrichedTs,
                    timeAgo: timeAgoClean,
                    branchId: item.branchId || order.branchId,
                    branchName: item.branchName || order.branchName,
                    operatingBranchId: item.operatingBranchId || order.operatingBranchId,
                    operatingBranchName: item.operatingBranchName || order.operatingBranchName,
                  };
                }
              }
              return { ...item, timestamp: enrichedTs, timeAgo: timeAgoClean };
            });

            // Deduplicación estricta de pedidos repetidos en almacenamiento
            const deduplicated: FBNotification[] = [];
            for (const item of allowed) {
              const existingIdx = deduplicated.findIndex((existing) => isSameOrderEvent(existing, item));
              if (existingIdx === -1) {
                deduplicated.push(item);
              } else {
                deduplicated[existingIdx] = mergeNotifications(deduplicated[existingIdx], item);
              }
            }

            if (deduplicated.length > 0) {
              try {
                localStorage.setItem(STORAGE_NOTIFS_KEY, JSON.stringify(deduplicated));
              } catch (e) {}
              return deduplicated;
            }
          }
        }
      } catch (e) {}
    }
    return INITIAL_FB_NOTIFICATIONS;
  });

  const notificationsRef = useRef(notifications);
  notificationsRef.current = notifications;

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
          const isAdmin = !user || user.role === "admin" || user.role === "auxiliar_admin";
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

  // Notificaciones filtradas según el rol y sucursal del usuario
  const visibleNotifications = useMemo(() => {
    const filtered = notifications.filter((notif) => isNotificationVisibleForUser(notif, user, currentBranch));
    // DEDUPLICACIÓN EN TIEMPO DE RENDER: Garantía del 100% de que NUNCA se mostrarán pedidos duplicados
    const deduped: FBNotification[] = [];
    for (const item of filtered) {
      const idx = deduped.findIndex((d) => isSameOrderEvent(d, item));
      if (idx === -1) {
        deduped.push(item);
      } else {
        deduped[idx] = mergeNotifications(deduped[idx], item);
      }
    }
    return deduped;
  }, [notifications, user, currentBranch]);

  // Conteo de no leídas calculado exclusivamente sobre las notificaciones visibles para el usuario
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
      // Filtrar estrictamente: solo Cierres de Turno y Pedidos
      if (!isAllowedNotification(incomingNotif)) return;

      const remoteNotif: FBNotification = {
        ...incomingNotif,
        timestamp: resolveNotificationTimestamp(incomingNotif),
      };

      const isDuplicate = notificationsRef.current.some((n) => isSameOrderEvent(n, remoteNotif));
      if (isDuplicate) {
        setNotifications((prev) => {
          const idx = prev.findIndex((n) => isSameOrderEvent(n, remoteNotif));
          if (idx === -1) return prev;
          const updated = [...prev];
          updated[idx] = mergeNotifications(prev[idx], remoteNotif);
          persistNotifs(updated);
          return updated;
        });
        return; // Detener: NO sonar ni mostrar toast si es duplicado
      }

      setNotifications((prev) => {
        if (prev.some((n) => isSameOrderEvent(n, remoteNotif))) return prev;
        const updated = [remoteNotif, ...prev];
        persistNotifs(updated);
        return updated;
      });

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
          if (action === "create") {
            const notifId = `notif-order-${order.id}`;
            if (
              notificationsRef.current.some(
                (n) => n.id === notifId || isSameOrderEvent(n, { id: notifId, orderId: order.id, highlightText: order.orderNumber })
              )
            ) {
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
              if (prev.some((n) => isSameOrderEvent(n, notif))) return prev;
              const updated = [notif, ...prev];
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
            const remNum = Number(order.remainingBalance) || 0;
            const isPaid = remNum === 0 || order.paymentStatus === "liquidado";
            const lastPayment = Array.isArray(order.payments) && order.payments.length > 0 ? order.payments[order.payments.length - 1] : null;
            const paymentAmount = Number(lastPayment?.amount) || Number(order.deposit) || 0;
            const notifId = `notif-order-pay-${order.id}-${paymentAmount}`;

            if (notificationsRef.current.some((n) => n.id === notifId)) {
              return;
            }

            const originName = order.operatingBranchName || "Sucursal";
            const currentOrDestName = order.branchName || "Sucursal";
            const isCross = originName.toLowerCase().trim() !== currentOrDestName.toLowerCase().trim();

            const notif: FBNotification = {
              id: notifId,
              senderName: isPaid ? `🎂 Pedido Liquidado (${currentOrDestName})` : `💰 Abono Recibido (${currentOrDestName})`,
              senderAvatar: "🎂",
              badgeIcon: "pastel",
              title: isPaid
                ? `Pedido Liquidado ${order.orderNumber}: $${paymentAmount.toFixed(2)}`
                : `Abono de Pedido ${order.orderNumber}: $${paymentAmount.toFixed(2)}`,
              highlightText: `${order.customerName} - ${isPaid ? "100% Pagado" : `Resta: $${remNum.toFixed(2)}`}`,
              description: isCross
                ? `Se registró pago de $${paymentAmount.toFixed(2)} en ${currentOrDestName}. Pedido originado en ${originName}. ${isPaid ? "Listo para entrega final." : `Saldo restante: $${remNum.toFixed(2)}.`}`
                : `Se registró pago de $${paymentAmount.toFixed(2)}. Pedido: ${order.description || order.orderNumber}. ${isPaid ? "Listo para entrega final." : `Saldo restante: $${remNum.toFixed(2)}.`}`,
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
              actionLabel: remNum > 0 ? `Cobrar $${remNum.toFixed(2)}` : "Ver Detalle",
              actionLink: "/pedidos",
            };

            setNotifications((prev) => {
              if (prev.some((n) => isSameOrderEvent(n, notif))) return prev;
              const updated = [notif, ...prev];
              persistNotifs(updated);
              return updated;
            });

            const isVisible = isNotificationVisibleForUser(notif, userRef.current, currentBranchRef.current);
            if (isVisible) {
              playChime();
              setActiveToast(notif);
              triggerNativeNotification(notif);
            }
          } else if (action === "status") {
            const notifId = `notif-order-status-${order.id}-${order.status}`;
            if (
              notificationsRef.current.some(
                (n) => n.id === notifId || (order.status === "entregado" && n.id === `notif-order-delivered-${order.id}`)
              )
            ) {
              return;
            }

            const originName = order.operatingBranchName || "Sucursal";
            const delivBranchName = order.branchName || "Sucursal";
            const isCross = originName.toLowerCase().trim() !== delivBranchName.toLowerCase().trim();

            let title = `Estado de Pedido: ${order.status.toUpperCase()} (${order.orderNumber})`;
            let description = `El pedido ${order.orderNumber} cambió a estado ${order.status}.`;
            let senderName = `📦 Pedido ${order.orderNumber} (${delivBranchName})`;
            let avatar = "📦";

            if (order.status === "entregado") {
              senderName = `📦 Pedido Entregado (${delivBranchName})`;
              avatar = "📦";
              title = `Pedido Entregado con Éxito: ${order.orderNumber}`;
              description = `El pedido ${order.orderNumber} de "${order.customerName}" fue entregado satisfactoriamente en ${delivBranchName}.${isCross ? ` (Originado en: ${originName}).` : ""}`;
            } else if (order.status === "listo") {
              senderName = `🎂 Producto Listo en Sucursal (${delivBranchName})`;
              avatar = "🎂";
              title = `El producto ya está en sucursal: ${order.orderNumber}`;
              description = `El pedido ${order.orderNumber} de "${order.customerName}" ha sido marcado como LISTO en sucursal para entrega en ${delivBranchName}.`;
            } else if (order.status === "cancelado") {
              senderName = `🗑️ Pedido Cancelado (${delivBranchName})`;
              avatar = "🗑️";
              title = `Pedido Cancelado: ${order.orderNumber}`;
              description = `El pedido ${order.orderNumber} de "${order.customerName}" ha sido dado de baja o cancelado.`;
            }

            const notif: FBNotification = {
              id: notifId,
              senderName,
              senderAvatar: avatar,
              badgeIcon: "pastel",
              title,
              highlightText: `${order.customerName} • ${order.status === "entregado" ? "Entregado al Cliente" : order.status === "listo" ? "Listo en Sucursal" : order.status}`,
              description,
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
              actionLabel: "Ver Detalle",
              actionLink: "/pedidos",
            };

            setNotifications((prev) => {
              if (prev.some((n) => isSameOrderEvent(n, notif))) return prev;
              const updated = [notif, ...prev];
              persistNotifs(updated);
              return updated;
            });

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
          if (!Array.isArray(rawRemoteList) || rawRemoteList.length === 0) return;
          const remoteList = rawRemoteList.map((n) => ({
            ...n,
            timestamp: resolveNotificationTimestamp(n),
          }));

          setNotifications((prev) => {
            const currentIds = new Set(prev.map((n) => n.id));
            const newNotifs = remoteList.filter(
              (n) => !currentIds.has(n.id) && !prev.some((p) => isSameOrderEvent(p, n))
            );

            if (newNotifs.length === 0) {
              return remoteList;
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

            return remoteList;
          });
        } catch (err) {
          console.warn("[NotificationContext] Error parsing storage notifs:", err);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
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

    const isDuplicate = notificationsRef.current.some((n) => isSameOrderEvent(n, fullNotif));
    if (isDuplicate) {
      setNotifications((prev) => {
        const idx = prev.findIndex((n) => isSameOrderEvent(n, fullNotif));
        if (idx === -1) return prev;
        const updated = [...prev];
        updated[idx] = mergeNotifications(prev[idx], fullNotif);
        persistNotifs(updated);
        return updated;
      });

      // Transmitir en vivo a los demás celulares/computadoras del negocio aunque ya exista localmente
      if (realtimeHub.broadcastNotification) {
        realtimeHub.broadcastNotification(fullNotif);
      }
      return;
    }

    setNotifications((prev) => {
      if (prev.some((n) => isSameOrderEvent(n, fullNotif))) return prev;
      const updated = [fullNotif, ...prev];
      persistNotifs(updated);
      return updated;
    });

    // Transmitir en vivo por WebSocket a los demás celulares/computadoras del negocio
    if (realtimeHub.broadcastNotification) {
      realtimeHub.broadcastNotification(fullNotif);
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
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      persistNotifs(updated);
      return updated;
    });
  };

  const markAsUnread = (id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, read: false } : n));
      persistNotifs(updated);
      return updated;
    });
  };

  const markAllAsRead = () => {
    playChime();
    setNotifications((prev) => {
      const visibleIds = new Set(visibleNotifications.map((n) => n.id));
      const updated = prev.map((n) => (visibleIds.has(n.id) ? { ...n, read: true } : n));
      persistNotifs(updated);
      return updated;
    });
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      persistNotifs(updated);
      return updated;
    });
  };

  const clearAll = () => {
    setNotifications((prev) => {
      // Limpiar únicamente las notificaciones visibles para el usuario actual
      const visibleIds = new Set(visibleNotifications.map((n) => n.id));
      const updated = prev.filter((n) => !visibleIds.has(n.id));
      persistNotifs(updated);
      return updated;
    });
  };

  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<CustomOrder | null>(null);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<CustomOrder | null>(null);
  const [selectedOrderForReceipt, setSelectedOrderForReceipt] = useState<CustomOrder | null>(null);
  const [selectedCutForDetail, setSelectedCutForDetail] = useState<ShiftCutRecord | null>(null);

  const openOrderDetail = (orderOrNotif: CustomOrder | FBNotification) => {
    if (!orderOrNotif) return;
    if ("items" in orderOrNotif || "orderNumber" in orderOrNotif) {
      setSelectedOrderForDetail(orderOrNotif as CustomOrder);
    } else {
      const order = findOrderForNotification(orderOrNotif as FBNotification);
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
        isOpen={!!selectedOrderForDetail}
        onClose={() => setSelectedOrderForDetail(null)}
        order={selectedOrderForDetail}
        isHistoryMode={selectedOrderForDetail?.status === "entregado" || selectedOrderForDetail?.status === "cancelado"}
        onPrintReceipt={(o) => {
          setSelectedOrderForReceipt(o);
        }}
        onOpenPayment={(o) => {
          setSelectedOrderForPayment(o);
        }}
        onAdvanceStatus={(o) => {
          if (o.status === "entregado" || o.status === "cancelado") {
            alert("Este pedido pertenece al historial y no puede ser modificado.");
            return;
          }
          const nextStatus = o.status === "pendiente" ? "en_horno" : o.status === "en_horno" ? "listo" : "entregado";
          updateOrderStatus(o.id, nextStatus);
          const updated = getStoredOrders().find((item) => item.id === o.id);
          if (updated) setSelectedOrderForDetail(updated);
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("brito_orders_updated"));
          }
        }}
        onDeliverOrder={(o) => {
          if (o.status === "entregado" || o.status === "cancelado") {
            alert("Este pedido pertenece al historial.");
            return;
          }
          updateOrderStatus(o.id, "entregado");
          setSelectedOrderForDetail(null);
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
        onDarDeBaja={(o) => {
          const isCancelled = o.status === "cancelado";
          const confirmMsg = isCancelled
            ? `¿Estás seguro de ELIMINAR PERMANENTEMENTE el pedido ${o.orderNumber} de "${o.customerName}"?\n\nEsta acción borrará el pedido por completo del registro histórico y no se podrá recuperar.`
            : `¿Estás seguro de DAR DE BAJA el pedido ${o.orderNumber} de "${o.customerName}"?\n\nEl pedido se marcará como dado de baja y te mandaremos directo al historial de "Productos que se dieron de baja".`;
          if (confirm(confirmMsg)) {
            if (isCancelled) {
              deleteCustomOrder(o.id);
            } else {
              updateOrderStatus(o.id, "cancelado");
            }
            setSelectedOrderForDetail(null);
            if (typeof window !== "undefined") {
              window.dispatchEvent(new Event("brito_orders_updated"));
              if (!isCancelled) {
                window.location.href = "/pedidos?filter=cancelados";
              }
            }
          }
        }}
      />

      {/* MODAL GLOBAL DE COBRO / LIQUIDACIÓN DE PEDIDO */}
      <OrderPaymentModal
        isOpen={!!selectedOrderForPayment}
        onClose={() => setSelectedOrderForPayment(null)}
        order={selectedOrderForPayment}
        onPaymentSuccess={() => {
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("brito_orders_updated"));
          }
          if (selectedOrderForDetail) {
            const updated = getStoredOrders().find((o) => o.id === selectedOrderForDetail.id);
            if (updated) setSelectedOrderForDetail(updated);
          }
        }}
      />

      {/* MODAL GLOBAL DE TICKET / COMPROBANTE DE PEDIDO */}
      <OrderReceiptModal
        isOpen={!!selectedOrderForReceipt}
        onClose={() => setSelectedOrderForReceipt(null)}
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
