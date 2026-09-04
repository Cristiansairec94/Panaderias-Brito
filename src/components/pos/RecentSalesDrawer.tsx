"use client";

import React, { useState } from "react";
import { History, X, Receipt, RefreshCw, Printer, DollarSign, CreditCard, Send } from "lucide-react";
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

  if (!isOpen) return null;

  const filteredSales = sales.filter((s) => {
    if (filterMethod === "all") return true;
    return s.paymentMethod === filterMethod;
  });

  const totalSalesAmount = sales.reduce((sum, s) => sum + s.total, 0);

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
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="p-5 border-b border-stone-200 bg-amber-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <History className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-sm">Ventas Recientes del Turno</h3>
              <p className="text-[11px] text-amber-200/80">Historial y reimpresión de tickets</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-amber-900 rounded-xl text-amber-200 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sales Summary Banner */}
        <div className="p-4 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-stone-500">Acumulado en Turno</span>
            <p className="text-xl font-black text-stone-900">{formatCurrency(totalSalesAmount)}</p>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-semibold text-stone-500">Tickets Emitidos</span>
            <p className="text-xl font-bold text-amber-800">{sales.length}</p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="p-3 border-b border-stone-100 flex gap-2 bg-stone-50">
          {[
            { id: "all", label: "Todos" },
            { id: "efectivo", label: "Efectivo" },
            { id: "tarjeta", label: "Tarjeta" },
            { id: "transferencia", label: "Transferencia" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterMethod(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterMethod === tab.id
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
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
                    <span className="text-xs font-bold text-stone-800 font-mono">
                      #{sale.id.slice(-6).toUpperCase()}
                    </span>
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
