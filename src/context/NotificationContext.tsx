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
}

export function isAllowedNotification(notif: Partial<FBNotification>): boolean {
  if (!notif) return false;

  const text = `${notif.title || ""} ${notif.highlightText || ""} ${notif.description || ""} ${notif.senderName || ""}`.toLowerCase();

  // 1. Bloqueo estricto: Cero notificaciones de almacén, inventario, producción de hornos, insumos o escaneos
  if (
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

  // 3. Permitir exclusivamente Pedidos / Encargos de pan y pasteles
  const isPedido =
    notif.category === "pedidos" ||
    text.includes("pedido") ||
    text.includes("encargo") ||
    text.includes("apartado") ||
    text.includes("anticipo") ||
    text.includes("ped-");

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
  const uId = (userBranchId || "").toLowerCase().trim();
  const uName = (userBranchName || "").toLowerCase().trim();

  // Helper para identificar palabras clave de sucursal
  const getBranchKeywords = (str: string): string[] => {
    const s = str.toLowerCase();
    const keywords: string[] = [];
    if (s.includes("benito")) keywords.push("benito");
    if (s.includes("flores")) keywords.push("flores");
    if (s.includes("matriz") || s.includes("centro")) keywords.push("matriz");
    return keywords;
  };

  const userKeywords = [...getBranchKeywords(uId), ...getBranchKeywords(uName)];

  const checkMatch = (targetId?: string, targetName?: string): boolean => {
    const tId = (targetId || "").toLowerCase().trim();
    const tName = (targetName || "").toLowerCase().trim();

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
    const textLower = info.fullText.toLowerCase();
    if (userKeywords.some((k) => textLower.includes(k))) {
      return true;
    }
  }

  return false;
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
  // REGLA 1: Cortes de caja, dinero que entra, movimientos de efectivo, arqueos y retiros
  // son EXCLUSIVOS del perfil administrador. Se bloquean estrictamente para cajeros.
  const text = `${notif.title || ""} ${notif.highlightText || ""} ${notif.description || ""} ${notif.senderName || ""}`.toLowerCase();
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

  if (isCajaCategory) {
    return false;
  }

  // REGLA 2: Notificaciones de PEDIDOS:
  // Solo le llegan al cajero si el pedido es de la sucursal donde se hizo el pedido (origen)
  // o donde se entregará (destino/recogida).
  const userBranchId = (user.assignedBranchId || activeBranch?.id || "").trim();
  const userBranchName = (user.assignedBranchName || activeBranch?.name || activeBranch?.shortName || "").trim();

  // Si por alguna razón el usuario no tiene ninguna sucursal asignada
  if (!userBranchId && !userBranchName) {
    return true;
  }

  // Resolver sucursales del pedido
  let pickupId = notif.branchId;
  let pickupName = notif.branchName;
  let operatingId = notif.operatingBranchId;
  let operatingName = notif.operatingBranchName;

  // Si faltan campos en la notificación, resolverlos desde el pedido almacenado
  if (!pickupId && !operatingId) {
    const order = findOrderForNotification(notif as FBNotification);
    if (order) {
      pickupId = order.branchId;
      pickupName = order.branchName;
      operatingId = order.operatingBranchId;
      operatingName = order.operatingBranchName;
    }
  }

  return checkBranchMatch(
    {
      pickupBranchId: pickupId,
      pickupBranchName: pickupName,
      operatingBranchId: operatingId,
      operatingBranchName: operatingName,
      fullText: text,
    },
    userBranchId,
    userBranchName
  );
}

const INITIAL_FB_NOTIFICATIONS: FBNotification[] = [
  {
    id: "corte-turno-matutino-cuadro",
    senderName: "🏁 Cierre de Turno (Lupita Brito)",
    senderAvatar: "💰",
    badgeIcon: "dinero",
    title: "Cierre a las 14:00 hrs: ✓ CAJA CUADRADA EXACTA ($0.00)",
    highlightText: "Lupita Brito entregó turno a Don Toño Brito",
    description: "Horario de turno: 06:30 a 14:00 hrs. Efectivo en caja: $4,850.00. Cuadró exacto sin faltante ($0.00 de diferencia). Fondo dejado para nuevo turno: $800.00. Efectivo retirado: $4,050.00.",
    timeAgo: "Hace 15 min",
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
      shiftRange: "06:30 a 14:00 hrs",
      outgoingCashier: "Lupita Brito",
      incomingCashier: "Don Toño Brito",
      responsible: "Lupita Brito",
      branchName: "Sucursal Matriz (Centro)",
      previousShift: "Matutino",
      nextShift: "Vespertino",
      initialFund: 800,
      cashSales: 4550,
      cardSales: 1200,
      transferSales: 600,
      totalSales: 6350,
      totalSalesAll: 6350,
      totalExpenses: 500,
      totalIncomes: 0,
      expectedCash: 4850,
      countedCash: 4850,
      difference: 0,
      nextFund: 800,
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
      initialFund: 800,
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
      nextFund: 800,
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
    title: "Nuevo Pedido PED-102: Total $1,200.00",
    highlightText: "Ing. Carlos Mendoza - 100% Pagado ($1,200.00)",
    description: "100 piezas de Mini Cuernitos Hojaldrados. Entrega: Hoy a las 08:30 hrs en Sucursal San Juan. Estado: Listo para entrega.",
    timeAgo: "Ayer a las 6:30 PM",
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
    const nextFundMatch = fullText.match(/(?:fondo(?: dejado| para nuevo turno)?|se qued[óo] en caja)[:\s]*\$?([0-9,]+(?:\.[0-9]+)?)/i);
    const nextFund = nextFundMatch ? parseFloat(nextFundMatch[1].replace(/,/g, "")) : 800;

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
      : notif.senderName.replace(/^🏁\s*Cierre de Turno\s*\(|\)$/g, "").trim() || "Lupita Brito";
    const incoming = relevoMatch ? relevoMatch[2].trim() : "Don Toño Brito";

    const initialFund = 800;
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
      branchName: "Sucursal Matriz (Centro)",
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
              if (
                (item.category === "caja" ||
                 item.title.toLowerCase().includes("corte") ||
                 item.title.toLowerCase().includes("cierre")) &&
                !item.shiftCutData
              ) {
                const enriched = findShiftCutForNotification(item);
                if (enriched) {
                  return { ...item, shiftCutData: enriched, cutId: enriched.id };
                }
              }
              // Retro-compatibilidad: enriquecer pedidos antiguos con datos de sucursal
              if (item.category === "pedidos" && (!item.branchId || !item.operatingBranchId)) {
                const order = findOrderForNotification(item);
                if (order) {
                  return {
                    ...item,
                    branchId: item.branchId || order.branchId,
                    branchName: item.branchName || order.branchName,
                    operatingBranchId: item.operatingBranchId || order.operatingBranchId,
                    operatingBranchName: item.operatingBranchName || order.operatingBranchName,
                  };
                }
              }
              return item;
            });
            if (allowed.length > 0) {
              return allowed;
            }
          }
        }
      } catch (e) {}
    }
    return INITIAL_FB_NOTIFICATIONS;
  });

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
    return notifications.filter((notif) => isNotificationVisibleForUser(notif, user, currentBranch));
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
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
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

    const unsubNotification = realtimeHub.onNotification((remoteNotif) => {
      // Filtrar estrictamente: solo Cierres de Turno y Pedidos
      if (!isAllowedNotification(remoteNotif)) return;

      setNotifications((prev) => {
        // Evitar duplicados si ya existe
        if (prev.some((n) => n.id === remoteNotif.id)) return prev;
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

    return () => {
      unsubNotification();
      unsubStatus();
    };
  }, []);

  const addNotification = (notif: Omit<FBNotification, "id" | "read" | "timeAgo" | "group"> & Partial<FBNotification>) => {
    // Filtrar estrictamente: excluir almacén/inventario y permitir solo Cierres de Turno y Pedidos
    if (!isAllowedNotification(notif)) {
      return;
    }

    const newId = notif.id || `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const fullNotif: FBNotification = {
      id: newId,
      timeAgo: "Hace un momento",
      group: "recientes",
      read: false,
      ...notif,
    };

    setNotifications((prev) => {
      if (prev.some((n) => n.id === newId)) return prev;
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
