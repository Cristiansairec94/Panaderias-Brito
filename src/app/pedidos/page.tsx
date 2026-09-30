"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
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
  TrendingUp,
  List,
  Flame,
  ArrowUpRight,
  User,
  Check,
  Eye,
  AlertTriangle,
  Package,
  LayoutGrid,
  RefreshCw,
  Smartphone,
  Wifi
} from "lucide-react";
import { CustomOrder } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { useBranch } from "@/context/BranchContext";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import { realtimeHub } from "@/lib/realtime/realtimeHub";
import {
  getStoredOrders,
  syncOrdersWithServer,
  updateOrderStatus,
  deleteCustomOrder
} from "@/lib/orders";
import CreateOrderModal from "@/components/pedidos/CreateOrderModal";
import OrderPaymentModal from "@/components/pedidos/OrderPaymentModal";
import OrderReceiptModal from "@/components/pedidos/OrderReceiptModal";
import EditOrderModal from "@/components/pedidos/EditOrderModal";
import OrderDetailModal from "@/components/pedidos/OrderDetailModal";

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
  | "entregados";

export default function PedidosPage() {
  const { branches, currentBranch } = useBranch();
  const { user } = useAuth();
  const { addNotification } = useNotifications();

  // State: Default view is "productos" en formato "lista" compacta y ordenada
  const [orders, setOrders] = useState<CustomOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState("all");
  const [classificationFilter, setClassificationFilter] = useState<OrderClassificationKey>("all");
  const [isClassificationOpen, setIsClassificationOpen] = useState(true);
  const [viewMode, setViewMode] = useState<"productos" | "tabla">("productos");
  const [productLayout, setProductLayout] = useState<"lista" | "cuadricula">("lista");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"synced" | "syncing" | "offline">("synced");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  // Ref para el contenedor de desplazamiento independiente del catálogo
  const catalogScrollRef = useRef<HTMLDivElement>(null);
  const catalogSectionRef = useRef<HTMLDivElement>(null);
  const [showKpiSummary, setShowKpiSummary] = useState(true);

  // Expanded rows in list view
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<CustomOrder | null>(null);
  const [selectedOrderForReceipt, setSelectedOrderForReceipt] = useState<CustomOrder | null>(null);
  const [selectedOrderForEdit, setSelectedOrderForEdit] = useState<CustomOrder | null>(null);
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<CustomOrder | null>(null);

  // Cargar pedidos desde almacenamiento local
  const loadOrders = () => {
    setOrders(getStoredOrders());
  };

  useEffect(() => {
    loadOrders();

    // 1. Sincronización bidireccional automática con el servidor (celulares y PC)
    setIsSyncing(true);
    syncOrdersWithServer()
      .then((synced) => {
        setOrders(synced);
        setSyncStatus("synced");
      })
      .catch(() => setSyncStatus("offline"))
      .finally(() => setIsSyncing(false));

    // 2. Escuchar cambios locales
    const handleUpdate = () => loadOrders();
    window.addEventListener("brito_orders_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    // 3. Escuchar pedidos y actualizaciones transmitidos en tiempo real por WebSocket
    const unsubOrder = realtimeHub?.onOrder ? realtimeHub.onOrder(() => {
      loadOrders();
    }) : undefined;

    return () => {
      window.removeEventListener("brito_orders_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
      if (unsubOrder) unsubOrder();
    };
  }, []);

  // Botón manual de sincronización
  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncStatus("syncing");
    try {
      const synced = await syncOrdersWithServer();
      setOrders(synced);
      setSyncStatus("synced");
      addNotification({
        title: "Celulares & PC Vinculados",
        description: `Se sincronizaron con éxito ${synced.length} pedidos en vivo con todos los dispositivos.`,
        senderName: "Sincronización en Vivo",
        senderAvatar: "🔄",
        badgeIcon: "pastel",
        highlightText: `${synced.length} pedidos`,
        category: "pedidos",
      });
    } catch {
      setSyncStatus("offline");
    } finally {
      setIsSyncing(false);
    }
  };

  // Auto-sync branch filter with active connected branch (or user assigned branch if not admin)
  useEffect(() => {
    if (user && user.role !== "admin") {
      const userBranchId = user.assignedBranchId || currentBranch?.id;
      if (userBranchId) {
        setSelectedBranchFilter(userBranchId);
        return;
      }
    }
    if (currentBranch) {
      setSelectedBranchFilter(currentBranch.id);
    }
  }, [currentBranch, user]);

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
    if (order.status === "cancelado") return false;
    const rem = order.remainingBalance !== undefined ? order.remainingBalance : Math.max(0, (order.total || 0) - (order.deposit || 0));
    return rem <= 0;
  };

  const checkIsReadyNotDelivered = (order: CustomOrder): boolean => {
    return order.status === "listo";
  };

  const checkIsDelivered = (order: CustomOrder): boolean => {
    return order.status === "entregado";
  };

  // Classification counts for the current branch view
  const classificationCounts = useMemo(() => {
    const branchFiltered = orders.filter((o) => {
      if (selectedBranchFilter !== "all") {
        const orderOperating = (o as any).operatingBranchId;
        return !o.branchId || o.branchId === selectedBranchFilter || orderOperating === selectedBranchFilter;
      }
      return true;
    });

    let activos = 0;
    let hoy = 0;
    let pendientes = 0;
    let porPagar = 0;
    let pagados = 0;
    let noLlevados = 0;
    let noPasaron = 0;
    let proximos = 0;
    let entregados = 0;

    for (const o of branchFiltered) {
      const oDate = normalizeDateStr(o.deliveryDate);
      if (o.status !== "entregado" && o.status !== "cancelado") activos++;
      if (oDate === todayStr && o.status !== "cancelado") hoy++;
      if (checkIsPending(o)) pendientes++;
      if (checkIsUnpaid(o)) porPagar++;
      if (checkIsPaid(o)) pagados++;
      if (checkIsReadyNotDelivered(o)) noLlevados++;
      if (checkIsOverdue(o)) noPasaron++;
      if (checkIsUpcoming(o)) proximos++;
      if (checkIsDelivered(o)) entregados++;
    }

    return {
      all: branchFiltered.length,
      activos,
      hoy,
      pendientes,
      por_pagar: porPagar,
      pagados,
      no_llevados: noLlevados,
      no_pasaron: noPasaron,
      proximos,
      entregados,
    };
  }, [orders, selectedBranchFilter, todayStr, currentMinutes]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Branch filter (revisar sucursal de entrega o sucursal donde se levantó/cobró)
      if (selectedBranchFilter !== "all") {
        const orderOperating = (order as any).operatingBranchId;
        const matchesBranch = !order.branchId || order.branchId === selectedBranchFilter || orderOperating === selectedBranchFilter;
        if (!matchesBranch) return false;
      }

      const orderDate = normalizeDateStr(order.deliveryDate);

      // Classification Filter (Botones principales con emoticones y cuadros KPI)
      if (classificationFilter === "activos" && (order.status === "entregado" || order.status === "cancelado")) {
        return false;
      }
      if (classificationFilter === "hoy" && (orderDate !== todayStr || order.status === "cancelado")) {
        return false;
      }
      if (classificationFilter === "pendientes" && !checkIsPending(order)) return false;
      if (classificationFilter === "por_pagar" && !checkIsUnpaid(order)) return false;
      if (classificationFilter === "pagados" && !checkIsPaid(order)) return false;
      if (classificationFilter === "no_llevados" && !checkIsReadyNotDelivered(order)) return false;
      if (classificationFilter === "no_pasaron" && !checkIsOverdue(order)) return false;
      if (classificationFilter === "proximos" && !checkIsUpcoming(order)) return false;
      if (classificationFilter === "entregados" && !checkIsDelivered(order)) return false;

      // Status filter (solo aplica si clasificación es "all")
      if (classificationFilter === "all" && statusFilter !== "all" && order.status !== statusFilter) {
        return false;
      }

      // Payment filter (solo aplica si clasificación es "all")
      if (classificationFilter === "all") {
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

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNumber = order.orderNumber.toLowerCase().includes(q);
        const matchCustomer = order.customerName.toLowerCase().includes(q);
        const matchPhone = order.phone.includes(q);
        const matchDesc = order.description.toLowerCase().includes(q);
        const matchDedication = order.dedication?.toLowerCase().includes(q);
        if (!matchNumber && !matchCustomer && !matchPhone && !matchDesc && !matchDedication) {
          return false;
        }
      }

      return true;
    });
  }, [orders, selectedBranchFilter, classificationFilter, statusFilter, paymentFilter, dateFilter, searchQuery, todayStr, tomorrowStr, currentMinutes]);

  // Metrics (reactivos a la sucursal seleccionada para coincidir con los pedidos)
  const metrics = useMemo(() => {
    const branchFiltered = orders.filter((o) => {
      if (selectedBranchFilter !== "all") {
        const orderOperating = (o as any).operatingBranchId;
        return !o.branchId || o.branchId === selectedBranchFilter || orderOperating === selectedBranchFilter;
      }
      return true;
    });

    const activeOrders = branchFiltered.filter((o) => o.status !== "entregado" && o.status !== "cancelado");
    const todayOrders = branchFiltered.filter((o) => {
      const oDate = normalizeDateStr(o.deliveryDate);
      return oDate === todayStr && o.status !== "cancelado";
    });
    const totalRemaining = activeOrders.reduce((sum, o) => sum + (o.remainingBalance || 0), 0);
    const readyOrders = branchFiltered.filter((o) => o.status === "listo");

    return {
      activeCount: activeOrders.length,
      todayCount: todayOrders.length,
      totalRemainingBalance: totalRemaining,
      readyCount: readyOrders.length,
    };
  }, [orders, selectedBranchFilter, todayStr]);



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
      catalogScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }, 60);
  };

  // Handler para los 4 cuadros KPI principales: activa el filtro y lleva directamente a ver los pedidos correspondientes
  const handleSelectKPICard = (key: OrderClassificationKey) => {
    setClassificationFilter(key);
    setSearchQuery("");
    if (dateFilter !== "all") setDateFilter("all");
    if (paymentFilter !== "all") setPaymentFilter("all");
    if (statusFilter !== "all") setStatusFilter("all");
    setIsClassificationOpen(true);
    scrollToCatalog();
  };

  // Handler que activa la clasificación y lleva directamente a la lista de pedidos
  const handleSelectClassificationCard = (key: OrderClassificationKey) => {
    if (key === "all") {
      setClassificationFilter("all");
      setStatusFilter("all");
      setPaymentFilter("all");
      setDateFilter("all");
      scrollToCatalog();
      return;
    }
    setClassificationFilter((prev) => {
      const next = prev === key ? "all" : key;
      if (next !== "all") {
        scrollToCatalog();
      }
      return next;
    });
  };

  // Handlers for quick actions
  const handleAdvanceStatus = (order: CustomOrder) => {
    let nextStatus: CustomOrder["status"] = order.status;
    if (order.status === "pendiente" || order.status === "en_horno") nextStatus = "listo";
    else if (order.status === "listo") nextStatus = "entregado";

    if (nextStatus !== order.status) {
      updateOrderStatus(order.id, nextStatus);
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
      statusText = "¡ya está LISTO para entrega en mostrador!";
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
          <span className="bg-amber-100 text-amber-900 border border-amber-300 px-3 py-1 rounded-full font-extrabold text-[11px] inline-flex items-center gap-1.5 shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-amber-600" /> Pendiente
          </span>
        );
      case "en_horno":
        return (
          <span className="bg-blue-100 text-blue-900 border border-blue-300 px-3 py-1 rounded-full font-extrabold text-[11px] inline-flex items-center gap-1.5 shadow-2xs">
            <Flame className="w-3.5 h-3.5 text-blue-600" /> En Preparación
          </span>
        );
      case "listo":
        return (
          <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 px-3 py-1 rounded-full font-extrabold text-[11px] inline-flex items-center gap-1.5 shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Listo en Tienda
          </span>
        );
      case "entregado":
        return (
          <span className="bg-stone-100 text-stone-700 border border-stone-300 px-3 py-1 rounded-full font-extrabold text-[11px] inline-flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-stone-600" /> Entregado
          </span>
        );
      case "cancelado":
        return (
          <span className="bg-rose-100 text-rose-800 border border-rose-300 px-3 py-1 rounded-full font-extrabold text-[11px] inline-flex items-center gap-1.5">
            ✕ Cancelado
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full max-w-[1600px] mx-auto px-2 sm:px-4 pt-0.5 sm:pt-1 pb-24 md:pb-2 lg:overflow-hidden overflow-visible">
      {/* 1. ZONA SUPERIOR: Header, Métricas, Buscador y Paleta de Clasificación */}
      <div className="lg:shrink-0 space-y-1.5 sm:space-y-2">
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5 animate-in fade-in duration-150">
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

        {/* Cuadro 4: Listos en Mostrador */}
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
                📦 Listos en Mostrador
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
          className={`text-white p-2.5 sm:p-3 px-3.5 sm:px-4 rounded-2xl shadow-md flex items-center justify-between gap-3 cursor-pointer transition-all duration-200 select-none ${
            classificationFilter === "no_pasaron"
              ? "bg-red-700 ring-4 ring-red-400 border-2 border-white shadow-xl scale-[1.005]"
              : "bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-700 hover:to-rose-800 ring-2 ring-red-300"
          }`}
          title="Toca para seleccionar y ver los pedidos que no han pasado por ellos"
        >
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 bg-white/20 rounded-xl text-white shrink-0">
              <AlertTriangle className="w-5 h-5 animate-bounce" />
            </div>
            <p className="text-xs sm:text-sm font-black truncate">
              Pedidos que no han pasado por ellos
            </p>
          </div>
          <span className={`inline-flex items-center gap-1 text-xs font-black px-3 py-1.5 rounded-xl shadow-xs shrink-0 transition-all ${
            classificationFilter === "no_pasaron"
              ? "bg-stone-900 text-white ring-2 ring-white animate-pulse"
              : "bg-white text-red-700 hover:bg-stone-100"
          }`}>
            {classificationFilter === "no_pasaron" ? `✓ Viendo pedidos (${classificationCounts.no_pasaron}) ↓` : `Ver pedidos (${classificationCounts.no_pasaron}) →`}
          </span>
        </div>
      )}

      {/* Filter and Search Toolbar */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm space-y-3.5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search bar (6 cols) */}
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-stone-400" />
            <input
              type="text"
              placeholder="Buscar por # pedido (PED-101), cliente, teléfono u observaciones..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none transition-all"
            />
          </div>

          {/* Branch filter (3 cols) */}
          <div className="md:col-span-3">
            <select
              value={selectedBranchFilter}
              onChange={(e) => setSelectedBranchFilter(e.target.value)}
              disabled={user?.role !== "admin"}
              className={`w-full text-xs px-3 py-2.5 rounded-xl border focus:outline-none font-semibold ${
                user?.role !== "admin"
                  ? "bg-stone-100 text-stone-500 border-stone-200 cursor-not-allowed"
                  : "bg-stone-50 border-stone-200 focus:ring-2 focus:ring-amber-500 text-stone-800"
              }`}
            >
              {user?.role === "admin" && <option value="all">🏬 Todas las Sucursales</option>}
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Payment filter (3 cols) */}
          <div className="md:col-span-3">
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

            {/* 4. Listos */}
            <button
              type="button"
              onClick={() => handleSelectClassificationCard("no_llevados")}
              className={`flex-1 min-w-[95px] py-2 sm:py-2.5 px-3 flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-black transition-all cursor-pointer select-none first:rounded-lg last:rounded-lg ${
                classificationFilter === "no_llevados"
                  ? "bg-blue-600 text-white shadow-xs font-black"
                  : "hover:bg-white/80 text-stone-700"
              }`}
              title="Ver productos listos en tienda esperando al cliente"
            >
              <span className="flex items-center gap-1">
                <span>📦</span>
                <span className="truncate">Listos</span>
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

      {/* 2. ZONA INFERIOR DE DESPLAZAMIENTO INDEPENDIENTE: Catálogo de Productos y Pedidos */}
      <div 
        ref={catalogSectionRef}
        id="catalog-results-section"
        className="flex-1 min-h-0 flex flex-col mt-0.5"
      >
        <div 
          ref={catalogScrollRef} 
          className="flex-1 min-h-0 lg:overflow-y-auto space-y-1.5 sm:space-y-2 pr-1 pb-4 scroll-smooth"
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
                  {classificationFilter === "entregados" && <Check className="w-4 h-4" />}
                  {classificationFilter === "proximos" && <Calendar className="w-4 h-4" />}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[9px] font-black uppercase tracking-wider text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200">
                      Filtro Activo
                    </span>
                    <h3 className="text-xs sm:text-sm font-black text-stone-900">
                      {classificationFilter === "activos" && "⏳ Pedidos Activos en Proceso de Elaboración"}
                      {classificationFilter === "hoy" && "⏰ Entregas Programadas para HOY"}
                      {classificationFilter === "por_pagar" && `💰 Saldo Falta por Cobrar (${formatCurrency(metrics.totalRemainingBalance)})`}
                      {classificationFilter === "pagados" && "✅ Pedidos 100% Pagados (Liquidados)"}
                      {classificationFilter === "no_llevados" && "📦 Listos en Mostrador Esperando al Cliente"}
                      {classificationFilter === "no_pasaron" && `⚠️ Pedidos que no han pasado por ellos (${classificationCounts.no_pasaron})`}
                      {classificationFilter === "pendientes" && "👨‍🍳 En Preparación / Horno"}
                      {classificationFilter === "entregados" && "✅ Ya Entregados"}
                      {classificationFilter === "proximos" && "⏰ Próximos de Hoy"}
                    </h3>
                  </div>
                  <p className="text-[11px] text-stone-500 font-semibold mt-0.5">
                    Mostrando {filteredOrders.length} pedido(s) registrado(s).
                  </p>
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

          {/* Estado de Vinculación en Tiempo Real con Celulares */}
          <div className="flex items-center gap-2">
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border shadow-2xs transition-all ${
                syncStatus === "synced"
                  ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                  : syncStatus === "syncing"
                  ? "bg-amber-50 text-amber-900 border-amber-300"
                  : "bg-stone-100 text-stone-700 border-stone-300"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  syncStatus === "synced"
                    ? "bg-emerald-500 animate-pulse"
                    : syncStatus === "syncing"
                    ? "bg-amber-500 animate-spin"
                    : "bg-stone-400"
                }`}
              />
              <Smartphone className="w-3.5 h-3.5 text-emerald-700" />
              <span className="hidden sm:inline">Celulares & PC:</span>
              <span className="font-black">
                {syncStatus === "synced"
                  ? "Vinculados al 100%"
                  : syncStatus === "syncing"
                  ? "Sincronizando..."
                  : "Modo Local"}
              </span>
            </div>

            <button
              type="button"
              onClick={handleManualSync}
              disabled={isSyncing}
              className="p-1.5 px-2 rounded-xl bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-700 hover:text-stone-900 border border-stone-200 transition-all cursor-pointer flex items-center gap-1 text-xs font-bold shadow-2xs"
              title="Sincronizar ahora con la app de celular y servidor"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-700 ${isSyncing ? "animate-spin" : ""}`} />
              <span className="hidden md:inline">Sincronizar</span>
            </button>
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
                ? "No hay pedidos listos en mostrador esperando"
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
                ? "Todos los pedidos están en proceso de horneado/elaboración o ya fueron entregados a los clientes."
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
            /* FORMATO DE LISTA COMPACTA, ELEGANTE Y ORDENADA POR PEDIDO */
            <div className="space-y-1.5">
              {filteredOrders.map((order) => {
                const isOverdue = checkIsOverdue(order);
                const isReady = checkIsReadyNotDelivered(order);
                const isUpcoming = checkIsUpcoming(order);
                const isPending = checkIsPending(order);
                const totalPieces = order.items && order.items.length > 0
                  ? order.items.reduce((sum, item) => sum + (item.quantity || 0), 0)
                  : 1;

                return (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrderForDetail(order)}
                    className={`bg-white rounded-xl border p-2 sm:p-2.5 transition-all duration-150 shadow-2xs hover:shadow-xs cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-2 sm:gap-2.5 group border-l-4 ${
                      isOverdue
                        ? "border-l-rose-500 hover:bg-rose-50/20 border-rose-200"
                        : isReady
                        ? "border-l-emerald-500 hover:bg-emerald-50/20 border-emerald-200"
                        : isUpcoming
                        ? "border-l-blue-500 hover:bg-blue-50/20 border-blue-200"
                        : isPending
                        ? "border-l-amber-500 hover:bg-amber-50/20 border-amber-200"
                        : "border-l-stone-300 hover:bg-stone-50 border-stone-200"
                    }`}
                  >
                    {/* Bloque 1: Piezas, Folio y Sucursal */}
                    <div className="flex items-start sm:items-center gap-2.5 min-w-[240px] lg:w-1/3">
                      <div className="flex flex-col items-center justify-center bg-amber-500 text-white font-black px-2 py-1 rounded-lg shadow-2xs shrink-0 min-w-[48px] text-center">
                        <span className="text-sm sm:text-base leading-none">{totalPieces}</span>
                        <span className="text-[9px] uppercase tracking-wider font-extrabold">
                          {totalPieces === 1 ? "pza" : "pzas"}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-black text-xs text-amber-900 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded-md shadow-2xs">
                            {order.orderNumber}
                          </span>
                          <span className="text-[10px] font-bold text-stone-600 bg-stone-100 px-1.5 py-0.2 rounded-md">
                            🏬 {order.branchName.replace("Sucursal ", "")}
                          </span>
                          {getStatusBadge(order.status)}
                        </div>
                        <h4 className="font-black text-stone-900 text-xs sm:text-sm leading-tight mt-0.5 line-clamp-1 group-hover:text-amber-800 transition-colors">
                          {order.items && order.items.length > 0
                            ? order.items.length === 1
                              ? order.items[0].name
                              : `${order.items[0].name} (+${order.items.length - 1} producto${order.items.length - 1 > 1 ? "s" : ""} más)`
                            : order.description || "Pedido Encargado"}
                        </h4>
                      </div>
                    </div>

                    {/* Bloque 2: Productos y Detalles */}
                    <div className="min-w-0 lg:w-1/3">
                      <div className="bg-amber-50/70 border border-amber-200/80 rounded-lg px-2 py-1 text-xs text-stone-800">
                        {order.items && order.items.length > 0 ? (
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <div className="flex items-center gap-1 font-extrabold text-[9px] text-amber-900 uppercase tracking-wider">
                                <Cake className="w-3 h-3 text-amber-600" />
                                <span>Productos ({order.items.length}):</span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedOrderForDetail(order);
                                }}
                                className="text-[10px] font-black text-amber-900 hover:text-white bg-amber-100 hover:bg-amber-600 px-2 py-0.5 rounded-md border border-amber-300 transition-all cursor-pointer flex items-center gap-0.5 shadow-2xs leading-none"
                                title="Ver más detalles de este pedido"
                              >
                                <span>Ver más</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="space-y-0.5 max-h-20 overflow-y-auto pr-1">
                              {order.items.map((it, idx) => (
                                <div key={idx} className="flex items-baseline justify-between text-[11px] leading-tight text-stone-800">
                                  <span className="font-semibold truncate">
                                    <strong className="text-amber-950 font-black">{it.quantity}x</strong> {it.name}
                                    {it.notes && <span className="text-stone-500 font-normal italic ml-1">({it.notes})</span>}
                                  </span>
                                  {it.subtotal ? (
                                    <span className="font-mono font-bold text-[10px] text-stone-600 shrink-0 ml-1.5">
                                      {formatCurrency(it.subtotal)}
                                    </span>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <div className="flex items-center gap-1 font-extrabold text-[9px] text-amber-900 uppercase tracking-wider">
                                <Cake className="w-3 h-3 text-amber-600" />
                                <span>Detalle:</span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedOrderForDetail(order);
                                }}
                                className="text-[10px] font-black text-amber-900 hover:text-white bg-amber-100 hover:bg-amber-600 px-2 py-0.5 rounded-md border border-amber-300 transition-all cursor-pointer flex items-center gap-0.5 shadow-2xs leading-none"
                                title="Ver más detalles de este pedido"
                              >
                                <span>Ver más</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            </div>
                            <p className="font-semibold text-stone-900 text-[11px] leading-snug line-clamp-2 mt-0.5">
                              {order.description || "Especificaciones estándar del pedido."}
                            </p>
                          </div>
                        )}
                        {order.dedication && (
                          <p className="text-[9px] text-rose-800 font-extrabold italic mt-0.5 truncate border-t border-amber-200/60 pt-0.5">
                            ✨ &quot;{order.dedication}&quot;
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Bloque 3: Fecha, Hora, Cliente y Saldo */}
                    <div className="flex items-center justify-between lg:flex-col lg:items-end gap-0.5 text-xs lg:w-1/5 shrink-0 pt-1 lg:pt-0 border-t lg:border-t-0 border-stone-100">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-stone-400" />
                        <span
                          className={`font-black text-xs sm:text-sm ${
                            normalizeDateStr(order.deliveryDate) === todayStr ? "text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded font-black" : "text-stone-900"
                          }`}
                        >
                          {normalizeDateStr(order.deliveryDate) === todayStr ? "¡HOY!" : order.deliveryDate}
                        </span>
                        <span className="font-mono font-black text-stone-700 text-xs sm:text-sm">
                          {order.deliveryTime || "16:00"} hrs
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-black text-stone-950 truncate max-w-[170px] sm:max-w-[240px]" title={order.customerName}>
                          👤 {order.customerName}
                        </span>
                        {order.remainingBalance === 0 ? (
                          <span className="text-xs sm:text-sm font-black text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300 shadow-xs">
                            ✓ Liquidado
                          </span>
                        ) : (
                          <span className="text-xs sm:text-sm font-black text-rose-900 bg-rose-100 px-3 py-1 rounded-lg border-2 border-rose-300/80 shadow-xs font-mono tracking-tight">
                            Falta: {formatCurrency(order.remainingBalance)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bloque 4: Botones de Acción directos */}
                    <div
                      className="flex items-center justify-end gap-1 shrink-0 pt-1 lg:pt-0 border-t lg:border-t-0 border-stone-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => handleSendWhatsApp(order)}
                        className="px-2 py-1 bg-emerald-50 hover:bg-emerald-600 active:scale-95 text-emerald-800 hover:text-white border border-emerald-200 hover:border-emerald-600 font-black text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                        title="Mandar WhatsApp al cliente"
                      >
                        <Send className="w-3 h-3" />
                        <span className="hidden xl:inline">WhatsApp</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedOrderForReceipt(order)}
                        className="px-2 py-1 bg-stone-100 hover:bg-amber-100 active:scale-95 text-stone-800 hover:text-amber-950 border border-stone-200 hover:border-amber-300 font-black text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                        title="Imprimir Ticket"
                      >
                        <Receipt className="w-3 h-3 text-stone-600" />
                        <span className="hidden xl:inline">Ticket</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedOrderForDetail(order)}
                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 active:scale-95 text-amber-950 font-black text-xs rounded-lg border border-amber-300 hover:border-amber-400 transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                      >
                        <Eye className="w-3 h-3 text-amber-700" />
                        <span className="hidden sm:inline">Detalles</span>
                        <ChevronRight className="w-3 h-3 text-amber-700" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* FORMATO DE CUADRÍCULA DE FICHAS POR PEDIDO */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredOrders.map((order) => {
                const isOverdue = checkIsOverdue(order);
                const isReady = checkIsReadyNotDelivered(order);
                const isUpcoming = checkIsUpcoming(order);
                const isPending = checkIsPending(order);
                const totalPieces = order.items && order.items.length > 0
                  ? order.items.reduce((sum, item) => sum + (item.quantity || 0), 0)
                  : 1;

                return (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrderForDetail(order)}
                    className={`bg-white rounded-2xl border p-4.5 space-y-3.5 transition-all duration-200 shadow-2xs hover:shadow-lg cursor-pointer flex flex-col justify-between group ${
                      isOverdue
                        ? "border-rose-400 bg-rose-50/15 ring-2 ring-rose-400/30 hover:border-rose-500"
                        : isReady
                        ? "border-emerald-300 bg-emerald-50/10 hover:border-emerald-500"
                        : isUpcoming
                        ? "border-blue-300 bg-blue-50/10 hover:border-blue-500"
                        : isPending
                        ? "border-amber-300 bg-white hover:border-amber-500 hover:ring-2 hover:ring-amber-400/20"
                        : "border-stone-200 hover:border-amber-400 hover:ring-2 hover:ring-amber-400/20"
                    }`}
                  >
                    {/* Header: Folio, Sucursal, Estado y Alertas */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-xs text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl shadow-2xs font-mono">
                            {order.orderNumber}
                          </span>
                          <span className="text-[11px] font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-lg">
                            🏬 {order.branchName.replace("Sucursal ", "")}
                          </span>
                        </div>
                        {getStatusBadge(order.status)}
                      </div>

                      {/* Alertas destacadas de clasificación */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {isOverdue && (
                          <span className="text-[10px] font-black text-red-900 bg-red-100 border border-red-300 px-2.5 py-0.5 rounded-lg inline-flex items-center gap-1 animate-pulse">
                            <AlertTriangle className="w-3 h-3 text-red-600" />
                            ⚠️ NO HAN PASADO POR ÉL
                          </span>
                        )}
                        {!isOverdue && isUpcoming && (
                          <span className="text-[10px] font-black text-rose-900 bg-rose-100 border border-rose-300 px-2.5 py-0.5 rounded-lg inline-flex items-center gap-1">
                            <Clock className="w-3 h-3 text-rose-600" />
                            ⏰ ¡ENTREGA HOY!
                          </span>
                        )}
                        {isReady && (
                          <span className="text-[10px] font-black text-emerald-900 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-lg inline-flex items-center gap-1">
                            <Package className="w-3 h-3 text-emerald-700" />
                            📦 LISTO EN MOSTRADOR
                          </span>
                        )}
                        {isPending && (
                          <span className="text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-200 px-2.5 py-0.5 rounded-lg inline-flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-700" />
                            ⏳ Pendiente de Elaborar
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Resumen de Piezas y Total */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="bg-amber-600 text-white font-mono font-black text-xs sm:text-sm px-2.5 py-1 rounded-xl shadow-2xs shrink-0">
                            {totalPieces} {totalPieces === 1 ? "pza" : "pzas"}
                          </span>
                          <span className="text-xs sm:text-sm font-bold text-stone-600">
                            {order.items && order.items.length > 1
                              ? `${order.items.length} productos en el pedido`
                              : order.items && order.items.length === 1
                              ? order.items[0].name
                              : "1 producto encargado"}
                          </span>
                        </div>
                        <span className="font-mono font-black text-sm text-stone-900 shrink-0">
                          {formatCurrency(order.total)}
                        </span>
                      </div>
                    </div>

                    {/* PRODUCTOS O DESCRIPCIÓN */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-extrabold text-amber-900 uppercase tracking-wider flex items-center gap-1">
                          <Cake className="w-3.5 h-3.5 text-amber-600" />
                          <span>Productos {order.items ? `(${order.items.length})` : ""}:</span>
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrderForDetail(order);
                          }}
                          className="text-[10px] font-black text-amber-900 hover:text-white bg-amber-100 hover:bg-amber-600 px-2 py-0.5 rounded-md border border-amber-300 transition-all cursor-pointer flex items-center gap-0.5 shadow-2xs leading-none"
                          title="Ver más detalles de este pedido"
                        >
                          <span>Ver más</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                      {order.items && order.items.length > 0 ? (
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                          {order.items.map((it, idx) => (
                            <div key={idx} className="bg-amber-50/80 border border-amber-200/90 rounded-xl p-2.5 text-xs shadow-2xs">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-black text-stone-900 truncate">
                                  <span className="text-amber-800 font-extrabold mr-1.5">{it.quantity}x</span>
                                  {it.name}
                                </span>
                                {it.subtotal ? (
                                  <span className="font-mono font-bold text-stone-700 text-[11px] shrink-0">
                                    {formatCurrency(it.subtotal)}
                                  </span>
                                ) : null}
                              </div>
                              {it.notes && (
                                <p className="text-[11px] text-stone-600 font-medium italic mt-1 pl-4">
                                  {it.notes}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-3 space-y-1 shadow-2xs">
                          <div className="flex items-center gap-1.5 text-amber-900 font-extrabold text-[11px] uppercase tracking-wider">
                            <Cake className="w-3.5 h-3.5 text-amber-600" />
                            <span>Características & Sabor:</span>
                          </div>
                          <p className="text-xs sm:text-sm font-bold text-stone-900 leading-relaxed pl-5">
                            {order.description || "Especificaciones estándar del producto."}
                          </p>
                        </div>
                      )}

                      {order.dedication && (
                        <div className="bg-rose-50/80 border border-rose-200 rounded-2xl p-2.5 space-y-1 shadow-2xs">
                          <div className="flex items-center gap-1.5 text-rose-900 font-extrabold text-[10px] uppercase tracking-wider">
                            <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                            <span>Dedicatoria / Letrero:</span>
                          </div>
                          <p className="text-xs sm:text-sm font-black text-rose-950 italic pl-5">
                            &quot;{order.dedication}&quot;
                          </p>
                        </div>
                      )}

                      {order.notes && (
                        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-2.5 text-stone-800">
                          <span className="text-[10px] font-extrabold text-stone-500 uppercase tracking-wider block mb-0.5">
                            📌 Observaciones / Empaque:
                          </span>
                          <p className="text-xs font-medium text-stone-800 pl-3">
                            {order.notes}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Datos de Entrega y Cliente */}
                    <div className="bg-stone-50/70 border border-stone-200/70 rounded-2xl p-3 space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-2 border-b border-stone-200/60 pb-2">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-stone-400" />
                          <span className={`font-extrabold ${normalizeDateStr(order.deliveryDate) === todayStr ? "text-rose-700 font-black" : "text-stone-900"}`}>
                            {normalizeDateStr(order.deliveryDate) === todayStr ? "¡HOY!" : order.deliveryDate}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 font-bold text-stone-700">
                          <Clock className="w-3.5 h-3.5 text-stone-400" />
                          <span>{order.deliveryTime || "16:00"} hrs</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="text-[11px] font-bold text-stone-400 uppercase block">Cliente:</span>
                          <strong className="text-sm font-black text-stone-900 block truncate max-w-[170px]">
                            {order.customerName}
                          </strong>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] font-bold text-stone-400 uppercase block">Cobro:</span>
                          {order.remainingBalance > 0 ? (
                            <span className="text-xs sm:text-sm font-black text-rose-800 font-mono bg-rose-100/90 border border-rose-300 px-2.5 py-0.5 rounded-lg inline-block shadow-2xs">
                              Falta: {formatCurrency(order.remainingBalance)}
                            </span>
                          ) : (
                            <span className="text-xs sm:text-sm font-black text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-2.5 py-0.5 rounded-lg inline-block shadow-2xs">
                              ✓ Liquidado
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Botones de Acción */}
                    <div
                      className="pt-2 flex items-center justify-between gap-1.5 border-t border-stone-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSendWhatsApp(order)}
                          className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-600 active:scale-95 text-emerald-800 hover:text-white border border-emerald-200 hover:border-emerald-600 font-black text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                          title="Mandar WhatsApp al cliente"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">WhatsApp</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedOrderForReceipt(order)}
                          className="px-2.5 py-1.5 bg-stone-100 hover:bg-amber-100 active:scale-95 text-stone-800 hover:text-amber-950 border border-stone-200 hover:border-amber-300 font-black text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                          title="Imprimir Ticket"
                        >
                          <Receipt className="w-3.5 h-3.5 text-stone-600" />
                          <span className="hidden sm:inline">Ticket</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedOrderForDetail(order)}
                        className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 active:scale-95 text-amber-950 font-black text-xs rounded-xl border border-amber-300 hover:border-amber-400 transition-all flex items-center gap-1 cursor-pointer shadow-2xs ml-auto"
                      >
                        <Eye className="w-3.5 h-3.5 text-amber-700" />
                        <span>Ver Detalles</span>
                        <ChevronRight className="w-3.5 h-3.5 text-amber-700" />
                      </button>
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

                  return (
                    <React.Fragment key={order.id}>
                      <tr
                        className={`transition-all duration-150 group cursor-pointer hover:shadow-xs border-l-4 ${
                          isOverdue
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
                                {isToday ? "¡HOY!" : isTomorrow ? "Mañana" : order.deliveryDate}
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
                          <span className="text-xs font-bold text-stone-700 bg-stone-100 px-2.5 py-1 rounded-xl">
                            {order.branchName.replace("Sucursal ", "")}
                          </span>
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
                            <div className="text-[10px] text-stone-500 font-medium flex items-center gap-1 mt-1">
                              <Check className="w-3 h-3 text-stone-500" />
                              <span>Ya entregado</span>
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

                            {/* 4. WhatsApp */}
                            <button
                              type="button"
                              onClick={() => handleSendWhatsApp(order)}
                              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-600 active:scale-95 text-emerald-800 hover:text-white border border-emerald-200 hover:border-emerald-600 font-black text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-2xs"
                              title="Enviar recordatorio / aviso por WhatsApp"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>WhatsApp</span>
                            </button>

                            {/* 5. Editar */}
                            <button
                              type="button"
                              onClick={() => setSelectedOrderForEdit(order)}
                              className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-800 border border-stone-200 hover:border-stone-300 font-black text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-2xs"
                              title="Editar pedido"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-stone-600" />
                              <span>Editar</span>
                            </button>

                            {/* 6. Eliminar Pedido */}
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

                            {/* 7. Pantalla de detalles del pedido */}
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
                                    <div className="text-[11px] text-stone-700 bg-stone-50 p-2.5 rounded-xl border border-stone-200 hover:bg-amber-50/40 hover:border-amber-300 transition-colors">
                                      <strong className="text-stone-900">🏬 Recoger en Tienda:</strong> {order.branchName}
                                    </div>
                                  )}

                                  {order.notes && (
                                    <div className="bg-amber-100/80 border-2 border-amber-400/90 rounded-xl p-3 text-amber-950 shadow-xs hover:bg-amber-100 hover:border-amber-500 hover:shadow-sm transition-all duration-150">
                                      <div className="flex items-center gap-1.5 text-amber-900 font-black text-[11px] uppercase tracking-wider mb-1">
                                        <span>📌</span>
                                        <span>Notas:</span>
                                      </div>
                                      <p className="text-xs font-bold text-amber-950 leading-relaxed pl-5">
                                        {order.notes}
                                      </p>
                                    </div>
                                  )}
                                </div>

                                <div className="pt-3 flex flex-wrap items-center justify-between gap-2 border-t-2 border-stone-200 mt-2.5">
                                  <span className="text-xs font-semibold text-stone-500">Atendió: {order.cashier}</span>
                                  <div className="flex items-center gap-2">
                                    {order.status !== "cancelado" && (
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
                                    <button
                                      type="button"
                                      onClick={() => handleDeletePermanent(order.id, order.orderNumber, order.customerName)}
                                      className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black text-xs sm:text-sm rounded-xl shadow-md border-2 border-rose-700 flex items-center gap-2 transition-all cursor-pointer ring-2 ring-rose-300/50"
                                      title="Eliminar este pedido permanentemente"
                                    >
                                      <Trash2 className="w-4 h-4 text-white" />
                                      <span>ELIMINAR PEDIDO</span>
                                    </button>
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
        initialBranchId={selectedBranchFilter !== "all" ? selectedBranchFilter : currentBranch?.id}
        onOrderCreated={(orderId) => {
          loadOrders();
          const created = getStoredOrders().find((o) => o.id === orderId);
          if (created) {
            setSelectedOrderForReceipt(created);
            if (
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
        onClose={() => setSelectedOrderForPayment(null)}
        order={selectedOrderForPayment}
        onPaymentSuccess={() => {
          loadOrders();
        }}
      />

      <OrderReceiptModal
        isOpen={!!selectedOrderForReceipt}
        onClose={() => setSelectedOrderForReceipt(null)}
        order={selectedOrderForReceipt}
      />

      <EditOrderModal
        isOpen={!!selectedOrderForEdit}
        onClose={() => setSelectedOrderForEdit(null)}
        order={selectedOrderForEdit}
        onOrderUpdated={() => {
          loadOrders();
        }}
      />

      <OrderDetailModal
        isOpen={!!selectedOrderForDetail}
        onClose={() => setSelectedOrderForDetail(null)}
        order={selectedOrderForDetail}
        onPrintReceipt={(o) => {
          setSelectedOrderForReceipt(o);
        }}
        onOpenPayment={(o) => {
          setSelectedOrderForPayment(o);
        }}
        onOpenEdit={(o) => {
          setSelectedOrderForEdit(o);
        }}
        onAdvanceStatus={(o) => {
          handleAdvanceStatus(o);
          loadOrders();
          const updated = getStoredOrders().find((item) => item.id === o.id);
          if (updated) setSelectedOrderForDetail(updated);
        }}
        onSendWhatsApp={(o) => {
          handleSendWhatsApp(o);
        }}
      />
    </div>
  );
}
