"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  CalendarClock,
  Calendar,
  Plus,
  Phone,
  Cake,
  Clock,
  Search,
  Filter,
  Store,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Receipt,
  Send,
  Edit3,
  Trash2,
  Sparkles,
  MapPin,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  List,
  Flame,
  ArrowUpRight,
  User,
  Check,
  Eye,
  AlertTriangle,
  Package,
  PackageCheck,
  LayoutGrid,
  Wifi,
  History,
  Archive,
  Building2,
  Lock,
  X,
  XCircle
} from "lucide-react";
import { CustomOrder } from "@/types";
import { formatCurrency, playScanBeep, formatOrderCreation, formatDeliveryDateDisplay, resolveBranchId } from "@/lib/utils";
import { useBranch } from "@/context/BranchContext";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import { realtimeHub } from "@/lib/realtime/realtimeHub";
import { createClient } from "@/lib/supabase/client";
import {
  getStoredOrders,
  saveStoredOrders,
  extractOrderFromNotification,
  syncOrdersWithServer,
  updateOrderStatus,
  deleteCustomOrder,
  extractOrderOriginAndNotes
} from "@/lib/orders";

import CreateOrderModal from "@/components/pedidos/CreateOrderModal";
import OrderPaymentModal from "@/components/pedidos/OrderPaymentModal";
import OrderReceiptModal from "@/components/pedidos/OrderReceiptModal";
import EditOrderModal from "@/components/pedidos/EditOrderModal";
import OrderDetailModal from "@/components/pedidos/OrderDetailModal";
import OrderHistoryDashboardModal from "@/components/pedidos/OrderHistoryDashboardModal";
import DeliverOrderConfirmModal from "@/components/pedidos/DeliverOrderConfirmModal";

// Helper functions for date and time calculations in local timezone
const getLocalDateISO = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const normalizeDateStr = (dateStr?: string): string => {
  if (!dateStr) return "";
  return dateStr.split("T")[0].split(" ")[0].trim();
};

const parseTimeToMinutes = (timeStr?: string): number | null => {
  if (!timeStr) return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  return h * 60 + m;
};

export type TimePeriodFilter = "todos" | "dia" | "semana" | "mes" | "ano";

export type OrderClassificationKey =
  | "all"
  | "activos"
  | "hoy"
  | "pendientes"
  | "por_pagar"
  | "pagados"
  | "no_llevados"
  | "no_pasaron"
  | "proximos"
  | "entregados"
  | "historial";

