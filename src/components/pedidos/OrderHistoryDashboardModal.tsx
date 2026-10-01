"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  History,
  Check,
  Trash2,
  Search,
  Filter,
  Eye,
  Receipt,
  MessageCircle,
  RotateCcw,
  Calendar,
  Clock,
  DollarSign,
  Store,
  User,
  Cake,
  Phone,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ArrowUpDown,
  LayoutGrid,
  List,
  Sparkles,
  TrendingUp,
  PackageCheck,
  Building2
} from "lucide-react";
import { CustomOrder, Branch } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface OrderHistoryDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "todos" | "entregados" | "cancelados";
  orders: CustomOrder[];
  branches: Branch[];
  onViewOrderDetail: (order: CustomOrder) => void;
  onPrintReceipt: (order: CustomOrder) => void;
  onSendWhatsApp: (order: CustomOrder) => void;
  onOpenPayment?: (order: CustomOrder) => void;
  onRestoreOrder?: (order: CustomOrder) => void;
  onDeleteOrderPermanently?: (order: CustomOrder) => void;
}

export default function OrderHistoryDashboardModal({
  isOpen,
  onClose,
  initialTab = "todos",
  orders,
  branches,
  onViewOrderDetail,
  onPrintReceipt,
  onSendWhatsApp,
  onOpenPayment,
  onRestoreOrder,
  onDeleteOrderPermanently,
}: OrderHistoryDashboardModalProps) {
  const [activeTab, setActiveTab] = useState<"todos" | "entregados" | "cancelados">(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [dateFilter, setDateFilter] = useState<"all" | "hoy" | "semana" | "mes">("all");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // Sincronizar tab si initialTab cambia al abrirse
  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Filtrar exclusivamente los pedidos del historial de bajas (excluyendo 100% los entregados)
  const allHistoryOrders = useMemo(() => {
    return orders.filter(
      (order) => order.status === "cancelado"
    );
  }, [orders]);

  // Contadores globales del historial de bajas
  const counts = useMemo(() => {
    const cancelados = allHistoryOrders.length;
    return {
      total: cancelados,
      entregados: 0,
      cancelados,
      totalDineroEntregado: 0,
      efectividad: 100,
    };
  }, [allHistoryOrders]);

  // Pedidos filtrados según las opciones del dashboard
  const filteredOrders = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);

    return allHistoryOrders.filter((order) => {
      // 1. Filtro por Pestaña
      if (activeTab === "entregados" && order.status !== "entregado") return false;
      if (activeTab === "cancelados" && order.status !== "cancelado") return false;

      // 2. Filtro por Sucursal
      if (selectedBranch !== "all") {
        const orderOperating = (order as any).operatingBranchId;
        const matches =
          order.branchId === selectedBranch || orderOperating === selectedBranch;
        if (!matches) return false;
      }

      // 3. Filtro por Fecha de Entrega
      if (dateFilter !== "all") {
        const orderDate = (order.deliveryDate || "").slice(0, 10);
        if (dateFilter === "hoy" && orderDate !== today) {
          return false;
        }
        if (dateFilter === "semana") {
          const oD = new Date(order.deliveryDate);
          const nowD = new Date();
          const diffDays = Math.abs((nowD.getTime() - oD.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays > 7) return false;
        }
        if (dateFilter === "mes") {
          const oD = new Date(order.deliveryDate);
          const nowD = new Date();
          const diffDays = Math.abs((nowD.getTime() - oD.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays > 30) return false;
        }
      }

      // 4. Búsqueda por texto
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNum = order.orderNumber.toLowerCase().includes(q);
        const matchName = order.customerName.toLowerCase().includes(q);
        const matchPhone = (order.phone || "").includes(q);
        const matchDesc = (order.description || "").toLowerCase().includes(q);
        const matchDed = (order.dedication || "").toLowerCase().includes(q);
        const matchItems = (order.items || []).some((item) =>
          item.name.toLowerCase().includes(q)
        );
        if (!matchNum && !matchName && !matchPhone && !matchDesc && !matchDed && !matchItems) {
          return false;
        }
      }

      return true;
    });
  }, [allHistoryOrders, activeTab, selectedBranch, dateFilter, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-stone-950/85 backdrop-blur-md p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div className="bg-stone-50 border border-stone-300/80 rounded-3xl shadow-2xl w-full max-w-7xl max-h-[94vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* 1. HEADER INDEPENDIENTE DEL DASHBOARD */}
        <div className="bg-stone-900 text-white px-5 sm:px-7 py-4 flex items-center justify-between border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-2xl shrink-0">
              <History className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                  Historial de Pedidos Dados de Baja
                </h2>
                <span className="text-[10px] font-black uppercase tracking-wider bg-rose-950 text-rose-300 px-2 py-0.5 rounded-full border border-rose-800">
                  Cancelados
                </span>
              </div>
              <p className="text-xs text-stone-400 font-medium hidden sm:block mt-0.5">
                Auditoría de pedidos dados de baja o cancelados. Puedes consultar sus detalles o reactivarlos si el cliente regresa por ellos.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
              title="Cerrar dashboard (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. BARRA DE MÉTRICAS KPI DEL HISTORIAL */}
        <div className="bg-white px-5 sm:px-7 py-3 border-b border-stone-200 shrink-0 grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
          {/* KPI 1: Dados de Baja / Cancelados */}
          <div
            onClick={() => setActiveTab("cancelados")}
            className="bg-rose-50/80 border border-rose-300 rounded-2xl p-2.5 sm:p-3 flex items-center justify-between cursor-pointer"
          >
            <div>
              <span className="text-[10px] font-bold uppercase text-rose-800 tracking-wider block">
                Pedidos Dados de Baja
              </span>
              <span className="text-base sm:text-xl font-black text-rose-950 block mt-0.5">
                {counts.cancelados}
              </span>
              <span className="text-[10px] text-rose-700 font-semibold">
                Cancelados / No recogidos
              </span>
            </div>
            <div className="p-2 bg-rose-500/10 text-rose-700 rounded-xl">
              <Trash2 className="w-5 h-5" />
            </div>
          </div>

          {/* KPI 2: Total en Historial */}
          <div
            onClick={() => setActiveTab("todos")}
            className="bg-stone-50 border border-stone-200 rounded-2xl p-2.5 sm:p-3 flex items-center justify-between cursor-pointer"
          >
            <div>
              <span className="text-[10px] font-bold uppercase text-stone-700 tracking-wider block">
                Total en Historial
              </span>
              <span className="text-base sm:text-xl font-black text-stone-900 block mt-0.5">
                {counts.total}
              </span>
              <span className="text-[10px] text-stone-500 font-semibold">
                Registros dados de baja
              </span>
            </div>
            <div className="p-2 bg-stone-200 text-stone-700 rounded-xl">
              <History className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* 3. BARRA DE CONTROL: PESTAÑAS, BÚSQUEDA Y FILTROS */}
        <div className="bg-stone-100/90 px-5 sm:px-7 py-3 border-b border-stone-200 shrink-0 space-y-2.5">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
            {/* Pestañas Principales */}
            <div className="flex items-center bg-stone-200/90 p-1 rounded-2xl border border-stone-300 gap-1 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab("todos")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === "todos" || activeTab === "cancelados"
                    ? "bg-rose-700 text-white shadow-xs"
                    : "text-rose-900 hover:bg-white/70"
                }`}
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-300" />
                <span>Dados de Baja / Cancelados</span>
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-md bg-rose-900 text-rose-200">
                  {counts.cancelados}
                </span>
              </button>
            </div>

            {/* Alternador de Vista (Tarjetas vs Tabla) */}
            <div className="flex items-center gap-1 bg-stone-200/90 p-1 rounded-xl border border-stone-300 self-end md:self-auto">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  viewMode === "cards"
                    ? "bg-white text-stone-900 shadow-2xs"
                    : "text-stone-600 hover:text-stone-900"
                }`}
                title="Vista en tarjetas cuadrícula"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tarjetas</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  viewMode === "table"
                    ? "bg-white text-stone-900 shadow-2xs"
                    : "text-stone-600 hover:text-stone-900"
                }`}
                title="Vista en lista de tabla compacta"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tabla</span>
              </button>
            </div>
          </div>

          {/* Segunda fila de controles: Buscador y selectores */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            {/* Buscador */}
            <div className="sm:col-span-6 relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por cliente, folio (#PED-...), teléfono o pastel..."
                className="w-full pl-9 pr-8 py-2 bg-white border border-stone-300 rounded-xl text-xs font-medium text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filtro Sucursal */}
            <div className="sm:col-span-3">
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full py-2 px-3 bg-white border border-stone-300 rounded-xl text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all shadow-2xs"
              >
                <option value="all">🏬 Todas las Sucursales</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro Período */}
            <div className="sm:col-span-3 flex items-center gap-1">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="w-full py-2 px-3 bg-white border border-stone-300 rounded-xl text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all shadow-2xs"
              >
                <option value="all">📅 Todos los Tiempos</option>
                <option value="hoy">Hoy</option>
                <option value="semana">Últimos 7 días</option>
                <option value="mes">Últimos 30 días</option>
              </select>

              {(searchQuery || selectedBranch !== "all" || dateFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedBranch("all");
                    setDateFilter("all");
                  }}
                  className="p-2 text-stone-500 hover:text-stone-800 bg-stone-200 hover:bg-stone-300 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer"
                  title="Restablecer filtros"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 4. CONTENIDO PRINCIPAL: LISTADO DE PEDIDOS DEL HISTORIAL */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {filteredOrders.length === 0 ? (
            /* Estado Vacío */
            <div className="py-16 text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-stone-200/80 flex items-center justify-center text-stone-400">
                <History className="w-8 h-8" />
              </div>
              <h3 className="text-base font-extrabold text-stone-800">
                No se encontraron pedidos en este historial
              </h3>
              <p className="text-xs text-stone-500 max-w-md mx-auto font-medium">
                {searchQuery || selectedBranch !== "all" || dateFilter !== "all"
                  ? "Intenta modificar el término de búsqueda o restablecer los filtros para ver otros resultados."
                  : activeTab === "entregados"
                  ? "Aún no hay pedidos marcados como entregados."
                  : activeTab === "cancelados"
                  ? "No hay pedidos que hayan sido cancelados o dados de baja."
                  : "El historial de pedidos concluidos se encuentra vacío."}
              </p>
              {(searchQuery || selectedBranch !== "all" || dateFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedBranch("all");
                    setDateFilter("all");
                  }}
                  className="px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-bold hover:bg-stone-800 transition-all cursor-pointer shadow-sm"
                >
                  Restablecer Filtros
                </button>
              )}
            </div>
          ) : viewMode === "cards" ? (
            /* VISTA DE TARJETAS */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
              {filteredOrders.map((order) => {
                const isDelivered = order.status === "entregado";
                const isCancelled = order.status === "cancelado";

                return (
                  <div
                    key={order.id}
                    className={`bg-white rounded-2xl border p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${
                      isDelivered
                        ? "border-teal-200/80 hover:border-teal-400"
                        : "border-rose-200/80 hover:border-rose-400"
                    }`}
                  >
                    <div>
                      {/* Cabecera de la tarjeta: Folio y Badge de Estado */}
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <div>
                          <span className="font-mono text-xs font-black text-stone-900 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200">
                            {order.orderNumber}
                          </span>
                          <span className="block text-[10px] text-stone-400 font-semibold mt-1">
                            Creado: {order.createdAt?.slice(0, 10)}
                          </span>
                        </div>

                        {isDelivered ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-xl bg-teal-100 text-teal-800 border border-teal-200/80">
                            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                            Entregado con Éxito
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-xl bg-rose-100 text-rose-800 border border-rose-200/80">
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            Dado de Baja
                          </span>
                        )}
                      </div>

                      {/* Datos del Cliente y Teléfono */}
                      <div className="space-y-1 mb-3">
                        <div className="flex items-center gap-1.5 text-stone-900 font-extrabold text-sm">
                          <User className="w-4 h-4 text-stone-400 shrink-0" />
                          <span className="truncate">{order.customerName}</span>
                        </div>
                        {order.phone && (
                          <div className="flex items-center gap-1.5 text-stone-600 text-xs font-medium">
                            <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                            <span>{order.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-stone-500 text-[11px] font-medium">
                          <Store className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span className="truncate">{order.branchName || "Sucursal Matriz"}</span>
                        </div>
                      </div>

                      {/* Fecha y Hora de Entrega */}
                      <div className="bg-stone-50 rounded-xl p-2 border border-stone-200/70 text-xs flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1 text-stone-700 font-bold">
                          <Calendar className="w-3.5 h-3.5 text-stone-400" />
                          <span>{order.deliveryDate}</span>
                        </div>
                        <div className="flex items-center gap-1 text-stone-600 font-bold">
                          <Clock className="w-3.5 h-3.5 text-stone-400" />
                          <span>{order.deliveryTime || "16:00"} hrs</span>
                        </div>
                      </div>

                      {/* Productos / Encargo */}
                      <div className="space-y-1 mb-3">
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                          Detalle del Encargo:
                        </span>
                        {order.items && order.items.length > 0 ? (
                          <div className="space-y-0.5 max-h-24 overflow-y-auto pr-1">
                            {order.items.map((it, idx) => (
                              <div
                                key={idx}
                                className="text-xs text-stone-700 flex items-center justify-between font-medium"
                              >
                                <span className="truncate">
                                  {it.quantity}x {it.name}
                                </span>
                                <span className="font-mono font-bold text-stone-900 shrink-0 ml-2">
                                  {formatCurrency(it.subtotal || it.unitPrice * it.quantity)}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-stone-600 line-clamp-2">
                            {order.description}
                          </p>
                        )}
                        {order.dedication && (
                          <p className="text-[11px] text-amber-800 bg-amber-50/80 px-2 py-1 rounded-lg border border-amber-200/60 italic truncate mt-1">
                            &quot;{order.dedication}&quot;
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Footer de Tarjeta: Resumen Financiero y Botones de Acción */}
                    <div className="pt-3 border-t border-stone-200 space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-stone-500">Monto Total:</span>
                        <span className="font-mono font-black text-sm text-stone-900">
                          {formatCurrency(order.total)}
                        </span>
                      </div>

                      {/* Botones de acción rápida: solo ticket, pagar restante, ver detalle y whatsapp */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <button
                          type="button"
                          onClick={() => onPrintReceipt(order)}
                          className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 rounded-xl transition-all cursor-pointer font-bold text-xs flex items-center gap-1"
                          title="Imprimir ticket del pedido"
                        >
                          <Receipt className="w-3.5 h-3.5 text-stone-600" />
                          <span>Ticket</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onViewOrderDetail(order)}
                          className="py-1.5 px-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-xs ml-auto"
                          title="Ver detalle completo del pedido"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Detalles</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onSendWhatsApp(order)}
                          className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-xl transition-all cursor-pointer"
                          title="Enviar mensaje de WhatsApp al cliente"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>

                        {onDeleteOrderPermanently && (
                          <button
                            type="button"
                            onClick={() => onDeleteOrderPermanently(order)}
                            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-600 active:scale-95 text-rose-700 hover:text-white border border-rose-200 hover:border-rose-600 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                            title="Eliminar este pedido permanentemente"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Eliminar</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* VISTA DE TABLA COMPACTA */
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-100 border-b border-stone-200 text-stone-600 font-extrabold">
                    <tr>
                      <th className="py-3 px-3.5">Folio</th>
                      <th className="py-3 px-3.5">Estado</th>
                      <th className="py-3 px-3.5">Cliente</th>
                      <th className="py-3 px-3.5">Entrega</th>
                      <th className="py-3 px-3.5">Sucursal</th>
                      <th className="py-3 px-3.5 text-right">Total</th>
                      <th className="py-3 px-3.5 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-medium text-stone-800">
                    {filteredOrders.map((order) => {
                      const isDelivered = order.status === "entregado";

                      return (
                        <tr
                          key={order.id}
                          className="hover:bg-stone-50/80 transition-colors"
                        >
                          <td className="py-2.5 px-3.5 font-mono font-black text-stone-900 whitespace-nowrap">
                            {order.orderNumber}
                          </td>
                          <td className="py-2.5 px-3.5 whitespace-nowrap">
                            {isDelivered ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-lg bg-teal-100 text-teal-800">
                                <Check className="w-3 h-3 text-teal-600" />
                                Entregado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-lg bg-rose-100 text-rose-800">
                                <Trash2 className="w-3 h-3 text-rose-600" />
                                Baja
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3.5 whitespace-nowrap">
                            <div className="font-extrabold text-stone-900">
                              {order.customerName}
                            </div>
                            {order.phone && (
                              <div className="text-[10px] text-stone-500 font-mono">
                                {order.phone}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3.5 whitespace-nowrap">
                            <div>{order.deliveryDate}</div>
                            <div className="text-[10px] text-stone-400">
                              {order.deliveryTime || "16:00"} hrs
                            </div>
                          </td>
                          <td className="py-2.5 px-3.5 whitespace-nowrap text-stone-600">
                            {order.branchName || "Matriz"}
                          </td>
                          <td className="py-2.5 px-3.5 text-right font-mono font-black text-stone-900 whitespace-nowrap">
                            {formatCurrency(order.total)}
                          </td>
                          <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => onViewOrderDetail(order)}
                                className="p-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg transition-colors cursor-pointer"
                                title="Ver Detalle Completo"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onPrintReceipt(order)}
                                className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200 rounded-lg transition-colors cursor-pointer font-bold flex items-center gap-1 text-[11px]"
                                title="Imprimir Ticket"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                                <span>Ticket</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => onSendWhatsApp(order)}
                                className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg transition-colors cursor-pointer"
                                title="Enviar WhatsApp"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </button>
                              {onDeleteOrderPermanently && (
                                <button
                                  type="button"
                                  onClick={() => onDeleteOrderPermanently(order)}
                                  className="px-2 py-1 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 rounded-lg transition-colors cursor-pointer font-bold flex items-center gap-1 text-[11px]"
                                  title="Eliminar Pedido"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Eliminar</span>
                                </button>
                              )}
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
        </div>

        {/* 5. FOOTER DEL DASHBOARD */}
        <div className="bg-stone-100 px-5 sm:px-7 py-3 border-t border-stone-200 flex items-center justify-between shrink-0 text-xs text-stone-500 font-medium">
          <div className="flex items-center gap-2">
            <span>
              Mostrando <strong>{filteredOrders.length}</strong> de{" "}
              <strong>{allHistoryOrders.length}</strong> pedidos en historial
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-bold transition-all cursor-pointer shadow-xs"
          >
            Cerrar Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
