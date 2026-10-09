import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { CustomOrder } from "@/types";
import { INITIAL_ORDERS } from "@/lib/orders";
import { recordServerRealtimeEvent } from "@/lib/realtime/serverEvents";

// Ruta al archivo de almacenamiento persistente en el servidor
const DATA_DIR = path.join(process.cwd(), "src", "data");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");

// Cache en memoria para acceso ultra-rápido en entornos sin disco o serverless
let inMemoryOrdersCache: CustomOrder[] | null = null;

function formatNotificationHour(timestamp?: number): string {
  const ts = typeof timestamp === "number" && !isNaN(timestamp) && timestamp > 0 ? timestamp : Date.now();
  const d = new Date(ts);
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes} hrs`;
}

function ensureDataDirectory() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn("[API Orders] No se pudo crear directorio data (modo solo lectura):", err);
  }
}

function readStoredOrders(): CustomOrder[] {
  if (inMemoryOrdersCache && inMemoryOrdersCache.length > 0) {
    return inMemoryOrdersCache;
  }

  try {
    ensureDataDirectory();
    if (fs.existsSync(ORDERS_FILE)) {
      const content = fs.readFileSync(ORDERS_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryOrdersCache = parsed;
        return parsed;
      }
    }
  } catch (err) {
    console.warn("[API Orders] Error al leer orders.json, usando memoria:", err);
  }

  // Si aún no hay archivo ni cache, inicializar con los pedidos base
  if (!inMemoryOrdersCache || inMemoryOrdersCache.length === 0) {
    inMemoryOrdersCache = [...INITIAL_ORDERS];
    try {
      ensureDataDirectory();
      fs.writeFileSync(ORDERS_FILE, JSON.stringify(INITIAL_ORDERS, null, 2), "utf-8");
    } catch (err) {
      console.warn("[API Orders] No se pudo sembrar orders.json:", err);
    }
  }

  return inMemoryOrdersCache || [];
}

function writeStoredOrders(orders: CustomOrder[]): boolean {
  inMemoryOrdersCache = orders;
  try {
    ensureDataDirectory();
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.warn("[API Orders] No se pudo guardar en orders.json (almacenado solo en memoria):", err);
    return false;
  }
}

/**
 * GET /api/orders
 * Obtiene la lista maestra de pedidos sincronizados para celulares y PC
 */
export async function GET(req: NextRequest) {
  try {
    const orders = readStoredOrders();
    return NextResponse.json({
      success: true,
      orders,
      count: orders.length,
      timestamp: Date.now(),
      source: "server_master",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Error al obtener pedidos" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orders
 * Guarda o sincroniza pedidos entre celulares y PC
 * Acepta:
 * 1. { orders: CustomOrder[] } -> Sincronización / merge masivo
 * 2. { order: CustomOrder } -> Creación individual de pedido
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const currentOrders = readStoredOrders();
    const ordersMap = new Map<string, CustomOrder>();

    // Cargar existentes
    for (const ord of currentOrders) {
      const key = ord.orderNumber || ord.id;
      if (key) ordersMap.set(key, ord);
    }

    if (Array.isArray(body.orders)) {
      // Merge masivo de pedidos recibidos desde PC o celular
      for (const ord of body.orders) {
        if (!ord) continue;
        const key = ord.orderNumber || ord.id;
        if (!key) continue;

        if (ordersMap.has(key)) {
          // Si ya existe, nos quedamos con el que tenga mayor timestamp o actualizamos campos
          const existing = ordersMap.get(key)!;
          const incomingTs = ord.timestamp || (ord.createdAt ? new Date(ord.createdAt).getTime() : 0);
          const existingTs = existing.timestamp || (existing.createdAt ? new Date(existing.createdAt).getTime() : 0);

          if (incomingTs >= existingTs) {
            ordersMap.set(key, { ...existing, ...ord });
          }
        } else {
          ordersMap.set(key, ord);

          // Si es un pedido nuevo en el servidor, notificar a todas las sucursales conectadas
          try {
            recordServerRealtimeEvent("order", { action: "create", order: ord });

            const remaining = Number(ord.remainingBalance) || 0;
            const originName = ord.operatingBranchName || "Sucursal";
            const destName = ord.branchName || "Sucursal";
            const isCross = Boolean(
              originName && destName && originName.toLowerCase().trim() !== destName.toLowerCase().trim()
            );

            recordServerRealtimeEvent("notification", {
              id: `notif-order-${ord.id}`,
              senderName: isCross ? `🎂 ${originName} ➔ ${destName}` : `🎂 Pedido Registrado (${destName})`,
              senderAvatar: "🎂",
              badgeIcon: "pastel",
              title: `Nuevo Pedido ${ord.orderNumber}: Total $${(Number(ord.total) || 0).toFixed(2)}`,
              highlightText: `${ord.customerName} • Anticipo: $${(Number(ord.deposit) || 0).toFixed(2)}${remaining > 0 ? ` (Resta: $${remaining.toFixed(2)})` : " (Liquidado)"}`,
              description: `${ord.description ? `${ord.description}. ` : ""}${isCross ? `[Levantado en: ${originName} • Entrega en: ${destName}] ` : `Recoge en: ${destName}. `}Entrega: ${ord.deliveryDate} a las ${ord.deliveryTime} hrs. Saldo restante: $${remaining.toFixed(2)}.`,
              timeAgo: formatNotificationHour(ord.timestamp || Date.now()),
              timestamp: ord.timestamp || Date.now(),
              group: "recientes",
              read: false,
              category: "pedidos",
              orderId: ord.id,
              branchId: ord.branchId,
              branchName: ord.branchName,
              operatingBranchId: ord.operatingBranchId,
              operatingBranchName: ord.operatingBranchName,
              actionLabel: remaining > 0 ? `Cobrar $${remaining.toFixed(2)}` : "Ver Detalle",
              actionLink: "/pedidos",
              secondaryActionLabel: remaining > 0 ? "Ver Detalle" : undefined,
              secondaryActionLink: remaining > 0 ? "/pedidos" : undefined,
            });
          } catch (e) {}
        }
      }
    } else if (body.order) {
      // Pedido individual
      const ord = body.order;
      const key = ord.orderNumber || ord.id;
      if (key) {
        ordersMap.set(key, ord);
      }

      // Propagar evento en tiempo real en el servidor para que todos los dispositivos y sucursales lo sincronicen
      try {
        recordServerRealtimeEvent("order", { action: "create", order: ord });

        const remaining = Number(ord.remainingBalance) || 0;
        const originName = ord.operatingBranchName || "Sucursal";
        const destName = ord.branchName || "Sucursal";
        const isCross = Boolean(
          originName && destName && originName.toLowerCase().trim() !== destName.toLowerCase().trim()
        );

        recordServerRealtimeEvent("notification", {
          id: `notif-order-${ord.id}`,
          senderName: isCross ? `🎂 ${originName} ➔ ${destName}` : `🎂 Pedido Registrado (${destName})`,
          senderAvatar: "🎂",
          badgeIcon: "pastel",
          title: `Nuevo Pedido ${ord.orderNumber}: Total $${(Number(ord.total) || 0).toFixed(2)}`,
          highlightText: `${ord.customerName} • Anticipo: $${(Number(ord.deposit) || 0).toFixed(2)}${remaining > 0 ? ` (Resta: $${remaining.toFixed(2)})` : " (Liquidado)"}`,
          description: `${ord.description ? `${ord.description}. ` : ""}${isCross ? `[Levantado en: ${originName} • Entrega en: ${destName}] ` : `Recoge en: ${destName}. `}Entrega: ${ord.deliveryDate} a las ${ord.deliveryTime} hrs. Saldo restante: $${remaining.toFixed(2)}.`,
          timeAgo: formatNotificationHour(ord.timestamp || Date.now()),
          timestamp: ord.timestamp || Date.now(),
          group: "recientes",
          read: false,
          category: "pedidos",
          orderId: ord.id,
          branchId: ord.branchId,
          branchName: ord.branchName,
          operatingBranchId: ord.operatingBranchId,
          operatingBranchName: ord.operatingBranchName,
          actionLabel: remaining > 0 ? `Cobrar $${remaining.toFixed(2)}` : "Ver Detalle",
          actionLink: "/pedidos",
          secondaryActionLabel: remaining > 0 ? "Ver Detalle" : undefined,
          secondaryActionLink: remaining > 0 ? "/pedidos" : undefined,
        });
      } catch (rtErr) {
        console.warn("[API Orders] No se pudo registrar evento de tiempo real:", rtErr);
      }
    } else {
      return NextResponse.json(
        { success: false, error: "Formato no válido. Envíe { order } o { orders: [] }" },
        { status: 400 }
      );
    }

    // Convertir de nuevo a array y ordenar cronológicamente
    const updatedList = Array.from(ordersMap.values()).sort((a, b) => {
      const timeA = a.timestamp || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const timeB = b.timestamp || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return timeB - timeA;
    });

    writeStoredOrders(updatedList);

    return NextResponse.json({
      success: true,
      orders: updatedList,
      count: updatedList.length,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Error al procesar sincronización de pedidos" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/orders
 * Actualiza un pedido específico (estado, abono, notas)
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, orderNumber, updates } = body;

    const targetKey = orderNumber || orderId;
    if (!targetKey || !updates) {
      return NextResponse.json(
        { success: false, error: "Se requiere orderId o orderNumber y updates" },
        { status: 400 }
      );
    }

    const currentOrders = readStoredOrders();
    const idx = currentOrders.findIndex(
      (o) => o.id === targetKey || o.orderNumber === targetKey
    );

    if (idx === -1) {
      return NextResponse.json(
        { success: false, error: "Pedido no encontrado en el servidor" },
        { status: 404 }
      );
    }

    currentOrders[idx] = {
      ...currentOrders[idx],
      ...updates,
      timestamp: Date.now(),
    };

    writeStoredOrders(currentOrders);

    try {
      const updatedOrder = currentOrders[idx];
      recordServerRealtimeEvent("order", { action: updates.status ? "status" : "payment", order: updatedOrder });

      const originName = updatedOrder.operatingBranchName || "Sucursal";
      const destName = updatedOrder.branchName || "Sucursal";
      const isCross = originName.toLowerCase().trim() !== destName.toLowerCase().trim();

      if (updates.status === "entregado") {
        recordServerRealtimeEvent("notification", {
          id: `notif-order-status-${updatedOrder.id}-entregado`,
          senderName: `📦 Pedido Entregado (${destName})`,
          senderAvatar: "📦",
          badgeIcon: "pastel",
          title: `Pedido Entregado con Éxito: ${updatedOrder.orderNumber}`,
          highlightText: `${updatedOrder.customerName} • Entregado al Cliente`,
          description: `El pedido ${updatedOrder.orderNumber} fue entregado con éxito al cliente en ${destName}.${isCross ? ` (Originado en: ${originName}).` : ""}`,
          timeAgo: formatNotificationHour(Date.now()),
          timestamp: Date.now(),
          group: "recientes",
          read: false,
          category: "pedidos",
          orderId: updatedOrder.id,
          branchId: updatedOrder.branchId,
          branchName: updatedOrder.branchName,
          operatingBranchId: updatedOrder.operatingBranchId,
          operatingBranchName: updatedOrder.operatingBranchName,
          actionLabel: "Ver Detalle",
          actionLink: "/pedidos",
        });
      } else if (updates.status === "listo") {
        recordServerRealtimeEvent("notification", {
          id: `notif-order-status-${updatedOrder.id}-listo`,
          senderName: `🎂 Producto Listo en Sucursal (${destName})`,
          senderAvatar: "🎂",
          badgeIcon: "pastel",
          title: `El producto ya está en sucursal: ${updatedOrder.orderNumber}`,
          highlightText: `${updatedOrder.customerName} • Listo en Sucursal`,
          description: `El pedido ${updatedOrder.orderNumber} de "${updatedOrder.customerName}" ha sido marcado como LISTO en sucursal para entrega en ${destName}.`,
          timeAgo: formatNotificationHour(Date.now()),
          timestamp: Date.now(),
          group: "recientes",
          read: false,
          category: "pedidos",
          orderId: updatedOrder.id,
          branchId: updatedOrder.branchId,
          branchName: updatedOrder.branchName,
          operatingBranchId: updatedOrder.operatingBranchId,
          operatingBranchName: updatedOrder.operatingBranchName,
          actionLabel: (Number(updatedOrder.remainingBalance) || 0) > 0 ? `Cobrar $${(Number(updatedOrder.remainingBalance) || 0).toFixed(2)}` : "Ver Detalle",
          actionLink: "/pedidos",
        });
      } else if (updates.status === "cancelado") {
        recordServerRealtimeEvent("notification", {
          id: `notif-order-status-${updatedOrder.id}-cancelado`,
          senderName: `🗑️ Pedido Cancelado (${destName})`,
          senderAvatar: "🗑️",
          badgeIcon: "pastel",
          title: `Pedido Cancelado: ${updatedOrder.orderNumber}`,
          highlightText: `${updatedOrder.customerName} • Cancelado`,
          description: `El pedido ${updatedOrder.orderNumber} de "${updatedOrder.customerName}" ha sido dado de baja o cancelado.`,
          timeAgo: formatNotificationHour(Date.now()),
          timestamp: Date.now(),
          group: "recientes",
          read: false,
          category: "pedidos",
          orderId: updatedOrder.id,
          branchId: updatedOrder.branchId,
          branchName: updatedOrder.branchName,
          operatingBranchId: updatedOrder.operatingBranchId,
          operatingBranchName: updatedOrder.operatingBranchName,
          actionLabel: "Ver Detalle",
          actionLink: "/pedidos",
        });
      }

      // Notificación si se registró un abono o liquidación
      if (
        updates.payments ||
        updates.deposit !== undefined ||
        updates.remainingBalance !== undefined ||
        updates.paymentStatus !== undefined
      ) {
        const remNum = Number(updatedOrder.remainingBalance) || 0;
        const isPaid = remNum === 0 || updatedOrder.paymentStatus === "liquidado";
        const lastPay = Array.isArray(updatedOrder.payments) && updatedOrder.payments.length > 0
          ? updatedOrder.payments[updatedOrder.payments.length - 1]
          : null;
        const payAmount = Number(lastPay?.amount) || Number(updates.deposit) || 0;

        recordServerRealtimeEvent("notification", {
          id: `notif-order-pay-${updatedOrder.id}-${payAmount > 0 ? payAmount : Date.now()}`,
          senderName: isPaid ? `🎂 Pedido Liquidado (${destName})` : `💰 Abono Recibido (${destName})`,
          senderAvatar: isPaid ? "🎂" : "💰",
          badgeIcon: "pastel",
          title: isPaid
            ? `Pedido Liquidado ${updatedOrder.orderNumber}: $${payAmount.toFixed(2)}`
            : `Abono de Pedido ${updatedOrder.orderNumber}: $${payAmount.toFixed(2)}`,
          highlightText: `${updatedOrder.customerName} - ${isPaid ? "100% Pagado" : `Resta: $${remNum.toFixed(2)}`}`,
          description: isCross
            ? `Se registró pago de $${payAmount.toFixed(2)} en ${destName}. Pedido originado en ${originName}. ${isPaid ? "Listo para entrega final." : `Saldo restante: $${remNum.toFixed(2)}.`}`
            : `Se registró pago de $${payAmount.toFixed(2)}. Pedido: ${updatedOrder.description || updatedOrder.orderNumber}. ${isPaid ? "Listo para entrega final." : `Saldo restante: $${remNum.toFixed(2)}.`}`,
          timeAgo: formatNotificationHour(Date.now()),
          timestamp: Date.now(),
          group: "recientes",
          read: false,
          category: "pedidos",
          orderId: updatedOrder.id,
          branchId: updatedOrder.branchId,
          branchName: updatedOrder.branchName,
          operatingBranchId: updatedOrder.operatingBranchId,
          operatingBranchName: updatedOrder.operatingBranchName,
          actionLabel: remNum > 0 ? `Cobrar $${remNum.toFixed(2)}` : "Ver Detalle",
          actionLink: "/pedidos",
        });
      }
    } catch (e) {}

    return NextResponse.json({
      success: true,
      order: currentOrders[idx],
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Error al actualizar pedido" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/orders
 * Elimina o cancela un pedido en el servidor para que desaparezca en todos los dispositivos
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("id");

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "Se requiere el parámetro ?id=" },
        { status: 400 }
      );
    }

    const currentOrders = readStoredOrders();
    const filtered = currentOrders.filter(
      (o) => o.id !== orderId && o.orderNumber !== orderId
    );

    writeStoredOrders(filtered);

    return NextResponse.json({
      success: true,
      deletedId: orderId,
      remainingCount: filtered.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Error al eliminar pedido" },
      { status: 500 }
    );
  }
}
