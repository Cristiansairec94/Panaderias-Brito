"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { 
  TrendingUp, 
  PlusCircle, 
  Receipt, 
  Search, 
  Filter, 
  Wallet, 
  CreditCard, 
  Building, 
  ArrowUpRight, 
  DollarSign, 
  ShoppingBag, 
  Calendar, 
  Users, 
  Cake, 
  Trash2, 
  Printer, 
  CheckCircle2, 
  X, 
  Download, 
  Store, 
  Coins, 
  BellRing,
  Send,
  Building2,
  ChevronDown,
  BarChart3,
  Eye,
  RefreshCw,
  Sparkles,
  Wheat
} from "lucide-react";
import { CashIncome, CashIncomeCategory } from "@/types";
import { formatCurrency, onlyNumbersKeyDown, cleanDecimalNumbers } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useBranch } from "@/context/BranchContext";
import { useNotifications } from "@/context/NotificationContext";
import { createClient } from "@/lib/supabase/client";
import { 
  getStoredIncomes, 
  saveStoredIncomes, 
  syncMissingSalesToIncomes, 
  recordCashIncome, 
  cleanDuplicateIncomes,
  INITIAL_INCOMES 
} from "@/lib/incomes";
import { realtimeHub } from "@/lib/realtime/realtimeHub";
import IncomeReceiptModal from "@/components/ingresos/IncomeReceiptModal";

// ─── Helpers de Fecha ────────────────────────────────────────────────────────
const getLocalDateISO = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const TODAY_ISO = () => getLocalDateISO(new Date());

const parseIncomeDate = (rawDate?: string, rawTimestamp?: string): Date | null => {
  if (rawTimestamp) {
    const dt = new Date(rawTimestamp);
    if (!isNaN(dt.getTime())) return dt;
  }
  if (!rawDate) return null;
  const text = String(rawDate).trim();
  if (!text) return null;

  if (text.toLowerCase().includes("hoy")) {
    const dt = new Date();
    const match = text.match(/(\d{1,2}):(\d{2})(?:\s*([ap]\.?\s*m\.?|[AP]M))?/i);
    if (match) {
      let hours = parseInt(match[1], 10);
      const mins = parseInt(match[2], 10);
      const ampm = match[3]?.toLowerCase();
      if (ampm) {
        if ((ampm.includes("p") || ampm.includes("pm")) && hours < 12) hours += 12;
        if ((ampm.includes("a") || ampm.includes("am")) && hours === 12) hours = 0;
      }
      dt.setHours(hours, mins, 0, 0);
    }
    return dt;
  }

  if (text.toLowerCase().includes("ayer")) {
    const dt = new Date();
    dt.setDate(dt.getDate() - 1);
    return dt;
  }

  const mISO = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (mISO) {
    const dt = new Date(Number(mISO[1]), Number(mISO[2]) - 1, Number(mISO[3]), 12, 0, 0);
    return isNaN(dt.getTime()) ? null : dt;
  }

  const parsed = new Date(text);
  return isNaN(parsed.getTime()) ? null : parsed;
};

const getIncomeDateTimeInfo = (inc: Partial<CashIncome> | null | undefined) => {
  if (!inc) return { isHoy: false, isAyer: false, formattedDate: "-" };
  const todayStr = getLocalDateISO(new Date());
  const yest = new Date();
  yest.setDate(yest.getDate() - 1);
  const yesterdayStr = getLocalDateISO(yest);

  const rawDate = typeof inc.date === "string" ? inc.date : "";
  const timestampDateStr = inc.timestamp ? getLocalDateISO(new Date(inc.timestamp)) : "";

  const isHoy = Boolean(
    rawDate.toLowerCase().includes("hoy") ||
    (rawDate && rawDate.split("T")[0] === todayStr) ||
    (timestampDateStr && timestampDateStr === todayStr)
  );
  const isAyer = !isHoy && Boolean(
    rawDate.toLowerCase().includes("ayer") ||
    (rawDate && rawDate.split("T")[0] === yesterdayStr) ||
    (timestampDateStr && timestampDateStr === yesterdayStr)
  );

  let formattedDate = rawDate || "-";
  if (inc.timestamp && (!rawDate || rawDate.includes("-"))) {
    const dt = new Date(inc.timestamp);
    if (!isNaN(dt.getTime())) {
      const timeStr = dt.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
      if (isHoy) formattedDate = `Hoy, ${timeStr}`;
      else if (isAyer) formattedDate = `Ayer, ${timeStr}`;
      else formattedDate = `${dt.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" })}, ${timeStr}`;
    }
  }

  return { isHoy, isAyer, formattedDate };
};

const getIncomeTimestamp = (inc: Partial<CashIncome> | null | undefined): number => {
  if (!inc) return 0;
  if (inc.timestamp) {
    const t = new Date(inc.timestamp).getTime();
    if (!isNaN(t)) return t;
  }
  const d = parseIncomeDate(inc.date, inc.timestamp);
  return d ? d.getTime() : 0;
};

// ─── Componente Gráfico SVG: Símbolo de gráfica hacia arriba ────────────────
function IncomeUpwardChartSymbol({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Gráfica de ingresos en tendencia alcista"
    >
      <defs>
        <linearGradient id="incBarGrad1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id="incBarGrad2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6ee7b7" />
          <stop offset="100%" stopColor="#047857" stopOpacity="0.5" />
        </linearGradient>
        <linearGradient id="incBarGrad3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a7f3d0" />
          <stop offset="100%" stopColor="#065f46" stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id="incCoinGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>

      <line x1="3" y1="31" x2="33" y2="31" stroke="#047857" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="4" y="21" width="5" height="10" rx="1.5" fill="url(#incBarGrad1)" />
      <rect x="11.5" y="15" width="5" height="16" rx="1.5" fill="url(#incBarGrad2)" />
      <rect x="19" y="9" width="5" height="22" rx="1.5" fill="url(#incBarGrad3)" />

      <path
        d="M4 22 L 12 16 L 19.5 11 L 30 3.5"
        stroke="#ecfdf5"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M24 3.5 H 30 V 9.5"
        stroke="#ecfdf5"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="30" cy="3.5" r="2" fill="#ffffff" />
      <g transform="translate(21, 18)">
        <circle cx="6" cy="6" r="5.5" fill="url(#incCoinGrad)" stroke="#fef08a" strokeWidth="1" />
        <text
          x="6"
          y="8.8"
          textAnchor="middle"
          fill="#78350f"
          fontSize="7.5"
          fontWeight="900"
          fontFamily="system-ui, sans-serif"
        >
          $
        </text>
      </g>
    </svg>
  );
}

