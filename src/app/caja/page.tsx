"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
  WifiOff,
  Check,
  Users,
  User,
  Sparkles,
  Store,
  Radio
} from "lucide-react";
import { CashMovement, ShiftCutRecord } from "@/types";
import { formatCurrency, onlyNumbersKeyDown, cleanDecimalNumbers, formatDateTimeSafe, parseDateTimeSafe, getStoredShiftStartBoundary } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useBranch } from "@/context/BranchContext";
import { useNotifications, FBNotification } from "@/context/NotificationContext";
import { useSync } from "@/context/SyncContext";
import { recordCashOutflowAsExpense } from "@/lib/expenses";
import { recordCashIncome } from "@/lib/incomes";
import ShiftCutDetailModal from "@/components/caja/ShiftCutDetailModal";
import { realtimeHub } from "@/lib/realtime/realtimeHub";
import { createClient } from "@/lib/supabase/client";

export interface LiveMoneyMovement {
  id: string;
  timestamp: number | string;
  branchId: string;
  branchName: string;
  cashier: string;
  type: "venta" | "entrada" | "salida" | "corte";
  category?: string;
  categoryLabel?: string;
  concept: string;
  amount: number;
  paymentMethod: "efectivo" | "tarjeta" | "transferencia";
  source?: "pos" | "caja" | "pedidos";
  isOwner?: boolean;
}

const SAMPLE_HISTORICAL_CUTS: ShiftCutRecord[] = [];

const INITIAL_MOVEMENTS: CashMovement[] = [];

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

function getBranchBadgeColor(branchId?: string) {
  if (!branchId) return "bg-stone-100 text-stone-800 border-stone-200";
  const id = branchId.toLowerCase();
  if (id.includes("matriz")) return "bg-amber-100 text-amber-900 border-amber-300";
  if (id.includes("benito")) return "bg-blue-100 text-blue-900 border-blue-300";
  if (id.includes("flores")) return "bg-purple-100 text-purple-900 border-purple-300";
  return "bg-stone-100 text-stone-800 border-stone-200";
}

function formatLiveTime(timestamp: number | string) {
  const ts = parseDateTimeSafe(timestamp);
  if (!ts) return "Reciente";
  const d = new Date(ts);
  return d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
}

function isRecentlyCreated(timestamp: number | string) {
  const ts = parseDateTimeSafe(timestamp);
  if (!ts) return false;
  return Date.now() - ts < 10 * 60 * 1000;
}

