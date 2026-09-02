"use client";

import React, { useState } from "react";
import { 
  X, 
  Wallet, 
  TrendingDown, 
  TrendingUp, 
  Package, 
  UserCheck, 
  Clock, 
  Printer, 
  DollarSign, 
  Layers, 
  Croissant, 
  CheckCircle2, 
  RefreshCw,
  Coins,
  Receipt
} from "lucide-react";
import { Product, Sale, CashExpense } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface CashDrawerShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  cashierName: string;
  onChangeCashier: (name: string) => void;
  shiftName: string;
  onChangeShift: (shift: string) => void;
  initialFund: number;
  onChangeInitialFund: (fund: number) => void;
  sales: Sale[];
  expenses: CashExpense[];
  products: Product[];
}

export default function CashDrawerShiftModal({
  isOpen,
  onClose,
  cashierName,
  onChangeCashier,
  shiftName,
  onChangeShift,
  initialFund,
  onChangeInitialFund,
  sales,
  expenses,
  products,
}: CashDrawerShiftModalProps) {
  const [isEditingFund, setIsEditingFund] = useState(false);
  const [tempFund, setTempFund] = useState(initialFund.toString());

  if (!isOpen) return null;

  // 1. Cálculos de Ventas
  const cashSales = sales.filter((s) => s.paymentMethod === "efectivo").reduce((sum, s) => sum + s.total, 0);
  const cardSales = sales.filter((s) => s.paymentMethod === "tarjeta").reduce((sum, s) => sum + s.total, 0);
  const transferSales = sales.filter((s) => s.paymentMethod === "transferencia").reduce((sum, s) => sum + s.total, 0);
  const totalSalesAll = sales.reduce((sum, s) => sum + s.total, 0);

  // 2. Cálculos de Gastos
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  // 3. Dinero real en caja (Efectivo disponible en cajón)
  const cashInDrawer = initialFund + cashSales - totalExpenses;

  // 4. Dinero que hay en existencia (Valor comercial del inventario en mostrador)
  const totalPiecesInStock = products.reduce((sum, p) => sum + p.stock, 0);
  const totalStockValue = products.reduce((sum, p) => sum + (p.stock * p.price), 0);

  // Desglose de existencias por categoría
  const stockByCategory = products.reduce((acc, p) => {
    const cat = p.category || "pan_dulce";
    if (!acc[cat]) {
      acc[cat] = { pieces: 0, value: 0 };
    }
    acc[cat].pieces += p.stock;
    acc[cat].value += p.stock * p.price;
    return acc;
  }, {} as Record<string, { pieces: number; value: number }>);

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case "pan_dulce": return "Pan Dulce";
      case "pan_blanco": return "Bolillo & Telera";
      case "pasteleria": return "Pastelería & Pays";
      case "bebidas": return "Café & Bebidas";
      case "temporada": return "Temporada";
      default: return cat;
    }
  };

  const handleSaveFund = () => {
    const parsed = Number(tempFund);
    if (!isNaN(parsed) && parsed >= 0) {
      onChangeInitialFund(parsed);
      setIsEditingFund(false);
    }
  };

  const handlePrintZCut = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="bg-amber-950 text-white p-5 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500 rounded-2xl text-amber-950 shadow-md">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-base leading-tight">Estado de Caja & Control de Turno</h2>
                <span className="bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                  En Vivo
                </span>
              </div>
              <p className="text-xs text-amber-200/80">Arqueo de dinero en cajón, gastos del día y valor de pan en existencia</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-amber-900 rounded-xl text-amber-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shift and Operator Bar */}
        <div className="p-4 bg-amber-900/20 border-b border-amber-900/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          {/* Operator Selector */}
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-amber-700 shrink-0" />
            <span className="font-extrabold text-stone-700">Operador:</span>
            <select
              value={cashierName}
              onChange={(e) => onChangeCashier(e.target.value)}
              className="bg-white border border-stone-300 rounded-xl px-3 py-1 font-bold text-stone-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            >
              <option value="Don Toño Brito">Don Antonio Brito (Propietario)</option>
              <option value="Cajero 1 - Turno Mañana">Cajero 1 - Turno Mañana</option>
              <option value="Cajero 2 - Turno Tarde">Cajero 2 - Turno Tarde</option>
              <option value="María Brito">María Brito</option>
            </select>
          </div>

          {/* Shift Selector */}
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-700 shrink-0" />
            <span className="font-extrabold text-stone-700">Turno:</span>
            <select
              value={shiftName}
              onChange={(e) => onChangeShift(e.target.value)}
              className="bg-white border border-stone-300 rounded-xl px-3 py-1 font-bold text-stone-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            >
              <option value="Turno Matutino (06:00 - 14:00)">Turno Matutino (06:00 - 14:00)</option>
              <option value="Turno Vespertino (14:00 - 22:00)">Turno Vespertino (14:00 - 22:00)</option>
              <option value="Turno Completo / Corrido">Turno Completo / Corrido</option>
            </select>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Card 1: Dinero en Caja */}
            <div className="bg-gradient-to-br from-amber-900 to-amber-950 p-5 rounded-3xl text-white shadow-lg space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between text-amber-200">
                <span className="text-xs font-bold uppercase tracking-wider">Dinero en Caja (Cajón)</span>
                <Coins className="w-5 h-5 text-amber-400" />
              </div>
              <p className="text-3xl font-black tracking-tight text-white">{formatCurrency(cashInDrawer)}</p>
              <p className="text-[11px] text-amber-200/80 font-medium">
                Efectivo líquido disponible para entrega a Don Toño
              </p>
              <div className="pt-2 border-t border-amber-800/60 flex items-center justify-between text-[10px] text-amber-300">
                <span>Fondo inicial: {formatCurrency(initialFund)}</span>
                <span>Ventas eff: +{formatCurrency(cashSales)}</span>
              </div>
            </div>

            {/* Card 2: Dinero Gastado */}
            <div className="bg-gradient-to-br from-rose-700 to-rose-900 p-5 rounded-3xl text-white shadow-lg space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between text-rose-200">
                <span className="text-xs font-bold uppercase tracking-wider">Dinero Gastado / Salidas</span>
                <TrendingDown className="w-5 h-5 text-rose-300" />
              </div>
              <p className="text-3xl font-black tracking-tight text-white">{formatCurrency(totalExpenses)}</p>
              <p className="text-[11px] text-rose-200/80 font-medium">
                {expenses.length} salidas registradas (limpieza, retiros, compras)
              </p>
              <div className="pt-2 border-t border-rose-800/60 text-[10px] text-rose-200 flex justify-between">
                <span>Descontado del efectivo</span>
                <span className="font-bold">Auditoría OK</span>
              </div>
            </div>

            {/* Card 3: Dinero en Existencia (Mostrador) */}
            <div className="bg-gradient-to-br from-emerald-800 to-emerald-950 p-5 rounded-3xl text-white shadow-lg space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between text-emerald-200">
                <span className="text-xs font-bold uppercase tracking-wider">Dinero en Existencia</span>
                <Croissant className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-3xl font-black tracking-tight text-white">{formatCurrency(totalStockValue)}</p>
              <p className="text-[11px] text-emerald-200/80 font-medium">
                Valor del pan en mostrador ({totalPiecesInStock} piezas)
              </p>
              <div className="pt-2 border-t border-emerald-800/60 text-[10px] text-emerald-300 flex justify-between">
                <span>{products.length} productos activos</span>
                <span className="font-bold">En exhibición</span>
              </div>
            </div>
          </div>

          {/* Detailed Financial Breakdown & Stock Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Arqueo Matemático de Caja */}
            <div className="bg-stone-50 p-5 rounded-3xl border border-stone-200/90 space-y-3">
              <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                <h3 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-amber-700" />
                  Arqueo de Efectivo en Cajón
                </h3>
                <span className="text-[10px] font-bold text-stone-500 uppercase">Fórmula de Caja</span>
              </div>

              <div className="space-y-2 text-xs">
                {/* Fondo Inicial */}
                <div className="flex items-center justify-between py-1">
                  <span className="text-stone-600 flex items-center gap-1.5">
                    🪙 Fondo de Caja Inicial (Cambio):
                  </span>
                  {isEditingFund ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={tempFund}
                        onChange={(e) => setTempFund(e.target.value)}
                        className="w-20 px-2 py-0.5 border border-amber-400 rounded-lg text-xs font-bold"
                      />
                      <button
                        onClick={handleSaveFund}
                        className="px-2 py-0.5 bg-amber-700 text-white rounded-lg text-[10px] font-bold"
                      >
                        OK
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-stone-800">{formatCurrency(initialFund)}</span>
                      <button
                        onClick={() => setIsEditingFund(true)}
                        className="text-[10px] text-amber-700 font-bold hover:underline"
                      >
                        Editar
                      </button>
                    </div>
                  )}
                </div>

                {/* Ventas en Efectivo */}
                <div className="flex items-center justify-between py-1 text-emerald-800">
                  <span className="flex items-center gap-1.5 font-medium">
                    <TrendingUp className="w-3.5 h-3.5" /> (+) Ventas en Efectivo:
                  </span>
                  <span className="font-black text-emerald-700">+{formatCurrency(cashSales)}</span>
                </div>

                {/* Gastos / Salidas */}
                <div className="flex items-center justify-between py-1 text-rose-700">
                  <span className="flex items-center gap-1.5 font-medium">
                    <TrendingDown className="w-3.5 h-3.5" /> (-) Gastos y Retiros del Turno:
                  </span>
                  <span className="font-black text-rose-700">-{formatCurrency(totalExpenses)}</span>
                </div>

                {/* Dinero Total en Cajón */}
                <div className="border-t-2 border-stone-300 pt-2.5 flex items-center justify-between text-sm font-black text-stone-900 bg-amber-50 p-2.5 rounded-2xl border border-amber-200">
                  <span>DINERO REAL EN CAJÓN:</span>
                  <span className="text-amber-900 text-base">{formatCurrency(cashInDrawer)}</span>
                </div>

                {/* Métodos de Pago Electrónicos */}
                <div className="pt-2 border-t border-stone-200 text-[11px] text-stone-500 space-y-1">
                  <p className="font-bold text-stone-700">Cobros Electrónicos (Directo a Banco):</p>
                  <div className="flex justify-between">
                    <span>💳 Tarjeta bancaria:</span>
                    <span className="font-bold text-stone-800">{formatCurrency(cardSales)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>📱 Transferencia / SPEI:</span>
                    <span className="font-bold text-stone-800">{formatCurrency(transferSales)}</span>
                  </div>
                  <div className="flex justify-between border-t border-stone-200 pt-1 font-bold text-stone-900">
                    <span>Total Ventas Totales del Turno:</span>
                    <span>{formatCurrency(totalSalesAll)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Dinero en Existencia / Mostrador */}
            <div className="bg-stone-50 p-5 rounded-3xl border border-stone-200/90 space-y-3">
              <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                <h3 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-700" />
                  Pan y Existencias en Mostrador
                </h3>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  {totalPiecesInStock} pzas totales
                </span>
              </div>

              <div className="space-y-2">
                {Object.entries(stockByCategory).map(([catKey, data]) => (
                  <div
                    key={catKey}
                    className="flex items-center justify-between p-2.5 bg-white rounded-2xl border border-stone-200/70 text-xs"
                  >
                    <div>
                      <p className="font-extrabold text-stone-800">{getCategoryLabel(catKey)}</p>
                      <p className="text-[10px] text-stone-400">{data.pieces} piezas en vitrina</p>
                    </div>
                    <span className="font-black text-stone-900">{formatCurrency(data.value)}</span>
                  </div>
                ))}

                <div className="border-t border-stone-200 pt-2 flex items-center justify-between text-xs font-black text-stone-900 bg-emerald-50 p-2.5 rounded-2xl border border-emerald-200">
                  <span>VALOR TOTAL DE EXISTENCIAS:</span>
                  <span className="text-emerald-900 text-sm">{formatCurrency(totalStockValue)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer Actions */}
        <div className="p-4 bg-white border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-stone-500 font-medium">
            Operando: <strong className="text-stone-800">{cashierName}</strong> • {shiftName}
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={handlePrintZCut}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3 bg-stone-900 hover:bg-black text-white font-bold rounded-2xl text-xs shadow-md transition-all active:scale-95"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Imprimir Corte de Turno</span>
            </button>
            <button
              onClick={onClose}
              className="flex-1 sm:flex-initial px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-2xl text-xs shadow-md transition-all active:scale-95"
            >
              Cerrar Resumen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
