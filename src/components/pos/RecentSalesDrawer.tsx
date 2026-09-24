"use client";

import React, { useState } from "react";
import { History, X, Receipt, RefreshCw, Printer, DollarSign, CreditCard, Send, Search, Cake, Eye } from "lucide-react";
import { Sale, CustomOrder } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { getStoredOrders } from "@/lib/orders";

interface RecentSalesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sales: Sale[];
  onSelectSaleForReprint: (sale: Sale) => void;
  orders?: CustomOrder[];
  onSelectOrderForReceipt?: (order: CustomOrder) => void;
  onSelectOrderForPayment?: (order: CustomOrder) => void;
}

export default function RecentSalesDrawer({
  isOpen,
  onClose,
  sales,
  onSelectSaleForReprint,
  orders,
  onSelectOrderForReceipt,
  onSelectOrderForPayment,
}: RecentSalesDrawerProps) {
  const [filterMethod, setFilterMethod] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "ventas" | "pedidos">("all");
  const [searchQuery, setSearchQuery] = useState("");

  if (!isOpen) return null;

  const effectiveOrders = orders && orders.length > 0 ? orders : getStoredOrders();

  const filteredSales = sales.filter((s) => {
    if (typeFilter === "pedidos") return false;
    if (filterMethod !== "all" && s.paymentMethod !== filterMethod) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchId = s.id.toLowerCase().includes(q);
      const matchCashier = (s.cashier || "").toLowerCase().includes(q);
      const matchCustomer = (s.customerName || "").toLowerCase().includes(q);
      const matchItems = (s.items || []).some((i) => i.product.name.toLowerCase().includes(q));
      return matchId || matchCashier || matchCustomer || matchItems;
    }
    return true;
  });

  const filteredOrders = effectiveOrders.filter((o) => {
    if (typeFilter === "ventas") return false;
    if (filterMethod !== "all" && o.paymentMethod !== filterMethod) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchNumber = (o.orderNumber || "").toLowerCase().includes(q);
      const matchId = (o.id || "").toLowerCase().includes(q);
      const matchCustomer = (o.customerName || "").toLowerCase().includes(q);
      const matchCashier = (o.cashier || "").toLowerCase().includes(q);
      const matchDesc = (o.description || "").toLowerCase().includes(q);
      const matchItems = (o.items || []).some((i) => i.name.toLowerCase().includes(q));
      return matchNumber || matchId || matchCustomer || matchCashier || matchDesc || matchItems;
    }
    return true;
  });

  const totalSalesAmount = sales.reduce((sum, s) => sum + s.total, 0);
  const totalOrdersAmount = effectiveOrders.reduce((sum, o) => sum + (Number(o.deposit) || 0), 0);
  const combinedTotalAmount = totalSalesAmount + totalOrdersAmount;
  const totalRecords = sales.length + effectiveOrders.length;
  const totalPiecesSold = sales.reduce(
    (sum, s) => sum + (s.items || []).reduce((iSum, i) => iSum + i.quantity, 0),
    0
  );

  const getMethodIcon = (method: string) => {
    switch (method) {
      case "efectivo":
        return <DollarSign className="w-3.5 h-3.5 text-emerald-600" />;
      case "tarjeta":
        return <CreditCard className="w-3.5 h-3.5 text-blue-600" />;
      case "transferencia":
        return <Send className="w-3.5 h-3.5 text-purple-600" />;
      default:
        return <DollarSign className="w-3.5 h-3.5 text-amber-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex justify-end bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="p-5 border-b border-stone-200 bg-amber-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <History className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-sm">Historial de Ventas del Turno</h3>
              <p className="text-[11px] text-amber-200/80">Tickets emitidos, resumen y reimpresión</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-amber-900 rounded-xl text-amber-200 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sales Summary Banner */}
        <div className="grid grid-cols-3 gap-2 p-3.5 bg-amber-50/80 border-b border-amber-200 text-center">
          <div className="bg-white p-2 rounded-xl border border-amber-200/80 shadow-2xs">
            <span className="text-[10px] font-bold text-stone-500 block uppercase">Total Cobrado</span>
            <p className="text-base sm:text-lg font-black text-stone-900 mt-0.5">{formatCurrency(combinedTotalAmount)}</p>
          </div>
          <div className="bg-white p-2 rounded-xl border border-amber-200/80 shadow-2xs">
            <span className="text-[10px] font-bold text-stone-500 block uppercase">Registros</span>
            <p className="text-base sm:text-lg font-black text-amber-800 mt-0.5">{totalRecords}</p>
          </div>
          <div className="bg-white p-2 rounded-xl border border-amber-200/80 shadow-2xs">
            <span className="text-[10px] font-bold text-stone-500 block uppercase">Piezas Pan</span>
            <p className="text-base sm:text-lg font-black text-emerald-800 mt-0.5">{totalPiecesSold}</p>
          </div>
        </div>

        {/* Filter Pills & Search */}
        <div className="p-3 border-b border-stone-100 space-y-2 bg-stone-50">
          {/* Tipo de Registro */}
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            {[
              { id: "all", label: `Todos (${totalRecords})` },
              { id: "ventas", label: `🥖 Ventas (${sales.length})` },
              { id: "pedidos", label: `🎂 Pedidos (${effectiveOrders.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTypeFilter(tab.id as any)}
                className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  typeFilter === tab.id
                    ? "bg-stone-900 text-white shadow-xs"
                    : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Método de pago */}
          <div className="flex gap-1.5 overflow-x-auto">
            {[
              { id: "all", label: "Todos los métodos" },
              { id: "efectivo", label: "🪙 Efectivo" },
              { id: "tarjeta", label: "💳 Tarjeta" },
              { id: "transferencia", label: "📲 Transf." },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterMethod(tab.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  filterMethod === tab.id
                    ? "bg-amber-600 text-white shadow-2xs"
                    : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Buscar por # ticket, PED-..., producto o cliente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-2 bg-white border border-stone-200 rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:border-amber-600 transition-colors placeholder:text-stone-400 shadow-2xs"
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
        </div>

        {/* Listado de Ventas y Pedidos */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredSales.length === 0 && filteredOrders.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-stone-400 text-center p-6">
              <Receipt className="w-12 h-12 stroke-1 mb-2 text-stone-300" />
              <p className="text-sm font-bold text-stone-600">Sin registros en este filtro</p>
              <p className="text-xs mt-0.5">Las ventas y pedidos especiales aparecerán aquí automáticamente.</p>
            </div>
          ) : (
            <>
              {/* Pedidos Especiales */}
              {filteredOrders.length > 0 && (
                <div className="space-y-2.5">
                  {typeFilter === "all" && (
                    <span className="text-[11px] font-black uppercase text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full inline-block">
                      🎂 Pedidos Especiales ({filteredOrders.length})
                    </span>
                  )}
                  {filteredOrders.map((order) => (
                    <div
                      key={order.id}
                      className="bg-amber-50/40 hover:bg-amber-50/80 p-3.5 rounded-2xl border-2 border-amber-300/80 transition-all space-y-2"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] bg-amber-500 text-stone-950 font-black px-1.5 py-0.5 rounded">
                            🎂 Pedido
                          </span>
                          <span className="text-xs font-bold text-stone-800 font-mono bg-white px-1.5 py-0.5 rounded border border-stone-200">
                            #{order.orderNumber}
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            order.paymentStatus === "liquidado"
                              ? "bg-emerald-100 text-emerald-900"
                              : "bg-amber-100 text-amber-900"
                          }`}>
                            {order.paymentStatus === "liquidado" ? "Liquidado" : "Anticipo"}
                          </span>
                          {order.customerName && (
                            <span className="text-[10px] font-bold text-stone-700 bg-white border border-stone-200 px-1.5 py-0.5 rounded">
                              👤 {order.customerName}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-stone-500">
                          Entrega: {order.deliveryDate}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <p className="text-stone-600 font-medium truncate max-w-[220px]">
                          {order.description || (order.items || []).map((i) => `${i.quantity}x ${i.name}`).join(", ")}
                        </p>
                        <div className="text-right">
                          <p className="text-sm font-black text-stone-900">{formatCurrency(order.total)}</p>
                          <p className="text-[10px] font-bold text-emerald-700">Cobrado: {formatCurrency(order.deposit)}</p>
                        </div>
                      </div>

                      <div className="border-t border-amber-200/60 pt-2 flex items-center justify-between">
                        <span className="text-[10px] text-stone-500">
                          {order.cashier ? `Cajero: ${order.cashier}` : ""}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {order.remainingBalance > 0 && onSelectOrderForPayment && (
                            <button
                              type="button"
                              onClick={() => onSelectOrderForPayment(order)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-all cursor-pointer"
                            >
                              Cobrar Saldo
                            </button>
                          )}
                          {onSelectOrderForReceipt && (
                            <button
                              type="button"
                              onClick={() => onSelectOrderForReceipt(order)}
                              className="flex items-center gap-1 px-3 py-1 bg-white hover:bg-stone-900 hover:text-white text-stone-700 font-bold rounded-xl text-xs border border-stone-200 shadow-2xs transition-all cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" /> Ticket
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Ventas de Mostrador */}
              {filteredSales.length > 0 && (
                <div className="space-y-2.5">
                  {typeFilter === "all" && filteredOrders.length > 0 && (
                    <span className="text-[11px] font-black uppercase text-stone-700 bg-stone-200 px-2 py-0.5 rounded-full inline-block">
                      🥖 Ventas de Mostrador ({filteredSales.length})
                    </span>
                  )}
                  {filteredSales.map((sale) => {
                    const totalItems = sale.items.reduce((sum, i) => sum + i.quantity, 0);
                    return (
                      <div
                        key={sale.id}
                        className="bg-stone-50 hover:bg-amber-50/50 p-4 rounded-2xl border border-stone-200/80 transition-all space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-stone-800 font-mono bg-white px-1.5 py-0.5 rounded border border-stone-200">
                              #{sale.id.slice(-6).toUpperCase()}
                            </span>
                            {sale.customerName && sale.customerName !== "Público General" && sale.customerName !== "Público general" && (
                              <span className="text-[10px] font-bold text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded">
                                👤 {sale.customerName}
                              </span>
                            )}
                            {sale.cashier && (
                              <span className="text-[10px] text-stone-500">
                                ({sale.cashier})
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-stone-500">{sale.date}</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="text-xs text-stone-600 space-y-0.5">
                            <p className="font-semibold text-stone-800">
                              {totalItems} {totalItems === 1 ? "pieza" : "piezas"}
                            </p>
                            <p className="text-[11px] text-stone-500 truncate max-w-[200px]">
                              {sale.items.map((i) => `${i.quantity}x ${i.product.name}`).join(", ")}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-black text-amber-800">{formatCurrency(sale.total)}</p>
                            <div className="flex items-center justify-end gap-1 text-[10px] uppercase font-bold text-stone-500">
                              {getMethodIcon(sale.paymentMethod)}
                              <span>{sale.paymentMethod}</span>
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-stone-200/60 pt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => onSelectSaleForReprint(sale)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-stone-900 hover:text-white text-stone-700 font-bold rounded-xl text-xs border border-stone-200 shadow-2xs transition-all cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" /> Ver / Reimprimir Ticket
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