export default function CajaPage() {
  const { user, usersList } = useAuth();
  const { branches, currentBranch, updateBranch, cashMovements, addCashMovement, isAllBranches } = useBranch();
  const { addNotification } = useNotifications();
  const { isOnline, isSyncing, pendingCount, enqueueOfflineItem } = useSync();

  // Active view tab: "historial" (Principal), "movimientos" (En tiempo real) or "turno" (Turno en vivo)
  const [activeTab, setActiveTab] = useState<"historial" | "movimientos" | "turno">("historial");

  // Realtime Live Stream state
  const [liveStreamMovements, setLiveStreamMovements] = useState<LiveMoneyMovement[]>([]);
  const [liveBranchFilter, setLiveBranchFilter] = useState<string>("all");
  const [liveCashierFilter, setLiveCashierFilter] = useState<string>("all");
  const [liveTypeFilter, setLiveTypeFilter] = useState<"all" | "venta" | "entrada" | "salida" | "corte">("all");
  const [liveSearchQuery, setLiveSearchQuery] = useState<string>("");

  // Historical shift cuts state
  const [cutsHistory, setCutsHistory] = useState<ShiftCutRecord[]>([]);
  const [selectedCutForDetail, setSelectedCutForDetail] = useState<ShiftCutRecord | null>(null);

  // Filters for history
  const [filterPeriod, setFilterPeriod] = useState<"dia" | "mes" | "ano" | "todos">("todos");
  const [selectedDayDate, setSelectedDayDate] = useState<string>(() => formatLocalDate());
  const [selectedMonthStr, setSelectedMonthStr] = useState<string>(() => formatLocalMonth());
  const [selectedYearStr, setSelectedYearStr] = useState<string>(() => new Date().getFullYear().toString());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedResponsibles, setSelectedResponsibles] = useState<string[]>([]);
  const [isResponsibleDropdownOpen, setIsResponsibleDropdownOpen] = useState(false);
  const responsibleDropdownRef = useRef<HTMLDivElement>(null);
  const [isPeriodDropdownOpen, setIsPeriodDropdownOpen] = useState(false);
  const periodDropdownRef = useRef<HTMLDivElement>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "cuadrado" | "sobrante" | "faltante">("all");

  const getStoredCajaInitialFund = (fallback: number = 0): number => {
    if (currentBranch?.currentShift?.initialFund !== undefined) {
      return currentBranch.currentShift.initialFund;
    }
    try {
      const saved = localStorage.getItem("brito_pos_initial_fund");
      if (saved && !isNaN(Number(saved))) return Number(saved);
      const raw = localStorage.getItem("brito_shift_cuts_history");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0].nextFund === "number") {
          return parsed[0].nextFund;
        }
      }
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
            const shiftStart = getStoredShiftStartBoundary(currentBranch?.id);
            const filtered = list.filter((s: any) => {
              const t = parseDateTimeSafe(s.timestamp || s.createdAt || s.date);
              return shiftStart <= 0 || (t > 0 && t >= shiftStart);
            });
            const sum = filtered.filter((s: any) => s.paymentMethod === "efectivo").reduce((acc: number, s: any) => acc + (Number(s.total) || 0), 0);
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
            const shiftStart = getStoredShiftStartBoundary(currentBranch?.id);
            const filtered = list.filter((s: any) => {
              const t = parseDateTimeSafe(s.timestamp || s.createdAt || s.date);
              return shiftStart <= 0 || (t > 0 && t >= shiftStart);
            });
            const sum = filtered.filter((s: any) => s.paymentMethod === "tarjeta").reduce((acc: number, s: any) => acc + (Number(s.total) || 0), 0);
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
            const shiftStart = getStoredShiftStartBoundary(currentBranch?.id);
            const filtered = list.filter((s: any) => {
              const t = parseDateTimeSafe(s.timestamp || s.createdAt || s.date);
              return shiftStart <= 0 || (t > 0 && t >= shiftStart);
            });
            const sum = filtered.filter((s: any) => s.paymentMethod === "transferencia").reduce((acc: number, s: any) => acc + (Number(s.total) || 0), 0);
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
    setCountedCash(expectedCashInDrawer > 0 ? expectedCashInDrawer.toString() : "0");
    setIsCorteModalOpen(true);
  };

  // Load and sync cuts history from localStorage with mathematical verification
  const loadCutsHistory = useCallback(() => {
    try {
      const raw = localStorage.getItem("brito_shift_cuts_history");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const realCuts = parsed.filter(c => c && c.id !== "CORTE-948210" && c.id !== "CORTE-893120" && c.id !== "CORTE-892401");
          // Normalizar y verificar cuadre matemático exacto de todos los cortes
          const normalized: ShiftCutRecord[] = realCuts.map((item: ShiftCutRecord) => {
            const initialFund = typeof item.initialFund === "number" && !isNaN(item.initialFund) ? item.initialFund : 0;
            const cashSales = typeof item.cashSales === "number" && !isNaN(item.cashSales) ? item.cashSales : 0;
            const totalIncomes = typeof item.totalIncomes === "number" && !isNaN(item.totalIncomes) ? item.totalIncomes : 0;
            const totalExpenses = typeof item.totalExpenses === "number" && !isNaN(item.totalExpenses) ? item.totalExpenses : 0;
            const expectedCash = typeof item.expectedCash === "number" && !isNaN(item.expectedCash)
              ? item.expectedCash
              : Math.max(0, initialFund + cashSales + totalIncomes - totalExpenses);
            const countedCash = typeof item.countedCash === "number" && !isNaN(item.countedCash)
              ? item.countedCash
              : expectedCash;
            const difference = typeof item.difference === "number" && !isNaN(item.difference)
              ? item.difference
              : (countedCash - expectedCash);

            return {
              ...item,
              initialFund,
              cashSales,
              totalIncomes,
              totalExpenses,
              expectedCash,
              countedCash,
              difference,
              responsible: item.responsible || item.outgoingCashier || "Responsable de Caja",
              branchId: item.branchId || "branch-matriz",
              branchName: item.branchName || "Sucursal Matriz (Centro)",
            };
          });
          setCutsHistory(normalized);
          if (realCuts.length !== parsed.length) {
            localStorage.setItem("brito_shift_cuts_history", JSON.stringify(realCuts));
          }
          return;
        }
      }
      setCutsHistory([]);
    } catch (e) {
      console.error("Error al cargar historial de caja:", e);
      setCutsHistory([]);
    }
  }, []);

  // Carga inicial y agregación de movimientos en vivo de todas las terminales y sucursales
  const loadLiveMovements = useCallback(() => {
    try {
      const items: LiveMoneyMovement[] = [];

      // 1. Ventas
      const salesRaw = localStorage.getItem("brito_pos_master_sales") || localStorage.getItem("brito_pos_current_sales");
      if (salesRaw) {
        try {
          const list = JSON.parse(salesRaw);
          if (Array.isArray(list)) {
            list.forEach((s: any) => {
              if (!s) return;
              items.push({
                id: s.id,
                timestamp: s.timestamp || s.createdAt || s.date || Date.now(),
                branchId: s.branchId || "branch-matriz",
                branchName: s.branchName || "Sucursal Matriz",
                cashier: s.cashier || "Cajero",
                type: "venta",
                category: "venta_mostrador",
                categoryLabel: s.isCustomOrder ? "Pedido Especial" : "Venta Mostrador",
                concept: s.isCustomOrder ? `Liquidación/Anticipo Pedido ${s.id}` : `Venta mostrador (${(s.items || []).length} pzas)`,
                amount: Number(s.total) || 0,
                paymentMethod: s.paymentMethod || "efectivo",
                source: "pos",
              });
            });
          }
        } catch {}
      }

      // 2. Gastos y Retiros de Dueño
      const expRaw = localStorage.getItem("brito_pos_current_expenses") || localStorage.getItem("brito_expenses");
      if (expRaw) {
        try {
          const list = JSON.parse(expRaw);
          if (Array.isArray(list)) {
            list.forEach((e: any) => {
              if (!e) return;
              items.push({
                id: e.id,
                timestamp: e.timestamp || e.createdAt || e.date || Date.now(),
                branchId: e.branchId || "branch-matriz",
                branchName: e.branchName || "Sucursal Matriz",
                cashier: e.cashier || "Cajero",
                type: "salida",
                category: e.category || "gasto",
                categoryLabel: e.category === "retiro_dueno" || e.isOwner ? "👑 Retiro Dueño" : "Salida / Gasto",
                concept: e.description || "Gasto en caja",
                amount: Number(e.amount) || 0,
                paymentMethod: e.paymentMethod || "efectivo",
                source: "caja",
                isOwner: e.isOwner || e.category === "retiro_dueno",
              });
            });
          }
        } catch {}
      }

      // 3. Entradas de Caja / Aportaciones
      const incRaw = localStorage.getItem("brito_pos_current_incomes") || localStorage.getItem("brito_incomes");
      if (incRaw) {
        try {
          const list = JSON.parse(incRaw);
          if (Array.isArray(list)) {
            list.forEach((i: any) => {
              if (!i) return;
              items.push({
                id: i.id,
                timestamp: i.timestamp || i.date || Date.now(),
                branchId: i.branchId || "branch-matriz",
                branchName: i.branchName || "Sucursal Matriz",
                cashier: i.cashier || "Cajero",
                type: "entrada",
                category: i.category || "ingreso",
                categoryLabel: i.categoryLabel || "🪙 Entrada Dinero",
                concept: i.concept || i.description || "Aportación a caja",
                amount: Number(i.amount) || 0,
                paymentMethod: i.paymentMethod || "efectivo",
                source: "caja",
              });
            });
          }
        } catch {}
      }

      // 4. Cortes de Caja
      const cutsRaw = localStorage.getItem("brito_shift_cuts_history");
      if (cutsRaw) {
        try {
          const list = JSON.parse(cutsRaw);
          if (Array.isArray(list)) {
            list.forEach((c: any) => {
              if (!c) return;
              items.push({
                id: c.id,
                timestamp: c.timestamp || parseDateTimeSafe(c.date) || Date.now(),
                branchId: c.branchId || "branch-matriz",
                branchName: c.branchName || "Sucursal Matriz",
                cashier: c.outgoingCashier || c.responsible || "Cajero",
                type: "corte",
                category: "corte_caja",
                categoryLabel: "🏁 Corte de Turno",
                concept: `Cierre: ${c.difference === 0 ? "Cuadrada Exacta ($0.00)" : `Diferencia ${formatCurrency(c.difference)}`} | Fondo: ${formatCurrency(c.nextFund || 0)}`,
                amount: Number(c.countedCash) || 0,
                paymentMethod: "efectivo",
                source: "caja",
              });
            });
          }
        } catch {}
      }

      // Ordenar cronológicamente descendente los registros locales
      items.sort((a, b) => {
        const tA = parseDateTimeSafe(a.timestamp);
        const tB = parseDateTimeSafe(b.timestamp);
        return tB - tA;
      });

      setLiveStreamMovements(items);

      // 5. Consultar movimientos en tiempo real desde Supabase para supervisión en vivo
      if (typeof window !== "undefined") {
        try {
          const supabase = createClient();
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          const todayIso = todayStart.toISOString();

          Promise.allSettled([
            supabase
              .from("sales")
              .select("id, branch_id, total, payment_method, cashier, date, created_at")
              .gte("created_at", todayIso),
            supabase
              .from("custom_orders")
              .select("id, order_number, customer_name, branch_id, branch_name, description, total, deposit, remaining_balance, payment_status, payment_method, cashier, created_at")
              .gte("created_at", todayIso),
            supabase
              .from("cash_movements")
              .select("id, branch_id, type, category, category_label, amount, reason, authorized_by, created_at")
              .gte("created_at", todayIso),
            supabase
              .from("cash_expenses")
              .select("id, branch_id, amount, category, description, cashier, created_at")
              .gte("created_at", todayIso),
            supabase
              .from("cash_shifts")
              .select("id, shift_name, cashier_name, branch_id, opened_at, initial_cash, actual_cash, expected_cash, difference")
              .gte("opened_at", todayIso),
          ]).then(([salesRes, ordersRes, movsRes, expsRes, cutsRes]) => {
            const dbSales = salesRes.status === "fulfilled" && !salesRes.value.error ? salesRes.value.data || [] : [];
            const dbOrders = ordersRes.status === "fulfilled" && !ordersRes.value.error ? ordersRes.value.data || [] : [];
            const dbMovs = movsRes.status === "fulfilled" && !movsRes.value.error ? movsRes.value.data || [] : [];
            const dbExps = expsRes.status === "fulfilled" && !expsRes.value.error ? expsRes.value.data || [] : [];
            const dbCuts = cutsRes.status === "fulfilled" && !cutsRes.value.error ? cutsRes.value.data || [] : [];

            const remoteItems: LiveMoneyMovement[] = [];

            // A) Ventas
            dbSales.forEach((s: any) => {
              remoteItems.push({
                id: s.id,
                timestamp: s.created_at || s.date || Date.now(),
                branchId: s.branch_id || "branch-matriz",
                branchName: s.branch_id || "Sucursal Matriz",
                cashier: s.cashier || "Cajero",
                type: "venta",
                category: "venta_mostrador",
                categoryLabel: "Venta Mostrador",
                concept: `Venta mostrador ticket #${s.id}`,
                amount: Number(s.total) || 0,
                paymentMethod: s.payment_method || "efectivo",
                source: "pos",
              });
            });

            // B) Pedidos con anticipo o pago
            dbOrders.forEach((o: any) => {
              const deposit = Number(o.deposit) || 0;
              if (deposit > 0) {
                remoteItems.push({
                  id: `ord-${o.id}`,
                  timestamp: o.created_at || Date.now(),
                  branchId: o.branch_id || "branch-matriz",
                  branchName: o.branch_name || "Sucursal Matriz",
                  cashier: o.cashier || "Cajero",
                  type: "entrada",
                  category: "abono_pedido",
                  categoryLabel: o.remaining_balance === 0 ? "Liquidación Pedido" : "Anticipo Pedido",
                  concept: `Pedido #${o.order_number || o.id} (${o.customer_name || "Cliente"}): ${o.description || "Pedido especial"}`,
                  amount: deposit,
                  paymentMethod: o.payment_method || "efectivo",
                  source: "pedidos",
                });
              }
            });

            // C) Gastos
            dbExps.forEach((e: any) => {
              remoteItems.push({
                id: e.id,
                timestamp: e.created_at || Date.now(),
                branchId: e.branch_id || "branch-matriz",
                branchName: e.branch_id || "Sucursal Matriz",
                cashier: e.cashier || "Cajero",
                type: "salida",
                category: e.category || "gasto",
                categoryLabel: e.category === "retiro_dueno" ? "👑 Retiro Dueño" : "Salida / Gasto",
                concept: e.description || "Gasto en caja",
                amount: Number(e.amount) || 0,
                paymentMethod: "efectivo",
                source: "caja",
                isOwner: e.category === "retiro_dueno",
              });
            });

            // D) Movimientos manuales
            dbMovs.forEach((m: any) => {
              if (m.category === "venta_mostrador") return;
              remoteItems.push({
                id: m.id,
                timestamp: m.created_at || Date.now(),
                branchId: m.branch_id || "branch-matriz",
                branchName: m.branch_id || "Sucursal Matriz",
                cashier: m.authorized_by || "Cajero",
                type: m.type as any,
                category: m.category || "otro",
                categoryLabel: m.category_label || (m.type === "entrada" ? "🪙 Entrada Dinero" : "Salida / Gasto"),
                concept: m.reason || "Movimiento de caja",
                amount: Number(m.amount) || 0,
                paymentMethod: "efectivo",
                source: "caja",
              });
            });

            // E) Cortes
            dbCuts.forEach((c: any) => {
              remoteItems.push({
                id: c.id,
                timestamp: c.opened_at || Date.now(),
                branchId: c.branch_id || "branch-matriz",
                branchName: c.branch_id || "Sucursal Matriz",
                cashier: c.cashier_name || "Cajero",
                type: "corte",
                category: "corte_caja",
                categoryLabel: "🏁 Corte de Turno",
                concept: `Corte de turno (${c.shift_name || "Turno"}). Cajero: ${c.cashier_name}. Fondo: ${formatCurrency(c.initial_cash || 1000)}`,
                amount: Number(c.actual_cash || c.expected_cash || 0),
                paymentMethod: "efectivo",
                source: "caja",
              });
            });

            if (remoteItems.length > 0) {
              setLiveStreamMovements((prevLocal) => {
                const map = new Map<string, LiveMoneyMovement>();
                prevLocal.forEach((it) => map.set(it.id, it));
                remoteItems.forEach((it) => map.set(it.id, it));

                const merged = Array.from(map.values()).sort((a, b) => {
                  const tA = parseDateTimeSafe(a.timestamp);
                  const tB = parseDateTimeSafe(b.timestamp);
                  return tB - tA;
                });
                return merged;
              });
            }
          });
        } catch {}
      }
    } catch (err) {
      console.error("Error loading live movements:", err);
    }
  }, []);

  useEffect(() => {
    loadCutsHistory();

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      const corteIdParam = params.get("corteId");

      if (tabParam === "historial" || tabParam === "turno") {
        setActiveTab(tabParam as "historial" | "turno");
      }

      if (corteIdParam) {
        try {
          const raw = localStorage.getItem("brito_shift_cuts_history");
          const list = raw ? JSON.parse(raw) : SAMPLE_HISTORICAL_CUTS;
          const found = list.find((c: ShiftCutRecord) => c.id.toLowerCase() === corteIdParam.toLowerCase());
          if (found) {
            setSelectedCutForDetail(found);
          }
        } catch {}
      }
    }

    const handleSync = () => {
      loadCutsHistory();
      loadLiveMovements();
      setInitialCash(getStoredCajaInitialFund(0));
      try {
        const raw = localStorage.getItem("brito_pos_current_sales");
        let list: any[] = [];
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) list = [...parsed];
        }
        const masterRaw = localStorage.getItem("brito_pos_master_sales");
        if (masterRaw) {
          try {
            const masterParsed = JSON.parse(masterRaw);
            if (Array.isArray(masterParsed)) {
              for (const ms of masterParsed) {
                if (ms && !list.some((s) => s.id === ms.id)) {
                  list.push(ms);
                }
              }
            }
          } catch {}
        }

        if (list.length > 0) {
          const shiftStart = getStoredShiftStartBoundary(currentBranch?.id);
          const filtered = list.filter((s: any) => {
            if (!s) return false;
            if (currentBranch && currentBranch.id && currentBranch.id !== "all") {
              const sBranch = s.branchId || s.branch_id;
              if (sBranch) {
                if (sBranch !== currentBranch.id) return false;
              } else {
                if (currentBranch.id !== "branch-matriz") return false;
              }
            }
            const t = parseDateTimeSafe(s.timestamp || s.createdAt || s.date);
            return shiftStart <= 0 || (t > 0 && t >= shiftStart);
          });
          const cSum = filtered.filter((s: any) => s.paymentMethod === "efectivo").reduce((acc: number, s: any) => acc + (Number(s.total) || 0), 0);
          const kSum = filtered.filter((s: any) => s.paymentMethod === "tarjeta").reduce((acc: number, s: any) => acc + (Number(s.total) || 0), 0);
          const tSum = filtered.filter((s: any) => s.paymentMethod === "transferencia").reduce((acc: number, s: any) => acc + (Number(s.total) || 0), 0);

          // Anticipos en efectivo de pedidos especiales para cuadrar exactamente con POS
          let ordersCash = 0;
          try {
            const rawOrders = localStorage.getItem("brito_custom_orders");
            if (rawOrders) {
              const ords = JSON.parse(rawOrders);
              if (Array.isArray(ords)) {
                ords.forEach((o: any) => {
                  if (!o || o.status === "cancelado") return;
                  if (currentBranch && currentBranch.id && currentBranch.id !== "all") {
                    const oBranch = o.branchId || o.branch_id;
                    if (oBranch && oBranch !== currentBranch.id) return;
                  }
                  const ot = parseDateTimeSafe(o.timestamp || o.createdAt || o.date);
                  if (shiftStart <= 0 || (ot > 0 && ot >= shiftStart)) {
                    if ((o.paymentMethod === "efectivo" || !o.paymentMethod) && !filtered.some((s) => s.id === o.orderNumber || s.id === o.id)) {
                      ordersCash += Number(o.deposit) || 0;
                    }
                  }
                });
              }
            }
          } catch {}

          setCashSales(cSum + ordersCash);
          setCardSales(kSum);
          setTransferSales(tSum);
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

    handleSync();

    // Suscripción WebSocket / Broadcast en tiempo real para el Administrador
    const unsubSale = realtimeHub.onSale((salePayload) => {
      const newLiveItem: LiveMoneyMovement = {
        id: salePayload.id,
        timestamp: Date.now(),
        branchId: salePayload.branchId,
        branchName: salePayload.branchName,
        cashier: salePayload.cashier || "Cajero",
        type: "venta",
        category: "venta_mostrador",
        categoryLabel: "Venta Mostrador",
        concept: `Venta mostrador por ${formatCurrency(salePayload.total)} [${salePayload.paymentMethod.toUpperCase()}]`,
        amount: salePayload.total,
        paymentMethod: salePayload.paymentMethod,
        source: "pos",
      };
      setLiveStreamMovements((prev) => [newLiveItem, ...prev.filter((p) => p.id !== newLiveItem.id)]);
      handleSync();
    });

    const unsubCash = realtimeHub.onCashMovement((movPayload) => {
      const newLiveItem: LiveMoneyMovement = {
        id: movPayload.id,
        timestamp: Date.now(),
        branchId: movPayload.branchId,
        branchName: movPayload.branchName,
        cashier: movPayload.cashier || "Cajero",
        type: movPayload.type,
        category: movPayload.type === "salida" ? "gasto" : "entrada",
        categoryLabel: movPayload.type === "salida" ? "💸 Salida / Gasto" : "🪙 Entrada Dinero",
        concept: movPayload.reason,
        amount: movPayload.amount,
        paymentMethod: "efectivo",
        source: "caja",
      };
      setLiveStreamMovements((prev) => [newLiveItem, ...prev.filter((p) => p.id !== newLiveItem.id)]);
      handleSync();
    });

    const unsubCut = realtimeHub.onShiftCut((cut) => {
      const newLiveItem: LiveMoneyMovement = {
        id: cut.id,
        timestamp: cut.timestamp || Date.now(),
        branchId: cut.branchId || "branch-matriz",
        branchName: cut.branchName || "Matriz (Centro)",
        cashier: cut.outgoingCashier || "Cajero",
        type: "corte",
        category: "corte_caja",
        categoryLabel: "🏁 Corte de Turno",
        concept: `Cierre: ${cut.difference === 0 ? "Cuadrada Exacta ($0.00)" : `Diferencia ${formatCurrency(cut.difference)}`} | Fondo: ${formatCurrency(cut.nextFund || 0)}`,
        amount: cut.countedCash,
        paymentMethod: "efectivo",
        source: "caja",
      };
      setLiveStreamMovements((prev) => [newLiveItem, ...prev.filter((p) => p.id !== newLiveItem.id)]);
      loadCutsHistory();
      handleSync();
    });

    const unsubOrder = realtimeHub.onOrder((orderPayload) => {
      if (orderPayload.order && Number(orderPayload.order.deposit) > 0) {
        const o = orderPayload.order;
        const newLiveItem: LiveMoneyMovement = {
          id: `ord-dep-${o.id}-${Date.now().toString().slice(-4)}`,
          timestamp: Date.now(),
          branchId: o.branchId || "branch-matriz",
          branchName: o.branchName || "Sucursal Matriz",
          cashier: (o as any).cashier || "Cajero",
          type: "entrada",
          category: "abono_pedido",
          categoryLabel: "Abono / Anticipo Pedido",
          concept: `Anticipo recibido para pedido #${o.orderNumber || o.id} (${o.customerName || "Cliente"})`,
          amount: Number(o.deposit) || 0,
          paymentMethod: (o.paymentMethod as any) || "efectivo",
          source: "pedidos",
        };
        setLiveStreamMovements((prev) => [newLiveItem, ...prev.filter((p) => p.id !== newLiveItem.id)]);
        handleSync();
      }
    });

    // Suscripción directa a Supabase Realtime postgres_changes para ver movimientos de todos los cajeros al instante
    let supabaseChannel: any = null;
    try {
      const supabase = createClient();
      supabaseChannel = supabase
        .channel("caja_page_supabase_realtime")
        .on("postgres_changes", { event: "*", schema: "public", table: "sales" }, () => handleSync())
        .on("postgres_changes", { event: "*", schema: "public", table: "custom_orders" }, () => handleSync())
        .on("postgres_changes", { event: "*", schema: "public", table: "cash_movements" }, () => handleSync())
        .on("postgres_changes", { event: "*", schema: "public", table: "cash_expenses" }, () => handleSync())
        .on("postgres_changes", { event: "*", schema: "public", table: "cash_shifts" }, () => handleSync())
        .subscribe();
    } catch {}

    const pollInterval = setInterval(() => {
      handleSync();
    }, 3000);

    window.addEventListener("brito_shift_cuts_updated", handleSync);
    window.addEventListener("storage", handleSync);
    window.addEventListener("brito_incomes_updated", handleSync);
    window.addEventListener("brito_sales_updated", handleSync);
    window.addEventListener("brito_caja_updated", handleSync);
    window.addEventListener("focus", handleSync);
    return () => {
      clearInterval(pollInterval);
      unsubSale();
      unsubCash();
      unsubCut();
      unsubOrder();
      window.removeEventListener("brito_shift_cuts_updated", handleSync);
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("brito_incomes_updated", handleSync);
      window.removeEventListener("brito_sales_updated", handleSync);
      window.removeEventListener("brito_caja_updated", handleSync);
      window.removeEventListener("focus", handleSync);
      if (supabaseChannel) {
        try {
          const supabase = createClient();
          supabase.removeChannel(supabaseChannel);
        } catch {}
      }
    };
  }, [currentBranch?.id, loadCutsHistory, loadLiveMovements]);

  // URL query params handling (?tab=historial, ?tab=turno, ?tab=entradas, ?tab=salidas)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab === "historial" || tab === "turno") {
        setActiveTab("historial");
      } else if (tab === "entradas") {
        setActiveTab("historial");
        setMovementType("entrada");
        setMovCategory("abono_cliente");
        setIsMovementModalOpen(true);
      } else if (tab === "salidas") {
        setActiveTab("historial");
        setMovementType("salida");
        setMovCategory("compra_insumos");
        setIsMovementModalOpen(true);
      }
    }
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (responsibleDropdownRef.current && !responsibleDropdownRef.current.contains(event.target as Node)) {
        setIsResponsibleDropdownOpen(false);
      }
      if (periodDropdownRef.current && !periodDropdownRef.current.contains(event.target as Node)) {
        setIsPeriodDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sincronización en vivo del turno con la sucursal activa en la barra superior
  useEffect(() => {
    if (currentBranch) {
      if (currentBranch.currentShift) {
        if (currentBranch.currentShift.initialFund !== undefined) {
          setInitialCash(currentBranch.currentShift.initialFund);
        }
        if (currentBranch.currentShift.cashSales !== undefined) {
          setCashSales(currentBranch.currentShift.cashSales);
        }
        if (currentBranch.currentShift.cardSales !== undefined) {
          setCardSales(currentBranch.currentShift.cardSales);
        }
        if (currentBranch.currentShift.transferSales !== undefined) {
          setTransferSales(currentBranch.currentShift.transferSales);
        }
      } else if (currentBranch.todaySales !== undefined) {
        setCashSales(currentBranch.todaySales);
      }
    }
  }, [currentBranch?.id, currentBranch?.currentShift, currentBranch?.todaySales]);

  // Live calculations
  const effectiveMovements = useMemo(() => {
    const shiftStart = getStoredShiftStartBoundary(currentBranch?.id);
    let combined = [...movements];

    // 1. Movimientos desde BranchContext
    if (cashMovements && cashMovements.length > 0) {
      const filtered = cashMovements.filter((m) => {
        if (!m) return false;
        if (!isAllBranches && currentBranch && currentBranch.id && currentBranch.id !== "all") {
          if (m.branchId && m.branchId !== currentBranch.id) return false;
        }
        return true;
      });
      const mapped: CashMovement[] = filtered.map((m) => ({
        id: m.id,
        shiftId: "shift-live",
        type: m.type,
        category: m.category as any,
        categoryLabel: m.categoryLabel,
        amount: m.amount,
        reason: m.reason,
        authorizedBy: m.authorizedBy,
        timestamp: m.timestamp,
      }));
      for (const m of mapped) {
        if (!combined.some((c) => c.id === m.id)) {
          combined.push(m);
        }
      }
    }

    // 2. Gastos activos del turno desde el POS
    try {
      const rawExp = localStorage.getItem("brito_pos_current_expenses");
      if (rawExp) {
        const parsed = JSON.parse(rawExp);
        if (Array.isArray(parsed)) {
          parsed.forEach((e: any) => {
            if (!e) return;
            if (!isAllBranches && currentBranch && currentBranch.id && currentBranch.id !== "all") {
              const bId = e.branchId || e.branch_id;
              if (bId && bId !== currentBranch.id) return;
            }
            if (!combined.some((c) => c.id === e.id || c.id === `mov-${e.id}`)) {
              combined.push({
                id: e.id,
                shiftId: "shift-live",
                type: "salida",
                category: (e.category || "gasto") as any,
                categoryLabel: e.category === "retiro_dueno" || e.isOwner ? "👑 Retiro Dueño" : "Salida / Gasto",
                amount: Number(e.amount) || 0,
                reason: e.description || "Gasto en caja",
                authorizedBy: e.cashier || "Cajero",
                timestamp: e.timestamp || e.date || e.createdAt || new Date().toISOString(),
              });
            }
          });
        }
      }
    } catch {}

    // 3. Entradas activas del turno desde el POS
    try {
      const rawInc = localStorage.getItem("brito_pos_current_incomes");
      if (rawInc) {
        const parsed = JSON.parse(rawInc);
        if (Array.isArray(parsed)) {
          parsed.forEach((i: any) => {
            if (!i) return;
            if (!isAllBranches && currentBranch && currentBranch.id && currentBranch.id !== "all") {
              const bId = i.branchId || i.branch_id;
              if (bId && bId !== currentBranch.id) return;
            }
            if (!combined.some((c) => c.id === i.id)) {
              combined.push({
                id: i.id,
                shiftId: "shift-live",
                type: "entrada",
                category: (i.category || "otro") as any,
                categoryLabel: i.categoryLabel || "🪙 Entrada Dinero",
                amount: Number(i.amount) || 0,
                reason: i.concept || "Entrada a caja",
                authorizedBy: i.cashier || "Cajero",
                timestamp: i.timestamp || i.date || new Date().toISOString(),
              });
            }
          });
        }
      }
    } catch {}

    return combined.filter((m) => {
      if (!m) return false;
      const t = parseDateTimeSafe(m.timestamp);
      return shiftStart <= 0 || (t > 0 && t >= shiftStart);
    });
  }, [cashMovements, currentBranch?.id, isAllBranches, movements]);

  const entryMovements = effectiveMovements.filter((m) => m.type === "entrada");
  const totalEntries = entryMovements.reduce((sum, m) => sum + m.amount, 0);
  const totalExpenses = effectiveMovements.filter((m) => m.type === "salida").reduce((sum, m) => sum + m.amount, 0);
  const expectedCashInDrawer = initialCash + cashSales + totalEntries - totalExpenses;
  const liveCountedValue = countedCash !== "" && !isNaN(Number(countedCash)) ? Number(countedCash) : expectedCashInDrawer;
  const liveCashDifference = liveCountedValue - expectedCashInDrawer;
  const liveDeliveredToOwner = Math.max(0, liveCountedValue - (Number(nextFundAmount) || 0));

  // Active shift responsible name
  const currentShiftResponsible = currentBranch?.currentShift?.cashier || currentBranch?.manager || user?.name || "Lupita Brito (Cajera 1)";

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

  // Distinct Responsibles list for filter dropdown
  const uniqueResponsibles = useMemo(() => {
    const set = new Set<string>();
    cutsHistory.forEach((c) => {
      const name = c.responsible || c.outgoingCashier;
      if (name) set.add(name);
    });
    return Array.from(set);
  }, [cutsHistory]);

  const isAllResponsiblesSelected =
    selectedResponsibles.length === 0 ||
    (selectedResponsibles.length === uniqueResponsibles.length && !selectedResponsibles.includes("__none__"));

  const isResponsibleChecked = (resp: string) => {
    if (selectedResponsibles.includes("__none__")) return false;
    if (selectedResponsibles.length === 0) return true;
    return selectedResponsibles.includes(resp);
  };

  const toggleResponsible = (resp: string) => {
    if (selectedResponsibles.includes("__none__")) {
      setSelectedResponsibles([resp]);
      return;
    }
    if (selectedResponsibles.length === 0) {
      // Deselect this one from the full group
      setSelectedResponsibles(uniqueResponsibles.filter((r) => r !== resp));
      return;
    }
    if (selectedResponsibles.includes(resp)) {
      const next = selectedResponsibles.filter((r) => r !== resp);
      if (next.length === 0) {
        setSelectedResponsibles(["__none__"]);
      } else {
        setSelectedResponsibles(next);
      }
    } else {
      const next = [...selectedResponsibles, resp];
      if (next.length === uniqueResponsibles.length) {
        setSelectedResponsibles([]);
      } else {
        setSelectedResponsibles(next);
      }
    }
  };

  const selectOnlyResponsible = (resp: string) => {
    setSelectedResponsibles([resp]);
  };

  const selectAllResponsibles = () => {
    setSelectedResponsibles([]);
  };

  const clearAllResponsibles = () => {
    setSelectedResponsibles(["__none__"]);
  };

  const availableYears = useMemo(() => {
    const currentY = new Date().getFullYear();
    const set = new Set<string>([
      currentY.toString(),
      (currentY - 1).toString(),
      (currentY - 2).toString(),
      "2026",
      "2025",
      "2024",
    ]);
    cutsHistory.forEach((c) => {
      const parts = getCutDateParts(c);
      if (parts.year) set.add(parts.year);
    });
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [cutsHistory]);

  // Filtered cuts history (Period + Search + Responsible + Status + Branch)
  const filteredCuts = useMemo(() => {
    return periodCuts.filter((cut) => {
      // 0. Filter by branch
      if (!isAllBranches && currentBranch && currentBranch.id && currentBranch.id !== "all") {
        const cutBranch = (cut as any).branchId || (cut as any).branch_id;
        if (cutBranch) {
          if (cutBranch !== currentBranch.id) return false;
        } else {
          if (currentBranch.id !== "branch-matriz") return false;
        }
      }

      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = cut.id.toLowerCase().includes(q);
        const matchResp = (cut.responsible || "").toLowerCase().includes(q);
        const matchOutgoing = (cut.outgoingCashier || "").toLowerCase().includes(q);
        const matchIncoming = (cut.incomingCashier || "").toLowerCase().includes(q);
        const matchNotes = (cut.notes || "").toLowerCase().includes(q);
        const matchDate = (cut.date || "").toLowerCase().includes(q);
        const matchBranch = (cut.branchName || "").toLowerCase().includes(q);
        if (!matchId && !matchResp && !matchOutgoing && !matchIncoming && !matchNotes && !matchDate && !matchBranch) {
          return false;
        }
      }

      // 2. Filter Responsible (Multi-select)
      if (selectedResponsibles.includes("__none__")) {
        return false;
      }
      if (selectedResponsibles.length > 0 && selectedResponsibles.length < uniqueResponsibles.length) {
        const resp = cut.responsible || cut.outgoingCashier || "";
        if (!selectedResponsibles.includes(resp)) {
          return false;
        }
      }

      // 3. Filter Status
      if (filterStatus === "cuadrado" && cut.difference !== 0) return false;
      if (filterStatus === "sobrante" && cut.difference <= 0) return false;
      if (filterStatus === "faltante" && cut.difference >= 0) return false;

      return true;
    });
  }, [periodCuts, searchQuery, selectedResponsibles, uniqueResponsibles, filterStatus, isAllBranches, currentBranch?.id]);

  // Realtime Live Stream Movements (Filtered by Branch, Cashier, Type, Search)
  const filteredLiveMovements = useMemo(() => {
    return liveStreamMovements.filter((m) => {
      // 1. Branch filter
      if (liveBranchFilter !== "all" && m.branchId !== liveBranchFilter) return false;

      // 2. Cashier filter
      if (liveCashierFilter !== "all" && m.cashier !== liveCashierFilter) return false;

      // 3. Type filter
      if (liveTypeFilter !== "all") {
        if (liveTypeFilter === "corte" && m.type !== "corte") return false;
        if (liveTypeFilter === "venta" && m.type !== "venta") return false;
        if (liveTypeFilter === "entrada" && m.type !== "entrada") return false;
        if (liveTypeFilter === "salida" && m.type !== "salida") return false;
      }

      // 4. Search query
      if (liveSearchQuery.trim()) {
        const q = liveSearchQuery.toLowerCase();
        const matchConcept = (m.concept || "").toLowerCase().includes(q);
        const matchCashier = (m.cashier || "").toLowerCase().includes(q);
        const matchBranch = (m.branchName || "").toLowerCase().includes(q);
        const matchId = (m.id || "").toLowerCase().includes(q);
        if (!matchConcept && !matchCashier && !matchBranch && !matchId) return false;
      }

      return true;
    });
  }, [liveStreamMovements, liveBranchFilter, liveCashierFilter, liveTypeFilter, liveSearchQuery]);

  // Live Stream KPIs
  const liveKpis = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    let cashBalance = 0;

    filteredLiveMovements.forEach((m) => {
      if (m.type === "venta" || m.type === "entrada") {
        totalIn += m.amount;
        if (m.paymentMethod === "efectivo") cashBalance += m.amount;
      } else if (m.type === "salida") {
        totalOut += m.amount;
        if (m.paymentMethod === "efectivo") cashBalance -= m.amount;
      }
    });

    return {
      totalIn,
      totalOut,
      netCash: cashBalance,
      count: filteredLiveMovements.length,
    };
  }, [filteredLiveMovements]);

  // Unique cashiers for live stream filter
  const uniqueLiveCashiers = useMemo(() => {
    const set = new Set<string>();
    liveStreamMovements.forEach((m) => {
      if (m.cashier) set.add(m.cashier);
    });
    return Array.from(set);
  }, [liveStreamMovements]);

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

  // Latest Cut for quick preview in empty state
  const latestCut = useMemo(() => {
    return cutsHistory.length > 0 ? cutsHistory[0] : null;
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

    const targetBranchId = currentBranch?.id || "branch-matriz";
    if (addCashMovement) {
      addCashMovement(targetBranchId, {
        type: movementType,
        category: movCategory as any,
        categoryLabel: labels[movCategory] || "Movimiento de Caja",
        amount: Number(movAmount),
        reason: movReason || "Sin descripción",
        authorizedBy: user?.name || "Don Toño Brito",
      });
    }

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

    const parsedCounted = countedCash !== "" && !isNaN(Number(countedCash)) ? Number(countedCash) : expectedCashInDrawer;
    const parsedNextFund = Number(nextFundAmount) || 0;
    if (parsedCounted > 0 && parsedNextFund > parsedCounted) {
      alert(`El fondo para el siguiente turno (${formatCurrency(parsedNextFund)}) no puede ser mayor que el total en caja (${formatCurrency(parsedCounted)}).`);
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
      branchId: currentBranch?.id || "branch-matriz",
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
      const targetBranchId = currentBranch?.id || "branch-matriz";
      const cutTs = newCut.timestamp || Date.now();
      localStorage.setItem("brito_shift_start_" + targetBranchId, cutTs.toString());
      localStorage.setItem("brito_current_shift_start_timestamp", cutTs.toString());
      localStorage.setItem("brito_current_shift_cashier", recipient);
      localStorage.setItem(`brito_pos_initial_fund_${targetBranchId}`, parsedNextFund.toString());
      if (targetBranchId === "branch-matriz") {
        localStorage.setItem("brito_pos_initial_fund", parsedNextFund.toString());
      }

      // Preservar ventas, gastos e ingresos de las otras sucursales
      try {
        const curSales = JSON.parse(localStorage.getItem("brito_pos_current_sales") || "[]");
        const remainingSales = Array.isArray(curSales)
          ? curSales.filter((s: any) => {
              const bId = s.branchId || s.branch_id;
              return bId && bId !== targetBranchId;
            })
          : [];
        localStorage.setItem("brito_pos_current_sales", JSON.stringify(remainingSales));
      } catch {}

      try {
        const curExp = JSON.parse(localStorage.getItem("brito_pos_current_expenses") || "[]");
        const remainingExp = Array.isArray(curExp)
          ? curExp.filter((e: any) => {
              const bId = e.branchId || e.branch_id;
              return bId && bId !== targetBranchId;
            })
          : [];
        localStorage.setItem("brito_pos_current_expenses", JSON.stringify(remainingExp));
      } catch {}

      try {
        const curInc = JSON.parse(localStorage.getItem("brito_pos_current_incomes") || "[]");
        const remainingInc = Array.isArray(curInc)
          ? curInc.filter((i: any) => {
              const bId = i.branchId || i.branch_id;
              return bId && bId !== targetBranchId;
            })
          : [];
        localStorage.setItem("brito_pos_current_incomes", JSON.stringify(remainingInc));
      } catch {}

      // Persistir corte de turno y movimiento en Supabase para supervisión en vivo
      try {
        const supabase = createClient();
        const shiftId = newCut.id || `cut-${Date.now()}`;
        Promise.allSettled([
          supabase.from("cash_shifts").upsert({
            id: shiftId,
            shift_name: nextShiftName || "Turno General",
            cashier_name: currentShiftResponsible,
            branch_id: targetBranchId,
            opened_at: new Date(cutTs).toISOString(),
            initial_cash: parsedNextFund,
            cash_sales: cashSales,
            card_sales: cardSales,
            transfer_sales: transferSales,
            total_cash_in: totalEntries,
            total_cash_out: totalExpenses,
            expected_cash: expectedCashInDrawer,
            actual_cash: parsedCounted,
            difference: diff,
            status: "cerrada",
            notes: newCut.notes,
          }),
          supabase.from("cash_movements").upsert({
            id: `mov-${shiftId}`,
            type: "salida",
            category: "corte_caja",
            category_label: "Corte de Turno",
            amount: parsedCounted,
            reason: `Corte de turno (${newCut.shiftRange || "Turno"}). Saliente: ${currentShiftResponsible} → Entrante: ${recipient}`,
            authorized_by: currentShiftResponsible,
            branch_id: targetBranchId,
          }),
        ]).catch(() => {});
      } catch {}

      // Emitir corte en tiempo real
      realtimeHub.broadcastShiftCut(newCut);
      updateBranch(targetBranchId, {
        todaySales: 0,
        todayTickets: 0,
        todayDeskSales: 0,
        todayDeskTickets: 0,
        todayOrdersDeposit: 0,
        todayOrdersTotal: 0,
        todayOrdersCount: 0,
        cashInDrawer: parsedNextFund,
        lastCut: newCut,
        manager: recipient,
        currentShift: {
          id: `shift-${targetBranchId}-${cutTs}`,
          name: nextShiftName || "Turno General",
          cashier: recipient,
          openedAt: formatDateTimeSafe(new Date(cutTs)),
          initialFund: parsedNextFund,
          cashSales: 0,
          cardSales: 0,
          transferSales: 0,
          totalSales: 0,
          ticketCount: 0,
          status: "abierto",
        },
      });
      setCutsHistory(updated);
      setCashSales(0);
      setCardSales(0);
      setTransferSales(0);
      setMovements([]);
      setInitialCash(parsedNextFund);

      // Notificación vinculada al corte de caja para toda la red
      const isSquare = diff === 0;
      const isShort = diff < 0;
      const squareStatusTitle = isSquare
        ? "✓ CAJA CUADRADA EXACTA ($0.00)"
        : isShort
        ? `🚨 NO CUADRÓ LA CAJA (Faltante ${formatCurrency(diff)})`
        : `⚠️ NO CUADRÓ LA CAJA (Sobrante +${formatCurrency(diff)})`;

      const shiftNotif: FBNotification = {
        id: `notif-cut-${newCut.id}`,
        senderName: `🏁 Cierre de Turno (${currentShiftResponsible})`,
        senderAvatar: isSquare ? "💰" : "⚠️",
        badgeIcon: "dinero",
        title: `Cierre de Turno: ${squareStatusTitle}`,
        highlightText: `Cambio de Turno: ${currentShiftResponsible} ➔ ${recipient}`,
        description: `Folio ${newCut.id}. Efectivo contado: ${formatCurrency(parsedCounted)} (Esperado: ${formatCurrency(expectedCashInDrawer)}). Fondo nuevo dejado en caja: ${formatCurrency(parsedNextFund)}. Saliente: ${currentShiftResponsible}.`,
        category: "caja",
        actionLabel: "Ver Ticket de Corte",
        actionLink: `/caja?tab=historial&corteId=${newCut.id}`,
        shiftCutData: newCut,
        cutId: newCut.id,
        branchId: targetBranchId,
        branchName: currentBranch?.name || "Sucursal",
        timeAgo: "Hace un momento",
        group: "recientes",
        read: false,
      };

      addNotification(shiftNotif);

      if (realtimeHub?.broadcastNotification) {
        realtimeHub.broadcastNotification(shiftNotif);
      }

      window.dispatchEvent(new Event("brito_shift_cuts_updated"));
      window.dispatchEvent(new Event("brito_sales_updated"));
      window.dispatchEvent(new Event("brito_incomes_updated"));
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
    const nowClose = new Date();
    const closeTimeStr = `${nowClose.getHours().toString().padStart(2, "0")}:${nowClose.getMinutes().toString().padStart(2, "0")}`;
    const isSquare = diff === 0;
    const isShort = diff < 0;
    const squareStatusTitle = isSquare
      ? "✓ CAJA CUADRADA EXACTA ($0.00)"
      : isShort
      ? `🚨 NO CUADRÓ LA CAJA (Faltante ${formatCurrency(diff)})`
      : `⚠️ NO CUADRÓ LA CAJA (Sobrante +${formatCurrency(diff)})`;
    const withdrawnCash = Math.max(0, parsedCounted - parsedNextFund);

    addNotification({
      senderName: `🏁 Cierre de Turno (${currentShiftResponsible})`,
      senderAvatar: isSquare ? "💰" : "⚠️",
      badgeIcon: "dinero",
      title: `Cierre a las ${closeTimeStr} hrs: ${squareStatusTitle}`,
      highlightText: `Cambio de Turno: ${currentShiftResponsible} ➔ ${recipient}`,
      description: `Folio ${newFolio} archivado en historial de caja. Horario de cierre: ${closeTimeStr} hrs. Efectivo en caja: ${formatCurrency(parsedCounted)} (${isSquare ? "Cuadró exacta sin faltantes" : `Diferencia: ${formatCurrency(diff)}`}). Fondo para nuevo turno: ${formatCurrency(parsedNextFund)}. Efectivo retirado/entregado: ${formatCurrency(withdrawnCash)}.`,
      category: "caja",
      actionLabel: "Ver Corte de Caja",
      actionLink: `/caja?tab=historial&corteId=${newCut.id}`,
      shiftCutData: newCut,
      cutId: newCut.id,
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
            onClick={handleOpenCorteModal}
            className="flex items-center gap-1.5 bg-stone-900 hover:bg-black text-white font-black px-4 py-2.5 rounded-xl shadow-md text-xs transition-all active:scale-95 border border-stone-800 cursor-pointer"
          >
            <Lock className="w-4 h-4 text-amber-400" /> + Realizar Corte de Turno
          </button>
        </div>
      </div>

      {/* Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-200 gap-3 pb-0">
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveTab("historial")}
            className={`flex items-center gap-2 px-4 sm:px-5 py-3 font-black text-xs sm:text-sm rounded-t-2xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "historial"
                ? "border-b-2 border-amber-600 text-amber-950 bg-amber-50/70 shadow-2xs"
                : "text-stone-500 hover:text-stone-800 hover:bg-stone-50"
            }`}
          >
            <History className="w-4 h-4 text-amber-600" />
            <span>📜 Historial de Cortes de Caja</span>
            <span className="bg-amber-200 text-amber-950 px-2 py-0.5 rounded-full text-[10px] font-extrabold">
              {cutsHistory.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("movimientos")}
            className={`flex items-center gap-2 px-4 sm:px-5 py-3 font-black text-xs sm:text-sm rounded-t-2xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "movimientos"
                ? "border-b-2 border-orange-500 text-orange-950 bg-orange-50/70 shadow-2xs"
                : "text-stone-500 hover:text-stone-800 hover:bg-stone-50"
            }`}
          >
            <Sparkles className="w-4 h-4 text-orange-500 animate-pulse" />
            <span>⚡ Movimientos en Tiempo Real (Todas las Cajas)</span>
            <span className="bg-emerald-500 text-white px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              <span>EN VIVO</span>
            </span>
          </button>
        </div>

        {activeTab === "historial" && (
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-stone-50 text-stone-700 font-bold rounded-xl border border-stone-200 text-xs shadow-2xs transition-colors mb-2 cursor-pointer self-start sm:self-auto"
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-200/80 hover:border-orange-400 hover:ring-2 hover:ring-orange-400/20 shadow-sm hover:shadow-md transition-all duration-200 space-y-3.5">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 flex-wrap">
              {/* 1. Buscador de texto */}
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Buscar por folio (CORTE-...), responsable o notas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-8 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs sm:text-sm font-bold text-stone-900 focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder:text-stone-400 transition-all"
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

              {/* 2. Filtro de Período (Selector Moderno con Popover Personalizado) */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative" ref={periodDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsPeriodDropdownOpen(!isPeriodDropdownOpen)}
                    className={`px-3 py-2 border rounded-2xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                      isPeriodDropdownOpen
                        ? "border-amber-500 ring-2 ring-amber-500/20 bg-amber-50 text-stone-900 shadow-2xs"
                        : "border-stone-200 bg-stone-50 text-stone-800 hover:bg-stone-100"
                    }`}
                  >
                    <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="text-stone-400 font-bold">Período:</span>
                    <span className="font-black text-stone-900">
                      {filterPeriod === "dia" && "Por Día"}
                      {filterPeriod === "mes" && "Por Mes"}
                      {filterPeriod === "ano" && "Por Año"}
                      {filterPeriod === "todos" && "Ver Todos"}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                      isPeriodDropdownOpen ? "bg-amber-500 text-stone-950" : "bg-stone-200 text-stone-700"
                    }`}>
                      {filterPeriod === "dia" && countsByPeriod.day}
                      {filterPeriod === "mes" && countsByPeriod.month}
                      {filterPeriod === "ano" && countsByPeriod.year}
                      {filterPeriod === "todos" && cutsHistory.length}
                    </span>
                    <span className={`text-[10px] text-stone-400 transition-transform duration-200 ${
                      isPeriodDropdownOpen ? "rotate-180 text-amber-600" : ""
                    }`}>
                      ▼
                    </span>
                  </button>

                  {/* Popover Mejorado para Selección de Período */}
                  {isPeriodDropdownOpen && (
                    <div className="absolute left-0 top-full mt-2 w-72 sm:w-80 bg-white rounded-3xl shadow-2xl border border-stone-200 p-3 z-40 space-y-1.5 animate-in fade-in zoom-in-95">
                      <div className="pb-2 px-1 border-b border-stone-100">
                        <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 block">
                          Período de Auditoría
                        </span>
                        <span className="text-xs font-black text-stone-800 block">
                          Selecciona cómo agrupar los cortes
                        </span>
                      </div>

                      <div className="space-y-1 pt-1">
                        {/* 1. Por Día */}
                        <div
                          onClick={() => {
                            setFilterPeriod("dia");
                            setIsPeriodDropdownOpen(false);
                          }}
                          className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all cursor-pointer ${
                            filterPeriod === "dia"
                              ? "bg-amber-500/10 border-amber-400 text-stone-950 font-black ring-1 ring-amber-400/30"
                              : "bg-white border-stone-200/80 hover:bg-stone-50 hover:border-stone-300 text-stone-700 font-bold"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 border border-amber-200 flex items-center justify-center text-sm font-bold shrink-0">
                              📅
                            </div>
                            <div>
                              <span className="text-xs font-black text-stone-900 block leading-tight">
                                Por Día
                              </span>
                              <span className="text-[10px] text-stone-500 font-medium block">
                                Turnos de una fecha exacta
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-stone-100 text-stone-700 border border-stone-200">
                              {countsByPeriod.day} cortes
                            </span>
                            {filterPeriod === "dia" && <Check className="w-4 h-4 text-amber-600 stroke-[3]" />}
                          </div>
                        </div>

                        {/* 2. Por Mes */}
                        <div
                          onClick={() => {
                            setFilterPeriod("mes");
                            setIsPeriodDropdownOpen(false);
                          }}
                          className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all cursor-pointer ${
                            filterPeriod === "mes"
                              ? "bg-amber-500/10 border-amber-400 text-stone-950 font-black ring-1 ring-amber-400/30"
                              : "bg-white border-stone-200/80 hover:bg-stone-50 hover:border-stone-300 text-stone-700 font-bold"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-900 border border-blue-200 flex items-center justify-center text-sm font-bold shrink-0">
                              🗓️
                            </div>
                            <div>
                              <span className="text-xs font-black text-stone-900 block leading-tight">
                                Por Mes
                              </span>
                              <span className="text-[10px] text-stone-500 font-medium block">
                                Acumulado mensual de caja
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-stone-100 text-stone-700 border border-stone-200">
                              {countsByPeriod.month} cortes
                            </span>
                            {filterPeriod === "mes" && <Check className="w-4 h-4 text-amber-600 stroke-[3]" />}
                          </div>
                        </div>

                        {/* 3. Por Año */}
                        <div
                          onClick={() => {
                            setFilterPeriod("ano");
                            setIsPeriodDropdownOpen(false);
                          }}
                          className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all cursor-pointer ${
                            filterPeriod === "ano"
                              ? "bg-amber-500/10 border-amber-400 text-stone-950 font-black ring-1 ring-amber-400/30"
                              : "bg-white border-stone-200/80 hover:bg-stone-50 hover:border-stone-300 text-stone-700 font-bold"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-900 border border-purple-200 flex items-center justify-center text-sm font-bold shrink-0">
                              📆
                            </div>
                            <div>
                              <span className="text-xs font-black text-stone-900 block leading-tight">
                                Por Año
                              </span>
                              <span className="text-[10px] text-stone-500 font-medium block">
                                Cierres anuales consolidados
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-stone-100 text-stone-700 border border-stone-200">
                              {countsByPeriod.year} cortes
                            </span>
                            {filterPeriod === "ano" && <Check className="w-4 h-4 text-amber-600 stroke-[3]" />}
                          </div>
                        </div>

                        {/* 4. Ver Todos */}
                        <div
                          onClick={() => {
                            setFilterPeriod("todos");
                            setIsPeriodDropdownOpen(false);
                          }}
                          className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all cursor-pointer ${
                            filterPeriod === "todos"
                              ? "bg-amber-500/10 border-amber-400 text-stone-950 font-black ring-1 ring-amber-400/30"
                              : "bg-white border-stone-200/80 hover:bg-stone-50 hover:border-stone-300 text-stone-700 font-bold"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-200 flex items-center justify-center text-sm font-bold shrink-0">
                              📂
                            </div>
                            <div>
                              <span className="text-xs font-black text-stone-900 block leading-tight">
                                Ver Todos
                              </span>
                              <span className="text-[10px] text-stone-500 font-medium block">
                                Histórico completo sin límite
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-stone-100 text-stone-700 border border-stone-200">
                              {cutsHistory.length} total
                            </span>
                            {filterPeriod === "todos" && <Check className="w-4 h-4 text-amber-600 stroke-[3]" />}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Controles Dinámicos de Fecha / Mes / Año */}
                {filterPeriod === "dia" && (
                  <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-2xl border border-stone-200 shadow-2xs hover:border-amber-400 transition-colors">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider pl-0.5">Fecha:</span>
                    <input
                      type="date"
                      value={selectedDayDate}
                      onChange={(e) => setSelectedDayDate(e.target.value)}
                      className="text-xs font-black text-stone-800 bg-transparent focus:outline-none cursor-pointer"
                    />
                    <div className="flex items-center gap-1 pl-1.5 border-l border-stone-200">
                      <button
                        type="button"
                        onClick={() => setSelectedDayDate(formatLocalDate(new Date()))}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-colors cursor-pointer ${
                          selectedDayDate === formatLocalDate(new Date())
                            ? "bg-amber-500 text-stone-900 shadow-2xs"
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
                            ? "bg-amber-500 text-stone-900 shadow-2xs"
                            : "bg-stone-100 hover:bg-stone-200 text-stone-700"
                        }`}
                      >
                        Ayer
                      </button>
                    </div>
                  </div>
                )}

                {filterPeriod === "mes" && (
                  <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-2xl border border-stone-200 shadow-2xs hover:border-amber-400 transition-colors">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider pl-0.5">Mes:</span>
                    <input
                      type="month"
                      value={selectedMonthStr}
                      onChange={(e) => setSelectedMonthStr(e.target.value)}
                      className="text-xs font-black text-stone-800 bg-transparent focus:outline-none cursor-pointer"
                    />
                    <div className="pl-1.5 border-l border-stone-200">
                      <button
                        type="button"
                        onClick={() => setSelectedMonthStr(formatLocalMonth(new Date()))}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-colors cursor-pointer ${
                          selectedMonthStr === formatLocalMonth(new Date())
                            ? "bg-amber-500 text-stone-900 shadow-2xs"
                            : "bg-stone-100 hover:bg-stone-200 text-stone-700"
                        }`}
                      >
                        Mes Actual
                      </button>
                    </div>
                  </div>
                )}

                {filterPeriod === "ano" && (
                  <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-2xl border border-stone-200 shadow-2xs hover:border-amber-400 transition-colors">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider pl-0.5">Año:</span>
                    <select
                      value={selectedYearStr}
                      onChange={(e) => setSelectedYearStr(e.target.value)}
                      className="text-xs font-black text-stone-800 bg-transparent focus:outline-none cursor-pointer"
                    >
                      {availableYears.map((y) => (
                        <option key={y} value={y}>Año {y}</option>
                      ))}
                    </select>
                    <div className="pl-1.5 border-l border-stone-200">
                      <button
                        type="button"
                        onClick={() => setSelectedYearStr(new Date().getFullYear().toString())}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-colors cursor-pointer ${
                          selectedYearStr === new Date().getFullYear().toString()
                            ? "bg-amber-500 text-stone-900 shadow-2xs"
                            : "bg-stone-100 hover:bg-stone-200 text-stone-700"
                        }`}
                      >
                        Año Actual
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Filtro de Responsables (Opción Múltiple / Selector Moderno) */}
              <div className="relative" ref={responsibleDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsResponsibleDropdownOpen(!isResponsibleDropdownOpen)}
                  className={`px-3 py-2 border rounded-2xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                    isResponsibleDropdownOpen || (!isAllResponsiblesSelected && !selectedResponsibles.includes("__none__"))
                      ? "border-amber-500 ring-2 ring-amber-500/20 bg-amber-50 text-stone-900 shadow-2xs"
                      : "border-stone-200 bg-stone-50 text-stone-800 hover:bg-stone-100"
                  }`}
                >
                  <Users className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="whitespace-nowrap">
                    {selectedResponsibles.includes("__none__")
                      ? "Ningún Responsable"
                      : isAllResponsiblesSelected
                      ? "Todos los Responsables"
                      : selectedResponsibles.length === 1
                      ? selectedResponsibles[0]
                      : `${selectedResponsibles[0]} (+${selectedResponsibles.length - 1})`}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                    !isAllResponsiblesSelected && !selectedResponsibles.includes("__none__")
                      ? "bg-amber-500 text-stone-950"
                      : "bg-stone-200 text-stone-700"
                  }`}>
                    {selectedResponsibles.includes("__none__")
                      ? "0"
                      : isAllResponsiblesSelected
                      ? uniqueResponsibles.length
                      : selectedResponsibles.length}
                  </span>
                  <span className={`text-[10px] text-stone-400 transition-transform duration-200 ${
                    isResponsibleDropdownOpen ? "rotate-180 text-amber-600" : ""
                  }`}>
                    ▼
                  </span>
                </button>

                {/* Popover Mejorado con Selección Cómoda y Visual */}
                {isResponsibleDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-stone-200 p-3.5 z-40 space-y-2.5 animate-in fade-in zoom-in-95">
                    {/* Header del Selector */}
                    <div className="flex items-center justify-between pb-2.5 border-b border-stone-100">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                          <Users className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-stone-900 uppercase tracking-wide leading-tight">
                            Filtrar Responsables
                          </h4>
                          <span className="text-[10px] text-stone-400 font-medium block">
                            Selecciona uno o varios cajeros
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={selectAllResponsibles}
                          className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/60 transition-colors cursor-pointer"
                          title="Mostrar todos los responsables"
                        >
                          ✓ Todos
                        </button>
                        <button
                          type="button"
                          onClick={clearAllResponsibles}
                          className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-stone-100 hover:bg-stone-200 text-stone-600 border border-stone-200 transition-colors cursor-pointer"
                          title="Deseleccionar todos"
                        >
                          ✕ Limpiar
                        </button>
                      </div>
                    </div>

                    {/* Opción Rápida: Todos los Responsables */}
                    <div
                      onClick={selectAllResponsibles}
                      className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all cursor-pointer ${
                        isAllResponsiblesSelected
                          ? "bg-amber-500/10 border-amber-400 text-stone-950 font-black ring-1 ring-amber-400/30"
                          : "bg-stone-50/70 border-stone-200/80 hover:bg-stone-100 text-stone-700 font-bold"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all shrink-0 ${
                          isAllResponsiblesSelected
                            ? "bg-amber-500 border-amber-600 text-stone-950"
                            : "border-stone-300 bg-white"
                        }`}>
                          {isAllResponsiblesSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <div className="w-7 h-7 rounded-xl bg-stone-200 text-stone-700 flex items-center justify-center text-xs shrink-0 font-bold">
                          👥
                        </div>
                        <div>
                          <span className="text-xs font-black text-stone-900 block leading-tight">
                            Todos los Responsables
                          </span>
                          <span className="text-[10px] text-stone-500 font-medium block">
                            Historial completo de cortes
                          </span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-white text-stone-700 border border-stone-200 shrink-0">
                        {periodCuts.length} cortes
                      </span>
                    </div>

                    {/* Divisor con etiqueta */}
                    <div className="flex items-center gap-2 py-0.5">
                      <div className="h-px flex-1 bg-stone-100" />
                      <span className="text-[10px] font-black text-stone-400 uppercase tracking-wider">
                        Personal Registrado ({uniqueResponsibles.length})
                      </span>
                      <div className="h-px flex-1 bg-stone-100" />
                    </div>

                    {/* Lista individual con tarjetas interactivas */}
                    <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                      {uniqueResponsibles.map((resp) => {
                        const isChecked = isResponsibleChecked(resp);
                        const periodCount = periodCuts.filter((c) => (c.responsible || c.outgoingCashier || "") === resp).length;
                        const totalCount = cutsHistory.filter((c) => (c.responsible || c.outgoingCashier || "") === resp).length;

                        const isSupervisor = resp.toLowerCase().includes("toño") || resp.toLowerCase().includes("superv") || resp.toLowerCase().includes("admin");
                        const avatarEmoji = isSupervisor ? "👨‍💼" : "👩‍🍳";
                        const avatarBg = isSupervisor ? "bg-amber-100 text-amber-900 border-amber-200" : "bg-emerald-100 text-emerald-900 border-emerald-200";

                        return (
                          <div
                            key={resp}
                            onClick={() => toggleResponsible(resp)}
                            className={`group flex items-center justify-between p-2.5 rounded-2xl border transition-all cursor-pointer ${
                              isChecked
                                ? "bg-amber-50/70 border-amber-300 ring-1 ring-amber-400/30 text-stone-950 font-black"
                                : "bg-white border-stone-200 hover:border-stone-300 hover:bg-stone-50/80 text-stone-600 font-medium"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                              {/* Casilla de verificación moderna */}
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleResponsible(resp);
                                }}
                                className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all shrink-0 cursor-pointer ${
                                  isChecked
                                    ? "bg-amber-500 border-amber-600 text-stone-950 shadow-2xs"
                                    : "border-stone-300 bg-white group-hover:border-amber-400"
                                }`}
                              >
                                {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </div>

                              {/* Avatar de Personal */}
                              <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs shrink-0 border ${avatarBg}`}>
                                {avatarEmoji}
                              </div>

                              {/* Información del cajero */}
                              <div className="min-w-0 flex-1">
                                <span className="text-xs font-black text-stone-900 truncate block leading-tight">
                                  {resp}
                                </span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className={`text-[10px] font-extrabold ${
                                    periodCount > 0 ? "text-emerald-700" : "text-stone-400"
                                  }`}>
                                    {periodCount > 0 ? `🟢 ${periodCount} en período` : `⚪ 0 en período`}
                                  </span>
                                  <span className="text-[10px] text-stone-300">·</span>
                                  <span className="text-[10px] text-stone-500 font-bold">
                                    {totalCount} total
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Botón de Selección Exclusiva "Solo este" */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                selectOnlyResponsible(resp);
                              }}
                              title={`Filtrar exclusivamente a ${resp}`}
                              className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-stone-100 hover:bg-stone-900 hover:text-white text-stone-600 transition-all cursor-pointer border border-stone-200/80 shadow-2xs shrink-0"
                            >
                              Solo este
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* Footer del Selector */}
                    <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-stone-500">
                        {selectedResponsibles.includes("__none__")
                          ? "Ningún cajero seleccionado"
                          : isAllResponsiblesSelected
                          ? `Todos activos (${uniqueResponsibles.length} cajeros)`
                          : `${selectedResponsibles.length} de ${uniqueResponsibles.length} seleccionados`}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsResponsibleDropdownOpen(false)}
                        className="px-3.5 py-1.5 bg-stone-900 hover:bg-black text-white rounded-xl text-[11px] font-black cursor-pointer shadow-xs transition-all"
                      >
                        Listo
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Filtro por Estado de Arqueo */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => setFilterStatus("all")}
                  className={`px-3 py-2 rounded-xl text-xs font-black transition-all border cursor-pointer active:scale-95 shadow-2xs ${
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
                  className={`px-3 py-2 rounded-xl text-xs font-black transition-all border cursor-pointer active:scale-95 shadow-2xs ${
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
                  className={`px-3 py-2 rounded-xl text-xs font-black transition-all border cursor-pointer active:scale-95 shadow-2xs ${
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
                  className={`px-3 py-2 rounded-xl text-xs font-black transition-all border cursor-pointer active:scale-95 shadow-2xs ${
                    filterStatus === "faltante"
                      ? "bg-rose-900 text-rose-100 border-rose-950 shadow-xs ring-2 ring-rose-500/20"
                      : "bg-stone-50 text-stone-700 hover:bg-rose-50 border-stone-200"
                  }`}
                >
                  🔴 Faltantes ({periodCuts.filter((c) => c.difference < 0).length})
                </button>
              </div>
            </div>

            {/* Fichas Rápidas de Responsables (Acceso directo con 1 Clic) */}
            <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-stone-100">
              <span className="text-[11px] font-black text-stone-400 flex items-center gap-1 uppercase tracking-wider mr-1">
                <Users className="w-3.5 h-3.5 text-amber-600" />
                Cajero:
              </span>

              {/* Chip: Todos */}
              <button
                type="button"
                onClick={selectAllResponsibles}
                className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer border ${
                  isAllResponsiblesSelected
                    ? "bg-stone-900 text-white border-stone-900 shadow-xs"
                    : "bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200"
                }`}
              >
                <span>👥 Todos</span>
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
                  isAllResponsiblesSelected ? "bg-white/20 text-white" : "bg-stone-200 text-stone-600"
                }`}>
                  {periodCuts.length}
                </span>
              </button>

              {/* Chips individuales de cada responsable */}
              {uniqueResponsibles.map((resp) => {
                const isOnlyThisSelected = selectedResponsibles.length === 1 && selectedResponsibles[0] === resp;
                const isPartOfMulti = !isAllResponsiblesSelected && selectedResponsibles.includes(resp);
                const periodCount = periodCuts.filter((c) => (c.responsible || c.outgoingCashier || "") === resp).length;
                const isSupervisor = resp.toLowerCase().includes("toño") || resp.toLowerCase().includes("superv") || resp.toLowerCase().includes("admin");
                const avatarEmoji = isSupervisor ? "👨‍💼" : "👩‍🍳";

                return (
                  <button
                    key={resp}
                    type="button"
                    onClick={() => {
                      if (isOnlyThisSelected) {
                        selectAllResponsibles();
                      } else {
                        selectOnlyResponsible(resp);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer border ${
                      isOnlyThisSelected
                        ? "bg-amber-500 text-stone-950 border-amber-600 shadow-xs ring-2 ring-amber-400/20"
                        : isPartOfMulti
                        ? "bg-amber-100 text-amber-950 border-amber-300 font-black"
                        : "bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200"
                    }`}
                    title={`Clic para ver solo cortes de ${resp}`}
                  >
                    <span>{avatarEmoji}</span>
                    <span className="truncate max-w-[140px] sm:max-w-[190px]">{resp}</span>
                    <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
                      isOnlyThisSelected
                        ? "bg-stone-900 text-amber-400"
                        : isPartOfMulti
                        ? "bg-amber-200 text-amber-900"
                        : "bg-stone-200 text-stone-600"
                    }`}>
                      {periodCount}
                    </span>
                  </button>
                );
              })}

              {/* Botón para abrir el selector múltiple avanzado */}
              <button
                type="button"
                onClick={() => setIsResponsibleDropdownOpen(true)}
                className="px-2.5 py-1 rounded-xl text-[11px] font-bold text-stone-500 hover:text-stone-900 hover:bg-stone-100 border border-dashed border-stone-300 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>⚙️ Selección Múltiple</span>
              </button>
            </div>

            {/* 5. Sub-barra informativa */}
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
                {(!isAllResponsiblesSelected || selectedResponsibles.includes("__none__")) && (
                  <span className="text-[11px] bg-stone-200 text-stone-800 px-2 py-0.5 rounded-md font-extrabold flex items-center gap-1">
                    <span>
                      {selectedResponsibles.includes("__none__")
                        ? "👤 Ningún cajero"
                        : selectedResponsibles.length === 1
                        ? `👤 ${selectedResponsibles[0]}`
                        : `👤 ${selectedResponsibles.length} responsables`}
                    </span>
                    <button
                      type="button"
                      onClick={selectAllResponsibles}
                      className="text-stone-500 hover:text-stone-900 ml-0.5 cursor-pointer"
                      title="Quitar filtro de cajero"
                    >
                      ✕
                    </button>
                  </span>
                )}
              </span>
              <span className="text-[11px] text-stone-400">
                Haz clic en <strong>"🖨️ Reimprimir Ticket"</strong> en cualquier corte para imprimir el comprobante térmico oficial.
              </span>
            </div>
          </div>

          {/* Tabla / Listado de Cortes */}
          <div className="bg-white rounded-3xl border border-stone-200/80 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
            {/* Header del Bloque de Cortes */}
            <div className="p-4 sm:p-5 border-b border-stone-100 bg-stone-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center font-black shadow-xs shrink-0">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-sm sm:text-base text-stone-900">
                      Comprobantes y Cortes Registrados
                    </h3>
                    <span className="bg-amber-100 text-amber-950 font-black text-[10px] px-2.5 py-0.5 rounded-full border border-amber-300">
                      {filteredCuts.length} {filteredCuts.length === 1 ? "corte" : "cortes"}
                    </span>
                    {filterPeriod !== "todos" && (
                      <span className="bg-stone-200/80 text-stone-700 font-extrabold text-[10px] px-2 py-0.5 rounded-md">
                        {filterPeriod === "dia" ? `Día: ${selectedDayDate}` :
                         filterPeriod === "mes" ? `Mes: ${selectedMonthStr}` : `Año: ${selectedYearStr}`}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-stone-500 font-medium mt-0.5">
                    {filterPeriod === "dia"
                      ? `Auditoría del día ${selectedDayDate} • Registros de turno oficial`
                      : filterPeriod === "mes"
                      ? `Auditoría acumulada del mes ${selectedMonthStr}`
                      : filterPeriod === "ano"
                      ? `Auditoría consolidada del año ${selectedYearStr}`
                      : `Histórico completo (${cutsHistory.length} cortes archivados)`}
                  </p>
                </div>
              </div>

              {/* Botones de acción rápida en cabecera */}
              <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                {filterPeriod !== "todos" && (
                  <button
                    type="button"
                    onClick={() => setFilterPeriod("todos")}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-100 text-stone-700 font-bold text-xs border border-stone-200 shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
                    title="Ver todos los cortes archivados"
                  >
                    <span>📂 Ver Todos ({cutsHistory.length})</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleOpenCorteModal}
                  className="px-3.5 py-1.5 rounded-xl bg-stone-900 hover:bg-black text-amber-400 font-black text-xs shadow-xs transition-transform active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>+ Nuevo Corte</span>
                </button>
              </div>
            </div>

            {filteredCuts.length === 0 ? (
              <div className="py-10 px-4 sm:px-8 text-center space-y-4 max-w-xl mx-auto">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto shadow-2xs">
                  <Receipt className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                    Sin cortes para este filtro
                  </span>
                  <h4 className="font-black text-base text-stone-900 mt-2">
                    {filterPeriod === "dia" 
                      ? `No hay cortes registrados para el día ${selectedDayDate}` 
                      : filterPeriod === "mes" 
                      ? `No hay cortes registrados para el mes ${selectedMonthStr}`
                      : "No se encontraron cortes de caja"}
                  </h4>
                  <p className="text-xs text-stone-500 max-w-md mx-auto mt-1">
                    {filterPeriod === "dia"
                      ? "El turno actual continúa abierto o aún no se ha generado el corte de hoy. Puedes ver los comprobantes anteriores o realizar el corte oficial de tu turno."
                      : "Ningún corte coincide con los filtros o la búsqueda seleccionada. Puedes restablecer los filtros para ver todos los comprobantes."}
                  </p>
                </div>

                {/* Botones de acción rápida */}
                <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                  {filterPeriod !== "todos" && (
                    <button
                      type="button"
                      onClick={() => setFilterPeriod("todos")}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-stone-950 font-black rounded-xl text-xs transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <span>📂 Ver Histórico Completo ({cutsHistory.length})</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleOpenCorteModal}
                    className="px-4 py-2 bg-stone-900 hover:bg-black text-white font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Realizar Corte de Turno</span>
                  </button>
                  {(searchQuery || !isAllResponsiblesSelected || selectedResponsibles.includes("__none__") || filterStatus !== "all") && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedResponsibles([]);
                        setFilterStatus("all");
                      }}
                      className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      Restablecer Filtros
                    </button>
                  )}
                </div>

                {/* Tarjeta de Acceso al Último Corte Registrado */}
                {latestCut && (
                  <div className="pt-2">
                    <div 
                      onClick={() => setSelectedCutForDetail(latestCut)}
                      className="p-3.5 bg-stone-50 hover:bg-amber-50/80 rounded-2xl border border-stone-200 hover:border-amber-300 transition-all text-left flex items-center justify-between gap-3 cursor-pointer shadow-2xs group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-white border border-stone-200 flex items-center justify-center text-base shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                          🧾
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wide block">
                            Último corte archivado en sistema:
                          </span>
                          <div className="flex items-center gap-2 flex-wrap">
                            <strong className="text-xs font-black text-stone-900">{latestCut.id}</strong>
                            <span className="text-[11px] text-stone-500 font-medium">({latestCut.date})</span>
                            <span className="text-[10px] bg-amber-100 text-amber-950 font-black px-1.5 py-0.2 rounded">
                              {latestCut.responsible || latestCut.outgoingCashier}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-black text-emerald-700 block">
                          {formatCurrency(latestCut.countedCash)}
                        </span>
                        <span className="text-[10px] text-amber-800 font-bold group-hover:underline">
                          Ver Ticket ➔
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[640px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-stone-50/95 backdrop-blur-xs text-stone-500 font-black border-b border-stone-200 uppercase tracking-wider text-[10px] z-10 shadow-2xs">
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

            {/* Footer de Resumen cuando hay registros */}
            {filteredCuts.length > 0 && (
              <div className="p-3.5 bg-stone-50 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-stone-500">
                <div className="flex items-center gap-2">
                  <span>Mostrando <strong className="text-stone-800">{filteredCuts.length}</strong> de {cutsHistory.length} comprobantes</span>
                  <span className="text-stone-300">•</span>
                  <span className="text-[11px] text-stone-400">Total ventas auditadas: <strong className="text-stone-700">{formatCurrency(auditMetrics.totalSalesAudit)}</strong></span>
                </div>
                <span className="text-[11px] text-stone-400">
                  Haz clic sobre cualquier fila o en <strong>"Reimprimir"</strong> para ver el comprobante oficial
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 2: MOVIMIENTOS EN TIEMPO REAL (TODAS LAS CAJAS Y SUCURSALES)       */}
      {/* ========================================================================= */}
      {activeTab === "movimientos" && (
        <div className="space-y-6">
          {/* Banner de Sincronización y Estado WebSocket en Vivo */}
          <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-amber-950 p-5 sm:p-6 rounded-3xl text-white shadow-xl border border-stone-700/60 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 z-10">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black tracking-wide uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Enlace WebSocket y Hub Local Activo</span>
                </span>
                <span className="text-xs text-stone-400 font-mono">0 ms de latencia</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                <span>⚡ Monitor de Flujo de Efectivo en Vivo</span>
              </h3>
              <p className="text-xs sm:text-sm text-stone-300 max-w-2xl leading-relaxed">
                Panel de control para Don Toño Brito: supervisa cada peso que entra, sale o se transfiere en todas las cajas de todas las sucursales al instante.
              </p>
            </div>

            <div className="flex items-center gap-2.5 z-10 shrink-0">
              <button
                onClick={() => {
                  realtimeHub.triggerSyncNow();
                  loadLiveMovements();
                  loadCutsHistory();
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all border border-white/20 active:scale-95 shadow-sm cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 text-amber-300" />
                <span>Actualizar Feed Ahora</span>
              </button>
            </div>
            
            <div className="absolute right-0 bottom-0 translate-x-8 translate-y-8 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          </div>

          {/* Tarjetas KPI de Dinero en Vivo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Ingresos Totales en Vivo */}
            <div className="bg-white p-5 rounded-3xl border border-stone-200/80 hover:border-emerald-400 hover:ring-2 hover:ring-emerald-400/20 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-emerald-800 uppercase tracking-wider block">
                  (+) Total Ingresos en Vivo
                </span>
                <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-200">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
              </div>
              <span className="text-2xl font-black text-emerald-700 mt-2 block tracking-tight font-mono">
                +{formatCurrency(liveKpis.totalIn)}
              </span>
              <span className="text-[11px] text-stone-500 font-medium mt-1 block">
                Ventas mostrador + Aportaciones de cambio
              </span>
            </div>

            {/* KPI 2: Salidas y Retiros en Vivo */}
            <div className="bg-white p-5 rounded-3xl border border-stone-200/80 hover:border-rose-400 hover:ring-2 hover:ring-rose-400/20 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-rose-800 uppercase tracking-wider block">
                  (-) Salidas & Retiros en Vivo
                </span>
                <div className="p-2.5 bg-rose-50 text-rose-700 rounded-2xl border border-rose-200">
                  <ArrowDownRight className="w-5 h-5" />
                </div>
              </div>
              <span className="text-2xl font-black text-rose-700 mt-2 block tracking-tight font-mono">
                -{formatCurrency(liveKpis.totalOut)}
              </span>
              <span className="text-[11px] text-stone-500 font-medium mt-1 block">
                Gastos insumos + Retiros Don Toño
              </span>
            </div>

            {/* KPI 3: Flujo Neto en Efectivo */}
            <div className="bg-white p-5 rounded-3xl border border-stone-200/80 hover:border-amber-400 hover:ring-2 hover:ring-amber-400/20 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-amber-900 uppercase tracking-wider block">
                  (=) Flujo Neto en Efectivo
                </span>
                <div className="p-2.5 bg-amber-50 text-amber-700 rounded-2xl border border-amber-200">
                  <Wallet className="w-5 h-5" />
                </div>
              </div>
              <span className={`text-2xl font-black mt-2 block tracking-tight font-mono ${liveKpis.netCash >= 0 ? "text-stone-900" : "text-rose-700"}`}>
                {liveKpis.netCash >= 0 ? "+" : ""}{formatCurrency(liveKpis.netCash)}
              </span>
              <span className="text-[11px] text-stone-500 font-medium mt-1 block">
                Balance disponible en cajones
              </span>
            </div>

            {/* KPI 4: Total de Movimientos Transmitidos */}
            <div className="bg-white p-5 rounded-3xl border border-stone-200/80 hover:border-blue-400 hover:ring-2 hover:ring-blue-400/20 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-stone-600 uppercase tracking-wider block">
                  Transacciones en Feed
                </span>
                <div className="p-2.5 bg-blue-50 text-blue-700 rounded-2xl border border-blue-200">
                  <Radio className="w-5 h-5" />
                </div>
              </div>
              <span className="text-2xl font-black text-stone-900 mt-2 block tracking-tight font-mono">
                {filteredLiveMovements.length} Movimientos
              </span>
              <span className="text-[11px] text-stone-500 font-medium mt-1 block">
                Filtrados según selección
              </span>
            </div>
          </div>

          {/* Barra de Filtros en Tiempo Real */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-200/80 shadow-sm space-y-3.5">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 flex-wrap">
              {/* Buscador */}
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Buscar por concepto, cajero, sucursal, ID..."
                  value={liveSearchQuery}
                  onChange={(e) => setLiveSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-stone-50 hover:bg-stone-100/80 focus:bg-white rounded-2xl border border-stone-200 focus:ring-2 focus:ring-amber-500 focus:outline-none text-xs font-medium transition-all"
                />
                {liveSearchQuery && (
                  <button
                    onClick={() => setLiveSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Selector de Sucursal */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-stone-500 shrink-0 flex items-center gap-1">
                  <Store className="w-3.5 h-3.5 text-stone-400" /> Sucursal:
                </label>
                <select
                  value={liveBranchFilter}
                  onChange={(e) => setLiveBranchFilter(e.target.value)}
                  className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer"
                >
                  <option value="all">Todas las Sucursales (Global)</option>
                  {(branches || []).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selector de Cajero / Perfil */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-stone-500 shrink-0 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-stone-400" /> Perfil:
                </label>
                <select
                  value={liveCashierFilter}
                  onChange={(e) => setLiveCashierFilter(e.target.value)}
                  className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer max-w-[200px]"
                >
                  <option value="all">Todos los Perfiles</option>
                  {uniqueLiveCashiers.map((cName) => (
                    <option key={cName} value={cName}>
                      {cName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selector de Tipo */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-stone-500 shrink-0 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-stone-400" /> Tipo:
                </label>
                <select
                  value={liveTypeFilter}
                  onChange={(e) => setLiveTypeFilter(e.target.value as any)}
                  className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer"
                >
                  <option value="all">Todos los Movimientos</option>
                  <option value="venta">🟢 Ventas Mostrador</option>
                  <option value="entrada">🪙 Entradas / Fondos</option>
                  <option value="salida">💸 Gastos y Salidas</option>
                  <option value="corte">🏁 Cortes de Turno</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tabla / Feed de Movimientos en Tiempo Real */}
          <div className="bg-white rounded-3xl border border-stone-200/80 shadow-sm overflow-hidden">
            {filteredLiveMovements.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-14 h-14 bg-stone-100 rounded-full flex items-center justify-center mx-auto text-stone-400">
                  <Radio className="w-7 h-7 animate-pulse text-amber-500" />
                </div>
                <h4 className="text-base font-black text-stone-900">
                  Sin movimientos registrados con los filtros actuales
                </h4>
                <p className="text-xs text-stone-500 max-w-md mx-auto">
                  El sistema está conectado al Hub en tiempo real y esperando nuevas transacciones de mostrador, entradas o gastos.
                </p>
                {(liveBranchFilter !== "all" || liveCashierFilter !== "all" || liveTypeFilter !== "all" || liveSearchQuery) && (
                  <button
                    onClick={() => {
                      setLiveBranchFilter("all");
                      setLiveCashierFilter("all");
                      setLiveTypeFilter("all");
                      setLiveSearchQuery("");
                    }}
                    className="text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-3.5 py-1.5 rounded-xl border border-amber-200 transition-colors cursor-pointer"
                  >
                    Restablecer todos los filtros
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-stone-200/80 bg-stone-50/70 text-stone-500 font-black uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-4">Hora / Estado</th>
                      <th className="py-3 px-4">Sucursal</th>
                      <th className="py-3 px-4">Cajero / Perfil</th>
                      <th className="py-3 px-4">Tipo Movimiento</th>
                      <th className="py-3 px-4">Concepto / Detalle</th>
                      <th className="py-3 px-4 text-center">Método</th>
                      <th className="py-3 px-4 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-medium">
                    {filteredLiveMovements.map((mov) => {
                      const isRecent = isRecentlyCreated(mov.timestamp);
                      const isPositive = mov.type === "venta" || mov.type === "entrada";
                      const isExpense = mov.type === "salida";
                      const isCut = mov.type === "corte";

                      return (
                        <tr
                          key={mov.id}
                          className={`hover:bg-stone-50/80 transition-colors ${
                            isRecent ? "bg-amber-50/20" : ""
                          }`}
                        >
                          {/* Hora y Badge en Vivo */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-stone-800">
                                {formatLiveTime(mov.timestamp)}
                              </span>
                              {isRecent && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                  <span>En vivo</span>
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Sucursal */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black border ${getBranchBadgeColor(mov.branchId)}`}>
                              <Store className="w-3.5 h-3.5 shrink-0" />
                              <span>{mov.branchName || "Sucursal Matriz"}</span>
                            </span>
                          </td>

                          {/* Cajero / Perfil */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-stone-100 border border-stone-300 flex items-center justify-center font-black text-stone-700 text-xs shrink-0 shadow-2xs">
                                {mov.isOwner ? "👑" : mov.cashier.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-black text-stone-900 text-xs">
                                  {mov.cashier}
                                </span>
                                {mov.isOwner && (
                                  <span className="text-[10px] font-bold text-amber-700">
                                    Propietario / Don Toño
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Tipo de Movimiento */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            {isPositive && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl font-black text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                                <span>{mov.categoryLabel || "Ingreso / Venta"}</span>
                              </span>
                            )}
                            {isExpense && (
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl font-black text-[11px] border ${
                                mov.isOwner
                                  ? "bg-amber-100 text-amber-950 border-amber-300"
                                  : "bg-rose-50 text-rose-800 border border-rose-200"
                              }`}>
                                <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />
                                <span>{mov.categoryLabel || "Salida / Gasto"}</span>
                              </span>
                            )}
                            {isCut && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl font-black text-[11px] bg-amber-100 text-amber-950 border border-amber-300">
                                <Lock className="w-3.5 h-3.5 text-amber-700" />
                                <span>🏁 Corte de Turno</span>
                              </span>
                            )}
                          </td>

                          {/* Concepto / Detalle */}
                          <td className="py-3 px-4">
                            <span className="font-semibold text-stone-800 block max-w-sm sm:max-w-md truncate" title={mov.concept}>
                              {mov.concept}
                            </span>
                            <span className="text-[10px] text-stone-400 block font-mono">
                              ID: {mov.id}
                            </span>
                          </td>

                          {/* Forma de Pago */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-lg font-black text-[10px] uppercase inline-flex items-center gap-1 border ${
                              mov.paymentMethod === "efectivo"
                                ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                : mov.paymentMethod === "tarjeta"
                                ? "bg-blue-100 text-blue-800 border-blue-200"
                                : "bg-purple-100 text-purple-800 border-purple-200"
                            }`}>
                              {mov.paymentMethod === "efectivo" && <Wallet className="w-3 h-3 shrink-0" />}
                              {mov.paymentMethod === "tarjeta" && <CreditCard className="w-3 h-3 shrink-0" />}
                              {mov.paymentMethod === "transferencia" && <Building className="w-3 h-3 shrink-0" />}
                              <span>{mov.paymentMethod}</span>
                            </span>
                          </td>

                          {/* Monto */}
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <span className={`font-mono font-black text-sm tracking-tight ${
                              isPositive
                                ? "text-emerald-700"
                                : isExpense
                                ? "text-rose-700"
                                : "text-amber-900"
                            }`}>
                              {isPositive ? "+" : isExpense ? "-" : ""}{formatCurrency(mov.amount)}
                            </span>
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
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-xl w-full shadow-2xl space-y-4 border border-stone-200 hover:border-amber-400/80 transition-all duration-200 max-h-[92vh] overflow-y-auto">
            {/* Header del Modal */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-stone-900 text-amber-400 rounded-2xl shadow-sm">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-base sm:text-lg text-stone-900">Arqueo y Cierre de Turno</h3>
                    <span className="bg-amber-100 text-amber-900 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      Corte Oficial
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Comprobante oficial, arqueo de caja y entrega de efectivo a Don Toño.
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

            <form onSubmit={handleConfirmLiveCut} className="space-y-4 text-xs">
              {/* 1. RELEVO DE TURNO Y RESPONSABLES */}
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
                      className="w-full mt-1 bg-stone-50 border border-stone-300 rounded-lg px-2 py-1 text-xs font-bold text-stone-900 focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer"
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

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-[11px] text-stone-600 px-1 pt-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span className="font-bold text-stone-800">Siguiente Turno a Iniciar:</span>
                    <span className="text-[10px] font-black text-amber-900 bg-amber-200/70 px-1.5 py-0.2 rounded">
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

              {/* 2. FIRMA DE SEGURIDAD / CONTRASEÑA */}
              <div className="bg-white p-3.5 rounded-2xl border border-stone-200 space-y-1.5 shadow-2xs">
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
                    className={`w-full px-3.5 py-2.5 pr-10 bg-stone-50 rounded-xl border text-xs font-mono font-bold focus:ring-2 focus:outline-none transition-colors ${
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

              {/* 3. TOTAL DE EFECTIVO EN CAJA (DESTACADO Y CON ARQUEO FÍSICO) */}
              <div className="bg-gradient-to-br from-amber-500/15 via-amber-50/80 to-stone-50 border-2 border-amber-400/90 p-4 rounded-3xl space-y-3 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center font-black shadow-xs shrink-0">
                      <Coins className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[11px] font-black text-amber-950 uppercase tracking-wider block leading-tight">
                        Total de Efectivo en Caja
                      </span>
                      <span className="text-[11px] text-stone-500 font-medium block">
                        Balance neto de efectivo acumulado en turno
                      </span>
                    </div>
                  </div>
                  <div className="sm:text-right">
                    <span className="text-2xl sm:text-3xl font-black text-stone-950 block tracking-tight">
                      {formatCurrency(expectedCashInDrawer)}
                    </span>
                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full inline-block mt-0.5 ${
                      expectedCashInDrawer >= 0 
                        ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                        : "bg-rose-100 text-rose-900 border border-rose-300"
                    }`}>
                      {expectedCashInDrawer >= 0 ? "Efectivo Teórico en Caja" : "Gastos superaron al efectivo"}
                    </span>
                  </div>
                </div>

                {/* Desglose rápido en 4 fichas */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <div className="bg-white/95 p-2.5 rounded-xl border border-stone-200/80 shadow-2xs">
                    <span className="text-[9px] font-black uppercase text-stone-400 block">Fondo Inicial</span>
                    <span className="text-xs font-black text-stone-900 block mt-0.5">{formatCurrency(initialCash)}</span>
                  </div>
                  <div className="bg-white/95 p-2.5 rounded-xl border border-emerald-200/80 shadow-2xs">
                    <span className="text-[9px] font-black uppercase text-emerald-800 block">Ventas Efectivo</span>
                    <span className="text-xs font-black text-emerald-700 block mt-0.5">+{formatCurrency(cashSales)}</span>
                  </div>
                  <div className="bg-white/95 p-2.5 rounded-xl border border-blue-200/80 shadow-2xs">
                    <span className="text-[9px] font-black uppercase text-blue-800 block">Entradas / Extra</span>
                    <span className="text-xs font-black text-blue-700 block mt-0.5">+{formatCurrency(totalEntries)}</span>
                  </div>
                  <div className="bg-white/95 p-2.5 rounded-xl border border-rose-200/80 shadow-2xs">
                    <span className="text-[9px] font-black uppercase text-rose-800 block">Gastos Pagados</span>
                    <span className="text-xs font-black text-rose-700 block mt-0.5">-{formatCurrency(totalExpenses)}</span>
                  </div>
                </div>

                {/* Arqueo Físico de Efectivo Contado */}
                <div className="pt-2.5 border-t border-amber-200/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black text-stone-900 flex items-center gap-1.5">
                      <Calculator className="w-3.5 h-3.5 text-amber-700" />
                      <span>Arqueo Físico: Efectivo Contado en Caja ($ MXN):</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setCountedCash(Math.max(0, expectedCashInDrawer).toString())}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-white hover:bg-amber-100 text-amber-950 border border-amber-300 transition-colors cursor-pointer shadow-2xs"
                    >
                      Copiar Total Calculado
                    </button>
                  </div>

                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-stone-400">$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={countedCash}
                      onKeyDown={(e) => onlyNumbersKeyDown(e, true)}
                      onChange={(e) => setCountedCash(cleanDecimalNumbers(e.target.value))}
                      placeholder={expectedCashInDrawer > 0 ? expectedCashInDrawer.toString() : "0.00"}
                      className="w-full pl-8 pr-28 py-2.5 bg-white rounded-xl border-2 border-amber-400 text-sm font-black text-stone-900 focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-2xs"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border ${
                        liveCashDifference === 0
                          ? "bg-emerald-100 text-emerald-950 border-emerald-300"
                          : liveCashDifference > 0
                          ? "bg-blue-100 text-blue-950 border-blue-300"
                          : "bg-rose-100 text-rose-950 border-rose-300"
                      }`}>
                        {liveCashDifference === 0 
                          ? "✓ Cuadra exacto" 
                          : liveCashDifference > 0 
                          ? `+${formatCurrency(liveCashDifference)} Sobrante` 
                          : `${formatCurrency(liveCashDifference)} Faltante`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. DISTRIBUCIÓN DEL DINERO */}
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
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-black border transition-colors cursor-pointer ${
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
                    const maxAllowed = Math.max(0, liveCountedValue);
                    if (raw !== "" && liveCountedValue > 0 && Number(raw) > maxAllowed) {
                      setNextFundAmount(maxAllowed.toString());
                    } else {
                      setNextFundAmount(raw);
                    }
                  }}
                  className="w-full px-3 py-2 bg-white rounded-xl border border-stone-300 font-bold text-stone-900 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />

                <div className="flex justify-between items-center text-xs pt-1.5 border-t border-stone-200">
                  <div>
                    <span className="text-stone-700 font-bold block text-[11px]">Efectivo entregado a Don Toño:</span>
                    <span className="text-[10px] text-stone-500">
                      Total contado (${formatCurrency(liveCountedValue)}) menos fondo dejado
                    </span>
                  </div>
                  <strong className="text-sm font-black text-emerald-950 bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-300 shadow-2xs">
                    {formatCurrency(liveDeliveredToOwner)}
                  </strong>
                </div>
              </div>

              {/* 5. OBSERVACIONES */}
              <div className="space-y-1">
                <label className="font-bold text-stone-700 text-xs">
                  Observaciones del Cierre (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. Entrega conforme, vitrinas llenas, efectivo entregado en sobre..."
                  value={corteNotes}
                  onChange={(e) => setCorteNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-500 focus:outline-none text-xs"
                />
              </div>

              {/* 6. BOTONES DE ACCIÓN */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCorteModalOpen(false);
                    setPasswordError(null);
                    setDeliveryPassword("");
                  }}
                  className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-2xl text-xs transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-3 rounded-2xl text-xs font-black shadow-md transition-all flex items-center justify-center gap-2 border bg-stone-900 hover:bg-black text-white border-stone-800 cursor-pointer active:scale-95 shadow-lg shadow-amber-900/10"
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
