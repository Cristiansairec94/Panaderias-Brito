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
  Check
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

  // State: Default view is "table" (lista) as requested by user
  const [orders, setOrders] = useState<CustomOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState("all");
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

  const handleDeletePermanent = (orderId: string) => {
    if (confirm("¿Eliminar este pedido permanentemente del registro?")) {
      deleteCustomOrder(orderId);
    }
  };

  const handleSendWhatsApp = (order: CustomOrder) => {
    const cleanPhone = order.phone.replace(/\D/g, "");
    const formattedPhone = cleanPhone.length === 10 ? `52${cleanPhone}` : cleanPhone;
    
    let statusText = "está registrado y programado para entrega";
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
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
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
            <span className="text-[10px] text-amber-700 font-semibold">En proceso de elaboración</span>
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
            <span className="text-[10px] text-stone-500 font-medium">Prioridad en mostrador</span>
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
            <span className="text-xl sm:text-2xl font-black text-emerald-700 mt-1 block font-mono">
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

          {/* Payment filter (3 cols) */}
          <div className="md:col-span-3">
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
        </div>

        {/* Sub-toolbar: Status Tabs & Date Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100 text-xs">
          {/* Status filter tabs */}
          <div className="flex flex-wrap items-center gap-1">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                statusFilter === "all"
                  ? "bg-stone-900 text-white shadow-xs"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              Todos ({orders.length})
            </button>
            <button
              onClick={() => setStatusFilter("pendiente")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                statusFilter === "pendiente"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-stone-100 text-stone-600 hover:bg-amber-50"
              }`}
            >
              Pendientes
            </button>
            <button
              onClick={() => setStatusFilter("listo")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                statusFilter === "listo"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-stone-100 text-stone-600 hover:bg-emerald-50"
              }`}
            >
              Listos en Tienda
            </button>
            <button
              onClick={() => setStatusFilter("entregado")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                statusFilter === "entregado"
                  ? "bg-stone-700 text-white shadow-xs"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              Entregados
            </button>
          </div>

          {/* Quick Date Pills */}
          <div className="flex items-center gap-1 font-semibold">
            <span className="text-[11px] text-stone-400 mr-1">Fecha de Entrega:</span>
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
            <table className="w-full text-left text-xs border-collapse">
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
                  <th className="py-4 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredOrders.map((order) => {
                  const isToday = order.deliveryDate === todayStr;
                  const isTomorrow = order.deliveryDate === tomorrowStr;
                  const isExpanded = expandedRowId === order.id;

                  return (
                    <React.Fragment key={order.id}>
                      <tr
                        className={`hover:bg-amber-50/40 transition-colors group cursor-pointer ${
                          isExpanded ? "bg-amber-50/60" : ""
                        }`}
                        onClick={() => setExpandedRowId(isExpanded ? null : order.id)}
                      >
                        {/* 1. Folio */}
                        <td className="py-4 px-4 font-mono">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-xs text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl shadow-2xs">
                              {order.orderNumber}
                            </span>
                            {isToday && order.status !== "entregado" && (
                              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" title="Entrega Hoy" />
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
                        </td>

                        {/* 9. Acciones */}
                        <td
                          className="py-4 px-4 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Botón rápido de cobrar saldo */}
                            {order.remainingBalance > 0 && order.status !== "cancelado" && (
                              <button
                                onClick={() => setSelectedOrderForPayment(order)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] rounded-xl shadow-2xs transition-all flex items-center gap-1"
                                title="Liquidar saldo o abonar"
                              >
                                <DollarSign className="w-3.5 h-3.5" /> Cobrar
                              </button>
                            )}

                            {/* Avanzar estado rápido */}
                            {order.status !== "entregado" && order.status !== "cancelado" && (
                              <button
                                onClick={() => handleAdvanceStatus(order)}
                                className="p-2 bg-stone-100 hover:bg-stone-900 hover:text-white text-stone-700 rounded-xl transition-all"
                                title={
                                  order.status === "pendiente" || order.status === "en_horno"
                                    ? "Marcar Listo en Mostrador"
                                    : "Marcar como Entregado"
                                }
                              >
                                {(order.status === "pendiente" || order.status === "en_horno") && (
                                  <CheckCircle2 className="w-4 h-4 text-blue-600 hover:text-white" />
                                )}
                                {order.status === "listo" && (
                                  <Check className="w-4 h-4 text-emerald-600 hover:text-white" />
                                )}
                              </button>
                            )}

                            {/* Ticket térmico */}
                            <button
                              onClick={() => setSelectedOrderForReceipt(order)}
                              className="p-2 bg-stone-100 hover:bg-amber-100 text-stone-700 rounded-xl transition-all"
                              title="Imprimir Ticket Térmico"
                            >
                              <Receipt className="w-4 h-4" />
                            </button>

                            {/* WhatsApp */}
                            <button
                              onClick={() => handleSendWhatsApp(order)}
                              className="p-2 bg-stone-100 hover:bg-emerald-100 text-emerald-700 rounded-xl transition-all"
                              title="Enviar recordatorio / aviso por WhatsApp"
                            >
                              <Send className="w-4 h-4" />
                            </button>

                            {/* Editar */}
                            <button
                              onClick={() => setSelectedOrderForEdit(order)}
                              className="p-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl transition-all"
                              title="Editar pedido"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            {/* Desplegable chevron */}
                            <button
                              onClick={() => setExpandedRowId(isExpanded ? null : order.id)}
                              className="p-1.5 text-stone-400 hover:text-stone-700"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded row with full product breakdown & details */}
                      {isExpanded && (
                        <tr className="bg-amber-50/30 border-b border-stone-200 animate-in fade-in duration-150">
                          <td colSpan={9} className="p-5 px-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                              
                              {/* Col 1: Itemized list */}
                              <div className="space-y-2 bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
                                <span className="text-[10px] font-extrabold uppercase text-stone-400 tracking-wider block">
                                  Desglose de Productos
                                </span>
                                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                  {(order.items && order.items.length > 0 ? order.items : []).map((it, idx) => (
                                    <div key={idx} className="space-y-0.5 border-b border-stone-100 pb-1.5 last:border-none">
                                      <div className="flex justify-between font-bold text-stone-900">
                                        <span>{it.quantity}x {it.name}</span>
                                        <span className="font-mono">{formatCurrency(it.subtotal)}</span>
                                      </div>
                                      {it.notes && (
                                        <p className="text-[11px] text-stone-500 italic pl-3">↳ {it.notes}</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Col 2: Observaciones & Delivery address */}
                              <div className="space-y-2.5 bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
                                <span className="text-[10px] font-extrabold uppercase text-stone-400 tracking-wider block">
                                  Detalles de Entrega & Observaciones
                                </span>
                                {order.dedication ? (
                                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-amber-950">
                                    <strong className="block text-[10px] text-amber-800 uppercase">📝 Observaciones:</strong>
                                    <span className="italic font-bold">"{order.dedication}"</span>
                                  </div>
                                ) : (
                                  <p className="text-stone-400 italic">Sin observaciones especiales especificadas.</p>
                                )}

                                {order.deliveryType === "domicilio" ? (
                                  <div className="text-[11px] text-stone-700 bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                                    <strong className="block text-stone-900">🚚 Entrega a Domicilio:</strong>
                                    <span>{order.deliveryAddress || "Dirección pendiente"}</span>
                                  </div>
                                ) : (
                                  <div className="text-[11px] text-stone-700">
                                    <strong>🏬 Recoger en Tienda:</strong> {order.branchName}
                                  </div>
                                )}

                                {order.notes && (
                                  <p className="text-[11px] text-stone-500 bg-stone-50 p-2 rounded-lg">
                                    <strong>Notas:</strong> {order.notes}
                                  </p>
                                )}
                              </div>

                              {/* Col 3: Payment History & Balances */}
                              <div className="space-y-2 bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
                                <span className="text-[10px] font-extrabold uppercase text-stone-400 tracking-wider block">
                                  Historial de Cobros & Saldo
                                </span>
                                <div className="space-y-1 text-xs">
                                  <div className="flex justify-between text-stone-600">
                                    <span>Total:</span>
                                    <span className="font-black text-stone-900">{formatCurrency(order.total)}</span>
                                  </div>
                                  <div className="flex justify-between text-emerald-700 font-bold">
                                    <span>Anticipo Inicial:</span>
                                    <span>{formatCurrency(order.deposit)}</span>
                                  </div>
                                  <div className="flex justify-between items-center pt-1.5 border-t border-dashed border-stone-300 font-black">
                                    <span className="text-stone-800">Falta por Liquidar:</span>
                                    <span className={`text-sm ${
                                      order.remainingBalance === 0 ? "text-emerald-600" : "text-rose-600 font-mono"
                                    }`}>
                                      {order.remainingBalance === 0 ? "¡Liquidado!" : formatCurrency(order.remainingBalance)}
                                    </span>
                                  </div>
                                </div>

                                <div className="pt-2 flex items-center justify-between">
                                  <span className="text-[10px] text-stone-400">Atendió: {order.cashier}</span>
                                  {order.status !== "cancelado" ? (
                                    <button
                                      onClick={() => handleCancelOrder(order.id)}
                                      className="text-[11px] text-rose-600 hover:underline font-bold"
                                    >
                                      Cancelar Pedido
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleDeletePermanent(order.id)}
                                      className="text-[11px] text-rose-700 hover:underline font-bold"
                                    >
                                      Eliminar Definitivamente
                                    </button>
                                  )}
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