export default function PedidosPage() {
  const { branches, currentBranch, isAllBranches } = useBranch();
  const { user } = useAuth();
  const { addNotification, notifications } = useNotifications();

  // Control de roles y asignación de sucursal:
  // Administradores: control y visualización total multi-sucursal ("all" y cualquier tienda sin excepciones)
  // Perfiles de sucursal: estrictamente los pedidos de su sucursal asignada
  const isAdmin = Boolean(
    !user || // Asumir vista de administrador por defecto si aún no carga o sin usuario específico
    user.role === "admin" ||
    user.role === "administrador" ||
    user.role === "auxiliar_admin" ||
    user.role === "auxiliar_administrativo" ||
    user.role === "dueño" ||
    user.role === "dueno" ||
    user.role === "gerente" ||
    user.id === "usr-1" ||
    user.id === "usr-2" ||
    user.username === "admin" ||
    user.username === "paulina" ||
    (user.name && user.name.toLowerCase().includes("paulina")) ||
    (user.name && (user.name.toLowerCase().includes("toño") || user.name.toLowerCase().includes("tono")))
  );
  const canFilterBranches = isAdmin;
  const userBranchId = (
    user?.assignedBranchId ||
    resolveBranchId(currentBranch?.id, user?.name || user?.username) ||
    branches[0]?.id ||
    "branch-matriz"
  ).trim();
  const userBranch = branches.find((b) => b.id === userBranchId) || currentBranch || branches[0];

  // State: Default view is "productos" en formato "lista" compacta y ordenada
  const [orders, setOrders] = useState<CustomOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>(() => (canFilterBranches ? "all" : userBranchId));

  // Filtro efectivo de sucursal: para personal de sucursal SIEMPRE es su userBranchId;
  // para administradores por defecto SIEMPRE es "all" para ver todos los pedidos sin excepciones
  const effectiveBranchFilter = useMemo(() => {
    if (!canFilterBranches) return userBranchId;
    return selectedBranchFilter || "all";
  }, [canFilterBranches, selectedBranchFilter, userBranchId]);

  const [classificationFilter, setClassificationFilter] = useState<OrderClassificationKey>("all");
  const [historialSubFilter, setHistorialSubFilter] = useState<"todos" | "entregados" | "cancelados">("todos");
  const [pagadosSubFilter, setPagadosSubFilter] = useState<"todos" | "pendientes" | "listos">("todos");
  const [timePeriodFilter, setTimePeriodFilter] = useState<TimePeriodFilter>("todos");
  const [customSelectedDate, setCustomSelectedDate] = useState<string>(() => getLocalDateISO(new Date()));
  const [customSelectedMonth, setCustomSelectedMonth] = useState<string>(() => getLocalDateISO(new Date()).slice(0, 7));
  const [customSelectedYear, setCustomSelectedYear] = useState<string>(() => getLocalDateISO(new Date()).slice(0, 4));
  const [isClassificationOpen, setIsClassificationOpen] = useState(true);
  const [viewMode, setViewMode] = useState<"productos" | "tabla">("productos");
  const [productLayout, setProductLayout] = useState<"lista" | "cuadricula">("lista");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  // Ref para el contenedor de desplazamiento independiente del catálogo
  const catalogScrollRef = useRef<HTMLDivElement>(null);
  const catalogSectionRef = useRef<HTMLDivElement>(null);
  const topBranchSelectRef = useRef<HTMLSelectElement>(null);
  const [showKpiSummary, setShowKpiSummary] = useState(true);

  // Expanded rows in list view
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Estados de expansión de productos por pedido (máximo 2 productos visibles por defecto y desplegables con "ver más")
  const [expandedProductsOrderIds, setExpandedProductsOrderIds] = useState<Record<string, boolean>>({});

  const toggleOrderProductsExpanded = (orderId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedProductsOrderIds((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  // Modals state
  const [readyNotificationOrder, setReadyNotificationOrder] = useState<CustomOrder | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<CustomOrder | null>(null);
  const [selectedOrderForReceipt, setSelectedOrderForReceipt] = useState<CustomOrder | null>(null);
  const [selectedOrderForEdit, setSelectedOrderForEdit] = useState<CustomOrder | null>(null);
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<CustomOrder | null>(null);
  const [orderToDeliver, setOrderToDeliver] = useState<CustomOrder | null>(null);
  const [isHistoryDashboardOpen, setIsHistoryDashboardOpen] = useState(false);
  const [historyDashboardTab, setHistoryDashboardTab] = useState<"todos" | "entregados" | "cancelados">("todos");

  // Cargar pedidos desde almacenamiento local y asegurar vinculación 100% con notificaciones
  const loadOrders = useCallback(() => {
    const stored = getStoredOrders();
    // Vinculación y reconciliación garantizada:
    // Revisar si existen notificaciones de pedidos en el contexto o localStorage que falten en la lista
    try {
      const currentOrders = [...stored];
      let hasChanges = false;
      const notifsToCheck = Array.isArray(notifications) && notifications.length > 0 ? notifications : [];
      for (const notif of notifsToCheck) {
        const isPedido =
          notif.category === "pedidos" ||
          Boolean(notif.orderId) ||
          (notif.title && notif.title.toLowerCase().includes("ped-")) ||
          (notif.title && notif.title.toLowerCase().includes("pedido"));

        if (isPedido) {
          const alreadyExists = currentOrders.some(
            (o) =>
              (notif.orderId && (o.id === notif.orderId || o.orderNumber === notif.orderId)) ||
              (notif.title && o.orderNumber && notif.title.includes(o.orderNumber))
          );
          if (!alreadyExists) {
            const recovered = extractOrderFromNotification(notif);
            if (recovered && !currentOrders.some((o) => o.id === recovered.id || o.orderNumber === recovered.orderNumber)) {
              currentOrders.unshift(recovered);
              hasChanges = true;
            }
          }
        }
      }
      if (hasChanges) {
        saveStoredOrders(currentOrders);
        setOrders(currentOrders);
        return;
      }
    } catch (e) {
      console.warn("Error en reconciliación loadOrders:", e);
    }
    setOrders(stored);
  }, [notifications]);

  // Cerrar modal de confirmación de "Listo en sucursal" con tecla Escape o Enter
  useEffect(() => {
    if (!readyNotificationOrder) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") {
        setReadyNotificationOrder(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [readyNotificationOrder]);

  useEffect(() => {
    loadOrders();

    const doSync = () => {
      syncOrdersWithServer()
        .then((synced) => {
          setOrders(synced);
        })
        .catch((err) => console.error("Error sincronizando pedidos:", err));
    };

    // 1. Sincronización inicial bidireccional automática con Supabase y servidor
    doSync();

    // 2. Suscripción en tiempo real instantánea a Supabase Postgres Changes para pedidos
    let supabaseChannel: any = null;
    try {
      const supabase = createClient();
      supabaseChannel = supabase
        .channel("pedidos_page_supabase_realtime")
        .on("postgres_changes", { event: "*", schema: "public", table: "custom_orders" }, () => {
          doSync();
        })
        .subscribe();
    } catch (e) {
      console.warn("Could not subscribe to custom_orders realtime:", e);
    }

    // 3. Heartbeat de respaldo cada 3 segundos para sincronización garantizada
    const pollInterval = setInterval(() => {
      doSync();
    }, 3000);

    // 4. Escuchar cambios locales y foco de ventana
    const handleUpdate = () => loadOrders();
    window.addEventListener("brito_orders_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    window.addEventListener("focus", doSync);

    // Revisar si viene de URL ?filter=cancelados o ?filter=bajas para mandar directo al historial
    try {
      const params = new URLSearchParams(window.location.search);
      const filterParam = params.get("filter") || params.get("tab") || params.get("subfilter");
      if (filterParam === "cancelados" || filterParam === "bajas") {
        setClassificationFilter("historial");
        setHistorialSubFilter("cancelados");
        setTimeout(() => scrollToCatalog(), 200);
      } else if (filterParam === "entregados") {
        setClassificationFilter("historial");
        setHistorialSubFilter("entregados");
        setTimeout(() => scrollToCatalog(), 200);
      }
    } catch (e) {}

    // 5. Escuchar pedidos y actualizaciones transmitidos en tiempo real por WebSocket
    const unsubOrder = realtimeHub?.onOrder ? realtimeHub.onOrder(() => {
      loadOrders();
      doSync();
    }) : undefined;

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener("brito_orders_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("focus", doSync);
      if (unsubOrder) unsubOrder();
      if (supabaseChannel) {
        try {
          const supabase = createClient();
          supabase.removeChannel(supabaseChannel);
        } catch {}
      }
    };
  }, []);

  // Sincronización de sucursal:
  // Para perfiles de administrador: deben ver todos los pedidos que levanten todas las sucursales sin excepciones ("all").
  // Si el usuario explícitamente elige una tienda en el selector interno de pedidos, se respeta;
  // pero jamás se sobreescribe automáticamente forzando a una sola tienda individual.
  // Para cajeros y perfiles operativos: anclados a su sucursal asignada.
  useEffect(() => {
    if (!canFilterBranches) {
      setSelectedBranchFilter(userBranchId);
      return;
    }
  }, [canFilterBranches, userBranchId]);

  // Local minute clock (for checking if delivery time has passed today)
  const [currentMinutes, setCurrentMinutes] = useState<number>(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentMinutes(now.getHours() * 60 + now.getMinutes());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Today and Tomorrow strings in YYYY-MM-DD (local timezone)
  const todayStr = useMemo(() => getLocalDateISO(new Date()), []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return getLocalDateISO(d);
  }, []);

  // Time period boundaries (Semana, Mes, Año)
  const { startOfWeekStr, endOfWeekStr, formattedWeekRange } = useMemo(() => {
    const now = new Date();
    const dayOfWeek = (now.getDay() + 6) % 7; // Monday = 0
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
    const startStr = getLocalDateISO(start);
    const endStr = getLocalDateISO(end);
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const formatted = `${start.getDate()} ${months[start.getMonth()]} - ${end.getDate()} ${months[end.getMonth()]} ${end.getFullYear()}`;
    return {
      startOfWeekStr: startStr,
      endOfWeekStr: endStr,
      formattedWeekRange: formatted,
    };
  }, []);

  const availableYears = useMemo(() => {
    const curYear = new Date().getFullYear();
    return [curYear - 1, curYear, curYear + 1].map(String);
  }, []);

  const formattedMonthLabel = useMemo(() => {
    if (!customSelectedMonth) return "";
    const [year, month] = customSelectedMonth.split("-");
    const monthNames = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    const mIdx = parseInt(month, 10) - 1;
    return `${monthNames[mIdx] || month} ${year}`;
  }, [customSelectedMonth]);

  const formattedDayLabel = useMemo(() => {
    if (!customSelectedDate) return "";
    const [y, m, d] = customSelectedDate.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const isToday = customSelectedDate === todayStr;
    const isTomorrow = customSelectedDate === tomorrowStr;
    const prefix = isToday ? "Hoy • " : isTomorrow ? "Mañana • " : "";
    return `${prefix}${days[dt.getDay()]} ${dt.getDate()} ${months[dt.getMonth()]} ${dt.getFullYear()}`;
  }, [customSelectedDate, todayStr, tomorrowStr]);

  const handlePrevDay = () => {
    if (!customSelectedDate) return;
    const [y, m, d] = customSelectedDate.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() - 1);
    setCustomSelectedDate(getLocalDateISO(dt));
  };

  const handleNextDay = () => {
    if (!customSelectedDate) return;
    const [y, m, d] = customSelectedDate.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + 1);
    setCustomSelectedDate(getLocalDateISO(dt));
  };

  // Classification checkers for any order
  const checkIsOverdue = (order: CustomOrder): boolean => {
    if (order.status === "entregado" || order.status === "cancelado") return false;
    const orderDate = normalizeDateStr(order.deliveryDate);
    if (!orderDate) return false;
    // Date was before today
    if (orderDate < todayStr) return true;
    // Date is today and time has passed
    if (orderDate === todayStr) {
      const orderMin = parseTimeToMinutes(order.deliveryTime);
      if (orderMin !== null) {
        return currentMinutes > orderMin;
      }
    }
    return false;
  };

  const checkIsUpcoming = (order: CustomOrder): boolean => {
    if (order.status === "entregado" || order.status === "cancelado") return false;
    const orderDate = normalizeDateStr(order.deliveryDate);
    if (orderDate !== todayStr) return false;
    return !checkIsOverdue(order);
  };

  const checkIsPending = (order: CustomOrder): boolean => {
    return order.status === "pendiente" || order.status === "en_horno";
  };

  const checkIsUnpaid = (order: CustomOrder): boolean => {
    return (order.remainingBalance || 0) > 0 && order.status !== "cancelado" && order.status !== "entregado";
  };

  const checkIsPaid = (order: CustomOrder): boolean => {
    if (order.status === "cancelado" || order.status === "entregado") return false;
    const rem = order.remainingBalance !== undefined ? order.remainingBalance : Math.max(0, (order.total || 0) - (order.deposit || 0));
    return rem <= 0;
  };

  const checkIsReadyNotDelivered = (order: CustomOrder): boolean => {
    return order.status === "listo";
  };

  const checkIsDelivered = (order: CustomOrder): boolean => {
    return order.status === "entregado";
  };

  const stripAccents = useCallback((str?: string): string => {
    return (str || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }, []);

  const getBranchKeywords = useCallback((str?: string): string[] => {
    const s = (str || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
    const keywords: string[] = [];
    if (s.includes("angeles") || s.includes("ángeles") || s.includes("suc-les")) {
      keywords.push("angeles");
    }
    if (s.includes("ildefonso") || s.includes("1790889237862") || s.includes("ilf-04")) {
      keywords.push("ildefonso");
    }
    if (s.includes("benito") || s.includes("ben-02") || s.includes("mercado")) {
      keywords.push("benito");
    }
    if (s.includes("flores") || s.includes("flo-03") || s.includes("plaza")) {
      keywords.push("flores");
    }
    if (s.includes("sanjuan") || s.includes("san juan") || s.includes("sju-02")) {
      keywords.push("sanjuan");
      keywords.push("san juan");
    }
    if (s.includes("matriz") || s.includes("centro") || s.includes("mat-01")) {
      keywords.push("matriz");
      keywords.push("centro");
    }
    return keywords;
  }, []);

  const checkOrderMatchesBranch = useCallback(
    (order: CustomOrder, filter: string) => {
      if (!filter || filter === "all") return true;
      const f = stripAccents(filter);

      // Filtro especial para ver todos los pedidos inter-sucursales
      if (f === "inter_sucursal" || f === "foraneos") {
        const pId = stripAccents(order.branchId);
        const opId = stripAccents(order.operatingBranchId);
        return Boolean(
          (pId && opId && pId !== opId) ||
          (order.operatingBranchName &&
            order.branchName &&
            stripAccents(order.operatingBranchName) !== stripAccents(order.branchName))
        );
      }

      const targetBranch = branches.find(
        (b) => stripAccents(b.id) === f || stripAccents(b.name) === f
      );
      const targetId = targetBranch ? stripAccents(targetBranch.id) : f;
      const targetName = targetBranch ? stripAccents(targetBranch.name) : f;
      const targetKeywords = [...getBranchKeywords(targetId), ...getBranchKeywords(targetName)];

      const pId = stripAccents(order.branchId);
      const pName = stripAccents(order.branchName);
      const opId = stripAccents((order as any).operatingBranchId);
      const opName = stripAccents((order as any).operatingBranchName);

      const pickupKeywords = [...getBranchKeywords(pId), ...getBranchKeywords(pName)];
      const operatingKeywords = [...getBranchKeywords(opId), ...getBranchKeywords(opName)];

      // 1. Coincidencia con sucursal de entrega/recogida
      const matchesPickup =
        (pId && (pId === targetId || pId.includes(targetId) || targetId.includes(pId))) ||
        (pName && (pName === targetName || pName.includes(targetName) || targetName.includes(pName))) ||
        (targetKeywords.length > 0 && pickupKeywords.some((k) => targetKeywords.includes(k)));

      // 2. Coincidencia con sucursal de origen/donde se levantó (incluyendo notas con metadatos [Origen: ...])
      const rawNotes = order.notes || "";
      const originMatch = rawNotes.match(/\[Origen:\s*([^\|\]]+)(?:\|([^\]]+))?\]/);
      const originMetaId = stripAccents(originMatch ? originMatch[1] : "");
      const originMetaKeywords = getBranchKeywords(originMetaId);
      const matchesOriginMeta =
        (originMetaId && (originMetaId === targetId || originMetaId.includes(targetId) || targetId.includes(originMetaId))) ||
        (targetKeywords.length > 0 && originMetaKeywords.some((k) => targetKeywords.includes(k)));

      const matchesOperating =
        (opId && (opId === targetId || opId.includes(targetId) || targetId.includes(opId))) ||
        (opName && (opName === targetName || opName.includes(targetName) || targetName.includes(opName))) ||
        (targetKeywords.length > 0 && operatingKeywords.some((k) => targetKeywords.includes(k))) ||
        matchesOriginMeta;

      if (matchesPickup || matchesOperating) return true;

      // 3. Coincidencia por cajero asignado a la sucursal que registró el pedido
      if (order.cashier) {
        const cashierBranch = stripAccents(resolveBranchId(undefined, order.cashier));
        const cashierKeywords = getBranchKeywords(cashierBranch);
        if (
          cashierBranch === targetId ||
          (targetKeywords.length > 0 && cashierKeywords.some((k) => targetKeywords.includes(k)))
        ) {
          return true;
        }
      }

      // 4. Coincidencia por cobros o abonos recibidos por personal de esta sucursal
      if (Array.isArray(order.payments) && order.payments.length > 0) {
        for (const p of order.payments) {
          if (p.cashier) {
            const payBranch = stripAccents(resolveBranchId(undefined, p.cashier));
            const payKeywords = getBranchKeywords(payBranch);
            if (
              payBranch === targetId ||
              (targetKeywords.length > 0 && payKeywords.some((k) => targetKeywords.includes(k)))
            ) {
              return true;
            }
          }
        }
      }

      // 5. Coincidencia con menciones de ruta o sucursal en notas o descripción (ej: "San Benito ➔ San Juan")
      const textToSearch = `${rawNotes} ${order.description || ""}`.toLowerCase();
      if (targetKeywords.length > 0 && targetKeywords.some((k) => textToSearch.includes(k))) {
        return true;
      }

      // 6. Coincidencia por sucursal o cajero que dio de baja / canceló el pedido
      const bajaPorMatch = rawNotes.match(/\[BajaPor:\s*([^\|\]]+)(?:\|([^\]]+))?\]/i);
      if (bajaPorMatch) {
        const bajaBranch = stripAccents(bajaPorMatch[1]);
        const bajaCashier = stripAccents(bajaPorMatch[2] || "");
        const bajaKeywords = [...getBranchKeywords(bajaBranch), ...getBranchKeywords(bajaCashier)];
        if (
          bajaBranch === targetId ||
          (targetKeywords.length > 0 && bajaKeywords.some((k) => targetKeywords.includes(k)))
        ) {
          return true;
        }
      }

      const bajaMatch = rawNotes.match(/\[Baja:\s*([^\]]+)\]/i);
      if (bajaMatch) {
        const bajaText = stripAccents(bajaMatch[1]);
        if (targetKeywords.length > 0 && targetKeywords.some((k) => bajaText.includes(k))) {
          return true;
        }
      }

      if (targetId === "branch-sanjuan" && (textToSearch.includes("noe") || textToSearch.includes("velasquez") || textToSearch.includes("velazquez"))) {
        return true;
      }

      return false;
    },
    [branches, getBranchKeywords, stripAccents]
  );

// Classification counts for the current branch view
  const classificationCounts = useMemo(() => {
    const branchFiltered = orders.filter((o) => checkOrderMatchesBranch(o, effectiveBranchFilter));

    let activos = 0;
    let hoy = 0;
    let pendientes = 0;
    let porPagar = 0;
    let pagados = 0;
    let pagadosListos = 0;
    let pagadosPendientes = 0;
    let noLlevados = 0;
    let noPasaron = 0;
    let proximos = 0;
    let entregados = 0;
    let cancelados = 0;
    let historial = 0;

    for (const o of branchFiltered) {
      const oDate = normalizeDateStr(o.deliveryDate);
      if (o.status !== "entregado" && o.status !== "cancelado") activos++;
      if (oDate === todayStr && o.status !== "cancelado" && o.status !== "entregado") hoy++;
      if (checkIsPending(o)) pendientes++;
      if (checkIsUnpaid(o)) porPagar++;
      if (checkIsPaid(o)) {
        pagados++;
        if (o.status === "listo") {
          pagadosListos++;
        } else {
          pagadosPendientes++;
        }
      }
      if (checkIsReadyNotDelivered(o)) noLlevados++;
      if (checkIsOverdue(o)) noPasaron++;
      if (checkIsUpcoming(o)) proximos++;
      if (o.status === "entregado") entregados++;
      if (o.status === "cancelado") cancelados++;
      if (o.status === "entregado" || o.status === "cancelado") historial++;
    }

    return {
      all: activos,
      activos,
      hoy,
      pendientes,
      por_pagar: porPagar,
      pagados,
      pagados_listos: pagadosListos,
      pagados_pendientes: pagadosPendientes,
      no_llevados: noLlevados,
      no_pasaron: noPasaron,
      proximos,
      entregados,
      cancelados,
      historial,
    };
  }, [orders, effectiveBranchFilter, todayStr, currentMinutes, checkOrderMatchesBranch]);

  // Time period counts (Día, Semana, Mes, Año, Todos) para la sucursal actual
  const timePeriodCounts = useMemo(() => {
    const branchFiltered = orders.filter((o) => checkOrderMatchesBranch(o, effectiveBranchFilter));

    const baseOrders = branchFiltered.filter((o) => {
      if (classificationFilter === "historial") {
        if (historialSubFilter === "entregados") return o.status === "entregado";
        if (historialSubFilter === "cancelados") return o.status === "cancelado";
        return o.status === "entregado" || o.status === "cancelado";
      }
      return o.status !== "entregado" && o.status !== "cancelado";
    });

    let todos = baseOrders.length;
    let dia = 0;
    let semana = 0;
    let mes = 0;
    let ano = 0;

    for (const o of baseOrders) {
      const oDate = normalizeDateStr(o.deliveryDate) || (o.createdAt ? normalizeDateStr(o.createdAt) : "");
      if (!oDate) continue;
      if (oDate === customSelectedDate) dia++;
      if (oDate >= startOfWeekStr && oDate <= endOfWeekStr) semana++;
      if (oDate.startsWith(customSelectedMonth)) mes++;
      if (oDate.startsWith(customSelectedYear)) ano++;
    }

    return {
      todos,
      dia,
      semana,
      mes,
      ano,
    };
  }, [
    orders,
    effectiveBranchFilter,
    classificationFilter,
    historialSubFilter,
    customSelectedDate,
    startOfWeekStr,
    endOfWeekStr,
    customSelectedMonth,
    customSelectedYear,
    checkOrderMatchesBranch,
  ]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    const hasSearch = searchQuery.trim().length > 0;
    const q = stripAccents(searchQuery);

    return orders.filter((order) => {

      // 1. Si el usuario escribe una búsqueda (folio PED-..., cliente, teléfono),
      // buscar a nivel GLOBAL en TODOS los pedidos para que el cajero pueda encontrarlo al instante
      if (!hasSearch && !checkOrderMatchesBranch(order, effectiveBranchFilter)) {
        return false;
      }

      // Filtrado según vista activa vs historial
      if (classificationFilter === "historial") {
        if (historialSubFilter === "entregados") {
          if (order.status !== "entregado") return false;
        } else if (historialSubFilter === "cancelados") {
          if (order.status !== "cancelado") return false;
        } else {
          // Si historialSubFilter === "todos", mostrar concluidos (entregados y cancelados)
          if (order.status !== "entregado" && order.status !== "cancelado") return false;
        }
      } else if (classificationFilter === "entregados") {
        if (order.status !== "entregado") return false;
      } else {
        // En todas las vistas de trabajo activo ('all' / Todos, 'hoy', 'por_pagar', 'pagados', 'no_llevados', etc.):
        // Alojar ÚNICAMENTE pedidos pendientes por entregar (por cobrar, por recoger, en horno, listos, etc.).
        // Los pedidos entregados se alojan exclusivamente en el botón "Pedidos entregados con éxito".
        // Los pedidos cancelados se alojan exclusivamente en "Productos que se dieron de baja".
        if (order.status === "entregado" || order.status === "cancelado") {
          return false;
        }
      }

      const orderDate = normalizeDateStr(order.deliveryDate) || (order.createdAt ? normalizeDateStr(order.createdAt) : "");

      // Classification Filter (Botones principales con emoticones y cuadros KPI)
      if (classificationFilter === "hoy" && orderDate !== todayStr) {
        return false;
      }
      if (classificationFilter === "pendientes" && !checkIsPending(order)) return false;
      if (classificationFilter === "pagados") {
        if (!checkIsPaid(order)) return false;
        if (pagadosSubFilter === "pendientes" && order.status === "listo") return false;
        if (pagadosSubFilter === "listos" && order.status !== "listo") return false;
      }
      if (classificationFilter === "no_llevados" && !checkIsReadyNotDelivered(order)) return false;
      if (classificationFilter === "no_pasaron" && !checkIsOverdue(order)) return false;
      if (classificationFilter === "proximos" && !checkIsUpcoming(order)) return false;

      // Time Period Filter: día, semana, mes, año, todos
      if (timePeriodFilter !== "todos") {
        if (!orderDate) return false;
        if (timePeriodFilter === "dia" && orderDate !== customSelectedDate) return false;
        if (timePeriodFilter === "semana" && (orderDate < startOfWeekStr || orderDate > endOfWeekStr)) return false;
        if (timePeriodFilter === "mes" && !orderDate.startsWith(customSelectedMonth)) return false;
        if (timePeriodFilter === "ano" && !orderDate.startsWith(customSelectedYear)) return false;
      }

      // Status filter (solo aplica si clasificación es "all")
      if (classificationFilter === "all" && statusFilter !== "all" && order.status !== statusFilter) {
        return false;
      }

      // Payment filter (aplica en vista "all" o "historial")
      if (classificationFilter === "all" || classificationFilter === "historial") {
        if (paymentFilter === "pendientes" && order.remainingBalance <= 0) {
          return false;
        }
        if (paymentFilter === "liquidados" && order.remainingBalance > 0) {
          return false;
        }
      }

      // Date filter (solo aplica si clasificación es "all")
      if (classificationFilter === "all") {
        if (dateFilter === "hoy" && orderDate !== todayStr) {
          return false;
        }
        if (dateFilter === "manana" && orderDate !== tomorrowStr) {
          return false;
        }
        if (dateFilter === "semana") {
          const orderD = new Date(order.deliveryDate);
          const nowD = new Date();
          const diffDays = (orderD.getTime() - nowD.getTime()) / (1000 * 60 * 60 * 24);
          if (diffDays < -1 || diffDays > 7) return false;
        }
      }

      // Search query (busca en folio, cliente, teléfono, descripción, notas, dedicatoria y sucursal)
      if (hasSearch) {
        const matchNumber = stripAccents(order.orderNumber).includes(q) || stripAccents(order.id).includes(q);
        const matchCustomer = stripAccents(order.customerName).includes(q);
        const matchPhone = (order.phone || "").replace(/\D/g, "").includes(q.replace(/\D/g, ""));
        const matchDesc = stripAccents(order.description).includes(q);
        const matchDedication = stripAccents(order.dedication).includes(q);
        const matchNotes = stripAccents(order.notes).includes(q);
        const matchBranch = stripAccents(order.branchName).includes(q) || stripAccents((order as any).operatingBranchName).includes(q);
        if (!matchNumber && !matchCustomer && !matchPhone && !matchDesc && !matchDedication && !matchNotes && !matchBranch) {
          return false;
        }
      }

      return true;
    });
  }, [
    orders,
    searchQuery,
    stripAccents,
    effectiveBranchFilter,
    classificationFilter,
    historialSubFilter,
    pagadosSubFilter,
    statusFilter,
    paymentFilter,
    dateFilter,
    timePeriodFilter,
    customSelectedDate,
    customSelectedMonth,
    customSelectedYear,
    startOfWeekStr,
    endOfWeekStr,
    todayStr,
    tomorrowStr,
    currentMinutes,
    checkOrderMatchesBranch,
  ]);

  // Metrics (reactivos a la sucursal seleccionada para coincidir con los pedidos)
  const metrics = useMemo(() => {
    const branchFiltered = orders.filter((o) => {
      if (effectiveBranchFilter !== "all") {
        return checkOrderMatchesBranch(o, effectiveBranchFilter);
      }
      return true;
    });

    const activeOrders = branchFiltered.filter((o) => o.status !== "entregado" && o.status !== "cancelado");
    const todayOrders = branchFiltered.filter((o) => {
      const oDate = normalizeDateStr(o.deliveryDate);
      return oDate === todayStr && o.status !== "cancelado" && o.status !== "entregado";
    });
    const totalRemaining = activeOrders.reduce((sum, o) => sum + (o.remainingBalance || 0), 0);
    const readyOrders = branchFiltered.filter((o) => o.status === "listo");

    return {
      activeCount: activeOrders.length,
      todayCount: todayOrders.length,
      totalRemainingBalance: totalRemaining,
      readyCount: readyOrders.length,
    };
  }, [orders, effectiveBranchFilter, todayStr, checkOrderMatchesBranch]);

  // Desglose de sumas por sucursal (para que las sumas de pedidos estén separadas por tienda y no revueltas)
  const branchOrdersBreakdown = useMemo(() => {
    // Pedidos base según el filtro de clasificación/historial activo
    const baseOrders = orders.filter((o) => {
      if (classificationFilter === "historial") {
        if (historialSubFilter === "entregados") return o.status === "entregado";
        if (historialSubFilter === "cancelados") return o.status === "cancelado";
        return o.status === "entregado" || o.status === "cancelado";
      }
      return o.status !== "entregado" && o.status !== "cancelado";
    });

    // Permitir ver los totales por sucursal para coordinar pedidos inter-sucursales
    const userScopedOrders = baseOrders;

    // Filtro por período de tiempo (Día, Semana, Mes, Año, Todos)
    const periodOrders = userScopedOrders.filter((order) => {
      const orderDate = normalizeDateStr(order.deliveryDate) || (order.createdAt ? normalizeDateStr(order.createdAt) : "");
      if (timePeriodFilter !== "todos") {
        if (!orderDate) return false;
        if (timePeriodFilter === "dia" && orderDate !== customSelectedDate) return false;
        if (timePeriodFilter === "semana" && (orderDate < startOfWeekStr || orderDate > endOfWeekStr)) return false;
        if (timePeriodFilter === "mes" && !orderDate.startsWith(customSelectedMonth)) return false;
        if (timePeriodFilter === "ano" && !orderDate.startsWith(customSelectedYear)) return false;
      }
      return true;
    });

    // Mapear cada sucursal
    const branchMap = new Map<string, {
      branchId: string;
      branchName: string;
      shortName: string;
      code: string;
      totalOrders: number;
      totalAmount: number;
      totalDeposits: number;
      totalRemaining: number;
      todayCount: number;
      readyCount: number;
      unpaidCount: number;
    }>();

    const visibleBranches = branches;

    visibleBranches.forEach((b) => {
      branchMap.set(b.id, {
        branchId: b.id,
        branchName: b.name,
        shortName: b.shortName || b.name.replace("Sucursal ", ""),
        code: b.code || "",
        totalOrders: 0,
        totalAmount: 0,
        totalDeposits: 0,
        totalRemaining: 0,
        todayCount: 0,
        readyCount: 0,
        unpaidCount: 0,
      });
    });

    visibleBranches.forEach((b) => {
      const bOrders = periodOrders.filter((o) => checkOrderMatchesBranch(o, b.id));
      const totalAmount = bOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
      const totalDeposits = bOrders.reduce((sum, o) => sum + (Number(o.deposit) || 0), 0);
      const totalRemaining = bOrders.reduce((sum, o) => {
        const rem = o.remainingBalance !== undefined ? o.remainingBalance : Math.max(0, (o.total || 0) - (o.deposit || 0));
        return sum + Number(rem);
      }, 0);
      const todayCount = bOrders.filter((o) => normalizeDateStr(o.deliveryDate) === todayStr).length;
      const readyCount = bOrders.filter((o) => o.status === "listo").length;
      const unpaidCount = bOrders.filter((o) => {
        const rem = o.remainingBalance !== undefined ? o.remainingBalance : Math.max(0, (o.total || 0) - (o.deposit || 0));
        return rem > 0;
      }).length;

      branchMap.set(b.id, {
        branchId: b.id,
        branchName: b.name,
        shortName: b.shortName || b.name.replace("Sucursal ", ""),
        code: b.code || "",
        totalOrders: bOrders.length,
        totalAmount,
        totalDeposits,
        totalRemaining,
        todayCount,
        readyCount,
        unpaidCount,
      });
    });

    const list = Array.from(branchMap.values());
    const grandTotalOrders = periodOrders.length;
    const grandTotalAmount = list.reduce((sum, b) => sum + b.totalAmount, 0);
    const grandTotalDeposits = list.reduce((sum, b) => sum + b.totalDeposits, 0);
    const grandTotalRemaining = list.reduce((sum, b) => sum + b.totalRemaining, 0);

    return {
      branches: list,
      grandTotalOrders,
      grandTotalAmount,
      grandTotalDeposits,
      grandTotalRemaining,
    };
  }, [
    orders,
    branches,
    isAdmin,
    userBranchId,
    checkOrderMatchesBranch,
    classificationFilter,
    historialSubFilter,
    timePeriodFilter,
    customSelectedDate,
    customSelectedMonth,
    customSelectedYear,
    startOfWeekStr,
    endOfWeekStr,
    todayStr,
  ]);





  // Desplazamiento inteligente para llevar directamente a la lista de pedidos al tocar cualquier cuadro
  const scrollToCatalog = () => {
    setTimeout(() => {
      const target = document.getElementById("catalog-results-section");
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      const mainEl = document.querySelector("main");
      if (mainEl && target) {
        const rect = target.getBoundingClientRect();
        const mainRect = mainEl.getBoundingClientRect();
        const targetTop = rect.top - mainRect.top + mainEl.scrollTop;
        mainEl.scrollTo({ top: Math.max(0, targetTop - 6), behavior: "smooth" });
      }
    }, 60);
  };

  // Handler para la clasificación por período de tiempo (Día, Semana, Mes, Año, Todos)
  const handleSelectTimePeriod = (period: TimePeriodFilter) => {
    setTimePeriodFilter(period);
    if (period === "dia") {
      setCustomSelectedDate(todayStr);
    }
    // Si el usuario tenía "hoy" en la clasificación general y cambia a semana, mes o año,
    // restablecemos classificationFilter a "all" para que vea el universo de ese período
    if (classificationFilter === "hoy" && period !== "dia") {
      setClassificationFilter("all");
    }
    scrollToCatalog();
  };

  // Handler para los 4 cuadros KPI principales: activa el filtro y lleva directamente a ver los pedidos correspondientes
  const handleSelectKPICard = (key: OrderClassificationKey) => {
    setClassificationFilter((prev) => (prev === key ? "all" : key));
    setPagadosSubFilter("todos");
    setHistorialSubFilter("todos");
    setSearchQuery("");
    if (dateFilter !== "all") setDateFilter("all");
    if (paymentFilter !== "all") setPaymentFilter("all");
    if (statusFilter !== "all") setStatusFilter("all");
    setIsClassificationOpen(true);
  };

  // Handler que activa la clasificación y filtra en su lugar sin sacudidas de pantalla
  const handleSelectClassificationCard = (key: OrderClassificationKey) => {
    setPagadosSubFilter("todos");
    setHistorialSubFilter("todos");
    if (key === "all") {
      setClassificationFilter("all");
      setStatusFilter("all");
      setPaymentFilter("all");
      setDateFilter("all");
      return;
    }
    if (key === "hoy") {
      setTimePeriodFilter("dia");
      setCustomSelectedDate(todayStr);
    }
    if (key === "historial" || key === "entregados") {
      setHistoryDashboardTab(key === "entregados" ? "entregados" : "cancelados");
      setIsHistoryDashboardOpen(true);
      return;
    }
    setClassificationFilter((prev) => (prev === key ? "all" : key));
  };

  // Handlers for quick actions
  const handleMarkAsReady = (order: CustomOrder) => {
    if (order.status === "entregado" || order.status === "cancelado") {
      alert("Este pedido pertenece al historial y no puede ser modificado.");
      return;
    }
    const updatedOrd = updateOrderStatus(order.id, "listo") || { ...order, status: "listo" as const };
    loadOrders();
    setReadyNotificationOrder(updatedOrd);
    try {
      playScanBeep(true);
    } catch (e) {}
    const totalNum = Number(updatedOrd.total) || 0;
    const baseItemsDesc = updatedOrd.description ? `${updatedOrd.description}. ` : "";
    addNotification({
      id: `notif-order-${updatedOrd.id}`,
      title: `El producto ya está en sucursal: ${updatedOrd.orderNumber}${totalNum ? ` • Total $${totalNum.toFixed(2)}` : ""}`,
      description: `${baseItemsDesc}El pedido ${updatedOrd.orderNumber} de "${updatedOrd.customerName}" ha sido marcado como LISTO en sucursal.`,
      senderName: `🎂 Listo en Sucursal (${updatedOrd.branchName || "Sucursal"})`,
      senderAvatar: "🎂",
      highlightText: `${updatedOrd.customerName} • Listo en Sucursal`,
      category: "pedidos",
      badgeIcon: "pastel",
      orderId: updatedOrd.id,
      orderData: updatedOrd,
      branchId: updatedOrd.branchId,
      branchName: updatedOrd.branchName,
      operatingBranchId: updatedOrd.operatingBranchId,
      operatingBranchName: updatedOrd.operatingBranchName,
      actionLabel: (updatedOrd.remainingBalance || 0) > 0 ? `Cobrar $${Number(updatedOrd.remainingBalance).toFixed(2)}` : "Ver Detalle",
      actionLink: "/pedidos",
    });
  };

  const handleToggleReady = (order: CustomOrder) => {
    if (order.status === "entregado" || order.status === "cancelado") {
      alert("Este pedido pertenece al historial y no puede ser modificado.");
      return;
    }
    if (order.status === "listo") {
      if (confirm(`El pedido ${order.orderNumber} ya está marcado como "Listo en Sucursal".\n\n¿Deseas regresarlo a "En Preparación"?`)) {
        const updatedOrd = updateOrderStatus(order.id, "pendiente") || { ...order, status: "pendiente" as const };
        loadOrders();
        const baseItemsDesc = updatedOrd.description ? `${updatedOrd.description}. ` : "";
        addNotification({
          id: `notif-order-${updatedOrd.id}`,
          title: `Estado Actualizado: ${updatedOrd.orderNumber}`,
          description: `${baseItemsDesc}El pedido ${updatedOrd.orderNumber} de "${updatedOrd.customerName}" regresó a "En Preparación".`,
          senderName: `👨‍🍳 ${updatedOrd.branchName || "Control de Pedidos"}`,
          senderAvatar: "👨‍🍳",
          highlightText: `${updatedOrd.customerName} • En Preparación`,
          category: "pedidos",
          badgeIcon: "pastel",
          orderId: updatedOrd.id,
          orderData: updatedOrd,
          branchId: updatedOrd.branchId,
          branchName: updatedOrd.branchName,
          operatingBranchId: updatedOrd.operatingBranchId,
          operatingBranchName: updatedOrd.operatingBranchName,
          actionLabel: "Ver Detalle",
          actionLink: "/pedidos",
        });
      }
    } else {
      handleMarkAsReady(order);
    }
  };

  const handleDeliverOrder = (order: CustomOrder) => {
    if (order.status === "entregado" || order.status === "cancelado") {
      alert("Este pedido ya pertenece al historial y no puede ser modificado.");
      return;
    }
    if (order.status !== "listo") {
      alert(
        `⚠️ El pedido #${order.orderNumber} aún no ha sido marcado como "Listo en Sucursal".\n\nPrimero debes presionar el botón azul "Marcar Listo" para confirmar que el pedido ya llegó físicamente a la sucursal antes de proceder a entregarlo.`
      );
      return;
    }
    if (order.remainingBalance > 0) {
      alert(
        `⛔ No se puede entregar el pedido #${order.orderNumber}.\n\nTiene un saldo pendiente de ${formatCurrency(order.remainingBalance)}.\n\nPara poder entregarlo, primero debe estar 100% pagado sin faltante.`
      );
      setSelectedOrderForPayment(order);
      return;
    }
    setOrderToDeliver(order);
  };

  const handleConfirmDeliverOrder = (order: CustomOrder) => {
    setOrderToDeliver(null);
    const updatedOrd = updateOrderStatus(order.id, "entregado") || { ...order, status: "entregado" as const };
    loadOrders();
    setSelectedOrderForDetail(null);
    const totalNum = Number(updatedOrd.total) || 0;
    const baseItemsDesc = updatedOrd.description ? `${updatedOrd.description}. ` : "";
    addNotification({
      id: `notif-order-${updatedOrd.id}`,
      title: `Pedido Entregado con Éxito: ${updatedOrd.orderNumber}${totalNum ? ` • Total $${totalNum.toFixed(2)}` : ""}`,
      description: `${baseItemsDesc}El pedido ${updatedOrd.orderNumber} de "${updatedOrd.customerName}" fue entregado satisfactoriamente.`,
      senderName: `📦 Pedido Entregado (${updatedOrd.branchName || "Sucursal"})`,
      senderAvatar: "📦",
      highlightText: `${updatedOrd.customerName} • Entregado al Cliente`,
      category: "pedidos",
      badgeIcon: "pastel",
      orderId: updatedOrd.id,
      orderData: updatedOrd,
      branchId: updatedOrd.branchId,
      branchName: updatedOrd.branchName,
      operatingBranchId: updatedOrd.operatingBranchId,
      operatingBranchName: updatedOrd.operatingBranchName,
      actionLabel: "Ver Pedido Entregado",
      actionLink: "/pedidos",
    });
  };

  const handleAdvanceStatus = (order: CustomOrder) => {
    if (order.status === "entregado" || order.status === "cancelado") {
      alert("Este pedido pertenece al historial y no puede ser modificado.");
      return;
    }
    let nextStatus: CustomOrder["status"] = order.status;
    if (order.status === "pendiente" || order.status === "en_horno") nextStatus = "listo";
    else if (order.status === "listo") {
      if (order.remainingBalance > 0) {
        alert(
          `⛔ No se puede entregar el pedido #${order.orderNumber}.\n\nTiene un saldo pendiente de ${formatCurrency(order.remainingBalance)}.\n\nPara poder entregarlo, primero debe estar 100% pagado sin faltante.`
        );
        setSelectedOrderForPayment(order);
        return;
      }
      nextStatus = "entregado";
    }

    if (nextStatus !== order.status) {
      const updatedOrd = updateOrderStatus(order.id, nextStatus) || { ...order, status: nextStatus };
      loadOrders();
      if (nextStatus === "listo") {
        setReadyNotificationOrder(updatedOrd);
        try {
          playScanBeep(true);
        } catch (e) {}
        const totalNum = Number(updatedOrd.total) || 0;
        const baseItemsDesc = updatedOrd.description ? `${updatedOrd.description}. ` : "";
        addNotification({
          id: `notif-order-${updatedOrd.id}`,
          title: `El producto ya está en sucursal: ${updatedOrd.orderNumber}${totalNum ? ` • Total $${totalNum.toFixed(2)}` : ""}`,
          description: `${baseItemsDesc}El pedido ${updatedOrd.orderNumber} de "${updatedOrd.customerName}" ha sido marcado como LISTO en sucursal.`,
          senderName: `🎂 Listo en Sucursal (${updatedOrd.branchName || "Sucursal"})`,
          senderAvatar: "🎂",
          highlightText: `${updatedOrd.customerName} • Listo en Sucursal`,
          category: "pedidos",
          badgeIcon: "pastel",
          orderId: updatedOrd.id,
          orderData: updatedOrd,
          branchId: updatedOrd.branchId,
          branchName: updatedOrd.branchName,
          operatingBranchId: updatedOrd.operatingBranchId,
          operatingBranchName: updatedOrd.operatingBranchName,
          actionLabel: (updatedOrd.remainingBalance || 0) > 0 ? `Cobrar $${Number(updatedOrd.remainingBalance).toFixed(2)}` : "Ver Detalle",
          actionLink: "/pedidos",
        });
      } else if (nextStatus === "entregado") {
        const totalNum = Number(updatedOrd.total) || 0;
        const baseItemsDesc = updatedOrd.description ? `${updatedOrd.description}. ` : "";
        addNotification({
          id: `notif-order-${updatedOrd.id}`,
          title: `Pedido Entregado con Éxito: ${updatedOrd.orderNumber}${totalNum ? ` • Total $${totalNum.toFixed(2)}` : ""}`,
          description: `${baseItemsDesc}El pedido ${updatedOrd.orderNumber} de "${updatedOrd.customerName}" fue entregado satisfactoriamente.`,
          senderName: `📦 Pedido Entregado (${updatedOrd.branchName || "Sucursal"})`,
          senderAvatar: "📦",
          highlightText: `${updatedOrd.customerName} • Entregado al Cliente`,
          category: "pedidos",
          badgeIcon: "pastel",
          orderId: updatedOrd.id,
          orderData: updatedOrd,
          branchId: updatedOrd.branchId,
          branchName: updatedOrd.branchName,
          operatingBranchId: updatedOrd.operatingBranchId,
          operatingBranchName: updatedOrd.operatingBranchName,
          actionLabel: "Ver Pedido Entregado",
          actionLink: "/pedidos",
        });
      }
    }
  };

  const handleCancelOrder = (orderId: string) => {
    if (confirm("¿Estás seguro de cancelar este pedido?")) {
      updateOrderStatus(orderId, "cancelado");
    }
  };

  const handleDeletePermanent = (orderId: string, orderNumber?: string, customerName?: string) => {
    const label = orderNumber ? `el pedido ${orderNumber}${customerName ? ` de "${customerName}"` : ""}` : "este pedido";
    if (confirm(`¿Estás seguro de ELIMINAR PERMANENTEMENTE ${label}?\n\nEsta acción borrará el pedido por completo del registro y no se podrá recuperar.`)) {
      deleteCustomOrder(orderId);
      loadOrders();
      setSelectedOrderForDetail(null);
      addNotification({
        id: `notif-order-${orderId}`,
        title: `Pedido Cancelado / Eliminado: ${orderNumber || ""}`,
        description: `El pedido ${orderNumber || ""} de "${customerName || "Cliente"}" ha sido eliminado permanentemente del sistema.`,
        senderName: "🗑️ Pedido Cancelado",
        senderAvatar: "🗑️",
        highlightText: `${customerName || orderNumber || "Pedido"} • Dado de Baja`,
        category: "pedidos",
        badgeIcon: "pastel",
        orderId: orderId,
        actionLabel: "Ver Pedido Cancelado",
        actionLink: "/pedidos",
      });
    }
  };

  const handleDarDeBaja = (order: CustomOrder, confirmedReason?: string) => {
    const totalNum = Number(order.total) || 0;
    const baseItemsDesc = order.description ? `${order.description}. ` : "";

    if (confirmedReason) {
      loadOrders();
      setSelectedOrderForDetail(null);
      setClassificationFilter("historial");
      setHistorialSubFilter("cancelados");
      setTimeout(() => {
        scrollToCatalog();
      }, 120);

      addNotification({
        id: `notif-order-${order.id}`,
        title: `Pedido Dado de Baja: ${order.orderNumber}${totalNum ? ` • Total $${totalNum.toFixed(2)}` : ""}`,
        description: `${baseItemsDesc}El pedido ${order.orderNumber} de "${order.customerName}" se dio de baja (${confirmedReason}).`,
        senderName: `🗑️ Pedido Dado de Baja (${order.branchName || "Sucursal"})`,
        senderAvatar: "🗑️",
        highlightText: `${order.customerName} • Dado de Baja (${confirmedReason})`,
        category: "pedidos",
        badgeIcon: "pastel",
        orderId: order.id,
        orderData: { ...order, status: "cancelado" },
        branchId: order.branchId,
        branchName: order.branchName,
        operatingBranchId: order.operatingBranchId,
        operatingBranchName: order.operatingBranchName,
        actionLabel: "Ver Pedido Dado de Baja",
        actionLink: "/pedidos",
      });
      return;
    }

    const isPermanent = order.status === "cancelado";
    const confirmMsg = isPermanent
      ? `¿Estás seguro de ELIMINAR PERMANENTEMENTE el pedido ${order.orderNumber} de "${order.customerName}"?\n\nEsta acción borrará el pedido por completo del registro histórico y no se podrá recuperar.`
      : `¿Estás seguro de DAR DE BAJA el pedido ${order.orderNumber} de "${order.customerName}"?\n\nEl pedido se marcará como dado de baja y te mandaremos directo al historial de "Productos que se dieron de baja".`;

    if (confirm(confirmMsg)) {
      if (isPermanent) {
        deleteCustomOrder(order.id);
        loadOrders();
        setSelectedOrderForDetail(null);
        addNotification({
          id: `notif-order-${order.id}`,
          title: `Pedido Cancelado / Dado de Baja: ${order.orderNumber}${totalNum ? ` • Total $${totalNum.toFixed(2)}` : ""}`,
          description: `${baseItemsDesc}El pedido ${order.orderNumber} de "${order.customerName}" ha sido eliminado permanentemente del registro.`,
          senderName: `🗑️ Pedido Cancelado (${order.branchName || "Sucursal"})`,
          senderAvatar: "🗑️",
          highlightText: `${order.customerName} • Dado de Baja`,
          category: "pedidos",
          badgeIcon: "pastel",
          orderId: order.id,
          orderData: { ...order, status: "cancelado" },
          branchId: order.branchId,
          branchName: order.branchName,
          operatingBranchId: order.operatingBranchId,
          operatingBranchName: order.operatingBranchName,
          actionLabel: "Ver Pedido Cancelado",
          actionLink: "/pedidos",
        });
      } else {
        const updatedOrd = updateOrderStatus(order.id, "cancelado") || { ...order, status: "cancelado" as const };
        loadOrders();
        setSelectedOrderForDetail(null);

        // Mandar DIRECTO al apartado del historial de productos que se dieron de baja
        setClassificationFilter("historial");
        setHistorialSubFilter("cancelados");
        setTimeout(() => {
          scrollToCatalog();
        }, 120);

        addNotification({
          id: `notif-order-${updatedOrd.id}`,
          title: `Pedido Cancelado / Dado de Baja: ${updatedOrd.orderNumber}${totalNum ? ` • Total $${totalNum.toFixed(2)}` : ""}`,
          description: `${baseItemsDesc}El pedido ${updatedOrd.orderNumber} de "${updatedOrd.customerName}" se dio de baja y se mandó al historial de productos dados de baja.`,
          senderName: `🗑️ Pedido Cancelado (${updatedOrd.branchName || "Sucursal"})`,
          senderAvatar: "🗑️",
          highlightText: `${updatedOrd.customerName} • Dado de Baja`,
          category: "pedidos",
          badgeIcon: "pastel",
          orderId: updatedOrd.id,
          orderData: updatedOrd,
          branchId: updatedOrd.branchId,
          branchName: updatedOrd.branchName,
          operatingBranchId: updatedOrd.operatingBranchId,
          operatingBranchName: updatedOrd.operatingBranchName,
          actionLabel: "Ver Pedido Cancelado",
          actionLink: "/pedidos",
        });
      }
    }
  };

  const handleSendWhatsApp = (order: CustomOrder) => {
    const cleanPhone = order.phone.replace(/\D/g, "");
    const formattedPhone = cleanPhone.length === 10 ? `52${cleanPhone}` : cleanPhone;
    
    const isOverdue = checkIsOverdue(order);

    let statusText = "está registrado y programado para entrega";
    if (isOverdue) {
      statusText = "tenía horario programado para entrega y ya se encuentra listo esperando por ti en la sucursal. ¿Pasas hoy a recogerlo?";
    } else if (order.status === "listo") {
      statusText = "¡ya está LISTO para entrega en sucursal!";
    } else if (order.status === "entregado") {
      statusText = "ha sido marcado como entregado. ¡Esperamos lo disfruten!";
    }

    const message = `🥖 *PANADERÍA BRITO*\n` +
      `Hola *${order.customerName}*, te informamos que tu pedido *${order.orderNumber}* ${statusText}.\n\n` +
      `📅 *Entrega:* ${order.deliveryDate} a las ${order.deliveryTime || "16:00"} hrs\n` +
      `🏬 *Sucursal:* ${order.branchName}\n` +
      `💰 *Total:* ${formatCurrency(order.total)}\n` +
      `💵 *Anticipo:* ${formatCurrency(order.deposit)}\n` +
      `⚠️ *Resta por liquidar:* ${order.remainingBalance === 0 ? "¡Liquidado!" : formatCurrency(order.remainingBalance)}\n\n` +
      `¡Muchas gracias por tu preferencia!`;

    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const getStatusBadge = (status: CustomOrder["status"]) => {
    switch (status) {
      case "pendiente":
        return (
          <span className="bg-amber-50 text-amber-800 border border-amber-200/90 px-2.5 py-0.5 rounded-full font-bold text-[11px] inline-flex items-center gap-1 shadow-2xs">
            <Clock className="w-3 h-3 text-amber-600" /> Pendiente
          </span>
        );
      case "en_horno":
        return (
          <span className="bg-orange-50 text-orange-800 border border-orange-200 px-2.5 py-0.5 rounded-full font-bold text-[11px] inline-flex items-center gap-1 shadow-2xs">
            <Flame className="w-3 h-3 text-orange-600" /> En Preparación
          </span>
        );
      case "listo":
        return (
          <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white border border-amber-300 px-2.5 py-0.5 rounded-full font-black text-[11px] inline-flex items-center gap-1 shadow-xs ring-1 ring-emerald-400/50">
            <Store className="w-3 h-3 text-amber-200" /> ¡YA EN SUCURSAL!
          </span>
        );
      case "entregado":
        return (
          <span className="bg-sky-50 text-sky-800 border border-sky-200 px-2.5 py-0.5 rounded-full font-bold text-[11px] inline-flex items-center gap-1 shadow-2xs">
            <PackageCheck className="w-3 h-3 text-sky-700" /> Entregado
          </span>
        );
      case "cancelado":
        return (
          <span className="bg-red-600 text-white border border-red-700 px-2.5 py-0.5 rounded-full font-black text-[11px] inline-flex items-center gap-1 shadow-xs ring-1 ring-red-400/50">
            <XCircle className="w-3 h-3 text-red-100" /> CANCELADO
          </span>
        );
    }
  };

  return (
    <div className="w-full max-w-[1800px] min-h-[calc(100vh+6rem)] mx-auto px-2 sm:px-4 lg:px-6 pt-1 sm:pt-2 pb-32 flex flex-col space-y-2">
      {/* 1. ZONA SUPERIOR: Header, Métricas, Buscador y Paleta de Clasificación */}
      <div className="space-y-1.5 sm:space-y-2">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-600 text-white rounded-xl shadow-xs shrink-0">
              <CalendarClock className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-stone-900 tracking-tight leading-tight">
                Encargos & Pedidos de Pastelería
              </h1>
              <p className="text-[11px] text-stone-500 font-medium hidden sm:block">
                Control de pedidos de pan y pasteles, fechas de entrega, anticipos recibidos y saldos por liquidar.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">

            <button
              type="button"
              onClick={() => setShowKpiSummary((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 font-bold text-xs shadow-2xs transition-all cursor-pointer"
              title={showKpiSummary ? "Ocultar tarjetas de métricas para mayor espacio de catálogo" : "Mostrar tarjetas de métricas"}
            >
              <span>{showKpiSummary ? "Ocultar Métricas" : "Ver Métricas"}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showKpiSummary ? "rotate-180" : ""}`} />
            </button>

            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-black px-4 py-2 rounded-xl shadow-md hover:shadow-lg transition-all text-xs tracking-wide shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Tomar Nuevo Pedido
            </button>
          </div>
        </div>

        {/* KPI Cards (Interactive shortcuts to classification filters) */}
        {showKpiSummary && (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2 sm:gap-2.5 animate-in fade-in duration-150">
        {/* Cuadro 1: Pedidos Activos */}
        <div
          onClick={() => handleSelectKPICard("activos")}
          className={`bg-white border-2 rounded-2xl p-3 sm:p-4 shadow-2xs flex flex-col justify-between transition-all duration-200 cursor-pointer hover:-translate-y-0.5 select-none relative group ${
            classificationFilter === "activos"
              ? "border-amber-500 ring-4 ring-amber-400/30 shadow-md bg-amber-50/40"
              : "border-stone-200/80 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/10"
          }`}
          title="Toca para seleccionar y ver todos los pedidos activos en elaboración"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-stone-400 tracking-wider block">
                ⏳ Pedidos Activos
              </span>
              <span className="text-2xl sm:text-3xl font-black text-stone-900 mt-1 block">
                {metrics.activeCount}
              </span>
              <span className="text-[10px] text-amber-700 font-semibold">En proceso de elaboración</span>
            </div>
            <div className={`p-2.5 sm:p-3 rounded-2xl border transition-colors ${
              classificationFilter === "activos"
                ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                : "bg-amber-50 text-amber-600 border-amber-100 group-hover:bg-amber-100"
            }`}>
              <Cake className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-center justify-between text-[11px]">
            {classificationFilter === "activos" ? (
              <span className="font-black text-amber-900 flex items-center gap-1 bg-amber-100 px-2 py-0.5 rounded-md animate-pulse">
                ✓ Viendo {metrics.activeCount} pedidos abajo ↓
              </span>
            ) : (
              <span className="font-bold text-stone-400 group-hover:text-amber-700 transition-colors flex items-center gap-1">
                Toca para ver pedidos <ChevronRight className="w-3 h-3" />
              </span>
            )}
          </div>
        </div>

        {/* Cuadro 2: ¡Entregas para HOY! */}
        <div
          onClick={() => handleSelectKPICard("hoy")}
          className={`bg-white border-2 rounded-2xl p-3 sm:p-4 shadow-2xs flex flex-col justify-between transition-all duration-200 cursor-pointer hover:-translate-y-0.5 select-none relative group ${
            classificationFilter === "hoy"
              ? "border-rose-500 ring-4 ring-rose-400/30 shadow-md bg-rose-50/40"
              : "border-stone-200/80 hover:border-rose-400 hover:shadow-lg hover:shadow-rose-500/10"
          }`}
          title="Toca para seleccionar y ver todas las entregas para hoy"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-rose-500 tracking-wider block">
                ⏰ ¡Entregas para HOY!
              </span>
              <span className="text-2xl sm:text-3xl font-black text-rose-700 mt-1 block">
                {metrics.todayCount}
              </span>
              <span className="text-[10px] text-stone-500 font-medium">Prioridad en mostrador</span>
            </div>
            <div className={`p-2.5 sm:p-3 rounded-2xl border transition-colors ${
              classificationFilter === "hoy"
                ? "bg-rose-500 text-white border-rose-600 shadow-xs"
                : "bg-rose-50 text-rose-600 border-rose-100 animate-pulse group-hover:bg-rose-100"
            }`}>
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-center justify-between text-[11px]">
            {classificationFilter === "hoy" ? (
              <span className="font-black text-rose-900 flex items-center gap-1 bg-rose-100 px-2 py-0.5 rounded-md animate-pulse">
                ✓ Viendo {metrics.todayCount} entregas abajo ↓
              </span>
            ) : (
              <span className="font-bold text-stone-400 group-hover:text-rose-700 transition-colors flex items-center gap-1">
                Toca para ver entregas hoy <ChevronRight className="w-3 h-3" />
              </span>
            )}
          </div>
        </div>

        {/* Cuadro 2.5: 🏬 Sucursales (Administradores: Selector interactivo multi-tienda | Cajeros: Exclusivamente su propia sucursal asignada) */}
        {isAdmin ? (
          <div
            onClick={() => {
              if (topBranchSelectRef.current) {
                topBranchSelectRef.current.focus();
                if (typeof (topBranchSelectRef.current as any).showPicker === "function") {
                  (topBranchSelectRef.current as any).showPicker();
                }
              }
            }}
            className={`bg-white border-2 rounded-2xl p-3 sm:p-4 shadow-2xs flex flex-col justify-between transition-all duration-200 cursor-pointer hover:-translate-y-0.5 select-none relative group ${
              selectedBranchFilter !== "all"
                ? "border-amber-500 ring-4 ring-amber-400/30 shadow-md bg-amber-50/40"
                : "border-stone-200/80 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/10"
            }`}
            title="Toca para seleccionar la sucursal y filtrar los pedidos"
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1 pr-2">
                <span className="text-[11px] font-bold uppercase text-amber-700 tracking-wider block font-extrabold">
                  🏬 Sucursales
                </span>
                <span className="text-xl sm:text-2xl font-black text-stone-900 mt-1 block truncate">
                  {selectedBranchFilter === "all"
                    ? "Todas"
                    : branches.find((b) => b.id === selectedBranchFilter)?.name.replace("Sucursal ", "") || "Sucursal"}
                </span>
                <span className="text-[10px] text-amber-700 font-semibold block truncate">
                  {selectedBranchFilter === "all"
                    ? `${branchOrdersBreakdown.grandTotalOrders} pedidos en ${branches.length} tiendas`
                    : `Filtrando pedidos de esta tienda`}
                </span>
              </div>
              <div className={`p-2.5 sm:p-3 rounded-2xl border transition-colors shrink-0 ${
                selectedBranchFilter !== "all"
                  ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                  : "bg-amber-50 text-amber-600 border-amber-100 group-hover:bg-amber-100"
              }`}>
                <Building2 className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-stone-100">
              <div className="relative w-full" onClick={(e) => e.stopPropagation()}>
                <select
                  ref={topBranchSelectRef}
                  value={selectedBranchFilter}
                  onChange={(e) => {
                    setSelectedBranchFilter(e.target.value);
                    scrollToCatalog();
                  }}
                  className="w-full text-xs font-black text-amber-950 bg-amber-50/90 hover:bg-amber-100 border-2 border-amber-300 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer transition-all appearance-none pr-7 shadow-xs"
                >
                  <option value="all">
                    🏬 Todas las Sucursales ({branchOrdersBreakdown.grandTotalOrders} pedidos)
                  </option>
                  {branchOrdersBreakdown.branches.map((b) => (
                    <option key={b.branchId} value={b.branchId}>
                      🏬 {b.branchName} ({b.totalOrders} pedidos)
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-amber-800 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
        ) : (
          /* Vista exclusiva para Cajero / Perfil No Administrador: estrictamente su propia sucursal asignada */
          <div
            className="bg-white border-2 border-amber-200/90 rounded-2xl p-3 sm:p-4 shadow-2xs flex flex-col justify-between select-none relative"
            title={`Sucursal asignada a tu perfil: ${user?.assignedBranchName || userBranch.name}`}
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1 pr-2">
                <span className="text-[11px] font-bold uppercase text-amber-700 tracking-wider block font-extrabold flex items-center gap-1.5">
                  <span>🏬 Mi Sucursal</span>
                  <Lock className="w-3 h-3 text-amber-600 inline" />
                </span>
                <span className="text-xl sm:text-2xl font-black text-stone-900 mt-1 block truncate">
                  {user?.assignedBranchName || userBranch.name.replace("Sucursal ", "")}
                </span>
                <span className="text-[10px] text-amber-700 font-semibold block truncate">
                  {classificationCounts.all} pedidos en tu sucursal
                </span>
              </div>
              <div className="p-2.5 sm:p-3 rounded-2xl border transition-colors shrink-0 bg-amber-50 text-amber-600 border-amber-100">
                <Building2 className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-stone-100">
              <div className="w-full text-xs font-bold text-amber-950 bg-amber-50/90 border border-amber-200/90 rounded-xl px-2.5 py-1.5 flex items-center justify-between shadow-2xs">
                <span className="flex items-center gap-1.5 truncate text-[11px]">
                  <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span className="truncate">Turno: {user?.name || "Cajero"}</span>
                </span>
                <span className="text-[10px] bg-amber-200 text-amber-950 px-2 py-0.5 rounded-md font-black shrink-0">
                  {user?.assignedBranchName || userBranch.shortName || "Asignada"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Cuadro 3: Falta por Cobrar */}
        <div
          onClick={() => handleSelectKPICard("por_pagar")}
          className={`bg-white border-2 rounded-2xl p-3 sm:p-4 shadow-2xs flex flex-col justify-between transition-all duration-200 cursor-pointer hover:-translate-y-0.5 select-none relative group ${
            classificationFilter === "por_pagar"
              ? "border-emerald-500 ring-4 ring-emerald-400/30 shadow-md bg-emerald-50/40"
              : "border-stone-200/80 hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-500/10"
          }`}
          title="Toca para seleccionar y ver los pedidos con saldo pendiente por cobrar"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-stone-400 tracking-wider block">
                💰 Falta por Cobrar
              </span>
              <span className="text-xl sm:text-2xl font-black text-emerald-700 mt-1 block font-mono">
                {formatCurrency(metrics.totalRemainingBalance)}
              </span>
              <span className="text-[10px] text-stone-500 font-medium">Falta por liquidar al entregar</span>
            </div>
            <div className={`p-2.5 sm:p-3 rounded-2xl border transition-colors ${
              classificationFilter === "por_pagar"
                ? "bg-emerald-500 text-white border-emerald-600 shadow-xs"
                : "bg-emerald-50 text-emerald-600 border-emerald-100 group-hover:bg-emerald-100"
            }`}>
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-center justify-between text-[11px]">
            {classificationFilter === "por_pagar" ? (
              <span className="font-black text-emerald-900 flex items-center gap-1 bg-emerald-100 px-2 py-0.5 rounded-md animate-pulse">
                ✓ Viendo pedidos por cobrar abajo ↓
              </span>
            ) : (
              <span className="font-bold text-stone-400 group-hover:text-emerald-700 transition-colors flex items-center gap-1">
                Toca para ver pedidos por cobrar <ChevronRight className="w-3 h-3" />
              </span>
            )}
          </div>
        </div>

        {/* Cuadro 4: Listos en Sucursal */}
        <div
          onClick={() => handleSelectKPICard("no_llevados")}
          className={`bg-white border-2 rounded-2xl p-3 sm:p-4 shadow-2xs flex flex-col justify-between transition-all duration-200 cursor-pointer hover:-translate-y-0.5 select-none relative group ${
            classificationFilter === "no_llevados"
              ? "border-blue-500 ring-4 ring-blue-400/30 shadow-md bg-blue-50/40"
              : "border-stone-200/80 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/10"
          }`}
          title="Toca para seleccionar y ver los pedidos listos esperando al cliente"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-stone-400 tracking-wider block">
                📦 Listos en Sucursal
              </span>
              <span className="text-2xl sm:text-3xl font-black text-stone-900 mt-1 block">
                {metrics.readyCount}
              </span>
              <span className="text-[10px] text-emerald-700 font-semibold">Esperando al cliente</span>
            </div>
            <div className={`p-2.5 sm:p-3 rounded-2xl border transition-colors ${
              classificationFilter === "no_llevados"
                ? "bg-blue-500 text-white border-blue-600 shadow-xs"
                : "bg-blue-50 text-blue-600 border-blue-100 group-hover:bg-blue-100"
            }`}>
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-center justify-between text-[11px]">
            {classificationFilter === "no_llevados" ? (
              <span className="font-black text-blue-900 flex items-center gap-1 bg-blue-100 px-2 py-0.5 rounded-md animate-pulse">
                ✓ Viendo {metrics.readyCount} pedidos listos abajo ↓
              </span>
            ) : (
              <span className="font-bold text-stone-400 group-hover:text-blue-700 transition-colors flex items-center gap-1">
                Toca para ver pedidos listos <ChevronRight className="w-3 h-3" />
              </span>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Alerta Destacada: Pedidos que no han pasado por ellos */}
      {classificationCounts.no_pasaron > 0 && (
        <div
          onClick={() => handleSelectKPICard("no_pasaron")}
          className={`text-white p-2.5 sm:p-3 px-3.5 sm:px-4 rounded-2xl shadow-md flex items-center justify-between gap-3 cursor-pointer transition-colors duration-150 select-none ${
            classificationFilter === "no_pasaron"
              ? "bg-red-700 ring-2 ring-red-400 shadow-lg"
              : "bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-700 hover:to-rose-800 ring-1 ring-red-300"
          }`}
          title="Toca para ver o alternar los pedidos que no han pasado por ellos"
        >
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 bg-white/20 rounded-xl text-white shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <p className="text-xs sm:text-sm font-black truncate">
              Pedidos que no han pasado por ellos
            </p>
          </div>
          <span className={`inline-flex items-center gap-1 text-xs font-black px-3 py-1.5 rounded-xl shadow-xs shrink-0 transition-colors ${
            classificationFilter === "no_pasaron"
              ? "bg-stone-900 text-white ring-2 ring-white"
              : "bg-white text-red-700 hover:bg-stone-100"
          }`}>
            {classificationFilter === "no_pasaron" ? `✓ Viendo pedidos (${classificationCounts.no_pasaron}) ↓` : `Ver pedidos (${classificationCounts.no_pasaron}) →`}
          </span>
        </div>
      )}

      {/* Filter and Search Toolbar */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm space-y-3.5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search bar (8 cols) */}
          <div className="md:col-span-8 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-stone-400" />
            <input
              type="text"
              placeholder="Buscar por # pedido (PED-101), cliente, teléfono u observaciones..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none transition-all"
            />
          </div>

          {/* Payment filter (4 cols) */}
          <div className="md:col-span-4">
            <select
              value={paymentFilter}
              onChange={(e) => {
                setPaymentFilter(e.target.value);
                if (classificationFilter !== "all") setClassificationFilter("all");
              }}
              className="w-full text-xs px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-semibold text-stone-800"
            >
              <option value="all">💵 Todos los Pagos</option>
              <option value="pendientes">⚠️ Con Saldo Pendiente</option>
              <option value="liquidados">✓ 100% Liquidados</option>
            </select>
          </div>
        </div>
      </div>

      {/* Barra Destacada de Historial con 2 Apartados: Pedidos entregados con éxito y Pedidos dados de baja */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 text-white p-3 sm:p-3.5 px-4 sm:px-5 rounded-2xl shadow-md border border-stone-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3 animate-in fade-in duration-200">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl shadow-inner shrink-0">
            <History className="w-5 h-5 text-amber-400" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5 flex-wrap">
              <span>📜 Historial de Pedidos</span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 border border-stone-700">
                {classificationCounts.historial} registros
              </span>
              {classificationFilter === "historial" && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40">
                  {historialSubFilter === "cancelados" ? "Filtrando: Dados de baja" : "Filtrando: Entregados"}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              <span className="text-xs sm:text-sm font-black text-stone-100 truncate">
                Consulta de pedidos finalizados
              </span>
              {classificationFilter === "historial" && (
                <button
                  type="button"
                  onClick={() => {
                    setClassificationFilter("all");
                    setHistorialSubFilter("todos");
                  }}
                  className="text-[11px] font-bold text-amber-300 hover:text-white bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded-lg border border-amber-400/30 transition-colors cursor-pointer inline-flex items-center gap-1 shrink-0"
                  title="Volver a ver todos los pedidos activos"
                >
                  <span>✕ Quitar filtro (Ver Activos)</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Los 2 Apartados con Ancho Fijo, Cuadrados y Sin Movimiento */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5 w-full lg:w-auto shrink-0">
          {/* Apartado 1: Pedidos entregados con éxito */}
          <button
            type="button"
            onClick={() => {
              if (classificationFilter === "historial" && historialSubFilter === "entregados") {
                setClassificationFilter("all");
                setHistorialSubFilter("todos");
              } else {
                setHistorialSubFilter("entregados");
                setClassificationFilter("historial");
                setTimePeriodFilter("todos");
                setPaymentFilter("all");
                setStatusFilter("all");
                setDateFilter("all");
                scrollToCatalog();
              }
            }}
            className={`w-full sm:w-[260px] md:w-[275px] xl:w-[285px] h-[44px] px-3.5 rounded-xl font-black text-xs sm:text-sm flex items-center justify-between gap-2 select-none border transition-colors cursor-pointer ${
              classificationFilter === "historial" && historialSubFilter === "entregados"
                ? "bg-teal-600 text-white border-teal-300 ring-2 ring-teal-400/50 shadow-md"
                : "bg-stone-800/90 hover:bg-stone-800 text-teal-300 border-teal-700/60 hover:border-teal-400 hover:text-white"
            }`}
            title="Ver pedidos que se entregaron con éxito al cliente (Haz clic para alternar)"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className={`p-1 rounded-md shrink-0 ${
                classificationFilter === "historial" && historialSubFilter === "entregados" ? "bg-teal-800 text-white" : "bg-teal-500/20 text-teal-300"
              }`}>
                <Check className="w-4 h-4 text-teal-400 font-black" />
              </div>
              <span className="truncate whitespace-nowrap text-left text-xs sm:text-[13px]">
                Pedidos entregados con éxito
              </span>
            </div>
            <span className={`font-mono font-black text-xs px-2 py-0.5 rounded-lg border shrink-0 ${
              classificationFilter === "historial" && historialSubFilter === "entregados"
                ? "bg-teal-950 text-teal-100 border-teal-400"
                : "bg-teal-950 text-teal-200 border-teal-600"
            }`}>
              {classificationCounts.entregados}
            </span>
          </button>

          {/* Apartado 2: Pedidos que se dieron de baja */}
          <button
            type="button"
            onClick={() => {
              if (classificationFilter === "historial" && historialSubFilter === "cancelados") {
                setClassificationFilter("all");
                setHistorialSubFilter("todos");
              } else {
                setHistorialSubFilter("cancelados");
                setClassificationFilter("historial");
                setTimePeriodFilter("todos");
                setPaymentFilter("all");
                setStatusFilter("all");
                setDateFilter("all");
                scrollToCatalog();
              }
            }}
            className={`w-full sm:w-[260px] md:w-[275px] xl:w-[285px] h-[44px] px-3.5 rounded-xl font-black text-xs sm:text-sm flex items-center justify-between gap-2 select-none border transition-colors cursor-pointer ${
              classificationFilter === "historial" && historialSubFilter === "cancelados"
                ? "bg-rose-600 text-white border-rose-300 ring-2 ring-rose-400/50 shadow-md"
                : "bg-stone-800/90 hover:bg-stone-800 text-rose-300 border-rose-700/60 hover:border-rose-400 hover:text-white"
            }`}
            title="Ver productos y pedidos que se dieron de baja o cancelaron (Haz clic para alternar)"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className={`p-1 rounded-md shrink-0 ${
                classificationFilter === "historial" && historialSubFilter === "cancelados" ? "bg-rose-800 text-white" : "bg-rose-500/20 text-rose-300"
              }`}>
                <Trash2 className="w-4 h-4 text-rose-400 font-black" />
              </div>
              <span className="truncate whitespace-nowrap text-left text-xs sm:text-[13px]">
                Productos que se dieron de baja
              </span>
            </div>
            <span className={`font-mono font-black text-xs px-2 py-0.5 rounded-lg border shrink-0 ${
              classificationFilter === "historial" && historialSubFilter === "cancelados"
                ? "bg-rose-950 text-rose-100 border-rose-400"
                : "bg-rose-950 text-rose-200 border-rose-600"
            }`}>
              {classificationCounts.cancelados}
            </span>
          </button>
        </div>
      </div>

      {/* Botones de Clasificación: Todos, Por Pagar, Para Hoy, Listos */}
      <div className="flex items-stretch w-full bg-stone-100 p-0.5 rounded-xl border border-stone-200/90 shadow-2xs overflow-x-auto divide-x divide-stone-200/80 gap-0 animate-in fade-in duration-150">
            {/* 0. Todos */}
            <button
              type="button"
              onClick={() => handleSelectClassificationCard("all")}
              className={`flex-1 min-w-[95px] py-2 sm:py-2.5 px-3 flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-black transition-all cursor-pointer select-none first:rounded-lg last:rounded-lg ${
                classificationFilter === "all"
                  ? "bg-amber-600 text-white shadow-xs font-black"
                  : "hover:bg-white/80 text-stone-700"
              }`}
              title="Ver todos los pedidos y productos sin filtros"
            >
              <span className="flex items-center gap-1">
                <span>📋</span>
                <span className="truncate">Todos</span>
              </span>
              <span
                className={`text-[10px] sm:text-xs font-mono font-black px-1.5 py-0.5 rounded-md ${
                  classificationFilter === "all" ? "bg-white/20 text-white" : "bg-stone-200/90 text-stone-800"
                }`}
              >
                {classificationCounts.all}
              </span>
            </button>

            {/* 1. Por Pagar */}
            <button
              type="button"
              onClick={() => handleSelectClassificationCard("por_pagar")}
              className={`flex-1 min-w-[95px] py-2 sm:py-2.5 px-3 flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-black transition-all cursor-pointer select-none first:rounded-lg last:rounded-lg ${
                classificationFilter === "por_pagar"
                  ? "bg-emerald-600 text-white shadow-xs font-black"
                  : "hover:bg-white/80 text-stone-700"
              }`}
              title="Ver productos con saldo pendiente de cobrar / liquidar"
            >
              <span className="flex items-center gap-1">
                <span>💰</span>
                <span className="truncate">Por Pagar</span>
              </span>
              <span
                className={`text-[10px] sm:text-xs font-mono font-black px-1.5 py-0.5 rounded-md ${
                  classificationFilter === "por_pagar" ? "bg-white/20 text-white" : "bg-emerald-200/80 text-emerald-900"
                }`}
              >
                {classificationCounts.por_pagar}
              </span>
            </button>

            {/* 2. Pagados */}
            <button
              type="button"
              onClick={() => handleSelectClassificationCard("pagados")}
              className={`flex-1 min-w-[95px] py-2 sm:py-2.5 px-3 flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-black transition-all cursor-pointer select-none first:rounded-lg last:rounded-lg ${
                classificationFilter === "pagados"
                  ? "bg-teal-600 text-white shadow-xs font-black"
                  : "hover:bg-white/80 text-stone-700"
              }`}
              title="Ver pedidos que ya están 100% liquidados y pagados"
            >
              <span className="flex items-center gap-1">
                <span>✅</span>
                <span className="truncate">Pagados</span>
              </span>
              <span
                className={`text-[10px] sm:text-xs font-mono font-black px-1.5 py-0.5 rounded-md ${
                  classificationFilter === "pagados" ? "bg-white/20 text-white" : "bg-teal-100 text-teal-900 border border-teal-200/80"
                }`}
              >
                {classificationCounts.pagados}
              </span>
            </button>

            {/* 3. Para Hoy */}
            <button
              type="button"
              onClick={() => handleSelectClassificationCard("hoy")}
              className={`flex-1 min-w-[95px] py-2 sm:py-2.5 px-3 flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-black transition-all cursor-pointer select-none first:rounded-lg last:rounded-lg ${
                classificationFilter === "hoy"
                  ? "bg-rose-600 text-white shadow-xs font-black"
                  : "hover:bg-white/80 text-stone-700"
              }`}
              title="Ver todos los pedidos programados para entregar hoy"
            >
              <span className="flex items-center gap-1">
                <span>⏰</span>
                <span className="truncate">Para Hoy</span>
              </span>
              <span
                className={`text-[10px] sm:text-xs font-mono font-black px-1.5 py-0.5 rounded-md ${
                  classificationFilter === "hoy" ? "bg-white/20 text-white" : "bg-rose-200/80 text-rose-900"
                }`}
              >
                {classificationCounts.hoy}
              </span>
            </button>

            {/* 4. Listos en Sucursal */}
            <button
              type="button"
              onClick={() => handleSelectClassificationCard("no_llevados")}
              className={`flex-1 min-w-[115px] sm:min-w-[130px] py-2 sm:py-2.5 px-3 flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-black transition-all cursor-pointer select-none first:rounded-lg last:rounded-lg ${
                classificationFilter === "no_llevados"
                  ? "bg-blue-600 text-white shadow-xs font-black"
                  : "hover:bg-white/80 text-stone-700"
              }`}
              title="Ver productos listos en sucursal esperando al cliente"
            >
              <span className="flex items-center gap-1">
                <span>📦</span>
                <span className="truncate">Listos en Sucursal</span>
              </span>
              <span
                className={`text-[10px] sm:text-xs font-mono font-black px-1.5 py-0.5 rounded-md ${
                  classificationFilter === "no_llevados" ? "bg-white/20 text-white" : "bg-blue-200/80 text-blue-900"
                }`}
              >
                {classificationCounts.no_llevados}
              </span>
            </button>
          </div>
      </div>

      {/* 1.5. CLASIFICACIÓN TEMPORAL DE PEDIDOS (Por Día, Por Semana, Por Mes, Por Año) - BARRA DE BOTONES COMPACTOS */}
      <div className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs p-2.5 sm:p-3 space-y-2.5 transition-all">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          {/* Etiqueta compacta izquierda */}
          <div className="flex items-center justify-between lg:justify-start gap-2.5 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-400/40 flex items-center justify-center text-amber-700 shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs sm:text-sm font-black text-stone-900 uppercase tracking-wide">
                    Clasificación por Tiempo
                  </h3>
                  <span className="text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                    Filtro de Período
                  </span>
                </div>
                <p className="text-[11px] font-medium text-stone-500 hidden sm:block">
                  Filtra tus pedidos por Día, Semana, Mes o Año
                </p>
              </div>
            </div>
          </div>

          {/* Barra de Botones Compactos: Todo el Tiempo | Por Día | Por Semana | Por Mes | Por Año */}
          <div className="flex items-stretch w-full lg:w-auto bg-stone-100 p-1 rounded-xl border border-stone-200/90 overflow-x-auto gap-1">
            {/* 1. Todo el Tiempo */}
            <button
              type="button"
              onClick={() => handleSelectTimePeriod("todos")}
              className={`flex-1 lg:flex-initial min-w-[110px] py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 text-xs font-black transition-all cursor-pointer select-none whitespace-nowrap ${
                timePeriodFilter === "todos"
                  ? "bg-stone-900 text-white shadow-xs"
                  : "bg-white/60 hover:bg-white text-stone-700"
              }`}
              title="Ver todos los pedidos sin restricción de fecha"
            >
              <span>🌐</span>
              <span>Todo el Tiempo</span>
              <span
                className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded-md ${
                  timePeriodFilter === "todos"
                    ? "bg-white/20 text-white"
                    : "bg-stone-200/90 text-stone-800"
                }`}
              >
                {timePeriodCounts.todos}
              </span>
            </button>

            {/* 2. Por Día */}
            <button
              type="button"
              onClick={() => handleSelectTimePeriod("dia")}
              className={`flex-1 lg:flex-initial min-w-[100px] py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 text-xs font-black transition-all cursor-pointer select-none whitespace-nowrap ${
                timePeriodFilter === "dia"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-white/60 hover:bg-white text-stone-700"
              }`}
              title="Filtrar pedidos por día"
            >
              <span>☀️</span>
              <span>Por Día</span>
              <span
                className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded-md ${
                  timePeriodFilter === "dia"
                    ? "bg-white/20 text-white"
                    : "bg-amber-100 text-amber-900 border border-amber-200"
                }`}
              >
                {timePeriodCounts.dia}
              </span>
            </button>

            {/* 3. Por Semana */}
            <button
              type="button"
              onClick={() => handleSelectTimePeriod("semana")}
              className={`flex-1 lg:flex-initial min-w-[110px] py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 text-xs font-black transition-all cursor-pointer select-none whitespace-nowrap ${
                timePeriodFilter === "semana"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white/60 hover:bg-white text-stone-700"
              }`}
              title="Filtrar pedidos por semana (Lunes a Domingo)"
            >
              <span>🗓️</span>
              <span>Por Semana</span>
              <span
                className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded-md ${
                  timePeriodFilter === "semana"
                    ? "bg-white/20 text-white"
                    : "bg-blue-100 text-blue-900 border border-blue-200"
                }`}
              >
                {timePeriodCounts.semana}
              </span>
            </button>

            {/* 4. Por Mes */}
            <button
              type="button"
              onClick={() => handleSelectTimePeriod("mes")}
              className={`flex-1 lg:flex-initial min-w-[100px] py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 text-xs font-black transition-all cursor-pointer select-none whitespace-nowrap ${
                timePeriodFilter === "mes"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "bg-white/60 hover:bg-white text-stone-700"
              }`}
              title="Filtrar pedidos por mes"
            >
              <span>📆</span>
              <span>Por Mes</span>
              <span
                className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded-md ${
                  timePeriodFilter === "mes"
                    ? "bg-white/20 text-white"
                    : "bg-purple-100 text-purple-900 border border-purple-200"
                }`}
              >
                {timePeriodCounts.mes}
              </span>
            </button>

            {/* 5. Por Año */}
            <button
              type="button"
              onClick={() => handleSelectTimePeriod("ano")}
              className={`flex-1 lg:flex-initial min-w-[100px] py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 text-xs font-black transition-all cursor-pointer select-none whitespace-nowrap ${
                timePeriodFilter === "ano"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-white/60 hover:bg-white text-stone-700"
              }`}
              title="Filtrar pedidos por año"
            >
              <span>📅</span>
              <span>Por Año</span>
              <span
                className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded-md ${
                  timePeriodFilter === "ano"
                    ? "bg-white/20 text-white"
                    : "bg-emerald-100 text-emerald-900 border border-emerald-200"
                }`}
              >
                {timePeriodCounts.ano}
              </span>
            </button>
          </div>
        </div>

        {/* Sub-Barra Contextual Dinámica (según el período seleccionado) */}
        {timePeriodFilter === "dia" && (
          <div className="bg-amber-50/90 border border-amber-300 rounded-xl p-2.5 px-3 flex flex-wrap items-center justify-between gap-2 shadow-2xs animate-in fade-in duration-150">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black text-amber-950 flex items-center gap-1">
                <span>☀️</span> Fecha del Día:
              </span>
              <div className="flex items-center gap-1 bg-white border border-amber-300 rounded-lg p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={handlePrevDay}
                  className="px-2 py-1 hover:bg-amber-100 text-amber-900 font-black text-xs rounded-md transition-colors cursor-pointer"
                  title="Día anterior"
                >
                  ◀
                </button>
                <input
                  type="date"
                  value={customSelectedDate}
                  onChange={(e) => setCustomSelectedDate(e.target.value)}
                  className="text-xs font-black text-stone-900 bg-transparent px-1.5 py-0.5 focus:outline-none cursor-pointer"
                />
                <button
                  type="button"
                  onClick={handleNextDay}
                  className="px-2 py-1 hover:bg-amber-100 text-amber-900 font-black text-xs rounded-md transition-colors cursor-pointer"
                  title="Día siguiente"
                >
                  ▶
                </button>
              </div>

              {customSelectedDate !== todayStr && (
                <button
                  type="button"
                  onClick={() => setCustomSelectedDate(todayStr)}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-black text-xs rounded-lg shadow-2xs transition-all cursor-pointer flex items-center gap-1"
                >
                  <span>☀️ Ir a Hoy</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs font-black text-amber-950 bg-amber-200/70 border border-amber-300/80 px-2.5 py-1 rounded-lg">
              <span>📅 {formattedDayLabel}</span>
              <span className="bg-amber-700 text-white px-1.5 py-0.5 rounded font-mono text-[11px]">
                {timePeriodCounts.dia} pedidos
              </span>
            </div>
          </div>
        )}

        {timePeriodFilter === "semana" && (
          <div className="bg-blue-50/90 border border-blue-300 rounded-xl p-2.5 px-3 flex flex-wrap items-center justify-between gap-2 shadow-2xs animate-in fade-in duration-150">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black text-blue-950 flex items-center gap-1">
                <span>🗓️</span> Semana en Consulta:
              </span>
              <span className="text-xs font-black text-blue-900 bg-white border border-blue-300 px-2.5 py-1 rounded-lg shadow-2xs font-mono">
                {formattedWeekRange}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs font-black text-blue-950 bg-blue-200/70 border border-blue-300/80 px-2.5 py-1 rounded-lg">
              <span>Lunes a Domingo</span>
              <span className="bg-blue-700 text-white px-1.5 py-0.5 rounded font-mono text-[11px]">
                {timePeriodCounts.semana} pedidos
              </span>
            </div>
          </div>
        )}

        {timePeriodFilter === "mes" && (
          <div className="bg-purple-50/90 border border-purple-300 rounded-xl p-2.5 px-3 flex flex-wrap items-center justify-between gap-2 shadow-2xs animate-in fade-in duration-150">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black text-purple-950 flex items-center gap-1">
                <span>📆</span> Mes a Consultar:
              </span>
              <input
                type="month"
                value={customSelectedMonth}
                onChange={(e) => setCustomSelectedMonth(e.target.value)}
                className="text-xs font-black text-stone-900 bg-white border border-purple-300 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer shadow-2xs"
              />
            </div>
            <div className="flex items-center gap-2 text-xs font-black text-purple-950 bg-purple-200/70 border border-purple-300/80 px-2.5 py-1 rounded-lg">
              <span className="capitalize">📅 {formattedMonthLabel}</span>
              <span className="bg-purple-700 text-white px-1.5 py-0.5 rounded font-mono text-[11px]">
                {timePeriodCounts.mes} pedidos
              </span>
            </div>
          </div>
        )}

        {timePeriodFilter === "ano" && (
          <div className="bg-emerald-50/90 border border-emerald-300 rounded-xl p-2.5 px-3 flex flex-wrap items-center justify-between gap-2 shadow-2xs animate-in fade-in duration-150">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black text-emerald-950 flex items-center gap-1">
                <span>📅</span> Año a Consultar:
              </span>
              <select
                value={customSelectedYear}
                onChange={(e) => setCustomSelectedYear(e.target.value)}
                className="text-xs font-black text-stone-900 bg-white border border-emerald-300 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-2xs"
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    Año {yr}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 text-xs font-black text-emerald-950 bg-emerald-200/70 border border-emerald-300/80 px-2.5 py-1 rounded-lg">
              <span>Año {customSelectedYear} completo</span>
              <span className="bg-emerald-700 text-white px-1.5 py-0.5 rounded font-mono text-[11px]">
                {timePeriodCounts.ano} pedidos
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Catálogo de Productos y Pedidos */}
      <div 
        ref={catalogSectionRef}
        id="catalog-results-section"
        className="w-full flex flex-col mt-0.5"
      >
        <div 
          ref={catalogScrollRef} 
          className="w-full space-y-1.5 sm:space-y-2 pb-4"
        >
          {/* Banner de Cuadro Seleccionado con botón para restablecer */}
          {classificationFilter !== "all" && (
            <div className="bg-white border border-amber-300 rounded-xl p-2 sm:p-2.5 px-3 shadow-2xs flex flex-wrap items-center justify-between gap-2 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-500 text-white rounded-lg shadow-2xs">
                  {classificationFilter === "activos" && <Cake className="w-4 h-4" />}
                  {classificationFilter === "hoy" && <Clock className="w-4 h-4" />}
                  {classificationFilter === "por_pagar" && <DollarSign className="w-4 h-4" />}
                  {classificationFilter === "pagados" && <Check className="w-4 h-4" />}
                  {classificationFilter === "no_llevados" && <CheckCircle2 className="w-4 h-4" />}
                  {classificationFilter === "no_pasaron" && <AlertTriangle className="w-4 h-4 text-red-200" />}
                  {classificationFilter === "pendientes" && <Flame className="w-4 h-4" />}
                  {classificationFilter === "proximos" && <Calendar className="w-4 h-4" />}
                  {classificationFilter === "historial" && <History className="w-4 h-4 text-amber-200" />}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[9px] font-black uppercase tracking-wider text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200">
                      {classificationFilter === "historial" ? "📜 Historial de Pedidos" : "Filtro Activo"}
                    </span>
                    <h3 className="text-xs sm:text-sm font-black text-stone-900">
                      {classificationFilter === "activos" && "⏳ Pedidos Activos en Proceso de Elaboración"}
                      {classificationFilter === "hoy" && "⏰ Entregas Programadas para HOY"}
                      {classificationFilter === "por_pagar" && `💰 Saldo Falta por Cobrar (${formatCurrency(metrics.totalRemainingBalance)})`}
                      {classificationFilter === "pagados" && "✅ Pedidos 100% Pagados (Liquidados)"}
                      {classificationFilter === "no_llevados" && "📦 Listos en Sucursal Esperando al Cliente"}
                      {classificationFilter === "no_pasaron" && `⚠️ Pedidos que no han pasado por ellos (${classificationCounts.no_pasaron})`}
                      {classificationFilter === "pendientes" && "👨‍🍳 En Preparación / Horno"}
                      {classificationFilter === "proximos" && "⏰ Próximos de Hoy"}
                      {classificationFilter === "historial" && (
                        historialSubFilter === "entregados"
                          ? "✓ Historial: Pedidos entregados con éxito"
                          : historialSubFilter === "cancelados"
                          ? "✕ Historial: Productos que se dieron de baja"
                          : "📜 Historial Completo de Pedidos Concluidos"
                      )}
                    </h3>
                  </div>
                  {classificationFilter === "historial" ? (
                    <div className="mt-1 space-y-1">
                      <p className="text-[11px] text-stone-600 font-semibold">
                        Registro histórico de consulta informativa ({filteredOrders.length} pedido(s)). Los pedidos concluidos no tienen opciones para entregar, pagar ni mover a otras categorías.
                      </p>
                    </div>
                  ) : classificationFilter === "pagados" ? (
                    <div className="mt-1 space-y-1.5">
                      <p className="text-[11px] text-amber-900 font-bold bg-amber-50/90 border border-amber-200/80 px-2 py-1 rounded-md">
                        ⚠️ <strong>Control de Sucursal:</strong> El pedido está pagado, pero puede que aún no haya llegado a la sucursal. Revisa cada uno y pulsa <strong>&quot;Marcar como Listo&quot;</strong> cuando ya esté físicamente en tienda.
                      </p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-black uppercase text-stone-500">Subfiltro:</span>
                        <button
                          type="button"
                          onClick={() => setPagadosSubFilter("todos")}
                          className={`px-2 py-0.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                            pagadosSubFilter === "todos"
                              ? "bg-amber-600 text-white shadow-2xs"
                              : "bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200"
                          }`}
                        >
                          Todos pagados ({classificationCounts.pagados})
                        </button>
                        <button
                          type="button"
                          onClick={() => setPagadosSubFilter("pendientes")}
                          className={`px-2 py-0.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                            pagadosSubFilter === "pendientes"
                              ? "bg-amber-600 text-white shadow-2xs"
                              : "bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300"
                          }`}
                        >
                          <span>⏳ Por llegar a sucursal ({classificationCounts.pagados_pendientes})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPagadosSubFilter("listos")}
                          className={`px-2 py-0.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                            pagadosSubFilter === "listos"
                              ? "bg-emerald-700 text-white shadow-2xs"
                              : "bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-300"
                          }`}
                        >
                          <span>🎂 Ya listos en sucursal ({classificationCounts.pagados_listos})</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-stone-500 font-semibold mt-0.5">
                      Mostrando {filteredOrders.length} pedido(s) activo(s) en proceso.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const mainEl = document.querySelector("main");
                    mainEl?.scrollTo({ top: 0, behavior: "smooth" });
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-700 font-bold text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-2xs border border-stone-200"
                  title="Subir a ver tarjetas métricas"
                >
                  <span>↑ Ver Cuadros</span>
                </button>
                <button
                  type="button"
                  onClick={() => setClassificationFilter("all")}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-black text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <span>✕ Ver todos ({classificationCounts.all})</span>
                </button>
              </div>
            </div>
          )}
        {/* Barra de alternancia: Fichas de Productos vs Tabla + Switcher Lista/Cuadrícula + Estado Celular */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-1 sm:p-1.5 px-3 rounded-xl border border-stone-200 shadow-2xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-stone-600 uppercase tracking-wide flex items-center gap-1.5">
              <span>👀</span> Vista:
            </span>

            {/* Switcher Formato: En Lista vs Cuadrícula */}
            <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setViewMode("productos");
                  setProductLayout("lista");
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  productLayout === "lista"
                    ? "bg-white text-stone-900 shadow-2xs font-black ring-1 ring-stone-200"
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/60"
                }`}
                title="Ver pedidos en formato de lista compacta y alineada"
              >
                <List className="w-3.5 h-3.5 text-amber-600" />
                <span>En Lista</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode("productos");
                  setProductLayout("cuadricula");
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  productLayout === "cuadricula"
                    ? "bg-white text-stone-900 shadow-2xs font-black ring-1 ring-stone-200"
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/60"
                }`}
                title="Ver pedidos en cuadrícula de tarjetas"
              >
                <LayoutGrid className="w-3.5 h-3.5 text-stone-600" />
                <span>Cuadrícula</span>
              </button>
            </div>
          </div>
        </div>

        {/* CONTENIDO PRINCIPAL: LISTA O TABLA O CUADRÍCULA */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-3xl border border-stone-200 p-8 sm:p-12 text-center space-y-3">
            <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center mx-auto border border-amber-200 shadow-inner">
              {classificationFilter === "hoy" ? (
                <Clock className="w-8 h-8 text-rose-500" />
              ) : classificationFilter === "no_llevados" ? (
                <CheckCircle2 className="w-8 h-8 text-blue-500" />
              ) : classificationFilter === "por_pagar" ? (
                <DollarSign className="w-8 h-8 text-emerald-500" />
              ) : classificationFilter === "pagados" ? (
                <Check className="w-8 h-8 text-teal-600" />
              ) : (
                <Cake className="w-8 h-8 text-amber-600" />
              )}
            </div>
            <h3 className="font-extrabold text-lg text-stone-900">
              {classificationFilter === "hoy"
                ? "No hay entregas programadas para hoy"
                : classificationFilter === "no_llevados"
                ? "No hay pedidos listos en sucursal esperando"
                : classificationFilter === "por_pagar"
                ? "No hay saldos pendientes por cobrar"
                : classificationFilter === "pagados"
                ? "No hay pedidos pagados para mostrar"
                : classificationFilter === "no_pasaron"
                ? "No hay pedidos pendientes donde no hayan pasado por ellos"
                : "No se encontraron productos ni pedidos"}
            </h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              {classificationFilter === "hoy"
                ? `Para el día de hoy (${todayStr}) no hay pedidos pendientes de entregar. Puedes revisar los pedidos de días próximos o los pedidos activos.`
                : classificationFilter === "no_llevados"
                ? "Todos los pedidos están en proceso de horneado/elaboración o esperando entrega en sucursal."
                : classificationFilter === "por_pagar"
                ? "Todos los pedidos activos registrados se encuentran 100% liquidados."
                : classificationFilter === "pagados"
                ? "No se encontraron pedidos con pago completado bajo los criterios o sucursal seleccionada."
                : classificationFilter === "no_pasaron"
                ? "Excelente: ningún cliente ha dejado su pedido pasado de la fecha u hora programada."
                : "No hay productos registrados que coincidan con la clasificación o filtros seleccionados."}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              {classificationFilter !== "all" && (
                <button
                  onClick={() => setClassificationFilter("all")}
                  className="inline-flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  <span>📋 Ver Todos los Pedidos ({classificationCounts.all})</span>
                </button>
              )}
              {classificationFilter !== "activos" && classificationCounts.activos > 0 && (
                <button
                  onClick={() => handleSelectKPICard("activos")}
                  className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  <span>⏳ Ver Pedidos Activos ({classificationCounts.activos})</span>
                </button>
              )}
              <button
                onClick={() => setIsCreateOpen(true)}
                className="inline-flex items-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs px-4 py-2.5 rounded-xl shadow-2xs transition-all cursor-pointer border border-stone-200"
              >
                <Plus className="w-4 h-4" /> Tomar Nuevo Pedido
              </button>
            </div>
          </div>
        ) : viewMode === "productos" ? (
          /* ============================================================ */
          /* VISTA DE PRODUCTOS: LISTA ERGONÓMICA O CUADRÍCULA           */
          /* ============================================================ */
          productLayout === "lista" ? (
            /* FORMATO DE LISTA RESPONSIVA, BALANCEADA Y CUADRADA POR PEDIDO */
            <div className="space-y-2.5 sm:space-y-3">
              {filteredOrders.map((order) => {
                const isOverdue = checkIsOverdue(order);
                const isReady = checkIsReadyNotDelivered(order);
                const isUpcoming = checkIsUpcoming(order);
                const isPending = checkIsPending(order);
                const isConcludedOrHistory = classificationFilter === "historial" || order.status === "entregado" || order.status === "cancelado";
                const totalPieces = order.items && order.items.length > 0
                  ? order.items.reduce((sum, item) => sum + (item.quantity || 0), 0)
                  : 1;
                const creationInfo = formatOrderCreation(order);
                const deliveryInfo = formatDeliveryDateDisplay(order.deliveryDate);

                return (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrderForDetail(order)}
                    className={`rounded-2xl border p-3 sm:p-3.5 transition-all duration-150 shadow-2xs hover:shadow-md cursor-pointer group border-l-4 ${
                      order.status === "cancelado"
                        ? "border-l-red-600 bg-red-50/75 hover:bg-red-100/75 border-red-400 ring-2 ring-red-500/20"
                        : order.status === "entregado"
                        ? "border-l-sky-500 bg-sky-50/40 hover:bg-sky-50/70 border-sky-200 ring-1 ring-sky-200/50"
                        : isOverdue
                        ? "bg-white border-l-rose-500 hover:bg-rose-50/10 border-rose-200"
                        : isReady
                        ? "bg-white border-l-emerald-500 hover:bg-emerald-50/10 border-emerald-200"
                        : isUpcoming
                        ? "bg-white border-l-amber-500 hover:bg-amber-50/10 border-stone-200"
                        : isPending
                        ? "bg-white border-l-amber-500 hover:bg-amber-50/10 border-stone-200"
                        : "bg-white border-l-stone-300 hover:bg-stone-50 border-stone-200"
                    }`}
                  >
                    {/* Cuadrícula Maestra de 4 Columnas Perfectamente Niveladas y Cuadradas (xl:grid-cols-12) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-3 sm:gap-3.5 items-stretch">
                      {/* COLUMNA 1: Identificación, Folio, Sucursal, Título, Registro y Total (xl:col-span-3) */}
                      <div className="md:col-span-1 xl:col-span-3 min-w-0 flex flex-col justify-between gap-2 h-full">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono tabular-nums font-black text-xs text-stone-900 bg-stone-100 border border-stone-300 px-2 py-0.5 rounded-md shadow-2xs">
                              {order.orderNumber}
                            </span>
                            {order.operatingBranchName && order.branchName && order.operatingBranchName !== order.branchName ? (
                              <span className="text-[10px] font-bold text-stone-700 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                                <span>🏬 {order.operatingBranchName.replace("Sucursal ", "")}</span>
                                <span className="text-amber-600 font-bold">➔</span>
                                <span className="text-stone-900 font-bold">{order.branchName.replace("Sucursal ", "")}</span>
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-stone-600 bg-stone-100 border border-stone-200 px-1.5 py-0.5 rounded-md">
                                🏬 {order.branchName.replace("Sucursal ", "")}
                              </span>
                            )}
                            {getStatusBadge(order.status)}
                          </div>

                          {/* Centered Status Banner */}
                          {order.status === "entregado" && (
                            <div className="my-1.5 py-1 px-2.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 flex items-center justify-center gap-1.5 shadow-2xs">
                              <PackageCheck className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                              <span className="font-black text-xs tracking-wider uppercase">ENTREGADO</span>
                            </div>
                          )}
                          {order.status === "cancelado" && (
                            <div className="my-1.5 py-1.5 px-3 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 border border-red-800 text-white flex items-center justify-center gap-1.5 shadow-sm ring-2 ring-red-500/30">
                              <XCircle className="w-4 h-4 text-red-100 shrink-0" />
                              <span className="font-black text-xs tracking-wider uppercase">CANCELADO</span>
                            </div>
                          )}

                          <h4
                            className="font-black text-stone-900 text-sm leading-snug line-clamp-1 group-hover:text-amber-700 transition-colors mt-2"
                            title={order.items?.[0]?.name || order.description || "Pedido Encargado"}
                          >
                            {order.items && order.items.length > 0
                              ? order.items.length === 1
                                ? order.items[0].name
                                : `${order.items[0].name} (+${order.items.length - 1} más)`
                              : order.description || "Pedido Encargado"}
                          </h4>

                          {order.dedication && (
                            <p className="text-[11px] font-semibold text-amber-800 italic truncate mt-0.5" title={order.dedication}>
                              ✨ &quot;{order.dedication}&quot;
                            </p>
                          )}

                          {/* Registro exacto: cuándo se alzó el pedido */}
                          <div
                            className="mt-1.5 flex items-center gap-1.5 text-[11px] text-stone-500 font-medium"
                            title={`Pedido registrado el: ${creationInfo.fullDateStr}`}
                          >
                            <Clock className="w-3 h-3 text-stone-400 shrink-0" />
                            <span>Alzado:</span>
                            <span className="font-semibold text-stone-700">{creationInfo.shortDateStr}</span>
                            <span className="text-stone-300">•</span>
                            <span className="font-mono tabular-nums font-semibold text-stone-700">{creationInfo.exactTimeStr}</span>
                          </div>
                        </div>

                        {/* Piezas y Total del Pedido perfectamente alineados */}
                        <div className="flex items-center justify-between pt-2 border-t border-stone-100 mt-2">
                          <span className="font-mono tabular-nums font-bold text-xs px-2.5 py-0.5 rounded-md bg-stone-100 text-stone-700 border border-stone-200 shrink-0 shadow-2xs">
                            📦 {totalPieces} {totalPieces === 1 ? "pza" : "pzas"}
                          </span>
                          <div className="flex items-baseline gap-1.5 min-w-0 text-right">
                            <span className="text-[10px] font-bold uppercase text-stone-400 tracking-wider">Total:</span>
                            <span className="font-mono tabular-nums font-black text-base text-stone-900 truncate">
                              {formatCurrency(order.total)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* COLUMNA 2: Comanda y Desglose de Productos Cuadrado (xl:col-span-3) */}
                      <div className="md:col-span-1 xl:col-span-3 min-w-0 h-full">
                        {(() => {
                          const isExpanded = Boolean(expandedProductsOrderIds[order.id]);
                          const orderItems = order.items || [];
                          const hasItems = orderItems.length > 0;
                          const hasMoreThanTwo = orderItems.length > 2;
                          const itemsToShow = isExpanded ? orderItems : orderItems.slice(0, 2);

                          return (
                            <div className={`border rounded-xl p-2.5 flex flex-col justify-between h-full transition-all shadow-2xs ${
                              order.status === "cancelado"
                                ? "bg-red-50/50 border-red-300/90"
                                : "bg-stone-50/70 border-stone-200/80"
                            }`}>
                              <div>
                                {/* Cabecera de Comanda */}
                                <div className="flex items-center justify-between gap-1 mb-1.5 pb-1 border-b border-stone-200/60">
                                  <div className="flex items-center gap-1.5 font-bold text-[11px] text-stone-700 uppercase tracking-wider">
                                    <Receipt className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                                    <span>Comanda ({orderItems.length} {orderItems.length === 1 ? "prod" : "prods"})</span>
                                  </div>
                                  {hasMoreThanTwo && (
                                    <button
                                      type="button"
                                      onClick={(e) => toggleOrderProductsExpanded(order.id, e)}
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition-all cursor-pointer shadow-2xs leading-none ${
                                        isExpanded
                                          ? "bg-stone-800 text-white border-stone-900 hover:bg-black"
                                          : "text-stone-700 hover:text-stone-900 bg-white hover:bg-stone-100 border-stone-200"
                                      }`}
                                      title={isExpanded ? "Mostrar menos productos" : "Desplegar todos los productos y detalles"}
                                    >
                                      <span>{isExpanded ? "Menos" : "Ver más"}</span>
                                    </button>
                                  )}
                                </div>

                                {/* Lista con Columnas Cuadradas y Números Tabulares */}
                                {hasItems ? (
                                  <div className="space-y-1">
                                    {itemsToShow.map((it, idx) => (
                                      <div key={idx} className="flex items-center justify-between text-xs gap-1.5 leading-tight bg-white px-2 py-1 rounded-lg border border-stone-200/60 shadow-2xs">
                                        {/* 1. Cantidad fija centrada */}
                                        <span className="font-mono tabular-nums font-bold text-[11px] text-stone-700 bg-stone-100 border border-stone-200 px-1 py-0.2 rounded w-8 text-center shrink-0">
                                          {it.quantity}x
                                        </span>
                                        {/* 2. Nombre de producto */}
                                        <span className="font-medium text-stone-800 text-[11px] truncate flex-1 min-w-0" title={it.name}>
                                          {it.name}
                                          {it.notes && <span className="text-stone-400 font-normal italic ml-1">({it.notes})</span>}
                                        </span>
                                        {/* 3. Subtotal alineado a la derecha en ancho fijo */}
                                        <span className="font-mono tabular-nums font-bold text-[11px] text-stone-900 shrink-0">
                                          {it.subtotal ? formatCurrency(it.subtotal) : ""}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="font-medium text-stone-600 text-xs leading-snug line-clamp-2">
                                    {order.description || "Especificaciones generales del pedido."}
                                  </p>
                                )}
                              </div>

                              {/* Pie de comanda si hay más de 2 productos y está plegado */}
                              {hasMoreThanTwo && !isExpanded && (
                                <button
                                  type="button"
                                  onClick={(e) => toggleOrderProductsExpanded(order.id, e)}
                                  className="w-full mt-1.5 py-1 px-2 bg-white hover:bg-stone-100 border border-stone-200/80 rounded-lg text-[10px] font-bold text-stone-600 hover:text-stone-900 flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
                                >
                                  <span>+ {orderItems.length - 2} prod{orderItems.length - 2 > 1 ? "s" : ""} más</span>
                                </button>
                              )}

                              {/* Desplegable con observaciones si está expandido */}
                              {isExpanded && (
                                <div className="mt-1.5 pt-1.5 border-t border-stone-200 space-y-1 text-[11px] animate-in fade-in duration-150">
                                  {order.description && (
                                    <p className="text-stone-700 bg-white p-1.5 rounded-lg border border-stone-200">
                                      <strong className="text-stone-900 font-bold">Obs:</strong> {order.description}
                                    </p>
                                  )}
                                  {order.dedication && (
                                    <p className="text-amber-900 font-semibold italic bg-amber-50/70 border border-amber-200 px-1.5 py-0.5 rounded-lg">
                                      ✨ &quot;{order.dedication}&quot;
                                    </p>
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => toggleOrderProductsExpanded(order.id, e)}
                                    className="w-full pt-0.5 text-[10px] font-bold text-stone-600 hover:text-stone-900 flex items-center justify-center cursor-pointer"
                                  >
                                    <span>Mostrar solo 2</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      {/* COLUMNA 3: Entrega, Cliente y Saldo Cuadrados (xl:col-span-3) */}
                      <div className="md:col-span-1 xl:col-span-3 min-w-0 h-full">
                        <div className={`border rounded-xl p-2.5 flex flex-col justify-between h-full shadow-2xs ${
                          order.status === "cancelado"
                            ? "bg-red-50/50 border-red-300/90"
                            : "bg-stone-50/70 border-stone-200/80"
                        }`}>
                          {/* 1. Fecha y Hora de Entrega Destacada */}
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1 mb-1">
                              <Calendar className="w-3 h-3 text-stone-400 shrink-0" />
                              <span>Entrega Programada</span>
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {deliveryInfo.isToday ? (
                                <span className="text-[10px] font-black bg-rose-600 text-white px-2 py-0.5 rounded-md shadow-2xs animate-pulse">
                                  ¡HOY!
                                </span>
                              ) : deliveryInfo.isTomorrow ? (
                                <span className="text-[10px] font-black bg-amber-500 text-stone-950 px-2 py-0.5 rounded-md shadow-2xs">
                                  Mañana
                                </span>
                              ) : null}
                              <span className="font-bold text-stone-800 text-xs bg-white border border-stone-200 px-2 py-0.5 rounded-md shadow-2xs">
                                {deliveryInfo.formattedDate}
                              </span>
                              <span className="font-mono tabular-nums font-bold text-stone-700 text-xs bg-white border border-stone-200 px-1.5 py-0.5 rounded-md shadow-2xs flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5 text-stone-400 shrink-0" />
                                <span>{order.deliveryTime || "16:00"} hrs</span>
                              </span>
                            </div>
                          </div>

                          {/* 2. Cliente y Teléfono */}
                          <div className="pt-1.5 border-t border-stone-200/60 min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-0.5">Cliente</span>
                            <p className="font-bold text-xs text-stone-900 truncate capitalize" title={order.customerName}>
                              👤 {order.customerName}
                            </p>
                            {order.phone && (
                              <p className="font-mono tabular-nums text-[11px] font-semibold text-stone-500 truncate flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3 text-stone-400 shrink-0" />
                                <span>{order.phone}</span>
                              </p>
                            )}
                          </div>

                          {/* 3. Saldo / Estado Financiero */}
                          <div className="pt-1.5 border-t border-stone-200/60">
                            {order.remainingBalance === 0 ? (
                              <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1 flex items-center justify-between shadow-2xs">
                                <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span>Liquidado</span>
                                </span>
                                <span className="font-mono text-xs font-bold text-emerald-900">
                                  {formatCurrency(order.total)}
                                </span>
                              </div>
                            ) : (
                              <div className="bg-white border border-stone-200/90 rounded-lg p-1.5 px-2 shadow-2xs flex flex-col gap-0.5">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-stone-500 font-medium">Anticipo:</span>
                                  <span className="font-mono font-semibold text-stone-700">
                                    {formatCurrency(order.deposit || 0)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-xs pt-1 border-t border-stone-100">
                                  <span className="font-bold text-rose-700 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block"></span>
                                    <span>Por cobrar:</span>
                                  </span>
                                  <span className="font-mono font-bold text-rose-700 text-xs">
                                    {formatCurrency(order.remainingBalance)}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* COLUMNA 4: Botonera Cuadrada, Fija y Alineada (xl:col-span-3) */}
                      <div
                        className="md:col-span-1 xl:col-span-3 min-w-0 flex flex-col justify-between gap-2 h-full py-0.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Fila 1: Botón Principal de Flujo Operativo */}
                        {!isConcludedOrHistory ? (
                          order.remainingBalance > 0 ? (
                            /* Tiene saldo pendiente -> Botón de Cobro Destacado + Botón de Listo */
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedOrderForPayment(order)}
                                className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer truncate font-mono"
                                title={`Abonar a cuenta o liquidar saldo de ${formatCurrency(order.remainingBalance)}`}
                              >
                                <DollarSign className="w-3.5 h-3.5 shrink-0" />
                                <span className="font-mono tabular-nums truncate">Abonar {formatCurrency(order.remainingBalance)}</span>
                              </button>

                              {order.status !== "listo" ? (
                                <button
                                  type="button"
                                  onClick={() => handleMarkAsReady(order)}
                                  className="py-2 px-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-2xs shrink-0"
                                  title="Marcar que el pedido ya llegó y está listo en sucursal"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0" />
                                  <span>Listo</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleToggleReady(order)}
                                  className="py-2 px-3 bg-emerald-50 hover:bg-emerald-100 active:scale-[0.98] text-emerald-800 border border-emerald-200 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-2xs shrink-0"
                                  title="El pedido ya está en sucursal. Haz clic si deseas regresarlo a 'En preparación'."
                                >
                                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span>En Tienda</span>
                                </button>
                              )}
                            </div>
                          ) : (
                            /* 100% Liquidado -> Botón 'Entregar Pedido' (Se ilumina solo si ya está listo en sucursal) */
                            <div className="flex items-center gap-2">
                              {order.status !== "listo" ? (
                                <button
                                  type="button"
                                  onClick={() => handleDeliverOrder(order)}
                                  className="flex-1 py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-400 hover:text-stone-600 border border-stone-200 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap font-mono"
                                  title="Primero presiona el botón azul 'Listo' para confirmar que ya llegó a la sucursal"
                                >
                                  <Lock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                                  <span>Entregar (Falta llegada)</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleDeliverOrder(order)}
                                  className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap font-mono ring-1 ring-emerald-400"
                                  title="Entregar pedido al cliente y archivarlo en el Historial"
                                >
                                  <PackageCheck className="w-4 h-4 shrink-0 text-white" />
                                  <span>Entregar Pedido</span>
                                </button>
                              )}

                              {order.status !== "listo" ? (
                                <button
                                  type="button"
                                  onClick={() => handleMarkAsReady(order)}
                                  className="py-2 px-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-2xs shrink-0"
                                  title="Marcar que ya llegó a la sucursal (Botón azul)"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0" />
                                  <span>Listo</span>
                                </button>
                              ) : (
                                <span className="py-2 px-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-xs rounded-xl flex items-center gap-1 shrink-0">
                                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span>En Tienda</span>
                                </span>
                              )}
                            </div>
                          )
                        ) : (
                          /* Si ya está en historial */
                          <div
                            className={`w-full py-2 px-3 text-center font-black text-xs rounded-xl border shadow-xs flex items-center justify-center gap-1.5 ${
                              order.status === "entregado"
                                ? "bg-sky-600 text-white border-sky-700"
                                : "bg-red-600 text-white border-red-700 ring-2 ring-red-500/25"
                            }`}
                          >
                            {order.status === "entregado" ? (
                              <>
                                <PackageCheck className="w-4 h-4 text-sky-100 shrink-0" />
                                <span>Pedido Entregado (Historial)</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-4 h-4 text-red-100 shrink-0" />
                                <span>Pedido Cancelado (Historial)</span>
                              </>
                            )}
                          </div>
                        )}

                        {/* Fila 2: Botonera Secundaria Cuadrada y Uniforme */}
                        <div className={`grid ${isAdmin && order.status !== "entregado" ? "grid-cols-4" : "grid-cols-3"} gap-1.5`}>
                          <button
                            type="button"
                            onClick={() => setSelectedOrderForReceipt(order)}
                            className="py-1.5 px-1 bg-white hover:bg-stone-50 active:scale-95 text-stone-700 hover:text-stone-900 border border-stone-200 hover:border-stone-300 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                            title="Imprimir Ticket"
                          >
                            <Receipt className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                            <span>Ticket</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSendWhatsApp(order)}
                            className="py-1.5 px-1 bg-white hover:bg-emerald-50/50 active:scale-95 text-stone-700 hover:text-emerald-700 border border-stone-200 hover:border-emerald-300 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                            title="Enviar WhatsApp al cliente"
                          >
                            <Send className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>WA</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedOrderForDetail(order)}
                            className="py-1.5 px-1 bg-white hover:bg-amber-50/50 active:scale-95 text-stone-700 hover:text-amber-800 border border-stone-200 hover:border-amber-300 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                            title="Ver detalles completos del pedido"
                          >
                            <Eye className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>Ver</span>
                          </button>

                          {isAdmin && order.status !== "entregado" && (
                            !isConcludedOrHistory ? (
                              <button
                                type="button"
                                onClick={() => handleDarDeBaja(order)}
                                className="py-1.5 px-1 bg-white hover:bg-rose-50/50 active:scale-95 text-stone-700 hover:text-rose-700 border border-stone-200 hover:border-rose-300 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                                title="Dar de baja este pedido"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                <span>Baja</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleDeletePermanent(order.id, order.orderNumber, order.customerName)}
                                className="py-1.5 px-1 bg-red-50 hover:bg-red-600 active:scale-95 text-red-700 hover:text-white border border-red-300 hover:border-red-600 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                                title="Eliminar permanentemente del historial"
                              >
                                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                                <span>Borrar</span>
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* FORMATO DE CUADRÍCULA DE FICHAS POR PEDIDO - DISEÑO MODERNO Y ADAPTABLE */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3 min-[1800px]:grid-cols-4 gap-4 sm:gap-5">
              {filteredOrders.map((order) => {
                const isOverdue = checkIsOverdue(order);
                const isReady = checkIsReadyNotDelivered(order);
                const isUpcoming = checkIsUpcoming(order);
                const isPending = checkIsPending(order);
                const isConcludedOrHistory = classificationFilter === "historial" || order.status === "entregado" || order.status === "cancelado";
                const totalPieces = order.items && order.items.length > 0
                  ? order.items.reduce((sum, item) => sum + (item.quantity || 0), 0)
                  : 1;
                const creationInfo = formatOrderCreation(order);
                const deliveryInfo = formatDeliveryDateDisplay(order.deliveryDate);

                return (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrderForDetail(order)}
                    className={`rounded-3xl border transition-all duration-200 shadow-xs hover:shadow-xl cursor-pointer flex flex-col justify-between group overflow-hidden ${
                      order.status === "cancelado"
                        ? "border-2 border-red-500 bg-red-50/85 ring-2 ring-red-400/35 hover:border-red-600 shadow-sm"
                        : order.status === "entregado"
                        ? "border-2 border-sky-300 bg-sky-50/80 ring-2 ring-sky-200/60 hover:border-sky-400 shadow-sm"
                        : isOverdue
                        ? "bg-white border-rose-400 bg-rose-50/10 ring-2 ring-rose-400/20 hover:border-rose-500"
                        : isReady
                        ? "bg-white border-emerald-300 bg-emerald-50/10 hover:border-emerald-400"
                        : isUpcoming
                        ? "bg-white border-amber-300 bg-amber-50/10 hover:border-amber-400"
                        : "bg-white border-stone-200/90 hover:border-amber-400 hover:shadow-amber-500/5"
                    }`}
                  >
                    {/* Cuerpo de la Tarjeta */}
                    <div className="p-4 sm:p-5 space-y-3.5">
                      {/* 1. Header: Folio, Sucursal, Urgencia y Estado */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-black text-xs text-stone-900 bg-stone-100 border border-stone-300 px-2.5 py-1 rounded-xl shadow-2xs">
                            {order.orderNumber}
                          </span>
                          {order.operatingBranchName && order.branchName && order.operatingBranchName !== order.branchName ? (
                            <span className="text-[10px] font-bold text-stone-700 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                              <span>🏬 Levantado: {order.operatingBranchName.replace("Sucursal ", "")}</span>
                              <span className="text-amber-600 font-bold">➔</span>
                              <span className="text-stone-900 font-bold">Entrega: {order.branchName.replace("Sucursal ", "")}</span>
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-stone-600 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                              🏬 {order.branchName.replace("Sucursal ", "")}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          {isOverdue && !isConcludedOrHistory && (
                            <span className="text-[10px] font-black text-rose-900 bg-rose-100 border border-rose-300 px-2.5 py-0.5 rounded-lg inline-flex items-center gap-1 animate-pulse">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              No han pasado
                            </span>
                          )}
                          {isUpcoming && !isOverdue && !isConcludedOrHistory && (
                            <span className="text-[10px] font-black text-amber-950 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-lg inline-flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-700" />
                              Entrega Hoy
                            </span>
                          )}
                          {getStatusBadge(order.status)}
                        </div>
                      </div>

                      {/* Día y Hora exacta en que se alzó el pedido */}
                      <div
                        className="p-1.5 px-2.5 rounded-xl bg-stone-50 border border-stone-200 text-stone-700 shadow-2xs flex items-center justify-between gap-2"
                        title={`Pedido registrado el: ${creationInfo.fullDateStr}`}
                      >
                        <div className="flex items-center gap-1.5 text-stone-600 font-medium text-[11px]">
                          <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span>Alzado:</span>
                          <span className="font-bold text-stone-800">{creationInfo.shortDateStr}</span>
                        </div>
                        <span className="font-mono tabular-nums font-bold text-stone-800 bg-white border border-stone-200 px-2 py-0.5 rounded-md text-[11px] shadow-2xs">
                          {creationInfo.exactTimeStr}
                        </span>
                      </div>

                      {/* 2. Resumen: Piezas y Total del Pedido */}
                      <div className="flex items-center justify-between gap-3 bg-stone-50/90 p-2.5 px-3.5 rounded-2xl border border-stone-200/80">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="bg-amber-600 text-white font-mono font-black text-xs px-2.5 py-1 rounded-xl shadow-2xs shrink-0">
                            {totalPieces} {totalPieces === 1 ? "pza" : "pzas"}
                          </span>
                          <span className="text-xs font-bold text-stone-700 truncate">
                            {order.items && order.items.length > 1
                              ? `${order.items.length} productos en el pedido`
                              : order.items && order.items.length === 1
                              ? order.items[0].name
                              : order.description || "1 producto encargado"}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[9px] font-black uppercase text-stone-400 block leading-none mb-0.5">Total</span>
                          <span className="font-mono font-black text-base sm:text-lg text-stone-900 leading-none">
                            {formatCurrency(order.total)}
                          </span>
                        </div>
                      </div>

                      {/* 3. Desglose de Productos (Máx 2 visibles por defecto) */}
                      {(() => {
                        const isExpanded = Boolean(expandedProductsOrderIds[order.id]);
                        const orderItems = order.items || [];
                        const hasItems = orderItems.length > 0;
                        const hasMoreThanTwo = orderItems.length > 2;
                        const itemsToShow = isExpanded ? orderItems : orderItems.slice(0, 2);

                        return (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-1 text-[11px]">
                              <span className="font-extrabold text-stone-600 uppercase tracking-wide flex items-center gap-1.5">
                                <Cake className="w-3.5 h-3.5 text-amber-600" />
                                <span>Productos {hasItems ? `(${orderItems.length})` : ""}:</span>
                              </span>
                              {hasMoreThanTwo && (
                                <button
                                  type="button"
                                  onClick={(e) => toggleOrderProductsExpanded(order.id, e)}
                                  className={`text-[10px] font-black px-2.5 py-0.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 shadow-2xs leading-none ${
                                    isExpanded
                                      ? "bg-amber-600 text-white border-amber-700 hover:bg-amber-700"
                                      : "bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300"
                                  }`}
                                  title={isExpanded ? "Mostrar menos productos" : "Desplegar todos los productos del pedido"}
                                >
                                  <span>{isExpanded ? "Ver menos" : "Ver más"}</span>
                                </button>
                              )}
                            </div>

                            {hasItems ? (
                              <div className="space-y-1">
                                {itemsToShow.map((it, idx) => (
                                  <div key={idx} className="bg-amber-50/50 border border-amber-200/70 rounded-xl px-3 py-1.5 text-xs shadow-2xs flex items-center justify-between gap-2">
                                    <span className="font-bold text-stone-800 truncate text-[11px] sm:text-xs">
                                      <span className="text-amber-800 font-black mr-1.5 font-mono">{it.quantity}x</span>
                                      {it.name}
                                    </span>
                                    {it.subtotal ? (
                                      <span className="font-mono font-bold text-stone-600 text-[11px] shrink-0">
                                        {formatCurrency(it.subtotal)}
                                      </span>
                                    ) : null}
                                  </div>
                                ))}

                                {hasMoreThanTwo && !isExpanded && (
                                  <button
                                    type="button"
                                    onClick={(e) => toggleOrderProductsExpanded(order.id, e)}
                                    className="w-full py-1 px-2 bg-amber-50 hover:bg-amber-100 text-amber-900 text-[11px] font-bold rounded-xl border border-amber-200 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                                  >
                                    <span>+ {orderItems.length - 2} producto{orderItems.length - 2 > 1 ? "s" : ""} más</span>
                                  </button>
                                )}

                                {isExpanded && (
                                  <button
                                    type="button"
                                    onClick={(e) => toggleOrderProductsExpanded(order.id, e)}
                                    className="w-full pt-1 text-[11px] font-bold text-amber-800 hover:text-amber-950 flex items-center justify-center cursor-pointer transition-colors"
                                  >
                                    <span>Mostrar solo 2</span>
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-2.5 text-xs">
                                <p className="text-stone-700 font-medium line-clamp-2">
                                  {order.description || "Especificaciones estándar del producto."}
                                </p>
                              </div>
                            )}

                            {/* Dedicatoria */}
                            {order.dedication && (isExpanded || !hasMoreThanTwo) && (
                              <div className="bg-rose-50/70 border border-rose-200/80 rounded-xl px-3 py-1.5 text-xs flex items-center gap-1.5 animate-in fade-in duration-150">
                                <Sparkles className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                <p className="font-bold text-rose-950 italic text-[11px] truncate">
                                  &quot;{order.dedication}&quot;
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Observaciones / Empaque */}
                      {(() => {
                        const { cleanNotes } = extractOrderOriginAndNotes(order);
                        if (!cleanNotes) return null;
                        return (
                          <div className="bg-stone-50 border border-stone-200/80 rounded-xl px-3 py-1.5 text-stone-800 text-xs">
                            <span className="text-[10px] font-extrabold text-stone-400 uppercase tracking-wider block">
                              📌 Observaciones:
                            </span>
                            <p className="text-[11px] font-medium text-stone-700 truncate">
                              {cleanNotes}
                            </p>
                          </div>
                        );
                      })()}

                      {/* Banner Centrado de Estado: ENTREGADO o CANCELADO */}
                      {order.status === "entregado" && (
                        <div className="py-2 px-3 rounded-2xl bg-sky-100/90 border border-sky-300 text-sky-950 flex items-center justify-center gap-2 shadow-2xs animate-in fade-in">
                          <PackageCheck className="w-4 h-4 text-sky-700 shrink-0" />
                          <span className="font-black text-xs sm:text-sm tracking-wider uppercase">ENTREGADO</span>
                        </div>
                      )}

                      {order.status === "cancelado" && (
                        <div className="py-2 px-3 rounded-2xl bg-rose-100/90 border border-rose-300 text-rose-950 flex items-center justify-center gap-2 shadow-2xs animate-in fade-in">
                          <XCircle className="w-4 h-4 text-rose-700 shrink-0" />
                          <span className="font-black text-xs sm:text-sm tracking-wider uppercase">CANCELADO</span>
                        </div>
                      )}

                      {/* 4. Datos de Entrega, Cliente y Cobro */}
                      <div className="bg-stone-50/90 rounded-2xl p-3 border border-stone-200/80 space-y-2">
                        {/* Fecha y Hora de Entrega Programada */}
                        <div className="flex items-center justify-between gap-2 border-b border-stone-200/60 pb-1.5 text-xs">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            {deliveryInfo.isToday ? (
                              <span className="font-extrabold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 shadow-2xs animate-pulse">
                                ¡ENTREGA HOY!
                              </span>
                            ) : deliveryInfo.isTomorrow ? (
                              <span className="font-extrabold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                Mañana ({deliveryInfo.formattedDate})
                              </span>
                            ) : (
                              <span className="font-extrabold text-stone-800">
                                {deliveryInfo.formattedDate}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 font-bold text-stone-600">
                            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>{order.deliveryTime || "16:00"} hrs</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-extrabold text-stone-400 uppercase tracking-wider block">Cliente:</span>
                            <strong className="text-xs sm:text-sm font-black text-stone-900 block truncate" title={order.customerName}>
                              {order.customerName}
                            </strong>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[10px] font-extrabold text-stone-400 uppercase tracking-wider block">Cobro:</span>
                            {order.remainingBalance > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-black text-rose-800 font-mono bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-lg shadow-2xs">
                                <span className="text-[10px] font-bold text-rose-600">Falta:</span> {formatCurrency(order.remainingBalance)}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg shadow-2xs">
                                <Check className="w-3.5 h-3.5 text-emerald-600" /> Liquidado
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 5. Barra de Acciones Estructurada en 2 Niveles */}
                    <div
                      className="p-3 sm:p-3.5 pt-2.5 bg-stone-50/70 border-t border-stone-100 space-y-2 mt-auto"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Nivel 1: Acciones Operativas Principales */}
                      {!isConcludedOrHistory && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {/* Botón de uso único: Marcar Listo -> Se retira y cambia a "¡YA EN SUCURSAL!" */}
                          {order.status !== "listo" ? (
                            <button
                              type="button"
                              onClick={() => handleMarkAsReady(order)}
                              className="w-full py-2 px-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                              title="Marcar que el pedido ya llegó físicamente y está listo en sucursal (uso único)"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Marcar Listo</span>
                            </button>
                          ) : (
                            <div
                              className="w-full py-2 px-2.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white border border-amber-300 ring-2 ring-amber-300/80 font-black text-xs rounded-xl shadow-md shadow-emerald-500/25 flex items-center justify-center gap-1.5 whitespace-nowrap select-none"
                              title="Este pedido ya fue marcado como listo y ya se encuentra en sucursal"
                            >
                              <Store className="w-4 h-4 text-amber-200 shrink-0 animate-bounce" />
                              <span className="tracking-wide uppercase">¡YA EN SUCURSAL!</span>
                            </div>
                          )}

                          {/* Botón: Pagar Restante si tiene saldo pendiente */}
                          {order.remainingBalance > 0 ? (
                            <button
                              type="button"
                              onClick={() => setSelectedOrderForPayment(order)}
                              className="w-full py-2 px-2.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-stone-950 font-black text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                              title={`Abonar a cuenta o liquidar saldo de ${formatCurrency(order.remainingBalance)}`}
                            >
                              <DollarSign className="w-4 h-4" />
                              <span>Abonar / Liquidar {formatCurrency(order.remainingBalance)}</span>
                            </button>
                          ) : order.status !== "listo" ? (
                            <button
                              type="button"
                              onClick={() => handleDeliverOrder(order)}
                              className="w-full py-2 px-2.5 bg-stone-100 hover:bg-stone-200 text-stone-400 hover:text-stone-600 border border-stone-200 font-black text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                              title="Primero presiona el botón azul 'Marcar Listo' para confirmar la llegada a sucursal"
                            >
                              <Lock className="w-4 h-4 text-stone-400 shrink-0" />
                              <span>Entregar (Falta llegada)</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleDeliverOrder(order)}
                              className="w-full py-2 px-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ring-1 ring-emerald-400"
                              title="Entregar pedido al cliente y archivarlo en Pedidos entregados con éxito"
                            >
                              <PackageCheck className="w-4 h-4 text-white shrink-0" />
                              <span>Entregar Pedido</span>
                            </button>
                          )}
                        </div>
                      )}

                      {/* Nivel 2: Barra de Utilidades (WhatsApp, Ticket, Eliminar y Ver Detalles) */}
                      <div className="flex items-center justify-between gap-1.5 pt-0.5">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSendWhatsApp(order)}
                            className="px-2.5 py-1.5 bg-white hover:bg-emerald-50 active:scale-95 text-emerald-800 border border-stone-200 hover:border-emerald-300 font-bold text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                            title="Mandar WhatsApp al cliente"
                          >
                            <Send className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="hidden sm:inline">WhatsApp</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedOrderForReceipt(order)}
                            className="px-2.5 py-1.5 bg-white hover:bg-amber-50 active:scale-95 text-stone-700 hover:text-stone-900 border border-stone-200 hover:border-amber-300 font-bold text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                            title="Imprimir Ticket"
                          >
                            <Receipt className="w-3.5 h-3.5 text-amber-700" />
                            <span className="hidden sm:inline">Ticket</span>
                          </button>

                          {!isConcludedOrHistory && isAdmin && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePermanent(order.id, order.orderNumber, order.customerName);
                              }}
                              className="p-1.5 sm:px-2 bg-white hover:bg-rose-50 active:scale-95 text-rose-600 hover:text-rose-700 border border-stone-200 hover:border-rose-200 font-bold text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                              title="Eliminar este pedido permanentemente"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="hidden md:inline">Eliminar</span>
                            </button>
                          )}
                        </div>

                        {/* Botón Ver Detalles */}
                        <button
                          type="button"
                          onClick={() => setSelectedOrderForDetail(order)}
                          className="px-3 py-1.5 bg-stone-900 hover:bg-amber-600 text-white font-black text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer shadow-xs active:scale-95 ml-auto"
                        >
                          <span>Detalles</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* ============================================================ */
          /* LIST / TABLE VIEW: CLEAN, ELEGANT, ORDERED */
          /* ============================================================ */
          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1250px] text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-100/90 border-b border-stone-200 text-stone-600 font-extrabold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-4">Folio</th>
                  <th className="py-2.5 px-3">Fecha y Hora Entrega</th>
                  <th className="py-2.5 px-3">Cliente</th>
                  <th className="py-2.5 px-3">Sucursal</th>
                  <th className="py-2.5 px-3">Productos Encargados</th>
                  <th className="py-2.5 px-3">Estado</th>
                  <th className="py-2.5 px-3">Total / Anticipo</th>
                  <th className="py-2.5 px-3">Falta por Liquidar</th>
                  <th className="py-2.5 px-4 text-center whitespace-nowrap min-w-[390px]">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredOrders.map((order) => {
                  const orderDate = normalizeDateStr(order.deliveryDate);
                  const isToday = orderDate === todayStr;
                  const isTomorrow = orderDate === tomorrowStr;
                  const isExpanded = expandedRowId === order.id;

                  const isOverdue = checkIsOverdue(order);
                  const isUpcoming = checkIsUpcoming(order);
                  const isReadyNotDelivered = checkIsReadyNotDelivered(order);
                  const isPending = checkIsPending(order);
                  const isUnpaid = checkIsUnpaid(order);
                  const isConcludedOrHistory = classificationFilter === "historial" || order.status === "entregado" || order.status === "cancelado";
                  const creationInfo = formatOrderCreation(order);
                  const deliveryInfo = formatDeliveryDateDisplay(order.deliveryDate);

                  return (
                    <React.Fragment key={order.id}>
                      <tr
                        className={`transition-all duration-150 group cursor-pointer hover:shadow-xs border-l-4 ${
                          order.status === "cancelado"
                            ? "bg-red-50/85 border-l-red-600 hover:bg-red-100/85"
                            : order.status === "entregado"
                            ? "bg-sky-50/80 border-l-sky-500 hover:bg-sky-100/80"
                            : isOverdue
                            ? "bg-rose-50/35 border-l-rose-500 hover:bg-rose-100/60"
                            : isReadyNotDelivered
                            ? "bg-emerald-50/20 border-l-emerald-500 hover:bg-emerald-100/50"
                            : isUpcoming
                            ? "bg-blue-50/20 border-l-blue-500 hover:bg-blue-100/50"
                            : isPending
                            ? "bg-amber-50/20 border-l-amber-500 hover:bg-amber-100/50"
                            : "border-l-transparent hover:bg-amber-100/60"
                        }`}
                        onClick={() => setSelectedOrderForDetail(order)}
                      >
                        {/* 1. Folio */}
                        <td className="py-2 px-4 font-mono">
                          <div className="flex flex-col items-start gap-1">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-xs text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl shadow-2xs">
                                {order.orderNumber}
                              </span>
                              {isToday && order.status !== "entregado" && (
                                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" title="Entrega Hoy" />
                              )}
                            </div>
                            {/* Fecha y hora exacta de registro / levantado */}
                            <div
                              className="flex items-center gap-1 text-[10px] text-amber-900 bg-amber-50/90 border border-amber-200/90 px-1.5 py-0.5 rounded shadow-2xs font-sans"
                              title={`Pedido registrado el: ${creationInfo.fullDateStr}`}
                            >
                              <Clock className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                              <span className="font-bold">{creationInfo.fullBadgeStr}</span>
                            </div>
                            {isOverdue && (
                              <span className="text-[10px] font-black text-rose-800 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded-lg animate-pulse inline-flex items-center gap-1 shadow-2xs">
                                ⚠️ NO HAN PASADO
                              </span>
                            )}
                            {!isOverdue && isUpcoming && (
                              <span className="text-[10px] font-black text-blue-800 bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-lg inline-flex items-center gap-1 shadow-2xs">
                                ⏰ PRÓXIMO HOY
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 2. Fecha y hora */}
                        <td className="py-2 px-3">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-stone-400" />
                              <span className={`font-bold text-xs ${
                                isToday && order.status !== "entregado"
                                  ? "text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md font-black"
                                  : isTomorrow && order.status !== "entregado"
                                  ? "text-amber-800 font-black"
                                  : "text-stone-900"
                              }`}>
                                {isToday ? "¡HOY!" : isTomorrow ? "Mañana" : deliveryInfo.formattedDate}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-stone-500 pl-5">
                              <Clock className="w-3 h-3 text-stone-400" />
                              <span>{order.deliveryTime || "16:00"} hrs</span>
                              {order.deliveryType === "domicilio" && (
                                <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-1.5 py-0.2 rounded">
                                  Envío
                                </span>
                              )}
                            </div>
                            {isOverdue && (
                              <div className="pl-5 pt-0.5">
                                <span className="text-[10px] font-black text-red-800 bg-red-100 border border-red-300 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                                  ⚠️ Hora vencida (No pasó)
                                </span>
                              </div>
                            )}
                            {!isOverdue && isUpcoming && (
                              <div className="pl-5 pt-0.5">
                                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                                  ⏰ Próximo a entregar
                                </span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 3. Cliente */}
                        <td className="py-2 px-3">
                          <div className="space-y-0.5">
                            <strong className="font-extrabold text-stone-900 text-xs block">
                              {order.customerName}
                            </strong>
                            <div className="flex items-center gap-1.5 text-[11px] text-stone-500">
                              <Phone className="w-3 h-3 text-stone-400" />
                              <span>{order.phone}</span>
                            </div>
                          </div>
                        </td>

                        {/* 4. Sucursal */}
                        <td className="py-2 px-3">
                          {order.operatingBranchName && order.branchName && order.operatingBranchName !== order.branchName ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                Lev: {order.operatingBranchName.replace("Sucursal ", "")}
                              </span>
                              <span className="text-[10px] font-bold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                Ent: {order.branchName.replace("Sucursal ", "")}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs font-bold text-stone-700 bg-stone-100 px-2.5 py-1 rounded-xl">
                              {order.branchName.replace("Sucursal ", "")}
                            </span>
                          )}
                        </td>

                        {/* 5. Productos Encargados & Características */}
                        <td className="py-2 px-3 max-w-sm">
                          {order.items && order.items.length > 0 ? (
                            <div className="space-y-1">
                              {order.items.slice(0, 3).map((it, idx) => (
                                <div key={idx} className="text-xs">
                                  <div className="font-bold text-stone-900 flex items-baseline gap-1">
                                    <span className="font-mono text-[11px] text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded font-black">
                                      {it.quantity}x
                                    </span>
                                    <span className="line-clamp-1">{it.name}</span>
                                  </div>
                                  {it.notes && (
                                    <p className="text-[11px] text-amber-900 font-semibold italic pl-4 line-clamp-1">
                                      🧁 {it.notes}
                                    </p>
                                  )}
                                </div>
                              ))}
                              {order.items.length > 3 && (
                                <span className="text-[10px] text-stone-500 font-bold block">
                                  +{order.items.length - 3} producto(s) más...
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="text-xs text-stone-800 font-bold line-clamp-2">
                              {order.description || "Pedido Encargado"}
                            </div>
                          )}

                          {order.dedication && (
                            <div className="text-[10px] text-rose-900 bg-rose-50/80 border border-rose-200/80 rounded-md px-2 py-0.5 font-bold flex items-center gap-1 mt-1.5">
                              <Sparkles className="w-3 h-3 text-rose-600 shrink-0" />
                              <span className="truncate">"{order.dedication}"</span>
                            </div>
                          )}
                        </td>

                        {/* 6. Estado */}
                        <td className="py-2 px-3">
                          {getStatusBadge(order.status)}
                          {isReadyNotDelivered && (
                            <div className="text-[10px] text-emerald-800 font-extrabold flex items-center gap-1 mt-1 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              <Package className="w-3 h-3 text-emerald-600" />
                              <span>No se lo han llevado</span>
                            </div>
                          )}
                          {isPending && (
                            <div className="text-[10px] text-amber-800 font-extrabold flex items-center gap-1 mt-1 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>Pendiente elaboración</span>
                            </div>
                          )}
                          {order.status === "entregado" && (
                            <div className="text-[10px] text-teal-700 font-bold flex items-center gap-1 mt-1 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                              <Check className="w-3 h-3 text-teal-600" />
                              <span>Ya entregado</span>
                            </div>
                          )}
                          {order.status === "cancelado" && (
                            <div className="text-[10px] text-rose-700 font-bold flex flex-col gap-0.5 mt-1 bg-rose-50 px-2 py-1 rounded-md border border-rose-200">
                              <span>✕ Dado de baja</span>
                              {extractOrderOriginAndNotes(order).cancelReason && (
                                <span className="text-[9px] text-rose-900 font-semibold leading-tight">
                                  {extractOrderOriginAndNotes(order).cancelReason}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* 7. Total y Anticipo */}
                        <td className="py-2 px-3 font-mono">
                          <div className="text-xs font-black text-stone-900">
                            {formatCurrency(order.total)}
                          </div>
                          <div className="text-[10px] text-emerald-700 font-bold">
                            Anticipo: {formatCurrency(order.deposit)}
                          </div>
                        </td>

                        {/* 8. Falta por Liquidar */}
                        <td className="py-2 px-3 font-mono">
                          <span
                            className={`inline-block font-black text-xs px-2.5 py-1 rounded-xl ${
                              order.remainingBalance === 0
                                ? "text-emerald-700 bg-emerald-50 border border-emerald-200"
                                : "text-rose-700 bg-rose-50 border border-rose-200 font-extrabold"
                            }`}
                          >
                            {order.remainingBalance === 0 ? "¡Liquidado!" : formatCurrency(order.remainingBalance)}
                          </span>
                          {isUnpaid && (
                            <span className="text-[10px] text-rose-700 font-extrabold block mt-1">
                              💰 Falta por pagar
                            </span>
                          )}
                          {!isUnpaid && order.status !== "cancelado" && (
                            <span className="text-[10px] text-emerald-700 font-semibold block mt-1">
                              ✓ 100% Pagado
                            </span>
                          )}
                        </td>

                        {/* 9. Acciones en Letras */}
                        <td
                          className="py-2 px-4 text-right whitespace-nowrap min-w-[390px]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                            {/* Botón de uso único: Marcar como Listo -> Se retira y cambia a "¡YA EN SUCURSAL!" */}
                            {!isConcludedOrHistory && (
                              order.status !== "listo" ? (
                                <button
                                  type="button"
                                  onClick={() => handleMarkAsReady(order)}
                                  className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                                  title="Marcar que el pedido ya llegó físicamente y está listo en sucursal (uso único)"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Marcar Listo</span>
                                </button>
                              ) : (
                                <div
                                  className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white border border-amber-300 ring-2 ring-amber-300/80 font-black text-xs rounded-xl shadow-md shadow-emerald-500/25 flex items-center gap-1.5 whitespace-nowrap select-none"
                                  title="Este pedido ya fue marcado como listo y ya se encuentra en sucursal"
                                >
                                  <Store className="w-3.5 h-3.5 text-amber-200 shrink-0 animate-bounce" />
                                  <span className="tracking-wide uppercase">¡YA EN SUCURSAL!</span>
                                </div>
                              )
                            )}

                            {/* 1. Ticket térmico */}
                            <button
                              type="button"
                              onClick={() => setSelectedOrderForReceipt(order)}
                              className="px-2.5 py-1.5 bg-stone-100 hover:bg-amber-100 active:scale-95 text-stone-800 hover:text-amber-950 border border-stone-200 hover:border-amber-300 font-black text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-2xs"
                              title="Imprimir Ticket Térmico"
                            >
                              <Receipt className="w-3.5 h-3.5 text-stone-600" />
                              <span>Ticket</span>
                            </button>

                            {/* 2. Abonar / Liquidar si tiene saldo pendiente, o Entregar Pedido si ya está 100% liquidado */}
                            {!isConcludedOrHistory && (
                              order.remainingBalance > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => setSelectedOrderForPayment(order)}
                                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-2xs"
                                  title={`Abonar a cuenta o liquidar saldo de ${formatCurrency(order.remainingBalance)}`}
                                >
                                  <DollarSign className="w-3.5 h-3.5" />
                                  <span>Abonar / Liquidar ({formatCurrency(order.remainingBalance)})</span>
                                </button>
                              ) : order.status !== "listo" ? (
                                <button
                                  type="button"
                                  onClick={() => handleDeliverOrder(order)}
                                  className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-400 hover:text-stone-600 border border-stone-200 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-2xs"
                                  title="Primero presiona el botón azul 'Marcar Listo' para confirmar la llegada a sucursal"
                                >
                                  <Lock className="w-3.5 h-3.5 text-stone-400" />
                                  <span>Entregar (Falta llegada)</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleDeliverOrder(order)}
                                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-2xs ring-1 ring-emerald-400"
                                  title="Entregar pedido al cliente y archivarlo en Pedidos entregados con éxito"
                                >
                                  <PackageCheck className="w-3.5 h-3.5 text-white" />
                                  <span>Entregar Pedido</span>
                                </button>
                              )
                            )}

                            {/* 3. WhatsApp */}
                            <button
                              type="button"
                              onClick={() => handleSendWhatsApp(order)}
                              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-600 active:scale-95 text-emerald-800 hover:text-white border border-emerald-200 hover:border-emerald-600 font-black text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-2xs"
                              title="Enviar recordatorio / aviso por WhatsApp"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>WhatsApp</span>
                            </button>

                            {/* 4. Editar (disponible para todos los pedidos activos en catálogo - solo administradores) */}
                            {!isConcludedOrHistory && isAdmin && (
                              <button
                                type="button"
                                onClick={() => setSelectedOrderForEdit(order)}
                                className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-800 border border-stone-200 hover:border-stone-300 font-black text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-2xs"
                                title="Editar pedido"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-stone-600" />
                                <span>Editar</span>
                              </button>
                            )}

                            {/* 5. Eliminar Pedido (solo pedidos activos - solo administradores) */}
                            {!isConcludedOrHistory && isAdmin && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeletePermanent(order.id, order.orderNumber, order.customerName);
                                }}
                                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-600 active:scale-95 text-rose-700 hover:text-white border border-rose-200 hover:border-rose-600 font-black text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-2xs"
                                title="Eliminar Pedido"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Eliminar</span>
                              </button>
                            )}

                            {/* 6. Pantalla de detalles del pedido */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedOrderForDetail(order);
                              }}
                              className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 active:scale-95 text-amber-950 hover:text-stone-950 border border-amber-300 hover:border-amber-400 font-black text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap shadow-2xs group"
                              title="Abrir pantalla con todos los detalles del pedido"
                            >
                              <Eye className="w-3.5 h-3.5 text-amber-700" />
                              <span>Detalles</span>
                              <ChevronRight className="w-3.5 h-3.5 text-amber-700" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded row with full product breakdown & details */}
                      {isExpanded && (
                        <tr className="bg-amber-50/30 border-b border-stone-200 animate-in fade-in duration-150">
                          <td colSpan={9} className="p-5 px-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                              
                              {/* Col 1: Itemized list */}
                              <div className="space-y-2 bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs flex flex-col justify-between transition-all duration-200 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/15 hover:ring-2 hover:ring-amber-400/30">
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-extrabold uppercase text-stone-400 tracking-wider block">
                                      Desglose de Productos
                                    </span>
                                    {order.items && order.items.length > 0 && (
                                      <span className="text-[10px] font-bold text-stone-400">
                                        {order.items.length} {order.items.length === 1 ? "artículo" : "artículos"}
                                      </span>
                                    )}
                                  </div>
                                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                    {order.items && order.items.length > 0 ? (
                                      order.items.map((it, idx) => (
                                        <div key={idx} className="space-y-0.5 border-b border-stone-100 pb-1.5 last:border-none hover:bg-amber-50/60 px-2 py-1 rounded-xl transition-colors">
                                          <div className="flex justify-between font-bold text-stone-900">
                                            <span>{it.quantity}x {it.name}</span>
                                            <span className="font-mono">{formatCurrency(it.subtotal)}</span>
                                          </div>
                                          {it.notes && (
                                            <p className="text-[11px] text-stone-500 italic pl-3">↳ {it.notes}</p>
                                          )}
                                        </div>
                                      ))
                                    ) : (
                                      <div className="text-stone-700 font-medium py-1">
                                        {order.description || "Sin desglose de productos"}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Col 2: Observaciones & Delivery address */}
                              <div className="space-y-2.5 bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs flex flex-col justify-between transition-all duration-200 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/15 hover:ring-2 hover:ring-amber-400/30">
                                <div className="space-y-2.5">
                                  <span className="text-[10px] font-extrabold uppercase text-stone-400 tracking-wider block">
                                    Detalles de Entrega & Observaciones
                                  </span>
                                  {order.dedication ? (
                                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-amber-950 hover:bg-amber-100/60 hover:border-amber-300 transition-colors">
                                      <strong className="block text-[10px] text-amber-800 uppercase">📝 Observaciones:</strong>
                                      <span className="italic font-bold">"{order.dedication}"</span>
                                    </div>
                                  ) : (
                                    <p className="text-stone-400 italic">Sin observaciones especiales especificadas.</p>
                                  )}

                                  {order.deliveryType === "domicilio" ? (
                                    <div className="text-[11px] text-stone-700 bg-stone-50 p-2.5 rounded-xl border border-stone-200 hover:bg-amber-50/40 hover:border-amber-300 transition-colors">
                                      <strong className="block text-stone-900">🚚 Entrega a Domicilio:</strong>
                                      <span>{order.deliveryAddress || "Dirección pendiente"}</span>
                                    </div>
                                  ) : (
                                    <div className="text-[11px] text-stone-700 bg-stone-50 p-2.5 rounded-xl border border-stone-200 hover:bg-amber-50/40 hover:border-amber-300 transition-colors space-y-1">
                                      {order.operatingBranchName && order.operatingBranchName !== order.branchName && (
                                        <div className="flex items-center gap-1.5 font-bold text-amber-950">
                                          <span>📝 Levantado en:</span> <span className="font-black text-amber-900">{order.operatingBranchName}</span>
                                        </div>
                                      )}
                                      <div className="flex items-center gap-1.5 font-bold text-stone-900">
                                        <strong className="text-stone-900">🏬 Recoger en Tienda:</strong> {order.branchName}
                                      </div>
                                    </div>
                                  )}

                                  {(() => {
                                    const { cleanNotes } = extractOrderOriginAndNotes(order);
                                    if (!cleanNotes) return null;
                                    return (
                                      <div className="bg-amber-100/80 border-2 border-amber-400/90 rounded-xl p-3 text-amber-950 shadow-xs hover:bg-amber-100 hover:border-amber-500 hover:shadow-sm transition-all duration-150">
                                        <div className="flex items-center gap-1.5 text-amber-900 font-black text-[11px] uppercase tracking-wider mb-1">
                                          <span>📌</span>
                                          <span>Notas:</span>
                                        </div>
                                        <p className="text-xs font-bold text-amber-950 leading-relaxed pl-5">
                                          {cleanNotes}
                                        </p>
                                      </div>
                                    );
                                  })()}
                                </div>

                                <div className="pt-3 flex flex-wrap items-center justify-between gap-2 border-t-2 border-stone-200 mt-2.5">
                                  <span className="text-xs font-semibold text-stone-500">Atendió: {order.cashier}</span>
                                  <div className="flex items-center gap-2">
                                    {isAdmin && !isConcludedOrHistory && order.status !== "cancelado" && (
                                      <button
                                        type="button"
                                        onClick={() => handleCancelOrder(order.id)}
                                        className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                                        title="Marcar pedido como cancelado"
                                      >
                                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                        <span>Cancelar Pedido</span>
                                      </button>
                                    )}
                                    {isAdmin && !isConcludedOrHistory && (
                                      <button
                                        type="button"
                                        onClick={() => handleDeletePermanent(order.id, order.orderNumber, order.customerName)}
                                        className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black text-xs sm:text-sm rounded-xl shadow-md border-2 border-rose-700 flex items-center gap-2 transition-all cursor-pointer ring-2 ring-rose-300/50"
                                        title="Eliminar este pedido permanentemente"
                                      >
                                        <Trash2 className="w-4 h-4 text-white" />
                                        <span>ELIMINAR PEDIDO</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        )}
        </div>
      </div>

      {/* Modals */}
      <CreateOrderModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        initialBranchId={effectiveBranchFilter !== "all" ? effectiveBranchFilter : currentBranch?.id}
        cashierName={user?.name || userBranch?.currentShift?.cashier || userBranch?.manager || "Don Toño Brito"}
        shiftName={userBranch?.currentShift?.name}
        onOrderCreated={(orderId) => {
          loadOrders();
          const created = getStoredOrders().find((o) => o.id === orderId);
          if (created) {
            setSelectedOrderForReceipt(created);
            if (
              isAdmin &&
              selectedBranchFilter !== "all" &&
              created.branchId !== selectedBranchFilter &&
              (created as any).operatingBranchId !== selectedBranchFilter
            ) {
              setSelectedBranchFilter("all");
            }
          }
        }}
      />

      <OrderPaymentModal
        isOpen={!!selectedOrderForPayment}
        onClose={() => {
          const currentOrd = selectedOrderForPayment
            ? getStoredOrders().find((item) => item.id === selectedOrderForPayment.id) || selectedOrderForPayment
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
          loadOrders();
          const targetId = selectedOrderForPayment?.id || selectedOrderForDetail?.id;
          if (targetId) {
            const updated = getStoredOrders().find((item) => item.id === targetId);
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

      <OrderReceiptModal
        isOpen={!!selectedOrderForReceipt}
        onClose={() => {
          const currentOrd = selectedOrderForReceipt
            ? getStoredOrders().find((item) => item.id === selectedOrderForReceipt.id) || selectedOrderForReceipt
            : null;
          setSelectedOrderForReceipt(null);
          if (currentOrd && !selectedOrderForDetail) {
            setSelectedOrderForDetail(currentOrd);
          }
        }}
        order={selectedOrderForReceipt}
      />

      <EditOrderModal
        isOpen={!!selectedOrderForEdit}
        onClose={() => {
          const currentOrd = selectedOrderForEdit
            ? getStoredOrders().find((item) => item.id === selectedOrderForEdit.id) || selectedOrderForEdit
            : null;
          setSelectedOrderForEdit(null);
          if (currentOrd && currentOrd.status !== "entregado" && currentOrd.status !== "cancelado") {
            setSelectedOrderForDetail(currentOrd);
          }
        }}
        order={selectedOrderForEdit}
        onOrderUpdated={() => {
          loadOrders();
        }}
      />

      <OrderDetailModal
        isOpen={!!selectedOrderForDetail && !selectedOrderForPayment && !selectedOrderForEdit && !selectedOrderForReceipt}
        onClose={() => setSelectedOrderForDetail(null)}
        order={selectedOrderForDetail}
        isHistoryMode={
          classificationFilter === "historial" ||
          (selectedOrderForDetail
            ? selectedOrderForDetail.status === "entregado" || selectedOrderForDetail.status === "cancelado"
            : false)
        }
        onPrintReceipt={(o) => {
          setSelectedOrderForReceipt(o);
        }}
        onOpenPayment={(o) => {
          setSelectedOrderForDetail(o);
          setSelectedOrderForPayment(o);
        }}
        onOpenEdit={isAdmin ? (o) => {
          setSelectedOrderForDetail(o);
          setSelectedOrderForEdit(o);
        } : undefined}
        onAdvanceStatus={(o) => {
          handleAdvanceStatus(o);
          loadOrders();
          const updated = getStoredOrders().find((item) => item.id === o.id);
          if (updated) {
            if (updated.status === "listo") {
              setReadyNotificationOrder(updated);
              setSelectedOrderForDetail(updated);
            } else if (updated.status === "entregado") {
              setSelectedOrderForDetail(null);
            } else {
              setSelectedOrderForDetail(updated);
            }
          }
        }}
        onDeliverOrder={(o) => {
          if (o.remainingBalance > 0) {
            alert(
              `⛔ No se puede entregar el pedido #${o.orderNumber}.\n\nTiene un saldo pendiente de ${formatCurrency(o.remainingBalance)}.\n\nPara poder entregarlo, primero debe estar 100% pagado sin faltante.`
            );
            setSelectedOrderForPayment(o);
            return;
          }
          const updatedOrd = updateOrderStatus(o.id, "entregado") || { ...o, status: "entregado" as const };
          loadOrders();
          const updated = getStoredOrders().find((item) => item.id === o.id) || updatedOrd;
          setSelectedOrderForDetail(null);
          const totalNum = Number(updated.total) || 0;
          const baseItemsDesc = updated.description ? `${updated.description}. ` : "";
          addNotification({
            id: `notif-order-${updated.id}`,
            title: `Pedido Entregado con Éxito: ${updated.orderNumber}${totalNum ? ` • Total $${totalNum.toFixed(2)}` : ""}`,
            description: `${baseItemsDesc}El pedido ${updated.orderNumber} de "${updated.customerName}" ha sido marcado como entregado exitosamente.`,
            senderName: `📦 Pedido Entregado (${updated.branchName || "Sucursal"})`,
            senderAvatar: "📦",
            highlightText: `${updated.customerName} • Entregado al Cliente`,
            category: "pedidos",
            badgeIcon: "pastel",
            orderId: updated.id,
            orderData: updated,
            branchId: updated.branchId,
            branchName: updated.branchName,
            operatingBranchId: updated.operatingBranchId,
            operatingBranchName: updated.operatingBranchName,
            actionLabel: "Ver Pedido Entregado",
            actionLink: "/pedidos",
          });
        }}
        onSendWhatsApp={(o) => {
          handleSendWhatsApp(o);
        }}
        onDarDeBaja={selectedOrderForDetail?.status !== "entregado" ? (o, reason) => {
          handleDarDeBaja(o, reason);
        } : undefined}
      />

      {/* Dashboard Independiente de Historial de Pedidos (Entregados y Cancelados) */}
      <OrderHistoryDashboardModal
        isOpen={isHistoryDashboardOpen}
        onClose={() => setIsHistoryDashboardOpen(false)}
        initialTab={historyDashboardTab}
        orders={orders}
        branches={branches}
        onViewOrderDetail={(order) => {
          setSelectedOrderForDetail(order);
        }}
        onPrintReceipt={(order) => {
          setSelectedOrderForReceipt(order);
        }}
        onOpenPayment={(order) => {
          setSelectedOrderForPayment(order);
        }}
        onSendWhatsApp={(order) => {
          handleSendWhatsApp(order);
        }}
        onRestoreOrder={(order) => {
          const confirmMsg = `¿Deseas reactivar el pedido ${order.orderNumber} (${order.customerName}) y regresarlo a la sección de pedidos activos?`;
          if (confirm(confirmMsg)) {
            const updatedOrd = updateOrderStatus(order.id, "listo") || { ...order, status: "listo" as const };
            loadOrders();
            const totalNum = Number(updatedOrd.total) || 0;
            const baseItemsDesc = updatedOrd.description ? `${updatedOrd.description}. ` : "";
            addNotification({
              id: `notif-order-${updatedOrd.id}`,
              title: `El producto ya está en sucursal: ${updatedOrd.orderNumber}${totalNum ? ` • Total $${totalNum.toFixed(2)}` : ""}`,
              description: `${baseItemsDesc}El pedido ${updatedOrd.orderNumber} de "${updatedOrd.customerName}" ha regresado a la sección de pedidos activos (Listo en Sucursal).`,
              senderName: `🎂 Listo en Sucursal (${updatedOrd.branchName || "Sucursal"})`,
              senderAvatar: "🎂",
              highlightText: `${updatedOrd.customerName} • Listo en Sucursal`,
              category: "pedidos",
              badgeIcon: "pastel",
              orderId: updatedOrd.id,
              orderData: updatedOrd,
              branchId: updatedOrd.branchId,
              branchName: updatedOrd.branchName,
              operatingBranchId: updatedOrd.operatingBranchId,
              operatingBranchName: updatedOrd.operatingBranchName,
              actionLabel: "Ver Detalle",
              actionLink: "/pedidos",
            });
          }
        }}
        onDeleteOrderPermanently={isAdmin ? (order) => {
          handleDarDeBaja(order);
        } : undefined}
      />

      {/* ── Mensaje Personalizado con Color: "El producto ya está en sucursal" ── */}
      {readyNotificationOrder && (
        <div
          className="fixed inset-0 bg-stone-950/65 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          onClick={() => setReadyNotificationOrder(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full shadow-2xl border-2 border-emerald-500/40 overflow-hidden animate-in zoom-in-95 duration-200 ring-8 ring-emerald-500/10 text-stone-900 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Botón Cerrar 'X' en la esquina */}
            <button
              type="button"
              onClick={() => setReadyNotificationOrder(null)}
              className="absolute top-3.5 right-3.5 z-10 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Cerrar aviso"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Encabezado con Gradiente Esmeralda y Animación */}
            <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-6 text-white text-center relative overflow-hidden">
              {/* Círculos decorativos luminosos */}
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/15 rounded-full blur-xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-emerald-300/20 rounded-full blur-xl pointer-events-none" />

              {/* Icono animado */}
              <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg ring-4 ring-white/30">
                <CheckCircle2 className="w-9 h-9 text-white animate-pulse" />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 text-emerald-100 rounded-full text-[11px] font-black uppercase tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Aviso de Sucursal</span>
              </div>

              <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
                El producto ya está en sucursal
              </h3>
              <p className="text-emerald-100 text-xs sm:text-sm font-medium mt-1">
                El pedido llegó con éxito y está listo para ser entregado
              </p>
            </div>

            {/* Ficha de Detalles del Pedido */}
            <div className="p-5 sm:p-6 space-y-4">
              <div className="bg-emerald-50/70 rounded-2xl p-4 border border-emerald-200/90 space-y-3">
                {/* Folio y Sucursal */}
                <div className="flex items-center justify-between gap-2 border-b border-emerald-200/70 pb-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">Folio:</span>
                    <span className="font-mono tabular-nums font-black text-xs text-emerald-950 bg-white border border-emerald-300 px-2 py-0.5 rounded-lg shadow-2xs">
                      {readyNotificationOrder.orderNumber}
                    </span>
                  </div>
                  <span className="text-xs font-extrabold text-emerald-800 bg-white px-2.5 py-0.5 rounded-lg border border-emerald-300 shadow-2xs flex items-center gap-1">
                    🏬 {readyNotificationOrder.branchName.replace("Sucursal ", "")}
                  </span>
                </div>

                {/* Cliente */}
                <div className="flex items-start gap-2">
                  <User className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">Cliente:</p>
                    <p className="font-black text-stone-900 text-sm sm:text-base leading-tight">
                      {readyNotificationOrder.customerName}
                    </p>
                    {readyNotificationOrder.phone && (
                      <p className="font-mono text-xs text-stone-600 font-semibold mt-0.5">
                        📞 {readyNotificationOrder.phone}
                      </p>
                    )}
                  </div>
                </div>

                {/* Productos */}
                <div className="flex items-start gap-2 pt-1 border-t border-emerald-200/50">
                  <Cake className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">Contenido:</p>
                    <p className="font-bold text-stone-800 text-xs sm:text-sm leading-snug">
                      {readyNotificationOrder.items && readyNotificationOrder.items.length > 0
                        ? readyNotificationOrder.items.map((it) => `${it.quantity}x ${it.name}`).join(", ")
                        : readyNotificationOrder.description || "Pedido Encargado"}
                    </p>
                  </div>
                </div>

                {/* Saldo y Estado */}
                <div className="flex items-center justify-between text-xs pt-2 border-t border-emerald-200/70">
                  <span className="text-stone-500 font-semibold">Estado de Pago:</span>
                  {readyNotificationOrder.remainingBalance === 0 ? (
                    <span className="font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-lg shadow-2xs inline-flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-emerald-700" />
                      100% Liquidado
                    </span>
                  ) : (
                    <span className="font-mono font-black text-rose-900 bg-rose-100 border-2 border-rose-300 px-2.5 py-0.5 rounded-lg shadow-2xs inline-flex items-center gap-1">
                      Falta: {formatCurrency(readyNotificationOrder.remainingBalance)}
                    </span>
                  )}
                </div>
              </div>

              {/* Botón Principal: Aceptar */}
              <button
                type="button"
                autoFocus
                onClick={() => setReadyNotificationOrder(null)}
                className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-[0.98] text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4 text-white" />
                <span>Aceptar y Continuar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Centrado y Animado de Confirmación de Entrega Segura estilo Panadería Brito */}
      <DeliverOrderConfirmModal
        isOpen={Boolean(orderToDeliver)}
        order={orderToDeliver}
        onClose={() => setOrderToDeliver(null)}
        onConfirm={() => {
          if (orderToDeliver) {
            handleConfirmDeliverOrder(orderToDeliver);
          }
        }}
      />
    </div>
  );
}
