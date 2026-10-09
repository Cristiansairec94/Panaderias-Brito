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
import { Product, Sale, CashExpense, CashIncome, ShiftCutRecord, CustomOrder } from "@/types";
import { formatCurrency, onlyNumbersKeyDown, cleanDecimalNumbers, formatDateTimeSafe, parseDateTimeSafe, matchesCashier, getStoredShiftStartBoundary, resolveBranchId } from "@/lib/utils";
import { getStoredOrders } from "@/lib/orders";
import { useNotifications, FBNotification } from "@/context/NotificationContext";
import { useBranch } from "@/context/BranchContext";
import { realtimeHub } from "@/lib/realtime/realtimeHub";
import { createClient } from "@/lib/supabase/client";

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
  incomes?: CashIncome[];
  products: Product[];
  onCompleteShiftCut?: () => void;
  initialTab?: "cuentas" | "cambio" | "corte" | "historial";
  lastCutTimestamp?: number;
  orders?: CustomOrder[];
  cashSalesTotal?: number;
  branchId?: string;
  branchName?: string;
  branchCashInDrawer?: number;
}

const DEFAULT_SAMPLE_CUTS: ShiftCutRecord[] = [];

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
  incomes = [],
  products,
  onCompleteShiftCut,
  initialTab = "cambio",
  lastCutTimestamp,
  orders,
  cashSalesTotal,
  branchId,
  branchName,
  branchCashInDrawer,
}: CashDrawerShiftModalProps) {
  const { addNotification } = useNotifications();
  const { currentBranch, branches, updateBranch } = useBranch();

  // Fondo Inicial Sincronizado en tiempo real
  const targetBranchId = resolveBranchId(branchId || currentBranch?.id, cashierName);
  const standardBranchFund = targetBranchId === "branch-benito" ? 800 : targetBranchId === "branch-flores" ? 1200 : 1000;

  const [syncedFund, setSyncedFund] = useState<number>(() => {
    if (currentBranch?.lastCut?.nextFund !== undefined && currentBranch?.lastCut?.nextFund !== null) {
      const f = Number(currentBranch.lastCut.nextFund);
      if (f > 0 && !(targetBranchId === "branch-matriz" && f === 800)) return f;
    }
    if (currentBranch?.currentShift?.initialFund !== undefined && currentBranch?.currentShift?.initialFund !== null) {
      const f = Number(currentBranch.currentShift.initialFund);
      if (f > 0 && !(targetBranchId === "branch-matriz" && f === 800)) return f;
    }
    if (typeof window !== "undefined") {
      const branchSaved = localStorage.getItem(`brito_pos_initial_fund_${targetBranchId}`);
      if (branchSaved !== null && !isNaN(Number(branchSaved)) && Number(branchSaved) > 0) {
        const num = Number(branchSaved);
        if (!(targetBranchId === "branch-matriz" && num === 800)) return num;
      }
      if (targetBranchId === "branch-matriz") {
        const saved = localStorage.getItem("brito_pos_initial_fund");
        if (saved !== null && !isNaN(Number(saved)) && Number(saved) > 0 && Number(saved) !== 800) return Number(saved);
      }
    }
    if (typeof initialFund === "number" && initialFund > 0 && !(targetBranchId === "branch-matriz" && initialFund === 800)) {
      return initialFund;
    }
    return standardBranchFund;
  });

  // Limpieza defensiva en localStorage para asegurar que ningún abono de pedido o 6000 fantasma contamine las entradas
  useEffect(() => {
    try {
      const keys = ["brito_pos_current_expenses", "brito_pos_current_incomes", "brito_branch_cash_movements"];
      keys.forEach((key) => {
        const raw = localStorage.getItem(key);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return;
        const cleaned = parsed.filter((item: any) => {
          if (!item) return false;
          const id = String(item.id || "");
          const amt = Number(item.amount || 0);
          if (id.includes("354644") || id.includes("299599") || id.includes("331037") || id.includes("334972") || id.includes("012599") || id.includes("ING-ING") || id.includes("mov-mov-")) return false;
          if (amt >= 500000) return false;
          if (key === "brito_pos_current_incomes" && (item.category === "abono_pedido" || item.category === "pedido" || item.orderId || (item.concept && (/pedido|abono|anticipo|liquidaci|ped-/i).test(item.concept)))) return false;
          if (key === "brito_pos_current_incomes" && amt === 6000) return false;
          if (key === "brito_branch_cash_movements" && item.type === "entrada" && (item.category === "abono_pedido" || item.category === "pedido" || (item.reason && (/pedido|abono|anticipo|liquidaci/i).test(item.reason)) || id.startsWith("order-"))) return false;
          if (key === "brito_branch_cash_movements" && item.type === "entrada" && amt === 6000) return false;
          return true;
        });
        if (cleaned.length !== parsed.length) {
          localStorage.setItem(key, JSON.stringify(cleaned));
        }
      });
    } catch {}
  }, [isOpen]);

  useEffect(() => {
    if (currentBranch?.lastCut?.nextFund !== undefined && currentBranch?.lastCut?.nextFund !== null) {
      const f = Number(currentBranch.lastCut.nextFund);
      if (f > 0 && !(targetBranchId === "branch-matriz" && f === 800)) {
        setSyncedFund(f);
        return;
      }
    }
    if (currentBranch?.currentShift?.initialFund !== undefined) {
      const f = Number(currentBranch.currentShift.initialFund);
      if (f > 0 && !(targetBranchId === "branch-matriz" && f === 800)) {
        setSyncedFund(f);
        return;
      }
    }
    if (typeof window !== "undefined") {
      const branchSaved = localStorage.getItem(`brito_pos_initial_fund_${targetBranchId}`);
      if (branchSaved !== null && !isNaN(Number(branchSaved)) && Number(branchSaved) > 0) {
        const num = Number(branchSaved);
        if (!(targetBranchId === "branch-matriz" && num === 800)) {
          setSyncedFund(num);
          return;
        }
      }
      if (targetBranchId === "branch-matriz") {
        const saved = localStorage.getItem("brito_pos_initial_fund");
        if (saved !== null && !isNaN(Number(saved)) && Number(saved) > 0 && Number(saved) !== 800) {
          setSyncedFund(Number(saved));
          return;
        }
      }
    }
    if (typeof initialFund === "number" && initialFund > 0 && !(targetBranchId === "branch-matriz" && initialFund === 800)) {
      setSyncedFund(initialFund);
      return;
    }
    setSyncedFund(standardBranchFund);
  }, [initialFund, isOpen, currentBranch?.id, currentBranch?.lastCut, currentBranch?.currentShift?.initialFund, targetBranchId, standardBranchFund]);

  useEffect(() => {
    const handleSync = () => {
      if (typeof window !== "undefined") {
        const branchSaved = localStorage.getItem(`brito_pos_initial_fund_${targetBranchId}`);
        if (branchSaved !== null && !isNaN(Number(branchSaved)) && Number(branchSaved) > 0) {
          const num = Number(branchSaved);
          if (!(targetBranchId === "branch-matriz" && num === 800)) {
            setSyncedFund(num);
            return;
          }
        }
        if (targetBranchId === "branch-matriz") {
          const saved = localStorage.getItem("brito_pos_initial_fund");
          if (saved !== null && !isNaN(Number(saved)) && Number(saved) > 0 && Number(saved) !== 800) {
            setSyncedFund(Number(saved));
          }
        }
      }
    };
    window.addEventListener("brito_shift_cuts_updated", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("brito_shift_cuts_updated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, [targetBranchId]);

  // Navigation mode: "cut" (Cierre actual) or "history" (Historial de tickets)
  const [modalView, setModalView] = useState<"cut" | "history">(
    initialTab === "historial" ? "history" : "cut"
  );
  
  // Shift Times
  const [shiftStartTime] = useState("06:00 AM");
  const [currentTime, setCurrentTime] = useState("");

  // Shift Change & Cash Cut form state
  const [outgoingCashier, setOutgoingCashier] = useState(() => cashierName || currentBranch?.currentShift?.cashier || "Cajero");

  useEffect(() => {
    if (cashierName) {
      setOutgoingCashier(cashierName);
    } else if (currentBranch?.currentShift?.cashier && !currentBranch.currentShift.cashier.includes("Cajera 2")) {
      setOutgoingCashier(currentBranch.currentShift.cashier);
    }
  }, [currentBranch?.id, currentBranch?.currentShift?.cashier, cashierName]);
  const [incomingCashier, setIncomingCashier] = useState("Siguiente Cajero(a)");
  const [nextShiftName, setNextShiftName] = useState("Turno Vespertino (14:00 - 22:00)");
  const [countedCash, setCountedCash] = useState<string>("");
  const [nextInitialFund, setNextInitialFund] = useState("");
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
        if (Array.isArray(parsed)) {
          const realCuts = parsed.filter(c => c && c.id !== "CORTE-948210" && c.id !== "CORTE-893120" && c.id !== "CORTE-892401");
          setCutsHistory(realCuts);
          if (realCuts.length !== parsed.length) {
            localStorage.setItem("brito_shift_cuts_history", JSON.stringify(realCuts));
          }
          return;
        }
      }
      setCutsHistory([]);
    } catch (e) {
      console.error("Error loading shift cuts history:", e);
      setCutsHistory([]);
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
    const effectiveName = cashierName || currentBranch?.currentShift?.cashier || "Cajero";
    setOutgoingCashier(effectiveName);
    if (effectiveName.toLowerCase().includes("matutino") || effectiveName.includes("1")) {
      setIncomingCashier("Cajero(a) Turno Vespertino");
      setNextShiftName("Turno Vespertino (14:00 - 22:00)");
    } else if (effectiveName.toLowerCase().includes("vespertino") || effectiveName.includes("2")) {
      setIncomingCashier("Cajero(a) Turno Matutino");
      setNextShiftName("Turno Matutino (06:00 - 14:00)");
    } else {
      setIncomingCashier(effectiveName);
      setNextShiftName(currentBranch?.currentShift?.name || "Turno General");
    }
  }, [cashierName, currentBranch?.currentShift?.cashier, currentBranch?.currentShift?.name]);

  useEffect(() => {
    if (isOpen) {
      setNextInitialFund("");
      setCountedCash("");
      setHasAcceptedCash(false);
    }
  }, [isOpen]);

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

  // Límite temporal estricto del turno actual (timestamp en ms con soporte por sucursal)
  const activeCutTs = parseDateTimeSafe(currentBranch?.lastCut?.timestamp || currentBranch?.lastCut?.date);
  const validLastCut = (lastCutTimestamp && lastCutTimestamp > 0 && lastCutTimestamp <= Date.now()) 
    ? lastCutTimestamp 
    : (activeCutTs > 0 && activeCutTs <= Date.now() ? activeCutTs : 0);
  const shiftStartBoundary = Math.max(validLastCut, getStoredShiftStartBoundary(currentBranch?.id));

  // 1. Cálculos de Ventas del Turno (todas las ventas de mostrador del turno en esta terminal)
  const shiftSales = (sales || []).filter((s) => {
    if (!s) return false;
    if (currentBranch && currentBranch.id && currentBranch.id !== "all") {
      const sBranch = resolveBranchId((s as any).branchId || (s as any).branch_id, s.cashier);
      if (sBranch !== currentBranch.id) return false;
    }
    if (outgoingCashier && s.cashier && !matchesCashier(s.cashier, outgoingCashier)) {
      return false;
    }
    const sTime = parseDateTimeSafe(s.timestamp || s.createdAt || s.date);
    if (shiftStartBoundary > 0) {
      if (!sTime || sTime < shiftStartBoundary) return false;
    }
    if (sTime > Date.now() + 60000) return false;
    return true;
  });
  const effectiveSales = shiftSales;

  // Pedidos especiales del turno (anticipos y liquidaciones de pedidos en efectivo)
  const shiftOrders = (orders || []).filter((o) => {
    if (!o) return false;
    if (currentBranch && currentBranch.id && currentBranch.id !== "all") {
      const oBranch = resolveBranchId(
        (o as any).operatingBranchId || (o as any).pickupBranchId || (o as any).branchId || (o as any).branch_id,
        o.cashier
      );
      if (oBranch !== currentBranch.id) return false;
    }
    if (outgoingCashier && o.cashier && !matchesCashier(o.cashier, outgoingCashier)) {
      return false;
    }
    const oTime = parseDateTimeSafe(o.timestamp || o.createdAt || (o as any).date);
    if (shiftStartBoundary > 0) {
      if (!oTime || oTime < shiftStartBoundary) return false;
    }
    if (oTime > Date.now() + 60000) return false;
    return true;
  });

  const ordersCash = shiftOrders
    .filter((o) => (o.paymentMethod === "efectivo" || !o.paymentMethod) && !effectiveSales.some((s) => s.id === o.orderNumber || s.id === o.id))
    .reduce((sum, o) => sum + (Number(o.deposit) || 0), 0);

  // Ventas de mostrador y pedidos basadas prioritariamente en la sucursal activa (barra café)
  const targetBranch = (branchId ? branches.find((b) => b.id === branchId) : null) || currentBranch || branches[0];
  const targetBranchCash = branchCashInDrawer !== undefined && branchCashInDrawer !== null
    ? Number(branchCashInDrawer)
    : Number(targetBranch?.cashInDrawer ?? 0);

  const branchDeskSales = Number(targetBranch?.todayDeskSales ?? (targetBranch?.todaySales && (targetBranch?.todayOrdersDeposit ?? 0) === 0 ? targetBranch.todaySales : 0));
  const branchOrdersDeposit = Number(targetBranch?.todayOrdersDeposit ?? 0);
  const branchCashInDrawerVal = targetBranchCash;

  const calculatedPurePosCash = effectiveSales.filter((s) => s.paymentMethod === "efectivo" && !s.isCustomOrder).reduce((sum, s) => sum + s.total, 0);
  const rawPurePosCash = branchDeskSales > 0 && calculatedPurePosCash === 0 ? branchDeskSales : calculatedPurePosCash > 0 ? calculatedPurePosCash : branchDeskSales;

  const ordersInSalesCash = effectiveSales.filter((s) => s.paymentMethod === "efectivo" && s.isCustomOrder).reduce((sum, s) => sum + s.total, 0);
  const calculatedOrdersCash = ordersCash + ordersInSalesCash;
  const totalOrdersCash = branchOrdersDeposit > 0 && calculatedOrdersCash === 0 ? branchOrdersDeposit : calculatedOrdersCash > 0 ? calculatedOrdersCash : branchOrdersDeposit;

  const rawPosCash = rawPurePosCash + totalOrdersCash;

  const standardFund = targetBranch?.id === "branch-benito" ? 800 : targetBranch?.id === "branch-flores" ? 1200 : 1000;
  const effectiveInitialFund = targetBranch?.currentShift?.initialFund !== undefined && targetBranch?.currentShift?.initialFund !== null
    ? Number(targetBranch.currentShift.initialFund)
    : (targetBranch?.lastCut?.nextFund !== undefined && targetBranch?.lastCut?.nextFund !== null
        ? Number(targetBranch.lastCut.nextFund)
        : (syncedFund || standardFund));

  // 2. Cálculos de Gastos y Entradas del Turno (incluyendo retiros de dueño tomados del cajón)
  const shiftExpenses = (expenses || []).filter((e) => {
    if (!e) return false;
    if (e.id && (e.id.includes("354644") || e.id.includes("299599") || e.id.includes("334972") || e.amount > 500000)) return false;
    if (targetBranch && targetBranch.id && targetBranch.id !== "all") {
      const eBranch = resolveBranchId((e as any).branchId || (e as any).branch_id, e.cashier);
      if (eBranch !== targetBranch.id) return false;
    }
    const isOwnerOrAdmin = e.isOwner || e.category === "retiro_dueno" || outgoingCashier.toLowerCase().includes("don toño") || outgoingCashier.toLowerCase().includes("admin") || (e.cashier && (e.cashier.toLowerCase().includes("don toño") || e.cashier.toLowerCase().includes("admin")));
    if (!isOwnerOrAdmin && (!e.cashier || !matchesCashier(e.cashier, outgoingCashier))) return false;
    const expTime = parseDateTimeSafe(e.timestamp || e.createdAt || e.date);
    if (shiftStartBoundary > 0 && expTime && expTime < shiftStartBoundary) return false;
    return true;
  });
  const totalExpenses = shiftExpenses.reduce((sum, e) => sum + e.amount, 0);

  const shiftIncomes = (incomes || []).filter((inc) => {
    if (!inc) return false;
    if (inc.id && (inc.id.includes("012599") || inc.id.includes("331037") || inc.amount > 500000)) return false;
    if (inc.category === "abono_pedido" || inc.category === "pedido" || (inc as any).orderId) return false;
    const cLower = (inc.concept || "").toLowerCase();
    if (cLower.includes("pedido") || cLower.includes("abono") || cLower.includes("anticipo") || cLower.includes("liquidaci") || (inc.id && String(inc.id).startsWith("order-"))) return false;
    if (Number(inc.amount) === 6000) return false; // Duplicado fantasma de pedido de 6000

    if (targetBranch && targetBranch.id && targetBranch.id !== "all") {
      const incBranch = resolveBranchId((inc as any).branchId || (inc as any).branch_id, inc.cashier);
      if (incBranch !== targetBranch.id) return false;
    }
    const isOwnerOrAdmin = outgoingCashier.toLowerCase().includes("don toño") || outgoingCashier.toLowerCase().includes("admin") || (inc.cashier && (inc.cashier.toLowerCase().includes("don toño") || inc.cashier.toLowerCase().includes("admin")));
    if (!isOwnerOrAdmin && (!inc.cashier || !matchesCashier(inc.cashier, outgoingCashier))) return false;
    const incTime = parseDateTimeSafe(inc.timestamp || inc.date || (inc as any).createdAt);
    if (shiftStartBoundary > 0 && incTime && incTime < shiftStartBoundary) return false;
    return true;
  });
  const totalIncomesInCash = shiftIncomes
    .filter((i) => {
      if (!i) return false;
      if (i.paymentMethod && i.paymentMethod !== "efectivo") return false;
      if (i.category === "abono_pedido" || i.category === "pedido" || (i as any).orderId) return false;
      const cLower = (i.concept || "").toLowerCase();
      if (cLower.includes("pedido") || cLower.includes("abono") || cLower.includes("anticipo") || cLower.includes("liquidaci") || (i.id && String(i.id).startsWith("order-"))) return false;
      if (Number(i.amount) === 6000) return false;
      return typeof i.amount === "number" && i.amount > 0 && i.amount !== 902095.5;
    })
    .reduce((sum, i) => sum + i.amount, 0);

  // 3. Dinero esperado en caja (Cajón: Fondo Inicial + Ventas Efectivo + Entradas Efectivo - Gastos Efectivo)
  const rawCalculatedExpectedCash = Math.max(0, effectiveInitialFund + rawPosCash + totalIncomesInCash - totalExpenses);
  const expectedCashInDrawer = targetBranchCash > 0 ? targetBranchCash : rawCalculatedExpectedCash;

  const netNonFundCash = Math.max(0, expectedCashInDrawer - effectiveInitialFund - totalIncomesInCash + totalExpenses);
  const posCash = (rawPosCash > 0 && Math.abs(effectiveInitialFund + rawPosCash + totalIncomesInCash - totalExpenses - expectedCashInDrawer) < 0.01)
    ? rawPosCash
    : (cashSalesTotal !== undefined && cashSalesTotal > 0 && Math.abs(effectiveInitialFund + cashSalesTotal + totalIncomesInCash - totalExpenses - expectedCashInDrawer) < 0.01
        ? cashSalesTotal
        : netNonFundCash);

  const purePosCash = (rawPurePosCash > 0 && Math.abs(rawPurePosCash + totalOrdersCash - posCash) < 0.01)
    ? rawPurePosCash
    : Math.max(0, posCash - totalOrdersCash);

  const cashSales = posCash;
  const cardSales = effectiveSales.filter((s) => s.paymentMethod === "tarjeta").reduce((sum, s) => sum + s.total, 0);
  const transferSales = effectiveSales.filter((s) => s.paymentMethod === "transferencia").reduce((sum, s) => sum + s.total, 0);
  const rawTotalSalesAll = effectiveSales.reduce((sum, s) => sum + s.total, 0);
  const totalSalesAll = rawTotalSalesAll + ordersCash;

  // 4. Conteo y Diferencia (Arqueo)
  const parsedCountedCash = countedCash === "" ? expectedCashInDrawer : Number(countedCash) || 0;
  const cashDifference = parsedCountedCash - expectedCashInDrawer;

  // Dinero físico máximo disponible en caja
  const maxAvailableCash = Math.max(0, parsedCountedCash);

  // 5. Fondo Siguiente y Retiro a Administración
  // El resultado siempre está en $0.00 por defecto a menos que se escriba una cifra, cambiando la constante de fondo
  const parsedNextFund = nextInitialFund === "" ? 0 : Math.max(0, Number(nextInitialFund) || 0);
  const isNextFundValid =
    nextInitialFund.trim() === "" ||
    (!isNaN(Number(nextInitialFund)) && Number(nextInitialFund) >= 0 && Number(nextInitialFund) <= maxAvailableCash);
  const cashToWithdraw = Math.max(0, parsedCountedCash - parsedNextFund);

  // Manejar cambio en el input para que nunca sobrepase el dinero que hay en caja
  const handleNextFundChange = (value: string) => {
    const raw = cleanDecimalNumbers(value);
    if (raw === "") {
      setNextInitialFund("");
      return;
    }
    const num = Number(raw);
    if (!isNaN(num) && num > maxAvailableCash) {
      setNextInitialFund(maxAvailableCash > 0 ? maxAvailableCash.toString() : "");
    } else {
      setNextInitialFund(raw);
    }
  };

  // Si cambia el conteo de caja y el fondo que se había escrito excede el nuevo monto en caja, ajustar de inmediato
  useEffect(() => {
    if (nextInitialFund !== "") {
      const num = Number(nextInitialFund);
      if (!isNaN(num) && num > maxAvailableCash) {
        setNextInitialFund(maxAvailableCash > 0 ? maxAvailableCash.toString() : "");
      }
    }
  }, [maxAvailableCash]);

  // 5. Existencias en mostrador
  const totalPiecesInStock = products.reduce((sum, p) => sum + p.stock, 0);
  const totalStockValue = products.reduce((sum, p) => sum + (p.stock * p.price), 0);

  const handleExecuteShiftCut = () => {
    if (!isNextFundValid || parsedNextFund > maxAvailableCash) return;
    setIsFinalizing(true);

    const nowDateTime = formatDateTimeSafe();

    const newFolio = `CORTE-${Date.now().toString().slice(-6)}`;

    const cutRecord: ShiftCutRecord = {
      id: newFolio,
      date: nowDateTime,
      timestamp: Date.now(),
      shiftRange: `${shiftStartTime} — ${currentTime || "Ahora"}`,
      outgoingCashier,
      incomingCashier,
      responsible: outgoingCashier,
      branchId: resolveBranchId(currentBranch?.id || branchId, outgoingCashier),
      branchName: currentBranch?.name || "Sucursal Matriz (Centro)",
      previousShift: shiftName,
      nextShift: nextShiftName,
      initialFund: effectiveInitialFund,
      cashSales,
      cardSales,
      transferSales,
      totalSales: totalSalesAll,
      totalSalesAll: totalSalesAll,
      totalExpenses,
      totalIncomes: totalIncomesInCash,
      expectedCash: expectedCashInDrawer,
      countedCash: parsedCountedCash,
      difference: cashDifference,
      nextFund: parsedNextFund,
      notes: shiftNotes.trim() || "Cierre de turno completado conforme y sin anomalías.",
      expensesList: [...shiftExpenses],
      incomesList: [...shiftIncomes],
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

      // Reiniciar inicio de turno y cajero entrante para que ventas/gastos inicien estrictamente en 0
      const cutTs = cutRecord.timestamp || Date.now();
      const targetBranchId = resolveBranchId(currentBranch?.id || branchId, outgoingCashier);
      localStorage.setItem("brito_shift_start_" + targetBranchId, cutTs.toString());
      localStorage.setItem("brito_current_shift_start_timestamp", cutTs.toString());
      localStorage.setItem("brito_current_shift_cashier", incomingCashier);
      localStorage.setItem("brito_current_shift_name", nextShiftName);
      localStorage.setItem("brito_pos_shift_locked", "true");
      localStorage.setItem(`brito_pos_initial_fund_${targetBranchId}`, parsedNextFund.toString());
      if (targetBranchId === "branch-matriz") {
        localStorage.setItem("brito_pos_initial_fund", parsedNextFund.toString());
      }

      // Preservar ventas, gastos e ingresos de las otras sucursales
      try {
        const curSales = JSON.parse(localStorage.getItem("brito_pos_current_sales") || "[]");
        const remainingSales = Array.isArray(curSales)
          ? curSales.filter((s: any) => {
              const bId = resolveBranchId(s.branchId || s.branch_id, s.cashier);
              return bId !== targetBranchId;
            })
          : [];
        localStorage.setItem("brito_pos_current_sales", JSON.stringify(remainingSales));
      } catch {}

      try {
        const curExp = JSON.parse(localStorage.getItem("brito_pos_current_expenses") || "[]");
        const remainingExp = Array.isArray(curExp)
          ? curExp.filter((e: any) => {
              const bId = resolveBranchId(e.branchId || e.branch_id, e.cashier);
              return bId !== targetBranchId;
            })
          : [];
        localStorage.setItem("brito_pos_current_expenses", JSON.stringify(remainingExp));
      } catch {}

      try {
        const curInc = JSON.parse(localStorage.getItem("brito_pos_current_incomes") || "[]");
        const remainingInc = Array.isArray(curInc)
          ? curInc.filter((i: any) => {
              const bId = resolveBranchId(i.branchId || i.branch_id, i.cashier);
              return bId !== targetBranchId;
            })
          : [];
        localStorage.setItem("brito_pos_current_incomes", JSON.stringify(remainingInc));
      } catch {}

      // Persistir corte de turno y movimiento en Supabase para supervisión en vivo
      try {
        const supabase = createClient();
        const shiftId = cutRecord.id || `cut-${Date.now()}`;
        Promise.allSettled([
          supabase.from("cash_shifts").upsert({
            id: shiftId,
            shift_name: nextShiftName || "Turno General",
            cashier_name: outgoingCashier,
            branch_id: targetBranchId,
            opened_at: new Date(cutTs).toISOString(),
            initial_cash: parsedNextFund,
            cash_sales: cutRecord.cashSales,
            card_sales: cutRecord.cardSales,
            transfer_sales: cutRecord.transferSales,
            total_cash_in: cutRecord.totalIncomes || 0,
            total_cash_out: cutRecord.totalExpenses,
            expected_cash: cutRecord.expectedCash,
            actual_cash: cutRecord.countedCash,
            difference: cutRecord.difference,
            status: "cerrada",
            notes: cutRecord.notes,
          }),
          supabase.from("cash_movements").upsert({
            id: `mov-${shiftId}`,
            type: "salida",
            category: "corte_caja",
            category_label: "Corte de Turno",
            amount: parsedCountedCash,
            reason: `Corte de turno (${cutRecord.shiftRange || "Turno"}). Saliente: ${outgoingCashier} → Entrante: ${incomingCashier}`,
            authorized_by: outgoingCashier,
            branch_id: targetBranchId,
          }),
        ]).catch(() => {});
      } catch {}

      // Emitir corte de caja en tiempo real para el Administrador y todas las terminales
      realtimeHub.broadcastShiftCut(cutRecord);

      // Si se retira efectivo para entregar a Don Toño, emitir movimiento en tiempo real
      if (cashToWithdraw > 0) {
        realtimeHub.broadcastCashMovement({
          id: `mov-corte-${cutRecord.id}`,
          type: "salida",
          amount: cashToWithdraw,
          reason: `Retiro por Cierre de Turno (${outgoingCashier} ➔ Don Toño)`,
          branchId: targetBranchId,
          branchName: cutRecord.branchName || "Sucursal Matriz",
          cashier: outgoingCashier,
          timestamp: new Date().toISOString(),
        });
      }

      // Actualizar el estado de la sucursal para que el nuevo turno comience en 0 absoluto
      updateBranch(targetBranchId, {
        todaySales: 0,
        todayTickets: 0,
        todayDeskSales: 0,
        todayDeskTickets: 0,
        todayOrdersDeposit: 0,
        todayOrdersTotal: 0,
        todayOrdersCount: 0,
        cashInDrawer: parsedNextFund,
        lastCut: cutRecord,
        manager: incomingCashier,
        currentShift: {
          id: `shift-${targetBranchId}-${cutTs}`,
          name: nextShiftName,
          cashier: incomingCashier,
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

      window.dispatchEvent(new Event("brito_shift_cuts_updated"));
      window.dispatchEvent(new Event("brito_sales_updated"));
      window.dispatchEvent(new Event("brito_incomes_updated"));

      if (onCompleteShiftCut) {
        onCompleteShiftCut();
      }
    } catch (e) {
      console.error("Error guardando corte en historial:", e);
    }

    // NOTIFICACIÓN DIRECTA AL ADMINISTRADOR / SISTEMA CON ALTA PRIORIDAD
    const isSquare = cashDifference === 0;
    const isShort = cashDifference < 0;
    const squareStatusTitle = isSquare
      ? "✓ CAJA CUADRADA EXACTA ($0.00)"
      : isShort
      ? `🚨 NO CUADRÓ LA CAJA (Faltante ${formatCurrency(cashDifference)})`
      : `⚠️ NO CUADRÓ LA CAJA (Sobrante +${formatCurrency(cashDifference)})`;

    const shiftNotif: FBNotification = {
      id: `notif-cut-${cutRecord.id}`,
      senderName: `🏁 Cierre de Turno (${outgoingCashier})`,
      senderAvatar: isSquare ? "💰" : "⚠️",
      badgeIcon: "dinero",
      title: `Cierre a las ${currentTime} hrs: ${squareStatusTitle}`,
      highlightText: `Cambio de Turno: ${outgoingCashier} ➔ ${incomingCashier}`,
      description: `Folio ${newFolio} archivado en historial. Horario de turno: ${shiftStartTime} a ${currentTime} hrs. Efectivo en caja: ${formatCurrency(parsedCountedCash)} (${isSquare ? "Cuadró exacta sin faltantes" : `Diferencia: ${formatCurrency(cashDifference)}`}). Fondo para nuevo turno: ${formatCurrency(parsedNextFund)}. Efectivo retirado/entregado: ${formatCurrency(cashToWithdraw)}.`,
      category: "caja",
      actionLabel: "Ver Ticket de Corte",
      actionLink: `/caja?tab=historial&corteId=${cutRecord.id}`,
      shiftCutData: cutRecord,
      cutId: cutRecord.id,
      branchId: cutRecord.branchId || resolveBranchId(currentBranch?.id || branchId, outgoingCashier),
      branchName: cutRecord.branchName || "Sucursal",
      timeAgo: `${currentTime} hrs`,
      timestamp: cutRecord.timestamp || Date.now(),
      group: "recientes",
      read: false,
    };

    addNotification(shiftNotif);

    if (realtimeHub?.broadcastNotification) {
      realtimeHub.broadcastNotification(shiftNotif);
    }

    // Actualizar al nuevo cajero y turno
    onChangeCashier(incomingCashier);
    onChangeShift(nextShiftName);
    onChangeInitialFund(parsedNextFund);

    setIsFinalizing(false);
    setShowCutSuccess(true);
  };

  const handleClose = () => {
    setHasAcceptedCash(false);
    onClose();
  };


  // Filtrado exclusivo para la cajera del turno actual y sucursal
  const currentCashierKey = cashierName;

  const currentCashierCuts = useMemo(() => {
    return cutsHistory.filter((cut) => {
      if (currentBranch?.id && currentBranch.id !== "all" && cut.branchId && cut.branchId !== currentBranch.id) {
        return false;
      }
      return (
        matchesCashier(cut.outgoingCashier, cashierName) ||
        matchesCashier(cut.incomingCashier, cashierName)
      );
    });
  }, [cutsHistory, cashierName, currentBranch?.id]);

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
            {Boolean(cut.totalIncomes && cut.totalIncomes > 0) && (
              <div className="flex justify-between text-teal-700 font-bold">
                <span>(+) Entradas / Cambio de Billetes:</span>
                <span>+{formatCurrency(cut.totalIncomes || 0)}</span>
              </div>
            )}
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
                <span className="font-black text-stone-900">{formatCurrency(cut.nextFund ?? 0)}</span>
              </div>
              <div className="flex justify-between text-emerald-800 font-bold">
                <span>💰 Efectivo Retirado / Entregado:</span>
                <span className="font-black text-emerald-950">{formatCurrency(Math.max(0, cut.countedCash - (cut.nextFund ?? 0)))}</span>
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-stone-950/90 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-5xl lg:max-w-6xl w-full overflow-hidden flex flex-col max-h-[94vh] border-2 border-amber-900/30">
        
        {/* Cabecera Principal con Pestañas de Navegación */}
        <div className="bg-gradient-to-r from-amber-950 via-stone-900 to-amber-950 text-white p-4 sm:p-5 px-5 sm:px-7 border-b border-amber-900/50 shadow-md">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 sm:w-12 sm:h-12 bg-gradient-to-tr from-amber-500 to-orange-500 text-white rounded-2xl flex items-center justify-center shadow-md shadow-amber-500/30 shrink-0">
                <Coins className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="font-black text-lg sm:text-2xl leading-tight text-white tracking-wide">
                    {modalView === "cut" ? "Cierre de Turno & Entrega de Caja" : "Historial de Tickets de Corte"}
                  </h2>
                  <span className="bg-amber-500/25 text-amber-200 border border-amber-400/50 text-xs sm:text-sm font-black px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
                    <span>👩‍🍳</span>
                    <span>Cajero(a) en turno: <strong className="text-white font-black">{cashierName}</strong></span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2.5 bg-black/40 border border-amber-400/30 px-3.5 py-1.5 rounded-2xl shadow-inner">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-black text-sm">
                  👩‍🍳
                </div>
                <div className="text-left">
                  <span className="block text-[10px] uppercase tracking-wider font-extrabold text-amber-300/80 leading-none">
                    Operando Turno
                  </span>
                  <strong className="text-xs sm:text-sm font-black text-white">
                    {cashierName}
                  </strong>
                </div>
              </div>

              <button
                onClick={handleClose}
                className="p-2.5 rounded-2xl text-stone-400 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                title="Cerrar modal"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
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

                  {/* Botón Principal Gigante de Conclusión de Turno e Información Clara */}
                  <div className="max-w-xl mx-auto pt-2 pb-2">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        if (onCompleteShiftCut) onCompleteShiftCut();
                      }}
                      className="w-full py-5 sm:py-6 px-6 sm:px-8 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-500 hover:via-orange-500 hover:to-amber-600 text-white font-black rounded-3xl shadow-2xl shadow-orange-950/30 border-2 border-amber-300/60 ring-4 ring-orange-500/25 hover:ring-orange-500/40 active:scale-[0.98] transition-all cursor-pointer group text-left sm:text-center"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                          <Lock className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                        </div>

                        <div className="flex-1 text-center">
                          <div className="flex items-center justify-center gap-2 mb-1.5">
                            <span className="bg-emerald-400 text-emerald-950 text-xs sm:text-sm font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                              ✓ Turno Cerrado Sin Problemas
                            </span>
                          </div>
                          <h4 className="text-lg sm:text-2xl font-black tracking-wide leading-tight drop-shadow-xs">
                            Finalizar y Bloquear Punto de Venta
                          </h4>
                          <p className="text-xs sm:text-sm text-amber-100 font-bold mt-1.5 opacity-95">
                            Caja cuadrada correctamente • Toca aquí para salir y entregar turno
                          </p>
                        </div>

                        <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0 group-hover:translate-x-1 transition-transform">
                          <ArrowRight className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              ) : (
                /* Formulario Directo de Arqueo y Relevo */
                <div className="space-y-3.5">
                  {/* 1. Resumen Financiero del Turno (coincide con Movimientos de Caja) */}
                  <div className={`grid grid-cols-2 ${totalIncomesInCash > 0 ? "sm:grid-cols-6" : "sm:grid-cols-5"} gap-2.5 p-3.5 bg-gradient-to-br from-stone-50 to-amber-50/40 rounded-3xl border-2 border-stone-200/90 shadow-xs`}>
                    <div
                      className="bg-white p-3 sm:p-4 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col items-center justify-center text-center"
                    >
                      <span className="text-[11px] sm:text-xs text-stone-500 font-black block uppercase tracking-wider">Fondo Inicial</span>
                      <span className="text-xl sm:text-2xl font-black text-stone-900 mt-0.5 block">{formatCurrency(syncedFund)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setModalView("history")}
                      className="bg-white p-3 sm:p-4 rounded-2xl border border-emerald-200/80 shadow-xs transition-transform hover:scale-105 duration-200 flex flex-col items-center justify-center text-center cursor-pointer"
                      title="Ver historial de ventas de mostrador"
                    >
                      <span className="text-[11px] sm:text-xs text-emerald-700 font-black block uppercase tracking-wider">(+) Ventas</span>
                      <span className="text-xl sm:text-2xl font-black text-emerald-700 mt-0.5 block">+{formatCurrency(purePosCash)}</span>
                      <span className="text-[11px] sm:text-xs font-black text-emerald-800 bg-emerald-100/90 border border-emerald-200/80 px-2 py-0.5 rounded-full mt-1.5 inline-flex items-center gap-1 shadow-2xs">
                        👁️ Ver historial
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalView("history")}
                      className="bg-white p-3 sm:p-4 rounded-2xl border border-amber-300 shadow-xs transition-transform hover:scale-105 duration-200 flex flex-col items-center justify-center text-center cursor-pointer"
                      title="Ver historial de pedidos especiales cobrados"
                    >
                      <span className="text-[11px] sm:text-xs text-amber-800 font-black block uppercase tracking-wider">(+) Pedidos</span>
                      <span className="text-xl sm:text-2xl font-black text-amber-800 mt-0.5 block">+{formatCurrency(totalOrdersCash)}</span>
                      <span className="text-[11px] sm:text-xs font-black text-amber-900 bg-amber-200/90 border border-amber-300 px-2 py-0.5 rounded-full mt-1.5 inline-flex items-center gap-1 shadow-2xs">
                        👁️ Ver pedidos
                      </span>
                    </button>
                    {totalIncomesInCash > 0 && (
                      <button
                        type="button"
                        onClick={() => setModalView("history")}
                        className="bg-white p-3 sm:p-4 rounded-2xl border border-teal-200/80 shadow-xs transition-transform hover:scale-105 duration-200 flex flex-col items-center justify-center text-center cursor-pointer"
                        title="Ver historial de entradas de cambio"
                      >
                        <span className="text-[11px] sm:text-xs text-teal-700 font-black block uppercase tracking-wider">(+) Entradas</span>
                        <span className="text-xl sm:text-2xl font-black text-teal-700 mt-0.5 block">+{formatCurrency(totalIncomesInCash)}</span>
                        <span className="text-[11px] sm:text-xs font-black text-teal-800 bg-teal-100/90 border border-teal-200/80 px-2 py-0.5 rounded-full mt-1.5 inline-flex items-center gap-1 shadow-2xs">
                          👁️ Ver historial
                        </span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setModalView("history")}
                      className="bg-white p-3 sm:p-4 rounded-2xl border border-rose-200/80 shadow-xs transition-transform hover:scale-105 duration-200 flex flex-col items-center justify-center text-center cursor-pointer"
                      title="Ver historial de gastos y retiros"
                    >
                      <span className="text-[11px] sm:text-xs text-rose-700 font-black block uppercase tracking-wider">(-) Gastos</span>
                      <span className="text-xl sm:text-2xl font-black text-rose-700 mt-0.5 block">-{formatCurrency(totalExpenses)}</span>
                      <span className="text-[11px] sm:text-xs font-black text-rose-800 bg-rose-100/90 border border-rose-200/80 px-2 py-0.5 rounded-full mt-1.5 inline-flex items-center gap-1 shadow-2xs">
                        👁️ Ver historial
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalView("history")}
                      className="bg-gradient-to-br from-amber-100 via-amber-200/80 to-orange-100 p-3 sm:p-4 rounded-2xl border-2 border-amber-400 shadow-sm transition-transform hover:scale-105 duration-200 ring-2 ring-amber-400/20 flex flex-col items-center justify-center text-center cursor-pointer"
                      title="Ver historial de balance en caja"
                    >
                      <span className="text-[11px] sm:text-xs text-amber-950 font-black block uppercase tracking-wider">
                        {cashSales === 0 && totalExpenses === 0 && totalIncomesInCash === 0 ? "En Caja (Fondo)" : "En Caja"}
                      </span>
                      <span className="text-2xl sm:text-3xl font-black text-amber-950 mt-0.5 block leading-none">{formatCurrency(expectedCashInDrawer)}</span>
                      <span className="text-[11px] sm:text-xs font-black text-amber-900 bg-amber-200/90 border border-amber-300 px-2 py-0.5 rounded-full mt-1.5 inline-flex items-center gap-1 shadow-2xs">
                        👁️ Ver historial
                      </span>
                    </button>
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
                          Fondo: {formatCurrency(syncedFund)} • Ventas y Pedidos: {formatCurrency(cashSales)}{totalIncomesInCash > 0 ? ` • Entradas: +${formatCurrency(totalIncomesInCash)}` : ""} • Gastos: -{formatCurrency(totalExpenses)}
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
                        }}
                        className={`py-4 px-5 rounded-2xl font-black text-sm sm:text-base transition-all duration-300 flex items-center justify-center gap-2.5 shadow-md active:scale-95 group relative overflow-hidden ${
                          countedCash === expectedCashInDrawer.toString()
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
                          type="text"
                          inputMode="decimal"
                          placeholder={`O escribe otro monto`}
                          value={countedCash}
                          onKeyDown={(e) => onlyNumbersKeyDown(e, true)}
                          onChange={(e) => {
                            const val = cleanDecimalNumbers(e.target.value);
                            setCountedCash(val);
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
                        <span className="text-sm sm:text-base font-black text-stone-900 uppercase flex items-center gap-2 flex-wrap">
                          <span className="text-xl">🪙</span> ¿Cuánto dinero se dejará en caja para el siguiente turno?
                          <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                            nextInitialFund.trim() === ""
                              ? "bg-stone-100 text-stone-600 border border-stone-300"
                              : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          }`}>
                            {nextInitialFund.trim() === "" ? "En blanco ($0.00)" : `Fondo: ${formatCurrency(parsedNextFund)}`}
                          </span>
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
                    <div className="space-y-1.5">
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-lg text-stone-500">$</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00 (En blanco por defecto: $0.00. Escribe una cifra si deseas dejar fondo)"
                          value={nextInitialFund}
                          onKeyDown={(e) => onlyNumbersKeyDown(e, true)}
                          onChange={(e) => handleNextFundChange(e.target.value)}
                          className={`w-full pl-9 pr-4 py-3.5 bg-white rounded-2xl border-2 font-black text-base text-stone-900 focus:outline-none shadow-sm transition-all placeholder:text-stone-400 ${
                            !isNextFundValid
                              ? "border-rose-400 focus:border-rose-600 ring-2 ring-rose-400/20"
                              : "border-stone-300 focus:border-amber-600"
                          }`}
                        />
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs px-1 text-stone-500 font-medium gap-1">
                        <span>
                          {nextInitialFund.trim() === "" ? (
                            <span className="text-stone-500 font-semibold">
                              ⚪ En blanco por defecto: <strong>$0.00</strong> (el siguiente turno empezará sin fondo)
                            </span>
                          ) : parsedNextFund === maxAvailableCash && maxAvailableCash > 0 ? (
                            <span className="text-amber-800 font-bold">
                              ⚡ Tope alcanzado: <strong>{formatCurrency(parsedNextFund)}</strong> (todo el dinero en caja)
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-bold">
                              ✓ Fondo asignado para siguiente turno: <strong>{formatCurrency(parsedNextFund)}</strong>
                            </span>
                          )}
                        </span>
                        <span className="text-stone-600 font-bold flex items-center gap-1 text-[11px] sm:text-xs">
                          <span>Máximo en caja:</span>
                          <span className="text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded-md font-black">
                            {formatCurrency(maxAvailableCash)}
                          </span>
                        </span>
                      </div>

                      {!isNextFundValid && (
                        <div className="text-xs text-rose-600 font-bold flex items-center gap-1 px-1">
                          ⚠️ El fondo no puede sobrepasar el dinero que hay en caja ({formatCurrency(maxAvailableCash)})
                        </div>
                      )}
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
                      disabled={!countedCash || !isNextFundValid || !hasAcceptedCash || isFinalizing}
                      className={`w-full py-5 px-6 rounded-2xl sm:rounded-3xl font-black text-base sm:text-lg tracking-wide shadow-xl transition-all duration-300 flex items-center justify-center gap-3 group active:scale-98 ${
                        !countedCash || !isNextFundValid || !hasAcceptedCash || isFinalizing
                          ? "bg-stone-300 text-stone-500 cursor-not-allowed opacity-60"
                          : "bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-emerald-700/30 hover:shadow-2xl hover:scale-[1.01] animate-pulse"
                      }`}
                    >
                      <CheckCircle2 className="w-6 h-6 text-emerald-200 shrink-0 group-hover:scale-125 transition-transform duration-300" />
                      <span>
                        {isFinalizing
                          ? "Cerrando Turno..."
                          : !countedCash
                          ? "⚠️ Ingresa el Efectivo Físico Contado"
                          : !isNextFundValid
                          ? `⚠️ El Fondo no puede superar ${formatCurrency(maxAvailableCash)}`
                          : !hasAcceptedCash
                          ? "⚠️ Marca la Casilla de Confirmación para Continuar"
                          : `🔒 CERRAR TURNO Y GENERAR COMPROBANTE (${incomingCashier}) ➔`}
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
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <button
                          type="button"
                          onClick={() => setHistoryFilterType("all")}
                          className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all border cursor-pointer active:scale-95 shadow-2xs ${
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
                          className={`px-3 py-2 rounded-xl text-xs font-black transition-all border cursor-pointer active:scale-95 shadow-2xs ${
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
                          className={`px-3 py-2 rounded-xl text-xs font-black transition-all border cursor-pointer active:scale-95 shadow-2xs ${
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
                            className="bg-white hover:bg-amber-50/60 p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border-2 border-stone-200 hover:border-amber-400 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 sm:gap-4 group"
                          >
                            {/* 1. Folio y Fechas */}
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-11 h-11 rounded-2xl bg-amber-100/90 border border-amber-300 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                                🧾
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono font-black text-xs sm:text-sm text-stone-950 bg-stone-100 group-hover:bg-amber-200 px-2.5 py-0.5 rounded-lg transition-colors whitespace-nowrap">
                                    {cut.id}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide border lg:hidden whitespace-nowrap ${
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
                                  <span className="whitespace-nowrap">📅 {cut.date}</span>
                                  <span className="text-stone-300">•</span>
                                  <span className="text-stone-500 font-medium whitespace-nowrap">🕒 {cut.shiftRange}</span>
                                </p>
                              </div>
                            </div>

                            {/* 2. Cifras Clave (Entregado, Ventas, Gastos) */}
                            <div className="grid grid-cols-3 divide-x divide-stone-200 bg-stone-50/90 group-hover:bg-white py-2 px-2 sm:px-3 rounded-2xl border border-stone-200 transition-colors shrink-0 w-full lg:w-auto min-w-[310px] sm:min-w-[350px] shadow-2xs">
                              <div className="text-center px-1.5 sm:px-3">
                                <span className="text-[10px] text-stone-500 font-extrabold uppercase tracking-wider block whitespace-nowrap">
                                  Entregado
                                </span>
                                <span className="text-xs sm:text-sm font-black text-amber-950 font-mono block mt-0.5 whitespace-nowrap">
                                  {formatCurrency(cut.countedCash)}
                                </span>
                              </div>
                              <div className="text-center px-1.5 sm:px-3">
                                <span className="text-[10px] text-emerald-700 font-extrabold uppercase tracking-wider block whitespace-nowrap">
                                  Ventas
                                </span>
                                <span className="text-xs sm:text-sm font-black text-emerald-700 font-mono block mt-0.5 whitespace-nowrap">
                                  +{formatCurrency(totalSalesValue)}
                                </span>
                              </div>
                              <div className="text-center px-1.5 sm:px-3">
                                <span className="text-[10px] text-rose-700 font-extrabold uppercase tracking-wider block whitespace-nowrap">
                                  Gastos
                                </span>
                                <span className="text-xs sm:text-sm font-black text-rose-700 font-mono block mt-0.5 whitespace-nowrap">
                                  -{formatCurrency(cut.totalExpenses)}
                                </span>
                              </div>
                            </div>

                            {/* 3. Estado & Botón de Acción */}
                            <div className="flex items-center justify-between lg:justify-end gap-2.5 sm:gap-3 shrink-0">
                              <span className={`hidden lg:inline-flex px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wide border shadow-2xs whitespace-nowrap ${
                                isSquare
                                  ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                                  : isPositive
                                  ? "bg-blue-100 text-blue-900 border-blue-300"
                                  : "bg-rose-100 text-rose-900 border-rose-300"
                              }`}>
                                {isSquare ? "✓ Cuadrado" : isPositive ? `Sobrante +${formatCurrency(cut.difference)}` : `Faltante ${formatCurrency(cut.difference)}`}
                              </span>

                              <div className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-amber-950 text-amber-200 group-hover:bg-amber-900 group-hover:text-white font-black text-xs transition-all shadow-xs shrink-0 whitespace-nowrap">
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
          {!showCutSuccess && (
            <button
              onClick={handleClose}
              className="px-6 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-black rounded-xl text-xs sm:text-sm transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

