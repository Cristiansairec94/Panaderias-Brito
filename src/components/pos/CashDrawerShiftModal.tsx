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

        {/* Modal Scrollable Body: UN SOLO APARTADO SIMPLE Y DIRECTO */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
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

              {/* Botones de acción post-corte */}
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
          ) : (
            /* UN SOLO APARTADO SIMPLE Y DIRECTO (SIN PESTAÑAS) */
            <div className="space-y-3">
              {/* 1. Resumen Financiero del Turno en 1 Sola Franja */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs">
                <div>
                  <span className="text-[10px] text-stone-500 font-bold block uppercase">Fondo Inicial</span>
                  <span className="text-sm font-black text-stone-900">{formatCurrency(initialFund)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-700 font-bold block uppercase">(+) Ventas</span>
                  <span className="text-sm font-black text-emerald-700">+{formatCurrency(cashSales)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-rose-700 font-bold block uppercase">(-) Gastos</span>
                  <span className="text-sm font-black text-rose-700">-{formatCurrency(totalExpenses)}</span>
                </div>
                <div className="bg-amber-100/80 px-2 py-1 rounded-xl border border-amber-300">
                  <span className="text-[10px] text-amber-950 font-black block uppercase">En Caja</span>
                  <span className="text-sm font-black text-amber-950">{formatCurrency(expectedCashInDrawer)}</span>
                </div>
              </div>
              {/* 1. Relevo Directo: Quién Entrega y Quién Recibe */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-black text-rose-700 uppercase shrink-0">
                    👤 Entrega:
                  </span>
                  <div className="p-2 bg-white rounded-xl border font-black text-stone-900 text-xs truncate flex-1 text-right">
                    {outgoingCashier} ({shiftName.split(" ")[0]})
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="font-black text-emerald-700 uppercase shrink-0">
                    👤 Recibe:
                  </span>
                  <select
                    value={incomingCashier}
                    onChange={(e) => setIncomingCashier(e.target.value)}
                    className="p-2 bg-white border-2 border-emerald-400 rounded-xl font-black text-stone-900 text-xs focus:outline-none flex-1 shadow-xs"
                  >
                    <option value="Cajero 2 - Turno Tarde">Cajero 2 - Turno Tarde</option>
                    <option value="Cajero 1 - Turno Mañana">Cajero 1 - Turno Mañana</option>
                    <option value="Don Toño Brito">Don Antonio Brito (Propietario)</option>
                    <option value="María Brito">María Brito</option>
                    <option value="Lupita Brito">Lupita Brito</option>
                  </select>
                </div>
              </div>

              {/* 2. Verificación de Dinero en Caja (Resumido y Claro) */}
              <div className="p-3.5 bg-amber-50 rounded-2xl border-2 border-amber-300 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-stone-900 uppercase block">
                      💵 Dinero que debe haber en caja:
                    </span>
                    <span className="text-[11px] text-stone-600 font-bold">
                      Fondo: {formatCurrency(initialFund)} • Ventas: {formatCurrency(cashSales)} • Gastos: -{formatCurrency(totalExpenses)}
                    </span>
                  </div>
                  <span className="text-2xl font-black text-amber-950 bg-amber-200/90 px-3.5 py-1 rounded-xl">
                    {formatCurrency(expectedCashInDrawer)}
                  </span>
                </div>

                {/* Conteo Rápido: Botón 1 Toque o Input Manual en 1 fila */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setCountedCash(expectedCashInDrawer.toString());
                      setHasAcceptedCash(true);
                    }}
                    className={`py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 shadow-xs active:scale-95 ${
                      countedCash === expectedCashInDrawer.toString() && hasAcceptedCash
                        ? "bg-amber-700 text-white ring-2 ring-amber-400"
                        : "bg-amber-600 hover:bg-amber-700 text-white"
                    }`}
                  >
                    <span>⚡ El dinero está completo ({formatCurrency(expectedCashInDrawer)})</span>
                  </button>

                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-sm text-stone-500">$</span>
                    <input
                      type="number"
                      step="any"
                      placeholder={`O escribe otro monto`}
                      value={countedCash}
                      onChange={(e) => {
                        setCountedCash(e.target.value);
                        setHasAcceptedCash(true);
                      }}
                      className="w-full pl-7 pr-3 py-2 bg-white rounded-xl border-2 border-stone-300 focus:border-amber-600 font-black text-sm text-stone-900 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Semáforo Rápido de Diferencia */}
                {countedCash && (
                  <div className={`p-2 rounded-xl border text-xs font-black flex justify-between items-center ${
                    cashDifference === 0
                      ? "bg-emerald-100 text-emerald-950 border-emerald-300"
                      : cashDifference > 0
                      ? "bg-blue-100 text-blue-950 border-blue-300"
                      : "bg-rose-100 text-rose-950 border-rose-300"
                  }`}>
                    <span>
                      {cashDifference === 0
                        ? "🟢 ¡Caja Cuadrada Exacta!"
                        : cashDifference > 0
                        ? "🟡 Sobrante en Caja:"
                        : "🔴 Faltante en Caja:"}
                    </span>
                    <span className="font-black">
                      {cashDifference === 0
                        ? "$0.00"
                        : cashDifference > 0
                        ? `+${formatCurrency(cashDifference)}`
                        : formatCurrency(cashDifference)}
                    </span>
                  </div>
                )}
              </div>

              {/* 3. Casilla de Confirmación y Botón Final */}
              <div className="space-y-2">
                <label className="flex items-center gap-2.5 px-3 py-2 bg-amber-50/80 rounded-xl border border-amber-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hasAcceptedCash}
                    onChange={(e) => setHasAcceptedCash(e.target.checked)}
                    className="w-4 h-4 rounded accent-amber-700 cursor-pointer shrink-0"
                  />
                  <span className="text-xs font-bold text-stone-900 leading-snug">
                    Yo, <strong>{incomingCashier}</strong>, confirmo que conté el dinero ({countedCash ? formatCurrency(parsedCountedCash) : "$0.00"}) y acepto la caja.
                  </span>
                </label>

                <button
                  type="button"
                  onClick={handleExecuteShiftCut}
                  disabled={!countedCash || !hasAcceptedCash || isFinalizing}
                  className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-2xl text-sm sm:text-base shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
                  <span>
                    {isFinalizing ? "Aceptando Turno..." : `✅ ACEPTAR TURNO Y COMENZAR (${incomingCashier})`}
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
            onClick={onClose}
            className="px-6 py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 font-black rounded-xl text-xs sm:text-sm transition-colors"
          >
            Cerrar Ventana
          </button>
        </div>
      </div>
    </div>
  );
}
