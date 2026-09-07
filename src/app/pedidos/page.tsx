"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  CalendarClock,
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
  TrendingUp,
  LayoutGrid,
  List,
  Flame,
  ArrowUpRight,
  User
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

export default function PedidosPage() {
  const { branches, currentBranch } = useBranch();
  const { user } = useAuth();

  // State
  const [orders, setOrders] = useState<CustomOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<CustomOrder | null>(null);
  const [selectedOrderForReceipt, setSelectedOrderForReceipt] = useState<CustomOrder | null>(null);
  const [selectedOrderForEdit, setSelectedOrderForEdit] = useState<CustomOrder | null>(null);

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

  // Today and Tomorrow strings in YYYY-MM-DD
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  }, []);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Branch filter
      if (selectedBranchFilter !== "all" && order.branchId !== selectedBranchFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== "all" && order.status !== statusFilter) {
        return false;
      }

      // Payment filter
      if (paymentFilter === "pendientes" && order.remainingBalance <= 0) {
        return false;
      }
      if (paymentFilter === "liquidados" && order.remainingBalance > 0) {
        return false;
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
  }, [orders, selectedBranchFilter, statusFilter, paymentFilter, dateFilter, searchQuery, todayStr, tomorrowStr]);

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
    if (order.status === "pendiente") nextStatus = "en_horno";
    else if (order.status === "en_horno") nextStatus = "listo";
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

  const handleDeletePermanent = (orderId: string) => {
    if (confirm("¿Eliminar este pedido permanentemente del registro?")) {
      deleteCustomOrder(orderId);
    }
  };

  const handleSendWhatsApp = (order: CustomOrder) => {
    const cleanPhone = order.phone.replace(/\D/g, "");
    const formattedPhone = cleanPhone.length === 10 ? `52${cleanPhone}` : cleanPhone;
    
    let statusText = "está siendo preparado en nuestro horno";
    if (order.status === "listo") statusText = "¡ya está LISTO para entrega en mostrador!";
    if (order.status === "entregado") statusText = "ha sido marcado como entregado. ¡Esperamos lo disfruten!";

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
          <span className="bg-amber-100 text-amber-800 border border-amber-300/60 px-3 py-1 rounded-full font-bold text-xs flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600" /> Pendiente
          </span>
        );
      case "en_horno":
        return (
          <span className="bg-blue-100 text-blue-800 border border-blue-300/60 px-3 py-1 rounded-full font-bold text-xs flex items-center gap-1">
            <Flame className="w-3 h-3 text-blue-600" /> En Horno / Prep.
          </span>
        );
      case "listo":
        return (
          <span className="bg-emerald-100 text-emerald-800 border border-emerald-300/60 px-3 py-1 rounded-full font-bold text-xs flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Listo en Mostrador
          </span>
        );
      case "entregado":
        return (
          <span className="bg-stone-100 text-stone-600 border border-stone-300/60 px-3 py-1 rounded-full font-bold text-xs flex items-center gap-1">
            ✓ Entregado
          </span>
        );
      case "cancelado":
        return (
          <span className="bg-rose-100 text-rose-700 border border-rose-300/60 px-3 py-1 rounded-full font-bold text-xs flex items-center gap-1">
            ✕ Cancelado
          </span>
        );
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-600 text-white rounded-2xl shadow-md">
              <CalendarClock className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                Encargos & Pedidos de Pastelería
              </h1>
              <p className="text-xs text-stone-500 font-medium mt-0.5">
                Levantamiento de pedidos, productos sobre diseño, control de anticipos y saldos por liquidar.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-extrabold px-6 py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all text-xs tracking-wide self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Tomar Nuevo Pedido
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-stone-400 tracking-wider block">
              Pedidos Activos
            </span>
            <span className="text-2xl font-black text-stone-900 mt-1 block">
              {metrics.activeCount}
            </span>
            <span className="text-[10px] text-amber-700 font-semibold">En taller y por entregar</span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100">
            <Cake className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-rose-500 tracking-wider block">
              ¡Entregas para HOY!
            </span>
            <span className="text-2xl font-black text-rose-700 mt-1 block">
              {metrics.todayCount}
            </span>
            <span className="text-[10px] text-stone-500 font-medium">Requieren atención prioritaria</span>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 animate-pulse">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-stone-400 tracking-wider block">
              Por Cobrar (Saldos)
            </span>
            <span className="text-xl sm:text-2xl font-black text-emerald-700 mt-1 block">
              {formatCurrency(metrics.totalRemainingBalance)}
            </span>
            <span className="text-[10px] text-stone-500 font-medium">Falta por liquidar al entregar</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-stone-400 tracking-wider block">
              Listos en Mostrador
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

      {/* Filter and Search Toolbar */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search bar (5 cols) */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-stone-400" />
            <input
              type="text"
              placeholder="Buscar por # pedido (PED-101), cliente, teléfono o dedicatoria..."
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
              className="w-full text-xs px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-semibold text-stone-800"
            >
              <option value="all">🏬 Todas las Sucursales</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Payment filter (2 cols) */}
          <div className="md:col-span-2">
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full text-xs px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-semibold text-stone-800"
            >
              <option value="all">💵 Todos los Pagos</option>
              <option value="pendientes">⚠️ Con Saldo Pendiente</option>
              <option value="liquidados">✓ 100% Liquidados</option>
            </select>
          </div>

          {/* View mode toggle (2 cols) */}
          <div className="md:col-span-2 flex items-center justify-end gap-1.5">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-xl border text-xs font-bold transition-colors ${
                viewMode === "grid"
                  ? "bg-amber-600 text-white border-amber-600 shadow-2xs"
                  : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
              }`}
              title="Vista en Tarjetas"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-2 rounded-xl border text-xs font-bold transition-colors ${
                viewMode === "table"
                  ? "bg-amber-600 text-white border-amber-600 shadow-2xs"
                  : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
              }`}
              title="Vista en Lista / Tabla"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sub-toolbar: Status Tabs & Date Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100 text-xs">
          {/* Status filter tabs */}
          <div className="flex flex-wrap items-center gap-1">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                statusFilter === "all"
                  ? "bg-stone-900 text-white"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              Todos ({orders.length})
            </button>
            <button
              onClick={() => setStatusFilter("pendiente")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                statusFilter === "pendiente"
                  ? "bg-amber-600 text-white"
                  : "bg-stone-100 text-stone-600 hover:bg-amber-50"
              }`}
            >
              Pendientes
            </button>
            <button
              onClick={() => setStatusFilter("en_horno")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                statusFilter === "en_horno"
                  ? "bg-blue-600 text-white"
                  : "bg-stone-100 text-stone-600 hover:bg-blue-50"
              }`}
            >
              En Preparación
            </button>
            <button
              onClick={() => setStatusFilter("listo")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                statusFilter === "listo"
                  ? "bg-emerald-600 text-white"
                  : "bg-stone-100 text-stone-600 hover:bg-emerald-50"
              }`}
            >
              Listos en Tienda
            </button>
            <button
              onClick={() => setStatusFilter("entregado")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                statusFilter === "entregado"
                  ? "bg-stone-700 text-white"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              Entregados
            </button>
          </div>

          {/* Quick Date Pills */}
          <div className="flex items-center gap-1 font-semibold">
            <span className="text-[11px] text-stone-400 mr-1">Fecha:</span>
            <button
              onClick={() => setDateFilter("all")}
              className={`px-2.5 py-1 rounded-lg text-[11px] transition-colors ${
                dateFilter === "all" ? "bg-amber-100 text-amber-900 font-bold" : "text-stone-500 hover:text-stone-800"
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setDateFilter("hoy")}
              className={`px-2.5 py-1 rounded-lg text-[11px] transition-colors ${
                dateFilter === "hoy" ? "bg-rose-100 text-rose-800 font-bold" : "text-stone-500 hover:text-rose-700"
              }`}
            >
              Hoy
            </button>
            <button
              onClick={() => setDateFilter("manana")}
              className={`px-2.5 py-1 rounded-lg text-[11px] transition-colors ${
                dateFilter === "manana" ? "bg-amber-100 text-amber-800 font-bold" : "text-stone-500 hover:text-amber-700"
              }`}
            >
              Mañana
            </button>
            <button
              onClick={() => setDateFilter("semana")}
              className={`px-2.5 py-1 rounded-lg text-[11px] transition-colors ${
                dateFilter === "semana" ? "bg-stone-200 text-stone-800 font-bold" : "text-stone-500 hover:text-stone-800"
              }`}
            >
              Próximos 7 días
            </button>
          </div>
        </div>
      </div>

      {/* Orders Grid / Table View */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center space-y-3">
          <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center mx-auto border border-amber-200 shadow-inner">
            <Cake className="w-8 h-8" />
          </div>
          <h3 className="font-extrabold text-lg text-stone-800">No se encontraron pedidos</h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto">
            No hay pedidos que coincidan con los filtros seleccionados. Intenta modificar los términos de búsqueda o levanta un nuevo pedido.
          </p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" /> Tomar Nuevo Pedido
          </button>
        </div>
      ) : viewMode === "grid" ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrders.map((order) => {
            const isToday = order.deliveryDate === todayStr;
            const isTomorrow = order.deliveryDate === tomorrowStr;

            return (
              <div
                key={order.id}
                className={`bg-white rounded-3xl border transition-all flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-md ${
                  isToday && order.status !== "entregado"
                    ? "border-rose-400 ring-2 ring-rose-300/40"
                    : "border-stone-200"
                }`}
              >
                {/* Card Top */}
                <div className="p-5 space-y-3.5">
                  {/* Badge Row */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-xs text-amber-800 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200 shadow-2xs font-mono">
                        {order.orderNumber}
                      </span>
                      {isToday && order.status !== "entregado" && (
                        <span className="text-[10px] bg-rose-600 text-white px-2 py-0.5 rounded-full font-black animate-pulse">
                          ¡ENTREGA HOY!
                        </span>
                      )}
                      {isTomorrow && order.status !== "entregado" && (
                        <span className="text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded-full font-bold">
                          Mañana
                        </span>
                      )}
                    </div>
                    {getStatusBadge(order.status)}
                  </div>

                  {/* Customer and phone */}
                  <div>
                    <h3 className="font-extrabold text-base text-stone-900 leading-tight">
                      {order.customerName}
                    </h3>
                    <div className="flex items-center justify-between mt-1 text-xs text-stone-500">
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-stone-400" /> {order.phone}
                      </span>
                      <span className="text-[11px] font-bold text-amber-800 bg-stone-100 px-2 py-0.5 rounded-md">
                        {order.branchName.replace("Sucursal ", "")}
                      </span>
                    </div>
                  </div>

                  {/* Dedication / Theme banner */}
                  {order.dedication && (
                    <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-2.5 text-xs text-amber-950 font-medium flex items-start gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="leading-snug">
                        <strong className="block text-[10px] text-amber-800 uppercase tracking-wider">
                          Dedicatoria / Letrero:
                        </strong>
                        "{order.dedication}"
                      </div>
                    </div>
                  )}

                  {/* Items list */}
                  <div className="bg-stone-50/90 rounded-2xl p-3 border border-stone-100 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase text-stone-400 block tracking-wider">
                      Productos Encargados
                    </span>
                    {(order.items && order.items.length > 0 ? order.items : []).map((it, idx) => (
                      <div key={idx} className="text-xs text-stone-800 flex justify-between gap-2">
                        <span className="font-semibold line-clamp-1">
                          {it.quantity}x {it.name}
                        </span>
                        <span className="font-mono text-stone-600 font-bold shrink-0">
                          {formatCurrency(it.subtotal)}
                        </span>
                      </div>
                    ))}
                    {order.deliveryType === "domicilio" && (
                      <div className="pt-1 border-t border-stone-200 text-[10px] text-stone-600 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-amber-600" />
                        <span className="truncate">Domicilio: {order.deliveryAddress || "A domicilio"}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Financial & Delivery Footer */}
                <div className="bg-stone-50/80 border-t border-stone-200 p-4 space-y-3 text-xs">
                  {/* Delivery time */}
                  <div className="flex items-center justify-between text-stone-600">
                    <span className="flex items-center gap-1 text-[11px]">
                      <Clock className="w-3.5 h-3.5 text-amber-600" /> Entrega prometida:
                    </span>
                    <span className="font-black text-stone-900 text-xs bg-white px-2 py-0.5 rounded-lg border border-stone-200">
                      {order.deliveryDate} • {order.deliveryTime || "16:00"} hrs
                    </span>
                  </div>

                  {/* Balance / Remaining breakdown */}
                  <div className="space-y-1 pt-1 border-t border-stone-200 font-semibold">
                    <div className="flex items-center justify-between text-stone-600 text-xs">
                      <span>Total:</span>
                      <span className="font-extrabold text-stone-900">{formatCurrency(order.total)}</span>
                    </div>
                    <div className="flex items-center justify-between text-emerald-700 text-xs">
                      <span>Adelanto pagado:</span>
                      <span>{formatCurrency(order.deposit)}</span>
                    </div>
                    <div className="flex items-center justify-between font-black text-sm pt-1 border-t border-dashed border-stone-200">
                      <span>Falta por Liquidar:</span>
                      <span
                        className={`px-2 py-0.5 rounded-lg font-mono ${
                          order.remainingBalance === 0
                            ? "text-emerald-700 bg-emerald-100"
                            : "text-rose-600 bg-rose-50 border border-rose-200"
                        }`}
                      >
                        {order.remainingBalance === 0 ? "¡Liquidado!" : formatCurrency(order.remainingBalance)}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-stone-200 flex flex-col gap-2">
                    {/* Status progression button */}
                    {order.status !== "entregado" && order.status !== "cancelado" && (
                      <button
                        onClick={() => handleAdvanceStatus(order)}
                        className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                      >
                        {order.status === "pendiente" && (
                          <>
                            <Flame className="w-3.5 h-3.5 text-amber-400" /> Pasar a Preparación / Horno
                          </>
                        )}
                        {order.status === "en_horno" && (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Marcar Listo en Mostrador
                          </>
                        )}
                        {order.status === "listo" && (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Entregar Pedido al Cliente
                          </>
                        )}
                      </button>
                    )}

                    {/* Secondary action tools */}
                    <div className="flex items-center gap-1.5">
                      {order.remainingBalance > 0 && order.status !== "cancelado" && (
                        <button
                          onClick={() => setSelectedOrderForPayment(order)}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] py-1.5 px-2 rounded-xl transition-colors flex items-center justify-center gap-1 shadow-2xs"
                        >
                          <DollarSign className="w-3 h-3" /> Liquidar / Abonar
                        </button>
                      )}

                      <button
                        onClick={() => setSelectedOrderForReceipt(order)}
                        className="p-2 bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 rounded-xl transition-colors"
                        title="Ver / Imprimir Ticket"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleSendWhatsApp(order)}
                        className="p-2 bg-white hover:bg-emerald-50 border border-stone-200 text-emerald-600 rounded-xl transition-colors"
                        title="Enviar aviso por WhatsApp"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setSelectedOrderForEdit(order)}
                        className="p-2 bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 rounded-xl transition-colors"
                        title="Editar pedido"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {order.status !== "cancelado" ? (
                        <button
                          onClick={() => handleCancelOrder(order.id)}
                          className="p-2 bg-white hover:bg-rose-50 border border-stone-200 text-rose-500 rounded-xl transition-colors"
                          title="Cancelar pedido"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDeletePermanent(order.id)}
                          className="p-2 bg-white hover:bg-rose-50 border border-stone-200 text-rose-600 rounded-xl transition-colors"
                          title="Eliminar definitivamente"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-100/80 border-b border-stone-200 text-stone-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-3.5 px-4">Folio / Fecha</th>
                  <th className="p-3.5">Cliente</th>
                  <th className="p-3.5">Sucursal</th>
                  <th className="p-3.5">Detalle Productos</th>
                  <th className="p-3.5">Estado</th>
                  <th className="p-3.5">Total</th>
                  <th className="p-3.5">Falta por Liquidar</th>
                  <th className="p-3.5 text-right px-4">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredOrders.map((order) => {
                  const isToday = order.deliveryDate === todayStr;

                  return (
                    <tr key={order.id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="p-3.5 px-4">
                        <span className="font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          {order.orderNumber}
                        </span>
                        <div className="text-[11px] text-stone-500 font-semibold mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span className={isToday ? "text-rose-600 font-bold" : ""}>
                            {order.deliveryDate} {order.deliveryTime}
                          </span>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <strong className="text-stone-900 block font-bold">{order.customerName}</strong>
                        <span className="text-[11px] text-stone-500 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-stone-400" /> {order.phone}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <span className="text-[11px] font-semibold text-stone-700">
                          {order.branchName}
                        </span>
                      </td>

                      <td className="p-3.5 max-w-xs">
                        <div className="line-clamp-2 text-stone-700">
                          {order.description}
                        </div>
                        {order.dedication && (
                          <div className="text-[10px] text-amber-700 italic font-medium mt-0.5">
                            "{order.dedication}"
                          </div>
                        )}
                      </td>

                      <td className="p-3.5">
                        {getStatusBadge(order.status)}
                      </td>

                      <td className="p-3.5 font-bold text-stone-900">
                        {formatCurrency(order.total)}
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`font-black text-xs px-2 py-1 rounded-lg ${
                            order.remainingBalance === 0
                              ? "text-emerald-700 bg-emerald-50"
                              : "text-rose-600 bg-rose-50 border border-rose-200"
                          }`}
                        >
                          {order.remainingBalance === 0 ? "Liquidado" : formatCurrency(order.remainingBalance)}
                        </span>
                      </td>

                      <td className="p-3.5 text-right px-4">
                        <div className="flex items-center justify-end gap-1">
                          {order.remainingBalance > 0 && (
                            <button
                              onClick={() => setSelectedOrderForPayment(order)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg shadow-2xs"
                              title="Liquidar / Abonar"
                            >
                              Cobrar
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedOrderForReceipt(order)}
                            className="p-1.5 text-stone-600 hover:bg-stone-200 rounded-lg"
                            title="Ticket"
                          >
                            <Receipt className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setSelectedOrderForEdit(order)}
                            className="p-1.5 text-stone-600 hover:bg-stone-200 rounded-lg"
                            title="Editar"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
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
        onOrderCreated={(orderId) => {
          loadOrders();
          const created = getStoredOrders().find((o) => o.id === orderId);
          if (created) {
            setSelectedOrderForReceipt(created);
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
    </div>
  );
}
