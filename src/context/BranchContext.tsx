"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Branch, BranchShift } from "@/types";

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
    status: "abierta",
    dailyGoal: 10000,
    todaySales: 5480,
    todayTickets: 46,
    cashInDrawer: 5120,
    color: "orange",
    currentShift: {
      id: "shift-mat-101",
      name: "Turno Matutino (06:00 - 14:00)",
      cashier: "Lupita Brito",
      openedAt: "06:00 AM",
      initialFund: 1000,
      cashSales: 4120,
      cardSales: 980,
      transferSales: 380,
      totalSales: 5480,
      ticketCount: 46,
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
    status: "abierta",
    dailyGoal: 8000,
    todaySales: 4120,
    todayTickets: 38,
    cashInDrawer: 4150,
    color: "rose",
    currentShift: {
      id: "shift-ben-201",
      name: "Turno Matutino (06:30 - 14:30)",
      cashier: "Carlos Mendoza",
      openedAt: "06:30 AM",
      initialFund: 800,
      cashSales: 3350,
      cardSales: 520,
      transferSales: 250,
      totalSales: 4120,
      ticketCount: 38,
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
    status: "abierta",
    dailyGoal: 9500,
    todaySales: 4890,
    todayTickets: 34,
    cashInDrawer: 4560,
    color: "amber",
    currentShift: {
      id: "shift-flo-301",
      name: "Turno Matutino (07:00 - 15:00)",
      cashier: "Sofía Morales",
      openedAt: "07:00 AM",
      initialFund: 1200,
      cashSales: 3360,
      cardSales: 1180,
      transferSales: 350,
      totalSales: 4890,
      ticketCount: 34,
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

interface BranchContextType {
  branches: Branch[];
  currentBranch: Branch | null; // null = Todas / Consolidado
  isAllBranches: boolean;
  switchBranch: (branchId: string | "all") => void;
  simulateSale: (targetBranchId?: string, customAmount?: number) => SimulatedSale;
  simulateBulkSales: (targetBranchId?: string, count?: number) => void;
  advanceShift: (branchId: string) => void;
  isLiveSimulating: boolean;
  toggleLiveSimulation: () => void;
  recentSimulatedSales: SimulatedSale[];
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
  const [branches, setBranches] = useState<Branch[]>(DEFAULT_BRANCHES);
  const [currentBranchId, setCurrentBranchId] = useState<string>("branch-matriz");
  const [isLiveSimulating, setIsLiveSimulating] = useState(false);
  const [recentSimulatedSales, setRecentSimulatedSales] = useState<SimulatedSale[]>([]);

  // Load state from localStorage
  useEffect(() => {
    try {
      const savedBranches = localStorage.getItem("brito_branches_data");
      if (savedBranches) {
        setBranches(JSON.parse(savedBranches));
      }
      const savedCurrent = localStorage.getItem("brito_current_branch_id");
      if (savedCurrent) {
        setCurrentBranchId(savedCurrent);
      }
      const savedSales = localStorage.getItem("brito_simulated_sales");
      if (savedSales) {
        setRecentSimulatedSales(JSON.parse(savedSales));
      }
    } catch {
      // Ignore localStorage error
    }
  }, []);

  // Save branches changes
  const persistBranches = (updated: Branch[]) => {
    setBranches(updated);
    try {
      localStorage.setItem("brito_branches_data", JSON.stringify(updated));
    } catch {
      // Ignore
    }
  };

  const switchBranch = (branchId: string | "all") => {
    setCurrentBranchId(branchId);
    try {
      localStorage.setItem("brito_current_branch_id", branchId);
    } catch {
      // Ignore
    }
  };

  const currentBranch = currentBranchId === "all" 
    ? null 
    : branches.find((b) => b.id === currentBranchId) || branches[0];

  const isAllBranches = currentBranchId === "all";

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

        return {
          ...b,
          todaySales: b.todaySales + saleTotal,
          todayTickets: b.todayTickets + 1,
          cashInDrawer: b.cashInDrawer + (isCash ? saleTotal : 0),
          currentShift: updatedShift,
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

  // Live simulation ticker (one sale every 8 seconds across random branches)
  useEffect(() => {
    if (!isLiveSimulating) return;

    const interval = setInterval(() => {
      // Pick a random branch
      const randomBranch = branches[Math.floor(Math.random() * branches.length)];
      simulateSale(randomBranch.id);
    }, 8000);

    return () => clearInterval(interval);
  }, [isLiveSimulating, branches, simulateSale]);

  const toggleLiveSimulation = () => {
    setIsLiveSimulating((prev) => !prev);
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
        simulateSale,
        simulateBulkSales,
        advanceShift,
        isLiveSimulating,
        toggleLiveSimulation,
        recentSimulatedSales,
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
