"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  Lock,
  History,
  Search,
  Eye,
  ArrowLeft,
  FileText
} from "lucide-react";
import { Product, Sale, CashExpense } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { useNotifications } from "@/context/NotificationContext";

export interface ShiftCutRecord {
  id: string;
  date: string;
  timestamp: number;
  shiftRange: string;
  outgoingCashier: string;
  incomingCashier: string;
  previousShift: string;
  nextShift: string;
  initialFund: number;
  cashSales: number;
  cardSales: number;
  transferSales: number;
  totalSales: number;
  totalSalesAll: number;
  totalExpenses: number;
  expectedCash: number;
  countedCash: number;
  difference: number;
  nextFund: number;
  notes: string;
  expensesList?: CashExpense[];
  stockPieces?: number;
  stockValue?: number;
}

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
  initialTab?: "cuentas" | "cambio" | "corte" | "historial";
}

const DEFAULT_SAMPLE_CUTS: ShiftCutRecord[] = [
  {
    id: "CORTE-948210",
    date: new Date(Date.now() - 6 * 3600000).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }),
    timestamp: Date.now() - 6 * 3600000,
    shiftRange: "06:00 AM — 02:00 PM",
    outgoingCashier: "Cajera 1 - Turno Matutino",
    incomingCashier: "Cajera 2 - Turno Vespertino",
    previousShift: "Turno Matutino (06:00 - 14:00)",
    nextShift: "Turno Vespertino (14:00 - 22:00)",
    initialFund: 500,
    cashSales: 1850,
    cardSales: 420,
    transferSales: 150,
    totalSales: 2420,
    totalSalesAll: 2420,
    totalExpenses: 200,
    expectedCash: 2150,
    countedCash: 2150,
    difference: 0,
    nextFund: 500,
    notes: "Entrega de turno matutino sin ninguna incidencia. Todo cuadrado al 100%.",
    stockPieces: 140,
    stockValue: 1820,
  },
  {
    id: "CORTE-893120",
    date: new Date(Date.now() - 26 * 3600000).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }),
    timestamp: Date.now() - 26 * 3600000,
    shiftRange: "02:00 PM — 10:00 PM",
    outgoingCashier: "Cajera 2 - Turno Vespertino",
    incomingCashier: "Cajera 1 - Turno Matutino",
    previousShift: "Turno Vespertino (14:00 - 22:00)",
    nextShift: "Turno Matutino (06:00 - 14:00)",
    initialFund: 500,
    cashSales: 2450,
    cardSales: 680,
    transferSales: 230,
    totalSales: 3360,
    totalSalesAll: 3360,
    totalExpenses: 150,
    expectedCash: 2800,
    countedCash: 2800,
    difference: 0,
    nextFund: 500,
    notes: "Cierre vespertino completado, pan dulce agotado en vitrina principal.",
    stockPieces: 15,
    stockValue: 195,
  },
];

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
  initialTab = "cambio",
}: CashDrawerShiftModalProps) {
  const { addNotification } = useNotifications();

  // Navigation mode: "cut" (Cierre actual) or "history" (Historial de tickets)
  const [modalView, setModalView] = useState<"cut" | "history">(
    initialTab === "historial" ? "history" : "cut"
  );
  
  // Shift Times
  const [shiftStartTime] = useState("06:00 AM");
  const [currentTime, setCurrentTime] = useState("");

  // Shift Change & Cash Cut form state
  const [outgoingCashier, setOutgoingCashier] = useState(cashierName);
  const [incomingCashier, setIncomingCashier] = useState("Cajera 2 - Turno Vespertino");
  const [nextShiftName, setNextShiftName] = useState("Turno Vespertino (14:00 - 22:00)");
  const [countedCash, setCountedCash] = useState<string>("");
  const [nextInitialFund, setNextInitialFund] = useState(initialFund ? initialFund.toString() : "500");
  const [shiftNotes, setShiftNotes] = useState("");
  const [hasAcceptedCash, setHasAcceptedCash] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [showCutSuccess, setShowCutSuccess] = useState(false);
  const [lastCutData, setLastCutData] = useState<ShiftCutRecord | null>(null);

  // History & Clarification State
  const [cutsHistory, setCutsHistory] = useState<ShiftCutRecord[]>([]);
  const [selectedHistoryTicket, setSelectedHistoryTicket] = useState<ShiftCutRecord | null>(null);
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [historyFilterType, setHistoryFilterType] = useState<"all" | "cajera1" | "cajera2" | "cuadrado" | "diferencia">("all");

  // Load history from localStorage
  const loadCutsHistory = () => {
    try {
      const raw = localStorage.getItem("brito_shift_cuts_history");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCutsHistory(parsed);
          return;
        }
      }
      // If empty, save default sample cuts
      localStorage.setItem("brito_shift_cuts_history", JSON.stringify(DEFAULT_SAMPLE_CUTS));
      setCutsHistory(DEFAULT_SAMPLE_CUTS);
    } catch (e) {
      console.error("Error loading shift cuts history:", e);
      setCutsHistory(DEFAULT_SAMPLE_CUTS);
    }
  };

  useEffect(() => {
    loadCutsHistory();
    const handleSync = () => loadCutsHistory();
    window.addEventListener("brito_shift_cuts_updated", handleSync);
    return () => window.removeEventListener("brito_shift_cuts_updated", handleSync);
  }, []);

  useEffect(() => {
    if (initialTab === "historial") {
      setModalView("history");
    } else {
      setModalView("cut");
    }
  }, [initialTab, isOpen]);

  useEffect(() => {
    setOutgoingCashier(cashierName);
    if (cashierName.includes("Cajera 1")) {
      setIncomingCashier("Cajera 2 - Turno Vespertino");
      setNextShiftName("Turno Vespertino (14:00 - 22:00)");
    } else {
      setIncomingCashier("Cajera 1 - Turno Matutino");
      setNextShiftName("Turno Matutino (06:00 - 14:00)");
    }
  }, [cashierName]);

  useEffect(() => {
    if (initialFund) {
      setNextInitialFund(initialFund.toString());
    }
  }, [initialFund, isOpen]);

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
  const totalSalesAll = sales.reduce((sum, s) => sum + s.total, 0) || (cashSales + cardSales + transferSales) || 0;

  // 2. Cálculos de Gastos del Turno
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  // 3. Dinero esperado en caja (Cajón)
  const expectedCashInDrawer = initialFund + cashSales - totalExpenses;

  // 4. Conteo y Diferencia (Arqueo)
  const parsedCountedCash = countedCash === "" ? expectedCashInDrawer : Number(countedCash) || 0;
  const cashDifference = parsedCountedCash - expectedCashInDrawer;

  // 5. Fondo Siguiente y Retiro a Administración
  const parsedNextFund = nextInitialFund === "" ? 500 : Math.max(0, Number(nextInitialFund) || 0);
  const cashToWithdraw = Math.max(0, parsedCountedCash - parsedNextFund);

  // 5. Existencias en mostrador
  const totalPiecesInStock = products.reduce((sum, p) => sum + p.stock, 0);
  const totalStockValue = products.reduce((sum, p) => sum + (p.stock * p.price), 0);

  const handleExecuteShiftCut = () => {
    setIsFinalizing(true);

    const nowDateTime = new Date().toLocaleString("es-MX", {
      dateStyle: "short",
      timeStyle: "short",
    });

    const newFolio = `CORTE-${Date.now().toString().slice(-6)}`;

    const cutRecord: ShiftCutRecord = {
      id: newFolio,
      date: nowDateTime,
      timestamp: Date.now(),
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
      totalSalesAll: totalSalesAll,
      totalExpenses,
      expectedCash: expectedCashInDrawer,
      countedCash: parsedCountedCash,
      difference: cashDifference,
      nextFund: parsedNextFund,
      notes: shiftNotes.trim() || "Cierre de turno completado conforme y sin anomalías.",
      expensesList: [...expenses],
      stockPieces: totalPiecesInStock,
      stockValue: totalStockValue,
    };

    setLastCutData(cutRecord);

    // Persistir en Historial
    try {
      const existingHistory: ShiftCutRecord[] = JSON.parse(
        localStorage.getItem("brito_shift_cuts_history") || "[]"
      );
      const updatedHistory = [cutRecord, ...existingHistory];
      localStorage.setItem("brito_shift_cuts_history", JSON.stringify(updatedHistory));
      setCutsHistory(updatedHistory);
      window.dispatchEvent(new Event("brito_shift_cuts_updated"));
    } catch (e) {
      console.error("Error guardando corte en historial:", e);
    }

    // Guardar nuevo fondo inicial en localStorage
    try {
      localStorage.setItem("brito_pos_initial_fund", parsedNextFund.toString());
    } catch (e) {}

    // NOTIFICACIÓN DIRECTA AL ADMINISTRADOR / SISTEMA CON ALTA PRIORIDAD
    addNotification({
      senderName: `🏁 Corte Guardado (${outgoingCashier})`,
      senderAvatar: "💰",
      badgeIcon: "dinero",
      title: `Corte de Turno ${newFolio}: ${formatCurrency(parsedCountedCash)} en Caja`,
      highlightText: `${outgoingCashier} entregó a ${incomingCashier}`,
      description: `Folio ${newFolio} archivado en historial. Horario: ${shiftStartTime} a ${currentTime}. Efectivo contado: ${formatCurrency(parsedCountedCash)} (${cashDifference === 0 ? "Cuadrada Exacta" : cashDifference > 0 ? `Sobrante +${formatCurrency(cashDifference)}` : `Faltante ${formatCurrency(cashDifference)}`}). Fondo para nuevo turno: ${formatCurrency(parsedNextFund)}, Efectivo entregado/retirado: ${formatCurrency(cashToWithdraw)}.`,
      category: "caja",
      actionLabel: "Consultar Historial",
      actionLink: "/caja",
    });

    // Actualizar al nuevo cajero y turno
    onChangeCashier(incomingCashier);
    onChangeShift(nextShiftName);
    onChangeInitialFund(parsedNextFund);

    setIsFinalizing(false);
    setShowCutSuccess(true);
  };

  const handleClose = () => {
    if (showCutSuccess && onCompleteShiftCut) {
      onCompleteShiftCut();
    }
    onClose();
  };


  // Filtrado exclusivo para la cajera del turno actual
  const currentCashierKey = cashierName.includes("Cajera 1") 
    ? "Cajera 1" 
    : cashierName.includes("Cajera 2") 
    ? "Cajera 2" 
    : cashierName;

  const currentCashierCuts = useMemo(() => {
    return cutsHistory.filter((cut) => {
      return (
        cut.outgoingCashier.toLowerCase().includes(currentCashierKey.toLowerCase()) ||
        cut.incomingCashier.toLowerCase().includes(currentCashierKey.toLowerCase())
      );
    });
  }, [cutsHistory, currentCashierKey]);

  const filteredHistory = useMemo(() => {
    return currentCashierCuts.filter((cut) => {
      const q = historySearchQuery.toLowerCase().trim();
      const matchesQuery = 
        !q || 
        cut.id.toLowerCase().includes(q) ||
        cut.date.toLowerCase().includes(q) ||
        (cut.notes && cut.notes.toLowerCase().includes(q));

      if (!matchesQuery) return false;

      if (historyFilterType === "cuadrado") {
        return cut.difference === 0;
      }
      if (historyFilterType === "diferencia") {
        return cut.difference !== 0;
      }
      return true;
    });
  }, [currentCashierCuts, historySearchQuery, historyFilterType]);

  // Componente del Ticket Digital Animado (Reutilizable para Corte Actual e Historial)
  const renderDigitalTicket = (cut: ShiftCutRecord, isHistoryView = false) => {
    const totalSalesCalculated = cut.totalSalesAll || cut.totalSales || (cut.cashSales + cut.cardSales + cut.transferSales) || 0;

    return (
      <div className="space-y-4 animate-in zoom-in-95 duration-300">
        {/* Ticket Térmico Digital Prémium */}
        <div 
          id={`ticket-${cut.id}`}
          className="bg-stone-50 p-6 sm:p-7 rounded-3xl border-2 border-stone-300/80 shadow-xl max-w-md mx-auto font-mono text-xs text-stone-800 space-y-3.5 relative overflow-hidden ring-1 ring-black/5"
        >
          {/* Marca de agua sutil de seguridad */}
          <div className="absolute -right-8 -bottom-8 pointer-events-none opacity-[0.03] select-none text-9xl font-black">
            🥖
          </div>

          {/* Cabecera Oficial Brito */}
          <div className="text-center border-b-2 border-dashed border-stone-300 pb-3.5">
            <div className="text-3xl mb-1 filter drop-shadow-xs">🥖</div>
            <h2 className="font-black text-base sm:text-lg uppercase tracking-wider text-stone-900">
              PANADERÍAS BRITO
            </h2>
            <p className="text-[11px] text-stone-500 font-sans font-medium">
              Don Antonio Brito & Hijos • Sucursal Matriz
            </p>
            <div className="mt-2 inline-block bg-amber-950 text-amber-200 px-3 py-1 rounded-xl font-bold text-[11px] tracking-wide shadow-xs">
              COMPROBANTE DIGITAL DE CORTE DE CAJA (Z)
            </div>
          </div>

          {/* Metadatos y Relevo */}
          <div className="text-[11px] space-y-1.5 border-b-2 border-dashed border-stone-300 pb-3">
            <div className="flex justify-between items-center">
              <span className="text-stone-500 font-bold">FOLIO:</span>
              <span className="font-black text-amber-950 bg-amber-100 px-2 py-0.5 rounded-md">{cut.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">FECHA Y HORA:</span>
              <span className="font-bold text-stone-900">{cut.date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">HORARIO TURNO:</span>
              <span className="font-bold text-stone-900">{cut.shiftRange}</span>
            </div>
            <div className="flex justify-between items-center pt-1">
              <span className="text-rose-700 font-bold">ENTREGÓ (Saliente):</span>
              <span className="font-black text-stone-900">{cut.outgoingCashier}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-emerald-700 font-bold">RECIBIÓ (Entrante):</span>
              <span className="font-black text-stone-900">{cut.incomingCashier}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">TURNO SIGUIENTE:</span>
              <span className="font-semibold text-stone-700">{cut.nextShift}</span>
            </div>
          </div>

          {/* Desglose de Caja & Arqueo */}
          <div className="space-y-1.5 border-b-2 border-dashed border-stone-300 pb-3 text-[11px]">
            <div className="flex justify-between font-black text-stone-500 text-[10px] uppercase pb-0.5">
              <span>Concepto de Caja</span>
              <span>Importe</span>
            </div>
            <div className="flex justify-between">
              <span>(+) Fondo Inicial de Turno:</span>
              <span className="font-bold">{formatCurrency(cut.initialFund)}</span>
            </div>
            <div className="flex justify-between text-emerald-700 font-bold">
              <span>(+) Ventas en Efectivo:</span>
              <span>+{formatCurrency(cut.cashSales)}</span>
            </div>
            <div className="flex justify-between text-rose-700 font-bold">
              <span>(-) Gastos / Retiros:</span>
              <span>-{formatCurrency(cut.totalExpenses)}</span>
            </div>
            <div className="flex justify-between font-black text-stone-900 border-t border-dashed border-stone-300 pt-2 text-xs">
              <span>(=) Total Esperado en Caja:</span>
              <span>{formatCurrency(cut.expectedCash)}</span>
            </div>
            <div className="flex justify-between font-black text-amber-950 pt-0.5 text-xs">
              <span>(=) Efectivo Físico Entregado:</span>
              <span>{formatCurrency(cut.countedCash)}</span>
            </div>

            {/* Badge de Estado / Diferencia */}
            <div className={`flex justify-between items-center font-black p-2 rounded-xl mt-2 text-xs shadow-xs ${
              cut.difference === 0
                ? "bg-emerald-100 text-emerald-950 border border-emerald-300"
                : cut.difference > 0
                ? "bg-blue-100 text-blue-950 border border-blue-300"
                : "bg-rose-100 text-rose-950 border border-rose-300"
            }`}>
              <span>ARQUEO / DIFERENCIA:</span>
              <span>
                {cut.difference === 0 
                  ? "✓ $0.00 (Cuadrada Exacta)" 
                  : cut.difference > 0 
                  ? `Sobrante +${formatCurrency(cut.difference)}`
                  : `Faltante ${formatCurrency(cut.difference)}`}
              </span>
            </div>

            {/* Desglose de Entrega & Fondo Siguiente */}
            <div className="pt-2 mt-2 border-t border-dotted border-stone-300 space-y-1">
              <div className="flex justify-between text-amber-950 font-bold">
                <span>🪙 Fondo que se deja en Caja (Nuevo Turno):</span>
                <span className="font-black text-stone-900">{formatCurrency(cut.nextFund || 500)}</span>
              </div>
              <div className="flex justify-between text-emerald-800 font-bold">
                <span>💰 Efectivo Retirado / Entregado:</span>
                <span className="font-black text-emerald-950">{formatCurrency(Math.max(0, cut.countedCash - (cut.nextFund || 500)))}</span>
              </div>
            </div>
          </div>

          {/* Estadísticas de Métodos de Pago */}
          <div className="space-y-1.5 text-[10px] text-stone-600 pt-1 border-b-2 border-dashed border-stone-300 pb-3">
            <div className="flex justify-between">
              <span>Ventas con Tarjeta:</span>
              <span className="font-bold">{formatCurrency(cut.cardSales)}</span>
            </div>
            <div className="flex justify-between">
              <span>Ventas con Transferencia:</span>
              <span className="font-bold">{formatCurrency(cut.transferSales)}</span>
            </div>
            <div className="flex justify-between font-black text-stone-900 text-xs pt-1 border-t border-dotted border-stone-300">
              <span>Gran Total Vendido:</span>
              <span className="text-amber-900 text-sm font-black">{formatCurrency(totalSalesCalculated)}</span>
            </div>
          </div>

          {/* Notas / Observaciones */}
          {cut.notes && (
            <div className="bg-stone-100 p-2.5 rounded-xl text-[10px] text-stone-600 font-sans border border-stone-200">
              <span className="font-bold text-stone-800 block mb-0.5">Observaciones:</span>
              <p className="italic">"{cut.notes}"</p>
            </div>
          )}

          {/* SELLO DIGITAL DE SEGURIDAD & CERTIFICACIÓN (REEMPLAZO MODERNO DE FIRMAS) */}
          <div className="bg-gradient-to-br from-stone-900 via-amber-950 to-stone-900 text-white p-3.5 rounded-2xl border-2 border-amber-500/40 text-center space-y-1.5 shadow-md">
            <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-black text-xs uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>Arqueo Digital Verificado & Registrado</span>
            </div>
            <p className="text-[10px] text-amber-200 font-mono tracking-tight">
              SELLO: {cut.id} • REGISTRO INMUTABLE BRITO POS
            </p>
            <p className="text-[9px] text-stone-300 font-sans leading-tight">
              Comprobante digital archivado en el historial para auditoría, dudas y aclaraciones de turno.
            </p>
          </div>

          {/* Pie del ticket */}
          <div className="text-center pt-1 text-[9px] text-stone-400 font-sans">
            Panaderías Brito • Sucursal Matriz • Sistema Punto de Venta
          </div>
        </div>

      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/90 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[94vh] border-2 border-amber-900/30">
        
        {/* Cabecera Principal con Pestañas de Navegación */}
        <div className="bg-gradient-to-r from-amber-950 via-stone-900 to-amber-950 text-white p-4 sm:p-5 px-5 sm:px-7 border-b border-amber-900/50 shadow-md">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 sm:w-12 sm:h-12 bg-gradient-to-tr from-amber-500 to-orange-500 text-white rounded-2xl flex items-center justify-center shadow-md shadow-amber-500/30 shrink-0">
                <Coins className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              <div>
                <h2 className="font-black text-lg sm:text-2xl leading-tight text-white tracking-wide">
                  {modalView === "cut" ? "Cierre de Turno & Entrega de Caja" : "Historial de Tickets de Corte"}
                </h2>
                <p className="text-xs sm:text-sm text-amber-300 font-bold mt-0.5">
                  {modalView === "cut" 
                    ? "Arqueo digital sin detalles y entrega conforme al relevo" 
                    : "Consulta comprobantes anteriores para cualquier duda o aclaración"}
                </p>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="p-2.5 rounded-2xl text-stone-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
              title="Cerrar modal"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Selector de Pestañas: [ Corte Actual ] vs [ Historial de Comprobantes ] */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-amber-900/40">
            <button
              type="button"
              onClick={() => {
                setModalView("cut");
                setSelectedHistoryTicket(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all duration-200 active:scale-95 ${
                modalView === "cut"
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/30 scale-[1.02]"
                  : "bg-white/10 text-stone-300 hover:bg-white/20 hover:text-white"
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>Cierre de Turno Actual</span>
            </button>

            <button
              type="button"
              onClick={() => setModalView("history")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all duration-200 active:scale-95 relative ${
                modalView === "history"
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/30 scale-[1.02]"
                  : "bg-white/10 text-stone-300 hover:bg-white/20 hover:text-white"
              }`}
            >
              <History className="w-4 h-4" />
              <span>Historial de Comprobantes</span>
              <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-stone-900/80 text-amber-300 border border-amber-400/40">
                {cutsHistory.length}
              </span>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* VISTA 1: CIERRE DE TURNO ACTUAL */}
          {modalView === "cut" && (
            <>
              {showCutSuccess && lastCutData ? (
                /* Vista de Éxito Post-Corte con Ticket Digital Animado */
                <div className="space-y-5 animate-in zoom-in-95 duration-200">
                  <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-2 border-emerald-300 p-4 sm:p-5 rounded-3xl text-center space-y-2 shadow-sm">
                    <div className="w-14 h-14 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-lg animate-bounce">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-black text-emerald-950">¡Cierre de Turno Conforme y Exitoso!</h3>
                    <p className="text-xs sm:text-sm text-emerald-800 max-w-md mx-auto leading-relaxed">
                      El arqueo cerró sin problemas. Cuentas cuadradas al 100%, comprobante digital emitido y caja entregada a <strong>{lastCutData.incomingCashier}</strong>.
                    </p>
                  </div>

                  {/* Render del Ticket Digital */}
                  {renderDigitalTicket(lastCutData, false)}

                  {/* Botón Principal de Bloqueo y Conclusión */}
                  <div className="max-w-md mx-auto pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        if (onCompleteShiftCut) onCompleteShiftCut();
                      }}
                      className="w-full py-4.5 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-700 hover:to-orange-700 text-white font-black rounded-2xl text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-xl shadow-orange-950/20 active:scale-95 transition-all animate-pulse"
                    >
                      <Lock className="w-5 h-5" />
                      <span>Finalizar y Bloquear Punto de Venta</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Formulario Directo de Arqueo y Relevo */
                <div className="space-y-3.5">
                  {/* 1. Resumen Financiero del Turno */}
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

                  {/* 2. Relevo Directo Estático: Quién Entrega y Quién Recibe (Sin opciones de selección) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-stone-50 rounded-3xl border-2 border-stone-200">
                    <div className="flex items-center justify-between gap-3 bg-white p-3 sm:p-3.5 rounded-2xl border border-stone-200/90 shadow-xs">
                      <span className="font-black text-rose-700 uppercase shrink-0 text-xs sm:text-sm flex items-center gap-1.5">
                        <span className="text-base">👤</span> Entrega:
                      </span>
                      <div className="font-black text-stone-900 text-xs sm:text-sm truncate flex-1 text-right flex items-center justify-end gap-1.5">
                        <span className="text-base">👩‍🍳</span>
                        <span className="truncate">{outgoingCashier}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 bg-white p-3 sm:p-3.5 rounded-2xl border border-emerald-200 shadow-xs">
                      <span className="font-black text-emerald-700 uppercase shrink-0 text-xs sm:text-sm flex items-center gap-1.5">
                        <span className="text-base">👤</span> Recibe:
                      </span>
                      <div className="font-black text-emerald-950 text-xs sm:text-sm truncate flex-1 text-right flex items-center justify-end gap-1.5">
                        <span className="text-base">👩‍🍳</span>
                        <span className="truncate">{incomingCashier}</span>
                      </div>
                    </div>
                  </div>

                  {/* 3. Verificación de Dinero en Caja */}
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
                                : `Diferencia de ${formatCurrency(cashDifference)}. Se registrará el comprobante digital en el historial.`}
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

                  {/* 4. Dinero que se dejará en caja para comenzar nuevamente el turno */}
                  <div className="p-4 sm:p-5 bg-gradient-to-br from-amber-50/90 via-white to-orange-50/70 rounded-3xl border-2 border-amber-300 shadow-sm space-y-3.5">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-2 border-b border-amber-200/70">
                      <div>
                        <span className="text-sm sm:text-base font-black text-stone-900 uppercase flex items-center gap-2">
                          <span className="text-xl">🪙</span> ¿Cuánto dinero se dejará en caja para el siguiente turno?
                        </span>
                        <span className="text-xs sm:text-sm text-stone-600 font-bold mt-0.5 block">
                          Fondo inicial con el que <strong className="text-stone-800">{incomingCashier}</strong> comenzará nuevamente a operar
                        </span>
                      </div>
                      <div className="text-right shrink-0 bg-amber-100/90 px-3.5 py-1.5 rounded-2xl border border-amber-300 shadow-2xs">
                        <span className="text-[10px] font-black uppercase text-amber-800 block">Fondo Siguiente Turno</span>
                        <span className="text-xl sm:text-2xl font-black text-amber-950">
                          {formatCurrency(parsedNextFund)}
                        </span>
                      </div>
                    </div>

                    {/* Input Manual de Fondo Siguiente */}
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-lg text-stone-500">$</span>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="Monto de dinero que se quedará en caja para el nuevo turno"
                        value={nextInitialFund}
                        onChange={(e) => setNextInitialFund(e.target.value)}
                        className="w-full pl-9 pr-4 py-3.5 bg-white rounded-2xl border-2 border-stone-300 focus:border-amber-600 font-black text-base text-stone-900 focus:outline-none shadow-sm transition-all placeholder:text-stone-400"
                      />
                    </div>

                    {/* Resumen de Entrega: Total Contado, Fondo que Queda, Efectivo a Entregar */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                      <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-stone-200 text-center shadow-2xs">
                        <span className="text-[10px] text-stone-500 font-black uppercase block">Efectivo Físico en Caja</span>
                        <span className="text-base sm:text-lg font-black text-stone-900 block mt-0.5">{formatCurrency(parsedCountedCash)}</span>
                      </div>
                      <div className="bg-amber-50 p-2.5 sm:p-3 rounded-2xl border border-amber-300 text-center shadow-2xs">
                        <span className="text-[10px] text-amber-900 font-black uppercase block">🪙 Se queda en Caja (Fondo)</span>
                        <span className="text-base sm:text-lg font-black text-amber-950 block mt-0.5">{formatCurrency(parsedNextFund)}</span>
                      </div>
                      <div className="bg-emerald-50 p-2.5 sm:p-3 rounded-2xl border border-emerald-300 text-center shadow-2xs">
                        <span className="text-[10px] text-emerald-800 font-black uppercase block">💰 Efectivo a Retirar / Entregar</span>
                        <span className="text-base sm:text-lg font-black text-emerald-950 block mt-0.5">{formatCurrency(cashToWithdraw)}</span>
                      </div>
                    </div>
                  </div>

                  {/* 5. Casilla de Confirmación y Botón Final */}
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
                        Confirmo el <strong className="text-amber-900">Cierre de Turno</strong>: conté el dinero ({countedCash ? formatCurrency(parsedCountedCash) : "$0.00"}), se dejan <strong className="text-amber-950">{formatCurrency(parsedNextFund)}</strong> de fondo en caja para comenzar con {incomingCashier}, y se entregan <strong className="text-emerald-900">{formatCurrency(cashToWithdraw)}</strong> a administración.
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
                        {isFinalizing ? "Cerrando Turno..." : `🔒 CERRAR TURNO Y GENERAR COMPROBANTE (${incomingCashier}) ➔`}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* VISTA 2: HISTORIAL DE TICKETS DE CORTE (DUDAS O ACLARACIONES) */}
          {modalView === "history" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {selectedHistoryTicket ? (
                /* Vista Detallada de un Comprobante Seleccionado */
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3 bg-amber-50 p-3.5 sm:p-4 rounded-2xl border-2 border-amber-300">
                    <button
                      type="button"
                      onClick={() => setSelectedHistoryTicket(null)}
                      className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-stone-100 text-stone-900 font-black rounded-xl text-xs sm:text-sm border border-stone-300 shadow-xs transition-all active:scale-95"
                    >
                      <ArrowLeft className="w-4 h-4 text-amber-800" />
                      <span>Volver al Listado</span>
                    </button>
                    <div className="text-right">
                      <span className="text-[11px] font-bold text-amber-800 uppercase block">Consultando Comprobante</span>
                      <span className="text-sm sm:text-base font-black text-stone-900 font-mono">{selectedHistoryTicket.id}</span>
                    </div>
                  </div>

                  {/* Render del Ticket */}
                  {renderDigitalTicket(selectedHistoryTicket, true)}
                </div>
              ) : (
                /* Listado y Filtros del Historial */
                <div className="space-y-3.5">
                  {/* Barra de Búsqueda y Filtros de la Cajera en Turno */}
                  <div className="space-y-2.5">
                    <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input
                          type="text"
                          placeholder={`Buscar en mis cortes (${currentCashierKey}) por folio o fecha...`}
                          value={historySearchQuery}
                          onChange={(e) => setHistorySearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border-2 border-stone-200 rounded-2xl text-xs sm:text-sm font-bold text-stone-900 focus:outline-none focus:border-amber-600 transition-colors placeholder:text-stone-400"
                        />
                        {historySearchQuery && (
                          <button
                            type="button"
                            onClick={() => setHistorySearchQuery("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 text-xs font-bold"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      {/* Filtros Rápidos */}
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                        <button
                          type="button"
                          onClick={() => setHistoryFilterType("all")}
                          className={`px-3.5 py-2 rounded-xl text-xs font-black shrink-0 transition-all border ${
                            historyFilterType === "all"
                              ? "bg-amber-950 text-amber-100 border-amber-950 shadow-xs"
                              : "bg-stone-50 text-stone-700 hover:bg-stone-100 border-stone-200"
                          }`}
                        >
                          Mis Cortes ({currentCashierCuts.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setHistoryFilterType("cuadrado")}
                          className={`px-3 py-2 rounded-xl text-xs font-black shrink-0 transition-all border ${
                            historyFilterType === "cuadrado"
                              ? "bg-emerald-850 bg-emerald-900 text-emerald-100 border-emerald-950 shadow-xs ring-2 ring-emerald-500/30"
                              : "bg-stone-50 text-stone-700 hover:bg-emerald-50/60 border-stone-200"
                          }`}
                        >
                          🟢 Cuadrados ({currentCashierCuts.filter(c => c.difference === 0).length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setHistoryFilterType("diferencia")}
                          className={`px-3 py-2 rounded-xl text-xs font-black shrink-0 transition-all border ${
                            historyFilterType === "diferencia"
                              ? "bg-rose-900 text-rose-100 border-rose-950 shadow-xs ring-2 ring-rose-500/30"
                              : "bg-stone-50 text-stone-700 hover:bg-rose-50/60 border-stone-200"
                          }`}
                        >
                          ⚠️ Diferencias ({currentCashierCuts.filter(c => c.difference !== 0).length})
                        </button>
                      </div>
                    </div>

                    {/* Badge informativo de la cajera actual */}
                    <div className="flex items-center justify-between text-xs bg-amber-50/80 px-3.5 py-2 rounded-xl border border-amber-200/80 text-stone-700">
                      <span className="font-bold flex items-center gap-1.5 text-stone-900">
                        <span>👩‍🍳</span> Historial exclusivo de: <strong className="text-amber-950 font-black">{currentCashierKey}</strong>
                      </span>
                      <span className="text-[11px] text-stone-500 font-medium">
                        Mostrando {filteredHistory.length} comprobante(s)
                      </span>
                    </div>
                  </div>

                  {/* Lista Limpia, Clara y Fácil de Comprender */}
                  {filteredHistory.length === 0 ? (
                    <div className="bg-stone-50 border-2 border-dashed border-stone-200 rounded-3xl p-8 text-center space-y-2">
                      <div className="text-4xl">📜</div>
                      <h4 className="font-black text-stone-800 text-base">No hay comprobantes para {currentCashierKey}</h4>
                      <p className="text-xs text-stone-500 max-w-sm mx-auto">
                        {historySearchQuery 
                          ? `No hay ningún corte que coincida con "${historySearchQuery}".`
                          : `Los cortes de turno que realices se guardarán aquí automáticamente para cualquier duda o aclaración.`}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {filteredHistory.map((cut) => {
                        const totalSalesValue = cut.totalSalesAll || cut.totalSales || (cut.cashSales + cut.cardSales + cut.transferSales) || 0;
                        const isSquare = cut.difference === 0;
                        const isPositive = cut.difference > 0;

                        return (
                          <div
                            key={cut.id}
                            onClick={() => setSelectedHistoryTicket(cut)}
                            className="bg-white hover:bg-amber-50/60 p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border-2 border-stone-200 hover:border-amber-400 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 group"
                          >
                            {/* 1. Folio y Fechas */}
                            <div className="flex items-start sm:items-center gap-3 min-w-[210px]">
                              <div className="w-11 h-11 rounded-2xl bg-amber-100/90 border border-amber-300 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">
                                🧾
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono font-black text-xs sm:text-sm text-stone-950 bg-stone-100 group-hover:bg-amber-200 px-2 py-0.5 rounded-lg transition-colors">
                                    {cut.id}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide border md:hidden ${
                                    isSquare
                                      ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                                      : isPositive
                                      ? "bg-blue-100 text-blue-900 border-blue-300"
                                      : "bg-rose-100 text-rose-900 border-rose-300"
                                  }`}>
                                    {isSquare ? "✓ Cuadrado" : isPositive ? `+${formatCurrency(cut.difference)}` : `${formatCurrency(cut.difference)}`}
                                  </span>
                                </div>
                                <p className="text-xs text-stone-600 font-bold mt-1 flex items-center gap-1.5 flex-wrap">
                                  <span>📅 {cut.date}</span>
                                  <span className="text-stone-300">•</span>
                                  <span className="text-stone-500 font-medium">🕒 {cut.shiftRange}</span>
                                </p>
                              </div>
                            </div>

                            {/* 2. Cifras Clave (Entregado, Ventas, Gastos) */}
                            <div className="grid grid-cols-3 gap-2 sm:gap-3 flex-1 max-w-md bg-stone-50/90 group-hover:bg-white p-2.5 sm:px-3 rounded-2xl border border-stone-200 transition-colors text-center">
                              <div>
                                <span className="text-[10px] text-stone-500 font-bold block uppercase tracking-wider">Entregado</span>
                                <span className="text-xs sm:text-sm font-black text-amber-950">{formatCurrency(cut.countedCash)}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-emerald-700 font-bold block uppercase tracking-wider">Ventas</span>
                                <span className="text-xs sm:text-sm font-black text-emerald-700">+{formatCurrency(totalSalesValue)}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-rose-700 font-bold block uppercase tracking-wider">Gastos</span>
                                <span className="text-xs sm:text-sm font-black text-rose-700">-{formatCurrency(cut.totalExpenses)}</span>
                              </div>
                            </div>

                            {/* 3. Estado & Botón de Acción */}
                            <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
                              <span className={`hidden md:inline-flex px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wide border ${
                                isSquare
                                  ? "bg-emerald-100 text-emerald-900 border-emerald-300 shadow-2xs"
                                  : isPositive
                                  ? "bg-blue-100 text-blue-900 border-blue-300 shadow-2xs"
                                  : "bg-rose-100 text-rose-900 border-rose-300 shadow-2xs"
                              }`}>
                                {isSquare ? "✓ Cuadrado" : isPositive ? `Sobrante +${formatCurrency(cut.difference)}` : `Faltante ${formatCurrency(cut.difference)}`}
                              </span>

                              <div className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-amber-950 text-amber-200 group-hover:bg-amber-900 group-hover:text-white font-black text-xs transition-all shadow-xs shrink-0">
                                <Eye className="w-3.5 h-3.5" />
                                <span>Ver Ticket ➔</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Modal */}
        <div className="p-3.5 sm:p-4 px-6 bg-white border-t border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-stone-500">
            <span className="text-amber-600">🥖</span>
            <span>Panaderías Brito • Sucursal Matriz</span>
          </div>
          <button
            onClick={handleClose}
            className="px-6 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-black rounded-xl text-xs sm:text-sm transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

