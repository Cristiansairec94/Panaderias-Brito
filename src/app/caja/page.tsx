"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { 
  ShoppingBag,
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
            if (sum > 0) return sum;
          }
        }
      } catch {}
    }
    return 4150;
  });
  const [cardSales, setCardSales] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("brito_pos_current_sales");
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list) && list.length > 0) {
            const sum = list.filter((s: any) => s.paymentMethod === "tarjeta").reduce((acc: number, s: any) => acc + (Number(s.total) || 0), 0);
            if (sum > 0) return sum;
          }
        }
      } catch {}
    }
    return 700;
  });
  const [transferSales, setTransferSales] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("brito_pos_current_sales");
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list) && list.length > 0) {
            const sum = list.filter((s: any) => s.paymentMethod === "transferencia").reduce((acc: number, s: any) => acc + (Number(s.total) || 0), 0);
            if (sum > 0) return sum;
          }
        }
      } catch {}
    }
    return 350;
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
  const [incomingCashier, setIncomingCashier] = useState("Cajera 2 - Turno Vespertino");
  const [nextShiftName, setNextShiftName] = useState("Turno Vespertino (14:00 - 22:00)");
  const [deliveryPassword, setDeliveryPassword] = useState("");
  const [showDeliveryPassword, setShowDeliveryPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [countedCash, setCountedCash] = useState<string>("");
  const [nextFundAmount, setNextFundAmount] = useState<string>("500");
  const [corteNotes, setCorteNotes] = useState<string>("");
  const [countMode, setCountMode] = useState<"directo" | "denominaciones">("directo");
  const [showIncomeBreakdown, setShowIncomeBreakdown] = useState(true);
  const [denominations, setDenominations] = useState<Record<string, number>>({
    b1000: 0,
    b500: 0,
    b200: 0,
    b100: 0,
    b50: 0,
    b20: 0,
    m20: 0,
    m10: 0,
    m5: 0,
    m2: 0,
    m1: 0,
    m05: 0,
  });

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
            if (cSum > 0) setCashSales(cSum);
            if (kSum > 0) setCardSales(kSum);
            if (tSum > 0) setTransferSales(tSum);
          }
        }
      } catch {}
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
  const actualCount = Number(countedCash) || 0;
  const cashDifference = actualCount - expectedCashInDrawer;

  // Desglose de ingresos registrados en el turno
  const pedidosEntries = entryMovements.filter((m) => m.category === "abono_cliente" || (m.reason && m.reason.toLowerCase().includes("pedido")));
  const pedidosTotal = pedidosEntries.reduce((acc, m) => acc + m.amount, 0);
  const otherEntries = entryMovements.filter((m) => m.category !== "abono_cliente" && !(m.reason && m.reason.toLowerCase().includes("pedido")));
  const otherEntriesTotal = otherEntries.reduce((acc, m) => acc + m.amount, 0);

  // Conteo de efectivo por denominaciones
  const denominationsTotal = useMemo(() => {
    return (
      (denominations.b1000 || 0) * 1000 +
      (denominations.b500 || 0) * 500 +
      (denominations.b200 || 0) * 200 +
      (denominations.b100 || 0) * 100 +
      (denominations.b50 || 0) * 50 +
      (denominations.b20 || 0) * 20 +
      (denominations.m20 || 0) * 20 +
      (denominations.m10 || 0) * 10 +
      (denominations.m5 || 0) * 5 +
      (denominations.m2 || 0) * 2 +
      (denominations.m1 || 0) * 1 +
      (denominations.m05 || 0) * 0.5
    );
  }, [denominations]);

  const handleUpdateDenomination = (key: string, delta: number) => {
    setDenominations((prev) => {
      const nextVal = Math.max(0, (prev[key] || 0) + delta);
      const updated = { ...prev, [key]: nextVal };
      const newTotal =
        (updated.b1000 || 0) * 1000 +
        (updated.b500 || 0) * 500 +
        (updated.b200 || 0) * 200 +
        (updated.b100 || 0) * 100 +
        (updated.b50 || 0) * 50 +
        (updated.b20 || 0) * 20 +
        (updated.m20 || 0) * 20 +
        (updated.m10 || 0) * 10 +
        (updated.m5 || 0) * 5 +
        (updated.m2 || 0) * 2 +
        (updated.m1 || 0) * 1 +
        (updated.m05 || 0) * 0.5;
      setCountedCash(newTotal > 0 ? newTotal.toString() : "");
      return updated;
    });
  };

  const handleSetDenominationInput = (key: string, valStr: string) => {
    const qty = parseInt(valStr.replace(/\D/g, ""), 10) || 0;
    setDenominations((prev) => {
      const updated = { ...prev, [key]: qty };
      const newTotal =
        (updated.b1000 || 0) * 1000 +
        (updated.b500 || 0) * 500 +
        (updated.b200 || 0) * 200 +
        (updated.b100 || 0) * 100 +
        (updated.b50 || 0) * 50 +
        (updated.b20 || 0) * 20 +
        (updated.m20 || 0) * 20 +
        (updated.m10 || 0) * 10 +
        (updated.m5 || 0) * 5 +
        (updated.m2 || 0) * 2 +
        (updated.m1 || 0) * 1 +
        (updated.m05 || 0) * 0.5;
      setCountedCash(newTotal > 0 ? newTotal.toString() : "");
      return updated;
    });
  };

  const handleClearDenominations = () => {
    setDenominations({
      b1000: 0,
      b500: 0,
      b200: 0,
      b100: 0,
      b50: 0,
      b20: 0,
      m20: 0,
      m10: 0,
      m5: 0,
      m2: 0,
      m1: 0,
      m05: 0,
    });
    setCountedCash("");
  };

  // Active shift responsible name
  const currentShiftResponsible = user?.name || "Lupita Brito (Cajera 1)";

  // Filtered cuts history
  const filteredCuts = useMemo(() => {
    return cutsHistory.filter((cut) => {
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
  }, [cutsHistory, searchQuery, filterResponsible, filterStatus]);

  // Distinct Responsibles list for filter dropdown
  const uniqueResponsibles = useMemo(() => {
    const set = new Set<string>();
    cutsHistory.forEach((c) => {
      const name = c.responsible || c.outgoingCashier;
      if (name) set.add(name);
    });
    return Array.from(set);
  }, [cutsHistory]);

  // Overall Historical Audit Metrics
  const auditMetrics = useMemo(() => {
    const totalCutsCount = cutsHistory.length;
    const totalDeliveredCash = cutsHistory.reduce((sum, c) => {
      const fund = c.nextFund ?? 0;
      return sum + Math.max(0, c.countedCash - fund);
    }, 0);
    const totalSalesAudit = cutsHistory.reduce((sum, c) => {
      const val = c.totalSalesAll || c.totalSales || (c.cashSales + c.cardSales + c.transferSales) || 0;
      return sum + val;
    }, 0);
    const squareCutsCount = cutsHistory.filter((c) => c.difference === 0).length;
    const diffCutsCount = cutsHistory.filter((c) => c.difference !== 0).length;

    return {
      totalCutsCount,
      totalDeliveredCash,
      totalSalesAudit,
      squareCutsCount,
      diffCutsCount,
    };
  }, [cutsHistory]);

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

    // 2. Validar efectivo físico contado
    if (countedCash === "") {
      alert("Por favor ingresa o realiza el conteo del efectivo físico en caja.");
      return;
    }

    const parsedCounted = Number(countedCash) || 0;
    const parsedNextFund = Number(nextFundAmount) || 0;
    if (parsedCounted > 0 && parsedNextFund > parsedCounted) {
      alert(`El fondo para el siguiente turno (${formatCurrency(parsedNextFund)}) no puede ser mayor que el dinero físico en caja (${formatCurrency(parsedCounted)}).`);
      return;
    }
    const diff = parsedCounted - expectedCashInDrawer;
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
      previousShift: "Turno Matutino",
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
      setCutsHistory(updated);
      window.dispatchEvent(new Event("brito_shift_cuts_updated"));
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
    handleClearDenominations();

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
          <Link
            href="/pos"
            className="flex items-center gap-1.5 bg-gradient-to-r from-brito-orange-600 to-brito-crimson-600 hover:from-brito-orange-500 hover:to-brito-crimson-500 text-white font-black px-4 py-2.5 rounded-xl shadow-md text-xs transition-all active:scale-95"
          >
            <ShoppingBag className="w-4 h-4" /> Ir a Punto de Venta (POS)
          </Link>
          <Link
            href="/ingresos"
            className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-black px-4 py-2.5 rounded-xl shadow-md text-xs transition-all active:scale-95"
          >
            <TrendingUp className="w-4 h-4" /> Registro de Ingresos
          </Link>
          <button
            onClick={() => {
              setActiveTab("turno");
              setIsCorteModalOpen(true);
            }}
            className="flex items-center gap-1.5 bg-stone-900 hover:bg-black text-white font-black px-4 py-2.5 rounded-xl shadow-md text-xs transition-all active:scale-95 border border-stone-800"
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
                  Archivados en historial
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
                  Retirado de caja al cierre
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
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-200/80 hover:border-orange-400 hover:ring-2 hover:ring-orange-400/20 shadow-sm hover:shadow-md transition-all duration-200 space-y-3">
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 text-xs font-bold"
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
                  className={`px-3 py-2 rounded-xl text-xs font-black shrink-0 transition-all border ${
                    filterStatus === "all"
                      ? "bg-stone-900 text-white border-stone-900 shadow-xs"
                      : "bg-stone-50 text-stone-700 hover:bg-stone-100 border-stone-200"
                  }`}
                >
                  Todos ({cutsHistory.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus("cuadrado")}
                  className={`px-3 py-2 rounded-xl text-xs font-black shrink-0 transition-all border ${
                    filterStatus === "cuadrado"
                      ? "bg-emerald-900 text-emerald-100 border-emerald-950 shadow-xs ring-2 ring-emerald-500/20"
                      : "bg-stone-50 text-stone-700 hover:bg-emerald-50 border-stone-200"
                  }`}
                >
                  🟢 Exactos ({cutsHistory.filter((c) => c.difference === 0).length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus("sobrante")}
                  className={`px-3 py-2 rounded-xl text-xs font-black shrink-0 transition-all border ${
                    filterStatus === "sobrante"
                      ? "bg-blue-900 text-blue-100 border-blue-950 shadow-xs ring-2 ring-blue-500/20"
                      : "bg-stone-50 text-stone-700 hover:bg-blue-50 border-stone-200"
                  }`}
                >
                  🔵 Sobrantes ({cutsHistory.filter((c) => c.difference > 0).length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus("faltante")}
                  className={`px-3 py-2 rounded-xl text-xs font-black shrink-0 transition-all border ${
                    filterStatus === "faltante"
                      ? "bg-rose-900 text-rose-100 border-rose-950 shadow-xs ring-2 ring-rose-500/20"
                      : "bg-stone-50 text-stone-700 hover:bg-rose-50 border-stone-200"
                  }`}
                >
                  🔴 Faltantes ({cutsHistory.filter((c) => c.difference < 0).length})
                </button>
              </div>
            </div>

            {/* Sub-barra informativa */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-stone-500 pt-1 border-t border-stone-100">
              <span className="font-bold text-stone-700">
                Mostrando <strong className="text-amber-950">{filteredCuts.length}</strong> comprobante(s) de corte
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
                  {searchQuery || filterResponsible !== "all" || filterStatus !== "all"
                    ? "Ningún corte coincide con los filtros aplicados. Prueba limpiando la búsqueda."
                    : "No hay registros de cortes de caja archivados aún."}
                </p>
                {(searchQuery || filterResponsible !== "all" || filterStatus !== "all") && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setFilterResponsible("all");
                      setFilterStatus("all");
                    }}
                    className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-xl text-xs transition-colors"
                  >
                    Restablecer Filtros
                  </button>
                )}
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
                onClick={() => setIsCorteModalOpen(true)}
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
      {/* ========================================================================= */}
      {isCorteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-2xl w-full shadow-2xl space-y-4 border border-stone-200 hover:border-amber-400/80 transition-all duration-200 max-h-[92vh] overflow-y-auto">
            {/* Header del Modal */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-gradient-to-br from-stone-900 to-amber-950 text-white rounded-2xl shadow-sm">
                  <Calculator className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-base sm:text-lg text-stone-900">Arqueo y Cierre de Turno</h3>
                    <span className="bg-amber-100 text-amber-900 font-extrabold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Corte Oficial
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Relevo de cajeros, conciliación de ingresos, arqueo físico y entrega a Don Toño.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsCorteModalOpen(false)} 
                className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-colors"
                title="Cerrar ventana"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmLiveCut} className="space-y-4 text-xs">
              {/* APARTADO 1: RELEVO DE TURNO (QUIÉN ENTREGA Y QUIÉN RECIBE) */}
              <div className="bg-gradient-to-r from-amber-50/90 via-stone-50 to-amber-50/90 border border-amber-200/90 p-3.5 rounded-2xl space-y-3 shadow-2xs">
                <div className="flex items-center justify-between border-b border-amber-200/60 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🤝</span>
                    <span className="font-black text-stone-900 text-xs uppercase tracking-wider">
                      Relevo de Turno y Responsables
                    </span>
                  </div>
                  <span className="text-[10px] text-amber-800 font-bold bg-amber-200/70 px-2 py-0.5 rounded-md">
                    Pase de Caja
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-stretch">
                  {/* Saliente (Quién Entrega) */}
                  <div className="bg-white p-3 rounded-xl border border-amber-200/80 shadow-2xs flex flex-col justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-amber-900">
                        <span className="text-sm">👩‍🍳</span>
                        <span className="text-[10px] font-black uppercase tracking-wider">Quién Entrega (Saliente)</span>
                      </div>
                      <span className="font-black text-xs sm:text-sm text-stone-950 block truncate">
                        {currentShiftResponsible}
                      </span>
                    </div>
                    <span className="text-[10px] text-stone-500 font-semibold mt-1 block flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-600" /> Turno Actual en Operación
                    </span>
                  </div>

                  {/* Entrante (Quién Recibe) */}
                  <div className="bg-white p-3 rounded-xl border-2 border-emerald-300 shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-emerald-800">
                        <span className="text-sm">🙋‍♀️</span>
                        <span className="text-[10px] font-black uppercase tracking-wider">Quién Recibe (Entrante) *</span>
                      </div>
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                        Relevo
                      </span>
                    </div>
                    
                    <select
                      value={incomingCashier}
                      onChange={(e) => setIncomingCashier(e.target.value)}
                      className="w-full px-2.5 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-bold text-stone-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
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

                    <div className="flex items-center gap-1.5 text-[10px] text-stone-600 pt-0.5">
                      <Clock className="w-3 h-3 text-stone-400 shrink-0" />
                      <select
                        value={nextShiftName}
                        onChange={(e) => setNextShiftName(e.target.value)}
                        className="bg-transparent border-0 font-semibold text-stone-700 focus:outline-none text-[10px] cursor-pointer"
                      >
                        <option value="Turno Vespertino (14:00 - 22:00)">Turno Vespertino (14:00 - 22:00)</option>
                        <option value="Turno Matutino (06:00 - 14:00)">Turno Matutino (06:00 - 14:00)</option>
                        <option value="Turno Nocturno (22:00 - 06:00)">Turno Nocturno (22:00 - 06:00)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* APARTADO 2: CONTRASEÑA / PIN DE QUIEN ENTREGA */}
                <div className="bg-white p-3 rounded-xl border border-amber-200/90 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black text-stone-900 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-600" />
                      <span>Contraseña de Quién Entrega (Firma Digital del Turno) *</span>
                    </label>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                      Seguridad Obligatoria
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
                      placeholder={`Ingresa tu clave de acceso o PIN de ${currentShiftResponsible}`}
                      className={`w-full px-3 py-2 pr-10 bg-stone-50 rounded-xl border text-xs font-mono font-bold focus:ring-2 focus:outline-none transition-colors ${
                        passwordError ? "border-rose-400 focus:ring-rose-400 bg-rose-50/30" : "border-stone-300 focus:ring-amber-500"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowDeliveryPassword(!showDeliveryPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
                      tabIndex={-1}
                      title={showDeliveryPassword ? "Ocultar contraseña" : "Ver contraseña"}
                    >
                      {showDeliveryPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {passwordError ? (
                    <p className="text-[10px] text-rose-600 font-bold flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{passwordError}</span>
                    </p>
                  ) : deliveryPassword.trim().length > 0 ? (
                    <p className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                      <span>Firma digital ingresada para asentar en el corte oficial.</span>
                    </p>
                  ) : (
                    <p className="text-[10px] text-stone-500 italic mt-0.5">
                      Escribe tu contraseña de cajera/o para validar la entrega y firmar el ticket archivado.
                    </p>
                  )}
                </div>
              </div>

              {/* APARTADO 3: DESGLOSE DE INGRESOS REGISTRADOS */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3.5 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                      <TrendingUp className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-black text-xs text-stone-900 block leading-tight">
                        Desglose de Ingresos Registrados
                      </span>
                      <span className="text-[10px] text-emerald-800 font-bold">
                        Efectivo total captado en turno: {formatCurrency(cashSales + totalEntries)}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowIncomeBreakdown(!showIncomeBreakdown)}
                    className="text-[10px] font-bold text-emerald-800 hover:text-emerald-950 underline cursor-pointer"
                  >
                    {showIncomeBreakdown ? "Ocultar detalle" : "Ver detalle"}
                  </button>
                </div>

                {showIncomeBreakdown && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 border-t border-emerald-200/60">
                    {/* Ventas en Mostrador */}
                    <div className="bg-white p-2.5 rounded-xl border border-emerald-100 flex items-center justify-between shadow-2xs">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🥖</span>
                        <div>
                          <span className="font-bold text-stone-800 block text-[11px]">Ventas de Mostrador</span>
                          <span className="text-[9px] text-stone-500 font-medium">Pan dulce, bolillo y repostería</span>
                        </div>
                      </div>
                      <span className="font-black text-emerald-700 text-xs">+{formatCurrency(cashSales)}</span>
                    </div>

                    {/* Anticipos de Pedidos */}
                    <div className="bg-white p-2.5 rounded-xl border border-emerald-100 flex items-center justify-between shadow-2xs">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🎂</span>
                        <div>
                          <span className="font-bold text-stone-800 block text-[11px]">Anticipos de Pedidos</span>
                          <span className="text-[9px] text-stone-500 font-medium">{pedidosEntries.length} abono(s) recibido(s)</span>
                        </div>
                      </div>
                      <span className="font-black text-emerald-700 text-xs">+{formatCurrency(pedidosTotal)}</span>
                    </div>

                    {/* Otras Aportaciones */}
                    {otherEntriesTotal > 0 && (
                      <div className="bg-white p-2.5 rounded-xl border border-emerald-100 flex items-center justify-between shadow-2xs sm:col-span-2">
                        <div className="flex items-center gap-2">
                          <span className="text-base">🪙</span>
                          <div>
                            <span className="font-bold text-stone-800 block text-[11px]">Aportaciones / Cambio Extra</span>
                            <span className="text-[9px] text-stone-500 font-medium">Entradas extraordinarias al cajón</span>
                          </div>
                        </div>
                        <span className="font-black text-emerald-700 text-xs">+{formatCurrency(otherEntriesTotal)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Métodos Electrónicos Informativos */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-[10px] text-stone-600 bg-white/80 px-2.5 py-1.5 rounded-xl border border-emerald-100 gap-1">
                  <span className="font-medium text-stone-500">
                    💳 Cobros electrónicos (No van al cajón físico, se depositan a bancos):
                  </span>
                  <span className="font-bold text-stone-800">
                    Tarjeta: {formatCurrency(cardSales)} • Transf: {formatCurrency(transferSales)}
                  </span>
                </div>
              </div>

              {/* APARTADO 4: CONCILIACIÓN Y ARQUEO FÍSICO */}
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3.5 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between border-b border-stone-200/80 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">⚖️</span>
                    <div>
                      <span className="font-black text-stone-900 text-xs uppercase tracking-wider block leading-none">
                        Conciliación y Arqueo Físico
                      </span>
                      <span className="text-[10px] text-stone-500 font-medium">
                        Compara el dinero físico contado contra lo esperado en sistema
                      </span>
                    </div>
                  </div>

                  {/* Selector de modo de conteo */}
                  <div className="flex items-center gap-1 bg-white p-0.5 rounded-xl border border-stone-200 text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setCountMode("directo")}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        countMode === "directo"
                          ? "bg-stone-900 text-white shadow-2xs"
                          : "text-stone-600 hover:text-stone-900"
                      }`}
                    >
                      ⌨️ Monto Total
                    </button>
                    <button
                      type="button"
                      onClick={() => setCountMode("denominaciones")}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        countMode === "denominaciones"
                          ? "bg-amber-600 text-white shadow-2xs"
                          : "text-stone-600 hover:text-stone-900"
                      }`}
                    >
                      🧮 Billetes y Monedas
                    </button>
                  </div>
                </div>

                {/* Si modo = Denominaciones: desglose de billetes y monedas */}
                {countMode === "denominaciones" && (
                  <div className="bg-white p-3 rounded-2xl border border-amber-200 space-y-2.5 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-amber-900 tracking-wider">
                        Contador por Denominaciones
                      </span>
                      <button
                        type="button"
                        onClick={handleClearDenominations}
                        className="text-[10px] text-stone-400 hover:text-rose-600 underline font-bold cursor-pointer"
                      >
                        Reiniciar contador
                      </button>
                    </div>

                    {/* Billetes */}
                    <div className="space-y-1">
                      <span className="text-[9px] font-black uppercase text-stone-400 block tracking-wider">
                        💵 Billetes Nacionales
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {[
                          { key: "b1000", val: 1000, label: "$1,000", color: "bg-purple-50 text-purple-950 border-purple-200" },
                          { key: "b500", val: 500, label: "$500", color: "bg-blue-50 text-blue-950 border-blue-200" },
                          { key: "b200", val: 200, label: "$200", color: "bg-emerald-50 text-emerald-950 border-emerald-200" },
                          { key: "b100", val: 100, label: "$100", color: "bg-rose-50 text-rose-950 border-rose-200" },
                          { key: "b50", val: 50, label: "$50", color: "bg-pink-50 text-pink-950 border-pink-200" },
                          { key: "b20", val: 20, label: "$20", color: "bg-cyan-50 text-cyan-950 border-cyan-200" },
                        ].map((b) => {
                          const count = denominations[b.key] || 0;
                          return (
                            <div key={b.key} className={`p-1.5 rounded-xl border ${b.color} flex items-center justify-between`}>
                              <span className="font-black text-xs">{b.label}</span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateDenomination(b.key, -1)}
                                  className="w-5 h-5 rounded-md bg-white border border-stone-200 font-black text-stone-700 flex items-center justify-center hover:bg-stone-100"
                                >
                                  -
                                </button>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={count > 0 ? count : ""}
                                  placeholder="0"
                                  onChange={(e) => handleSetDenominationInput(b.key, e.target.value)}
                                  className="w-8 text-center text-xs font-black bg-white rounded border border-stone-200 py-0.5"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleUpdateDenomination(b.key, 1)}
                                  className="w-5 h-5 rounded-md bg-white border border-stone-200 font-black text-stone-700 flex items-center justify-center hover:bg-stone-100"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Monedas */}
                    <div className="space-y-1 pt-1">
                      <span className="text-[9px] font-black uppercase text-stone-400 block tracking-wider">
                        🪙 Monedas Fraccionarias
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {[
                          { key: "m20", val: 20, label: "$20" },
                          { key: "m10", val: 10, label: "$10" },
                          { key: "m5", val: 5, label: "$5" },
                          { key: "m2", val: 2, label: "$2" },
                          { key: "m1", val: 1, label: "$1" },
                          { key: "m05", val: 0.5, label: "$0.50" },
                        ].map((m) => {
                          const count = denominations[m.key] || 0;
                          return (
                            <div key={m.key} className="p-1.5 rounded-xl border border-stone-200 bg-stone-50 flex items-center justify-between">
                              <span className="font-bold text-xs text-stone-800">{m.label}</span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateDenomination(m.key, -1)}
                                  className="w-5 h-5 rounded-md bg-white border border-stone-200 font-black text-stone-700 flex items-center justify-center hover:bg-stone-100"
                                >
                                  -
                                </button>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={count > 0 ? count : ""}
                                  placeholder="0"
                                  onChange={(e) => handleSetDenominationInput(m.key, e.target.value)}
                                  className="w-8 text-center text-xs font-black bg-white rounded border border-stone-200 py-0.5"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleUpdateDenomination(m.key, 1)}
                                  className="w-5 h-5 rounded-md bg-white border border-stone-200 font-black text-stone-700 flex items-center justify-center hover:bg-stone-100"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="bg-amber-100/70 p-2 rounded-xl flex items-center justify-between font-bold text-xs text-amber-950">
                      <span>Suma Total Contada por Denominaciones:</span>
                      <span className="font-black text-sm">{formatCurrency(denominationsTotal)}</span>
                    </div>
                  </div>
                )}

                {/* Input Directo de Efectivo Físico Contado */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="font-black text-stone-900 text-xs">
                      Efectivo Físico Total Contado en Caja ($ MXN) *
                    </label>
                    <span className="text-[10px] text-stone-500 font-semibold">
                      Billetes + Monedas
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-stone-400 text-base">
                      $
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      required
                      placeholder="0.00"
                      value={countedCash}
                      onKeyDown={(e) => onlyNumbersKeyDown(e, true)}
                      onChange={(e) => setCountedCash(cleanDecimalNumbers(e.target.value))}
                      className="w-full pl-8 pr-4 py-3 bg-white rounded-2xl border-2 border-stone-300 text-lg sm:text-xl font-black text-stone-950 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:outline-none transition-all"
                    />
                  </div>

                  {/* Atajos rápidos para sumar */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[100, 200, 500, 1000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          const curr = Number(countedCash) || 0;
                          setCountedCash((curr + amt).toString());
                        }}
                        className="px-2 py-1 bg-white hover:bg-stone-100 border border-stone-200 rounded-lg text-[10px] font-bold text-stone-700 transition-colors cursor-pointer"
                      >
                        +{formatCurrency(amt)}
                      </button>
                    ))}
                    {countedCash !== "" && (
                      <button
                        type="button"
                        onClick={() => setCountedCash("")}
                        className="px-2 py-1 bg-stone-100 hover:bg-rose-50 hover:text-rose-700 border border-stone-200 rounded-lg text-[10px] font-bold text-stone-500 transition-colors ml-auto cursor-pointer"
                      >
                        Limpiar
                      </button>
                    )}
                  </div>
                </div>

                {/* Resumen de Conciliación Matemática */}
                <div className="bg-white p-3.5 rounded-2xl border border-stone-200 space-y-1.5 text-xs">
                  <div className="flex justify-between text-stone-600">
                    <span>(+) Fondo Inicial de Turno:</span>
                    <span className="font-bold text-stone-800">{formatCurrency(initialCash)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-800 font-bold">
                    <span>(+) Total Ventas en Efectivo:</span>
                    <span>+{formatCurrency(cashSales)}</span>
                  </div>
                  {totalEntries > 0 && (
                    <div className="flex justify-between text-emerald-800 font-bold">
                      <span>(+) Otras Entradas Registradas:</span>
                      <span>+{formatCurrency(totalEntries)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-rose-700 font-bold">
                    <span>(-) Gastos y Retiros del Turno:</span>
                    <span>-{formatCurrency(totalExpenses)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-black border-t border-stone-200 pt-2 text-stone-900">
                    <span>(=) Efectivo Teórico Esperado:</span>
                    <span className="text-amber-950 font-black">{formatCurrency(expectedCashInDrawer)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-black pt-1 text-stone-900">
                    <span>(=) Efectivo Físico Contado:</span>
                    <span className="text-stone-950 font-black">{formatCurrency(actualCount)}</span>
                  </div>
                </div>

                {/* DICTAMEN DE ARQUEO EN VIVO */}
                {countedCash !== "" && (
                  <div
                    className={`p-3 rounded-2xl border text-xs flex items-center justify-between shadow-2xs transition-all animate-in fade-in duration-150 ${
                      cashDifference === 0
                        ? "bg-emerald-50 text-emerald-950 border-emerald-300"
                        : cashDifference > 0
                        ? "bg-blue-50 text-blue-950 border-blue-300"
                        : "bg-rose-50 text-rose-950 border-rose-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">
                        {cashDifference === 0 ? "✅" : cashDifference > 0 ? "🔵" : "⚠️"}
                      </span>
                      <div>
                        <span className="font-black block uppercase text-[10px] tracking-wider">
                          Dictamen de Conciliación:
                        </span>
                        <span className="text-[11px] font-bold">
                          {cashDifference === 0
                            ? "Caja Cuadrada Exacta — Todo coincide al 100%"
                            : cashDifference > 0
                            ? "Sobrante de Efectivo en Caja"
                            : "Faltante de Efectivo en Caja"}
                        </span>
                      </div>
                    </div>
                    <span className="text-sm font-black px-2.5 py-1 rounded-xl bg-white/80 border border-current shadow-2xs">
                      {cashDifference === 0
                        ? "✓ Exacto ($0.00)"
                        : cashDifference > 0
                        ? `+${formatCurrency(cashDifference)}`
                        : `${formatCurrency(cashDifference)}`}
                    </span>
                  </div>
                )}
              </div>

              {/* APARTADO 5: DISTRIBUCIÓN DEL DINERO */}
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3.5 space-y-2.5 shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="text-base">🪙</span>
                  <span className="font-black text-stone-900 text-xs uppercase tracking-wider">
                    Distribución del Efectivo y Fondo Siguiente Turno
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-stone-800 text-[11px] block">
                    Fondo que se deja en Caja para el siguiente turno ($ MXN)
                  </label>
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
                    className="w-full px-3 py-2 bg-white rounded-xl border border-stone-300 font-bold text-stone-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  {/* Atajos de fondo */}
                  <div className="flex gap-1.5 pt-0.5">
                    {[300, 500, 800, 1000].map((fAmt) => (
                      <button
                        key={fAmt}
                        type="button"
                        onClick={() => setNextFundAmount(fAmt.toString())}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                          nextFundAmount === fAmt.toString()
                            ? "bg-amber-600 text-white border-amber-600"
                            : "bg-white text-stone-600 border-stone-200 hover:bg-stone-100"
                        }`}
                      >
                        {formatCurrency(fAmt)}
                      </button>
                    ))}
                  </div>
                </div>

                {countedCash !== "" && (
                  <div className="bg-emerald-100/70 border border-emerald-300 p-3 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">💰</span>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-950 block">
                          Efectivo a Entregar en Mano / Sobre a Don Toño:
                        </span>
                        <span className="text-[10px] text-emerald-800 font-medium">
                          Total Contado ({formatCurrency(actualCount)}) menos Fondo Dejado ({formatCurrency(Number(nextFundAmount) || 0)})
                        </span>
                      </div>
                    </div>
                    <strong className="text-sm sm:text-base font-black text-emerald-950 bg-white px-3 py-1 rounded-xl shadow-2xs border border-emerald-300">
                      {formatCurrency(Math.max(0, actualCount - (Number(nextFundAmount) || 0)))}
                    </strong>
                  </div>
                )}
              </div>

              {/* APARTADO 6: OBSERVACIONES */}
              <div className="space-y-1">
                <label className="font-bold text-stone-700 text-xs flex items-center gap-1.5">
                  <span>📝</span>
                  <span>Observaciones y Comentarios del Cierre (Opcional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej. Entrega conforme, vitrinas llenas, pendiente pan blanco..."
                  value={corteNotes}
                  onChange={(e) => setCorteNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-500 focus:outline-none text-xs"
                />
              </div>

              {/* BOTONES DE ACCIÓN */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCorteModalOpen(false)}
                  className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-2xl text-xs sm:text-sm transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-3 bg-gradient-to-r from-stone-900 via-stone-950 to-stone-900 hover:from-black hover:to-black text-white font-black rounded-2xl text-xs sm:text-sm shadow-xl shadow-stone-900/20 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer border border-stone-800"
                >
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>Confirmar y Guardar Corte Oficial</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
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
