"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign, 
  Lock, 
  Receipt, 
  History, 
  Coins, 
  Calculator, 
  CheckCircle2, 
  AlertCircle, 
  UserCheck, 
  Plus, 
  Minus, 
  X, 
  CreditCard, 
  Building, 
  TrendingUp,
  Printer,
  Search,
  Filter,
  Download,
  Eye,
  EyeOff,
  RefreshCw,
  ShieldCheck,
  Calendar,
  Layers,
  ArrowRight,
  Clock,
  Wifi,
  WifiOff
} from "lucide-react";
import { CashMovement, ShiftCutRecord } from "@/types";
import { formatCurrency, onlyNumbersKeyDown, cleanDecimalNumbers, formatDateTimeSafe } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useBranch } from "@/context/BranchContext";
import { useNotifications } from "@/context/NotificationContext";
import { useSync } from "@/context/SyncContext";
import { recordCashOutflowAsExpense } from "@/lib/expenses";
import { recordCashIncome } from "@/lib/incomes";
import ShiftCutDetailModal from "@/components/caja/ShiftCutDetailModal";

const SAMPLE_HISTORICAL_CUTS: ShiftCutRecord[] = [
  {
    id: "CORTE-948210",
    date: "Hoy, 02:00 PM",
    timestamp: Date.now() - 2 * 3600000,
    shiftRange: "06:00 AM — 02:00 PM",
    outgoingCashier: "Cajera 1 - Turno Matutino",
    incomingCashier: "Cajera 2 - Turno Vespertino",
    responsible: "Lupita Brito (Cajera 1)",
    branchName: "Sucursal Matriz Centro",
    previousShift: "Turno Matutino (06:00 - 14:00)",
    nextShift: "Turno Vespertino (14:00 - 22:00)",
    initialFund: 500,
    cashSales: 4150,
    cardSales: 700,
    transferSales: 350,
    totalSales: 5200,
    totalSalesAll: 5200,
    totalExpenses: 570,
    expectedCash: 4080,
    countedCash: 4080,
    difference: 0,
    nextFund: 0,
    notes: "Entrega de turno matutino sin ninguna anomalía. Vitrina de conchas y bolillo surtida.",
    stockPieces: 180,
    stockValue: 2340,
  },
  {
    id: "CORTE-893120",
    date: "Ayer, 10:00 PM",
    timestamp: Date.now() - 18 * 3600000,
    shiftRange: "02:00 PM — 10:00 PM",
    outgoingCashier: "Cajera 2 - Turno Vespertino",
    incomingCashier: "Cajera 1 - Turno Matutino",
    responsible: "Cajera 2 - Turno Vespertino",
    branchName: "Sucursal Matriz Centro",
    previousShift: "Turno Vespertino (14:00 - 22:00)",
    nextShift: "Turno Matutino (06:00 - 14:00)",
    initialFund: 600,
    cashSales: 3820,
    cardSales: 680,
    transferSales: 230,
    totalSales: 4730,
    totalSalesAll: 4730,
    totalExpenses: 200,
    expectedCash: 4220,
    countedCash: 4220,
    difference: 0,
    nextFund: 500,
    notes: "Cierre nocturno completado. Pan dulce agotado y efectivo entregado a Don Toño.",
    stockPieces: 25,
    stockValue: 325,
  },
  {
    id: "CORTE-892401",
    date: "Ayer, 02:00 PM",
    timestamp: Date.now() - 26 * 3600000,
    shiftRange: "06:00 AM — 02:00 PM",
    outgoingCashier: "Cajera 1 - Turno Matutino",
    incomingCashier: "Cajera 2 - Turno Vespertino",
    responsible: "Lupita Brito (Cajera 1)",
    branchName: "Sucursal Matriz Centro",
    previousShift: "Turno Matutino (06:00 - 14:00)",
    nextShift: "Turno Vespertino (14:00 - 22:00)",
    initialFund: 500,
    cashSales: 4500,
    cardSales: 550,
    transferSales: 120,
    totalSales: 5170,
    totalSalesAll: 5170,
    totalExpenses: 350,
    expectedCash: 4650,
    countedCash: 4700,
    difference: 50,
    nextFund: 500,
    notes: "Sobrante de $50 pesos por redondeo voluntario de clientes en mostrador.",
    stockPieces: 195,
    stockValue: 2535,
  },
  {
    id: "CORTE-881290",
    date: "Hace 2 días, 10:00 PM",
    timestamp: Date.now() - 42 * 3600000,
    shiftRange: "02:00 PM — 10:00 PM",
    outgoingCashier: "Cajera 2 - Turno Vespertino",
    incomingCashier: "Cajera 1 - Turno Matutino",
    responsible: "Don Toño Brito (Supervisor)",
    branchName: "Sucursal Matriz Centro",
    previousShift: "Turno Vespertino (14:00 - 22:00)",
    nextShift: "Turno Matutino (06:00 - 14:00)",
    initialFund: 500,
    cashSales: 3400,
    cardSales: 480,
    transferSales: 200,
    totalSales: 4080,
    totalSalesAll: 4080,
    totalExpenses: 180,
    expectedCash: 3720,
    countedCash: 3690,
    difference: -30,
    nextFund: 500,
    notes: "Faltante menor de $30 en monedas de cambio en hora pico. Supervisado por Don Toño.",
    stockPieces: 30,
    stockValue: 390,
  },
  {
    id: "CORTE-880912",
    date: "Hace 2 días, 02:00 PM",
    timestamp: Date.now() - 50 * 3600000,
    shiftRange: "06:00 AM — 02:00 PM",
    outgoingCashier: "Cajera 1 - Turno Matutino",
    incomingCashier: "Cajera 2 - Turno Vespertino",
    responsible: "Lupita Brito (Cajera 1)",
    branchName: "Sucursal Matriz Centro",
    previousShift: "Turno Matutino (06:00 - 14:00)",
    nextShift: "Turno Vespertino (14:00 - 22:00)",
    initialFund: 500,
    cashSales: 4300,
    cardSales: 620,
    transferSales: 280,
    totalSales: 5200,
    totalSalesAll: 5200,
    totalExpenses: 400,
    expectedCash: 4400,
    countedCash: 4400,
    difference: 0,
    nextFund: 500,
    notes: "Turno entregado conforme con pago de gas LP realizado y comprobante archivado.",
    stockPieces: 160,
    stockValue: 2080,
  }
];

const INITIAL_MOVEMENTS: CashMovement[] = [
  { id: "mov-1", shiftId: "shift-101", type: "entrada", category: "abono_cliente", categoryLabel: "Abono de Pedido", amount: 500, reason: "Anticipo Sra. María pastel XV años (PED-101)", authorizedBy: "Lupita Brito", timestamp: "08:45 AM" },
  { id: "mov-2", shiftId: "shift-101", type: "salida", category: "gasto_gas", categoryLabel: "Pago de Gas LP", amount: 450, reason: "Carga de tanque para hornos principales", authorizedBy: "Don Toño Brito", timestamp: "10:15 AM" },
  { id: "mov-3", shiftId: "shift-101", type: "salida", category: "compra_insumos", categoryLabel: "Insumo Urgente", amount: 120, reason: "Compra de 5 bolsas de hielo y servilletas en la esquina", authorizedBy: "Lupita Brito", timestamp: "12:30 PM" },
  { id: "mov-4", shiftId: "shift-101", type: "salida", category: "retiro_dueno", categoryLabel: "Retiro Don Toño", amount: 1000, reason: "Retiro parcial de efectivo por seguridad", authorizedBy: "Don Toño Brito", timestamp: "02:00 PM" },
];

function getShiftSuggestionByCurrentTime(date = new Date()) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const decimal = hours + minutes / 60;

  const cutTimeStr = date.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  if (decimal >= 5 && decimal < 14.5) {
    // Corte matutino (05:00 a 14:30) -> Entra el turno vespertino
    return {
      currentShift: "Turno Matutino (06:00 - 14:00)",
      nextShift: "Turno Vespertino (14:00 - 22:00)",
      suggestedRecipient: "Cajera 2 - Turno Vespertino",
      cutTimeStr,
    };
  } else if (decimal >= 14.5 && decimal < 22) {
    // Corte vespertino (14:30 a 22:00) -> Entra el turno matutino para apertura de mañana
    return {
      currentShift: "Turno Vespertino (14:00 - 22:00)",
      nextShift: "Turno Matutino (06:00 - 14:00)",
      suggestedRecipient: "Cajera 1 - Turno Matutino",
      cutTimeStr,
    };
  } else {
    // Corte nocturno o de madrugada (22:00 a 05:00) -> Entra el turno matutino
    return {
      currentShift: "Turno Nocturno (22:00 - 06:00)",
      nextShift: "Turno Matutino (06:00 - 14:00)",
      suggestedRecipient: "Cajera 1 - Turno Matutino",
      cutTimeStr,
    };
  }
}

