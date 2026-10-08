"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Branch, BranchShift, BranchCashMovement, ShiftCutRecord } from "@/types";
import { realtimeHub } from "@/lib/realtime/realtimeHub";
import { recordCashOutflowAsExpense } from "@/lib/expenses";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { parseDateTimeSafe, getStoredShiftStartBoundary, formatDateTimeSafe, compareMovementsDesc } from "@/lib/utils";

export interface SimulatedSale {
  id: string;
  branchId: string;
  branchName: string;
  itemsSummary: string;
  total: number;
  paymentMethod: "efectivo" | "tarjeta" | "transferencia";
  cashier: string;
  timestamp: string;
}

const DEFAULT_BRANCHES: Branch[] = [
  {
    id: "branch-matriz",
    name: "Sucursal Matriz (Centro)",
    shortName: "Matriz",
    code: "MAT-01",
    address: "Av. Principal #450, Centro Histórico",
    phone: "55 1234 5678",
    manager: "Don Toño Brito",
    assignedUserId: "usr-1",
    assignedUserName: "Don Toño Brito",
    assignedUserEmail: "admin@panaderiabrito.com",
    status: "abierta",
    dailyGoal: 10000,
    todaySales: 0,
    todayTickets: 0,
    cashInDrawer: 1000,
    color: "orange",
    topProduct: {
      name: "Bolillo Tradicional",
      piecesSold: 0,
      category: "Pan Salado",
      icon: "🥖",
    },
    currentShift: {
      id: "shift-mat-101",
      name: "Turno Matutino (06:00 - 14:00)",
      cashier: "carlos bueno",
      openedAt: "06:00 AM",
      initialFund: 1000,
      cashSales: 0,
      cardSales: 0,
      transferSales: 0,
      totalSales: 0,
      ticketCount: 0,
      status: "abierto",
    },
  },
  {
    id: "branch-benito",
    name: "Sucursal San Benito (Mercado)",
    shortName: "San Benito",
    code: "BEN-02",
    address: "Calle Hidalgo #120, Col. San Benito",
    phone: "55 8765 4321",
    manager: "Carlos Mendoza",
    assignedUserId: "usr-5",
    assignedUserName: "Carlos Mendoza",
    assignedUserEmail: "supervisor@panaderiabrito.com",
    status: "abierta",
    dailyGoal: 8000,
    todaySales: 0,
    todayTickets: 0,
    cashInDrawer: 800,
    color: "rose",
    topProduct: {
      name: "Bolillo de Sal",
      piecesSold: 0,
      category: "Pan Salado",
      icon: "🥖",
    },
    currentShift: {
      id: "shift-ben-201",
      name: "Turno Matutino (06:30 - 14:30)",
      cashier: "Carlos Mendoza",
      openedAt: "06:30 AM",
      initialFund: 800,
      cashSales: 0,
      cardSales: 0,
      transferSales: 0,
      totalSales: 0,
      ticketCount: 0,
      status: "abierto",
    },
  },
  {
    id: "branch-sanjuan",
    name: "Sucursal San Juan",
    shortName: "San Juan",
    code: "SJU-02",
    address: "Calle Morelos #45, Col. San Juan",
    phone: "55 8765 4321",
    manager: "noe velasquez",
    assignedUserId: "usr-sanjuan",
    assignedUserName: "noe velasquez",
    assignedUserEmail: "sanjuan@panaderiabrito.com",
    status: "abierta",
    dailyGoal: 8500,
    todaySales: 181,
    todayDeskSales: 181,
    todayTickets: 3,
    cashInDrawer: 6267,
    color: "rose",
    topProduct: {
      name: "Bolillo Tradicional",
      piecesSold: 0,
      category: "Pan Salado",
      icon: "🥖",
    },
    currentShift: {
      id: "shift-sju-201",
      name: "Turno General",
      cashier: "noe velasquez",
      openedAt: "06:00 hrs",
      initialFund: 1000,
      cashSales: 181,
      cardSales: 0,
      transferSales: 0,
      totalSales: 181,
      ticketCount: 3,
      status: "abierto",
    },
  },
  {
    id: "branch-flores",
    name: "Sucursal Las Flores (Plaza)",
    shortName: "Las Flores",
    code: "FLO-03",
    address: "Calzada Oriente #88, Plaza Las Flores",
    phone: "55 9988 7766",
    manager: "Elena Brito",
    assignedUserId: "usr-sofia",
    assignedUserName: "Sofía Morales",
    assignedUserEmail: "sofia@panaderiabrito.com",
    status: "abierta",
    dailyGoal: 9500,
    todaySales: 0,
    todayTickets: 0,
    cashInDrawer: 1200,
    color: "amber",
    topProduct: {
      name: "Cuerno de Mantequilla",
      piecesSold: 0,
      category: "Hojaldre",
      icon: "🥐",
    },
    currentShift: {
      id: "shift-flo-301",
      name: "Turno Matutino (07:00 - 15:00)",
      cashier: "Sofía Morales",
      openedAt: "07:00 AM",
      initialFund: 1200,
      cashSales: 0,
      cardSales: 0,
      transferSales: 0,
      totalSales: 0,
      ticketCount: 0,
      status: "abierto",
    },
  },
  {
    id: "branch-1790889237862",
    name: "Sucursal San Ildefonso",
    shortName: "San Ildefonso",
    code: "ILF-04",
    address: "Av. San Benito #123, Col. Centro Histórico",
    phone: "55 8361 7480",
    manager: "silvia puga",
    assignedUserId: "usr-silvia",
    assignedUserName: "silvia puga",
    assignedUserEmail: "silvia@panaderiabrito.com",
    status: "abierta",
    dailyGoal: 6000,
    todaySales: 0,
    todayTickets: 0,
    cashInDrawer: 1000,
    color: "emerald",
    topProduct: {
      name: "Bolillo Tradicional",
      piecesSold: 0,
      category: "Pan Salado",
      icon: "🥖",
    },
    currentShift: {
      id: "shift-ilf-401",
      name: "Turno Matutino (06:00 - 14:00)",
      cashier: "silvia puga",
      openedAt: "06:00 AM",
      initialFund: 1000,
      cashSales: 0,
      cardSales: 0,
      transferSales: 0,
      totalSales: 0,
      ticketCount: 0,
      status: "abierto",
    },
  },
  {
    id: "branch-angeles",
    name: "Sucursal Los Ángeles",
    shortName: "Los Ángeles",
    code: "SUC-LES",
    address: "Calz. Guadalupe #890, Los Ángeles",
    phone: "55 4321 8765",
    manager: "andres sanchez",
    assignedUserId: "usr-andres",
    assignedUserName: "andres sanchez",
    assignedUserEmail: "andres@panaderiabrito.com",
    status: "abierta",
    dailyGoal: 7000,
    todaySales: 0,
    todayTickets: 0,
    cashInDrawer: 1000,
    color: "blue",
    topProduct: {
      name: "Bolillo Tradicional",
      piecesSold: 0,
      category: "Pan Salado",
      icon: "🥖",
    },
    currentShift: {
      id: "shift-ang-301",
      name: "Turno General",
      cashier: "andres sanchez",
      openedAt: "06:00 AM",
      initialFund: 1000,
      cashSales: 0,
      cardSales: 0,
      transferSales: 0,
      totalSales: 0,
      ticketCount: 0,
      status: "abierto",
    },
  },
];

const SAMPLE_PRODUCTS = [
  { name: "Concha de Vainilla", price: 14 },
  { name: "Concha de Chocolate", price: 14 },
  { name: "Cuerno de Mantequilla", price: 18 },
  { name: "Bolillo Artesanal", price: 6 },
  { name: "Telera para Torta", price: 7 },
  { name: "Oreja Caramelizada", price: 16 },
  { name: "Dona Glaseada", price: 15 },
  { name: "Rebanada Pastel 3 Leches", price: 48 },
  { name: "Pay de Queso con Zarzamora", price: 45 },
  { name: "Café de Olla Caliente", price: 28 },
];

const DEFAULT_CASH_MOVEMENTS: BranchCashMovement[] = [];

interface BranchContextType {
  branches: Branch[];
  currentBranch: Branch | null; // null = Todas / Consolidado
  isAllBranches: boolean;
  switchBranch: (branchId: string | "all") => void;
  addBranch: (newBranch: Branch) => void;
  updateBranch: (branchId: string, updates: Partial<Branch>) => void;
  deleteBranch: (branchId: string) => void;
  registerRealSale: (
    branchId: string,
    amount: number,
    paymentMethod: "efectivo" | "tarjeta" | "transferencia",
    cashier: string,
    itemsSummary: string,
    saleDetails?: {
      id?: string;
      items?: any[];
      customerName?: string;
      customerId?: string;
      date?: string;
      createdAt?: string;
    }
  ) => void;
  cancelRealSale: (params: {
    saleId: string;
    branchId: string;
    amount: number;
    paymentMethod: "efectivo" | "tarjeta" | "transferencia";
    cashier?: string;
  }) => void;
  simulateSale: (targetBranchId?: string, customAmount?: number) => SimulatedSale;
  simulateBulkSales: (targetBranchId?: string, count?: number) => void;
  advanceShift: (branchId: string) => void;
  isLiveSimulating: boolean;
  toggleLiveSimulation: () => void;
  recentSimulatedSales: SimulatedSale[];
  cashMovements: BranchCashMovement[];
  addCashMovement: (
    branchId: string,
    movement: {
      type: "entrada" | "salida";
      category: BranchCashMovement["category"];
      categoryLabel: string;
      amount: number;
      reason: string;
      authorizedBy: string;
    }
  ) => void;
  consolidatedMetrics: {
    totalSales: number;
    totalTickets: number;
    totalCashInDrawer: number;
    totalDailyGoal: number;
    percentGoal: number;
  };
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const isAdmin = !user || user.role === "admin" || user.role === "auxiliar_admin";
  const userAssignedBranchId = (user?.assignedBranchId || "").trim();

  const [branches, setBranches] = useState<Branch[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const savedBranches = localStorage.getItem("brito_branches_data");
        if (savedBranches) {
          const parsed = JSON.parse(savedBranches);
          if (Array.isArray(parsed) && parsed.length > 0) {
            let modified = false;
            let list = parsed;
            if (!list.some((b: Branch) => b.id === "branch-benito")) {
              const benito = DEFAULT_BRANCHES.find((b) => b.id === "branch-benito");
              if (benito) {
                list = [...list, benito];
                modified = true;
              }
            }
            if (!list.some((b: Branch) => b.id === "branch-sanjuan")) {
              const sj = DEFAULT_BRANCHES.find((b) => b.id === "branch-sanjuan");
              if (sj) {
                list = [...list, sj];
                modified = true;
              }
            }
            if (!list.some((b: Branch) => b.id === "branch-1790889237862")) {
              const ilf = DEFAULT_BRANCHES.find((b) => b.id === "branch-1790889237862");
              if (ilf) {
                list = [...list, ilf];
                modified = true;
              }
            }
            list = list.map((b: Branch) => {
              if (b.id === "branch-matriz") {
                if (b.currentShift?.initialFund === 800) {
                  modified = true;
                  return {
                    ...b,
                    currentShift: {
                      ...b.currentShift,
                      initialFund: 1000,
                    },
                  };
                }
              }
              return b;
            });
            if (modified) {
              try {
                localStorage.setItem("brito_branches_data", JSON.stringify(list));
              } catch {}
            }
            return list;
          }
        }
      } catch {}
    }
    return DEFAULT_BRANCHES;
  });

