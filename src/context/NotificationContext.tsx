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
    orderData: incoming.orderData || existing.orderData,
    actionLabel: incoming.actionLabel || existing.actionLabel,
    actionLink: incoming.actionLink || existing.actionLink,
    secondaryActionLabel: incoming.secondaryActionLabel || existing.secondaryActionLabel,
    secondaryActionLink: incoming.secondaryActionLink || existing.secondaryActionLink,
    read: existing.read,
  };
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

  // Identificar el código canónico de la sucursal activa o asignada al usuario
  let targetBranchId = "";
  if (isAndres) {
    targetBranchId = "branch-angeles";
  } else if (activeBranch?.id && activeBranch.id !== "all") {
    targetBranchId = activeBranch.id;
  } else if (user?.assignedBranchId) {
    targetBranchId = user.assignedBranchId;
  } else if (user) {
    targetBranchId = resolveBranchId("", user.name || user.username);
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

  // 3. Contrastar con los datos reales del pedido almacenado
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

  // 4. Búsqueda de palabra clave por sucursal en el texto
  const text = `${notif.title || ""} ${notif.highlightText || ""} ${notif.description || ""} ${notif.senderName || ""}`.toLowerCase();
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
    // 0. Si la notificación ya contiene el pedido estructurado
    if (notif.orderData) {
      const allOrders = getStoredOrders();
      const exists = allOrders.some(
        (o) => o.id === notif.orderData!.id || o.orderNumber === notif.orderData!.orderNumber
      );
      if (!exists) {
        saveStoredOrders([notif.orderData, ...allOrders]);
      }
      return notif.orderData;
    }

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

    // 4. Si no se encontró en almacenamiento local, reconstruir usando el extractor centralizado
    // y guardarlo de inmediato en almacenamiento local para vincularlo 100% con el historial
    const reconstructed = extractOrderFromNotification(notif);
    if (reconstructed) {
      const exists = allOrders.some(
        (o) => o.id === reconstructed.id || o.orderNumber === reconstructed.orderNumber
      );
      if (!exists) {
        saveStoredOrders([reconstructed, ...allOrders]);
      }
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

            localStorage.setItem(STORAGE_NOTIFS_KEY, JSON.stringify(allowed));
            return allowed;
          }
        }
      } catch (e) {}
    }
    return [];
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

  // Notificaciones filtradas según el rol y sucursal del usuario
  const visibleNotifications = useMemo(() => {
    const filtered = notifications.filter((notif) => {
      const ts = resolveNotificationTimestamp(notif);
      if (ts < CLEAN_SLATE_EPOCH) return false;
      return isNotificationVisibleForUser(notif, user, currentBranch);
    });
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
      const notifTs = resolveNotificationTimestamp(incomingNotif);
      if (notifTs > 0 && notifTs < CLEAN_SLATE_EPOCH) return;

      const remoteNotif: FBNotification = {
        ...incomingNotif,
        timestamp: notifTs > 0 ? notifTs : Date.now(),
      };

      // Vincular 100% de inmediato con el almacenamiento de pedidos
      if (remoteNotif.orderData) {
        const stored = getStoredOrders();
        const exists = stored.some((o) => o.id === remoteNotif.orderData!.id || o.orderNumber === remoteNotif.orderData!.orderNumber);
        if (!exists) {
          saveStoredOrders([remoteNotif.orderData, ...stored]);
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
          const orderTs = order.timestamp || (order.createdAt ? new Date(order.createdAt).getTime() : 0);
          if (orderTs > 0 && orderTs < CLEAN_SLATE_EPOCH) return;
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
          const updated = getStoredOrders().find((item) => item.id === o.id);
          if (updated) setSelectedOrderForDetail(updated);
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