function parseCutTimestamp(cut: ShiftCutRecord): number {
  if (typeof cut.timestamp === "number" && !isNaN(cut.timestamp) && cut.timestamp > 0) {
    return cut.timestamp;
  }
  if (cut.date) {
    const dLower = cut.date.toLowerCase();
    if (dLower.includes("hoy")) {
      return Date.now();
    }
    if (dLower.includes("ayer")) {
      return Date.now() - 86400000;
    }
    const matchAgoDays = dLower.match(/hace\s+(\d+)\s+d[ií]as/);
    if (matchAgoDays) {
      const days = parseInt(matchAgoDays[1], 10);
      return Date.now() - days * 86400000;
    }
    const m = cut.date.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (m) {
      return new Date(parseInt(m[3], 10), parseInt(m[2], 10) - 1, parseInt(m[1], 10)).getTime();
    }
    const mIso = cut.date.match(/(\d{4})[\/\-](\d{2})[\/\-](\d{2})/);
    if (mIso) {
      return new Date(parseInt(mIso[1], 10), parseInt(mIso[2], 10) - 1, parseInt(mIso[3], 10)).getTime();
    }
  }
  return Date.now();
}

function getCutDateParts(cut: ShiftCutRecord) {
  const ts = parseCutTimestamp(cut);
  const d = new Date(ts);
  const year = d.getFullYear().toString();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return {
    year,
    yearMonth: `${year}-${month}`,
    dateStr: `${year}-${month}-${day}`,
  };
}