function resolveBranchParam(param: string | null): string | null {
  if (!param) return null;
  const lower = param.toLowerCase().trim();
  if (lower.includes("ildefonso") || lower.includes("1790889237862")) return "branch-1790889237862";
  if (lower.includes("flores")) return "branch-flores";
  if (lower.includes("benito")) return "branch-benito";
  if (lower.includes("sanjuan") || lower.includes("san-juan")) return "branch-sanjuan";
  if (lower.includes("angeles") || lower.includes("ángeles")) return "branch-angeles";
  if (lower.includes("matriz") || lower.includes("centro")) return "branch-matriz";
  if (lower === "all" || lower === "todas") return "all";
  return param;
}

  const [currentBranchId, setCurrentBranchId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const qBranch = urlParams.get("sucursal") || urlParams.get("branch") || urlParams.get("tienda");
        const resolved = resolveBranchParam(qBranch);
        if (resolved) {
          try {
            localStorage.setItem("brito_current_branch_id", resolved);
          } catch {}
          return resolved;
        }
      } catch {}
      const saved = localStorage.getItem("brito_current_branch_id");
      if (saved) {
        return saved;
      }
    }
    return "branch-matriz";
  });

  // Si la URL especifica una sucursal (?sucursal=flores o ?branch=branch-flores), activarla inmediatamente
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const qBranch = urlParams.get("sucursal") || urlParams.get("branch") || urlParams.get("tienda");
        const resolved = resolveBranchParam(qBranch);
        if (resolved) {
          setCurrentBranchId(resolved);
          try {
            localStorage.setItem("brito_current_branch_id", resolved);
          } catch {}
        }
      } catch {}
    }
  }, []);

  // Los perfiles operativos (cajeros, etc.) quedan anclados a su sucursal asignada (a menos que no tengan asignada)
  useEffect(() => {
    if (!isAdmin && userAssignedBranchId) {
      setCurrentBranchId(userAssignedBranchId);
      try {
        localStorage.setItem("brito_current_branch_id", userAssignedBranchId);
      } catch {}
    }
  }, [isAdmin, userAssignedBranchId]);

  const [isLiveSimulating, setIsLiveSimulating] = useState(false);
  const [recentSimulatedSales, setRecentSimulatedSales] = useState<SimulatedSale[]>([]);
  const [cashMovements, setCashMovements] = useState<BranchCashMovement[]>(DEFAULT_CASH_MOVEMENTS);
  const syncBranchesRef = useRef<() => void>(() => {});

  // Load state from localStorage & Server API
  useEffect(() => {
    // 1. Sincronización en tiempo real con el servidor y Supabase para reflejar todas las sucursales de otros perfiles
    const syncBranchesWithServer = async () => {
      syncBranchesRef.current = syncBranchesWithServer;
      try {
        // A) Sincronizar desde /api/branches (persistencia central del servidor)
        let serverBranches: Branch[] = [];
        try {
          const res = await fetch("/api/branches");
          if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.branches) && data.branches.length > 0) {
              serverBranches = data.branches;
            }
          }
        } catch (err) {
          console.warn("[BranchContext] No se pudo consultar /api/branches:", err);
        }

        // B) Sincronizar directamente con Supabase las ventas, pedidos, gastos y movimientos de TODAS las sucursales
        try {
          const supabase = createClient();
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          const todayIso = todayStart.toISOString();

          const [salesRes, ordersRes, movsRes, expsRes, cutsRes, branchesRes] = await Promise.allSettled([
            supabase
              .from("sales")
              .select("id, branch_id, total, payment_method, cashier, date, created_at")
              .gte("created_at", todayIso),
            supabase
              .from("custom_orders")
              .select("id, order_number, customer_name, branch_id, branch_name, description, total, deposit, remaining_balance, payment_status, payment_method, cashier, created_at, payments")
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
              .select("id, shift_name, cashier_name, branch_id, opened_at, initial_cash, cash_sales, card_sales, transfer_sales, total_cash_in, total_cash_out, expected_cash, actual_cash, difference, status, notes")
              .gte("opened_at", todayIso),
            supabase
              .from("branches")
              .select("id, name, short_name, address, phone, is_active"),
          ]);

          const dbSales = salesRes.status === "fulfilled" && !salesRes.value.error ? salesRes.value.data || [] : [];
          const dbOrders = ordersRes.status === "fulfilled" && !ordersRes.value.error ? ordersRes.value.data || [] : [];
          const dbMovs = movsRes.status === "fulfilled" && !movsRes.value.error ? movsRes.value.data || [] : [];
          const dbExps = expsRes.status === "fulfilled" && !expsRes.value.error ? expsRes.value.data || [] : [];
          const dbCuts = cutsRes.status === "fulfilled" && !cutsRes.value.error ? cutsRes.value.data || [] : [];
          const dbBranches = branchesRes.status === "fulfilled" && !branchesRes.value.error ? branchesRes.value.data || [] : [];

          // Recolectar todos los cortes de turno cerrados (Supabase + LocalStorage)
          const allCutsMap = new Map<string, ShiftCutRecord>();
          if (typeof window !== "undefined") {
            try {
              const rawLocalCuts = localStorage.getItem("brito_shift_cuts_history");
              if (rawLocalCuts) {
                const parsedCuts: ShiftCutRecord[] = JSON.parse(rawLocalCuts);
                if (Array.isArray(parsedCuts)) {
                  parsedCuts.forEach((c) => {
                    if (c && c.id) allCutsMap.set(c.id, c);
                  });
                }
              }
            } catch {}
          }

          dbCuts.forEach((dbc: any) => {
            if (dbc && dbc.id && !allCutsMap.has(dbc.id)) {
              allCutsMap.set(dbc.id, {
                id: dbc.id,
                date: formatDateTimeSafe(dbc.opened_at),
                timestamp: new Date(dbc.opened_at).getTime(),
                shiftRange: dbc.shift_name || "Turno",
                outgoingCashier: dbc.cashier_name || "Cajero",
                incomingCashier: dbc.cashier_name || "Cajero",
                responsible: dbc.cashier_name,
                branchId: dbc.branch_id,
                previousShift: "",
                nextShift: dbc.shift_name,
                initialFund: Number(dbc.initial_cash) || 0,
                cashSales: Number(dbc.cash_sales) || 0,
                cardSales: Number(dbc.card_sales) || 0,
                transferSales: Number(dbc.transfer_sales) || 0,
                totalSales: (Number(dbc.cash_sales) || 0) + (Number(dbc.card_sales) || 0) + (Number(dbc.transfer_sales) || 0),
                totalSalesAll: (Number(dbc.cash_sales) || 0) + (Number(dbc.card_sales) || 0) + (Number(dbc.transfer_sales) || 0),
                totalExpenses: Number(dbc.total_cash_out) || 0,
                expectedCash: Number(dbc.expected_cash) || 0,
                countedCash: Number(dbc.actual_cash) || 0,
                difference: Number(dbc.difference) || 0,
                nextFund: Number(dbc.initial_cash) || 0,
                notes: dbc.notes || "",
              });
            }
          });

          const allCutsList = Array.from(allCutsMap.values());
          allCutsList.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

          const latestCutByBranch = new Map<string, ShiftCutRecord>();
          const cutTimestampByBranch = new Map<string, number>();

          allCutsList.forEach((cut) => {
            let bId = cut.branchId || "branch-matriz";
            if (bId === "branch-matriz") {
              const resp = (cut.responsible || cut.outgoingCashier || "").toLowerCase();
              if (resp.includes("silvia")) {
                bId = "branch-1790889237862";
              } else if (resp.includes("andres")) {
                bId = "branch-angeles";
              }
            }
            if (!latestCutByBranch.has(bId)) {
              latestCutByBranch.set(bId, cut);
              const ts = cut.timestamp || parseDateTimeSafe(cut.date);
              cutTimestampByBranch.set(bId, ts);
            }
          });

          // Sincronizar historial de cortes y límites de turno en localStorage para todas las pantallas del navegador
          if (typeof window !== "undefined") {
            try {
              const prevCutsRaw = localStorage.getItem("brito_shift_cuts_history");
              const newCutsRaw = JSON.stringify(allCutsList);
              const cutsChanged = prevCutsRaw !== newCutsRaw;
              if (cutsChanged) {
                localStorage.setItem("brito_shift_cuts_history", newCutsRaw);
              }

              latestCutByBranch.forEach((cut, bId) => {
                const cutTs = cut.timestamp || parseDateTimeSafe(cut.date);
                let cutFund = Number(cut.nextFund ?? cut.initialFund ?? 0);
                if (bId === "branch-matriz" && (cutFund === 800 || cutFund <= 0)) {
                  cutFund = 1000;
                } else if (cutFund <= 0) {
                  cutFund = bId === "branch-benito" ? 800 : bId === "branch-flores" ? 1200 : 1000;
                }
                if (cutTs > 0) {
                  localStorage.setItem(`brito_shift_start_${bId}`, cutTs.toString());
                  localStorage.setItem(`brito_pos_initial_fund_${bId}`, cutFund.toString());
                  if (bId === "branch-matriz") {
                    localStorage.setItem("brito_current_shift_start_timestamp", cutTs.toString());
                    localStorage.setItem("brito_pos_initial_fund", cutFund.toString());
                  }
                }
              });

              // Limpiar ventas locales que ya pertenecen a un turno cortado/cerrado
              const curSalesRaw = localStorage.getItem("brito_pos_current_sales");
              if (curSalesRaw) {
                const curSales = JSON.parse(curSalesRaw);
                if (Array.isArray(curSales)) {
                  const filtered = curSales.filter((s: any) => {
                    const sBranch = s.branchId || s.branch_id || "branch-matriz";
                    const sTime = parseDateTimeSafe(s.timestamp || s.createdAt || s.date);
                    const bCutLimit = cutTimestampByBranch.get(sBranch) || 0;
                    return sTime > bCutLimit;
                  });
                  localStorage.setItem("brito_pos_current_sales", JSON.stringify(filtered));
                }
              }

              // Limpiar gastos locales que ya pertenecen a un turno cortado/cerrado
              const curExpRaw = localStorage.getItem("brito_pos_current_expenses");
              if (curExpRaw) {
                const curExp = JSON.parse(curExpRaw);
                if (Array.isArray(curExp)) {
                  const filtered = curExp.filter((e: any) => {
                    const eBranch = e.branchId || e.branch_id || "branch-matriz";
                    const eTime = parseDateTimeSafe(e.timestamp || e.createdAt || e.date);
                    const bCutLimit = cutTimestampByBranch.get(eBranch) || 0;
                    return eTime > bCutLimit;
                  });
                  localStorage.setItem("brito_pos_current_expenses", JSON.stringify(filtered));
                }
              }

              // Limpiar ingresos locales que ya pertenecen a un turno cortado/cerrado
              const curIncRaw = localStorage.getItem("brito_pos_current_incomes");
              if (curIncRaw) {
                const curInc = JSON.parse(curIncRaw);
                if (Array.isArray(curInc)) {
                  const filtered = curInc.filter((i: any) => {
                    const iBranch = i.branchId || i.branch_id || "branch-matriz";
                    const iTime = parseDateTimeSafe(i.timestamp || i.date || i.createdAt);
                    const bCutLimit = cutTimestampByBranch.get(iBranch) || 0;
                    return iTime > bCutLimit;
                  });
                  localStorage.setItem("brito_pos_current_incomes", JSON.stringify(filtered));
                }
              }

              if (cutsChanged) {
                window.dispatchEvent(new Event("brito_shift_cuts_updated"));
              }
              window.dispatchEvent(new Event("brito_sales_updated"));
              window.dispatchEvent(new Event("brito_caja_updated"));
            } catch (e) {
              console.warn("[BranchContext] Error sincronizando localStorage de cortes:", e);
            }
          }

          const branchAgg = new Map<string, {
            deskSales: number;
            deskTickets: number;
            deskCash: number;
            deskCard: number;
            deskTransfer: number;
            orderCash: number;
            orderCard: number;
            orderTransfer: number;
            orderTotalCobrado: number;
            orderTotal: number;
            orderCount: number;
            cashInflow: number;
            cashOutflow: number;
            movNet: number;
            expCash: number;
            dayAccumulatedDeskSales: number;
            dayAccumulatedDeskTickets: number;
            dayAccumulatedOrdersDeposit: number;
            lastCashier?: string;
            branchName?: string;
          }>();

          const initBranchAgg = () => ({
            deskSales: 0,
            deskTickets: 0,
            deskCash: 0,
            deskCard: 0,
            deskTransfer: 0,
            orderCash: 0,
            orderCard: 0,
            orderTransfer: 0,
            orderTotalCobrado: 0,
            orderTotal: 0,
            orderCount: 0,
            cashInflow: 0,
            cashOutflow: 0,
            movNet: 0,
            expCash: 0,
            dayAccumulatedDeskSales: 0,
            dayAccumulatedDeskTickets: 0,
            dayAccumulatedOrdersDeposit: 0,
          });

          DEFAULT_BRANCHES.forEach((b) => {
            branchAgg.set(b.id, initBranchAgg());
          });

          const resolveBranchForRecord = (rawBranchId: string | null | undefined, cashierName?: string): string => {
            let bId = rawBranchId || "branch-matriz";
            if (cashierName) {
              const cLower = cashierName.toLowerCase();
              if (cLower.includes("silvia")) {
                return "branch-1790889237862";
              }
              if (cLower.includes("andres")) {
                return "branch-angeles";
              }
            }
            return bId;
          };

          // 1. Agregar ventas de mostrador (filtrando turno activo vs acumulado)
          dbSales.forEach((s: any) => {
            const bId = resolveBranchForRecord(s.branch_id, s.cashier);
            let cur = branchAgg.get(bId);
            if (!cur) {
              cur = initBranchAgg();
              branchAgg.set(bId, cur);
            }
            const amt = Number(s.total) || 0;
            const saleTime = parseDateTimeSafe(s.created_at || s.date);
            const cutLimit = cutTimestampByBranch.get(bId) || 0;

            cur.dayAccumulatedDeskSales += amt;
            cur.dayAccumulatedDeskTickets += 1;

            // SOLO sumar al turno activo si la venta ocurrió DESPUÉS del corte cerrado
            if (saleTime > cutLimit) {
              cur.deskSales += amt;
              cur.deskTickets += 1;
              if (s.payment_method === "tarjeta") cur.deskCard += amt;
              else if (s.payment_method === "transferencia") cur.deskTransfer += amt;
              else cur.deskCash += amt;
              if (s.cashier) cur.lastCashier = s.cashier;
            }
          });

          // 2. Agregar pedidos especiales (anticipos y liquidaciones)
          dbOrders.forEach((o: any) => {
            const bId = resolveBranchForRecord(o.branch_id, o.cashier);
            let cur = branchAgg.get(bId);
            if (!cur) {
              cur = initBranchAgg();
              branchAgg.set(bId, cur);
            }
            if (o.branch_name) cur.branchName = o.branch_name;
            const dep = Number(o.deposit) || 0;
            const tot = Number(o.total) || 0;
            const orderTime = parseDateTimeSafe(o.created_at);
            const cutLimit = cutTimestampByBranch.get(bId) || 0;

            if (dep > 0) cur.dayAccumulatedOrdersDeposit += dep;

            // SOLO sumar al turno activo si el pedido ocurrió DESPUÉS del corte cerrado
            if (orderTime > cutLimit) {
              cur.orderTotal += tot;
              cur.orderCount += 1;
              if (dep > 0) {
                cur.orderTotalCobrado += dep;
                if (o.payment_method === "tarjeta") cur.orderCard += dep;
                else if (o.payment_method === "transferencia") cur.orderTransfer += dep;
                else cur.orderCash += dep;
              }
              if (o.cashier && !cur.lastCashier) cur.lastCashier = o.cashier;
            }
          });

          // 3. Movimientos de caja (aportes / retiros fuera de ventas y de cortes)
          dbMovs.forEach((m: any) => {
            if (
              m.category === "venta_mostrador" ||
              m.category === "corte_caja" ||
              m.category === "abono_pedido" ||
              m.category === "pedido" ||
              m.movement_type === "pedido" ||
              m.movementType === "pedido"
            ) return;
            if (m.id && (String(m.id).startsWith("order-") || String(m.id).includes("PED-"))) return;
            const rLower = (m.reason || "").toLowerCase();
            if (rLower.includes("pedido") || rLower.includes("abono") || rLower.includes("anticipo") || rLower.includes("liquidaci")) return;
            if (m.type === "entrada" && Number(m.amount) === 6000) return; // Duplicado fantasma de pedido de 6000
            if (m.id && (m.id.includes("ING-ING") || m.id.includes("mov-mov-") || m.id.includes("012599") || m.id.includes("331037") || m.amount > 500000)) return;
            const bId = resolveBranchForRecord(m.branch_id, m.authorized_by);
            let cur = branchAgg.get(bId);
            if (!cur) {
              cur = initBranchAgg();
              branchAgg.set(bId, cur);
            }
            const amt = Number(m.amount) || 0;
            const movTime = parseDateTimeSafe(m.created_at);
            const cutLimit = cutTimestampByBranch.get(bId) || 0;
            if (movTime > cutLimit) {
              if (m.type === "entrada") {
                cur.cashInflow += amt;
                cur.movNet += amt;
              } else {
                cur.cashOutflow += amt;
                cur.movNet -= amt;
              }
              if (m.authorized_by && !cur.lastCashier) cur.lastCashier = m.authorized_by;
            }
          });

          // Incorporar ingresos en efectivo locales que aún no estén en dbMovs para sincronización instantánea
          if (typeof window !== "undefined") {
            try {
              const rawLocalInc = localStorage.getItem("brito_pos_current_incomes");
              if (rawLocalInc) {
                const localIncs = JSON.parse(rawLocalInc);
                if (Array.isArray(localIncs)) {
                  localIncs.forEach((inc: any) => {
                    if (!inc || !inc.id || inc.id.includes("012599") || inc.category === "abono_pedido" || inc.category === "pedido" || inc.orderId) return;
                    if (inc.id && (String(inc.id).startsWith("order-") || String(inc.id).includes("PED-"))) return;
                    const cLower = (inc.concept || "").toLowerCase();
                    if (cLower.includes("pedido") || cLower.includes("abono") || cLower.includes("anticipo") || cLower.includes("liquidaci")) return;
                    if (Number(inc.amount) === 6000) return; // Duplicado fantasma de pedido de 6000
                    if (dbMovs.some((m: any) => m.id === inc.id)) return;
                    const bId = resolveBranchForRecord(inc.branchId || inc.branch_id, inc.cashier);
                    let cur = branchAgg.get(bId);
                    if (!cur) {
                      cur = initBranchAgg();
                      branchAgg.set(bId, cur);
                    }
                    const amt = Number(inc.amount) || 0;
                    const t = parseDateTimeSafe(inc.timestamp || inc.date || inc.createdAt);
                    const cutLimit = cutTimestampByBranch.get(bId) || 0;
                    if (t > cutLimit && (inc.paymentMethod === "efectivo" || !inc.paymentMethod)) {
                      cur.cashInflow += amt;
                      cur.movNet += amt;
                    }
                  });
                }
              }
            } catch {}
          }

          // 4. Gastos en efectivo
          dbExps.forEach((e: any) => {
            const bId = resolveBranchForRecord(e.branch_id, e.cashier);
            let cur = branchAgg.get(bId);
            if (!cur) {
              cur = initBranchAgg();
              branchAgg.set(bId, cur);
            }
            const expTime = parseDateTimeSafe(e.created_at);
            const cutLimit = cutTimestampByBranch.get(bId) || 0;
            if (expTime > cutLimit) {
              cur.expCash += Number(e.amount) || 0;
              if (e.cashier && !cur.lastCashier) cur.lastCashier = e.cashier;
            }
          });

          // Sincronizar pedidos de Supabase hacia el almacenamiento local si hay pedidos nuevos
          if (dbOrders.length > 0) {
            try {
              const rawLocalOrd = localStorage.getItem("brito_custom_orders");
              const localOrdList = rawLocalOrd ? JSON.parse(rawLocalOrd) : [];
              const ordMap = new Map<string, any>(localOrdList.map((o: any) => [o.orderNumber || o.id, o]));
              let anyOrdUpdated = false;

              dbOrders.forEach((dbo: any) => {
                const key = dbo.order_number || dbo.id;
                const existing = ordMap.get(key);
                if (!existing || (!existing.deposit && dbo.deposit) || existing.deposit !== dbo.deposit || existing.status !== dbo.status) {
                  ordMap.set(key, { ...existing, ...dbo });
                  anyOrdUpdated = true;
                }
              });

              if (anyOrdUpdated) {
                localStorage.setItem("brito_custom_orders", JSON.stringify(Array.from(ordMap.values())));
                window.dispatchEvent(new Event("brito_orders_updated"));
              }
            } catch {}
          }

          // Actualizar métricas vivas de cada sucursal e incorporar sucursales dinámicas
          setBranches((prev) => {
            const branchMap = new Map<string, Branch>();
            DEFAULT_BRANCHES.forEach((d) => branchMap.set(d.id, d));
            prev.forEach((b) => {
              branchMap.set(b.id, { ...(branchMap.get(b.id) || b), ...b });
            });

            // Incorporar datos de configuración de /api/branches sin sobreescribir ventas/cajas vivas con 0
            if (serverBranches.length > 0) {
              serverBranches.forEach((serverB: Branch) => {
                const existing = branchMap.get(serverB.id);
                if (!existing) {
                  branchMap.set(serverB.id, serverB);
                } else {
                  branchMap.set(serverB.id, {
                    ...existing,
                    name: serverB.name || existing.name,
                    shortName: serverB.shortName || existing.shortName,
                    code: serverB.code || existing.code,
                    address: serverB.address || existing.address,
                    phone: serverB.phone || existing.phone,
                    manager: serverB.manager || existing.manager,
                    assignedUserId: serverB.assignedUserId || existing.assignedUserId,
                    assignedUserName: serverB.assignedUserName || existing.assignedUserName,
                    assignedUserEmail: serverB.assignedUserEmail || existing.assignedUserEmail,
                    dailyGoal: serverB.dailyGoal || existing.dailyGoal,
                    color: serverB.color || existing.color,
                    status: serverB.status || existing.status,
                  });
                }
              });
            }

            // Incorporar sucursales de la tabla branches de Supabase si existen
            dbBranches.forEach((dbB: any) => {
              const isBenito = dbB.id === "branch-benito";
              const isSj = dbB.id === "branch-sanjuan";
              const isIldefonso = dbB.id === "branch-1790889237862" || (dbB.name && dbB.name.toLowerCase().includes("ildefonso"));
              const isAngeles = dbB.id === "branch-angeles" || (dbB.name && dbB.name.toLowerCase().includes("angeles"));
              if (!branchMap.has(dbB.id)) {
                branchMap.set(dbB.id, {
                  id: dbB.id,
                  name: dbB.name || (isIldefonso ? "Sucursal San Ildefonso" : isBenito ? "Sucursal San Benito (Mercado)" : isSj ? "Sucursal San Juan" : isAngeles ? "Sucursal Los Ángeles" : "Sucursal"),
                  shortName: dbB.short_name || (isIldefonso ? "San Ildefonso" : isBenito ? "San Benito" : isSj ? "San Juan" : isAngeles ? "Los Ángeles" : (dbB.name || "Sucursal")),
                  code: isIldefonso ? "ILF-04" : isBenito ? "BEN-02" : isSj ? "SJU-02" : isAngeles ? "SUC-LES" : ("SUC-" + dbB.id.slice(-3).toUpperCase()),
                  address: dbB.address || (isIldefonso ? "Av. San Benito #123, Col. Centro Histórico" : isBenito ? "Calle Hidalgo #120, Col. San Benito" : isSj ? "Calle Morelos #45, Col. San Juan" : isAngeles ? "Calz. Guadalupe #890, Los Ángeles" : "Dirección sucursal"),
                  phone: dbB.phone || (isIldefonso ? "55 8361 7480" : isAngeles ? "55 4321 8765" : "55 8765 4321"),
                  manager: isIldefonso ? "silvia puga" : isBenito ? "Carlos Mendoza" : isSj ? "noe velasquez" : isAngeles ? "andres sanchez" : "Encargado de Sucursal",
                  assignedUserId: isIldefonso ? "usr-silvia" : isBenito ? "usr-5" : isSj ? "usr-noe" : isAngeles ? "usr-andres" : undefined,
                  assignedUserName: isIldefonso ? "silvia puga" : isBenito ? "Carlos Mendoza" : isSj ? "noe velasquez" : isAngeles ? "andres sanchez" : undefined,
                  assignedUserEmail: isIldefonso ? "silvia@panaderiabrito.com" : isBenito ? "supervisor@panaderiabrito.com" : isSj ? "noe@panaderiabrito.com" : isAngeles ? "andres@panaderiabrito.com" : undefined,
                  status: dbB.is_active === false ? "cerrada" : "abierta",
                  dailyGoal: isIldefonso ? 6000 : isBenito ? 8000 : isSj ? 8500 : isAngeles ? 7000 : 5000,
                  todaySales: 0,
                  todayTickets: 0,
                  cashInDrawer: 1000,
                  color: isIldefonso ? "emerald" : isSj ? "rose" : isAngeles ? "blue" : "emerald",
                  currentShift: {
                    id: isIldefonso ? "shift-ilf-401" : isSj ? "shift-sju-201" : isAngeles ? "shift-ang-301" : `shift-${dbB.id}`,
                    name: isSj ? "Turno Vespertino (14:00 - 22:00)" : isIldefonso ? "Turno Matutino (06:00 - 14:00)" : "Turno General",
                    cashier: isIldefonso ? "silvia puga" : isBenito ? "Carlos Mendoza" : isSj ? "noe velasquez" : isAngeles ? "andres sanchez" : "Cajero",
                    openedAt: isSj ? "14:00 hrs" : "06:00 AM",
                    initialFund: 1000,
                    status: "abierto",
                    totalSales: 0,
                    ticketCount: 0,
                    cashSales: 0,
                    cardSales: 0,
                    transferSales: 0,
                  },
                });
              } else {
                const existing = branchMap.get(dbB.id)!;
                if (isIldefonso && (!existing.assignedUserId || existing.assignedUserId === "usr-ildefonso")) {
                  existing.manager = "silvia puga";
                  existing.assignedUserId = "usr-silvia";
                  existing.assignedUserName = "silvia puga";
                  existing.assignedUserEmail = "silvia@panaderiabrito.com";
                  if (existing.currentShift) existing.currentShift.cashier = "silvia puga";
                } else if (isAngeles && (!existing.assignedUserId || existing.assignedUserId === "usr-angeles")) {
                  existing.manager = "andres sanchez";
                  existing.assignedUserId = "usr-andres";
                  existing.assignedUserName = "andres sanchez";
                  existing.assignedUserEmail = "andres@panaderiabrito.com";
                  if (existing.currentShift) existing.currentShift.cashier = "andres sanchez";
                }
              }
            });

            // Incorporar sucursales dinámicas detectadas en ventas o pedidos (ej. san ildefonso hgo)
            branchAgg.forEach((agg, bId) => {
              if (!branchMap.has(bId)) {
                const bName = agg.branchName || `Sucursal ${bId}`;
                branchMap.set(bId, {
                  id: bId,
                  name: bName,
                  shortName: bName.split(" ")[0] || "Sucursal",
                  code: "SUC-" + bId.slice(-3).toUpperCase(),
                  address: "Ubicación Brito",
                  phone: "55 0000 0000",
                  manager: agg.lastCashier || "Cajero en turno",
                  status: "abierta",
                  dailyGoal: 5000,
                  todaySales: 0,
                  todayTickets: 0,
                  cashInDrawer: 1000,
                  color: "emerald",
                  currentShift: {
                    id: `shift-${bId}`,
                    name: "Turno General",
                    cashier: agg.lastCashier || "Cajero",
                    openedAt: "06:00 AM",
                    initialFund: 1000,
                    status: "abierto",
                    totalSales: 0,
                    ticketCount: 0,
                    cashSales: 0,
                    cardSales: 0,
                    transferSales: 0,
                  },
                });
              }
            });

            const updated = Array.from(branchMap.values()).map((b) => {
              const agg = branchAgg.get(b.id);
              if (!agg) return b;

              const latestCut = latestCutByBranch.get(b.id);

              // TOTAL GENERAL COBRADO DEL TURNO ACTIVO
              const totalCobrado = agg.deskSales + agg.orderTotalCobrado;
              const totalTickets = agg.deskTickets + agg.orderCount;

              // Fondo inicial: Si hay un corte registrado para esta sucursal, el fondo del nuevo turno SIEMPRE es el nextFund del corte.
              const standardFund = b.id === "branch-benito" ? 800 : b.id === "branch-flores" ? 1200 : 1000;
              let initialFund = standardFund;
              if (latestCut && latestCut.nextFund !== undefined && latestCut.nextFund !== null && Number(latestCut.nextFund) > 0) {
                const parsed = Number(latestCut.nextFund);
                initialFund = (b.id === "branch-matriz" && parsed === 800) ? 1000 : parsed;
              } else if (b.currentShift?.initialFund !== undefined && b.currentShift?.initialFund !== null && Number(b.currentShift.initialFund) > 0) {
                const parsed = Number(b.currentShift.initialFund);
                initialFund = (b.id === "branch-matriz" && parsed === 800) ? 1000 : parsed;
              }

              // Flujo de salidas: evitar doble deducción entre cash_movements y cash_expenses
              const totalOutflows = Math.max(agg.cashOutflow, agg.expCash);
              const calculatedCash = Math.max(0, initialFund + agg.deskCash + agg.orderCash + agg.cashInflow - totalOutflows);

              // Cajero del turno activo:
              let activeCashier = b.currentShift?.cashier || b.manager || "Cajero";
              if (user && user.role === "cajero" && (user.id === b.assignedUserId || user.assignedBranchId === b.id) && user.name) {
                activeCashier = user.name;
              } else if (agg.lastCashier && agg.lastCashier.trim().length > 0) {
                activeCashier = agg.lastCashier;
              } else if (latestCut?.incomingCashier && !latestCut.incomingCashier.includes("Cajera 2")) {
                activeCashier = latestCut.incomingCashier;
              } else if (b.id === "branch-matriz") {
                activeCashier = "carlos bueno";
              } else if (b.id === "branch-1790889237862") {
                activeCashier = "silvia puga";
              } else if (b.id === "branch-angeles") {
                activeCashier = "andres sanchez";
              } else if (b.id === "branch-sanjuan") {
                activeCashier = "noe velasquez";
              } else if (b.id === "branch-benito") {
                activeCashier = "Carlos Mendoza";
              } else if (b.currentShift?.cashier && !b.currentShift.cashier.includes("Cajera 2")) {
                activeCashier = b.currentShift.cashier;
              } else {
                activeCashier = b.manager || "Cajero";
              }

              return {
                ...b,
                todaySales: totalCobrado,
                todayTickets: totalTickets,
                cashInDrawer: calculatedCash,
                todayDeskSales: agg.deskSales,
                todayDeskTickets: agg.deskTickets,
                todayOrdersDeposit: agg.orderTotalCobrado,
                todayOrdersTotal: agg.orderTotal,
                todayOrdersCount: agg.orderCount,
                lastCut: latestCut,
                dayAccumulatedSales: agg.dayAccumulatedDeskSales + agg.dayAccumulatedOrdersDeposit,
                dayAccumulatedTickets: agg.dayAccumulatedDeskTickets,
                manager: activeCashier,
                currentShift: {
                  id: b.currentShift?.id || `shift-${b.id}`,
                  name: latestCut?.nextShift || b.currentShift?.name || (b.id === "branch-1790889237862" ? "Turno Matutino" : "Turno General"),
                  cashier: activeCashier,
                  openedAt: latestCut?.date || b.currentShift?.openedAt || "06:00 AM",
                  initialFund: initialFund,
                  totalSales: totalCobrado,
                  ticketCount: totalTickets,
                  cashSales: agg.deskCash + agg.orderCash,
                  cardSales: agg.deskCard + agg.orderCard,
                  transferSales: agg.deskTransfer + agg.orderTransfer,
                  status: "abierto" as const,
                },
              };
            });

            // Comprobar si realmente hubo cambios operativos o numéricos para evitar re-renderizados continuos
            const isIdentical =
              prev.length === updated.length &&
              prev.every((b, i) => {
                const u = updated[i];
                if (!u || b.id !== u.id) return false;
                return (
                  b.todaySales === u.todaySales &&
                  b.todayTickets === u.todayTickets &&
                  b.cashInDrawer === u.cashInDrawer &&
                  b.name === u.name &&
                  b.status === u.status &&
                  b.manager === u.manager &&
                  b.currentShift?.totalSales === u.currentShift?.totalSales &&
                  b.currentShift?.cashier === u.currentShift?.cashier &&
                  b.currentShift?.name === u.currentShift?.name &&
                  b.currentShift?.initialFund === u.currentShift?.initialFund
                );
              });

            try {
              localStorage.setItem("brito_branches_data", JSON.stringify(updated));
            } catch {}

            if (isIdentical) {
              return prev; // Mismo objeto en memoria, cero re-renderizado
            }

            return updated;
          });

          // 5. Construir y consolidar todos los movimientos de dinero de hoy para supervisión en vivo
          const unified: BranchCashMovement[] = [];
          const branchNameMap = new Map<string, string>();
          DEFAULT_BRANCHES.forEach((b) => branchNameMap.set(b.id, b.shortName || b.name));

          // A) Ventas
          dbSales.forEach((s: any) => {
            const bId = s.branch_id || "branch-matriz";
            const bName = branchNameMap.get(bId) || "Sucursal";
            const timeMs = parseDateTimeSafe(s.created_at || s.date);
            unified.push({
              id: `sale-${s.id}`,
              branchId: bId,
              branchName: bName,
              type: "entrada",
              category: "venta_mostrador",
              categoryLabel: "Venta en Mostrador",
              amount: Number(s.total) || 0,
              reason: `Ticket #${String(s.id).slice(-6).toUpperCase()} • ${(s.payment_method || "efectivo").toUpperCase()}`,
              authorizedBy: s.cashier || "Cajero",
              timestamp: formatDateTimeSafe(s.created_at || s.date),
              createdAt: s.created_at || s.date,
              rawTimestamp: timeMs,
              movementType: "venta",
              cashier: s.cashier || "Cajero",
              paymentMethod: s.payment_method || "efectivo",
            });
          });

          // B) Pedidos con anticipo o pago
          dbOrders.forEach((o: any) => {
            const bId = o.branch_id || "branch-matriz";
            const bName = o.branch_name || branchNameMap.get(bId) || "Sucursal";
            const deposit = Number(o.deposit) || 0;
            if (deposit > 0) {
              const timeMs = parseDateTimeSafe(o.created_at);
              unified.push({
                id: `order-${o.id}`,
                branchId: bId,
                branchName: bName,
                type: "entrada",
                category: "abono_pedido",
                categoryLabel: "Anticipo de Pedido",
                amount: deposit,
                reason: `Pedido #${o.order_number || o.id} (${o.customer_name || "Cliente"}): ${o.description || "Pedido especial"}`,
                authorizedBy: o.cashier || "Cajero",
                timestamp: formatDateTimeSafe(o.created_at),
                createdAt: o.created_at,
                rawTimestamp: timeMs,
                movementType: "pedido",
                cashier: o.cashier || "Cajero",
                paymentMethod: o.payment_method || "efectivo",
              });
            }
          });

          // C) Gastos en efectivo
          dbExps.forEach((e: any) => {
            const bId = e.branch_id || "branch-matriz";
            const bName = branchNameMap.get(bId) || "Sucursal";
            const timeMs = parseDateTimeSafe(e.created_at);
            unified.push({
              id: `exp-${e.id}`,
              branchId: bId,
              branchName: bName,
              type: "salida",
              category: e.category || "gasto",
              categoryLabel: "Gasto de Caja",
              amount: Number(e.amount) || 0,
              reason: e.description || "Gasto en efectivo",
              authorizedBy: e.cashier || "Cajero",
              timestamp: formatDateTimeSafe(e.created_at),
              createdAt: e.created_at,
              rawTimestamp: timeMs,
              movementType: "gasto",
              cashier: e.cashier || "Cajero",
              paymentMethod: "efectivo",
            });
          });

          // D) Movimientos manuales de caja (aportes de cambio, retiros)
          dbMovs.forEach((m: any) => {
            if (m.category === "venta_mostrador") return;
            if (
              m.category === "abono_pedido" ||
              m.category === "pedido" ||
              m.movement_type === "pedido" ||
              m.movementType === "pedido"
            ) return;
            if (m.id && (String(m.id).startsWith("order-") || String(m.id).includes("PED-"))) return;
            const rLower = (m.reason || "").toLowerCase();
            if (rLower.includes("pedido") || rLower.includes("abono") || rLower.includes("anticipo") || rLower.includes("liquidaci")) return;
            if (m.type === "entrada" && Number(m.amount) === 6000) return; // Duplicado fantasma de pedido de 6000
            // Evitar duplicar si ya fue registrado como gasto
            if (
              m.type === "salida" &&
              dbExps.some(
                (e: any) =>
                  e.id === m.id ||
                  (Math.abs(Number(e.amount) - Number(m.amount)) < 0.01 && e.description === m.reason)
              )
            ) {
              return;
            }
            const bId = m.branch_id || "branch-matriz";
            const bName = branchNameMap.get(bId) || "Sucursal";
            const timeMs = parseDateTimeSafe(m.created_at);
            unified.push({
              id: m.id,
              branchId: bId,
              branchName: bName,
              type: m.type as "entrada" | "salida",
              category: m.category || "otro",
              categoryLabel: m.category_label || (m.type === "entrada" ? "Entrada de Dinero" : "Salida de Dinero"),
              amount: Number(m.amount) || 0,
              reason: m.reason || "Movimiento de caja",
              authorizedBy: m.authorized_by || "Cajero",
              timestamp: formatDateTimeSafe(m.created_at),
              createdAt: m.created_at,
              rawTimestamp: timeMs,
              movementType: m.type === "entrada" ? "entrada" : "gasto",
              cashier: m.authorized_by || "Cajero",
              paymentMethod: "efectivo",
            });
          });

          // E) Cortes de caja de hoy (desde Supabase y almacenamiento local)
          const seenCutIds = new Set<string>();
          dbCuts.forEach((c: any) => {
            const cutId = c.id;
            seenCutIds.add(cutId);
            const bId = c.branch_id || "branch-matriz";
            const bName = branchNameMap.get(bId) || "Sucursal";
            const timeMs = parseDateTimeSafe(c.opened_at);
            unified.push({
              id: `cut-${cutId}`,
              branchId: bId,
              branchName: bName,
              type: "salida",
              category: "corte_caja",
              categoryLabel: "Corte de Turno",
              amount: Number(c.actual_cash || c.expected_cash || c.initial_cash || 0),
              reason: `Corte de turno (${c.shift_name || "Turno"}). Cajero: ${c.cashier_name}. Fondo nuevo: $${c.initial_cash || 1000}`,
              authorizedBy: c.cashier_name || "Cajero",
              timestamp: formatDateTimeSafe(c.opened_at),
              createdAt: c.opened_at,
              rawTimestamp: timeMs,
              movementType: "corte",
              cashier: c.cashier_name || "Cajero",
              paymentMethod: "efectivo",
            });
          });

          try {
            const rawCuts = localStorage.getItem("brito_shift_cuts_history");
            if (rawCuts) {
              const cuts = JSON.parse(rawCuts);
              if (Array.isArray(cuts)) {
                cuts.forEach((c: any) => {
                  if (seenCutIds.has(c.id)) return;
                  const timeMs = c.timestamp || parseDateTimeSafe(c.date || c.createdAt);
                  if (timeMs >= todayStart.getTime()) {
                    const bId = c.branchId || "branch-matriz";
                    const bName = c.branchName || branchNameMap.get(bId) || "Sucursal";
                    unified.push({
                      id: `cut-${c.id}`,
                      branchId: bId,
                      branchName: bName,
                      type: "salida",
                      category: "corte_caja",
                      categoryLabel: "Corte de Turno",
                      amount: Number(c.countedCash || c.totalSales || 0),
                      reason: `Corte de turno (${c.shiftRange || "Turno"}). Saliente: ${c.outgoingCashier} → Entrante: ${c.incomingCashier}. Fondo nuevo: $${c.nextFund || 1000}`,
                      authorizedBy: c.outgoingCashier || "Cajero",
                      timestamp: c.date || formatDateTimeSafe(new Date(timeMs).toISOString()),
                      createdAt: new Date(timeMs).toISOString(),
                      rawTimestamp: timeMs,
                      movementType: "corte",
                      cashier: c.outgoingCashier || "Cajero",
                      paymentMethod: "efectivo",
                    });
                  }
                });
              }
            }
          } catch {}

          // Ordenar cronológicamente descendente (lo más nuevo arriba)
          unified.sort((a, b) => (b.rawTimestamp || 0) - (a.rawTimestamp || 0));
          const topMovements = unified.slice(0, 300);
          setCashMovements(topMovements);
          try {
            localStorage.setItem("brito_branch_cash_movements", JSON.stringify(topMovements));
          } catch {}

          // Sincronizar las ventas de Supabase en el POS local (master sales y current sales)
          try {
            const rawMaster = localStorage.getItem("brito_pos_master_sales");
            const masterList: any[] = rawMaster ? JSON.parse(rawMaster) : [];
            const masterMap = new Map<string, any>(masterList.map((s) => [s.id, s]));
            let masterChanged = false;

            dbSales.forEach((s: any) => {
              if (!masterMap.has(s.id)) {
                masterChanged = true;
                const sTime = parseDateTimeSafe(s.created_at || s.date);
                masterMap.set(s.id, {
                  id: s.id,
                  date: formatDateTimeSafe(s.created_at || s.date),
                  total: Number(s.total) || 0,
                  paymentMethod: s.payment_method || "efectivo",
                  cashier: s.cashier || "Cajero",
                  branchId: s.branch_id || "branch-matriz",
                  timestamp: sTime,
                  createdAt: s.created_at || s.date,
                  items: [
                    {
                      product: {
                        id: `prod-${s.id}`,
                        name: "Venta en mostrador",
                        price: Number(s.total) || 0,
                        category: "pan_dulce",
                        stock: 99,
                        image: "🥖",
                      },
                      quantity: 1,
                    },
                  ],
                });
              }
            });

            if (masterChanged) {
              const updatedMaster = Array.from(masterMap.values()).sort((a, b) => compareMovementsDesc(a, b));
              localStorage.setItem("brito_pos_master_sales", JSON.stringify(updatedMaster));
              window.dispatchEvent(new Event("brito_sales_updated"));
              // NOTA: brito_pos_current_sales pertenece exclusivamente al turno de la terminal local
              // y no debe sobreescribirse ni contaminarse con el historial completo de todas las sucursales.
            }
          } catch {}
        } catch {}
      } catch (err) {
        console.warn("[BranchContext] No se pudo consultar /api/branches:", err);
      }
    };

    syncBranchesWithServer();

    // 2. Cargar estado de almacenamiento local para otros parámetros
    try {
      const savedCurrent = localStorage.getItem("brito_current_branch_id");
      if (savedCurrent) {
        if (!isAdmin && userAssignedBranchId) {
          setCurrentBranchId(userAssignedBranchId);
        } else {
          setCurrentBranchId(savedCurrent);
        }
      }
      const savedSales = localStorage.getItem("brito_simulated_sales");
      if (savedSales) {
        setRecentSimulatedSales(JSON.parse(savedSales));
      }
      const savedMovements = localStorage.getItem("brito_branch_cash_movements");
      if (savedMovements) {
        const parsed = JSON.parse(savedMovements);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter((m: any) => {
            if (!m) return false;
            if (m.id && (m.id.includes("ING-ING") || m.id.includes("mov-mov-") || m.id.includes("012599") || m.id.includes("331037") || m.amount > 500000)) return false;
            if (m.type === "entrada" && (m.category === "abono_pedido" || m.category === "pedido" || (m.reason && /pedido|abono|anticipo|liquidaci/i.test(m.reason)) || (m.id && String(m.id).startsWith("order-")))) return false;
            if (m.type === "entrada" && Number(m.amount) === 6000) return false;
            return true;
          });
          setCashMovements(cleaned);
          if (cleaned.length !== parsed.length) {
            localStorage.setItem("brito_branch_cash_movements", JSON.stringify(cleaned));
          }
        }
      }
    } catch {
      // Ignore localStorage error
    }

    // Suscribirse directamente a cambios de Postgres en Supabase para actualización reactiva instantánea (0 segundos)
    let realtimeChannel: any = null;
    try {
      const supabase = createClient();
      realtimeChannel = supabase
        .channel("branch_context_supabase_realtime")
        .on("postgres_changes", { event: "*", schema: "public", table: "sales" }, () => syncBranchesWithServer())
        .on("postgres_changes", { event: "*", schema: "public", table: "custom_orders" }, () => syncBranchesWithServer())
        .on("postgres_changes", { event: "*", schema: "public", table: "cash_movements" }, () => syncBranchesWithServer())
        .on("postgres_changes", { event: "*", schema: "public", table: "cash_expenses" }, () => syncBranchesWithServer())
        .on("postgres_changes", { event: "*", schema: "public", table: "cash_shifts" }, () => syncBranchesWithServer())
        .subscribe();
    } catch {}

    // Intervalo de respaldo rápido cada 3 segundos (sincronización reactiva sin perder un segundo)
    const pollInterval = setInterval(() => {
      syncBranchesWithServer();
    }, 3000);

    const handleFocus = () => {
      syncBranchesWithServer();
    };
    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", handleFocus);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", handleFocus);
      if (realtimeChannel) {
        try {
          const supabase = createClient();
          supabase.removeChannel(realtimeChannel);
        } catch {}
      }
    };
  }, []);

  // Escuchar ventas, pedidos, movimientos de caja y cortes de turno transmitidos en tiempo real desde otros dispositivos
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Escuchar VENTAS en tiempo real
    const unsubSale = realtimeHub.onSale
      ? realtimeHub.onSale((sale) => {
          let targetBranchId = sale.branchId;
          if ((!targetBranchId || targetBranchId === "branch-matriz") && sale.cashier && sale.cashier.toLowerCase().includes("silvia")) {
            targetBranchId = "branch-1790889237862";
          } else if ((!targetBranchId || targetBranchId === "branch-matriz") && sale.cashier && sale.cashier.toLowerCase().includes("andres")) {
            targetBranchId = "branch-angeles";
          }

          // A) Actualizar métricas y turno de la sucursal receptora
          setBranches((prev) => {
            const isCash = sale.paymentMethod === "efectivo";
            const isCard = sale.paymentMethod === "tarjeta";
            const isTransfer = sale.paymentMethod === "transferencia";

            const updated = prev.map((b) => {
              if (b.id !== targetBranchId) return b;

              const curShift: BranchShift = b.currentShift || {
                id: `shift-${b.id}`,
                name: "Turno General",
                cashier: sale.cashier || "Cajero",
                openedAt: "06:00 AM",
                initialFund: 1000,
                status: "abierto",
                totalSales: 0,
                ticketCount: 0,
                cashSales: 0,
                cardSales: 0,
                transferSales: 0,
              };

              const updatedShift: BranchShift = {
                ...curShift,
                totalSales: (Number(curShift.totalSales) || 0) + sale.total,
                ticketCount: (Number(curShift.ticketCount) || 0) + 1,
                cashSales: (Number(curShift.cashSales) || 0) + (isCash ? sale.total : 0),
                cardSales: (Number(curShift.cardSales) || 0) + (isCard ? sale.total : 0),
                transferSales: (Number(curShift.transferSales) || 0) + (isTransfer ? sale.total : 0),
              };

              const updatedTopProduct = b.topProduct
                ? {
                    ...b.topProduct,
                    piecesSold: (b.topProduct.piecesSold || 0) + 1,
                  }
                : undefined;

              return {
                ...b,
                todaySales: (Number(b.todaySales) || 0) + sale.total,
                todayTickets: (Number(b.todayTickets) || 0) + 1,
                todayDeskSales: (Number(b.todayDeskSales ?? b.todaySales) || 0) + sale.total,
                todayDeskTickets: (Number(b.todayDeskTickets ?? b.todayTickets) || 0) + 1,
                cashInDrawer: (Number(b.cashInDrawer) || 0) + (isCash ? sale.total : 0),
                currentShift: updatedShift,
                topProduct: updatedTopProduct,
              };
            });

            try {
              localStorage.setItem("brito_branches_data", JSON.stringify(updated));
            } catch {}
            return updated;
          });

          // B) Agregar al feed de movimientos en vivo de dinero para supervisión
          const saleMov: BranchCashMovement = {
            id: `sale-${sale.id}`,
            branchId: targetBranchId,
            branchName: sale.branchName || (targetBranchId === "branch-1790889237862" ? "Sucursal San Ildefonso" : "Sucursal"),
            type: "entrada",
            category: "venta_mostrador",
            categoryLabel: "Venta en Mostrador",
            amount: sale.total,
            reason: `Ticket #${String(sale.id).slice(-6).toUpperCase()} • ${sale.itemsSummary || "Venta mostrador"} (${(sale.paymentMethod || "efectivo").toUpperCase()})`,
            authorizedBy: sale.cashier || "Cajero",
            timestamp: sale.timestamp || new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
            createdAt: sale.createdAt || new Date().toISOString(),
            rawTimestamp: Date.now(),
            movementType: "venta",
            cashier: sale.cashier || "Cajero",
            paymentMethod: sale.paymentMethod || "efectivo",
          };

          setCashMovements((prev) => {
            const next = [saleMov, ...prev.filter((m) => m.id !== saleMov.id)].slice(0, 300);
            try {
              localStorage.setItem("brito_branch_cash_movements", JSON.stringify(next));
            } catch {}
            return next;
          });

          // C) Registrar en la lista de ventas recientes
          setRecentSimulatedSales((prev) => {
            if (prev.some((s) => s.id === sale.id)) return prev;
            const saleLog: SimulatedSale = {
              id: sale.id,
              branchId: sale.branchId,
              branchName: sale.branchName,
              itemsSummary: sale.itemsSummary,
              total: sale.total,
              paymentMethod: sale.paymentMethod,
              cashier: sale.cashier,
              timestamp: sale.timestamp,
            };
            const next = [saleLog, ...prev.slice(0, 19)];
            try {
              localStorage.setItem("brito_simulated_sales", JSON.stringify(next));
            } catch {}
            return next;
          });

          // D) Registrar en las ventas del POS local para que el administrador las vea al instante en tickets y reportes
          try {
            const masterRaw = localStorage.getItem("brito_pos_master_sales");
            const currentRaw = localStorage.getItem("brito_pos_current_sales");
            let masterList: any[] = masterRaw ? JSON.parse(masterRaw) : [];
            let currentList: any[] = currentRaw ? JSON.parse(currentRaw) : [];

            const remoteSale = {
              id: sale.id,
              date: sale.date || `Hoy, ${sale.timestamp}`,
              items: Array.isArray(sale.items) && sale.items.length > 0 ? sale.items : [
                {
                  product: {
                    id: `prod-${sale.id}`,
                    name: sale.itemsSummary || "Venta en mostrador",
                    price: sale.total,
                    category: "pan_dulce",
                    stock: 99,
                    image: "🥖",
                  },
                  quantity: 1,
                },
              ],
              total: sale.total,
              paymentMethod: sale.paymentMethod,
              cashier: sale.cashier || "Cajero",
              customerName: sale.customerName || "Público General",
              customerId: "cli-0",
              timestamp: sale.createdAt ? new Date(sale.createdAt).getTime() : Date.now(),
              createdAt: sale.createdAt || new Date().toISOString(),
              branchId: sale.branchId,
              branchName: sale.branchName,
            };

            if (!masterList.some((s) => s.id === remoteSale.id)) {
              masterList = [remoteSale, ...masterList].slice(0, 1000);
              localStorage.setItem("brito_pos_master_sales", JSON.stringify(masterList));
            }
            // NOTA: No inyectar en brito_pos_current_sales para que los movimientos de otras sucursales
            // no alteren el turno activo de la terminal local ni desestabilicen sus números.
          } catch (err) {
            console.warn("[BranchContext] Error persisting realtime sale:", err);
          }

          try {
            window.dispatchEvent(new Event("brito_sales_updated"));
            window.dispatchEvent(new Event("brito_caja_updated"));
            syncBranchesRef.current?.();
          } catch {}
        })
      : () => {};

    // 1.1 Escuchar CANCELACIÓN DE VENTAS en tiempo real
    const unsubSaleCancelled = realtimeHub.onSaleCancelled
      ? realtimeHub.onSaleCancelled((payload) => {
          setBranches((prev) => {
            const isCash = payload.paymentMethod === "efectivo";
            const isCard = payload.paymentMethod === "tarjeta";
            const isTransfer = payload.paymentMethod === "transferencia";

            const updated = prev.map((b) => {
              if (b.id !== payload.branchId) return b;
              const curShift = b.currentShift;
              const updatedShift: BranchShift | undefined = curShift
                ? {
                    ...curShift,
                    totalSales: Math.max(0, (Number(curShift.totalSales) || 0) - payload.amount),
                    ticketCount: Math.max(0, (Number(curShift.ticketCount) || 0) - 1),
                    cashSales: Math.max(0, (Number(curShift.cashSales) || 0) - (isCash ? payload.amount : 0)),
                    cardSales: Math.max(0, (Number(curShift.cardSales) || 0) - (isCard ? payload.amount : 0)),
                    transferSales: Math.max(0, (Number(curShift.transferSales) || 0) - (isTransfer ? payload.amount : 0)),
                  }
                : undefined;

              return {
                ...b,
                todaySales: Math.max(0, (Number(b.todaySales) || 0) - payload.amount),
                todayTickets: Math.max(0, (Number(b.todayTickets) || 0) - 1),
                todayDeskSales: Math.max(0, (Number(b.todayDeskSales ?? b.todaySales) || 0) - payload.amount),
                todayDeskTickets: Math.max(0, (Number(b.todayDeskTickets ?? b.todayTickets) || 0) - 1),
                cashInDrawer: Math.max(0, (Number(b.cashInDrawer) || 0) - (isCash ? payload.amount : 0)),
                currentShift: updatedShift || b.currentShift,
              };
            });

            try {
              localStorage.setItem("brito_branches_data", JSON.stringify(updated));
            } catch {}
            return updated;
          });

          const cleanId = payload.id.replace(/^(pos-|POS-)/i, "");
          setCashMovements((prev) => {
            const filtered = prev.filter(
              (m) =>
                m.id !== `sale-${payload.id}` &&
                m.id !== payload.id &&
                !(m.reason && m.reason.includes(cleanId))
            );
            try {
              localStorage.setItem("brito_branch_cash_movements", JSON.stringify(filtered));
            } catch {}
            return filtered;
          });

          setRecentSimulatedSales((prev) => {
            const filtered = prev.filter(
              (s) => s.id !== payload.id && !String(s.id).includes(cleanId)
            );
            try {
              localStorage.setItem("brito_simulated_sales", JSON.stringify(filtered));
            } catch {}
            return filtered;
          });

          try {
            const masterRaw = localStorage.getItem("brito_pos_master_sales");
            if (masterRaw) {
              const list: any[] = JSON.parse(masterRaw);
              const next = list.filter((s) => s.id !== payload.id && !String(s.id).includes(cleanId));
              localStorage.setItem("brito_pos_master_sales", JSON.stringify(next));
            }
            window.dispatchEvent(new Event("brito_sales_updated"));
            window.dispatchEvent(new Event("brito_shift_cuts_updated"));
          } catch {}
        })
      : () => {};

    // 2. Escuchar PEDIDOS y abonos en tiempo real
    const unsubOrder = realtimeHub.onOrder
      ? realtimeHub.onOrder((payload) => {
          if (!payload || !payload.order) return;
          const { action, order } = payload;
          const deposit = Number(order.deposit) || 0;
          if (deposit > 0 && (action === "create" || action === "payment")) {
            const bId = order.branchId || "branch-matriz";
            const bName = order.branchName || "Sucursal";
            const orderMov: BranchCashMovement = {
              id: `order-${order.id}-${payload.timestamp || Date.now()}`,
              branchId: bId,
              branchName: bName,
              type: "entrada",
              category: "abono_pedido",
              categoryLabel: action === "payment" ? "Abono a Pedido" : "Anticipo de Pedido",
              amount: deposit,
              reason: `Pedido #${order.orderNumber || order.id} (${order.customerName}): ${order.description || "Pedido especial"}`,
              authorizedBy: order.cashier || "Cajero",
              timestamp: payload.timestamp || new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
              createdAt: new Date().toISOString(),
              rawTimestamp: Date.now(),
              movementType: "pedido",
              cashier: order.cashier || "Cajero",
              paymentMethod: order.paymentMethod || "efectivo",
            };

            setCashMovements((prev) => {
              const next = [orderMov, ...prev.filter((m) => m.id !== orderMov.id)].slice(0, 300);
              try {
                localStorage.setItem("brito_branch_cash_movements", JSON.stringify(next));
              } catch {}
              return next;
            });

            // Si fue en efectivo, sumar al dinero en gaveta de esa sucursal
            if (order.paymentMethod === "efectivo" || !order.paymentMethod) {
              setBranches((prev) => {
                const updated = prev.map((b) => {
                  if (b.id !== bId) return b;
                  return { ...b, cashInDrawer: b.cashInDrawer + deposit };
                });
                try {
                  localStorage.setItem("brito_branches_data", JSON.stringify(updated));
                } catch {}
                return updated;
              });
            }

            try {
              window.dispatchEvent(new Event("brito_caja_updated"));
              window.dispatchEvent(new Event("brito_orders_updated"));
            } catch {}
          }
        })
      : () => {};

    // 3. Escuchar MOVIMIENTOS DE CAJA (gastos, entradas, retiros)
    const unsubCashMovement = realtimeHub.onCashMovement
      ? realtimeHub.onCashMovement((movement) => {
          if (movement.type === "entrada") {
            const isOrderMovement =
              movement.category === "abono_pedido" ||
              movement.category === "pedido" ||
              movement.category === "anticipo_pedido" ||
              (movement.id && (String(movement.id).startsWith("order-") || String(movement.id).includes("PED-"))) ||
              (movement.reason && (/pedido|abono|anticipo|liquidaci/i).test(movement.reason)) ||
              Number(movement.amount) === 6000;
            if (isOrderMovement) {
              return;
            }
          }
          const movType: "entrada" | "gasto" = movement.type === "entrada" ? "entrada" : "gasto";
          const newMov: BranchCashMovement = {
            id: movement.id,
            branchId: movement.branchId,
            branchName: movement.branchName,
            type: movement.type,
            category: movement.category || "otro",
            categoryLabel: movement.categoryLabel || (movement.type === "entrada" ? "Entrada de Dinero" : "Gasto / Salida"),
            amount: movement.amount,
            reason: movement.reason,
            authorizedBy: movement.authorizedBy || movement.cashier || "Cajero",
            timestamp: movement.timestamp,
            createdAt: new Date().toISOString(),
            rawTimestamp: Date.now(),
            movementType: movType,
            cashier: movement.cashier || movement.authorizedBy || "Cajero",
            paymentMethod: "efectivo",
          };

          setCashMovements((prev) => {
            const next = [newMov, ...prev.filter((m) => m.id !== newMov.id)].slice(0, 300);
            try {
              localStorage.setItem("brito_branch_cash_movements", JSON.stringify(next));
            } catch {}
            return next;
          });

          // Actualizar efectivo en gaveta de la sucursal
          setBranches((prev) => {
            const updated = prev.map((b) => {
              if (b.id !== movement.branchId) return b;
              const delta = movement.type === "entrada" ? movement.amount : -movement.amount;
              return {
                ...b,
                cashInDrawer: Math.max(0, b.cashInDrawer + delta),
              };
            });
            try {
              localStorage.setItem("brito_branches_data", JSON.stringify(updated));
            } catch {}
            return updated;
          });

          try {
            window.dispatchEvent(new Event("brito_caja_updated"));
            window.dispatchEvent(new Event("brito_gastos_updated"));
            window.dispatchEvent(new Event("brito_incomes_updated"));
            window.dispatchEvent(new Event("storage"));
          } catch {}
        })
      : () => {};

    // 4. Escuchar CORTES DE CAJA en tiempo real
    const unsubShiftCut = realtimeHub.onShiftCut
      ? realtimeHub.onShiftCut((cut) => {
          if (!cut) return;
          let bId = cut.branchId || "branch-matriz";
          if (bId === "branch-matriz") {
            const resp = (cut.responsible || cut.outgoingCashier || "").toLowerCase();
            if (resp.includes("silvia")) {
              bId = "branch-1790889237862";
            } else if (resp.includes("andres")) {
              bId = "branch-angeles";
            }
          }
          const bName = cut.branchName || (bId === "branch-1790889237862" ? "Sucursal San Ildefonso" : "Sucursal");
          const cutMov: BranchCashMovement = {
            id: `cut-${cut.id}`,
            branchId: bId,
            branchName: bName,
            type: "salida",
            category: "corte_caja",
            categoryLabel: "Corte de Turno",
            amount: Number(cut.countedCash || cut.totalSales || 0),
            reason: `Corte de turno (${cut.shiftRange || "Turno"}). Saliente: ${cut.outgoingCashier} → Entrante: ${cut.incomingCashier}. Fondo nuevo: $${cut.nextFund || 1000}`,
            authorizedBy: cut.outgoingCashier || "Cajero",
            timestamp: cut.date || new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
            createdAt: new Date(cut.timestamp || Date.now()).toISOString(),
            rawTimestamp: cut.timestamp || Date.now(),
            movementType: "corte",
            cashier: cut.outgoingCashier || "Cajero",
            paymentMethod: "efectivo",
          };

          setCashMovements((prev) => {
            const next = [cutMov, ...prev.filter((m) => m.id !== cutMov.id)].slice(0, 300);
            try {
              localStorage.setItem("brito_branch_cash_movements", JSON.stringify(next));
            } catch {}
            return next;
          });

          const standardFund = bId === "branch-benito" ? 800 : bId === "branch-flores" ? 1200 : 1000;
          let newFund = (cut.nextFund !== undefined && cut.nextFund !== null && Number(cut.nextFund) > 0) ? Number(cut.nextFund) : standardFund;
          if (bId === "branch-matriz" && (newFund === 800 || newFund <= 0)) {
            newFund = 1000;
          }
          const nextCashier = cut.incomingCashier || "Cajero";
          const cutTs = cut.timestamp || parseDateTimeSafe(cut.date) || Date.now();
          const isFreshCut = Math.abs(Date.now() - cutTs) < 120000;

          // Solo reiniciar sucursal en 0 si es un corte genuinamente reciente (últimos 2 minutos)
          if (isFreshCut) {
            setBranches((prev) => {
              const updated = prev.map((b) => {
                if (b.id !== bId) return b;
                return {
                  ...b,
                  todaySales: 0,
                  todayTickets: 0,
                  todayDeskSales: 0,
                  todayDeskTickets: 0,
                  todayOrdersDeposit: 0,
                  todayOrdersTotal: 0,
                  todayOrdersCount: 0,
                  cashInDrawer: newFund,
                  lastCut: cut,
                  manager: nextCashier,
                  currentShift: {
                    id: b.currentShift?.id || `shift-${b.id}`,
                    name: cut.nextShift || b.currentShift?.name || "Turno General",
                    cashier: nextCashier,
                    openedAt: cut.date || b.currentShift?.openedAt || "06:00 AM",
                    initialFund: newFund,
                    totalSales: 0,
                    ticketCount: 0,
                    cashSales: 0,
                    cardSales: 0,
                    transferSales: 0,
                    status: "abierto" as const,
                  },
                };
              });
              try {
                localStorage.setItem("brito_branches_data", JSON.stringify(updated));
              } catch {}
              return updated;
            });
          }

          try {
            const raw = localStorage.getItem("brito_shift_cuts_history");
            const existingHistory: ShiftCutRecord[] = raw ? JSON.parse(raw) : [];
            const nextHistory = [cut, ...existingHistory.filter((c) => c && c.id !== cut.id)];
            localStorage.setItem("brito_shift_cuts_history", JSON.stringify(nextHistory));

            if (cutTs > 0) {
              localStorage.setItem(`brito_shift_start_${bId}`, cutTs.toString());
              localStorage.setItem(`brito_pos_initial_fund_${bId}`, newFund.toString());
              if (bId === "branch-matriz") {
                localStorage.setItem("brito_current_shift_start_timestamp", cutTs.toString());
                localStorage.setItem("brito_pos_initial_fund", newFund.toString());
              }
            }

            // Filtrar ventas y gastos locales de esta sucursal que ya quedaron cortados
            const curSalesRaw = localStorage.getItem("brito_pos_current_sales");
            if (curSalesRaw) {
              const curSales = JSON.parse(curSalesRaw);
              if (Array.isArray(curSales)) {
                const filtered = curSales.filter((s: any) => {
                  const sBranch = s.branchId || s.branch_id || "branch-matriz";
                  const sTime = parseDateTimeSafe(s.timestamp || s.createdAt || s.date);
                  return sBranch !== bId || sTime > cutTs;
                });
                localStorage.setItem("brito_pos_current_sales", JSON.stringify(filtered));
              }
            }

            const curExpRaw = localStorage.getItem("brito_pos_current_expenses");
            if (curExpRaw) {
              const curExp = JSON.parse(curExpRaw);
              if (Array.isArray(curExp)) {
                const filtered = curExp.filter((e: any) => {
                  const eBranch = e.branchId || e.branch_id || "branch-matriz";
                  const eTime = parseDateTimeSafe(e.timestamp || e.createdAt || e.date);
                  return eBranch !== bId || eTime > cutTs;
                });
                localStorage.setItem("brito_pos_current_expenses", JSON.stringify(filtered));
              }
            }

            window.dispatchEvent(new Event("brito_caja_updated"));
            window.dispatchEvent(new Event("brito_shift_cuts_updated"));
            window.dispatchEvent(new Event("brito_sales_updated"));
            syncBranchesRef.current?.();
          } catch {}
        })
      : () => {};

    // 5. Escuchar sucursales creadas, modificadas o eliminadas
    const unsubBranch = realtimeHub.onBranch
      ? realtimeHub.onBranch((payload) => {
          const { action, branch } = payload;
          if (!branch || !branch.id) return;

          setBranches((prev) => {
            let updated: Branch[];
            if (action === "create") {
              if (prev.some((b) => b.id === branch.id || (branch.code && b.code === branch.code))) {
                updated = prev.map((b) =>
                  b.id === branch.id || (branch.code && b.code === branch.code) ? { ...b, ...branch } : b
                );
              } else {
                updated = [...prev, branch];
              }
            } else if (action === "update") {
              updated = prev.map((b) => (b.id === branch.id ? { ...b, ...branch } : b));
            } else if (action === "delete") {
              if (prev.length <= 1) return prev;
              updated = prev.filter((b) => b.id !== branch.id);
            } else {
              updated = prev;
            }

            try {
              localStorage.setItem("brito_branches_data", JSON.stringify(updated));
            } catch {}
            return updated;
          });
        })
      : undefined;

    return () => {
      unsubSale();
      unsubSaleCancelled();
      unsubOrder();
      unsubCashMovement();
      unsubShiftCut();
      if (unsubBranch) unsubBranch();
    };
  }, []);

  // Save branches changes to localStorage and server
  const persistBranches = (updated: Branch[], isReplace = false) => {
    try {
      localStorage.setItem("brito_branches_data", JSON.stringify(updated));
    } catch {
      // Ignore
    }

    if (typeof window !== "undefined") {
      fetch(isReplace ? "/api/branches?replace=true" : "/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      }).catch((e) => console.warn("[BranchContext] Error syncing with /api/branches:", e));
    }
  };

  const switchBranch = (branchId: string | "all") => {
    if (!isAdmin && userAssignedBranchId) {
      setCurrentBranchId(userAssignedBranchId);
      try {
        localStorage.setItem("brito_current_branch_id", userAssignedBranchId);
      } catch {}
      return;
    }
    setCurrentBranchId(branchId);
    try {
      localStorage.setItem("brito_current_branch_id", branchId);
      if (typeof window !== "undefined") {
        if (realtimeHub?.triggerSyncNow) {
          realtimeHub.triggerSyncNow();
        }
        window.dispatchEvent(new Event("brito_sales_updated"));
        window.dispatchEvent(new Event("brito_caja_updated"));
        window.dispatchEvent(new Event("brito_orders_updated"));
      }
    } catch {
      // Ignore
    }
  };

  const addBranch = useCallback((newBranch: Branch) => {
    setBranches((prev) => {
      if (prev.some((b) => b.id === newBranch.id || (newBranch.code && b.code === newBranch.code))) {
        return prev;
      }
      const updated = [...prev, newBranch];
      persistBranches(updated);
      return updated;
    });

    // Transmitir en tiempo real a teléfonos y laptops conectados
    if (realtimeHub.broadcastBranch) {
      realtimeHub.broadcastBranch("create", newBranch);
    }

    if (typeof window !== "undefined") {
      try {
        const supabase = createClient();
        supabase.from("branches").upsert({
          id: newBranch.id,
          name: newBranch.name,
          short_name: newBranch.shortName || newBranch.name,
          address: newBranch.address,
          phone: newBranch.phone,
          is_active: newBranch.status !== "cerrada",
        }).then(() => {}, () => {});
      } catch {}
    }
  }, []);

  const updateBranch = useCallback((branchId: string, updates: Partial<Branch>) => {
    let updatedBranch: Branch | null = null;
    setBranches((prev) => {
      const updated = prev.map((b) => {
        if (b.id === branchId) {
          updatedBranch = { ...b, ...updates };
          return updatedBranch;
        }
        return b;
      });
      persistBranches(updated, true);
      return updated;
    });

    if (updatedBranch && realtimeHub.broadcastBranch) {
      realtimeHub.broadcastBranch("update", updatedBranch);
    }

    if (typeof window !== "undefined") {
      fetch("/api/branches", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: branchId, updates }),
      }).catch((e) => console.warn("[BranchContext] Error calling PUT /api/branches:", e));

      try {
        const supabase = createClient();
        const sUpdates: any = {};
        if (updates.name) sUpdates.name = updates.name;
        if (updates.shortName) sUpdates.short_name = updates.shortName;
        if (updates.address) sUpdates.address = updates.address;
        if (updates.phone) sUpdates.phone = updates.phone;
        if (updates.status !== undefined) sUpdates.is_active = updates.status !== "cerrada";
        if (Object.keys(sUpdates).length > 0) {
          supabase.from("branches").update(sUpdates).eq("id", branchId).then(() => {}, () => {});
        }
      } catch {}
    }
  }, []);

  const deleteBranch = useCallback((branchId: string) => {
    let deletedBranch: Branch | null = null;
    setBranches((prev) => {
      if (prev.length <= 1) return prev;
      deletedBranch = prev.find((b) => b.id === branchId) || null;
      const updated = prev.filter((b) => b.id !== branchId);
      persistBranches(updated, true);
      return updated;
    });

    if (deletedBranch && realtimeHub.broadcastBranch) {
      realtimeHub.broadcastBranch("delete", deletedBranch);
    }

    if (typeof window !== "undefined") {
      fetch(`/api/branches?id=${encodeURIComponent(branchId)}`, {
        method: "DELETE",
      }).catch((e) => console.warn("[BranchContext] Error calling DELETE /api/branches:", e));

      try {
        const supabase = createClient();
        supabase.from("branches").delete().eq("id", branchId).then(() => {}, () => {});
      } catch {}
    }

    setCurrentBranchId((current) => {
      if (current === branchId) {
        const remaining = branches.filter((b) => b.id !== branchId);
        const nextId = remaining[0]?.id || "all";
        try {
          localStorage.setItem("brito_current_branch_id", nextId);
        } catch {}
        return nextId;
      }
      return current;
    });
  }, [branches]);

  const registerRealSale = useCallback((
    branchId: string,
    amount: number,
    paymentMethod: "efectivo" | "tarjeta" | "transferencia",
    cashier: string,
    itemsSummary: string,
    saleDetails?: {
      id?: string;
      items?: any[];
      customerName?: string;
      customerId?: string;
      date?: string;
      createdAt?: string;
    }
  ) => {
    try {
      const isCash = paymentMethod === "efectivo";
      const isCard = paymentMethod === "tarjeta";
      const isTransfer = paymentMethod === "transferencia";

      setBranches((prev) => {
        const updated = prev.map((b) => {
          if (b.id !== branchId) return b;

          const defShift: BranchShift = {
            id: `shift-${b.id}`,
            name: "Turno General",
            cashier: cashier || "Cajero",
            openedAt: "06:00 AM",
            initialFund: 1000,
            status: "abierto",
            totalSales: 0,
            ticketCount: 0,
            cashSales: 0,
            cardSales: 0,
            transferSales: 0,
          };

          const curShift: BranchShift = b.currentShift ? { ...b.currentShift } : defShift;

          const updatedShift: BranchShift = {
            ...curShift,
            totalSales: (Number(curShift.totalSales) || 0) + amount,
            ticketCount: (Number(curShift.ticketCount) || 0) + 1,
            cashSales: (Number(curShift.cashSales) || 0) + (isCash ? amount : 0),
            cardSales: (Number(curShift.cardSales) || 0) + (isCard ? amount : 0),
            transferSales: (Number(curShift.transferSales) || 0) + (isTransfer ? amount : 0),
          };

          const updatedTopProduct = b.topProduct
            ? {
                ...b.topProduct,
                piecesSold: (b.topProduct.piecesSold || 0) + 1,
              }
            : undefined;

          return {
            ...b,
            todaySales: (Number(b.todaySales) || 0) + amount,
            todayTickets: (Number(b.todayTickets) || 0) + 1,
            cashInDrawer: (Number(b.cashInDrawer) || 0) + (isCash ? amount : 0),
            currentShift: updatedShift,
            topProduct: updatedTopProduct,
          };
        });

        persistBranches(updated);
        return updated;
      });

      const timeStr = new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const targetBranch = branches.find((b) => b.id === branchId);
      const saleLog: SimulatedSale = {
        id: saleDetails?.id || `pos-${Date.now()}`,
        branchId,
        branchName: targetBranch?.shortName || targetBranch?.name || "POS",
        itemsSummary: itemsSummary || "Venta mostrador POS",
        total: amount,
        paymentMethod,
        cashier: cashier || "Cajero",
        timestamp: timeStr,
      };

      setRecentSimulatedSales((prev) => {
        const next = [saleLog, ...prev.slice(0, 19)];
        try {
          localStorage.setItem("brito_simulated_sales", JSON.stringify(next));
        } catch {}
        return next;
      });

      // Registrar también en el feed de movimientos de dinero para supervisión en vivo del administrador
      const saleMov: BranchCashMovement = {
        id: `sale-${saleLog.id}`,
        branchId,
        branchName: saleLog.branchName,
        type: "entrada",
        category: "venta_mostrador",
        categoryLabel: "Venta en Mostrador",
        amount,
        reason: `Ticket #${String(saleLog.id).slice(-6).toUpperCase()} • ${itemsSummary || "Venta en mostrador"} (${paymentMethod.toUpperCase()})`,
        authorizedBy: cashier || "Cajero",
        timestamp: timeStr,
        createdAt: saleDetails?.createdAt || new Date().toISOString(),
        rawTimestamp: Date.now(),
        movementType: "venta",
        cashier: cashier || "Cajero",
        paymentMethod,
      };

      setCashMovements((prev) => {
        const next = [saleMov, ...prev.filter((m) => m.id !== saleMov.id)].slice(0, 300);
        try {
          localStorage.setItem("brito_branch_cash_movements", JSON.stringify(next));
        } catch {}
        return next;
      });

      // Transmisión en tiempo real por WebSocket a celulares y computadoras
      if (realtimeHub.broadcastSale) {
        realtimeHub.broadcastSale({
          id: saleLog.id,
          branchId,
          branchName: saleLog.branchName,
          total: amount,
          paymentMethod,
          cashier: saleLog.cashier,
          itemsSummary: saleLog.itemsSummary,
          timestamp: timeStr,
          items: saleDetails?.items,
          customerName: saleDetails?.customerName,
          date: saleDetails?.date || timeStr,
          createdAt: saleDetails?.createdAt || new Date().toISOString(),
        });
      }

      // Alerta y timbre inmediato en el celular del dueño/cajeros
      if (realtimeHub.broadcastNotification) {
        realtimeHub.broadcastNotification({
          id: `sale-notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          senderName: `🥖 Mostrador ${saleLog.branchName}`,
          senderAvatar: "🥖",
          badgeIcon: "dinero",
          title: "Venta en Mostrador",
          highlightText: `+$${amount.toFixed(2)} MXN • ${saleLog.branchName}`,
          description: `${saleLog.cashier}: ${saleLog.itemsSummary} (${paymentMethod.toUpperCase()})`,
          timeAgo: "Hace un momento",
          group: "recientes",
          read: false,
          category: "caja",
          actionLabel: "Ver Flujo",
          actionLink: "/caja",
        });
      }
    } catch (err) {
      console.error("Error inside registerRealSale:", err);
    }
  }, [branches]);

  const cancelRealSale = useCallback((params: {
    saleId: string;
    branchId: string;
    amount: number;
    paymentMethod: "efectivo" | "tarjeta" | "transferencia";
    cashier?: string;
  }) => {
    try {
      const isCash = params.paymentMethod === "efectivo";
      const isCard = params.paymentMethod === "tarjeta";
      const isTransfer = params.paymentMethod === "transferencia";
      const cleanId = params.saleId.replace(/^(pos-|POS-)/i, "");

      setBranches((prev) => {
        const updated = prev.map((b) => {
          if (b.id !== params.branchId) return b;
          const curShift = b.currentShift;
          const updatedShift: BranchShift | undefined = curShift
            ? {
                ...curShift,
                totalSales: Math.max(0, (Number(curShift.totalSales) || 0) - params.amount),
                ticketCount: Math.max(0, (Number(curShift.ticketCount) || 0) - 1),
                cashSales: Math.max(0, (Number(curShift.cashSales) || 0) - (isCash ? params.amount : 0)),
                cardSales: Math.max(0, (Number(curShift.cardSales) || 0) - (isCard ? params.amount : 0)),
                transferSales: Math.max(0, (Number(curShift.transferSales) || 0) - (isTransfer ? params.amount : 0)),
              }
            : undefined;

          return {
            ...b,
            todaySales: Math.max(0, (Number(b.todaySales) || 0) - params.amount),
            todayTickets: Math.max(0, (Number(b.todayTickets) || 0) - 1),
            cashInDrawer: Math.max(0, (Number(b.cashInDrawer) || 0) - (isCash ? params.amount : 0)),
            currentShift: updatedShift || b.currentShift,
          };
        });

        persistBranches(updated);
        return updated;
      });

      // Eliminar del historial de movimientos de caja de la sucursal
      setCashMovements((prev) => {
        const filtered = prev.filter(
          (m) =>
            m.id !== `sale-${params.saleId}` &&
            m.id !== params.saleId &&
            !(m.reason && m.reason.includes(cleanId))
        );
        try {
          localStorage.setItem("brito_branch_cash_movements", JSON.stringify(filtered));
        } catch {}
        return filtered;
      });

      // Eliminar de ventas simuladas
      setRecentSimulatedSales((prev) => {
        const filtered = prev.filter(
          (s) => s.id !== params.saleId && !String(s.id).includes(cleanId)
        );
        try {
          localStorage.setItem("brito_simulated_sales", JSON.stringify(filtered));
        } catch {}
        return filtered;
      });

      // Transmitir cancelación en tiempo real por WebSocket
      if (realtimeHub?.broadcastSaleCancelled) {
        realtimeHub.broadcastSaleCancelled({
          id: params.saleId,
          branchId: params.branchId,
          amount: params.amount,
          paymentMethod: params.paymentMethod,
          cashier: params.cashier,
        });
      }
    } catch (err) {
      console.error("Error inside cancelRealSale:", err);
    }
  }, [branches]);

  const isAllBranches = isAdmin ? currentBranchId === "all" : false;

  const currentBranch = useMemo(() => {
    if (!isAdmin && userAssignedBranchId) {
      return branches.find((b) => b.id === userAssignedBranchId) || branches[0];
    }
    if (currentBranchId === "all") {
      return null;
    }
    return branches.find((b) => b.id === currentBranchId) || branches[0];
  }, [branches, currentBranchId, isAdmin, userAssignedBranchId]);

  // Simulate a single sale
  const simulateSale = useCallback((targetBranchId?: string, customAmount?: number): SimulatedSale => {
    const effectiveBranchId = targetBranchId || (currentBranchId === "all" ? "branch-matriz" : currentBranchId);
    
    // Pick 1-3 random items
    const itemCount = Math.floor(Math.random() * 3) + 1;
    let saleTotal = 0;
    const itemNames: string[] = [];

    if (customAmount && customAmount > 0) {
      saleTotal = customAmount;
      itemNames.push("Venta Especial");
    } else {
      for (let i = 0; i < itemCount; i++) {
        const prod = SAMPLE_PRODUCTS[Math.floor(Math.random() * SAMPLE_PRODUCTS.length)];
        const qty = Math.floor(Math.random() * 3) + 1;
        saleTotal += prod.price * qty;
        itemNames.push(`${qty}x ${prod.name}`);
      }
    }

    // Payment method distribution: 70% cash, 20% card, 10% transfer
    const rand = Math.random();
    const paymentMethod: "efectivo" | "tarjeta" | "transferencia" = 
      rand < 0.7 ? "efectivo" : rand < 0.9 ? "tarjeta" : "transferencia";

    const branch = branches.find((b) => b.id === effectiveBranchId) || branches[0];
    const now = new Date();
    const timeStr = now.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    const newSale: SimulatedSale = {
      id: `sim-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      branchId: branch.id,
      branchName: branch.shortName,
      itemsSummary: itemNames.join(", "),
      total: saleTotal,
      paymentMethod,
      cashier: branch.currentShift.cashier,
      timestamp: timeStr,
    };

    // Update branch metrics & shift
    setBranches((prev) => {
      const updated = prev.map((b) => {
        if (b.id !== effectiveBranchId) return b;

        const isCash = paymentMethod === "efectivo";
        const isCard = paymentMethod === "tarjeta";
        const isTransfer = paymentMethod === "transferencia";

        const updatedShift: BranchShift = {
          ...b.currentShift,
          totalSales: b.currentShift.totalSales + saleTotal,
          ticketCount: b.currentShift.ticketCount + 1,
          cashSales: b.currentShift.cashSales + (isCash ? saleTotal : 0),
          cardSales: b.currentShift.cardSales + (isCard ? saleTotal : 0),
          transferSales: b.currentShift.transferSales + (isTransfer ? saleTotal : 0),
        };

        const updatedTopProduct = b.topProduct
          ? {
              ...b.topProduct,
              piecesSold: (b.topProduct.piecesSold || 0) + (itemCount > 0 ? 2 : 1),
            }
          : undefined;

        return {
          ...b,
          todaySales: b.todaySales + saleTotal,
          todayTickets: b.todayTickets + 1,
          cashInDrawer: b.cashInDrawer + (isCash ? saleTotal : 0),
          currentShift: updatedShift,
          topProduct: updatedTopProduct,
        };
      });

      try {
        localStorage.setItem("brito_branches_data", JSON.stringify(updated));
      } catch {
        // Ignore
      }

      return updated;
    });

    // Update recent sales list
    setRecentSimulatedSales((prev) => {
      const next = [newSale, ...prev.slice(0, 19)];
      try {
        localStorage.setItem("brito_simulated_sales", JSON.stringify(next));
      } catch {
        // Ignore
      }
      return next;
    });

    // Transmitir en tiempo real
    if (realtimeHub.broadcastSale) {
      realtimeHub.broadcastSale({
        id: newSale.id,
        branchId: newSale.branchId,
        branchName: newSale.branchName,
        total: newSale.total,
        paymentMethod: newSale.paymentMethod,
        cashier: newSale.cashier,
        itemsSummary: newSale.itemsSummary,
        timestamp: timeStr,
      });
    }

    return newSale;
  }, [branches, currentBranchId]);

  // Simulate multiple sales
  const simulateBulkSales = useCallback((targetBranchId?: string, count: number = 10) => {
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        simulateSale(targetBranchId);
      }, i * 150);
    }
  }, [simulateSale]);

  // Advance shift (e.g. Matutino -> Vespertino)
  const advanceShift = useCallback((branchId: string) => {
    setBranches((prev) => {
      const updated = prev.map((b) => {
        if (b.id !== branchId) return b;

        const isMatutino = b.currentShift.name.includes("Matutino");
        const nextShiftName = isMatutino ? "Turno Vespertino (14:00 - 22:00)" : "Turno Matutino (06:00 - 14:00)";
        const nextCashier = isMatutino 
          ? (b.id === "branch-matriz" ? "Raúl Gómez" : "Mariana López") 
          : (b.id === "branch-matriz" ? "Lupita Brito" : "Carlos Mendoza");

        const newShift: BranchShift = {
          id: `shift-${b.code.toLowerCase()}-${Date.now()}`,
          name: nextShiftName,
          cashier: nextCashier,
          openedAt: new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
          initialFund: 1000,
          cashSales: 0,
          cardSales: 0,
          transferSales: 0,
          totalSales: 0,
          ticketCount: 0,
          status: "abierto",
        };

        return {
          ...b,
          todaySales: 0,
          todayTickets: 0,
          todayDeskSales: 0,
          todayDeskTickets: 0,
          todayOrdersDeposit: 0,
          todayOrdersTotal: 0,
          todayOrdersCount: 0,
          cashInDrawer: 1000,
          currentShift: newShift,
        };
      });

      persistBranches(updated);
      return updated;
    });
  }, []);

  const addCashMovement = useCallback(
    (
      branchId: string,
      movement: {
        type: "entrada" | "salida";
        category: BranchCashMovement["category"];
        categoryLabel: string;
        amount: number;
        reason: string;
        authorizedBy: string;
      }
    ) => {
      const targetBranch = branches.find((b) => b.id === branchId);
      const branchName = targetBranch ? targetBranch.shortName : "Sucursal";
      const now = new Date();
      const timeStr = now.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

      const newMovement: BranchCashMovement = {
        id: `bmov-${Date.now()}`,
        branchId,
        branchName,
        ...movement,
        movementType: movement.type === "entrada" ? "entrada" : "gasto",
        cashier: movement.authorizedBy,
        paymentMethod: "efectivo",
        timestamp: timeStr,
        createdAt: now.toISOString(),
        rawTimestamp: now.getTime(),
      };

      setCashMovements((prev) => {
        const next = [newMovement, ...prev];
        try {
          localStorage.setItem("brito_branch_cash_movements", JSON.stringify(next));
        } catch {}
        return next;
      });

      // Si es una salida de dinero, registrar automáticamente en el Historial Detallado de Gastos
      if (movement.type === "salida") {
        recordCashOutflowAsExpense({
          amount: movement.amount,
          description: movement.reason,
          category: movement.category,
          branchId,
          branchName: targetBranch ? targetBranch.name : branchName,
          cashier: movement.authorizedBy,
          accountOrigin: "Caja Mostrador (Efectivo Turno)",
          paymentMethod: "efectivo",
          skipSupabaseAndBroadcast: true,
        });
      }

      // Update cash in drawer for that branch
      setBranches((prev) => {
        const updated = prev.map((b) => {
          if (b.id !== branchId) return b;
          const delta = movement.type === "entrada" ? movement.amount : -movement.amount;
          const updatedCashInDrawer = Math.max(0, b.cashInDrawer + delta);
          return {
            ...b,
            cashInDrawer: updatedCashInDrawer,
          };
        });
        persistBranches(updated);
        return updated;
      });

      // Transmisión inmediata por WebSocket del movimiento de dinero
      if (realtimeHub.broadcastCashMovement) {
        realtimeHub.broadcastCashMovement(newMovement);
      }

      // Notificación automática e instantánea al celular
      if (realtimeHub.broadcastNotification) {
        const isEntrada = movement.type === "entrada";
        realtimeHub.broadcastNotification({
          id: `mov-notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          senderName: `💵 Caja ${branchName}`,
          senderAvatar: isEntrada ? "📥" : "📤",
          badgeIcon: isEntrada ? "dinero" : "alerta",
          title: isEntrada ? "Ingreso a Caja" : "Salida de Dinero / Gasto",
          highlightText: `${isEntrada ? "+" : "-"}$${movement.amount.toFixed(2)} MXN • ${branchName}`,
          description: `${movement.categoryLabel}: ${movement.reason} • Autorizó: ${movement.authorizedBy}`,
          timeAgo: "Hace un momento",
          group: "recientes",
          read: false,
          category: "caja",
          actionLabel: "Ver Flujo",
          actionLink: "/caja",
        });
      }
    },
    [branches]
  );

  // Live simulation ticker (Desactivado para asegurar ventas y movimientos 100% en tiempo real)
  const toggleLiveSimulation = () => {
    setIsLiveSimulating(false);
  };

  // Consolidated metrics across all branches
  const consolidatedMetrics = {
    totalSales: branches.reduce((sum, b) => sum + b.todaySales, 0),
    totalTickets: branches.reduce((sum, b) => sum + b.todayTickets, 0),
    totalCashInDrawer: branches.reduce((sum, b) => sum + b.cashInDrawer, 0),
    totalDailyGoal: branches.reduce((sum, b) => sum + b.dailyGoal, 0),
    percentGoal: Math.min(
      100,
      Math.round(
        (branches.reduce((sum, b) => sum + b.todaySales, 0) /
          branches.reduce((sum, b) => sum + b.dailyGoal, 0)) *
          100
      )
    ),
  };

  return (
    <BranchContext.Provider
      value={{
        branches,
        currentBranch,
        isAllBranches,
        switchBranch,
        addBranch,
        updateBranch,
        deleteBranch,
        registerRealSale,
        cancelRealSale,
        simulateSale,
        simulateBulkSales,
        advanceShift,
        isLiveSimulating,
        toggleLiveSimulation,
        recentSimulatedSales,
        cashMovements,
        addCashMovement,
        consolidatedMetrics,
      }}
    >
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  const context = useContext(BranchContext);
  if (!context) {
    throw new Error("useBranch must be used within a BranchProvider");
  }
  return context;
}
