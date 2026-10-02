"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { Branch, BranchShift, BranchCashMovement } from "@/types";
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
      cashier: "Lupita Brito",
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
    manager: "Maestro Juan",
    assignedUserId: "usr-3",
    assignedUserName: "Maestro Juan",
    assignedUserEmail: "panadero@panaderiabrito.com",
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
    id: "branch-flores",
    name: "Sucursal Las Flores (Plaza)",
    shortName: "Las Flores",
    code: "FLO-03",
    address: "Calzada Oriente #88, Plaza Las Flores",
    phone: "55 9988 7766",
    manager: "Elena Brito",
    assignedUserId: "usr-2",
    assignedUserName: "Lupita Brito",
    assignedUserEmail: "caja@panaderiabrito.com",
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
            return parsed;
          }
        }
      } catch {}
    }
    return DEFAULT_BRANCHES;
  });

  const [currentBranchId, setCurrentBranchId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("brito_current_branch_id");
      if (saved) return saved;
    }
    return "branch-matriz";
  });

  // Los perfiles operativos (cajeros, etc.) quedan estrictamente anclados a su sucursal asignada
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

  // Load state from localStorage & Server API
  useEffect(() => {
    // 1. Sincronización en tiempo real con el servidor y Supabase para reflejar todas las sucursales de otros perfiles
    const syncBranchesWithServer = async () => {
      try {
        // A) Sincronizar desde /api/branches (persistencia central del servidor)
        const res = await fetch("/api/branches");
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.branches) && data.branches.length > 0) {
            setBranches((localBranches) => {
              const branchMap = new Map<string, Branch>();
              DEFAULT_BRANCHES.forEach((d) => branchMap.set(d.id, d));

              // Sembrar primero con los datos locales
              localBranches.forEach((b) => branchMap.set(b.id, b));

              // Aplicar lo del servidor sin sobreescribir ventas mayores con cero
              data.branches.forEach((serverB: Branch) => {
                const localB = branchMap.get(serverB.id);
                if (!localB) {
                  branchMap.set(serverB.id, serverB);
                } else {
                  branchMap.set(serverB.id, {
                    ...localB,
                    ...serverB,
                    todaySales: Math.max(Number(serverB.todaySales) || 0, localB.todaySales || 0),
                    todayTickets: Math.max(Number(serverB.todayTickets) || 0, localB.todayTickets || 0),
                    cashInDrawer: serverB.cashInDrawer !== undefined ? Number(serverB.cashInDrawer) : localB.cashInDrawer,
                    currentShift: serverB.currentShift || localB.currentShift,
                    status: serverB.status || localB.status,
                  });
                }
              });

              const merged = Array.from(branchMap.values());
              try {
                localStorage.setItem("brito_branches_data", JSON.stringify(merged));
              } catch {}
              return merged;
            });
          }
        }

        // B) Sincronizar directamente con Supabase las ventas, pedidos, gastos y movimientos de TODAS las sucursales
        try {
          const supabase = createClient();
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          const todayIso = todayStart.toISOString();

          const [salesRes, ordersRes, movsRes, expsRes] = await Promise.allSettled([
            supabase
              .from("sales")
              .select("id, branch_id, total, payment_method, cashier, date, created_at")
              .gte("created_at", todayIso),
            supabase
              .from("custom_orders")
              .select("id, order_number, customer_name, branch_id, branch_name, description, total, deposit, payment_status, payment_method, cashier, created_at")
              .gte("created_at", todayIso),
            supabase
              .from("cash_movements")
              .select("id, branch_id, type, category, category_label, amount, reason, authorized_by, created_at")
              .gte("created_at", todayIso),
            supabase
              .from("cash_expenses")
              .select("id, branch_id, amount, category, description, cashier, created_at")
              .gte("created_at", todayIso),
          ]);

          const dbSales = salesRes.status === "fulfilled" && !salesRes.value.error ? salesRes.value.data || [] : [];
          const dbOrders = ordersRes.status === "fulfilled" && !ordersRes.value.error ? ordersRes.value.data || [] : [];
          const dbMovs = movsRes.status === "fulfilled" && !movsRes.value.error ? movsRes.value.data || [] : [];
          const dbExps = expsRes.status === "fulfilled" && !expsRes.value.error ? expsRes.value.data || [] : [];

          const branchAgg = new Map<string, {
            total: number;
            count: number;
            cashSales: number;
            cardSales: number;
            transferSales: number;
            orderCash: number;
            movNet: number;
            expCash: number;
            lastCashier?: string;
          }>();

          DEFAULT_BRANCHES.forEach((b) => {
            branchAgg.set(b.id, {
              total: 0,
              count: 0,
              cashSales: 0,
              cardSales: 0,
              transferSales: 0,
              orderCash: 0,
              movNet: 0,
              expCash: 0,
            });
          });

          // 1. Agregar ventas
          dbSales.forEach((s: any) => {
            const bId = s.branch_id || "branch-matriz";
            let cur = branchAgg.get(bId);
            if (!cur) {
              cur = { total: 0, count: 0, cashSales: 0, cardSales: 0, transferSales: 0, orderCash: 0, movNet: 0, expCash: 0 };
              branchAgg.set(bId, cur);
            }
            const amt = Number(s.total) || 0;
            cur.total += amt;
            cur.count += 1;
            if (s.payment_method === "tarjeta") cur.cardSales += amt;
            else if (s.payment_method === "transferencia") cur.transferSales += amt;
            else cur.cashSales += amt;
            if (s.cashier) cur.lastCashier = s.cashier;
          });

          // 2. Agregar abonos/anticipos en efectivo de pedidos
          dbOrders.forEach((o: any) => {
            const bId = o.branch_id || "branch-matriz";
            let cur = branchAgg.get(bId);
            if (!cur) {
              cur = { total: 0, count: 0, cashSales: 0, cardSales: 0, transferSales: 0, orderCash: 0, movNet: 0, expCash: 0 };
              branchAgg.set(bId, cur);
            }
            const dep = Number(o.deposit) || 0;
            if (dep > 0 && (o.payment_method === "efectivo" || !o.payment_method)) {
              cur.orderCash += dep;
            }
          });

          // 3. Movimientos de caja (aportes / retiros fuera de ventas)
          dbMovs.forEach((m: any) => {
            if (m.category === "venta_mostrador") return;
            const bId = m.branch_id || "branch-matriz";
            let cur = branchAgg.get(bId);
            if (!cur) {
              cur = { total: 0, count: 0, cashSales: 0, cardSales: 0, transferSales: 0, orderCash: 0, movNet: 0, expCash: 0 };
              branchAgg.set(bId, cur);
            }
            const amt = Number(m.amount) || 0;
            cur.movNet += m.type === "entrada" ? amt : -amt;
          });

          // 4. Gastos en efectivo
          dbExps.forEach((e: any) => {
            const bId = e.branch_id || "branch-matriz";
            let cur = branchAgg.get(bId);
            if (!cur) {
              cur = { total: 0, count: 0, cashSales: 0, cardSales: 0, transferSales: 0, orderCash: 0, movNet: 0, expCash: 0 };
              branchAgg.set(bId, cur);
            }
            cur.expCash += Number(e.amount) || 0;
          });

          // Actualizar métricas vivas de cada sucursal
          setBranches((prev) => {
            const updated = prev.map((b) => {
              const agg = branchAgg.get(b.id);
              if (!agg) return b;
              const initialFund = b.currentShift?.initialFund || 1000;
              const calculatedCash = Math.max(0, initialFund + agg.cashSales + agg.orderCash + agg.movNet - agg.expCash);

              return {
                ...b,
                todaySales: agg.total,
                todayTickets: agg.count,
                cashInDrawer: calculatedCash,
                currentShift: {
                  ...(b.currentShift || {
                    id: `shift-${b.id}`,
                    name: "Turno General",
                    cashier: agg.lastCashier || "Cajero",
                    openedAt: "06:00 AM",
                    initialFund: 1000,
                    status: "abierto",
                  }),
                  totalSales: agg.total,
                  ticketCount: agg.count,
                  cashSales: agg.cashSales,
                  cardSales: agg.cardSales,
                  transferSales: agg.transferSales,
                  cashier: agg.lastCashier || b.currentShift?.cashier || "Cajero",
                },
              };
            });

            try {
              localStorage.setItem("brito_branches_data", JSON.stringify(updated));
            } catch {}
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

          // E) Cortes de caja de hoy
          try {
            const rawCuts = localStorage.getItem("brito_shift_cuts_history");
            if (rawCuts) {
              const cuts = JSON.parse(rawCuts);
              if (Array.isArray(cuts)) {
                cuts.forEach((c: any) => {
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

              const rawCurrent = localStorage.getItem("brito_pos_current_sales");
              const currentList: any[] = rawCurrent ? JSON.parse(rawCurrent) : [];
              const currentMap = new Map<string, any>(currentList.map((s) => [s.id, s]));
              let currentChanged = false;

              updatedMaster.forEach((s) => {
                if (!currentMap.has(s.id)) {
                  currentMap.set(s.id, s);
                  currentChanged = true;
                }
              });

              if (currentChanged) {
                const updatedCurrent = Array.from(currentMap.values()).sort((a, b) => compareMovementsDesc(a, b));
                localStorage.setItem("brito_pos_current_sales", JSON.stringify(updatedCurrent));
              }

              window.dispatchEvent(new Event("brito_sales_updated"));
              window.dispatchEvent(new Event("brito_caja_updated"));
            }
          } catch {}
        } catch {}
      } catch (err) {
        console.warn("[BranchContext] No se pudo consultar /api/branches:", err);
      }
    };

    syncBranchesWithServer();

    // 2. Cargar estado de almacenamiento local
    try {
      const savedBranches = localStorage.getItem("brito_branches_data");
      if (savedBranches) {
        const parsed = JSON.parse(savedBranches);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setBranches((prev) => {
            const map = new Map<string, Branch>();
            DEFAULT_BRANCHES.forEach((d) => map.set(d.id, d));
            parsed.forEach((b: Branch) => map.set(b.id, { ...map.get(b.id), ...b }));
            prev.forEach((b: Branch) => map.set(b.id, { ...map.get(b.id), ...b }));
            return Array.from(map.values());
          });
        }
      }
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
        setCashMovements(JSON.parse(savedMovements));
      }
    } catch {
      // Ignore localStorage error
    }

    // Intervalo de sincronización en vivo cada 6 segundos para mantener todas las sucursales al día
    const pollInterval = setInterval(() => {
      syncBranchesWithServer();
    }, 6000);

    const handleFocus = () => {
      syncBranchesWithServer();
    };
    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", handleFocus);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", handleFocus);
    };
  }, []);

  // Escuchar ventas, pedidos, movimientos de caja y cortes de turno transmitidos en tiempo real desde otros dispositivos
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Escuchar VENTAS en tiempo real
    const unsubSale = realtimeHub.onSale
      ? realtimeHub.onSale((sale) => {
          // A) Actualizar métricas y turno de la sucursal receptora
          setBranches((prev) => {
            const isCash = sale.paymentMethod === "efectivo";
            const isCard = sale.paymentMethod === "tarjeta";
            const isTransfer = sale.paymentMethod === "transferencia";

            const updated = prev.map((b) => {
              if (b.id !== sale.branchId) return b;

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
            branchId: sale.branchId,
            branchName: sale.branchName || "Sucursal",
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

            let updatedAny = false;
            if (!masterList.some((s) => s.id === remoteSale.id)) {
              masterList = [remoteSale, ...masterList].slice(0, 1000);
              localStorage.setItem("brito_pos_master_sales", JSON.stringify(masterList));
              updatedAny = true;
            }

            if (!currentList.some((s) => s.id === remoteSale.id)) {
              currentList = [remoteSale, ...currentList].slice(0, 500);
              localStorage.setItem("brito_pos_current_sales", JSON.stringify(currentList));
              updatedAny = true;
            }

            if (updatedAny) {
              window.dispatchEvent(new Event("brito_sales_updated"));
              window.dispatchEvent(new Event("brito_caja_updated"));
              window.dispatchEvent(new Event("storage"));
            }
          } catch (err) {
            console.warn("[BranchContext] Error persisting realtime sale:", err);
          }
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
          const bId = cut.branchId || "branch-matriz";
          const bName = cut.branchName || "Sucursal";
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

          // Reiniciar caja con el nuevo fondo
          setBranches((prev) => {
            const updated = prev.map((b) => {
              if (b.id !== bId) return b;
              return {
                ...b,
                cashInDrawer: Number(cut.nextFund) || 1000,
                currentShift: {
                  ...(b.currentShift || {
                    id: `shift-${b.id}`,
                    name: cut.nextShift || "Turno General",
                    cashier: cut.incomingCashier || "Cajero",
                    openedAt: "06:00 AM",
                    initialFund: Number(cut.nextFund) || 1000,
                    status: "abierto",
                  }),
                  cashier: cut.incomingCashier || b.currentShift?.cashier || "Cajero",
                  initialFund: Number(cut.nextFund) || 1000,
                  totalSales: 0,
                  ticketCount: 0,
                  cashSales: 0,
                  cardSales: 0,
                  transferSales: 0,
                },
              };
            });
            try {
              localStorage.setItem("brito_branches_data", JSON.stringify(updated));
            } catch {}
            return updated;
          });

          try {
            window.dispatchEvent(new Event("brito_caja_updated"));
            window.dispatchEvent(new Event("brito_shift_cuts_updated"));
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

    // Escuchar evento de corte local en esta misma ventana
    const handleLocalCut = () => {
      try {
        const rawCuts = localStorage.getItem("brito_shift_cuts_history");
        if (rawCuts) {
          const cuts = JSON.parse(rawCuts);
          if (Array.isArray(cuts) && cuts.length > 0) {
            const latest = cuts[0];
            const cutMov: BranchCashMovement = {
              id: `cut-${latest.id}`,
              branchId: latest.branchId || "branch-matriz",
              branchName: latest.branchName || "Sucursal",
              type: "salida",
              category: "corte_caja",
              categoryLabel: "Corte de Turno",
              amount: Number(latest.countedCash || latest.totalSales || 0),
              reason: `Corte de turno (${latest.shiftRange || "Turno"}). Saliente: ${latest.outgoingCashier} → Entrante: ${latest.incomingCashier}. Fondo nuevo: $${latest.nextFund || 1000}`,
              authorizedBy: latest.outgoingCashier || "Cajero",
              timestamp: latest.date || new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
              createdAt: new Date(latest.timestamp || Date.now()).toISOString(),
              rawTimestamp: latest.timestamp || Date.now(),
              movementType: "corte",
              cashier: latest.outgoingCashier || "Cajero",
              paymentMethod: "efectivo",
            };
            setCashMovements((prev) => [cutMov, ...prev.filter((m) => m.id !== cutMov.id)].slice(0, 300));
          }
        }
      } catch {}
    };
    window.addEventListener("brito_shift_cuts_updated", handleLocalCut);

    return () => {
      unsubSale();
      unsubOrder();
      unsubCashMovement();
      unsubShiftCut();
      if (unsubBranch) unsubBranch();
      window.removeEventListener("brito_shift_cuts_updated", handleLocalCut);
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
