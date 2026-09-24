"use client";

import React, { useState } from "react";
import { History, X, Receipt, RefreshCw, Printer, DollarSign, CreditCard, Send, Search } from "lucide-react";
import { Sale } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface RecentSalesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sales: Sale[];
  onSelectSaleForReprint: (sale: Sale) => void;
}

export default function RecentSalesDrawer({
  isOpen,
  onClose,
  sales,
  onSelectSaleForReprint,
}: RecentSalesDrawerProps) {
  const [filterMethod, setFilterMethod] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  if (!isOpen) return null;

  const filteredSales = sales.filter((s) => {
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

  const totalSalesAmount = sales.reduce((sum, s) => sum + s.total, 0);
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
            <span className="text-[10px] font-bold text-stone-500 block uppercase">Total Ventas</span>
            <p className="text-base sm:text-lg font-black text-stone-900 mt-0.5">{formatCurrency(totalSalesAmount)}</p>
          </div>
          <div className="bg-white p-2 rounded-xl border border-amber-200/80 shadow-2xs">
            <span className="text-[10px] font-bold text-stone-500 block uppercase">Tickets</span>
            <p className="text-base sm:text-lg font-black text-amber-800 mt-0.5">{sales.length}</p>
          </div>
          <div className="bg-white p-2 rounded-xl border border-amber-200/80 shadow-2xs">
            <span className="text-[10px] font-bold text-stone-500 block uppercase">Piezas Pan</span>
            <p className="text-base sm:text-lg font-black text-emerald-800 mt-0.5">{totalPiecesSold}</p>
          </div>
        </div>

        {/* Filter Pills & Search */}
        <div className="p-3 border-b border-stone-100 space-y-2 bg-stone-50">
          <div className="flex gap-1.5 overflow-x-auto">
            {[
              { id: "all", label: `Todos (${sales.length})` },
              { id: "efectivo", label: "Efectivo" },
              { id: "tarjeta", label: "Tarjeta" },
              { id: "transferencia", label: "Transf." },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterMethod(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filterMethod === tab.id
                    ? "bg-amber-600 text-white shadow-xs"
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
              placeholder="Buscar por # ticket, producto, cajero o cliente..."
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

        {/* Sales List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredSales.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-stone-400 text-center p-6">
              <Receipt className="w-12 h-12 stroke-1 mb-2 text-stone-300" />
              <p className="text-sm font-bold text-stone-600">Sin tickets en este filtro</p>
              <p className="text-xs mt-0.5">Las ventas registradas aparecerán aquí automáticamente.</p>
            </div>
          ) : (
            filteredSales.map((sale) => {
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
                      onClick={() => onSelectSaleForReprint(sale)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-stone-900 hover:text-white text-stone-700 font-bold rounded-xl text-xs border border-stone-200 shadow-sm transition-all"
                    >
                      <Printer className="w-3.5 h-3.5" /> Ver / Reimprimir Ticket
                    </button>
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
