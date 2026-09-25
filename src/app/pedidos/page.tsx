"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  Package
} from "lucide-react";
import { CustomOrder } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { useBranch } from "@/context/BranchContext";
import { useAuth } from "@/context/AuthContext";
import {
  getStoredOrders,
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
  | "pendientes"
  | "por_pagar"
  | "no_llevados"
  | "no_pasaron"
  | "proximos"
  | "entregados";

export default function PedidosPage() {
  const { branches, currentBranch } = useBranch();
  const { user } = useAuth();

  // State: Default view is "table" (lista) as requested by user
  const [orders, setOrders] = useState<CustomOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState("all");
  const [classificationFilter, setClassificationFilter] = useState<OrderClassificationKey>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  // Expanded rows in list view
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<CustomOrder | null>(null);
  const [selectedOrderForReceipt, setSelectedOrderForReceipt] = useState<CustomOrder | null>(null);
  const [selectedOrderForEdit, setSelectedOrderForEdit] = useState<CustomOrder | null>(null);
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<CustomOrder | null>(null);

  // Load orders
  const loadOrders = () => {
    setOrders(getStoredOrders());
  };

  useEffect(() => {
    loadOrders();
    const handleUpdate = () => loadOrders();
    window.addEventListener("brito_orders_updated", handleUpdate);
    return () => window.removeEventListener("brito_orders_updated", handleUpdate);
  }, []);

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
    if (!order.deliveryDate) return false;
    // Date was before today
    if (order.deliveryDate < todayStr) return true;
    // Date is today and time has passed
    if (order.deliveryDate === todayStr) {
      const orderMin = parseTimeToMinutes(order.deliveryTime);
      if (orderMin !== null) {
        return currentMinutes > orderMin;
      }
    }
    return false;
  };

  const checkIsUpcoming = (order: CustomOrder): boolean => {
    if (order.status === "entregado" || order.status === "cancelado") return false;
    if (order.deliveryDate !== todayStr) return false;
    return !checkIsOverdue(order);
  };

  const checkIsPending = (order: CustomOrder): boolean => {
    return order.status === "pendiente" || order.status === "en_horno";
  };

  const checkIsUnpaid = (order: CustomOrder): boolean => {
    return (order.remainingBalance || 0) > 0 && order.status !== "cancelado";
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

    let pendientes = 0;
    let porPagar = 0;
    let noLlevados = 0;
    let noPasaron = 0;
    let proximos = 0;
    let entregados = 0;

    for (const o of branchFiltered) {
      if (checkIsPending(o)) pendientes++;
      if (checkIsUnpaid(o)) porPagar++;
      if (checkIsReadyNotDelivered(o)) noLlevados++;
      if (checkIsOverdue(o)) noPasaron++;
      if (checkIsUpcoming(o)) proximos++;
      if (checkIsDelivered(o)) entregados++;
    }

    return {
      all: branchFiltered.length,
      pendientes,
      por_pagar: porPagar,
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

      // Classification Filter (Botones principales con emoticones)
      if (classificationFilter === "pendientes" && !checkIsPending(order)) return false;
      if (classificationFilter === "por_pagar" && !checkIsUnpaid(order)) return false;
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

      // Date filter
      if (dateFilter === "hoy" && order.deliveryDate !== todayStr) {
        return false;
      }
      if (dateFilter === "manana" && order.deliveryDate !== tomorrowStr) {
        return false;
      }
      if (dateFilter === "semana") {
        const orderD = new Date(order.deliveryDate);
        const nowD = new Date();
        const diffDays = (orderD.getTime() - nowD.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays < -1 || diffDays > 7) return false;
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

  // Metrics
  const metrics = useMemo(() => {
    const activeOrders = orders.filter((o) => o.status !== "entregado" && o.status !== "cancelado");
    const todayOrders = orders.filter((o) => o.deliveryDate === todayStr && o.status !== "cancelado");
    const totalRemaining = activeOrders.reduce((sum, o) => sum + (o.remainingBalance || 0), 0);
    const readyOrders = orders.filter((o) => o.status === "listo");

    return {
      activeCount: activeOrders.length,
      todayCount: todayOrders.length,
      totalRemainingBalance: totalRemaining,
      readyCount: readyOrders.length,
    };
  }, [orders, todayStr]);

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
    <div className="w-full space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-600 text-white rounded-2xl shadow-md">
              <CalendarClock className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                Encargos & Pedidos de Pastelería
              </h1>
              <p className="text-xs text-stone-500 font-medium mt-0.5">
                Control de pedidos de pan y pasteles, fechas de entrega, anticipos recibidos y saldos por liquidar.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-black px-6 py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all text-xs tracking-wide self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Tomar Nuevo Pedido
        </button>
      </div>

      {/* KPI Cards (Interactive shortcuts to classification filters) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div
          onClick={() => setClassificationFilter(classificationFilter === "pendientes" ? "all" : "pendientes")}
          className={`bg-white border rounded-2xl p-4 shadow-2xs flex items-center justify-between transition-all duration-200 cursor-pointer hover:-translate-y-0.5 select-none ${
            classificationFilter === "pendientes"
              ? "border-amber-500 ring-2 ring-amber-400/40 shadow-md bg-amber-50/20"
              : "border-stone-200/80 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/10"
          }`}
          title="Clic para ver solo pedidos pendientes de elaborar"
        >
          <div>
            <span className="text-[11px] font-bold uppercase text-stone-400 tracking-wider block">
              ⏳ Pedidos Activos
            </span>
            <span className="text-2xl font-black text-stone-900 mt-1 block">
              {metrics.activeCount}
            </span>
            <span className="text-[10px] text-amber-700 font-semibold">En proceso de elaboración</span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100">
            <Cake className="w-5 h-5" />
          </div>
        </div>

        <div
          onClick={() => setClassificationFilter(classificationFilter === "proximos" ? "all" : "proximos")}
          className={`bg-white border rounded-2xl p-4 shadow-2xs flex items-center justify-between transition-all duration-200 cursor-pointer hover:-translate-y-0.5 select-none ${
            classificationFilter === "proximos"
              ? "border-rose-500 ring-2 ring-rose-400/40 shadow-md bg-rose-50/20"
              : "border-stone-200/80 hover:border-rose-400 hover:shadow-lg hover:shadow-rose-500/10"
          }`}
          title="Clic para ver entregas de hoy próximas a que lleguen los clientes"
        >
          <div>
            <span className="text-[11px] font-bold uppercase text-rose-500 tracking-wider block">
              ⏰ ¡Entregas para HOY!
            </span>
            <span className="text-2xl font-black text-rose-700 mt-1 block">
              {metrics.todayCount}
            </span>
            <span className="text-[10px] text-stone-500 font-medium">Prioridad en mostrador</span>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 animate-pulse">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div
          onClick={() => setClassificationFilter(classificationFilter === "por_pagar" ? "all" : "por_pagar")}
          className={`bg-white border rounded-2xl p-4 shadow-2xs flex items-center justify-between transition-all duration-200 cursor-pointer hover:-translate-y-0.5 select-none ${
            classificationFilter === "por_pagar"
              ? "border-emerald-500 ring-2 ring-emerald-400/40 shadow-md bg-emerald-50/20"
              : "border-stone-200/80 hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-500/10"
          }`}
          title="Clic para ver pedidos con saldo pendiente por cobrar"
        >
          <div>
            <span className="text-[11px] font-bold uppercase text-stone-400 tracking-wider block">
              💰 Falta por Cobrar
            </span>
            <span className="text-xl sm:text-2xl font-black text-emerald-700 mt-1 block font-mono">
              {formatCurrency(metrics.totalRemainingBalance)}
            </span>
            <span className="text-[10px] text-stone-500 font-medium">Falta por liquidar al entregar</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div
          onClick={() => setClassificationFilter(classificationFilter === "no_llevados" ? "all" : "no_llevados")}
          className={`bg-white border rounded-2xl p-4 shadow-2xs flex items-center justify-between transition-all duration-200 cursor-pointer hover:-translate-y-0.5 select-none ${
            classificationFilter === "no_llevados"
              ? "border-blue-500 ring-2 ring-blue-400/40 shadow-md bg-blue-50/20"
              : "border-stone-200/80 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/10"
          }`}
          title="Clic para ver pedidos listos que no se han llevado todavía"
        >
          <div>
            <span className="text-[11px] font-bold uppercase text-stone-400 tracking-wider block">
              📦 Listos en Mostrador
            </span>
            <span className="text-2xl font-black text-stone-900 mt-1 block">
              {metrics.readyCount}
            </span>
            <span className="text-[10px] text-emerald-700 font-semibold">Esperando al cliente</span>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Alerta Destacada: Pedidos que dejaron y NO han pasado (Hora o Fecha vencida) */}
      {classificationCounts.no_pasaron > 0 && (
        <div
          onClick={() => setClassificationFilter("no_pasaron")}
          className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white p-3.5 px-4 rounded-2xl shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:from-red-700 hover:to-rose-800 transition-all ring-2 ring-red-300 animate-in fade-in duration-200"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl text-white shrink-0">
              <AlertTriangle className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-black">
                ⚠️ ¡Atención! Hay {classificationCounts.no_pasaron} pedido(s) que los dejaron y NO han pasado por ellos
              </p>
              <p className="text-[11px] text-red-100 font-medium">
                La fecha u hora programada de entrega ya venció. Haz clic aquí para ver la lista y mandarles recordatorio por WhatsApp.
              </p>
            </div>
          </div>
          <span className="self-end sm:self-auto inline-flex items-center gap-1 text-xs font-black bg-white text-red-700 px-3 py-1.5 rounded-xl shadow-xs shrink-0">
            Ver rezagados ({classificationCounts.no_pasaron}) →
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

        {/* ============================================================ */}
        {/* BARRA DE CLASIFICACIÓN CON BOTONES, EMOTICONES Y CONTADORES */}
        {/* ============================================================ */}
        <div className="pt-3 border-t border-stone-100 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase text-stone-500 tracking-wider flex items-center gap-1.5">
                <span>🔘</span> Clasificación de Pedidos:
              </span>
              <span className="text-[11px] text-stone-400 font-medium hidden sm:inline">
                (Haz clic en cualquier botón para ver los pedidos en esa categoría)
              </span>
            </div>

            {/* Quick Date Pills */}
            <div className="flex items-center gap-1 font-semibold text-xs">
              <span className="text-[11px] text-stone-400 mr-1">Fecha Entrega:</span>
              <button
                type="button"
                onClick={() => setDateFilter("all")}
                className={`px-2.5 py-1 rounded-lg text-[11px] transition-colors cursor-pointer ${
                  dateFilter === "all" ? "bg-amber-100 text-amber-900 font-bold" : "text-stone-500 hover:text-stone-800"
                }`}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setDateFilter("hoy")}
                className={`px-2.5 py-1 rounded-lg text-[11px] transition-colors cursor-pointer ${
                  dateFilter === "hoy" ? "bg-rose-100 text-rose-800 font-bold" : "text-stone-500 hover:text-rose-700"
                }`}
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => setDateFilter("manana")}
                className={`px-2.5 py-1 rounded-lg text-[11px] transition-colors cursor-pointer ${
                  dateFilter === "manana" ? "bg-amber-100 text-amber-800 font-bold" : "text-stone-500 hover:text-amber-700"
                }`}
              >
                Mañana
              </button>
              <button
                type="button"
                onClick={() => setDateFilter("semana")}
                className={`px-2.5 py-1 rounded-lg text-[11px] transition-colors cursor-pointer ${
                  dateFilter === "semana" ? "bg-stone-200 text-stone-800 font-bold" : "text-stone-500 hover:text-stone-800"
                }`}
              >
                Próximos 7 días
              </button>
            </div>
          </div>

          {/* Botones de Clasificación en Lista Interactiva */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
            {/* 1. Todos */}
            <button
              type="button"
              onClick={() => {
                setClassificationFilter("all");
                setStatusFilter("all");
                setPaymentFilter("all");
              }}
              className={`flex items-center justify-between gap-1.5 px-3 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer border select-none ${
                classificationFilter === "all"
                  ? "bg-stone-900 text-white border-stone-900 shadow-md ring-2 ring-stone-900/20"
                  : "bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200 hover:border-stone-300"
              }`}
              title="Mostrar todos los pedidos sin filtro de clasificación"
            >
              <span className="flex items-center gap-1.5 truncate">
                <span className="text-base">📋</span>
                <span>Todos</span>
              </span>
              <span
                className={`text-[11px] font-black px-1.5 py-0.5 rounded-md ${
                  classificationFilter === "all" ? "bg-stone-800 text-white" : "bg-stone-200/90 text-stone-700"
                }`}
              >
                {classificationCounts.all}
              </span>
            </button>

            {/* 2. Pendientes */}
            <button
              type="button"
              onClick={() => setClassificationFilter(classificationFilter === "pendientes" ? "all" : "pendientes")}
              className={`flex items-center justify-between gap-1.5 px-3 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer border select-none ${
                classificationFilter === "pendientes"
                  ? "bg-amber-600 text-white border-amber-600 shadow-md ring-2 ring-amber-600/30"
                  : "bg-amber-50/70 hover:bg-amber-100/80 text-amber-900 border-amber-200 hover:border-amber-300"
              }`}
              title="Pedidos que están pendientes de elaborar u hornear"
            >
              <span className="flex items-center gap-1.5 truncate">
                <span className="text-base">⏳</span>
                <span>Pendientes</span>
              </span>
              <span
                className={`text-[11px] font-black px-1.5 py-0.5 rounded-md ${
                  classificationFilter === "pendientes" ? "bg-amber-700 text-white" : "bg-amber-200/90 text-amber-900"
                }`}
              >
                {classificationCounts.pendientes}
              </span>
            </button>

            {/* 3. Faltan por Pagar */}
            <button
              type="button"
              onClick={() => setClassificationFilter(classificationFilter === "por_pagar" ? "all" : "por_pagar")}
              className={`flex items-center justify-between gap-1.5 px-3 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer border select-none ${
                classificationFilter === "por_pagar"
                  ? "bg-rose-600 text-white border-rose-600 shadow-md ring-2 ring-rose-600/30"
                  : "bg-rose-50/70 hover:bg-rose-100/80 text-rose-900 border-rose-200 hover:border-rose-300"
              }`}
              title="Pedidos con saldo pendiente de cobrar / liquidar"
            >
              <span className="flex items-center gap-1.5 truncate">
                <span className="text-base">💰</span>
                <span>Por Pagar</span>
              </span>
              <span
                className={`text-[11px] font-black px-1.5 py-0.5 rounded-md ${
                  classificationFilter === "por_pagar" ? "bg-rose-700 text-white" : "bg-rose-200/90 text-rose-900"
                }`}
              >
                {classificationCounts.por_pagar}
              </span>
            </button>

            {/* 4. No se los han llevado (Listos) */}
            <button
              type="button"
              onClick={() => setClassificationFilter(classificationFilter === "no_llevados" ? "all" : "no_llevados")}
              className={`flex items-center justify-between gap-1.5 px-3 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer border select-none ${
                classificationFilter === "no_llevados"
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-600/30"
                  : "bg-emerald-50/70 hover:bg-emerald-100/80 text-emerald-900 border-emerald-200 hover:border-emerald-300"
              }`}
              title="Pedidos que ya están listos en tienda pero aún no se los han llevado"
            >
              <span className="flex items-center gap-1.5 truncate">
                <span className="text-base">📦</span>
                <span>No Llevados</span>
              </span>
              <span
                className={`text-[11px] font-black px-1.5 py-0.5 rounded-md ${
                  classificationFilter === "no_llevados" ? "bg-emerald-700 text-white" : "bg-emerald-200/90 text-emerald-900"
                }`}
              >
                {classificationCounts.no_llevados}
              </span>
            </button>

            {/* 5. No han pasado (Rezagados / Hora Vencida) */}
            <button
              type="button"
              onClick={() => setClassificationFilter(classificationFilter === "no_pasaron" ? "all" : "no_pasaron")}
              className={`flex items-center justify-between gap-1.5 px-3 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer border select-none ${
                classificationFilter === "no_pasaron"
                  ? "bg-red-700 text-white border-red-700 shadow-md ring-2 ring-red-700/30"
                  : "bg-red-50/80 hover:bg-red-100 text-red-950 border-red-300 hover:border-red-400"
              }`}
              title="Pedidos que los dejaron y NO han pasado por ellos (fecha u hora superada)"
            >
              <span className="flex items-center gap-1.5 truncate">
                <span className="text-base">⚠️</span>
                <span>No Han Pasado</span>
              </span>
              <span
                className={`text-[11px] font-black px-1.5 py-0.5 rounded-md ${
                  classificationFilter === "no_pasaron"
                    ? "bg-red-900 text-white"
                    : classificationCounts.no_pasaron > 0
                    ? "bg-red-200 text-red-950 font-extrabold animate-pulse"
                    : "bg-stone-200/80 text-stone-600"
                }`}
              >
                {classificationCounts.no_pasaron}
              </span>
            </button>

            {/* 6. Próximos a venir */}
            <button
              type="button"
              onClick={() => setClassificationFilter(classificationFilter === "proximos" ? "all" : "proximos")}
              className={`flex items-center justify-between gap-1.5 px-3 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer border select-none ${
                classificationFilter === "proximos"
                  ? "bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-600/30"
                  : "bg-blue-50/70 hover:bg-blue-100/80 text-blue-900 border-blue-200 hover:border-blue-300"
              }`}
              title="Pedidos programados para hoy próximos a que vengan los clientes"
            >
              <span className="flex items-center gap-1.5 truncate">
                <span className="text-base">⏰</span>
                <span>Próximos Hoy</span>
              </span>
              <span
                className={`text-[11px] font-black px-1.5 py-0.5 rounded-md ${
                  classificationFilter === "proximos" ? "bg-blue-700 text-white" : "bg-blue-200/90 text-blue-900"
                }`}
              >
                {classificationCounts.proximos}
              </span>
            </button>

            {/* 7. Ya Entregados */}
            <button
              type="button"
              onClick={() => setClassificationFilter(classificationFilter === "entregados" ? "all" : "entregados")}
              className={`flex items-center justify-between gap-1.5 px-3 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer border select-none ${
                classificationFilter === "entregados"
                  ? "bg-stone-700 text-white border-stone-700 shadow-md ring-2 ring-stone-700/30"
                  : "bg-stone-50 hover:bg-stone-100 text-stone-600 border-stone-200 hover:border-stone-300"
              }`}
              title="Pedidos ya entregados al cliente"
            >
              <span className="flex items-center gap-1.5 truncate">
                <span className="text-base">✅</span>
                <span>Entregados</span>
              </span>
              <span
                className={`text-[11px] font-black px-1.5 py-0.5 rounded-md ${
                  classificationFilter === "entregados" ? "bg-stone-800 text-white" : "bg-stone-200/80 text-stone-700"
                }`}
              >
                {classificationCounts.entregados}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Ribbon Informativo de Clasificación Activa */}
      {classificationFilter !== "all" && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-gradient-to-r from-amber-50 to-stone-50 border border-amber-200/90 px-4 py-2.5 rounded-2xl text-xs text-amber-950 font-bold shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-lg">
              {classificationFilter === "pendientes" && "⏳"}
              {classificationFilter === "por_pagar" && "💰"}
              {classificationFilter === "no_llevados" && "📦"}
              {classificationFilter === "no_pasaron" && "⚠️"}
              {classificationFilter === "proximos" && "⏰"}
              {classificationFilter === "entregados" && "✅"}
            </span>
            <div>
              <span>
                Mostrando <strong className="font-mono text-amber-900 text-sm">{filteredOrders.length}</strong> pedido(s) en categoría:{" "}
                <strong className="text-stone-900 underline decoration-amber-500 decoration-2">
                  {classificationFilter === "pendientes" && "⏳ Pendientes de Elaborar u Hornear"}
                  {classificationFilter === "por_pagar" && "💰 Faltan por Pagar (Con Saldo Pendiente)"}
                  {classificationFilter === "no_llevados" && "📦 No se los han llevado (Listos en Tienda)"}
                  {classificationFilter === "no_pasaron" && "⚠️ No han pasado (Rezagados / Hora Vencida)"}
                  {classificationFilter === "proximos" && "⏰ Próximos a Venir (Entregas Hoy)"}
                  {classificationFilter === "entregados" && "✅ Ya Entregados al Cliente"}
                </strong>
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setClassificationFilter("all");
              setStatusFilter("all");
              setPaymentFilter("all");
            }}
            className="inline-flex items-center gap-1 text-[11px] font-black text-stone-700 hover:text-stone-950 bg-white hover:bg-stone-100 border border-stone-300 px-3 py-1 rounded-xl transition-all cursor-pointer shadow-2xs"
          >
            ✕ Mostrar Todos ({classificationCounts.all})
          </button>
        </div>
      )}

      {/* Orders List / Grid Rendering */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center space-y-3">
          <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center mx-auto border border-amber-200 shadow-inner">
            <Cake className="w-8 h-8" />
          </div>
          <h3 className="font-extrabold text-lg text-stone-800">No se encontraron pedidos</h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto">
            No hay pedidos registrados que coincidan con los filtros seleccionados.
          </p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" /> Tomar Nuevo Pedido
          </button>
        </div>
      ) : (
        /* ============================================================ */
        /* LIST / TABLE VIEW: CLEAN, ELEGANT, ORDERED */
        /* ============================================================ */
        <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1250px] text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-100/90 border-b border-stone-200 text-stone-600 font-extrabold uppercase tracking-wider text-[10px]">
                  <th className="py-4 px-4">Folio</th>
                  <th className="py-4 px-3">Fecha y Hora Entrega</th>
                  <th className="py-4 px-3">Cliente</th>
                  <th className="py-4 px-3">Sucursal</th>
                  <th className="py-4 px-3">Productos Encargados</th>
                  <th className="py-4 px-3">Estado</th>
                  <th className="py-4 px-3">Total / Anticipo</th>
                  <th className="py-4 px-3">Falta por Liquidar</th>
                  <th className="py-4 px-4 text-center whitespace-nowrap min-w-[390px]">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredOrders.map((order) => {
                  const isToday = order.deliveryDate === todayStr;
                  const isTomorrow = order.deliveryDate === tomorrowStr;
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
                        <td className="py-4 px-4 font-mono">
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
                                ⚠️ REZAGADO
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
                        <td className="py-4 px-3">
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
                        <td className="py-4 px-3">
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
                        <td className="py-4 px-3">
                          <span className="text-xs font-bold text-stone-700 bg-stone-100 px-2.5 py-1 rounded-xl">
                            {order.branchName.replace("Sucursal ", "")}
                          </span>
                        </td>

                        {/* 5. Productos Encargados */}
                        <td className="py-4 px-3 max-w-xs">
                          <div className="line-clamp-1 text-xs text-stone-800 font-medium">
                            {order.description}
                          </div>
                          {order.dedication && (
                            <div className="text-[10px] text-amber-800 italic font-semibold flex items-center gap-1 mt-0.5">
                              <Sparkles className="w-3 h-3 text-amber-600 shrink-0" />
                              <span className="truncate">"{order.dedication}"</span>
                            </div>
                          )}
                          <span className="text-[10px] text-stone-400">
                            {order.items?.length || 1} producto(s) • Clic para ver detalle
                          </span>
                        </td>

                        {/* 6. Estado */}
                        <td className="py-4 px-3">
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
                        <td className="py-4 px-3 font-mono">
                          <div className="text-xs font-black text-stone-900">
                            {formatCurrency(order.total)}
                          </div>
                          <div className="text-[10px] text-emerald-700 font-bold">
                            Anticipo: {formatCurrency(order.deposit)}
                          </div>
                        </td>

                        {/* 8. Falta por Liquidar */}
                        <td className="py-4 px-3 font-mono">
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
                          className="py-4 px-4 text-right whitespace-nowrap min-w-[390px]"
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