// ─── Catálogo de Categorías Especializado en Ingresos de Panadería ────────────
export interface IngresoCategoriaDef {
  id: CashIncomeCategory;
  label: string;
  shortLabel: string;
  icon: string;
  bg: string;
  text: string;
  border: string;
}

const CATEGORY_OPTIONS: IngresoCategoriaDef[] = [
  { id: "venta_mostrador", label: "Ventas de Mostrador (Panadería / POS)", shortLabel: "Ventas Mostrador", icon: "🥖", bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200" },
  { id: "abono_pedido", label: "Abono a Pedido Especial (Pasteles/Eventos)", shortLabel: "Abono a Pedido", icon: "🎂", bg: "bg-rose-50", text: "text-rose-800", border: "border-rose-200" },
  { id: "abono_cliente", label: "Cobro a Cliente Mayorista / Tiendita", shortLabel: "Cobro a Cliente", icon: "🏪", bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-200" },
  { id: "fondo_cambio", label: "Aportación de Cambio / Fondo Adicional", shortLabel: "Fondo de Cambio", icon: "🪙", bg: "bg-yellow-50", text: "text-yellow-800", border: "border-yellow-200" },
  { id: "venta_costales", label: "Venta de Costales de Harina / Reciclaje", shortLabel: "Venta de Costales", icon: "🌾", bg: "bg-orange-50", text: "text-orange-800", border: "border-orange-200" },
  { id: "ingreso_extraordinario", label: "Ingreso Extraordinario / Varios", shortLabel: "Ingreso Extra", icon: "✨", bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200" },
  { id: "otro", label: "Otro Concepto", shortLabel: "Otro Concepto", icon: "💵", bg: "bg-stone-50", text: "text-stone-700", border: "border-stone-200" },
];

const CUENTAS_DESTINO = [
  { id: "caja_mostrador", name: "Caja Mostrador (Efectivo Turno)", tipo: "EFECTIVO" },
  { id: "banco_bbva", name: "BBVA Bancomer (Don Toño)", tipo: "BANCO" },
  { id: "banco_santander", name: "Santander Negocio Brito", tipo: "BANCO" },
  { id: "caja_chica", name: "Caja Chica de Emergencias", tipo: "EFECTIVO" },
];

const QUICK_AMOUNTS = [50, 100, 200, 500, 1000];

/**
 * Muestra el concepto compacto con botón "ver más" / "ver menos" si supera la longitud
 */
function ExpandableConceptText({ text, maxChars = 38 }: { text: string; maxChars?: number }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!text) return null;

  const isLong = text.length > maxChars;

  if (!isLong) {
    return (
      <div className="font-bold text-stone-950 text-sm sm:text-base leading-snug" title={text}>
        {text}
      </div>
    );
  }

  const preview = text.slice(0, maxChars).trim() + "...";

  return (
    <div className="font-bold text-stone-950 text-sm sm:text-base leading-snug" title={text}>
      <span>{isExpanded ? text : preview}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsExpanded((prev) => !prev);
        }}
        className="inline-flex items-center text-[11px] font-black text-emerald-700 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/90 px-1.5 py-0.5 rounded-md ml-1.5 transition-colors cursor-pointer select-none"
        title={isExpanded ? "Mostrar menos texto" : "Mostrar texto completo"}
      >
        {isExpanded ? "ver menos" : "ver más"}
      </button>
    </div>
  );
}

