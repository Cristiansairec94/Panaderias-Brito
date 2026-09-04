"use client";

import React, { useState, useEffect } from "react";
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
  Receipt,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  BellRing,
  Send,
  UserPlus,
  Calendar,
  Lock
} from "lucide-react";
import { Product, Sale, CashExpense } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { useNotifications } from "@/context/NotificationContext";

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
  onCompleteShiftCut?: () => void;
  initialTab?: "cuentas" | "cambio";
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
  onCompleteShiftCut,
  initialTab = "cuentas",
}: CashDrawerShiftModalProps) {
  const { addNotification } = useNotifications();
  const [activeTab, setActiveTab] = useState<"cuentas" | "cambio">(initialTab);
  
  // Shift Times
  const [shiftStartTime, setShiftStartTime] = useState("06:00 AM");
  const [currentTime, setCurrentTime] = useState("");

  // Shift Change & Cash Cut form state
  const [outgoingCashier, setOutgoingCashier] = useState(cashierName);
  const [incomingCashier, setIncomingCashier] = useState("Cajero 2 - Turno Tarde");
  const [nextShiftName, setNextShiftName] = useState("Turno Vespertino (14:00 - 22:00)");
  const [countedCash, setCountedCash] = useState<string>("");
  const [nextInitialFund, setNextInitialFund] = useState("500");
  const [shiftNotes, setShiftNotes] = useState("");
  const [hasAcceptedCash, setHasAcceptedCash] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [showCutSuccess, setShowCutSuccess] = useState(false);
  const [lastCutData, setLastCutData] = useState<any>(null);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  // Initial Fund Quick Edit in Status Tab
  const [isEditingFund, setIsEditingFund] = useState(false);
  const [tempFund, setTempFund] = useState(initialFund.toString());

  useEffect(() => {
    setOutgoingCashier(cashierName);
  }, [cashierName]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("es-MX", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!isOpen) return null;

  // 1. Cálculos de Ventas del Turno
  const cashSales = sales.filter((s) => s.paymentMethod === "efectivo").reduce((sum, s) => sum + s.total, 0);
  const cardSales = sales.filter((s) => s.paymentMethod === "tarjeta").reduce((sum, s) => sum + s.total, 0);
  const transferSales = sales.filter((s) => s.paymentMethod === "transferencia").reduce((sum, s) => sum + s.total, 0);
  const totalSalesAll = sales.reduce((sum, s) => sum + s.total, 0);
  const cashTicketsCount = sales.filter((s) => s.paymentMethod === "efectivo").length;

  // 2. Cálculos de Gastos del Turno
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  // 3. Dinero esperado en caja (Cajón)
  const expectedCashInDrawer = initialFund + cashSales - totalExpenses;

  // 4. Conteo y Diferencia (Arqueo)
  const parsedCountedCash = countedCash === "" ? expectedCashInDrawer : Number(countedCash) || 0;
  const cashDifference = parsedCountedCash - expectedCashInDrawer;

  // 5. Existencias en mostrador
  const totalPiecesInStock = products.reduce((sum, p) => sum + p.stock, 0);
  const totalStockValue = products.reduce((sum, p) => sum + (p.stock * p.price), 0);

  const handleSaveFund = () => {
    const parsed = Number(tempFund);
    if (!isNaN(parsed) && parsed >= 0) {
      onChangeInitialFund(parsed);
      setIsEditingFund(false);
    }
  };

  const handleExecuteShiftCut = () => {
    setIsFinalizing(true);

    const nowDateTime = new Date().toLocaleString("es-MX", {
      dateStyle: "short",
      timeStyle: "short",
    });

    const cutRecord = {
      id: `CORTE-${Date.now().toString().slice(-6)}`,
      date: nowDateTime,
      shiftRange: `${shiftStartTime} — ${currentTime || "Ahora"}`,
      outgoingCashier,
      incomingCashier,
      previousShift: shiftName,
      nextShift: nextShiftName,
      initialFund,
      cashSales,
      cardSales,
      transferSales,
      totalSales: totalSalesAll,
      totalExpenses,
      expectedCash: expectedCashInDrawer,
      countedCash: parsedCountedCash,
      difference: cashDifference,
      nextFund: Number(nextInitialFund) || 500,
      notes: shiftNotes.trim() || "Sin observaciones adicionales.",
      expensesList: [...expenses],
      stockPieces: totalPiecesInStock,
      stockValue: totalStockValue,
    };

    setLastCutData(cutRecord);

    // NOTIFICACIÓN DIRECTA AL ADMINISTRADOR / DON TOÑO CON SONIDO
    addNotification({
      senderName: `🏁 Corte de Caja (${outgoingCashier})`,
      senderAvatar: "💰",
      badgeIcon: "dinero",
      title: `Corte de Turno: ${formatCurrency(parsedCountedCash)} en Caja`,
      highlightText: `${outgoingCashier} entregó a ${incomingCashier}`,
      description: `Horario: ${shiftStartTime} a ${currentTime}. Efectivo entregado: ${formatCurrency(parsedCountedCash)} (Esperado: ${formatCurrency(expectedCashInDrawer)} | ${cashDifference === 0 ? "Cuadrado Exacto" : cashDifference > 0 ? `Sobrante +${formatCurrency(cashDifference)}` : `Faltante ${formatCurrency(cashDifference)}`}). Ventas Efectivo: ${formatCurrency(cashSales)}, Gastos: ${formatCurrency(totalExpenses)}. Notas: "${cutRecord.notes}"`,
      category: "caja",
      actionLabel: "Ver Historial de Caja",
      actionLink: "/caja",
    });

    // Actualizar al nuevo cajero y turno
    onChangeCashier(incomingCashier);
    onChangeShift(nextShiftName);
    onChangeInitialFund(Number(nextInitialFund) || 500);

    setIsFinalizing(false);
    setShowCutSuccess(true);
  };

  const handleClose = () => {
    if (showCutSuccess && onCompleteShiftCut) {
      onCompleteShiftCut();
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[92vh] border-2 border-amber-900/30">
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-amber-950 via-stone-900 to-amber-950 text-white p-5 sm:p-6 px-6 sm:px-8 flex items-center justify-between border-b border-amber-900/50 shadow-md">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-gradient-to-tr from-amber-500 to-orange-500 text-white rounded-2xl flex items-center justify-center shadow-md shadow-amber-500/30">
              <Coins className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="font-black text-xl sm:text-2xl leading-tight text-white tracking-wide">Cierre de Turno & Entrega de Caja</h2>
              <p className="text-xs sm:text-sm text-amber-300 font-bold mt-0.5">
                Confirmación de arqueo sin detalles en caja y entrega conforme al relevo
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2.5 rounded-2xl text-stone-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Scrollable Body: UN SOLO APARTADO SIMPLE Y DIRECTO */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
          {showCutSuccess && lastCutData ? (
            /* Vista de Éxito y Ticket de Corte */
            <div className="space-y-6 animate-in zoom-in-95">
              <div className="bg-emerald-50 border-2 border-emerald-300 p-5 rounded-3xl text-center space-y-2">
                <div className="w-14 h-14 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-lg">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-emerald-950">¡Cierre de Turno Conforme y Exitoso!</h3>
                <p className="text-xs text-emerald-800 max-w-md mx-auto">
                  El turno cerró correctamente sin detalles en caja. Cuentas cuadradas al 100%, comprobante emitido y caja entregada a <strong>{lastCutData.incomingCashier}</strong>.
                </p>
              </div>

              {/* Printable Ticket Z-Cut */}
              <div id="printable-ticket" className="bg-stone-50 p-6 rounded-3xl border border-stone-200 shadow-sm max-w-md mx-auto font-mono text-xs text-stone-800 space-y-3">
                <div className="text-center border-b border-dashed border-stone-300 pb-3">
                  <div className="text-3xl mb-1">🥖</div>
                  <h2 className="font-black text-sm uppercase">PANADERÍAS BRITO</h2>
                  <p className="text-[10px] text-stone-500 font-sans">Don Antonio Brito & Hijos</p>
                  <p className="font-bold text-[11px] mt-1 bg-amber-950 text-amber-100 py-0.5 rounded-md">
                    COMPROBANTE DE CORTE DE CAJA (Z)
                  </p>
                </div>

                <div className="text-[11px] space-y-1 border-b border-dashed border-stone-300 pb-2.5">
                  <div className="flex justify-between"><span>FOLIO:</span><span className="font-bold">{lastCutData.id}</span></div>
                  <div className="flex justify-between"><span>FECHA:</span><span>{lastCutData.date}</span></div>
                  <div className="flex justify-between"><span>HORARIO:</span><span className="font-bold">{lastCutData.shiftRange}</span></div>
                  <div className="flex justify-between"><span>ENTREGÓ (Saliente):</span><span className="font-bold">{lastCutData.outgoingCashier}</span></div>
                  <div className="flex justify-between"><span>RECIBIÓ (Entrante):</span><span className="font-bold">{lastCutData.incomingCashier}</span></div>
                  <div className="flex justify-between"><span>TURNO SIGUIENTE:</span><span>{lastCutData.nextShift}</span></div>
                </div>

                <div className="space-y-1.5 border-b border-dashed border-stone-300 pb-2.5 text-[11px]">
                  <div className="flex justify-between font-bold text-stone-500 text-[10px]">
                    <span>CONCEPTO DE CAJA</span>
                    <span>IMPORTE</span>
                  </div>
                  <div className="flex justify-between"><span>(+) Fondo Inicial de Turno:</span><span>{formatCurrency(lastCutData.initialFund)}</span></div>
                  <div className="flex justify-between text-emerald-700"><span>(+) Ventas en Efectivo:</span><span className="font-bold">+{formatCurrency(lastCutData.cashSales)}</span></div>
                  <div className="flex justify-between text-rose-700"><span>(-) Gastos de Turno:</span><span>-{formatCurrency(lastCutData.totalExpenses)}</span></div>
                  <div className="flex justify-between font-black text-stone-900 border-t border-dashed border-stone-300 pt-1.5 text-xs">
                    <span>(=) Total Esperado en Caja:</span>
                    <span>{formatCurrency(lastCutData.expectedCash)}</span>
                  </div>
                  <div className="flex justify-between font-black text-amber-950 pt-0.5 text-xs">
                    <span>(=) Efectivo Físico Entregado:</span>
                    <span>{formatCurrency(lastCutData.countedCash)}</span>
                  </div>
                  <div className={`flex justify-between font-black p-1.5 rounded-lg mt-1 text-xs ${
                    lastCutData.difference === 0
                      ? "bg-emerald-100 text-emerald-950"
                      : lastCutData.difference > 0
                      ? "bg-blue-100 text-blue-950"
                      : "bg-rose-100 text-rose-950"
                  }`}>
                    <span>DIFERENCIA:</span>
                    <span>{lastCutData.difference === 0 ? "$0.00 (Cuadrada)" : formatCurrency(lastCutData.difference)}</span>
                  </div>
                </div>

                {/* Additional payment stats */}
                <div className="space-y-1 text-[10px] text-stone-500 pt-1 border-b border-dashed border-stone-300 pb-2">
                  <div className="flex justify-between"><span>Ventas con Tarjeta:</span><span>{formatCurrency(lastCutData.cardSales)}</span></div>
                  <div className="flex justify-between"><span>Ventas con Transferencia:</span><span>{formatCurrency(lastCutData.transferSales)}</span></div>
                  <div className="flex justify-between font-bold text-stone-800"><span>Gran Total Vendido:</span><span>{formatCurrency(lastCutData.totalSalesAll)}</span></div>
                </div>

                <div className="text-center pt-2 space-y-1 text-[10px] text-stone-400 font-sans">
                  <p className="font-bold text-stone-700">ENTREGA DE TURNO CONFORME</p>
                  <p>Firma Saliente: _____________________</p>
                  <p>Firma Entrante: _____________________</p>
                  <p className="pt-1 text-[9px]">Panaderías Brito • Sucursal Matriz</p>
                </div>
              </div>

              {/* Botón de acción post-corte */}
              <div className="max-w-md mx-auto">
                <button
                  onClick={() => {
                    onClose();
                    if (onCompleteShiftCut) onCompleteShiftCut();
                  }}
                  className="w-full py-4 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-700 hover:to-orange-700 text-white font-black rounded-2xl text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-xl shadow-orange-950/20 active:scale-95 animate-pulse"
                >
                  <Lock className="w-5 h-5" />
                  <span>Finalizar y Bloquear Punto de Venta</span>
                </button>
              </div>
            </div>
          ) : (
            /* UN SOLO APARTADO SIMPLE Y DIRECTO (SIN PESTAÑAS) */
            <div className="space-y-3">
              {/* 1. Resumen Financiero del Turno en 1 Sola Franja */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-gradient-to-br from-stone-50 to-amber-50/40 rounded-3xl border-2 border-stone-200/90 shadow-xs">
                <div className="bg-white p-3 sm:p-4 rounded-2xl border border-stone-200/80 shadow-xs transition-transform hover:scale-105 duration-200">
                  <span className="text-[11px] sm:text-xs text-stone-500 font-black block uppercase tracking-wider">Fondo Inicial</span>
                  <span className="text-xl sm:text-2xl font-black text-stone-900 mt-0.5 block">{formatCurrency(initialFund)}</span>
                </div>
                <div className="bg-white p-3 sm:p-4 rounded-2xl border border-emerald-200/80 shadow-xs transition-transform hover:scale-105 duration-200">
                  <span className="text-[11px] sm:text-xs text-emerald-700 font-black block uppercase tracking-wider">(+) Ventas</span>
                  <span className="text-xl sm:text-2xl font-black text-emerald-700 mt-0.5 block">+{formatCurrency(cashSales)}</span>
                </div>
                <div className="bg-white p-3 sm:p-4 rounded-2xl border border-rose-200/80 shadow-xs transition-transform hover:scale-105 duration-200">
                  <span className="text-[11px] sm:text-xs text-rose-700 font-black block uppercase tracking-wider">(-) Gastos</span>
                  <span className="text-xl sm:text-2xl font-black text-rose-700 mt-0.5 block">-{formatCurrency(totalExpenses)}</span>
                </div>
                <div className="bg-gradient-to-br from-amber-100 via-amber-200/80 to-orange-100 p-3 sm:p-4 rounded-2xl border-2 border-amber-400 shadow-sm transition-transform hover:scale-105 duration-200 ring-2 ring-amber-400/20">
                  <span className="text-[11px] sm:text-xs text-amber-950 font-black block uppercase tracking-wider">En Caja</span>
                  <span className="text-2xl sm:text-3xl font-black text-amber-950 mt-0.5 block leading-none">{formatCurrency(expectedCashInDrawer)}</span>
                </div>
              </div>

              {/* 1. Relevo Directo: Quién Entrega y Quién Recibe (Solo Cajera 1 y Cajera 2) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-stone-50 rounded-3xl border-2 border-stone-200">
                <div className="flex items-center justify-between gap-3 bg-white p-3 sm:p-3.5 rounded-2xl border border-stone-200/90 shadow-xs">
                  <span className="font-black text-rose-700 uppercase shrink-0 text-xs sm:text-sm flex items-center gap-1.5">
                    <span className="text-base">👤</span> Entrega:
                  </span>
                  <div className="font-black text-stone-900 text-sm sm:text-base truncate flex-1 text-right">
                    {outgoingCashier} ({shiftName.split(" ")[0]})
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 bg-white p-2.5 rounded-2xl border-2 border-emerald-400 shadow-xs">
                  <span className="font-black text-emerald-700 uppercase shrink-0 text-xs sm:text-sm flex items-center gap-1.5 pl-1">
                    <span className="text-base">👤</span> Recibe:
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 flex-1 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setIncomingCashier("Cajera 1 - Turno Matutino");
                        setNextShiftName("Turno Matutino (06:00 - 14:00)");
                      }}
                      className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-95 border ${
                        incomingCashier.includes("Cajera 1")
                          ? "bg-gradient-to-r from-emerald-800 to-emerald-950 text-white border-emerald-950 shadow-md ring-2 ring-emerald-400/50 font-black scale-[1.02]"
                          : "bg-stone-50 text-stone-700 hover:bg-emerald-50/60 border-stone-200"
                      }`}
                    >
                      <span>👩‍🍳</span>
                      <span>Cajera 1</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIncomingCashier("Cajera 2 - Turno Vespertino");
                        setNextShiftName("Turno Vespertino (14:00 - 22:00)");
                      }}
                      className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-95 border ${
                        incomingCashier.includes("Cajera 2")
                          ? "bg-gradient-to-r from-emerald-800 to-emerald-950 text-white border-emerald-950 shadow-md ring-2 ring-emerald-400/50 font-black scale-[1.02]"
                          : "bg-stone-50 text-stone-700 hover:bg-emerald-50/60 border-stone-200"
                      }`}
                    >
                      <span>👩‍🍳</span>
                      <span>Cajera 2</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. Verificación de Dinero en Caja (Resumido y Claro) */}
              <div className="p-4 sm:p-5 bg-gradient-to-br from-amber-50 via-orange-50/50 to-amber-100/60 rounded-3xl border-2 border-amber-300 shadow-sm space-y-3.5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                  <div>
                    <span className="text-sm sm:text-base font-black text-stone-900 uppercase flex items-center gap-2">
                      <span className="text-xl">💵</span> Dinero que debe haber en caja:
                    </span>
                    <span className="text-xs sm:text-sm text-stone-600 font-bold mt-0.5 block">
                      Fondo: {formatCurrency(initialFund)} • Ventas: {formatCurrency(cashSales)} • Gastos: -{formatCurrency(totalExpenses)}
                    </span>
                  </div>
                  <span className="text-3xl sm:text-4xl font-black text-amber-950 bg-gradient-to-r from-amber-200 to-amber-300 px-5 py-2 rounded-2xl shadow-md border-2 border-amber-400">
                    {formatCurrency(expectedCashInDrawer)}
                  </span>
                </div>

                {/* Conteo Rápido: Botón 1 Toque o Input Manual */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setCountedCash(expectedCashInDrawer.toString());
                      setHasAcceptedCash(true);
                    }}
                    className={`py-4 px-5 rounded-2xl font-black text-sm sm:text-base transition-all duration-300 flex items-center justify-center gap-2.5 shadow-md active:scale-95 group relative overflow-hidden ${
                      countedCash === expectedCashInDrawer.toString() && hasAcceptedCash
                        ? "bg-gradient-to-r from-amber-700 to-orange-700 text-white ring-4 ring-amber-400/40 shadow-lg scale-[1.01]"
                        : "bg-gradient-to-r from-amber-600 via-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white hover:scale-[1.02] hover:shadow-lg"
                    }`}
                  >
                    <span className="text-xl group-hover:scale-125 group-hover:rotate-12 transition-transform duration-300">⚡</span>
                    <span className="tracking-wide">El dinero está completo ({formatCurrency(expectedCashInDrawer)})</span>
                  </button>

                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-lg text-stone-500">$</span>
                    <input
                      type="number"
                      step="any"
                      placeholder={`O escribe otro monto`}
                      value={countedCash}
                      onChange={(e) => {
                        setCountedCash(e.target.value);
                        setHasAcceptedCash(true);
                      }}
                      className="w-full pl-9 pr-4 py-4 bg-white rounded-2xl border-2 border-stone-300 focus:border-amber-600 font-black text-base sm:text-lg text-stone-900 focus:outline-none shadow-sm transition-all placeholder:text-stone-400"
                    />
                  </div>
                </div>

                {/* Dictamen y Confirmación del Cierre de Turno */}
                {countedCash && (
                  <div className={`p-4 rounded-2xl border-2 transition-all duration-300 flex items-center justify-between gap-3 shadow-sm animate-in fade-in zoom-in-95 ${
                    cashDifference === 0
                      ? "bg-emerald-50 text-emerald-950 border-emerald-400"
                      : cashDifference > 0
                      ? "bg-blue-50 text-blue-950 border-blue-400"
                      : "bg-rose-50 text-rose-950 border-rose-400"
                  }`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-base shrink-0 shadow-md ${
                        cashDifference === 0 ? "bg-emerald-600 text-white animate-bounce" : cashDifference > 0 ? "bg-blue-600 text-white" : "bg-rose-600 text-white"
                      }`}>
                        {cashDifference === 0 ? "✓" : "!"}
                      </div>
                      <div className="min-w-0">
                        <span className="font-black block text-sm sm:text-base leading-tight">
                          {cashDifference === 0
                            ? "🟢 Cierre de Turno Conforme: Todo está bien y no hay detalles en caja"
                            : cashDifference > 0
                            ? "🟡 Detalle en Cierre: Sobrante detectado en caja"
                            : "🔴 Detalle en Cierre: Faltante detectado en caja"}
                        </span>
                        <span className={`text-xs sm:text-sm font-bold block mt-0.5 ${
                          cashDifference === 0 ? "text-emerald-800" : cashDifference > 0 ? "text-blue-800" : "text-rose-800"
                        }`}>
                          {cashDifference === 0
                            ? "Cuentas cuadradas al 100%. El dinero en caja coincide exactamente con el sistema ($0.00)."
                            : `Diferencia de ${formatCurrency(cashDifference)}. Se registrará el detalle en el comprobante del turno.`}
                        </span>
                      </div>
                    </div>
                    <span className={`shrink-0 px-3.5 py-1.5 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wide shadow-xs ${
                      cashDifference === 0 ? "bg-emerald-200 text-emerald-950 border border-emerald-300" : cashDifference > 0 ? "bg-blue-200 text-blue-900" : "bg-rose-200 text-rose-900"
                    }`}>
                      {cashDifference === 0 ? "Sin Detalles ✓" : formatCurrency(cashDifference)}
                    </span>
                  </div>
                )}
              </div>

              {/* 3. Casilla de Confirmación y Botón Final de Cierre de Turno */}
              <div className="space-y-3 pt-1">
                <label className={`flex items-center gap-3.5 p-4 sm:p-4.5 rounded-2xl sm:rounded-3xl border-2 cursor-pointer select-none transition-all duration-300 ${
                  hasAcceptedCash
                    ? "bg-emerald-50/90 border-emerald-400 shadow-md ring-2 ring-emerald-500/20"
                    : "bg-amber-50/90 border-amber-300 hover:border-amber-400"
                }`}>
                  <input
                    type="checkbox"
                    checked={hasAcceptedCash}
                    onChange={(e) => setHasAcceptedCash(e.target.checked)}
                    className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg accent-emerald-600 cursor-pointer shrink-0 transition-transform active:scale-90"
                  />
                  <span className="text-sm sm:text-base font-black text-stone-900 leading-snug">
                    Confirmo el <strong className="text-amber-900">Cierre de Turno</strong>: todo está bien, conté el dinero ({countedCash ? formatCurrency(parsedCountedCash) : "$0.00"}) y no hay detalles pendientes en caja.
                  </span>
                </label>

                <button
                  type="button"
                  onClick={handleExecuteShiftCut}
                  disabled={!countedCash || !hasAcceptedCash || isFinalizing}
                  className={`w-full py-5 px-6 rounded-2xl sm:rounded-3xl font-black text-base sm:text-lg tracking-wide shadow-xl transition-all duration-300 flex items-center justify-center gap-3 group active:scale-98 ${
                    !countedCash || !hasAcceptedCash || isFinalizing
                      ? "bg-stone-300 text-stone-500 cursor-not-allowed opacity-60"
                      : "bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-emerald-700/30 hover:shadow-2xl hover:scale-[1.01] animate-pulse"
                  }`}
                >
                  <CheckCircle2 className="w-6 h-6 text-emerald-200 shrink-0 group-hover:scale-125 transition-transform duration-300" />
                  <span>
                    {isFinalizing ? "Cerrando Turno..." : `🔒 CERRAR TURNO Y ENTREGAR CAJA (${incomingCashier}) ➔`}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 px-6 bg-white border-t border-stone-200 flex items-center justify-between">
          <span className="text-xs font-bold text-stone-500">
            Panaderías Brito • Sucursal Matriz
          </span>
          <button
            onClick={handleClose}
            className="px-6 py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 font-black rounded-xl text-xs sm:text-sm transition-colors"
          >
            Cerrar Ventana
          </button>
        </div>
      </div>
    </div>
  );
}
