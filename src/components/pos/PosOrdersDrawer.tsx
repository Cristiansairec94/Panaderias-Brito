"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Plus,
  Search,
  Calendar,
  Clock,
  User,
  Phone,
  Store,
  DollarSign,
  Cake,
  CheckCircle2,
  AlertCircle,
  Printer,
  Send,
  CalendarClock,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  MapPin,
  RefreshCw,
  ShoppingBag
} from "lucide-react";
import { CustomOrder } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { getStoredOrders, updateOrderStatus } from "@/lib/orders";

interface PosOrdersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  branchId: string;
  branchName: string;
  cashierName: string;
  onOpenCreateOrder: () => void;
  onSelectOrderForReceipt: (order: CustomOrder) => void;
  onSelectOrderForPayment: (order: CustomOrder) => void;
}

export default function PosOrdersDrawer({
  isOpen,
  onClose,
  branchId,
  branchName,
  cashierName,
  onOpenCreateOrder,
  onSelectOrderForReceipt,
  onSelectOrderForPayment,
}: PosOrdersDrawerProps) {
  const [orders, setOrders] = useState<CustomOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"todos" | "hoy" | "manana" | "saldo">("todos");

  // Recargar pedidos desde localStorage
  const refreshOrders = () => {
    setOrders(getStoredOrders());
  };

  useEffect(() => {
    if (isOpen) {
      refreshOrders();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleUpdate = () => refreshOrders();
    window.addEventListener("brito_orders_updated", handleUpdate);
    return () => window.removeEventListener("brito_orders_updated", handleUpdate);
  }, []);

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  }, []);

  // Filtrar pedidos correspondientes a esta sucursal
  const branchOrders = useMemo(() => {
    return orders.filter((o) => {
      // Filtrar por la sucursal activa
      if (branchId && o.branchId && o.branchId !== branchId) {
        return false;
      }
      return true;
    });
  }, [orders, branchId]);

  // Pedidos activos (no entregados ni cancelados)
  const activeBranchOrders = useMemo(() => {
    return branchOrders.filter((o) => o.status !== "entregado" && o.status !== "cancelado");
  }, [branchOrders]);

  // Filtrado por buscador y chips
  const filteredOrders = useMemo(() => {
    return branchOrders.filter((order) => {
      // Filtros rápidos
      if (filterMode === "hoy" && order.deliveryDate !== todayStr) return false;
      if (filterMode === "manana" && order.deliveryDate !== tomorrowStr) return false;
      if (filterMode === "saldo" && order.remainingBalance <= 0) return false;

      // Buscador
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
  }, [branchOrders, filterMode, searchQuery, todayStr, tomorrowStr]);

  // Mensaje de WhatsApp
  const handleWhatsApp = (order: CustomOrder) => {
    const cleanPhone = order.phone.replace(/\D/g, "");
    const formattedPhone = cleanPhone.length === 10 ? `52${cleanPhone}` : cleanPhone;

    const message =
      `🥖 *PANADERÍA & PASTELERÍA BRITO*\n` +
      `Hola *${order.customerName}*,\n\n` +
      `Te informamos el estado de tu pedido especial *${order.orderNumber}*:\n` +
      `🏬 *Sucursal:* ${order.branchName}\n` +
      `📅 *Fecha de entrega:* ${order.deliveryDate} a las ${order.deliveryTime || "16:00"} hrs\n` +
      (order.deliveryType === "domicilio" ? `📍 *Entrega:* A Domicilio (${order.deliveryAddress})\n` : `📍 *Entrega:* Mostrador de sucursal\n`) +
      `🎂 *Encargo:* ${order.description}\n` +
      (order.dedication ? `✍️ *Dedicatoria:* "${order.dedication}"\n` : "") +
      `💰 *Total:* ${formatCurrency(order.total)}\n` +
      `💵 *Anticipo Pagado:* ${formatCurrency(order.deposit)}\n` +
      `⚠️ *Resta por pagar:* ${order.remainingBalance > 0 ? formatCurrency(order.remainingBalance) : "Totalmente liquidado"}\n\n` +
      `¡Estamos preparando tu pedido con el mejor sabor tradicional!`;

    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const handleMarkDeliveredDirectly = (order: CustomOrder) => {
    if (order.remainingBalance > 0) {
      onSelectOrderForPayment(order);
    } else {
      updateOrderStatus(order.id, "entregado");
      refreshOrders();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex justify-end bg-stone-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header con estilo cálido de panadería */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-stone-900 via-stone-900 to-amber-950 text-white flex items-center justify-between border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-amber-600/30">
              <Cake className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg tracking-tight text-white leading-tight">
                  Pedidos Especiales en Caja
                </h3>
                <span className="text-[10px] bg-amber-500 text-stone-950 font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                  50% Mínimo
                </span>
              </div>
              <p className="text-xs text-amber-200/80 flex items-center gap-1.5 mt-0.5">
                <Store className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-bold text-white">{branchName}</span>
                <span className="text-stone-400">• Atiende: {cashierName}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-stone-800 text-stone-400 hover:text-white rounded-2xl transition-colors"
            title="Cerrar panel de pedidos especiales"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Banner Informativo de la Política del 50% Obligatorio */}
        <div className="bg-amber-50 border-b border-amber-200/80 p-3.5 px-6 flex items-start gap-3 text-amber-950 shrink-0">
          <div className="p-1.5 bg-amber-200/70 text-amber-900 rounded-xl shrink-0 mt-0.5">
            <ShieldCheck className="w-4 h-4 text-amber-800" />
          </div>
          <div className="text-xs leading-relaxed">
            <p className="font-extrabold text-amber-900 uppercase tracking-wide text-[11px]">
              Regla de Apartado de Pedidos Especiales
            </p>
            <p className="font-medium text-stone-800 text-[11.5px] mt-0.5">
              Se requiere un <strong>anticipo mínimo del 50%</strong> para apartar cualquier pedido (pasteles, pan de evento o mayoreo) para asegurar el cupo en el horno y los insumos. El 50% restante se liquida al entregar.
            </p>
          </div>
        </div>

        {/* Botón Principal y Táctil para Levantar Pedido Especial */}
        <div className="p-4 px-6 bg-stone-50 border-b border-stone-200 shrink-0 space-y-3">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenCreateOrder();
            }}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-700 hover:to-orange-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-amber-600/25 flex items-center justify-center gap-2.5 active:scale-98 transition-all cursor-pointer"
          >
            <Plus className="w-5 h-5 text-white" />
            <span>+ Levantar Nuevo Pedido Especial (Anticipo 50%)</span>
          </button>

          {/* Buscador y Filtros */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Buscar por cliente, folio (PED-...) o teléfono..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-white border border-stone-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Chips de filtro rápido */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: "todos", label: "Todos" },
                { id: "hoy", label: "Hoy" },
                { id: "manana", label: "Mañana" },
                { id: "saldo", label: "Con Saldo" },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilterMode(f.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-colors ${
                    filterMode === f.id
                      ? "bg-stone-900 text-white shadow-xs"
                      : "bg-stone-200 text-stone-700 hover:bg-stone-300"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Lista de Pedidos de la Sucursal */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-stone-200">
            <span className="text-xs font-black text-stone-900 uppercase tracking-wider flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-amber-700" />
              <span>Pedidos de {branchName}</span>
              <span className="text-[11px] bg-stone-200 text-stone-800 px-2 py-0.5 rounded-full font-black">
                {filteredOrders.length}
              </span>
            </span>

            <button
              type="button"
              onClick={refreshOrders}
              className="text-xs font-bold text-amber-800 hover:text-amber-950 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Actualizar</span>
            </button>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="text-center py-12 bg-stone-50 rounded-3xl border border-dashed border-stone-300 space-y-3">
              <div className="text-4xl">🎂</div>
              <h5 className="font-bold text-sm text-stone-800">No hay pedidos encontrados</h5>
              <p className="text-xs text-stone-500 max-w-xs mx-auto">
                {searchQuery || filterMode !== "todos"
                  ? "No hay pedidos que coincidan con la búsqueda o filtro aplicado."
                  : "No hay pedidos especiales registrados en esta sucursal."}
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCreateOrder();
                }}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow-md transition-colors"
              >
                + Tomar Pedido Especial Ahora
              </button>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const depositPercentage = order.total > 0 ? Math.round((order.deposit / order.total) * 100) : 0;
              const isDelivered = order.status === "entregado";

              return (
                <div
                  key={order.id}
                  className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all space-y-3.5 ${
                    isDelivered
                      ? "border-stone-200 opacity-70 bg-stone-50/50"
                      : "border-stone-200 shadow-xs hover:border-amber-400 hover:shadow-md"
                  }`}
                >
                  {/* Fila Superior: Folio, Estado y Total */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-black text-amber-950 bg-amber-100/90 px-2.5 py-1 rounded-lg border border-amber-300">
                        {order.orderNumber}
                      </span>
                      <span
                        className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          order.status === "entregado"
                            ? "bg-stone-200 text-stone-700"
                            : order.status === "listo"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : order.status === "en_horno"
                            ? "bg-blue-100 text-blue-800 border border-blue-300"
                            : "bg-amber-100 text-amber-800 border border-amber-300"
                        }`}
                      >
                        {order.status === "entregado"
                          ? "✓ Entregado"
                          : order.status === "listo"
                          ? "Listo en Tienda"
                          : order.status === "en_horno"
                          ? "En Producción / Horno"
                          : "Agendado (50%+)"}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-stone-400 block uppercase text-[10px]">Total</span>
                      <span className="text-base font-black text-stone-900">{formatCurrency(order.total)}</span>
                    </div>
                  </div>

                  {/* Datos del Cliente */}
                  <div>
                    <p className="font-black text-sm sm:text-base text-stone-900 flex items-center gap-2">
                      <span>{order.customerName}</span>
                    </p>
                    <p className="text-xs text-stone-500 flex items-center gap-1.5 mt-0.5">
                      <Phone className="w-3.5 h-3.5 text-stone-400" />
                      <span>{order.phone}</span>
                    </p>
                  </div>

                  {/* Detalle del Pedido */}
                  <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/80 text-xs space-y-1">
                    <span className="font-extrabold text-stone-600 text-[10px] uppercase block">
                      Detalle del Encargo:
                    </span>
                    <p className="font-semibold text-stone-800">{order.description}</p>
                    {order.dedication && (
                      <p className="text-[11px] font-bold text-amber-900 italic pt-1 border-t border-stone-200/60">
                        Dedicatoria: "{order.dedication}"
                      </p>
                    )}
                  </div>

                  {/* Fecha y Modalidad de Entrega */}
                  <div className="flex items-center justify-between text-xs bg-amber-50/60 p-2.5 px-3 rounded-xl border border-amber-200/60 text-stone-700">
                    <span className="flex items-center gap-1.5 font-bold">
                      <Clock className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>
                        Entrega: <strong>{order.deliveryDate}</strong> a las <strong>{order.deliveryTime || "16:00"} hrs</strong>
                      </span>
                    </span>
                    <span className="text-[10px] font-extrabold text-amber-900 capitalize px-2 py-0.5 rounded-md bg-amber-100">
                      {order.deliveryType === "domicilio" ? "A Domicilio" : "En Mostrador"}
                    </span>
                  </div>

                  {/* Desglose Financiero: Anticipo vs Resta */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-emerald-50 border border-emerald-200/80 p-2.5 rounded-xl">
                      <span className="text-[10px] font-extrabold text-emerald-700 block uppercase">
                        Anticipo Pagado:
                      </span>
                      <span className="font-black text-emerald-950 text-sm">
                        {formatCurrency(order.deposit)} ({depositPercentage}%)
                      </span>
                    </div>
                    <div
                      className={`p-2.5 rounded-xl border ${
                        order.remainingBalance > 0
                          ? "bg-rose-50 border-rose-200 text-rose-950"
                          : "bg-stone-100 border-stone-200 text-stone-600"
                      }`}
                    >
                      <span className="text-[10px] font-extrabold block uppercase">
                        {order.remainingBalance > 0 ? "Resta al Entregar:" : "Estado de Saldo:"}
                      </span>
                      <span className="font-black text-sm">
                        {order.remainingBalance > 0 ? formatCurrency(order.remainingBalance) : "¡Totalmente Liquidado!"}
                      </span>
                    </div>
                  </div>

                  {/* Acciones del Pedido */}
                  <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectOrderForReceipt(order)}
                        className="p-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-colors"
                        title="Ver e imprimir ticket térmico"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Ticket</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleWhatsApp(order)}
                        className="p-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-colors"
                        title="Enviar estado por WhatsApp"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </button>
                    </div>

                    {!isDelivered ? (
                      order.remainingBalance > 0 ? (
                        <button
                          type="button"
                          onClick={() => onSelectOrderForPayment(order)}
                          className="py-2 px-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                        >
                          <DollarSign className="w-4 h-4 text-white" />
                          <span>Cobrar {formatCurrency(order.remainingBalance)} y Entregar</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleMarkDeliveredDirectly(order)}
                          className="py-2 px-4 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition-all active:scale-95"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Marcar como Entregado</span>
                        </button>
                      )
                    ) : (
                      <span className="text-xs font-bold text-stone-500 italic">
                        Pedido ya entregado al cliente
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