export default function IngresosPage() {
  const { user } = useAuth();
  const { branches, currentBranch } = useBranch();
  const { addNotification } = useNotifications();

  // ── Estados de Datos ──
  const [incomes, setIncomes] = useState<CashIncome[]>([]);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mostrarStats, setMostrarStats] = useState(false);
  const [periodoStats, setPeriodoStats] = useState<"hoy" | "semana" | "mes">("hoy");

  // ── Filtros ──
  const [search, setSearch] = useState("");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedMethod, setSelectedMethod] = useState<string>("all");

  // ── Modales ──
  const [isNewIncomeModalOpen, setIsNewIncomeModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptIncome, setReceiptIncome] = useState<CashIncome | null>(null);
  const [selectedIncomeForView, setSelectedIncomeForView] = useState<CashIncome | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // ── Formulario de Nuevo Ingreso ──
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<CashIncomeCategory>("abono_pedido");
  const [paymentMethod, setPaymentMethod] = useState<"efectivo" | "tarjeta" | "transferencia">("efectivo");
  const [accountOrigin, setAccountOrigin] = useState("Caja Mostrador (Efectivo Turno)");
  const [concept, setConcept] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [branchName, setBranchName] = useState(currentBranch ? currentBranch.name : "Sucursal Matriz (Centro)");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Cargar Ingresos y Sincronizar en Tiempo Real ──
  const reloadIncomesFromStorage = useCallback(() => {
    try {
      syncMissingSalesToIncomes();
      const loaded = getStoredIncomes();
      setIncomes(loaded);
    } catch (e) {
      console.error("[Ingresos] Error reading stored incomes:", e);
      setIncomes(INITIAL_INCOMES);
    }
  }, []);

  useEffect(() => {
    reloadIncomesFromStorage();

    const handleLocalUpdate = () => {
      reloadIncomesFromStorage();
    };

    window.addEventListener("brito_incomes_updated", handleLocalUpdate);
    window.addEventListener("storage", handleLocalUpdate);

    const unsubSale = realtimeHub.onSale(() => {
      setTimeout(() => {
        reloadIncomesFromStorage();
      }, 100);
    });

    const unsubCash = realtimeHub.onCashMovement((mov) => {
      if (mov.type === "entrada") {
        setTimeout(() => {
          reloadIncomesFromStorage();
        }, 100);
      }
    });

    const unsubOrder = realtimeHub.onOrder(() => {
      setTimeout(() => {
        reloadIncomesFromStorage();
      }, 100);
    });

    return () => {
      window.removeEventListener("brito_incomes_updated", handleLocalUpdate);
      window.removeEventListener("storage", handleLocalUpdate);
      unsubSale();
      unsubCash();
      unsubOrder();
    };
  }, [reloadIncomesFromStorage]);

  // Actualizar sucursal por defecto si cambia en el contexto global
  useEffect(() => {
    if (currentBranch) {
      setBranchName(currentBranch.name);
    }
  }, [currentBranch]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleOutsideClick = () => setActiveDropdown(null);
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  // Guardar ingresos en LocalStorage
  const saveIncomes = (newIncomes: CashIncome[]) => {
    saveStoredIncomes(newIncomes);
    setIncomes(newIncomes);
  };

  // ─── Helpers de Categoría ──────────────────────────────────────────────────
  const getCategoryInfo = (catIdOrLabel?: string | null): IngresoCategoriaDef => {
    if (!catIdOrLabel) {
      return {
        id: "otro",
        label: "Otro Concepto",
        shortLabel: "Otro",
        icon: "💵",
        bg: "bg-stone-50",
        text: "text-stone-700",
        border: "border-stone-200",
      };
    }
    const catLower = String(catIdOrLabel).toLowerCase();
    const found = CATEGORY_OPTIONS.find(
      (c) => c.id === catIdOrLabel || c.label.toLowerCase() === catLower || c.shortLabel.toLowerCase() === catLower
    );
    return (
      found || {
        id: "otro",
        label: String(catIdOrLabel) || "Otro Ingreso",
        shortLabel: "Otro",
        icon: "💵",
        bg: "bg-stone-50",
        text: "text-stone-700",
        border: "border-stone-200",
      }
    );
  };

  // ─── Filtrado Principal y Ordenamiento Cronológico (Más reciente primero) ──
  const filteredIncomes = useMemo(() => {
    return (incomes || [])
      .filter((inc) => {
        if (!inc) return false;

        // 1. Filtro por Sucursal
        if (selectedBranch !== "all") {
          const incBranch = (inc.branchName || "").toLowerCase();
          const target = selectedBranch.toLowerCase();
          const match =
            inc.branchName === selectedBranch ||
            inc.branchId === selectedBranch ||
            (target.includes("matriz") && incBranch.includes("matriz")) ||
            (target.includes("benito") && incBranch.includes("benito")) ||
            (target.includes("mercado") && incBranch.includes("mercado")) ||
            (target.includes("flores") && incBranch.includes("flores")) ||
            (target.includes("norte") && incBranch.includes("norte"));
          if (!match) return false;
        }

        // 2. Filtro por Categoría
        if (selectedCategory !== "all" && inc.category !== selectedCategory && inc.categoryLabel !== selectedCategory) {
          return false;
        }

        // 3. Filtro por Método de Pago
        if (selectedMethod !== "all" && inc.paymentMethod !== selectedMethod) {
          return false;
        }

        // 4. Búsqueda libre
        if (search.trim()) {
          const query = search.toLowerCase();
          const haystack = `${inc.id || ""} ${inc.date || ""} ${inc.categoryLabel || ""} ${inc.branchName || ""} ${inc.concept || ""} ${inc.customerName || ""} ${inc.orderNumber || ""} ${inc.saleId || ""} ${inc.paymentMethod || ""} ${inc.referenceNumber || ""} ${inc.cashier || ""}`.toLowerCase();
          if (!haystack.includes(query)) return false;
        }

        return true;
      })
      .sort((a, b) => getIncomeTimestamp(b) - getIncomeTimestamp(a));
  }, [incomes, selectedBranch, selectedCategory, selectedMethod, search]);

  // ─── Cálculos de KPIs (Reactivos al filtro de sucursal) ─────────────────────
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const lunesSemana = (() => {
    const d = new Date(now);
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    d.setHours(0, 0, 0, 0);
    return d;
  })();

  const primerDiaMes = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

  // Considerar únicamente los ingresos de la sucursal activa en el filtro para los KPIs
  const incomesParaKPIs = useMemo(() => {
    if (selectedBranch === "all") return incomes;
    return incomes.filter((inc) => {
      const incBranch = (inc.branchName || "").toLowerCase();
      const target = selectedBranch.toLowerCase();
      return (
        inc.branchName === selectedBranch ||
        inc.branchId === selectedBranch ||
        (target.includes("matriz") && incBranch.includes("matriz")) ||
        (target.includes("benito") && incBranch.includes("benito")) ||
        (target.includes("mercado") && incBranch.includes("mercado")) ||
        (target.includes("flores") && incBranch.includes("flores")) ||
        (target.includes("norte") && incBranch.includes("norte"))
      );
    });
  }, [incomes, selectedBranch]);

  const { totalHoy, cantidadHoy } = useMemo(() => {
    return incomesParaKPIs.reduce(
      (acc, inc) => {
        const d = parseIncomeDate(inc.date, inc.timestamp);
        if (d && d >= todayStart && d <= todayEnd) {
          acc.totalHoy += Number(inc.amount || 0);
          acc.cantidadHoy += 1;
        } else if (!d && typeof inc.date === "string" && inc.date.toLowerCase().includes("hoy")) {
          acc.totalHoy += Number(inc.amount || 0);
          acc.cantidadHoy += 1;
        }
        return acc;
      },
      { totalHoy: 0, cantidadHoy: 0 }
    );
  }, [incomesParaKPIs, todayStart, todayEnd]);

  const totalSemana = useMemo(() => {
    return incomesParaKPIs.reduce((acc, inc) => {
      const d = parseIncomeDate(inc.date, inc.timestamp);
      if (d && d >= lunesSemana && d <= now) {
        acc += Number(inc.amount || 0);
      } else if (!d && typeof inc.date === "string" && inc.date.toLowerCase().includes("hoy")) {
        acc += Number(inc.amount || 0);
      }
      return acc;
    }, 0);
  }, [incomesParaKPIs, lunesSemana, now]);

  const totalMes = useMemo(() => {
    return incomesParaKPIs.reduce((acc, inc) => {
      const d = parseIncomeDate(inc.date, inc.timestamp);
      if (d && d >= primerDiaMes && d <= now) {
        acc += Number(inc.amount || 0);
      } else if (!d && typeof inc.date === "string" && inc.date.toLowerCase().includes("hoy")) {
        acc += Number(inc.amount || 0);
      }
      return acc;
    }, 0);
  }, [incomesParaKPIs, primerDiaMes, now]);

  // ─── Estadísticas y Distribución por Categoría (Estilo Sairec ERP) ──────────
  const statsData = useMemo(() => {
    const incomesPeriodo = incomesParaKPIs.filter((inc) => {
      const d = parseIncomeDate(inc.date, inc.timestamp);
      const isHoyDate = !d && typeof inc.date === "string" && inc.date.toLowerCase().includes("hoy");
      if (periodoStats === "hoy") {
        return (d && d >= todayStart && d <= todayEnd) || isHoyDate;
      } else if (periodoStats === "semana") {
        return (d && d >= lunesSemana && d <= now) || isHoyDate;
      } else if (periodoStats === "mes") {
        return (d && d >= primerDiaMes && d <= now) || isHoyDate;
      }
      return true;
    });

    const map: Record<string, { total: number; count: number; label: string; icon: string }> = {};
    let totalPeriodo = 0;
    let totalOps = 0;

    for (const inc of incomesPeriodo) {
      const cat = getCategoryInfo(inc.category);
      if (!map[cat.id]) {
        map[cat.id] = { total: 0, count: 0, label: cat.shortLabel || cat.label, icon: cat.icon };
      }
      map[cat.id].total += Number(inc.amount || 0);
      map[cat.id].count += 1;
      totalPeriodo += Number(inc.amount || 0);
      totalOps += 1;
    }

    const list = Object.entries(map)
      .map(([id, data]) => ({
        id,
        ...data,
        pct: totalPeriodo > 0 ? (data.total / totalPeriodo) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);

    return { list, totalPeriodo, totalOps };
  }, [incomesParaKPIs, periodoStats, todayStart, todayEnd, lunesSemana, primerDiaMes, now]);

  // ─── Manejo de Formularios y Acciones ───────────────────────────────────────
  const abrirNuevoIngreso = () => {
    setAmount("");
    setConcept("");
    setCustomerName("");
    setOrderNumber("");
    setReferenceNumber("");
    setCategory("abono_pedido");
    setPaymentMethod("efectivo");
    setAccountOrigin("Caja Mostrador (Efectivo Turno)");
    setBranchName(currentBranch ? currentBranch.name : "Sucursal Matriz (Centro)");
    setIsNewIncomeModalOpen(true);
  };

  const handleCrearIngreso = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0 || !concept.trim()) return;

    setIsSubmitting(true);
    const catObj = getCategoryInfo(category);

    const newIncome = recordCashIncome({
      amount: parsedAmount,
      category,
      categoryLabel: catObj ? catObj.label : "Ingreso",
      paymentMethod,
      concept: concept.trim(),
      customerName: customerName.trim() || undefined,
      orderNumber: orderNumber.trim() || undefined,
      referenceNumber: referenceNumber.trim() || undefined,
      cashier: user?.name || "Don Toño Brito",
      branchName,
    });

    try {
      const supabase = createClient();
      await supabase.from("cash_movements").insert({
        type: "entrada",
        category: newIncome.category,
        amount: newIncome.amount,
        reason: `${newIncome.categoryLabel}: ${newIncome.concept} (${newIncome.customerName || "General"}) [${newIncome.paymentMethod}]`,
        authorized_by: newIncome.cashier,
      });
    } catch (err) {
      console.log("Offline mode, saved locally", err);
    }

    if (realtimeHub.broadcastCashMovement) {
      realtimeHub.broadcastCashMovement({
        id: newIncome.id,
        branchId: branches.find((b) => b.name === newIncome.branchName)?.id || "branch-matriz",
        branchName: newIncome.branchName || "Matriz",
        type: "entrada",
        category: newIncome.category as any,
        categoryLabel: newIncome.categoryLabel,
        amount: newIncome.amount,
        reason: newIncome.concept,
        authorizedBy: newIncome.cashier,
        timestamp: new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
      });
    }

    addNotification({
      senderName: `Entrada de Caja (${newIncome.cashier})`,
      senderAvatar: "💰",
      badgeIcon: "dinero",
      title: `Ingreso Registrado: ${formatCurrency(newIncome.amount)}`,
      highlightText: newIncome.categoryLabel,
      description: `Concepto: "${newIncome.concept}". Sucursal: ${newIncome.branchName}. Método: ${newIncome.paymentMethod.toUpperCase()}.`,
      category: "caja",
      actionLabel: "Ver en Historial",
      actionLink: "/ingresos",
    });

    setIsSubmitting(false);
    setIsNewIncomeModalOpen(false);

    setReceiptIncome(newIncome);
    setIsReceiptModalOpen(true);
  };

  const handleDeleteIncome = (id: string) => {
    if (confirm("¿Estás seguro de eliminar este registro de ingreso?")) {
      const updated = incomes.filter((i) => i.id !== id);
      saveIncomes(updated);
    }
  };

  const handlePrintReceipt = (income: CashIncome) => {
    setReceiptIncome(income);
    setIsReceiptModalOpen(true);
  };

  const handlePurgeDuplicates = () => {
    const raw = getStoredIncomes();
    const cleaned = cleanDuplicateIncomes(raw);
    saveStoredIncomes(cleaned);
    setIncomes(cleaned);
  };

  const handleExportCSV = () => {
    if (filteredIncomes.length === 0) return;
    const headers = "Folio,Fecha,Sucursal,Categoria,Concepto,Cliente,Pedido,Metodo,Monto,Cajero\n";
    const rows = filteredIncomes
      .map(
        (i) =>
          `"${i.id || ""}","${i.date || ""}","${i.branchName || ""}","${i.categoryLabel || ""}","${(i.concept || "").replace(/"/g, '""')}","${i.customerName || ""}","${i.orderNumber || i.saleId || ""}","${i.paymentMethod || ""}",${i.amount || 0},"${i.cashier || ""}"`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `ingresos_panaderia_brito_${TODAY_ISO()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalFiltradoSuma = useMemo(() => {
    return filteredIncomes.reduce((sum, inc) => sum + inc.amount, 0);
  }, [filteredIncomes]);

  return (
    <div className="w-full space-y-5 sm:space-y-6">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-gradient-to-br from-emerald-600 to-emerald-800 text-white rounded-2xl shadow-md shadow-emerald-600/20">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black text-stone-900 tracking-tight">Registro de Ingresos</h2>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Tiempo Real Multi-Sucursal
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Control de ventas de mostrador, abonos a pedidos especiales, mayoreo y entradas de caja por sucursal.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setMostrarStats(!mostrarStats)}
            className={`flex items-center gap-1.5 font-bold px-3.5 py-2.5 rounded-xl border text-xs transition-all ${
              mostrarStats
                ? "bg-stone-900 text-white border-stone-900 shadow-sm"
                : "bg-white hover:bg-stone-50 text-stone-700 border-stone-200 shadow-sm"
            }`}
          >
            <BarChart3 className="w-4 h-4 text-emerald-600" />
            <span>{mostrarStats ? "Ocultar Análisis" : "Ver Estadísticas"}</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 bg-white hover:bg-stone-50 text-stone-700 font-bold px-3.5 py-2.5 rounded-xl border border-stone-200 shadow-sm text-xs transition-all"
            title="Exportar listado a archivo CSV Excel"
          >
            <Download className="w-4 h-4" /> Exportar
          </button>
          <Link
            href="/caja"
            className="flex items-center gap-1.5 bg-white hover:bg-stone-50 text-stone-700 font-extrabold px-3.5 py-2.5 rounded-xl border border-stone-200 shadow-sm text-xs transition-all"
          >
            <Wallet className="w-4 h-4 text-emerald-600" /> Ver Caja
          </Link>
          <button
            onClick={abrirNuevoIngreso}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-black px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-600/25 text-xs transition-all active:scale-95"
          >
            <PlusCircle className="w-4 h-4" /> Registrar Nuevo Ingreso
          </button>
        </div>
      </div>

      {/* ── Panel Colapsable de Estadísticas y Analítica ── */}
      {mostrarStats && (
        <div className="bg-white rounded-3xl border border-stone-200/80 p-6 shadow-sm space-y-6 animate-in fade-in slide-in-from-top-4 duration-300 transition-all duration-200 hover:border-emerald-400/80 hover:shadow-xl hover:shadow-emerald-500/10 hover:ring-2 hover:ring-emerald-400/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📊</span>
              <div>
                <h3 className="font-black text-base text-stone-900">
                  Estadísticas y Distribución de Ingresos
                </h3>
                <p className="text-xs text-stone-500">
                  Análisis por categoría en {selectedBranch === "all" ? "Todas las Sucursales" : selectedBranch}
                </p>
              </div>
            </div>

            {/* Selector de Período */}
            <div className="flex bg-stone-100 p-1 rounded-2xl gap-1 self-start sm:self-auto">
              {(["hoy", "semana", "mes"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriodoStats(p)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    periodoStats === p
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  {p === "hoy" ? "Hoy" : p === "semana" ? "Esta Semana" : "Este Mes"}
                </button>
              ))}
            </div>
          </div>

          {statsData.list.length === 0 ? (
            <div className="text-center py-10 text-stone-400">
              <Receipt className="w-10 h-10 mx-auto text-stone-300 mb-2" />
              <p className="font-bold text-sm text-stone-600">Sin ingresos registrados en este período</p>
              <p className="text-xs">Prueba seleccionando otro período o registra nuevas entradas.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Barras de distribución porcentual */}
              <div className="lg:col-span-7 space-y-3.5">
                <h4 className="text-xs font-black text-stone-500 uppercase tracking-wider">
                  Distribución Porcentual por Categoría
                </h4>
                <div className="space-y-3">
                  {statsData.list.map((item) => (
                    <div key={item.id} className="space-y-1">
                      <div className="flex justify-between items-center text-xs font-bold gap-2">
                        <span className="flex items-center gap-1.5 text-stone-800 shrink-0">
                          <span>{item.icon}</span>
                          <span>{item.label}</span>
                        </span>
                        <div className="flex items-center gap-2 font-mono text-stone-900 text-right flex-wrap justify-end">
                          <span>+{formatCurrency(item.total)}</span>
                          <span className="text-stone-400 font-normal">({item.pct.toFixed(1)}%)</span>
                          <span className="text-stone-600 font-bold text-[11px] bg-stone-100 px-2 py-0.5 rounded-lg border border-stone-200/80 font-sans">
                            Cant: {item.count} {item.count === 1 ? "movimiento" : "movimientos"}
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${item.pct}%` }}
                          className="h-full bg-gradient-to-r from-emerald-500 to-amber-500 rounded-full transition-all duration-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tarjeta Resumen Total del Período */}
              <div className="lg:col-span-5 h-fit">
                <div className="bg-gradient-to-br from-stone-900 to-stone-950 p-5 rounded-2xl text-white border border-stone-800 shadow-md flex items-center justify-between transition-all duration-200 hover:border-emerald-400 hover:shadow-xl hover:shadow-emerald-900/30 hover:ring-2 hover:ring-emerald-400/20">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider block">
                      Total del Período ({periodoStats.toUpperCase()})
                    </span>
                    <span className="text-2xl font-black text-white font-mono tracking-tight">
                      +{formatCurrency(statsData.totalPeriodo)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                      Transacciones
                    </span>
                    <span className="text-2xl font-black text-emerald-400 font-mono">
                      {statsData.totalOps}
                    </span>
                  </div>
                </div>

                {/* Acciones Rápidas Complementarias */}
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={handlePurgeDuplicates}
                    className="flex-1 py-2 px-3 bg-stone-50 hover:bg-stone-100 text-stone-700 font-bold text-xs rounded-xl border border-stone-200 transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                    title="Depurar duplicados accidentales"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Depurar Duplicados</span>
                  </button>
                  <Link
                    href="/pos"
                    className="flex-1 py-2 px-3 bg-stone-900 hover:bg-black text-white font-black text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
                    <span>Ir a Ventas POS</span>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── KPI Cards Grid (4 Tarjetas Gemelas) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Ingresos de Hoy */}
        <div className="bg-gradient-to-br from-emerald-900 via-emerald-950 to-stone-950 p-5 rounded-3xl border border-emerald-800/60 shadow-xl text-white transition-all duration-200 hover:border-emerald-400 hover:shadow-2xl hover:shadow-emerald-950/50 hover:ring-2 hover:ring-emerald-400/30 hover:-translate-y-0.5 cursor-default relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-200 uppercase tracking-wider">Ingresos de Hoy</span>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-600/40 text-emerald-200 rounded-xl border border-emerald-500/30 shadow-sm" title="Símbolo de ingresos: Gráfica en alza">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-300" />
              <span className="text-[10px] font-black uppercase tracking-wider">En alza</span>
            </div>
          </div>

          <div className="flex items-end justify-between gap-2 mt-1">
            <div>
              <p className="text-3xl font-black text-emerald-300 tracking-tight font-mono">
                {formatCurrency(totalHoy)}
              </p>
              <p className="text-[11px] text-emerald-200/80 font-medium mt-1">
                {cantidadHoy} ingreso{cantidadHoy !== 1 ? "s" : ""} registrado{cantidadHoy !== 1 ? "s" : ""} hoy
              </p>
            </div>

            {/* Símbolo de ingresos: Gráfica en ascenso */}
            <div className="shrink-0 pb-0.5" title="Símbolo de ingresos: Gráfica en alza">
              <IncomeUpwardChartSymbol className="w-20 sm:w-24 h-auto object-contain filter drop-shadow-[0_2px_8px_rgba(16,185,129,0.45)] transition-transform duration-200 hover:scale-105 select-none pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Ingresos de la Semana */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-sm transition-all duration-200 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/10 hover:ring-2 hover:ring-amber-400/20 hover:-translate-y-0.5 cursor-default">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500">Ingresos de la Semana</span>
            <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-stone-900 tracking-tight font-mono">
            {formatCurrency(totalSemana)}
          </p>
          <p className="text-[11px] text-stone-400 font-semibold mt-1">
            Lunes a Domingo en curso
          </p>
        </div>

        {/* Ingresos del Mes */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-sm transition-all duration-200 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/10 hover:ring-2 hover:ring-blue-400/20 hover:-translate-y-0.5 cursor-default">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500">Ingresos del Mes</span>
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-stone-900 tracking-tight font-mono">
            {formatCurrency(totalMes)}
          </p>
          <p className="text-[11px] text-stone-400 font-semibold mt-1">
            Acumulado mes en curso
          </p>
        </div>

        {/* Total Registros */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-sm transition-all duration-200 hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-500/10 hover:ring-2 hover:ring-emerald-400/20 hover:-translate-y-0.5 cursor-default">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500">Total Registros</span>
            <div className="p-2 bg-stone-100 text-stone-700 rounded-xl">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-stone-900 tracking-tight font-mono">
            {incomesParaKPIs.length}
          </p>
          <p className="text-[11px] text-stone-400 font-semibold mt-1">
            {selectedBranch === "all" ? "Todas las tiendas" : "Sucursal activa"}
          </p>
        </div>
      </div>

      {/* ── Filtros y Buscador Dinámico (Idéntico a Gastos) ── */}
      <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-sm space-y-4 transition-all duration-200 hover:border-emerald-400/80 hover:shadow-lg hover:shadow-emerald-500/10 hover:ring-2 hover:ring-emerald-400/20">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Buscador de Texto Libre */}
          <div className="relative flex-1 w-full">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Buscar por folio ING-XXXX, concepto, sucursal, cliente o cajero..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-stone-50 rounded-2xl border border-stone-200 text-sm sm:text-base font-semibold text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 text-sm font-black p-1"
              >
                ✕
              </button>
            )}
          </div>

          {/* Selectores de Filtro */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* ⭐ FILTRO POR SUCURSAL */}
            <div className="flex items-center gap-1.5 bg-amber-50/90 border-2 border-amber-300 px-3 py-1.5 rounded-2xl shadow-xs">
              <Building2 className="w-4 h-4 text-amber-800 shrink-0" />
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="bg-transparent py-1 px-1 text-sm sm:text-base font-black text-amber-950 focus:outline-none cursor-pointer"
              >
                <option value="all">🏪 Todas las Sucursales</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.name}>
                    📍 {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por Método de Pago */}
            <select
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
              className="bg-stone-50 px-3.5 py-2.5 rounded-2xl border-2 border-stone-200 text-sm sm:text-base font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-xs"
            >
              <option value="all">Todos los Métodos</option>
              <option value="efectivo">💵 Solo Efectivo</option>
              <option value="tarjeta">💳 Solo Tarjeta</option>
              <option value="transferencia">🏦 Solo Transferencia (SPEI)</option>
            </select>

            {/* Botón para limpiar filtros */}
            {(search || selectedBranch !== "all" || selectedMethod !== "all") && (
              <button
                onClick={() => {
                  setSearch("");
                  setSelectedBranch("all");
                  setSelectedCategory("all");
                  setSelectedMethod("all");
                }}
                className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-2 border-emerald-200 rounded-2xl text-sm font-black transition-colors shadow-xs"
              >
                ✕ Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Resumen de Resultados */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm sm:text-base text-stone-600 font-medium pt-2 border-t border-stone-100">
          <span className="flex items-center gap-1.5 flex-wrap">
            <span>Mostrando <strong className="text-stone-900 font-black">{filteredIncomes.length}</strong> de <strong className="text-stone-900 font-bold">{incomes.length}</strong> ingresos</span>
            {selectedBranch !== "all" && (
              <span className="bg-amber-100 text-amber-900 font-black px-2 py-0.5 rounded-lg text-xs sm:text-sm border border-amber-300">
                en {selectedBranch}
              </span>
            )}
          </span>
          <span className="font-mono text-stone-800 font-bold text-sm sm:text-base flex items-center gap-1.5">
            <span className="text-stone-500 font-semibold">Suma filtrada:</span>
            <span className="text-emerald-700 font-black text-base sm:text-lg bg-emerald-50 px-2.5 py-0.5 rounded-xl border border-emerald-200">
              +{formatCurrency(totalFiltradoSuma)}
            </span>
          </span>
        </div>
      </div>

      {/* ── Tabla de Historial Detallado de Ingresos (Diseño Gemelo) ── */}
      <div className="bg-white rounded-3xl border border-stone-200/80 shadow-sm overflow-hidden transition-all duration-200 hover:border-emerald-400/80 hover:shadow-lg hover:shadow-emerald-500/10 hover:ring-2 hover:ring-emerald-400/20">
        <div className="p-5 sm:p-6 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-2xl">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-xl sm:text-2xl text-stone-900">Historial Detallado de Ingresos</h3>
              <p className="text-xs sm:text-sm text-stone-500 font-medium mt-0.5">
                Todas las entradas de dinero (desde $1.00) de cualquier sucursal registradas en tiempo real • {filteredIncomes.length} registros
              </p>
            </div>
          </div>
          <span className="text-sm sm:text-base font-mono font-bold text-stone-700 bg-stone-100 px-4 py-2 rounded-xl border border-stone-200 self-start sm:self-auto">
            Total filtrado: <span className="text-emerald-700 font-black text-base sm:text-lg">+{formatCurrency(totalFiltradoSuma)}</span>
          </span>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead className="bg-stone-100/90 text-stone-700 font-black border-b border-stone-200 uppercase tracking-wider text-xs sm:text-sm select-none">
              <tr>
                <th className="py-4 px-4 align-middle">Folio</th>
                <th className="py-4 px-4 align-middle">Fecha</th>
                <th className="py-4 px-4 align-middle">Sucursal</th>
                <th className="py-4 px-4 align-middle">Categoría</th>
                <th className="py-4 px-4 align-middle min-w-[280px]">Concepto / Motivo</th>
                <th className="py-4 px-4 align-middle text-right">Monto</th>
                <th className="py-4 px-4 align-middle text-center">Forma de Pago</th>
                <th className="py-4 px-4 align-middle">Cuenta / Destino</th>
                <th className="py-4 px-4 align-middle">Cajero</th>
                <th className="py-4 px-4 align-middle text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-sm">
              {filteredIncomes.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-16 text-stone-400">
                    <Receipt className="w-12 h-12 mx-auto text-stone-300 mb-3" />
                    <p className="font-black text-base sm:text-lg text-stone-700">No se encontraron ingresos con los filtros aplicados</p>
                    <p className="text-sm text-stone-500 mt-1">Prueba cambiando la sucursal o los filtros de búsqueda.</p>
                  </td>
                </tr>
              ) : (
                filteredIncomes.map((inc) => {
                  const catInfo = getCategoryInfo(inc.category);
                  const { isHoy, formattedDate } = getIncomeDateTimeInfo(inc);

                  return (
                    <tr
                      key={inc.id}
                      className={`transition-colors min-h-16 ${
                        isHoy
                          ? "border-l-4 border-l-emerald-500 bg-emerald-50/40 hover:bg-emerald-100/50 shadow-xs"
                          : "border-l-4 border-l-transparent hover:bg-stone-50/70"
                      }`}
                    >
                      {/* 1. Folio */}
                      <td className="py-3.5 px-4 align-middle font-mono font-black text-sm sm:text-base text-stone-900 whitespace-nowrap">
                        #{inc.id}
                      </td>

                      {/* 2. Fecha */}
                      <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                        <span className={`font-bold text-xs sm:text-sm ${isHoy ? "text-stone-950 font-black" : "text-stone-700"}`}>
                          {formattedDate}
                        </span>
                        {isHoy && (
                          <span className="ml-1.5 bg-emerald-500 text-white font-black text-xs px-2 py-0.5 rounded-md uppercase tracking-wider shadow-xs inline-flex items-center justify-center">
                            Hoy
                          </span>
                        )}
                      </td>

                      {/* 3. Sucursal */}
                      <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-stone-800 bg-stone-100 px-3 py-1.5 rounded-xl border border-stone-200/80">
                          <Store className="w-4 h-4 text-emerald-600" />
                          <span>{(inc.branchName || "Matriz (Centro)").replace("Sucursal ", "")}</span>
                        </span>
                      </td>

                      {/* 4. Categoría */}
                      <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                        <span
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs sm:text-sm inline-flex items-center gap-1.5 border ${catInfo.bg} ${catInfo.text} ${catInfo.border}`}
                        >
                          <span className="text-sm">{catInfo.icon}</span>
                          <span>{inc.categoryLabel || catInfo.label}</span>
                        </span>
                      </td>

                      {/* 5. Concepto / Motivo */}
                      <td className="py-3.5 px-4 align-middle max-w-sm">
                        <ExpandableConceptText text={inc.concept} maxChars={38} />
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {inc.customerName && (
                            <span className="text-xs text-stone-600 font-medium">
                              Cliente: <strong className="text-stone-800 font-semibold">{inc.customerName}</strong>
                            </span>
                          )}
                          {inc.orderNumber && (
                            <span className="text-[11px] font-black text-rose-800 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                              Pedido: #{inc.orderNumber}
                            </span>
                          )}
                          {inc.saleId && (
                            <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                              Ticket: #{inc.saleId}
                            </span>
                          )}
                          {inc.referenceNumber && (
                            <span className="text-[11px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                              Ref: {inc.referenceNumber}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 6. Monto */}
                      <td className="py-3.5 px-4 align-middle text-right font-mono font-black text-base sm:text-lg whitespace-nowrap text-emerald-700">
                        +{formatCurrency(inc.amount)}
                      </td>

                      {/* 7. Forma de Pago */}
                      <td className="py-3.5 px-4 align-middle text-center whitespace-nowrap">
                        <span
                          className={`px-3 py-1.5 rounded-xl font-black text-xs sm:text-sm uppercase inline-flex items-center gap-1.5 border ${
                            inc.paymentMethod === "efectivo"
                              ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                              : inc.paymentMethod === "tarjeta"
                              ? "bg-blue-100 text-blue-800 border-blue-200"
                              : "bg-purple-100 text-purple-800 border-purple-200"
                          }`}
                        >
                          {inc.paymentMethod === "efectivo" && <Wallet className="w-4 h-4" />}
                          {inc.paymentMethod === "tarjeta" && <CreditCard className="w-4 h-4" />}
                          {inc.paymentMethod === "transferencia" && <Building className="w-4 h-4" />}
                          <span>{inc.paymentMethod}</span>
                        </span>
                      </td>

                      {/* 8. Cuenta / Destino */}
                      <td className="py-3.5 px-4 align-middle text-stone-800 font-bold whitespace-nowrap text-xs sm:text-sm max-w-[160px] truncate" title={inc.paymentMethod === "efectivo" ? "Caja Mostrador (Efectivo Turno)" : "Banco / SPEI"}>
                        {inc.paymentMethod === "efectivo" ? "Caja Mostrador" : "Santander / SPEI"}
                      </td>

                      {/* 9. Cajero */}
                      <td className="py-3.5 px-4 align-middle text-stone-800 font-black whitespace-nowrap text-xs sm:text-sm">
                        {inc.cashier}
                      </td>

                      {/* 10. Acciones */}
                      <td className="py-3.5 px-4 align-middle text-center whitespace-nowrap relative">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handlePrintReceipt(inc)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer group"
                            title="Imprimir Comprobante de Ingreso (80mm)"
                          >
                            <Printer className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            <span className="hidden sm:inline">Ticket</span>
                          </button>

                          <div className="inline-block text-left">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdown(activeDropdown === inc.id ? null : inc.id);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-2 bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-800 font-bold rounded-xl text-xs sm:text-sm transition-colors cursor-pointer"
                            >
                              <span>Acciones</span>
                              <ChevronDown className="w-3.5 h-3.5 text-stone-500" />
                            </button>

                            {activeDropdown === inc.id && (
                              <div className="absolute right-0 mt-1 w-52 bg-white rounded-2xl shadow-xl border border-stone-200 py-1.5 z-30 animate-in fade-in zoom-in-95 text-xs sm:text-sm text-left font-bold">
                                {/* Ver Detalle */}
                                <button
                                  onClick={() => {
                                    setSelectedIncomeForView(inc);
                                    setIsViewModalOpen(true);
                                    setActiveDropdown(null);
                                  }}
                                  className="w-full px-3.5 py-2.5 text-stone-700 hover:bg-stone-50 flex items-center gap-2.5 cursor-pointer"
                                >
                                  <Eye className="w-4 h-4 text-blue-600" />
                                  <span>Ver Detalle</span>
                                </button>

                                {/* Imprimir Ticket */}
                                <button
                                  onClick={() => {
                                    handlePrintReceipt(inc);
                                    setActiveDropdown(null);
                                  }}
                                  className="w-full px-3.5 py-2.5 text-stone-700 hover:bg-stone-50 flex items-center gap-2.5 cursor-pointer"
                                >
                                  <Printer className="w-4 h-4 text-emerald-600" />
                                  <span>Imprimir Comprobante (80mm)</span>
                                </button>

                                {/* Eliminar */}
                                <button
                                  onClick={() => {
                                    handleDeleteIncome(inc.id);
                                    setActiveDropdown(null);
                                  }}
                                  className="w-full px-3.5 py-2.5 text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 border-t border-stone-100 cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4 text-rose-600" />
                                  <span>Eliminar Ingreso</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal: Registrar Nuevo Ingreso (Gemelo al de Gastos) ── */}
      {isNewIncomeModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-4 border border-stone-100 animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto transition-all duration-200 hover:border-emerald-400/60 hover:ring-2 hover:ring-emerald-400/20">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-stone-900">Registrar Entrada de Dinero / Ingreso</h3>
                  <p className="text-[11px] text-stone-500">Ventas en mostrador, abonos a pedidos especiales, mayoreo o aportaciones.</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewIncomeModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCrearIngreso} className="space-y-4 text-xs">
              {/* 1. Monto Principal */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-black text-stone-900 text-xs">
                    Monto Recibido ($ MXN) *
                  </label>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Acepta desde $1.00 MXN sin tope
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-2xl text-emerald-600">$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    autoFocus
                    placeholder="0.00"
                    value={amount}
                    onKeyDown={(e) => onlyNumbersKeyDown(e, true)}
                    onChange={(e) => setAmount(cleanDecimalNumbers(e.target.value))}
                    className="w-full pl-10 pr-4 py-3 bg-stone-50 rounded-2xl border-2 border-stone-200 focus:border-emerald-500 focus:bg-white focus:outline-none text-2xl font-black text-stone-900 shadow-inner"
                  />
                </div>

                {/* Nominaciones rápidas en cuadros */}
                <div className="grid grid-cols-5 gap-2 pt-1.5">
                  {QUICK_AMOUNTS.map((amt) => {
                    const isSelected = amount === amt.toString();
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setAmount(amt.toString())}
                        className={`py-3 sm:py-3.5 rounded-2xl border-2 font-black text-sm sm:text-base transition-all active:scale-95 shadow-xs cursor-pointer flex items-center justify-center ${
                          isSelected
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-md scale-102 ring-2 ring-emerald-400/30"
                            : "bg-white hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 text-stone-900 border-stone-200"
                        }`}
                      >
                        ${amt >= 1000 ? amt.toLocaleString("es-MX") : amt}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Sucursal y Categoría */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-black text-stone-900">Sucursal que Ingresa *</label>
                  <select
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold text-xs text-stone-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-black text-stone-900">Categoría del Ingreso *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as CashIncomeCategory)}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold text-xs text-stone-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3. Forma de Pago y Cuenta de Destino */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-black text-stone-900">Forma de Pago *</label>
                  <div className="grid grid-cols-3 gap-1">
                    {(["efectivo", "tarjeta", "transferencia"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPaymentMethod(m)}
                        className={`py-2 rounded-xl font-bold text-[11px] border transition-all text-center cursor-pointer ${
                          paymentMethod === m
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                            : "bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100"
                        }`}
                      >
                        {m === "efectivo" ? "💵 Efvo" : m === "tarjeta" ? "💳 Tarj" : "🏦 SPEI"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-black text-stone-900">Caja / Cuenta Destino *</label>
                  <select
                    value={accountOrigin}
                    onChange={(e) => setAccountOrigin(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold text-xs text-stone-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                  >
                    {CUENTAS_DESTINO.map((acc) => (
                      <option key={acc.id} value={acc.name}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 4. Cliente y Folio de Pedido */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-stone-700">Cliente / Negocio (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej. Abarrotes Don Pepe o Sra. Carmen"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-xs font-medium text-stone-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-stone-700">Folio de Pedido / Ref. SPEI</label>
                  <input
                    type="text"
                    placeholder="Ej. PED-101 o SPEI-883921"
                    value={orderNumber || referenceNumber}
                    onChange={(e) => {
                      setOrderNumber(e.target.value);
                      setReferenceNumber(e.target.value);
                    }}
                    className="w-full p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-xs font-mono font-bold text-stone-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* 5. Detalle del Movimiento */}
              <div className="space-y-1">
                <label className="font-black text-stone-900">Concepto / Detalle *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Ej. Anticipo para pastel 3 leches de cumpleaños de XV años..."
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  className="w-full p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs font-medium text-stone-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none leading-relaxed"
                />
              </div>

              {/* Botones de Acción */}
              <div className="flex gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsNewIncomeModalOpen(false)}
                  className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !amount || Number(amount) <= 0 || !concept.trim()}
                  className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-black rounded-xl shadow-lg shadow-emerald-600/25 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? "Guardando..." : `Guardar Ingreso ${amount ? `(${formatCurrency(Number(amount))})` : ""}`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Ver Detalle de Ingreso (Gemelo al de Gastos) ── */}
      {isViewModalOpen && selectedIncomeForView && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-stone-100 animate-in fade-in zoom-in-95 transition-all duration-200 hover:border-emerald-400/60 hover:ring-2 hover:ring-emerald-400/20">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-stone-900">Detalle de Ingreso #{selectedIncomeForView.id}</h3>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Activo en Contabilidad
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-stone-500">Monto:</span>
                  <span className="font-black text-xl text-emerald-700 font-mono">
                    +{formatCurrency(selectedIncomeForView.amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Sucursal:</span>
                  <span className="font-bold text-stone-900">{selectedIncomeForView.branchName || "Matriz"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Categoría:</span>
                  <span className="font-bold text-stone-900">{selectedIncomeForView.categoryLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Método de Pago:</span>
                  <span className="font-bold text-stone-900 uppercase">{selectedIncomeForView.paymentMethod}</span>
                </div>
                {selectedIncomeForView.customerName && (
                  <div className="flex justify-between">
                    <span className="text-stone-500">Cliente:</span>
                    <span className="font-bold text-stone-900">{selectedIncomeForView.customerName}</span>
                  </div>
                )}
                {selectedIncomeForView.orderNumber && (
                  <div className="flex justify-between">
                    <span className="text-stone-500">Folio Pedido:</span>
                    <span className="font-mono font-bold text-rose-700">#{selectedIncomeForView.orderNumber}</span>
                  </div>
                )}
                {selectedIncomeForView.saleId && (
                  <div className="flex justify-between">
                    <span className="text-stone-500">Ticket Venta POS:</span>
                    <span className="font-mono font-bold text-amber-700">#{selectedIncomeForView.saleId}</span>
                  </div>
                )}
                {selectedIncomeForView.referenceNumber && (
                  <div className="flex justify-between">
                    <span className="text-stone-500">Referencia SPEI:</span>
                    <span className="font-mono font-bold text-blue-700">{selectedIncomeForView.referenceNumber}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-stone-500">Cajero:</span>
                  <span className="font-bold text-stone-900">{selectedIncomeForView.cashier}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Fecha / Hora:</span>
                  <span className="font-bold text-stone-900">{selectedIncomeForView.date}</span>
                </div>
              </div>

              <div>
                <span className="text-stone-500 block mb-1">Concepto / Motivo:</span>
                <p className="bg-stone-50 p-3 rounded-xl border border-stone-200 font-bold text-stone-900 text-xs leading-relaxed">
                  {selectedIncomeForView.concept}
                </p>
              </div>

              <div className="flex gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => {
                    handlePrintReceipt(selectedIncomeForView);
                    setIsViewModalOpen(false);
                  }}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl flex items-center justify-center gap-1.5 transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Vale</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsViewModalOpen(false)}
                  className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Comprobante Térmico de Ingreso ── */}
      <IncomeReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        income={receiptIncome}
      />
    </div>
  );
}
