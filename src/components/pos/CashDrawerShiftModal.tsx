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
  Calendar
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
}: CashDrawerShiftModalProps) {
  const { addNotification } = useNotifications();
  const [activeTab, setActiveTab] = useState<"status" | "corte">("status");
  
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
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [showCutSuccess, setShowCutSuccess] = useState(false);
  const [lastCutData, setLastCutData] = useState<any>(null);

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

    if (onCompleteShiftCut) {
      onCompleteShiftCut();
    }

    setIsFinalizing(false);
    setShowCutSuccess(true);
  };

  const handlePrintZCut = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[92vh] border border-stone-200">
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-amber-950 via-stone-900 to-amber-950 text-white p-5 px-6 flex items-center justify-between border-b border-amber-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-600/90 rounded-2xl shadow-inner">
              <Coins className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-black text-lg leading-tight">Corte de Caja & Cambio de Turno</h2>
              <p className="text-xs text-amber-300 font-medium">
                Arqueo financiero, entrega de cuentas y notificación directa al administrador
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs de Navegación */}
        <div className="flex border-b border-stone-200 bg-stone-100/80 p-1.5 gap-2 px-6">
          <button
            onClick={() => { setActiveTab("status"); setShowCutSuccess(false); }}
            className={`flex-1 py-3 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 ${
              activeTab === "status" && !showCutSuccess
                ? "bg-white text-stone-900 shadow-sm border border-stone-200"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <Wallet className="w-4 h-4 text-amber-700" />
            <span>1. Estado de Caja & Existencias en Vivo</span>
          </button>

          <button
            onClick={() => setActiveTab("corte")}
            className={`flex-1 py-3 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 ${
              activeTab === "corte" || showCutSuccess
                ? "bg-gradient-to-r from-amber-900 to-amber-950 text-white shadow-md"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>2. 🏁 Realizar Corte de Caja & Entregar Cuentas</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {showCutSuccess && lastCutData ? (
            /* Vista de Éxito y Ticket de Corte */
            <div className="space-y-6 animate-in zoom-in-95">
              <div className="bg-emerald-50 border-2 border-emerald-300 p-5 rounded-3xl text-center space-y-2">
                <div className="w-14 h-14 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-lg">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-emerald-950">¡Corte y Cambio de Turno Completado!</h3>
                <p className="text-xs text-emerald-800 max-w-md mx-auto">
                  Se ha registrado el corte correctamente, se envió la notificación directa al administrador y la caja quedó lista para <strong>{lastCutData.incomingCashier}</strong>.
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
                  <div className="flex justify-between text-rose-700"><span>(-) Gastos y Salidas:</span><span className="font-bold">-{formatCurrency(lastCutData.totalExpenses)}</span></div>
                  <div className="flex justify-between font-black text-stone-900 border-t border-dashed border-stone-300 pt-1">
                    <span>(=) EFECTIVO ESPERADO:</span>
                    <span>{formatCurrency(lastCutData.expectedCash)}</span>
                  </div>
                  <div className="flex justify-between font-black text-amber-900">
                    <span>($) EFECTIVO CONTADO FÍSICO:</span>
                    <span>{formatCurrency(lastCutData.countedCash)}</span>
                  </div>
                  <div className={`flex justify-between font-black p-1 rounded ${
                    lastCutData.difference === 0
                      ? "bg-emerald-100 text-emerald-900"
                      : lastCutData.difference > 0
                      ? "bg-blue-100 text-blue-900"
                      : "bg-rose-100 text-rose-900"
                  }`}>
                    <span>DIFERENCIA / RESULTADO:</span>
                    <span>{lastCutData.difference === 0 ? "CUADRADO $0.00" : (lastCutData.difference > 0 ? `SOBRANTE +${formatCurrency(lastCutData.difference)}` : `FALTANTE ${formatCurrency(lastCutData.difference)}`)}</span>
                  </div>
                </div>

                {/* Otros Métodos */}
                <div className="space-y-1 border-b border-dashed border-stone-300 pb-2 text-[10px] text-stone-600">
                  <div className="flex justify-between"><span>Cobros con Tarjeta:</span><span>{formatCurrency(lastCutData.cardSales)}</span></div>
                  <div className="flex justify-between"><span>Cobros con Transferencia:</span><span>{formatCurrency(lastCutData.transferSales)}</span></div>
                  <div className="flex justify-between font-bold text-stone-900"><span>TOTAL VENTAS DEL TURNO:</span><span>{formatCurrency(lastCutData.totalSales)}</span></div>
                  <div className="flex justify-between text-stone-500"><span>Fondo dejado para siguiente turno:</span><span className="font-bold">{formatCurrency(lastCutData.nextFund)}</span></div>
                </div>

                {/* Observaciones */}
                <div className="text-[10px] text-stone-600 border-b border-dashed border-stone-300 pb-2">
                  <span className="font-bold block text-stone-800">OBSERVACIONES:</span>
                  <p className="italic font-sans">{lastCutData.notes}</p>
                </div>

                {/* Firmas */}
                <div className="pt-6 grid grid-cols-2 gap-4 text-center text-[9px] font-sans">
                  <div className="border-t border-stone-400 pt-1">
                    <p className="font-bold">{lastCutData.outgoingCashier}</p>
                    <p className="text-stone-400">Entregó Conforme</p>
                  </div>
                  <div className="border-t border-stone-400 pt-1">
                    <p className="font-bold">{lastCutData.incomingCashier}</p>
                    <p className="text-stone-400">Recibió Conforme</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 max-w-md mx-auto">
                <button
                  onClick={handlePrintZCut}
                  className="flex-1 py-3.5 bg-stone-900 hover:bg-black text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-md"
                >
                  <Printer className="w-4 h-4 text-amber-400" />
                  <span>Imprimir Ticket de Corte</span>
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-2xl text-xs"
                >
                  Cerrar
                </button>
              </div>
            </div>
          ) : activeTab === "status" ? (
            /* PESTAÑA 1: ESTADO ACTUAL EN VIVO */
            <>
              {/* Operator & Shift Badges */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-stone-50 rounded-2xl border border-stone-200 text-xs">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-100 text-amber-800 rounded-xl font-bold">👤</div>
                  <div>
                    <span className="text-[10px] text-stone-400 font-bold block">Cajero en Turno</span>
                    <span className="font-black text-stone-900 text-sm">{cashierName}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="p-2 bg-rose-100 text-rose-800 rounded-xl font-bold">⏰</div>
                  <div>
                    <span className="text-[10px] text-stone-400 font-bold block">Turno Activo & Horario</span>
                    <span className="font-black text-stone-900 text-sm">{shiftName}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl font-bold">⏱️</div>
                  <div>
                    <span className="text-[10px] text-stone-400 font-bold block">Hora del Sistema</span>
                    <span className="font-black text-stone-900 text-sm tabular-nums">{currentTime || "En vivo"}</span>
                  </div>
                </div>
              </div>

              {/* 3 Metric Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Card 1: Dinero en Caja */}
                <div className="bg-gradient-to-br from-amber-950 via-stone-900 to-amber-900 p-5 rounded-3xl text-white shadow-lg space-y-2">
                  <div className="flex items-center justify-between text-amber-300">
                    <span className="text-xs font-bold uppercase tracking-wider">Dinero Físico en Caja</span>
                    <Coins className="w-5 h-5 text-amber-400" />
                  </div>
                  <p className="text-3xl font-black text-white">{formatCurrency(expectedCashInDrawer)}</p>
                  <p className="text-[11px] text-amber-200/80">Efectivo en cajón disponible</p>
                  <div className="pt-2 border-t border-amber-800/60 text-[10px] text-amber-300 flex justify-between">
                    <span>Fondo: {formatCurrency(initialFund)}</span>
                    <span className="font-bold">+{cashTicketsCount} ventas efvo</span>
                  </div>
                </div>

                {/* Card 2: Salidas / Gastos */}
                <div className="bg-gradient-to-br from-rose-900 to-stone-900 p-5 rounded-3xl text-white shadow-lg space-y-2">
                  <div className="flex items-center justify-between text-rose-300">
                    <span className="text-xs font-bold uppercase tracking-wider">Salidas & Gastos</span>
                    <TrendingDown className="w-5 h-5 text-rose-400" />
                  </div>
                  <p className="text-3xl font-black text-white">-{formatCurrency(totalExpenses)}</p>
                  <p className="text-[11px] text-rose-200/80">{expenses.length} salidas registradas</p>
                  <div className="pt-2 border-t border-rose-800/60 text-[10px] text-rose-300 flex justify-between">
                    <span>Total Ventas: {formatCurrency(totalSalesAll)}</span>
                    <span className="font-bold">Mostrador</span>
                  </div>
                </div>

                {/* Card 3: Existencias */}
                <div className="bg-gradient-to-br from-emerald-900 to-stone-900 p-5 rounded-3xl text-white shadow-lg space-y-2">
                  <div className="flex items-center justify-between text-emerald-300">
                    <span className="text-xs font-bold uppercase tracking-wider">Valor en Existencia</span>
                    <Croissant className="w-5 h-5 text-emerald-400" />
                  </div>
                  <p className="text-3xl font-black text-white">{formatCurrency(totalStockValue)}</p>
                  <p className="text-[11px] text-emerald-200/80">{totalPiecesInStock} piezas de pan en vitrina</p>
                  <div className="pt-2 border-t border-emerald-800/60 text-[10px] text-emerald-300 flex justify-between">
                    <span>{products.length} modelos de pan</span>
                    <span className="font-bold">En exhibición</span>
                  </div>
                </div>
              </div>

              {/* Botón destacado para pasar al corte */}
              <div className="p-4 bg-amber-50 rounded-2xl border-2 border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <h4 className="font-black text-stone-900 text-sm">¿Terminó el turno de {cashierName}?</h4>
                  <p className="text-xs text-stone-600">
                    Realiza el arqueo final, entrega cuentas al nuevo cajero y envía el reporte directo a Don Toño.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("corte")}
                  className="px-6 py-3 bg-amber-950 hover:bg-black text-white font-black text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2 whitespace-nowrap"
                >
                  <span>Hacer Corte y Entrega</span>
                  <ArrowRight className="w-4 h-4 text-amber-400" />
                </button>
              </div>
            </>
          ) : (
            /* PESTAÑA 2: FORMULARIO DE CORTE DE CAJA Y CAMBIO DE TURNO */
            <div className="space-y-5">
              {/* Sección 1: Horario & Relevo de Cajeras (Solo Cajera 1 y Cajera 2) */}
              <div className="p-5 bg-stone-50 rounded-3xl border border-stone-200/90 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-stone-200 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <h3 className="font-extrabold text-sm text-stone-900">1. Horario del Turno & Relevo de Cajeras</h3>
                  </div>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100/80 px-2.5 py-0.5 rounded-full border border-amber-200">
                    Puesto Fijo: 2 Turnos
                  </span>
                </div>

                {/* Horario y Turno */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Hora Inicio y Fin */}
                  <div className="p-3 bg-white rounded-2xl border border-stone-200/80 space-y-1.5 shadow-xs">
                    <label className="text-[10px] font-black text-stone-500 block uppercase tracking-wider">
                      ⏰ Horario del Turno Actual:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={shiftStartTime}
                        onChange={(e) => setShiftStartTime(e.target.value)}
                        className="w-24 p-2 border-2 border-stone-200 rounded-xl font-black text-xs text-center text-stone-900 focus:border-amber-500 focus:outline-none"
                        placeholder="06:00 AM"
                      />
                      <span className="font-bold text-stone-400">hasta</span>
                      <span className="p-2 bg-amber-100 text-amber-950 font-black rounded-xl text-xs shadow-xs">
                        {currentTime || "Ahora"} (Corte)
                      </span>
                    </div>
                  </div>

                  {/* Próximo Turno */}
                  <div className="p-3 bg-white rounded-2xl border border-stone-200/80 space-y-1.5 shadow-xs">
                    <label className="text-[10px] font-black text-stone-500 block uppercase tracking-wider">
                      📋 Turno que se Iniciará:
                    </label>
                    <div className="p-2 bg-stone-100 rounded-xl font-black text-xs text-stone-800 flex items-center justify-between">
                      <span>{nextShiftName}</span>
                      <span className="text-[10px] text-stone-400">Automático</span>
                    </div>
                  </div>
                </div>

                {/* Selector Visual Animado: Cajera Saliente vs Cajera Entrante */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                  {/* Cajera Saliente (Entrega Cuentas) */}
                  <div className="p-3.5 bg-white rounded-2xl border border-rose-200 shadow-xs space-y-2">
                    <label className="text-[10px] font-black text-rose-800 uppercase tracking-wide flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                      <span>Cajera que Entrega Cuentas (Saliente):</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setOutgoingCashier("Cajera 1 - Turno Matutino");
                          setIncomingCashier("Cajera 2 - Turno Vespertino");
                          setNextShiftName("Turno Vespertino (14:00 - 22:00)");
                        }}
                        className={`p-3 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all duration-300 active:scale-95 border ${
                          outgoingCashier.includes("Cajera 1")
                            ? "bg-gradient-to-br from-rose-900 to-rose-950 text-white border-rose-950 shadow-md ring-2 ring-rose-500/40 font-black scale-[1.02]"
                            : "bg-stone-50 text-stone-700 hover:bg-rose-50/60 border-stone-200 hover:scale-[1.01]"
                        }`}
                      >
                        <span className="text-xl">👩‍🍳</span>
                        <span className="font-extrabold text-[11px]">Cajera 1</span>
                        <span className="text-[9px] opacity-75">Turno Matutino</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setOutgoingCashier("Cajera 2 - Turno Vespertino");
                          setIncomingCashier("Cajera 1 - Turno Matutino");
                          setNextShiftName("Turno Matutino (06:00 - 14:00)");
                        }}
                        className={`p-3 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all duration-300 active:scale-95 border ${
                          outgoingCashier.includes("Cajera 2")
                            ? "bg-gradient-to-br from-rose-900 to-rose-950 text-white border-rose-950 shadow-md ring-2 ring-rose-500/40 font-black scale-[1.02]"
                            : "bg-stone-50 text-stone-700 hover:bg-rose-50/60 border-stone-200 hover:scale-[1.01]"
                        }`}
                      >
                        <span className="text-xl">👩‍🍳</span>
                        <span className="font-extrabold text-[11px]">Cajera 2</span>
                        <span className="text-[9px] opacity-75">Turno Vespertino</span>
                      </button>
                    </div>
                  </div>

                  {/* Cajera Entrante (Recibe la Caja) */}
                  <div className="p-3.5 bg-white rounded-2xl border-2 border-emerald-400 shadow-md shadow-emerald-900/5 space-y-2">
                    <label className="text-[10px] font-black text-emerald-900 uppercase tracking-wide flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                      <span>Cajera que Recibe la Caja (Entrante):</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIncomingCashier("Cajera 1 - Turno Matutino");
                          setNextShiftName("Turno Matutino (06:00 - 14:00)");
                        }}
                        className={`p-3 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all duration-300 active:scale-95 border ${
                          incomingCashier.includes("Cajera 1")
                            ? "bg-gradient-to-br from-emerald-800 to-emerald-950 text-white border-emerald-950 shadow-lg ring-2 ring-emerald-400/50 font-black scale-[1.02]"
                            : "bg-stone-50 text-stone-700 hover:bg-emerald-50/60 border-stone-200 hover:scale-[1.01]"
                        }`}
                      >
                        <span className="text-xl">👩‍🍳</span>
                        <span className="font-extrabold text-[11px]">Cajera 1</span>
                        <span className="text-[9px] opacity-75">Turno Matutino</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIncomingCashier("Cajera 2 - Turno Vespertino");
                          setNextShiftName("Turno Vespertino (14:00 - 22:00)");
                        }}
                        className={`p-3 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all duration-300 active:scale-95 border ${
                          incomingCashier.includes("Cajera 2")
                            ? "bg-gradient-to-br from-emerald-800 to-emerald-950 text-white border-emerald-950 shadow-lg ring-2 ring-emerald-400/50 font-black scale-[1.02]"
                            : "bg-stone-50 text-stone-700 hover:bg-emerald-50/60 border-stone-200 hover:scale-[1.01]"
                        }`}
                      >
                        <span className="text-xl">👩‍🍳</span>
                        <span className="font-extrabold text-[11px]">Cajera 2</span>
                        <span className="text-[9px] opacity-75">Turno Vespertino</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sección 2: Arqueo Financiero & Conteo Físico */}
              <div className="p-5 bg-amber-50/70 rounded-3xl border-2 border-amber-200/90 space-y-4">
                <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-amber-800" />
                    <h3 className="font-extrabold text-sm text-stone-900">2. Arqueo y Conteo Físico de Dinero</h3>
                  </div>
                  <span className="text-xs font-black text-amber-900 bg-amber-200/70 px-3 py-0.5 rounded-full">
                    Esperado en Cajón: {formatCurrency(expectedCashInDrawer)}
                  </span>
                </div>

                {/* Fórmula compacta */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs bg-white p-3 rounded-2xl border border-amber-200">
                  <div>
                    <span className="text-[10px] text-stone-400 font-bold block">(+) Fondo Inicial</span>
                    <span className="font-black text-stone-800">{formatCurrency(initialFund)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-700 font-bold block">(+) Ventas Efvo</span>
                    <span className="font-black text-emerald-700">+{formatCurrency(cashSales)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-rose-700 font-bold block">(-) Gastos / Salidas</span>
                    <span className="font-black text-rose-700">-{formatCurrency(totalExpenses)}</span>
                  </div>
                </div>

                {/* Input de Efectivo Contado */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-stone-900">
                      ¿Cuánto dinero físico en efectivo contaste en el cajón? ($ MXN):
                    </label>
                    <button
                      type="button"
                      onClick={() => setCountedCash(expectedCashInDrawer.toString())}
                      className="text-[11px] font-black text-amber-800 hover:underline"
                    >
                      Poner Monto Esperado ({formatCurrency(expectedCashInDrawer)})
                    </button>
                  </div>

                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-xl text-stone-700">$</span>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder={expectedCashInDrawer.toString()}
                      value={countedCash}
                      onChange={(e) => setCountedCash(e.target.value)}
                      className="w-full pl-9 pr-4 py-3.5 bg-white rounded-2xl border-2 border-stone-300 focus:border-amber-600 focus:outline-none text-2xl font-black text-stone-900 shadow-inner"
                    />
                  </div>
                </div>

                {/* Cuadro de Diferencia en vivo */}
                <div className={`p-3.5 rounded-2xl border flex items-center justify-between font-black text-xs ${
                  cashDifference === 0
                    ? "bg-emerald-100 text-emerald-950 border-emerald-300"
                    : cashDifference > 0
                    ? "bg-blue-100 text-blue-950 border-blue-300"
                    : "bg-rose-100 text-rose-950 border-rose-300"
                }`}>
                  <div className="flex items-center gap-2">
                    {cashDifference === 0 ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                    ) : cashDifference > 0 ? (
                      <TrendingUp className="w-5 h-5 text-blue-700" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-rose-700" />
                    )}
                    <span>
                      {cashDifference === 0
                        ? "¡Caja Cuadrada Perfecta!"
                        : cashDifference > 0
                        ? "Sobrante de Efectivo en Caja:"
                        : "Faltante de Efectivo en Caja:"}
                    </span>
                  </div>
                  <span className="text-sm sm:text-base">
                    {cashDifference === 0
                      ? "$0.00 MXN"
                      : cashDifference > 0
                      ? `+${formatCurrency(cashDifference)}`
                      : formatCurrency(cashDifference)}
                  </span>
                </div>
              </div>

              {/* Sección 3: Fondo para el nuevo turno y Observaciones */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Fondo nuevo */}
                <div className="p-3.5 bg-stone-50 rounded-2xl border space-y-1.5">
                  <label className="font-black text-stone-900 block">
                    Fondo que se deja en caja para {incomingCashier} ($):
                  </label>
                  <input
                    type="number"
                    value={nextInitialFund}
                    onChange={(e) => setNextInitialFund(e.target.value)}
                    className="w-full p-2.5 bg-white border rounded-xl font-black text-stone-900"
                    placeholder="500"
                  />
                  <p className="text-[10px] text-stone-400">Para cambio y cobro de los primeros clientes.</p>
                </div>

                {/* Notas / Observaciones */}
                <div className="p-3.5 bg-stone-50 rounded-2xl border space-y-1.5">
                  <label className="font-black text-stone-900 block">
                    Observaciones o Notas de Entrega de Turno:
                  </label>
                  <textarea
                    rows={2}
                    value={shiftNotes}
                    onChange={(e) => setShiftNotes(e.target.value)}
                    placeholder="Ej. Charolas limpias, vitrina surtida, todo en orden..."
                    className="w-full p-2 bg-white border rounded-xl text-xs font-medium"
                  />
                </div>
              </div>

              {/* Botón Finalizar Corte */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleExecuteShiftCut}
                  disabled={isFinalizing}
                  className="w-full py-4 bg-gradient-to-r from-amber-900 via-amber-950 to-stone-900 hover:from-black hover:to-black text-white font-black rounded-2xl text-sm shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                  <span>
                    {isFinalizing ? "Procesando Corte..." : "🏁 Finalizar Corte de Caja & Entregar Turno"}
                  </span>
                </button>
                <p className="text-[10px] text-center text-stone-500 mt-2 flex items-center justify-center gap-1">
                  <BellRing className="w-3 h-3 text-amber-600" />
                  Se enviará automáticamente la notificación con el reporte completo al administrador
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-stone-200 flex items-center justify-between">
          <span className="text-xs font-medium text-stone-500">
            Panaderías Brito • Sucursal Matriz
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-xl text-xs transition-colors"
          >
            Cerrar Ventana
          </button>
        </div>
      </div>
    </div>
  );
}
