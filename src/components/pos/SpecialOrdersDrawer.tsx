"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Search,
  Plus,
  Cake,
  Clock,
  DollarSign,
  Receipt,
  Send,
  CheckCircle2,
  RefreshCw
} from "lucide-react";
import { CustomOrder } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { getStoredOrders, updateOrderStatus } from "@/lib/orders";
import OrderPaymentModal from "@/components/pedidos/OrderPaymentModal";
import OrderReceiptModal from "@/components/pedidos/OrderReceiptModal";
import CreateOrderModal from "@/components/pedidos/CreateOrderModal";

interface SpecialOrdersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  branchId?: string;
  branchName?: string;
  cashierName?: string;
}

export default function SpecialOrdersDrawer({
  isOpen,
  onClose,
  branchId,
  branchName = "Sucursal Matriz (Centro)",
  cashierName = "Cajero",
}: SpecialOrdersDrawerProps) {
  const [orders, setOrders] = useState<CustomOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"todos" | "hoy" | "saldo">("todos");

  // Submodals
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<CustomOrder | null>(null);
  const [selectedOrderForReceipt, setSelectedOrderForReceipt] = useState<CustomOrder | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const loadOrders = () => {
    const all = getStoredOrders();
    setOrders(all);
  };

  useEffect(() => {
    if (isOpen) {
      loadOrders();
    }
    const handleUpdate = () => loadOrders();
    window.addEventListener("brito_orders_updated", handleUpdate);
    return () => window.removeEventListener("brito_orders_updated", handleUpdate);
  }, [isOpen]);

  // Today string YYYY-MM-DD
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Filtered orders for this branch
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Branch filter if specified
      if (branchId && order.branchId && order.branchId !== branchId) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = order.customerName.toLowerCase().includes(q);
        const matchFolio = order.orderNumber.toLowerCase().includes(q) || order.id.toLowerCase().includes(q);
        const matchPhone = order.phone?.includes(q);
        if (!matchName && !matchFolio && !matchPhone) return false;
      }

      // Filter tabs
      if (filterMode === "hoy") {
        return order.deliveryDate === todayStr;
      }
      if (filterMode === "saldo") {
        return order.remainingBalance > 0 && order.status !== "cancelado";
      }

      return true;
    });
  }, [orders, branchId, searchQuery, filterMode, todayStr]);

  // WhatsApp sender
  const handleWhatsApp = (order: CustomOrder) => {
    const cleanPhone = (order.phone || "").replace(/\D/g, "");
    if (!cleanPhone) {
      alert("Este pedido no tiene número de teléfono registrado.");
      return;
    }

    const message = encodeURIComponent(
      `Hola ${order.customerName}, le saludamos de Panaderías Brito (${branchName}). Le recordamos que su pedido #${order.orderNumber} (${order.description}) está programado para entrega el ${order.deliveryDate} a las ${order.deliveryTime}. ${
        order.remainingBalance > 0
          ? `Resta por liquidar: $${order.remainingBalance.toFixed(2)} MXN.`
          : "¡Ya está totalmente pagado!"
      } ¡Lo esperamos con gusto!`
    );

    window.open(`https://wa.me/52${cleanPhone}?text=${message}`, "_blank");
  };

  const handleQuickDeliver = (order: CustomOrder) => {
    updateOrderStatus(order.id, "entregado");
    loadOrders();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Drawer Panel */}
      <div className="w-full max-w-xl bg-neutral-900 text-stone-100 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200 border-l border-amber-900/40">
        {/* Header Oficial Café Panadería Brito */}
        <div className="bg-gradient-to-r from-[#24130c] via-[#2d1810] to-[#3d1d11] p-4 px-5 border-b border-amber-900/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-md">
              <Cake className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base text-white tracking-wide">Pedidos Especiales</h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300">
                  50% Mínimo
                </span>
              </div>
              <p className="text-[11px] text-amber-200/80 font-medium">{branchName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white text-xs font-black rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
              title="Apartar nuevo pedido con 50% de anticipo"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Pedido</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Cerrar cajón"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barra de Filtros y Búsqueda Rápida */}
        <div className="p-3 bg-stone-900 border-b border-stone-800 space-y-2 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Buscar por cliente, folio (PED-101) o teléfono..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-stone-800/90 border border-stone-700 rounded-xl text-xs text-white placeholder:text-stone-400 focus:outline-none focus:border-amber-500 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white p-0.5 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center justify-between gap-1 text-xs">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFilterMode("todos")}
                className={`px-3 py-1 rounded-lg font-bold transition-all text-[11px] cursor-pointer ${
                  filterMode === "todos"
                    ? "bg-amber-500 text-stone-950 shadow-sm"
                    : "bg-stone-800 text-stone-300 hover:bg-stone-700"
                }`}
              >
                Todos ({orders.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("hoy")}
                className={`px-3 py-1 rounded-lg font-bold transition-all text-[11px] cursor-pointer ${
                  filterMode === "hoy"
                    ? "bg-amber-500 text-stone-950 shadow-sm"
                    : "bg-stone-800 text-stone-300 hover:bg-stone-700"
                }`}
              >
                Para Hoy
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("saldo")}
                className={`px-3 py-1 rounded-lg font-bold transition-all text-[11px] cursor-pointer ${
                  filterMode === "saldo"
                    ? "bg-amber-500 text-stone-950 shadow-sm"
                    : "bg-stone-800 text-stone-300 hover:bg-stone-700"
                }`}
              >
                Con Saldo Pendiente
              </button>
            </div>

            <button
              type="button"
              onClick={loadOrders}
              className="text-[11px] text-stone-400 hover:text-amber-300 flex items-center gap-1 p-1 rounded transition-colors cursor-pointer"
              title="Actualizar pedidos"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Lista de Tarjetas Simplificadas (Diseño Resumido y Compacto) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-950/60">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-stone-800 text-stone-500 flex items-center justify-center mx-auto text-xl">
                🎂
              </div>
              <p className="text-sm font-bold text-stone-400">No se encontraron pedidos con estos filtros</p>
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl shadow-md cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Apartar Nuevo Pedido
              </button>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const isToday = order.deliveryDate === todayStr;
              const hasRemaining = order.remainingBalance > 0 && order.status !== "cancelado";
              const isDelivered = order.status === "entregado";

              return (
                <div
                  key={order.id}
                  className="bg-stone-900 border border-stone-800 hover:border-amber-900/60 rounded-2xl p-3.5 space-y-2.5 transition-all shadow-md"
                >
                  {/* Fila 1: Folio, Cliente y Total */}
                  <div className="flex items-center justify-between gap-2 border-b border-stone-800 pb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono font-black text-xs px-2 py-0.5 rounded bg-black border border-stone-700 text-amber-300 shrink-0">
                        #{order.orderNumber}
                      </span>
                      <span className="font-black text-sm text-white truncate">
                        {order.customerName}
                      </span>
                      {order.phone && order.phone !== "N/A" && (
                        <span className="text-[10px] text-stone-400 font-mono hidden sm:inline">
                          ({order.phone})
                        </span>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono font-black text-sm text-white">
                        {formatCurrency(order.total)}
                      </span>
                    </div>
                  </div>

                  {/* Fila 2: Descripción Resumida en 1 Sola Línea */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0 flex-1">
                      <p className="text-stone-300 font-semibold truncate leading-tight">
                        🎂 {order.description}
                      </p>
                      {order.dedication && (
                        <p className="text-[11px] text-amber-300/80 italic font-medium truncate mt-0.5">
                          "{order.dedication}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Fila 3: Fecha/Hora y Saldo Destacado */}
                  <div className="flex items-center justify-between gap-2 text-xs pt-1">
                    <div className="flex items-center gap-1.5 text-stone-400 text-[11px]">
                      <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span className={isToday ? "text-amber-400 font-black" : "font-medium"}>
                        {isToday ? "¡Hoy!" : order.deliveryDate} • {order.deliveryTime} hrs
                      </span>
                    </div>

                    <div className="text-right">
                      {hasRemaining ? (
                        <span className="inline-block px-2.5 py-0.5 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-400 font-mono font-black text-xs">
                          Resta pagar: {formatCurrency(order.remainingBalance)}
                        </span>
                      ) : (
                        <span className="inline-block px-2.5 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-mono font-black text-[11px]">
                          ✓ Totalmente Pagado
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Fila 4: Botones de Acción Directos y Claros */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-800/80">
                    <div className="flex items-center gap-1.5">
                      {/* WhatsApp */}
                      <button
                        type="button"
                        onClick={() => handleWhatsApp(order)}
                        className="px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-emerald-950/70 hover:text-emerald-300 text-stone-300 text-[11px] font-bold border border-stone-700 transition-colors flex items-center gap-1 cursor-pointer"
                        title="Enviar aviso por WhatsApp"
                      >
                        <Send className="w-3 h-3 text-emerald-400" />
                        <span className="hidden sm:inline">WhatsApp</span>
                      </button>

                      {/* Ticket Comprobante */}
                      <button
                        type="button"
                        onClick={() => setSelectedOrderForReceipt(order)}
                        className="px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-[11px] font-bold border border-stone-700 transition-colors flex items-center gap-1 cursor-pointer"
                        title="Imprimir ticket de comprobante"
                      >
                        <Receipt className="w-3 h-3 text-amber-400" />
                        <span>Ticket</span>
                      </button>
                    </div>

                    {/* Botón Principal de Cobro / Entrega */}
                    <div>
                      {hasRemaining ? (
                        <button
                          type="button"
                          onClick={() => setSelectedOrderForPayment(order)}
                          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>Cobrar {formatCurrency(order.remainingBalance)} y Entregar</span>
                        </button>
                      ) : !isDelivered ? (
                        <button
                          type="button"
                          onClick={() => handleQuickDeliver(order)}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Marcar Entregado</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-stone-500 font-bold px-2 py-1">
                          ✓ Entregado
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Submodal 1: Cobro y Liquidación de Saldo */}
      {selectedOrderForPayment && (
        <OrderPaymentModal
          isOpen={!!selectedOrderForPayment}
          onClose={() => setSelectedOrderForPayment(null)}
          order={selectedOrderForPayment}
          onPaymentSuccess={() => {
            setSelectedOrderForPayment(null);
            loadOrders();
          }}
        />
      )}

      {/* Submodal 2: Comprobante Térmico de Pedido */}
      {selectedOrderForReceipt && (
        <OrderReceiptModal
          isOpen={!!selectedOrderForReceipt}
          onClose={() => setSelectedOrderForReceipt(null)}
          order={selectedOrderForReceipt}
        />
      )}

      {/* Submodal 3: Crear / Apartar Nuevo Pedido */}
      {isCreateOpen && (
        <CreateOrderModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onOrderCreated={() => {
            setIsCreateOpen(false);
            loadOrders();
          }}
        />
      )}
    </div>
  );
}