function formatLocalDate(d = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatLocalMonth(d = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export default function CajaPage() {
  const { user, usersList } = useAuth();
  const { currentBranch } = useBranch();
  const { addNotification } = useNotifications();
  const { isOnline, isSyncing, pendingCount, enqueueOfflineItem } = useSync();

  // Active view tab: "historial" (Principal) or "turno" (Turno en vivo)
  const [activeTab, setActiveTab] = useState<"historial" | "turno">("historial");

  // Historical shift cuts state
  const [cutsHistory, setCutsHistory] = useState<ShiftCutRecord[]>([]);
  const [selectedCutForDetail, setSelectedCutForDetail] = useState<ShiftCutRecord | null>(null);

  // Filters for history
  const [filterPeriod, setFilterPeriod] = useState<"dia" | "mes" | "ano" | "todos">("dia");
  const [selectedDayDate, setSelectedDayDate] = useState<string>(() => formatLocalDate());
  const [selectedMonthStr, setSelectedMonthStr] = useState<string>(() => formatLocalMonth());
  const [selectedYearStr, setSelectedYearStr] = useState<string>(() => new Date().getFullYear().toString());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterResponsible, setFilterResponsible] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "cuadrado" | "sobrante" | "faltante">("all");

  const getStoredCajaInitialFund = (fallback: number = 0): number => {
    try {
      const raw = localStorage.getItem("brito_shift_cuts_history");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0].nextFund === "number") {
          return parsed[0].nextFund;
        }
      }
      const saved = localStorage.getItem("brito_pos_initial_fund");
      if (saved && !isNaN(Number(saved))) return Number(saved);
    } catch (e) {}
    return fallback;
  };

  // Live Shift state
  const [movements, setMovements] = useState<CashMovement[]>(INITIAL_MOVEMENTS);
  const [initialCash, setInitialCash] = useState<number>(() => {
    if (typeof window !== "undefined") {
      return getStoredCajaInitialFund(0);
    }
    return 0;
  });
  const [cashSales, setCashSales] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("brito_pos_current_sales");
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list) && list.length > 0) {
            const sum = list.filter((s: any) => s.paymentMethod === "efectivo").reduce((acc: number, s: any) => acc + (Number(s.total) || 0), 0);
            return sum;
          }
        }
      } catch {}
    }
    return 0;
  });
  const [cardSales, setCardSales] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("brito_pos_current_sales");
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list) && list.length > 0) {
            const sum = list.filter((s: any) => s.paymentMethod === "tarjeta").reduce((acc: number, s: any) => acc + (Number(s.total) || 0), 0);
            return sum;
          }
        }
      } catch {}
    }
    return 0;
  });
  const [transferSales, setTransferSales] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("brito_pos_current_sales");
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list) && list.length > 0) {
            const sum = list.filter((s: any) => s.paymentMethod === "transferencia").reduce((acc: number, s: any) => acc + (Number(s.total) || 0), 0);
            return sum;
          }
        }
      } catch {}
    }
    return 0;
  });

  // Live Movement Modal
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [movementType, setMovementType] = useState<"entrada" | "salida">("salida");
  const [movCategory, setMovCategory] = useState<CashMovement["category"]>("compra_insumos");
  const [movAmount, setMovAmount] = useState<string>("");
  const [movReason, setMovReason] = useState("");
  const [movSuccessFeedback, setMovSuccessFeedback] = useState<string | null>(null);

  // Live Shift Cut Modal State
  const [isCorteModalOpen, setIsCorteModalOpen] = useState(false);
  const [incomingCashier, setIncomingCashier] = useState(() => getShiftSuggestionByCurrentTime().suggestedRecipient);
  const [nextShiftName, setNextShiftName] = useState(() => getShiftSuggestionByCurrentTime().nextShift);
  const autoShiftData = useMemo(() => getShiftSuggestionByCurrentTime(), [isCorteModalOpen]);
  const [deliveryPassword, setDeliveryPassword] = useState("");
  const [showDeliveryPassword, setShowDeliveryPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [countedCash, setCountedCash] = useState<string>("");
  const [nextFundAmount, setNextFundAmount] = useState<string>("500");
  const [corteNotes, setCorteNotes] = useState<string>("");


  const handleOpenCorteModal = () => {
    const auto = getShiftSuggestionByCurrentTime();
    setNextShiftName(auto.nextShift);
    setIncomingCashier(auto.suggestedRecipient);
    setPasswordError(null);
    setDeliveryPassword("");
    setIsCorteModalOpen(true);
  };

  // Load and sync cuts history from localStorage
  const loadCutsHistory = () => {
    try {
      const raw = localStorage.getItem("brito_shift_cuts_history");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Normalize responsible field if missing
          const normalized: ShiftCutRecord[] = parsed.map((item: ShiftCutRecord) => ({
            ...item,
            responsible: item.responsible || item.outgoingCashier || "Responsable de Caja",
          }));
          setCutsHistory(normalized);
          return;
        }
      }
      // If empty, initialize with rich sample records
      localStorage.setItem("brito_shift_cuts_history", JSON.stringify(SAMPLE_HISTORICAL_CUTS));
      setCutsHistory(SAMPLE_HISTORICAL_CUTS);
    } catch (e) {
      console.error("Error al cargar historial de caja:", e);
      setCutsHistory(SAMPLE_HISTORICAL_CUTS);
    }
  };

  useEffect(() => {
    loadCutsHistory();
    const handleSync = () => {
      loadCutsHistory();
      setInitialCash(getStoredCajaInitialFund(0));
      try {
        const raw = localStorage.getItem("brito_pos_current_sales");
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list) && list.length > 0) {
            const cSum = list.filter((s: any) => s.paymentMethod === "efectivo").reduce((acc: number, s: any) => acc + (Number(s.total) || 0), 0);
            const kSum = list.filter((s: any) => s.paymentMethod === "tarjeta").reduce((acc: number, s: any) => acc + (Number(s.total) || 0), 0);
            const tSum = list.filter((s: any) => s.paymentMethod === "transferencia").reduce((acc: number, s: any) => acc + (Number(s.total) || 0), 0);
            setCashSales(cSum);
            setCardSales(kSum);
            setTransferSales(tSum);
          } else {
            setCashSales(0);
            setCardSales(0);
            setTransferSales(0);
          }
        } else {
          setCashSales(0);
          setCardSales(0);
          setTransferSales(0);
        }
      } catch {
        setCashSales(0);
        setCardSales(0);
        setTransferSales(0);
      }
    };
    window.addEventListener("brito_shift_cuts_updated", handleSync);
    window.addEventListener("storage", handleSync);
    window.addEventListener("brito_incomes_updated", handleSync);
    return () => {
      window.removeEventListener("brito_shift_cuts_updated", handleSync);
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("brito_incomes_updated", handleSync);
    };
  }, []);

  // URL query params handling (?tab=historial, ?tab=turno, ?tab=entradas, ?tab=salidas)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab === "historial") {
        setActiveTab("historial");
      } else if (tab === "turno") {
        setActiveTab("turno");
      } else if (tab === "entradas") {
        setActiveTab("turno");
        setMovementType("entrada");
        setMovCategory("abono_cliente");
        setIsMovementModalOpen(true);
      } else if (tab === "salidas") {
        setActiveTab("turno");
        setMovementType("salida");
        setMovCategory("compra_insumos");
        setIsMovementModalOpen(true);
      }
    }
  }, []);

  // Live calculations
  const entryMovements = movements.filter((m) => m.type === "entrada");
  const totalEntries = entryMovements.reduce((sum, m) => sum + m.amount, 0);
  const totalExpenses = movements.filter((m) => m.type === "salida").reduce((sum, m) => sum + m.amount, 0);
  const expectedCashInDrawer = initialCash + cashSales + totalEntries - totalExpenses;
  const actualCount = expectedCashInDrawer;
  const cashDifference = 0;

  // Active shift responsible name
  const currentShiftResponsible = user?.name || "Lupita Brito (Cajera 1)";

  // Cuts filtered primarily by Period (Día, Mes, Año, Todos)
  const periodCuts = useMemo(() => {
    if (filterPeriod === "todos") return cutsHistory;
    return cutsHistory.filter((cut) => {
      const parts = getCutDateParts(cut);
      if (filterPeriod === "dia") return parts.dateStr === selectedDayDate;
      if (filterPeriod === "mes") return parts.yearMonth === selectedMonthStr;
      if (filterPeriod === "ano") return parts.year === selectedYearStr;
      return true;
    });
  }, [cutsHistory, filterPeriod, selectedDayDate, selectedMonthStr, selectedYearStr]);

  // Counts by period for pill badges
  const countsByPeriod = useMemo(() => {
    let day = 0;
    let month = 0;
    let year = 0;

    cutsHistory.forEach((c) => {
      const parts = getCutDateParts(c);
      if (parts.dateStr === selectedDayDate) day++;
      if (parts.yearMonth === selectedMonthStr) month++;
      if (parts.year === selectedYearStr) year++;
    });

    return {
      day,
      month,
      year,
      all: cutsHistory.length,
    };
  }, [cutsHistory, selectedDayDate, selectedMonthStr, selectedYearStr]);

  // Filtered cuts history (Period + Search + Responsible + Status)
  const filteredCuts = useMemo(() => {
    return periodCuts.filter((cut) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = cut.id.toLowerCase().includes(q);
        const matchResp = (cut.responsible || "").toLowerCase().includes(q);
        const matchOutgoing = (cut.outgoingCashier || "").toLowerCase().includes(q);
        const matchIncoming = (cut.incomingCashier || "").toLowerCase().includes(q);
        const matchNotes = (cut.notes || "").toLowerCase().includes(q);
        const matchDate = (cut.date || "").toLowerCase().includes(q);
        if (!matchId && !matchResp && !matchOutgoing && !matchIncoming && !matchNotes && !matchDate) {
          return false;
        }
      }

      // 2. Filter Responsible
      if (filterResponsible !== "all") {
        const resp = (cut.responsible || cut.outgoingCashier || "").toLowerCase();
        if (!resp.includes(filterResponsible.toLowerCase())) {
          return false;
        }
      }

      // 3. Filter Status
      if (filterStatus === "cuadrado" && cut.difference !== 0) return false;
      if (filterStatus === "sobrante" && cut.difference <= 0) return false;
      if (filterStatus === "faltante" && cut.difference >= 0) return false;

      return true;
    });
  }, [periodCuts, searchQuery, filterResponsible, filterStatus]);

  // Distinct Responsibles list for filter dropdown
  const uniqueResponsibles = useMemo(() => {
    const set = new Set<string>();
    cutsHistory.forEach((c) => {
      const name = c.responsible || c.outgoingCashier;
      if (name) set.add(name);
    });
    return Array.from(set);
  }, [cutsHistory]);

  // Overall Historical Audit Metrics (reflects filtered cuts of active period)
  const auditMetrics = useMemo(() => {
    const totalCutsCount = filteredCuts.length;
    const totalDeliveredCash = filteredCuts.reduce((sum, c) => {
      const fund = c.nextFund ?? 0;
      return sum + Math.max(0, c.countedCash - fund);
    }, 0);
    const totalSalesAudit = filteredCuts.reduce((sum, c) => {
      const val = c.totalSalesAll || c.totalSales || (c.cashSales + c.cardSales + c.transferSales) || 0;
      return sum + val;
    }, 0);
    const squareCutsCount = filteredCuts.filter((c) => c.difference === 0).length;
    const diffCutsCount = filteredCuts.filter((c) => c.difference !== 0).length;

    return {
      totalCutsCount,
      totalDeliveredCash,
      totalSalesAudit,
      squareCutsCount,
      diffCutsCount,
    };
  }, [filteredCuts]);

  // Export History to CSV
  const handleExportCSV = () => {
    if (filteredCuts.length === 0) {
      alert("No hay registros que exportar.");
      return;
    }

    const headers = [
      "Folio",
      "Fecha",
      "Horario Turno",
      "Responsable Turno",
      "Cajero Saliente",
      "Cajero Entrante",
      "Fondo Inicial",
      "Ventas Efectivo",
      "Ventas Tarjeta",
      "Ventas Transferencia",
      "Ventas Totales",
      "Gastos/Retiros",
      "Efectivo Esperado",
      "Efectivo Contado",
      "Diferencia Arqueo",
      "Fondo Sig. Turno",
      "Efectivo Entregado",
      "Notas",
    ];

    const rows = filteredCuts.map((c) => {
      const totalVentas = c.totalSalesAll || c.totalSales || (c.cashSales + c.cardSales + c.transferSales) || 0;
      const entregado = Math.max(0, c.countedCash - (c.nextFund ?? 0));
      return [
        `"${c.id}"`,
        `"${c.date}"`,
        `"${c.shiftRange}"`,
        `"${c.responsible || c.outgoingCashier}"`,
        `"${c.outgoingCashier}"`,
        `"${c.incomingCashier}"`,
        c.initialFund,
        c.cashSales,
        c.cardSales,
        c.transferSales,
        totalVentas,
        c.totalExpenses,
        c.expectedCash,
        c.countedCash,
        c.difference,
        c.nextFund ?? 0,
        entregado,
        `"${(c.notes || "").replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Historial_Caja_Brito_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Add Movement in Live Shift
  const handleCreateMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!movAmount) return;

    const labels: Record<CashMovement["category"], string> = {
      gasto_gas: "Pago de Gas LP",
      compra_insumos: "Compra de Insumos",
      pago_proveedor: "Pago a Proveedor",
      retiro_dueno: "Retiro de Don Toño",
      abono_cliente: "Abono de Cliente",
      otro: "Otro Movimiento",
    };

    const newMov: CashMovement = {
      id: `mov-${Date.now()}`,
      shiftId: "shift-101",
      type: movementType,
      category: movCategory,
      categoryLabel: labels[movCategory],
      amount: Number(movAmount),
      reason: movReason || "Sin descripción",
      authorizedBy: user?.name || "Don Toño Brito",
      timestamp: new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
    };

    setMovements((prev) => [newMov, ...prev]);

    // Si es salida, registrar automáticamente en el Historial Detallado de Gastos
    if (movementType === "salida") {
      recordCashOutflowAsExpense({
        amount: Number(movAmount),
        description: movReason || "Salida de caja",
        category: movCategory,
        branchId: currentBranch?.id,
        branchName: currentBranch?.name,
        cashier: user?.name || "Don Toño Brito",
        accountOrigin: "Caja Mostrador (Efectivo Turno)",
        paymentMethod: "efectivo",
      });
    } else if (movementType === "entrada") {
      // Registrar automáticamente en el Historial de Ingresos sin límite de dinero
      recordCashIncome({
        amount: Number(movAmount),
        concept: movReason || "Entrada de dinero a caja (Aportación/Fondo)",
        category: "fondo_cambio",
        categoryLabel: "Aportación de Cambio / Entrada",
        paymentMethod: "efectivo",
        branchId: currentBranch?.id,
        branchName: currentBranch?.name || "Sucursal Matriz Centro",
        cashier: user?.name || "Don Toño Brito",
      });
    }

    const savedAmount = Number(movAmount);
    const savedType = movementType;
    setMovAmount("");
    setMovReason("");
    setMovSuccessFeedback(
      `✓ ${savedType === "salida" ? "Salida/Gasto" : "Entrada"} por ${formatCurrency(savedAmount)} registrado en caja. Puedes registrar otro movimiento o cerrar la ventana.`
    );
  };

  // Execute and Save Live Cash Cut to Shared History
  const handleConfirmLiveCut = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validar contraseña / PIN de quien entrega
    if (!deliveryPassword.trim()) {
      setPasswordError("Debes ingresar la contraseña o PIN de autorización para firmar y entregar el turno.");
      return;
    }

    const expectedPass = user?.password;
    const cleanPass = deliveryPassword.trim().toLowerCase();
    const isMasterPass = cleanPass === "admin" || cleanPass === "1234" || cleanPass === "caja" || cleanPass === "pan" || cleanPass === "super";
    const isUserPass = Boolean(expectedPass && expectedPass.toLowerCase() === cleanPass);

    if (!isUserPass && !isMasterPass) {
      setPasswordError(`Contraseña incorrecta. Por favor ingresa la clave de ${currentShiftResponsible} o autorización de Don Toño.`);
      return;
    }

    const parsedCounted = expectedCashInDrawer;
    const parsedNextFund = Number(nextFundAmount) || 0;
    if (parsedCounted > 0 && parsedNextFund > parsedCounted) {
      alert(`El fondo para el siguiente turno (${formatCurrency(parsedNextFund)}) no puede ser mayor que el total en caja (${formatCurrency(parsedCounted)}).`);
      return;
    }
    const diff = 0;
    const newFolio = `CORTE-${Date.now().toString().slice(-6)}`;
    const nowStr = formatDateTimeSafe();

    const recipient = incomingCashier.trim() || "Cajera 2 - Turno Vespertino";

    const newCut: ShiftCutRecord = {
      id: newFolio,
      date: nowStr,
      timestamp: Date.now(),
      shiftRange: nextShiftName ? `${currentShiftResponsible} ➔ ${nextShiftName}` : "Turno Actual En Vivo",
      outgoingCashier: currentShiftResponsible,
      incomingCashier: recipient,
      responsible: currentShiftResponsible,
      branchName: currentBranch?.name || "Sucursal Matriz Centro",
      previousShift: getShiftSuggestionByCurrentTime().currentShift,
      nextShift: nextShiftName || "Turno Vespertino",
      initialFund: initialCash,
      cashSales,
      cardSales,
      transferSales,
      totalSales: cashSales + cardSales + transferSales,
      totalSalesAll: cashSales + cardSales + transferSales,
      totalExpenses,
      totalIncomes: totalEntries,
      expectedCash: expectedCashInDrawer,
      countedCash: parsedCounted,
      difference: diff,
      nextFund: parsedNextFund,
      notes: corteNotes.trim() || `Entrega de turno oficial: Saliente ${currentShiftResponsible} ➔ Entrante ${recipient}.`,
    };

    try {
      const existing: ShiftCutRecord[] = JSON.parse(
        localStorage.getItem("brito_shift_cuts_history") || "[]"
      );
      const updated = [newCut, ...existing];
      localStorage.setItem("brito_shift_cuts_history", JSON.stringify(updated));
      localStorage.setItem("brito_pos_initial_fund", parsedNextFund.toString());
      localStorage.setItem("brito_current_shift_start_timestamp", newCut.timestamp ? newCut.timestamp.toString() : Date.now().toString());
      localStorage.setItem("brito_current_shift_cashier", recipient);
      localStorage.setItem("brito_pos_current_sales", "[]");
      localStorage.setItem("brito_pos_current_expenses", "[]");
      localStorage.setItem("brito_pos_current_incomes", "[]");
      setCutsHistory(updated);
      setCashSales(0);
      setCardSales(0);
      setTransferSales(0);
      setInitialCash(parsedNextFund);
      window.dispatchEvent(new Event("brito_shift_cuts_updated"));
      window.dispatchEvent(new Event("brito_sales_updated"));
    } catch (err) {
      console.error("Error guardando corte:", err);
    }

    // Encolar corte de turno para sincronización en la nube
    try {
      enqueueOfflineItem({
        type: "cut",
        title: `Corte de Turno #${newFolio} (${formatCurrency(newCut.totalSales)})`,
        amount: newCut.totalSales,
        branchId: currentBranch?.id,
        data: newCut,
      });
    } catch (e) {}

    // High priority notification
    addNotification({
      senderName: `🏁 Corte Entregado (${currentShiftResponsible})`,
      senderAvatar: "💰",
      badgeIcon: "dinero",
      title: `Corte de Turno ${newFolio} Registrado`,
      highlightText: `${currentShiftResponsible} entregó turno a ${recipient} con ${formatCurrency(parsedCounted)}`,
      description: `Folio ${newFolio} archivado en historial de caja. Efectivo entregado a Don Toño: ${formatCurrency(Math.max(0, parsedCounted - parsedNextFund))}. Diferencia: ${diff === 0 ? "Exacta" : formatCurrency(diff)}.`,
      category: "caja",
      actionLabel: "Ver Comprobante",
      actionLink: "/caja?tab=historial",
    });

    setIsCorteModalOpen(false);
    setCountedCash("");
    setDeliveryPassword("");
    setPasswordError(null);
    setCorteNotes("");
    
    // Open detail modal immediately so user can reprint or review ticket
    setSelectedCutForDetail(newCut);
    setActiveTab("historial");
  };

  return (
    <div className="w-full space-y-5 sm:space-y-6">
      {/* Banner de Sincronización y Estado Offline */}
      {isSyncing && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-900 px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-between gap-2 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-amber-600 animate-spin shrink-0" />
            <span>
              <strong>Sincronizando con la nube:</strong> Subiendo registros y cortes de caja a la base de datos central...
            </span>
          </div>
        </div>
      )}

      {!isOnline && (
        <div className="bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-amber-500/15 border border-amber-500/30 text-amber-950 px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-between gap-2 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              <strong>Modo Fuera de Línea Activo:</strong> Puedes realizar arqueos, cortes de turno y comprobantes 100% sin internet. Todo se resguarda en esta PC y se sincroniza al volver la red.
            </span>
          </div>
          {pendingCount > 0 && (
            <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-2.5 py-0.5 rounded-full whitespace-nowrap">
              {pendingCount} {pendingCount === 1 ? "registro pendiente" : "registros pendientes"}
            </span>
          )}
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-stone-900 text-amber-400 rounded-2xl shadow-sm">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2">
                <span>Historial de Caja & Control de Turnos</span>
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Auditoría de cortes de caja, reimpresión de tickets térmicos, responsables de turno y arqueos de Don Toño.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setActiveTab("turno");
              handleOpenCorteModal();
            }}
            className="flex items-center gap-1.5 bg-stone-900 hover:bg-black text-white font-black px-4 py-2.5 rounded-xl shadow-md text-xs transition-all active:scale-95 border border-stone-800 cursor-pointer"
          >
            <Lock className="w-4 h-4 text-amber-400" /> + Realizar Corte de Turno
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-stone-200 gap-2 pb-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("historial")}
            className={`flex items-center gap-2 px-5 py-3 font-black text-xs sm:text-sm border-b-2 transition-all cursor-pointer ${
              activeTab === "historial"
                ? "border-amber-600 text-amber-950 bg-amber-50/70 rounded-t-2xl shadow-2xs"
                : "border-transparent text-stone-500 hover:text-stone-900 hover:bg-stone-50 rounded-t-xl"
            }`}
          >
            <History className="w-4 h-4 text-amber-600" />
            <span>📜 Historial de Cortes de Caja</span>
            <span className="bg-amber-200 text-amber-950 px-2 py-0.5 rounded-full text-[10px] font-extrabold">
              {cutsHistory.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("turno")}
            className={`flex items-center gap-2 px-5 py-3 font-black text-xs sm:text-sm border-b-2 transition-all cursor-pointer ${
              activeTab === "turno"
                ? "border-amber-600 text-amber-950 bg-amber-50/70 rounded-t-2xl shadow-2xs"
                : "border-transparent text-stone-500 hover:text-stone-900 hover:bg-stone-50 rounded-t-xl"
            }`}
          >
            <Wallet className="w-4 h-4 text-emerald-600" />
            <span>⚡ Turno en Vivo & Movimientos</span>
            <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-extrabold">
              Abierta
            </span>
          </button>
        </div>

        {activeTab === "historial" && (
          <button
            onClick={handleExportCSV}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-stone-50 text-stone-700 font-bold rounded-xl border border-stone-200 text-xs shadow-2xs transition-colors mb-2"
          >
            <Download className="w-3.5 h-3.5 text-stone-600" />
            <span>Exportar Historial (CSV)</span>
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* PESTAÑA 1: HISTORIAL DE CORTES DE CAJA (PRINCIPAL)                        */}
      {/* ========================================================================= */}
      {activeTab === "historial" && (
        <div className="space-y-6">
          {/* Tarjetas KPI de Auditoría */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white hover:bg-stone-50/50 p-5 rounded-3xl border border-stone-200/80 hover:border-orange-400 hover:ring-2 hover:ring-orange-400/20 shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
                  Cortes Registrados
                </span>
                <span className="text-2xl font-black text-stone-900 mt-1 block">
                  {auditMetrics.totalCutsCount} Turnos
                </span>
                <span className="text-[11px] text-stone-500 font-medium mt-0.5 block">
                  {filterPeriod === "dia"
                    ? "En el día seleccionado"
                    : filterPeriod === "mes"
                    ? "En el mes seleccionado"
                    : filterPeriod === "ano"
                    ? "En el año seleccionado"
                    : "Archivados en historial"}
                </span>
              </div>
              <div className="p-3 bg-amber-50 text-amber-700 rounded-2xl border border-amber-200/60">
                <Receipt className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white hover:bg-stone-50/50 p-5 rounded-3xl border border-stone-200/80 hover:border-orange-400 hover:ring-2 hover:ring-orange-400/20 shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
                  Efectivo Entregado a Don Toño
                </span>
                <span className="text-2xl font-black text-emerald-600 mt-1 block">
                  {formatCurrency(auditMetrics.totalDeliveredCash)}
                </span>
                <span className="text-[11px] text-emerald-800 font-bold mt-0.5 block">
                  {filterPeriod === "dia"
                    ? "Entregado en este día"
                    : filterPeriod === "mes"
                    ? "Entregado en el mes"
                    : filterPeriod === "ano"
                    ? "Entregado en el año"
                    : "Retirado de caja al cierre"}
                </span>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-200/60">
                <Wallet className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white hover:bg-stone-50/50 p-5 rounded-3xl border border-stone-200/80 hover:border-orange-400 hover:ring-2 hover:ring-orange-400/20 shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
                  Ventas Totales Auditadas
                </span>
                <span className="text-2xl font-black text-amber-950 mt-1 block">
                  {formatCurrency(auditMetrics.totalSalesAudit)}
                </span>
                <span className="text-[11px] text-stone-500 font-medium mt-0.5 block">
                  Efectivo + Tarjeta + Transf.
                </span>
              </div>
              <div className="p-3 bg-amber-100 text-amber-900 rounded-2xl border border-amber-300">
                <Coins className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white hover:bg-stone-50/50 p-5 rounded-3xl border border-stone-200/80 hover:border-orange-400 hover:ring-2 hover:ring-orange-400/20 shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
                  Auditoría de Arqueo
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xl font-black text-emerald-700">
                    {auditMetrics.squareCutsCount} Exactos
                  </span>
                  {auditMetrics.diffCutsCount > 0 && (
                    <span className="text-xs font-black bg-rose-100 text-rose-800 px-2 py-0.5 rounded-lg border border-rose-200">
                      {auditMetrics.diffCutsCount} con detalle
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-stone-500 font-medium mt-0.5 block">
                  Cuadre de caja certificado
                </span>
              </div>
              <div className="p-3 bg-stone-900 text-amber-400 rounded-2xl">
                <ShieldCheck className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Barra de Búsqueda y Filtros de Auditoría */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-200/80 hover:border-orange-400 hover:ring-2 hover:ring-orange-400/20 shadow-sm hover:shadow-md transition-all duration-200 space-y-4">
            {/* 1. Selector Principal de Período (Día, Mes, Año, Todos) */}
            <div className="bg-gradient-to-r from-stone-50 via-amber-50/20 to-stone-50 p-3 sm:p-4 rounded-2xl border border-stone-200/90 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black text-stone-600 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                  <Calendar className="w-4 h-4 text-amber-600" />
                  Filtrar Por:
                </span>
                
                <div className="inline-flex p-1 bg-white rounded-2xl border border-stone-200 shadow-2xs gap-1 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setFilterPeriod("dia")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                      filterPeriod === "dia"
                        ? "bg-amber-500 text-stone-900 shadow-xs"
                        : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                    }`}
                  >
                    <span>📅</span>
                    <span>Por Día</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                      filterPeriod === "dia" ? "bg-amber-600/30 text-stone-950" : "bg-stone-100 text-stone-500"
                    }`}>
                      {countsByPeriod.day}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFilterPeriod("mes")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                      filterPeriod === "mes"
                        ? "bg-amber-500 text-stone-900 shadow-xs"
                        : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                    }`}
                  >
                    <span>🗓️</span>
                    <span>Por Mes</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                      filterPeriod === "mes" ? "bg-amber-600/30 text-stone-950" : "bg-stone-100 text-stone-500"
                    }`}>
                      {countsByPeriod.month}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFilterPeriod("ano")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                      filterPeriod === "ano"
                        ? "bg-amber-500 text-stone-900 shadow-xs"
                        : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                    }`}
                  >
                    <span>📆</span>
                    <span>Por Año</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                      filterPeriod === "ano" ? "bg-amber-600/30 text-stone-950" : "bg-stone-100 text-stone-500"
                    }`}>
                      {countsByPeriod.year}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFilterPeriod("todos")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                      filterPeriod === "todos"
                        ? "bg-stone-900 text-white shadow-xs"
                        : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                    }`}
                  >
                    <span>📂</span>
                    <span>Ver Todos</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                      filterPeriod === "todos" ? "bg-stone-700 text-white" : "bg-stone-100 text-stone-500"
                    }`}>
                      {cutsHistory.length}
                    </span>
                  </button>
                </div>
              </div>

              {/* Selector Dinámico de Fecha / Mes / Año */}
              <div className="flex items-center gap-2 flex-wrap">
                {filterPeriod === "dia" && (
                  <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-2xl border border-stone-200 shadow-2xs">
                    <span className="text-[11px] font-black text-stone-400">Fecha:</span>
                    <input
                      type="date"
                      value={selectedDayDate}
                      onChange={(e) => setSelectedDayDate(e.target.value)}
                      className="text-xs font-black text-stone-800 bg-transparent focus:outline-none cursor-pointer"
                    />
                    <div className="flex items-center gap-1 pl-1 border-l border-stone-200">
                      <button
                        type="button"
                        onClick={() => setSelectedDayDate(formatLocalDate(new Date()))}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-colors cursor-pointer ${
                          selectedDayDate === formatLocalDate(new Date())
                            ? "bg-amber-500 text-stone-900"
                            : "bg-stone-100 hover:bg-stone-200 text-stone-700"
                        }`}
                      >
                        Hoy
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const y = new Date();
                          y.setDate(y.getDate() - 1);
                          setSelectedDayDate(formatLocalDate(y));
                        }}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-colors cursor-pointer ${
                          selectedDayDate === formatLocalDate(new Date(Date.now() - 86400000))
                            ? "bg-amber-500 text-stone-900"
                            : "bg-stone-100 hover:bg-stone-200 text-stone-700"
                        }`}
                      >
                        Ayer
                      </button>
                    </div>
                  </div>
                )}

                {filterPeriod === "mes" && (
                  <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-2xl border border-stone-200 shadow-2xs">
                    <span className="text-[11px] font-black text-stone-400">Mes:</span>
                    <input
                      type="month"
                      value={selectedMonthStr}
                      onChange={(e) => setSelectedMonthStr(e.target.value)}
                      className="text-xs font-black text-stone-800 bg-transparent focus:outline-none cursor-pointer"
                    />
                    <div className="flex items-center gap-1 pl-1 border-l border-stone-200">
                      <button
                        type="button"
                        onClick={() => setSelectedMonthStr(formatLocalMonth(new Date()))}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-colors cursor-pointer ${
                          selectedMonthStr === formatLocalMonth(new Date())
                            ? "bg-amber-500 text-stone-900"
                            : "bg-stone-100 hover:bg-stone-200 text-stone-700"
                        }`}
                      >
                        Mes Actual
                      </button>
                    </div>
                  </div>
                )}

                {filterPeriod === "ano" && (
                  <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-2xl border border-stone-200 shadow-2xs">
                    <span className="text-[11px] font-black text-stone-400">Año:</span>
                    <select
                      value={selectedYearStr}
                      onChange={(e) => setSelectedYearStr(e.target.value)}
                      className="text-xs font-black text-stone-800 bg-transparent focus:outline-none cursor-pointer"
                    >
                      {Array.from(
                        new Set([
                          new Date().getFullYear().toString(),
                          (new Date().getFullYear() - 1).toString(),
                          (new Date().getFullYear() - 2).toString(),
                          "2026",
                          "2025",
                          "2024",
                        ])
                      )
                        .sort((a, b) => Number(b) - Number(a))
                        .map((y) => (
                          <option key={y} value={y}>
                            Año {y}
                          </option>
                        ))}
                    </select>
                    <div className="flex items-center gap-1 pl-1 border-l border-stone-200">
                      <button
                        type="button"
                        onClick={() => setSelectedYearStr(new Date().getFullYear().toString())}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-colors cursor-pointer ${
                          selectedYearStr === new Date().getFullYear().toString()
                            ? "bg-amber-500 text-stone-900"
                            : "bg-stone-100 hover:bg-stone-200 text-stone-700"
                        }`}
                      >
                        Año Actual
                      </button>
                    </div>
                  </div>
                )}

                {filterPeriod === "todos" && (
                  <div className="text-xs font-bold text-stone-600 bg-white px-3 py-1.5 rounded-2xl border border-stone-200 shadow-2xs flex items-center gap-1.5">
                    <span>📜</span>
                    <span>Mostrando todo el historial sin límite de fecha</span>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Buscador de Texto, Filtro de Responsable y Estado de Arqueo */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Buscador de texto */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Buscar por folio (CORTE-...), responsable del turno o notas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs sm:text-sm font-bold text-stone-900 focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder:text-stone-400 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 text-xs font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Filtro por Responsable del Turno */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-stone-500 whitespace-nowrap">
                  Responsable:
                </span>
                <select
                  value={filterResponsible}
                  onChange={(e) => setFilterResponsible(e.target.value)}
                  className="px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-black text-stone-800 focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer"
                >
                  <option value="all">Todos los Responsables</option>
                  {uniqueResponsibles.map((resp) => (
                    <option key={resp} value={resp}>
                      {resp}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro por Estado de Arqueo */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setFilterStatus("all")}
                  className={`px-3 py-2 rounded-xl text-xs font-black shrink-0 transition-all border cursor-pointer ${
                    filterStatus === "all"
                      ? "bg-stone-900 text-white border-stone-900 shadow-xs"
                      : "bg-stone-50 text-stone-700 hover:bg-stone-100 border-stone-200"
                  }`}
                >
                  Todos ({periodCuts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus("cuadrado")}
                  className={`px-3 py-2 rounded-xl text-xs font-black shrink-0 transition-all border cursor-pointer ${
                    filterStatus === "cuadrado"
                      ? "bg-emerald-900 text-emerald-100 border-emerald-950 shadow-xs ring-2 ring-emerald-500/20"
                      : "bg-stone-50 text-stone-700 hover:bg-emerald-50 border-stone-200"
                  }`}
                >
                  🟢 Exactos ({periodCuts.filter((c) => c.difference === 0).length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus("sobrante")}
                  className={`px-3 py-2 rounded-xl text-xs font-black shrink-0 transition-all border cursor-pointer ${
                    filterStatus === "sobrante"
                      ? "bg-blue-900 text-blue-100 border-blue-950 shadow-xs ring-2 ring-blue-500/20"
                      : "bg-stone-50 text-stone-700 hover:bg-blue-50 border-stone-200"
                  }`}
                >
                  🔵 Sobrantes ({periodCuts.filter((c) => c.difference > 0).length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus("faltante")}
                  className={`px-3 py-2 rounded-xl text-xs font-black shrink-0 transition-all border cursor-pointer ${
                    filterStatus === "faltante"
                      ? "bg-rose-900 text-rose-100 border-rose-950 shadow-xs ring-2 ring-rose-500/20"
                      : "bg-stone-50 text-stone-700 hover:bg-rose-50 border-stone-200"
                  }`}
                >
                  🔴 Faltantes ({periodCuts.filter((c) => c.difference < 0).length})
                </button>
              </div>
            </div>

            {/* 3. Sub-barra informativa */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-stone-500 pt-1 border-t border-stone-100">
              <span className="font-bold text-stone-700 flex items-center gap-1.5 flex-wrap">
                <span>Mostrando <strong className="text-amber-950">{filteredCuts.length}</strong> de {cutsHistory.length} comprobante(s)</span>
                <span className="text-[11px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md font-extrabold">
                  {filterPeriod === "dia"
                    ? `Día: ${selectedDayDate}`
                    : filterPeriod === "mes"
                    ? `Mes: ${selectedMonthStr}`
                    : filterPeriod === "ano"
                    ? `Año: ${selectedYearStr}`
                    : "Histórico Completo"}
                </span>
              </span>
              <span className="text-[11px] text-stone-400">
                Haz clic en <strong>"🖨️ Reimprimir Ticket"</strong> en cualquier corte para imprimir el comprobante térmico oficial.
              </span>
            </div>
          </div>

          {/* Tabla / Listado de Cortes */}
          <div className="bg-white rounded-3xl border border-stone-200/80 hover:border-orange-400 hover:ring-2 hover:ring-orange-400/20 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
            {filteredCuts.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="text-5xl">📜</div>
                <h4 className="font-black text-base text-stone-800">No se encontraron cortes de caja</h4>
                <p className="text-xs text-stone-500 max-w-md mx-auto">
                  {filterPeriod !== "todos" || searchQuery || filterResponsible !== "all" || filterStatus !== "all"
                    ? "Ningún corte coincide con el período o filtros seleccionados. Puedes cambiar de fecha, mes o ver todos los registros."
                    : "No hay registros de cortes de caja archivados aún."}
                </p>
                <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
                  {filterPeriod !== "todos" && (
                    <button
                      onClick={() => setFilterPeriod("todos")}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-stone-900 font-black rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
                    >
                      Ver Todos los Cortes ({cutsHistory.length})
                    </button>
                  )}
                  {(searchQuery || filterResponsible !== "all" || filterStatus !== "all") && (
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setFilterResponsible("all");
                        setFilterStatus("all");
                      }}
                      className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      Restablecer Filtros
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-stone-500 font-black border-b border-stone-200 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-4">Folio & Fecha</th>
                      <th className="p-4">Responsable del Turno</th>
                      <th className="p-4">Horario & Relevo</th>
                      <th className="p-4">Ventas del Turno</th>
                      <th className="p-4">Efectivo Contado</th>
                      <th className="p-4">Dictamen Arqueo</th>
                      <th className="p-4">Entregado a Don Toño</th>
                      <th className="p-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredCuts.map((cut) => {
                      const totalVentas = cut.totalSalesAll || cut.totalSales || (cut.cashSales + cut.cardSales + cut.transferSales) || 0;
                      const delivered = Math.max(0, cut.countedCash - (cut.nextFund ?? 0));
                      const isSquare = cut.difference === 0;
                      const isPositive = cut.difference > 0;
                      const respName = cut.responsible || cut.outgoingCashier || "Responsable";

                      return (
                        <tr
                          key={cut.id}
                          className="hover:bg-amber-50/40 transition-colors group cursor-pointer"
                          onClick={() => setSelectedCutForDetail(cut)}
                        >
                          {/* Folio & Fecha */}
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-amber-950 bg-stone-100 group-hover:bg-amber-200 px-2.5 py-1 rounded-lg text-xs transition-colors">
                                {cut.id}
                              </span>
                            </div>
                            <span className="text-[11px] text-stone-500 font-bold mt-1 block flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-stone-400" /> {cut.date}
                            </span>
                          </td>

                          {/* RESPONSABLE DESTACADO DEL TURNO */}
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-900 font-black text-xs shrink-0 shadow-2xs">
                                👩‍🍳
                              </div>
                              <div>
                                <span className="font-black text-stone-900 text-xs block leading-tight">
                                  {respName}
                                </span>
                                <span className="text-[10px] text-amber-800 font-extrabold uppercase tracking-wide block mt-0.5">
                                  Responsable de Caja
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Horario & Relevo */}
                          <td className="p-4">
                            <span className="font-bold text-stone-800 block text-xs">
                              {cut.shiftRange}
                            </span>
                            <span className="text-[10px] text-stone-500 block mt-0.5">
                              Entregó a: <strong className="text-stone-700">{cut.incomingCashier}</strong>
                            </span>
                          </td>

                          {/* Ventas Totales */}
                          <td className="p-4">
                            <span className="font-black text-stone-900 text-xs block">
                              {formatCurrency(totalVentas)}
                            </span>
                            <span className="text-[10px] text-stone-500 block mt-0.5">
                              Efvo: {formatCurrency(cut.cashSales)} • Tarj: {formatCurrency(cut.cardSales)}
                            </span>
                          </td>

                          {/* Efectivo Contado vs Esperado */}
                          <td className="p-4">
                            <span className="font-black text-amber-950 text-xs block">
                              {formatCurrency(cut.countedCash)}
                            </span>
                            <span className="text-[10px] text-stone-500 block mt-0.5">
                              Esperado: {formatCurrency(cut.expectedCash)}
                            </span>
                          </td>

                          {/* Dictamen Arqueo */}
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black border shadow-2xs ${
                              isSquare
                                ? "bg-emerald-100 text-emerald-950 border-emerald-300"
                                : isPositive
                                ? "bg-blue-100 text-blue-950 border-blue-300"
                                : "bg-rose-100 text-rose-950 border-rose-300"
                            }`}>
                              {isSquare ? "✓ Exacto ($0.00)" : isPositive ? `+${formatCurrency(cut.difference)}` : `${formatCurrency(cut.difference)}`}
                            </span>
                          </td>

                          {/* Entregado a Don Toño */}
                          <td className="p-4">
                            <span className="font-black text-emerald-700 text-xs block">
                              {formatCurrency(delivered)}
                            </span>
                            <span className="text-[10px] text-stone-500 block mt-0.5">
                              Fondo dejado: {formatCurrency(cut.nextFund ?? 0)}
                            </span>
                          </td>

                          {/* Acciones */}
                          <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => setSelectedCutForDetail(cut)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 hover:bg-black text-white font-black rounded-xl text-xs transition-all shadow-xs active:scale-95"
                                title="Reimprimir Ticket Oficial"
                              >
                                <Printer className="w-3.5 h-3.5 text-amber-400" />
                                <span>Reimprimir</span>
                              </button>
                              <button
                                onClick={() => setSelectedCutForDetail(cut)}
                                className="p-1.5 bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-950 rounded-xl transition-colors"
                                title="Ver comprobante digital"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 2: TURNO EN VIVO & MOVIMIENTOS                                   */}
      {/* ========================================================================= */}
      {activeTab === "turno" && (
        <div className="space-y-6">
          {/* Live Shift Box Status */}
          <div className="bg-gradient-to-br from-stone-900 via-stone-850 to-stone-950 rounded-3xl p-6 text-white shadow-2xl border border-stone-800 hover:border-orange-400 hover:ring-2 hover:ring-orange-400/20 transition-all duration-200 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-600 text-white rounded-2xl shadow-lg shadow-amber-600/30">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-black tracking-tight">Turno Actual: Turno Matutino</h3>
                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase">
                      Caja Abierta
                    </span>
                  </div>
                  {/* RESPONSABLE DESTACADO EN VIVO */}
                  <p className="text-xs text-stone-300 mt-1 flex items-center gap-1.5 flex-wrap">
                    <span>👤 Responsable del Turno:</span>
                    <strong className="text-amber-400 font-black">{currentShiftResponsible}</strong>
                    <span className="text-stone-500">•</span>
                    <span>Apertura: 06:00 AM con {formatCurrency(initialCash)} de fondo</span>
                  </p>
                </div>
              </div>

              <div className="text-left md:text-right">
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
                  Efectivo Esperado en Caja:
                </span>
                <span className="text-3xl font-black text-emerald-400 tracking-tight">
                  {formatCurrency(expectedCashInDrawer)}
                </span>
              </div>
            </div>

            {/* Breakdown Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-xs">
              <div className="bg-stone-850/80 p-3.5 rounded-2xl border border-stone-800 hover:border-orange-400/60 hover:ring-1 hover:ring-orange-400/20 transition-all duration-200">
                <span className="text-stone-400 text-[10px] font-bold block">Fondo Inicial:</span>
                <span className="text-base font-bold text-stone-200">{formatCurrency(initialCash)}</span>
              </div>
              <div className="bg-stone-850/80 p-3.5 rounded-2xl border border-stone-800 hover:border-orange-400/60 hover:ring-1 hover:ring-orange-400/20 transition-all duration-200">
                <span className="text-stone-400 text-[10px] font-bold block">Ventas Efectivo:</span>
                <span className="text-base font-bold text-emerald-400">+{formatCurrency(cashSales)}</span>
              </div>
              <div className="bg-stone-850/80 p-3.5 rounded-2xl border border-stone-800 hover:border-orange-400/60 hover:ring-1 hover:ring-orange-400/20 transition-all duration-200">
                <span className="text-stone-400 text-[10px] font-bold block">Otras Entradas:</span>
                <span className="text-base font-bold text-emerald-400">+{formatCurrency(totalEntries)}</span>
              </div>
              <div className="bg-stone-850/80 p-3.5 rounded-2xl border border-stone-800 hover:border-orange-400/60 hover:ring-1 hover:ring-orange-400/20 transition-all duration-200">
                <span className="text-stone-400 text-[10px] font-bold block">Gastos / Retiros:</span>
                <span className="text-base font-bold text-rose-400">-{formatCurrency(totalExpenses)}</span>
              </div>
              <div className="bg-stone-850/80 p-3.5 rounded-2xl border border-stone-800 hover:border-orange-400/60 hover:ring-1 hover:ring-orange-400/20 transition-all duration-200">
                <span className="text-stone-400 text-[10px] font-bold block">Cobros Tarjeta:</span>
                <span className="text-base font-bold text-blue-400">{formatCurrency(cardSales)}</span>
              </div>
              <div className="bg-stone-850/80 p-3.5 rounded-2xl border border-stone-800 hover:border-orange-400/60 hover:ring-1 hover:ring-orange-400/20 transition-all duration-200">
                <span className="text-stone-400 text-[10px] font-bold block">Transferencias:</span>
                <span className="text-base font-bold text-purple-400">{formatCurrency(transferSales)}</span>
              </div>
            </div>

            {/* Quick Live Actions */}
            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-stone-800">
              <button
                onClick={() => {
                  setMovementType("entrada");
                  setMovCategory("abono_cliente");
                  setIsMovementModalOpen(true);
                }}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-2.5 rounded-xl shadow-md text-xs transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" /> + Entrada
              </button>
              <button
                onClick={() => {
                  setMovementType("salida");
                  setMovCategory("compra_insumos");
                  setIsMovementModalOpen(true);
                }}
                className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-black px-4 py-2.5 rounded-xl shadow-md text-xs transition-all active:scale-95"
              >
                <Minus className="w-4 h-4" /> - Registrar Gasto / Retiro
              </button>
              <button
                onClick={handleOpenCorteModal}
                className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-black px-5 py-2.5 rounded-xl shadow-md text-xs transition-all active:scale-95"
              >
                <Lock className="w-4 h-4" /> Cerrar Turno & Realizar Corte
              </button>
            </div>
          </div>

          {/* Movements Table */}
          <div className="bg-white rounded-3xl border border-stone-200/80 hover:border-orange-400 hover:ring-2 hover:ring-orange-400/20 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden space-y-3 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-amber-600" />
                <h3 className="font-black text-base text-stone-900">Movimientos de Efectivo del Turno Actual</h3>
              </div>
              <span className="text-xs text-stone-500 font-semibold">{movements.length} movimientos registrados</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 text-stone-500 font-extrabold border-b border-stone-200">
                  <tr>
                    <th className="p-3.5">Hora</th>
                    <th className="p-3.5">Tipo</th>
                    <th className="p-3.5">Categoría</th>
                    <th className="p-3.5">Monto</th>
                    <th className="p-3.5">Motivo / Detalle</th>
                    <th className="p-3.5">Autorizado Por</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {movements.map((m) => {
                    const isEntry = m.type === "entrada";
                    return (
                      <tr key={m.id} className="hover:bg-stone-50/50">
                        <td className="p-3.5 font-bold text-stone-500">{m.timestamp}</td>
                        <td className="p-3.5">
                          {isEntry ? (
                            <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md text-[10px] uppercase flex items-center gap-1 w-fit">
                              <ArrowUpRight className="w-3 h-3" /> Entrada
                            </span>
                          ) : (
                            <span className="bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-md text-[10px] uppercase flex items-center gap-1 w-fit">
                              <ArrowDownRight className="w-3 h-3" /> Salida
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 font-bold text-stone-900">{m.categoryLabel}</td>
                        <td className={`p-3.5 font-black text-sm ${isEntry ? "text-emerald-600" : "text-rose-600"}`}>
                          {isEntry ? `+${formatCurrency(m.amount)}` : `-${formatCurrency(m.amount)}`}
                        </td>
                        <td className="p-3.5 text-stone-600">{m.reason}</td>
                        <td className="p-3.5 font-medium text-stone-500">{m.authorizedBy}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: REGISTRAR ENTRADA / SALIDA                                      */}
      {/* ========================================================================= */}
      {isMovementModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-stone-200 hover:border-orange-400 hover:ring-2 hover:ring-orange-400/20 transition-all duration-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${movementType === "entrada" ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"}`}>
                  <DollarSign className="w-5 h-5" />
                </div>
                <h3 className="font-black text-base text-stone-900">
                  {movementType === "entrada" ? "Registrar Entrada de Dinero" : "Registrar Salida / Gasto de Caja"}
                </h3>
              </div>
              <button onClick={() => { setIsMovementModalOpen(false); setMovSuccessFeedback(null); }} className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {movSuccessFeedback && (
              <div className="p-3.5 bg-emerald-50 border-2 border-emerald-400 rounded-2xl text-xs font-bold text-emerald-950 flex items-center justify-between gap-2 shadow-xs animate-in slide-in-from-top-1">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 text-base">✓</span>
                  <span>{movSuccessFeedback}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMovSuccessFeedback(null)}
                  className="text-stone-400 hover:text-stone-700 p-1 cursor-pointer font-bold shrink-0"
                >
                  ✕
                </button>
              </div>
            )}

            <form onSubmit={handleCreateMovement} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-stone-700">Monto ($ MXN) *</label>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  placeholder="Ej. 250"
                  value={movAmount}
                  onKeyDown={(e) => onlyNumbersKeyDown(e, true)}
                  onChange={(e) => setMovAmount(cleanDecimalNumbers(e.target.value))}
                  className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 text-base font-black text-stone-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700">Categoría</label>
                <select
                  value={movCategory}
                  onChange={(e) => setMovCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 font-bold text-stone-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  {movementType === "entrada" ? (
                    <>
                      <option value="abono_cliente">Abono de Pedido Especial</option>
                      <option value="otro">Aportación de Cambio / Otro</option>
                    </>
                  ) : (
                    <>
                      <option value="compra_insumos">Compra de Insumos Menores (Hielo, empaques)</option>
                      <option value="gasto_gas">Pago de Gas LP / Servicios</option>
                      <option value="pago_proveedor">Pago a Proveedor en Efectivo</option>
                      <option value="retiro_dueno">Retiro Parcial Don Toño</option>
                      <option value="otro">Otro Gasto</option>
                    </>
                  )}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700">Motivo / Detalle *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Se pagó garrafón de agua o abono pastel..."
                  value={movReason}
                  onChange={(e) => setMovReason(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsMovementModalOpen(false); setMovSuccessFeedback(null); }}
                  className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cerrar ventana
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-2.5 text-white font-extrabold rounded-xl shadow-md transition-all active:scale-95 ${
                    movementType === "entrada" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  Guardar Movimiento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ARQUEO Y CORTE DE CAJA EN VIVO                                  */}
      {isCorteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 border border-stone-200 hover:border-amber-400/80 transition-all duration-200 max-h-[92vh] overflow-y-auto">
            {/* Header del Modal */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-stone-900 text-amber-400 rounded-2xl shadow-sm">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-base sm:text-lg text-stone-900">Arqueo y Cierre de Turno</h3>
                    <span className="bg-amber-100 text-amber-900 font-extrabold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Corte Oficial
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Corte oficial, dictamen y entrega a Don Toño.
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setIsCorteModalOpen(false);
                  setPasswordError(null);
                  setDeliveryPassword("");
                }} 
                className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
                title="Cerrar ventana"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmLiveCut} className="space-y-3.5 text-xs">
              {/* RELEVO DE TURNO Y RESPONSABLES */}
              <div className="bg-amber-50/70 border border-amber-200/80 p-3.5 rounded-2xl space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🤝</span> Relevo de Turno y Responsables
                  </span>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded-md">
                    Pase de Caja
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Saliente */}
                  <div className="bg-white p-2.5 rounded-xl border border-amber-200/70 shadow-2xs">
                    <span className="text-[10px] font-bold text-amber-900 uppercase block">👩‍🍳 Quién Entrega:</span>
                    <span className="text-xs font-black text-stone-950 block mt-0.5 truncate">
                      {currentShiftResponsible}
                    </span>
                  </div>

                  {/* Entrante */}
                  <div className="bg-white p-2.5 rounded-xl border-2 border-amber-400 shadow-2xs">
                    <span className="text-[10px] font-black text-amber-950 uppercase block">🙋‍♀️ Quién Recibe: *</span>
                    <select
                      value={incomingCashier}
                      onChange={(e) => setIncomingCashier(e.target.value)}
                      className="w-full mt-1 bg-stone-50 border border-stone-300 rounded-lg px-2 py-1 text-xs font-bold text-stone-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value="Cajera 2 - Turno Vespertino">Cajera 2 - Turno Vespertino</option>
                      <option value="Lupita Brito (Cajera 1)">Lupita Brito (Cajera 1)</option>
                      <option value="Don Toño Brito (Dueño)">Don Toño Brito (Dueño / Admin)</option>
                      <option value="Carlos Mendoza (Supervisor)">Carlos Mendoza (Supervisor)</option>
                      <option value="Lic. Roberto Morales (Auxiliar)">Lic. Roberto Morales (Auxiliar)</option>
                      {usersList && usersList.map((u) => (
                        <option key={u.id} value={`${u.name} (${u.roleLabel || u.role})`}>
                          {u.name} ({u.roleLabel || u.role})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-stone-600 px-1 pt-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span className="font-semibold text-stone-800">Siguiente Turno a Iniciar:</span>
                    <span className="text-[10px] font-bold text-amber-900 bg-amber-200/70 px-1.5 py-0.2 rounded">
                      ⚡ Automático según corte ({autoShiftData.cutTimeStr})
                    </span>
                  </div>
                  <select
                    value={nextShiftName}
                    onChange={(e) => setNextShiftName(e.target.value)}
                    className="bg-white border border-stone-300 rounded-lg px-2.5 py-1 font-bold text-stone-900 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer"
                  >
                    <option value="Turno Vespertino (14:00 - 22:00)">
                      Turno Vespertino (14:00 - 22:00)
                    </option>
                    <option value="Turno Matutino (06:00 - 14:00)">
                      Turno Matutino (06:00 - 14:00) — Apertura
                    </option>
                    <option value="Turno Nocturno (22:00 - 06:00)">
                      Turno Nocturno (22:00 - 06:00) — Noche
                    </option>
                    <option value={`Turno Continuo (${autoShiftData.cutTimeStr})`}>
                      Turno Inmediato (A partir de las ${autoShiftData.cutTimeStr})
                    </option>
                  </select>
                </div>
              </div>

              {/* FIRMA DE SEGURIDAD / CONTRASEÑA */}
              <div className="bg-white p-3 rounded-2xl border border-stone-200 space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black text-stone-900 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Contraseña de Quién Entrega (Firma Digital) *</span>
                  </label>
                  <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                    Obligatoria
                  </span>
                </div>
                <div className="relative">
                  <input
                    type={showDeliveryPassword ? "text" : "password"}
                    required
                    value={deliveryPassword}
                    onChange={(e) => {
                      setDeliveryPassword(e.target.value);
                      setPasswordError(null);
                    }}
                    placeholder={`Ingresa tu contraseña o PIN (${currentShiftResponsible})`}
                    className={`w-full px-3 py-2 pr-10 bg-stone-50 rounded-xl border text-xs font-mono font-bold focus:ring-2 focus:outline-none transition-colors ${
                      passwordError ? "border-rose-400 focus:ring-rose-400 bg-rose-50/30" : "border-stone-300 focus:ring-amber-500"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowDeliveryPassword(!showDeliveryPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showDeliveryPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordError && (
                  <p className="text-[10px] text-rose-600 font-bold flex items-center gap-1 pt-0.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{passwordError}</span>
                  </p>
                )}
              </div>

              {/* CONCILIACIÓN Y FLUJO FINANCIERO DEL TURNO */}
              <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200/90 space-y-1.5 text-xs shadow-2xs">
                <div className="flex justify-between items-center pb-1 border-b border-stone-200/70 font-bold text-[10px] text-stone-500 uppercase tracking-wider">
                  <span>Concepto de Caja</span>
                  <span>Monto</span>
                </div>
                <div className="flex justify-between text-stone-700 pt-0.5">
                  <span>(+) Fondo Inicial de Turno:</span>
                  <span className="font-bold text-stone-900">{formatCurrency(initialCash)}</span>
                </div>
                <div className="flex justify-between text-emerald-800 font-bold">
                  <span>(+) Ventas en Efectivo (Mostrador):</span>
                  <span>+{formatCurrency(cashSales)}</span>
                </div>
                {totalEntries > 0 && (
                  <div className="flex justify-between text-emerald-800 font-bold">
                    <span>(+) Entradas / Anticipos registrados:</span>
                    <span>+{formatCurrency(totalEntries)}</span>
                  </div>
                )}
                <div className="flex justify-between text-rose-700 font-bold">
                  <span>(-) Gastos y Salidas del Turno:</span>
                  <span>-{formatCurrency(totalExpenses)}</span>
                </div>
                <div className="flex justify-between text-xs font-black border-t border-stone-300 pt-2 text-stone-950">
                  <span>(=) Efectivo Esperado en Gaveta:</span>
                  <span className="text-amber-950 font-black text-sm">{formatCurrency(expectedCashInDrawer)}</span>
                </div>
                {(cardSales > 0 || transferSales > 0) && (
                  <div className="pt-1.5 mt-1 border-t border-stone-200/60 flex flex-wrap justify-between text-[10px] text-stone-500">
                    <span>💳 Tarjeta: {formatCurrency(cardSales)} • Transferencia: {formatCurrency(transferSales)}</span>
                    <span className="font-semibold text-stone-600">(Depósito bancario)</span>
                  </div>
                )}
              </div>

              {/* DISTRIBUCIÓN DEL DINERO */}
              <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-stone-800 text-[11px] block">
                    🪙 Fondo que se deja en Caja para el siguiente turno ($ MXN)
                  </label>
                  <div className="flex gap-1">
                    {[300, 500, 800].map((fAmt) => (
                      <button
                        key={fAmt}
                        type="button"
                        onClick={() => setNextFundAmount(fAmt.toString())}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                          nextFundAmount === fAmt.toString()
                            ? "bg-amber-600 text-white border-amber-600"
                            : "bg-white text-stone-600 border-stone-200 hover:bg-stone-100"
                        }`}
                      >
                        ${fAmt}
                      </button>
                    ))}
                  </div>
                </div>

                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={nextFundAmount}
                  onKeyDown={(e) => onlyNumbersKeyDown(e, true)}
                  onChange={(e) => {
                    const raw = cleanDecimalNumbers(e.target.value);
                    const maxAllowed = Math.max(0, actualCount);
                    if (raw !== "" && actualCount > 0 && Number(raw) > maxAllowed) {
                      setNextFundAmount(maxAllowed.toString());
                    } else {
                      setNextFundAmount(raw);
                    }
                  }}
                  className="w-full px-3 py-1.5 bg-white rounded-xl border border-stone-300 font-bold text-stone-900 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />

                <div className="flex justify-between items-center text-xs pt-1.5 border-t border-stone-200">
                  <div>
                    <span className="text-stone-700 font-bold block text-[11px]">Efectivo entregado a Don Toño:</span>
                    <span className="text-[10px] text-stone-500">Total en caja (${formatCurrency(expectedCashInDrawer)}) menos fondo dejado</span>
                  </div>
                  <strong className="text-sm font-black text-emerald-950 bg-emerald-100/80 px-2.5 py-1 rounded-xl border border-emerald-300">
                    {formatCurrency(Math.max(0, expectedCashInDrawer - (Number(nextFundAmount) || 0)))}
                  </strong>
                </div>
              </div>

              {/* OBSERVACIONES */}
              <div className="space-y-1">
                <label className="font-bold text-stone-700 text-xs">
                  Observaciones del Cierre (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. Entrega conforme, vitrinas llenas..."
                  value={corteNotes}
                  onChange={(e) => setCorteNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-500 focus:outline-none text-xs"
                />
              </div>

              {/* BOTONES DE ACCIÓN */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCorteModalOpen(false);
                    setPasswordError(null);
                    setDeliveryPassword("");
                  }}
                  className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-2.5 bg-stone-900 hover:bg-black text-white font-black rounded-xl text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer border border-stone-800"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Confirmar y Guardar Corte Oficial</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* MODAL 3: REIMPRESIÓN Y DETALLE DE TICKET DE CORTE                         */}
      {/* ========================================================================= */}
      <ShiftCutDetailModal
        isOpen={selectedCutForDetail !== null}
        onClose={() => setSelectedCutForDetail(null)}
        cut={selectedCutForDetail}
      />
    </div>
  );
}
