"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Plus,
  Search,
  Clock,
  Phone,
  Store,
  DollarSign,
  Cake,
  CheckCircle2,
  Printer,
  Send,
  CalendarClock,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  Trash2
} from "lucide-react";
import { CustomOrder } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { getStoredOrders, updateOrderStatus, deleteCustomOrder } from "@/lib/orders";

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
  const [filterMode, setFilterMode] = useState<"todos" | "hoy" | "saldo">("todos");
  const [branchScope, setBranchScope] = useState<"esta" | "todas">("esta");

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

  // Filtrar pedidos de esta sucursal (o todas las sucursales si se selecciona)
  const branchOrders = useMemo(() => {
    if (branchScope === "todas") return orders;
    return orders.filter((o) => {
      if (!branchId) return true;
      const orderBranch = (o as any).operatingBranchId || o.branchId;
      return !o.branchId || o.branchId === branchId || orderBranch === branchId;
    });
  }, [orders, branchId, branchScope]);

  // Filtrado simple
  const filteredOrders = useMemo(() => {
    return branchOrders.filter((order) => {
      if (filterMode === "hoy" && order.deliveryDate !== todayStr) return false;
      if (filterMode === "saldo" && order.remainingBalance <= 0) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNumber = order.orderNumber.toLowerCase().includes(q);
        const matchCustomer = order.customerName.toLowerCase().includes(q);
        const matchPhone = order.phone.includes(q);
        const matchDesc = order.description.toLowerCase().includes(q);
        if (!matchNumber && !matchCustomer && !matchPhone && !matchDesc) return false;
      }

      return true;
    });
  }, [branchOrders, filterMode, searchQuery, todayStr]);

  // WhatsApp
  const handleWhatsApp = (order: CustomOrder) => {
    const cleanPhone = order.phone.replace(/\D/g, "");
    const formattedPhone = cleanPhone.length === 10 ? `52${cleanPhone}` : cleanPhone;

    const message =
      `🥖 *PANADERÍA BRITO - PEDIDO ESPECIAL*\n` +
      `Hola *${order.customerName}*,\n\n` +
      `Tu pedido *${order.orderNumber}* está programado en nuestro horno:\n` +
      `📅 *Entrega:* ${order.deliveryDate} a las ${order.deliveryTime || "16:00"} hrs\n` +
      `🎂 *Encargo:* ${order.description}\n` +
      `💰 *Total:* ${formatCurrency(order.total)}\n` +
      `💵 *Anticipo Dejado:* ${formatCurrency(order.deposit)}\n` +
      `⚠️ *Falta por pagar:* ${order.remainingBalance > 0 ? formatCurrency(order.remainingBalance) : "Totalmente liquidado"}\n\n` +
      `¡Muchas gracias por tu preferencia!`;

    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const handleMarkDelivered = (order: CustomOrder) => {
    if (order.remainingBalance > 0) {
      onSelectOrderForPayment(order);
    } else {
      updateOrderStatus(order.id, "entregado");
      refreshOrders();
    }
  };

  const handleDeleteOrder = (order: CustomOrder) => {
    if (confirm(`¿Estás seguro de ELIMINAR el pedido ${order.orderNumber} (${order.customerName})?\n\nEsta acción borrará el pedido por completo del registro.`)) {
      deleteCustomOrder(order.id);
      refreshOrders();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex justify-end bg-stone-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Cabecera */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-stone-900 via-stone-900 to-amber-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center text-xl font-black shrink-0">
              🎂
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg text-white leading-tight">
                  Pedidos Especiales
                </h3>
                <span className="text-[10px] bg-amber-500 text-stone-950 font-black px-2 py-0.5 rounded-full uppercase">
                  50% Mínimo
                </span>
              </div>
              <p className="text-xs text-amber-200/90 flex items-center gap-1.5 mt-0.5">
                <Store className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-bold text-white">{branchName}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Banner de regla clara */}
        <div className="bg-amber-50 border-b border-amber-200 p-3 px-5 flex items-center gap-2.5 text-amber-950 text-xs shrink-0">
          <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
          <span className="font-bold">
            Para apartar cualquier pedido se pide mínimo el <strong>50% de anticipo</strong>. El resto se cobra al entregar.
          </span>
        </div>

        {/* Botón Grande: Levantar Pedido + Buscador */}
        <div className="p-4 bg-stone-50 border-b border-stone-200 shrink-0 space-y-3">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenCreateOrder();
            }}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 hover:from-emerald-700 hover:to-emerald-600 text-white font-black text-sm rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
          >
            <Plus className="w-5 h-5 text-white" />
            <span>+ Apartar Nuevo Pedido (50% de Anticipo)</span>
          </button>

          {/* Buscador y Filtros */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Buscar por cliente o folio..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-7 py-2 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {[
                { id: "todos", label: "Todos" },
                { id: "hoy", label: "Para Hoy" },
                { id: "saldo", label: "Con Saldo" },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilterMode(f.id as any)}
                  className={`px-2.5 py-2 rounded-xl text-xs font-extrabold transition-colors ${
                    filterMode === f.id
                      ? "bg-stone-900 text-white"
                      : "bg-stone-200 text-stone-700 hover:bg-stone-300"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Lista de Pedidos */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          <div className="flex items-center justify-between text-xs text-stone-600 font-bold px-1 pb-1 gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-xl border border-stone-200">
              <button
                type="button"
                onClick={() => setBranchScope("esta")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all ${
                  branchScope === "esta"
                    ? "bg-white text-stone-900 shadow-xs"
                    : "text-stone-500 hover:text-stone-800"
                }`}
              >
                Esta Sucursal ({filteredOrders.length})
              </button>
              <button
                type="button"
                onClick={() => setBranchScope("todas")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all ${
                  branchScope === "todas"
                    ? "bg-white text-stone-900 shadow-xs"
                    : "text-stone-500 hover:text-stone-800"
                }`}
              >
                Todas ({orders.length})
              </button>
            </div>

            <button
              type="button"
              onClick={refreshOrders}
              className="text-amber-800 hover:text-amber-950 flex items-center gap-1 font-bold ml-auto"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Actualizar</span>
            </button>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="text-center py-12 bg-stone-50 rounded-2xl border border-dashed border-stone-300 space-y-2.5 p-4">
              <div className="text-3xl">🎂</div>
              <p className="font-bold text-sm text-stone-800">No hay pedidos pendientes aquí</p>
              <p className="text-xs text-stone-500">
                Usa el botón verde de arriba para apartar el primer pedido con su 50% de anticipo.
              </p>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const isDelivered = order.status === "entregado";
              const hasDebt = order.remainingBalance > 0;

              return (
                <div
                  key={order.id}
                  className={`p-4 rounded-2xl border-2 transition-all space-y-3 ${
                    isDelivered
                      ? "bg-stone-50 border-stone-200 opacity-60"
                      : hasDebt
                      ? "bg-white border-amber-300 shadow-sm"
                      : "bg-emerald-50/40 border-emerald-300 shadow-sm"
                  }`}
                >
                  {/* Fila 1: Folio, Estado y Total */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-xs bg-stone-900 text-white px-2 py-0.5 rounded-lg">
                        {order.orderNumber}
                      </span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                        isDelivered
                          ? "bg-stone-200 text-stone-700"
                          : hasDebt
                          ? "bg-amber-100 text-amber-900 border border-amber-300"
                          : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                      }`}>
                        {isDelivered ? "✓ Entregado" : hasDebt ? "Anticipo 50% Cubierto" : "100% Pagado"}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-stone-400 uppercase font-bold block">Total</span>
                      <span className="text-base font-black text-stone-900">{formatCurrency(order.total)}</span>
                    </div>
                  </div>

                  {/* Fila 2: Cliente y Fecha */}
                  <div>
                    <h4 className="font-black text-sm text-stone-900">{order.customerName}</h4>
                    <div className="flex items-center gap-3 text-xs text-stone-600 mt-0.5">
                      <span className="flex items-center gap-1 font-bold">
                        <Phone className="w-3.5 h-3.5 text-stone-400" /> {order.phone}
                      </span>
                      <span className="flex items-center gap-1 font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        {order.deliveryDate} a las {order.deliveryTime || "16:00"} hrs
                      </span>
                    </div>
                  </div>

                  {/* Fila 3: Descripción del pedido */}
                  <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200 text-xs text-stone-800">
                    <span className="text-[10px] font-black uppercase text-stone-400 block">Encargo:</span>
                    <p className="font-bold">{order.description}</p>
                    {order.dedication && (
                      <p className="text-[11px] font-semibold text-amber-900 italic mt-0.5">
                        Dedicatoria: "{order.dedication}"
                      </p>
                    )}
                  </div>

                  {/* Fila 4: Semáforo de Saldos */}
                  <div className={`p-2.5 px-3 rounded-xl border flex items-center justify-between text-xs ${
                    hasDebt
                      ? "bg-amber-100/60 border-amber-300 text-amber-950"
                      : "bg-emerald-100/60 border-emerald-300 text-emerald-950"
                  }`}>
                    <div>
                      <span className="text-[10px] font-bold block">Anticipo recibido:</span>
                      <span className="font-black text-stone-900">{formatCurrency(order.deposit)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold block">
                        {hasDebt ? "Resta al recoger:" : "Estado:"}
                      </span>
                      <span className={`font-black text-sm ${hasDebt ? "text-rose-700" : "text-emerald-800"}`}>
                        {hasDebt ? formatCurrency(order.remainingBalance) : "✓ Totalmente Pagado"}
                      </span>
                    </div>
                  </div>

                  {/* Fila 5: Botones de Acción */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-100">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onSelectOrderForReceipt(order)}
                        className="p-1.5 px-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                        title="Ver ticket de pedido"
                      >
                        <Printer className="w-3.5 h-3.5" /> Ticket
                      </button>
                      <button
                        type="button"
                        onClick={() => handleWhatsApp(order)}
                        className="p-1.5 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                        title="Enviar mensaje de WhatsApp"
                      >
                        <Send className="w-3.5 h-3.5" /> WhatsApp
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteOrder(order)}
                        className="p-1.5 px-2.5 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-300 hover:border-rose-600 rounded-xl text-xs font-black flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-2xs"
                        title="Eliminar Pedido Definitivamente"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar</span>
                      </button>
                    </div>

                    {!isDelivered ? (
                      hasDebt ? (
                        <button
                          type="button"
                          onClick={() => onSelectOrderForPayment(order)}
                          className="py-2 px-3.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                        >
                          <DollarSign className="w-4 h-4" />
                          <span>Cobrar {formatCurrency(order.remainingBalance)} y Entregar</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleMarkDelivered(order)}
                          className="py-2 px-3.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Marcar Entregado</span>
                        </button>
                      )
                    ) : (
                      <span className="text-xs font-bold text-stone-400 italic">Entregado</span>
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
