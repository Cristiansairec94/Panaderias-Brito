"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { 
  TrendingDown, 
  PlusCircle, 
  Receipt, 
  Search, 
  Filter, 
  Wallet, 
  CreditCard, 
  Building, 
  ArrowDownRight, 
  DollarSign, 
  ShoppingBag, 
  Calendar, 
  Users, 
  Trash2, 
  Printer, 
  CheckCircle2, 
  X, 
  Download, 
  Store, 
  Coins, 
  BellRing,
  Send,
  Edit3,
  Eye,
  AlertTriangle,
  Ban,
  Building2,
  ChevronDown,
  Table,
  LayoutGrid,
  BarChart3,
  Flame,
  Wheat,
  Truck,
  FileText,
  HelpCircle
} from "lucide-react";
import { ExpenseRecord } from "@/types";
import { formatCurrency, onlyNumbersKeyDown, cleanDecimalNumbers } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useBranch } from "@/context/BranchContext";
import { useNotifications } from "@/context/NotificationContext";
import { createClient } from "@/lib/supabase/client";
import { realtimeHub } from "@/lib/realtime/realtimeHub";
import { saveStoredExpenses, recordCashOutflowAsExpense } from "@/lib/expenses";
import ExpenseReceiptModal from "@/components/gastos/ExpenseReceiptModal";

// ─── Helpers de Fecha ────────────────────────────────────────────────────────
const getLocalDateISO = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const TODAY_ISO = () => getLocalDateISO(new Date());

const getPastDateISO = (daysAgo: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return getLocalDateISO(d);
};

const parseExpenseDate = (raw: string | Date | undefined | null): Date | null => {
  if (!raw) return null;
  if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;

  const text = String(raw).trim();
  if (!text) return null;

  if (text.toLowerCase().includes("hoy")) {
    return new Date();
  }
  if (text.toLowerCase().includes("ayer")) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d;
  }

  const mISO = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (mISO) {
    const dt = new Date(Number(mISO[1]), Number(mISO[2]) - 1, Number(mISO[3]), 12, 0, 0);
    return isNaN(dt.getTime()) ? null : dt;
  }
  const mDMY = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (mDMY) {
    const dt = new Date(Number(mDMY[3]), Number(mDMY[2]) - 1, Number(mDMY[1]), 12, 0, 0);
    return isNaN(dt.getTime()) ? null : dt;
  }
  const parsed = new Date(text);
  return isNaN(parsed.getTime()) ? null : parsed;
};

const formatExpenseDisplayDate = (raw: string | undefined | null): string => {
  const d = parseExpenseDate(raw);
  if (!d) return (raw && String(raw)) || "-";
  return d.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const getExpenseTimestamp = (g: Partial<ExpenseRecord> | null | undefined): number => {
  if (!g) return 0;
  if (g.timestamp) {
    const t = new Date(g.timestamp).getTime();
    if (!isNaN(t)) return t;
  }
  const d = parseExpenseDate(g.date);
  if (d) {
    if (typeof g.displayDate === "string") {
      const match = g.displayDate.match(/(\d{1,2}):(\d{2})(?:\s*([ap]\.?\s*m\.?|[AP]M))?/i);
      if (match) {
        let hours = parseInt(match[1], 10);
        const mins = parseInt(match[2], 10);
        const ampm = match[3]?.toLowerCase();
        if (ampm) {
          if ((ampm.includes("p") || ampm.includes("pm")) && hours < 12) hours += 12;
          if ((ampm.includes("a") || ampm.includes("am")) && hours === 12) hours = 0;
        }
        d.setHours(hours, mins, 0, 0);
      }
    }
    return d.getTime();
  }
  return 0;
};

const getExpenseDateTimeInfo = (g: { date?: string; timestamp?: string; displayDate?: string } | null | undefined) => {
  if (!g) return { isHoy: false, isAyer: false, formattedDate: "-", timeStr: "", cleanDate: "-" };
  const todayStr = getLocalDateISO(new Date());
  const yest = new Date();
  yest.setDate(yest.getDate() - 1);
  const yesterdayStr = getLocalDateISO(yest);

  const rawDate = typeof g.date === "string" ? g.date.split("T")[0] : "";
  const timestampDateStr = g.timestamp ? getLocalDateISO(new Date(g.timestamp)) : "";
  const isHoy = Boolean((rawDate && rawDate === todayStr) || (timestampDateStr && timestampDateStr === todayStr));
  const isAyer = !isHoy && Boolean((rawDate && rawDate === yesterdayStr) || (timestampDateStr && timestampDateStr === yesterdayStr));

  let timeStr = "";
  if (g.timestamp) {
    const dt = new Date(g.timestamp);
    if (!isNaN(dt.getTime())) {
      timeStr = dt.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
    }
  }
  if (!timeStr && typeof g.displayDate === "string") {
    const match = g.displayDate.match(/(\d{1,2}:\d{2}(?:\s*(?:[ap]\.?\s*m\.?|[AP]M))?)/i);
    if (match) {
      timeStr = match[1];
    }
  }

  let formattedDate = "";
  let cleanDate = "";
  if (isHoy) {
    formattedDate = timeStr ? `Hoy, ${timeStr}` : "Hoy";
    cleanDate = "Hoy";
  } else if (isAyer) {
    formattedDate = timeStr ? `Ayer, ${timeStr}` : "Ayer";
    cleanDate = "Ayer";
  } else if (rawDate) {
    const parts = rawDate.split("-");
    if (parts.length === 3) {
      cleanDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
      formattedDate = timeStr ? `${cleanDate}, ${timeStr}` : cleanDate;
    } else {
      cleanDate = rawDate;
      formattedDate = rawDate;
    }
  } else {
    formattedDate = g.displayDate || "-";
    cleanDate = g.displayDate || "-";
  }

  return { isHoy, isAyer, formattedDate, timeStr, cleanDate };
};

// ─── Catálogo de Categorías Especializado en Panadería ──────────────────────
export interface GastoCategoriaDef {
  id: string;
  label: string;
  shortLabel?: string;
  icon: string;
  bg: string;
  text: string;
  border: string;
}

const GASTO_CATEGORIAS: GastoCategoriaDef[] = [
  { id: "insumos", label: "Materia Prima & Harinas", shortLabel: "Insumos", icon: "🥖", bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200" },
  { id: "gas_lp", label: "Gas LP para Hornos", shortLabel: "Gas LP", icon: "🔥", bg: "bg-orange-50", text: "text-orange-800", border: "border-orange-200" },
  { id: "nomina", label: "Sueldos & Nómina", shortLabel: "Nómina", icon: "💼", bg: "bg-purple-50", text: "text-purple-800", border: "border-purple-200" },
  { id: "servicios", label: "Luz, Agua e Internet", shortLabel: "Servicios", icon: "⚡", bg: "bg-cyan-50", text: "text-cyan-800", border: "border-cyan-200" },
  { id: "empaques", label: "Bolsas Kraft & Empaques", shortLabel: "Empaques", icon: "📦", bg: "bg-stone-100", text: "text-stone-800", border: "border-stone-200" },
  { id: "mantenimiento", label: "Mantenimiento & Refacciones", shortLabel: "Mantenimiento", icon: "🛠️", bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-200" },
  { id: "gasolina", label: "Gasolina & Repartos", shortLabel: "Gasolina", icon: "⛽", bg: "bg-yellow-50", text: "text-yellow-800", border: "border-yellow-200" },
  { id: "proveedores", label: "Pago a Proveedores", shortLabel: "Proveedores", icon: "🤝", bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200" },
  { id: "retiro_dueno", label: "Retiro Don Toño / Socios", shortLabel: "Don Toño", icon: "🪙", bg: "bg-rose-50", text: "text-rose-800", border: "border-rose-200" },
  { id: "otros", label: "Gastos Menores / Varios", shortLabel: "Varios", icon: "🧾", bg: "bg-stone-50", text: "text-stone-700", border: "border-stone-200" },
];

const CUENTAS_ORIGEN = [
  { id: "caja_mostrador", name: "Caja Mostrador (Efectivo Turno)", tipo: "EFECTIVO" },
  { id: "caja_chica", name: "Caja Chica de Emergencias", tipo: "EFECTIVO" },
  { id: "banco_bbva", name: "BBVA Bancomer (Don Toño)", tipo: "BANCO" },
  { id: "banco_santander", name: "Santander Negocio Brito", tipo: "BANCO" },
];

const QUICK_AMOUNTS = [50, 100, 200, 500, 1000];

// ─── Datos Demo Iniciales Multicurcursal ────────────────────────────────────
const INITIAL_GASTOS: ExpenseRecord[] = [
  {
    id: "GST-001001",
    date: getPastDateISO(3),
    displayDate: `${getPastDateISO(3).split("-").reverse().join("/")}, 07:30 AM`,
    category: "gas_lp",
    categoryLabel: "Gas LP para Hornos",
    branchId: "branch-matriz",
    branchName: "Sucursal Matriz (Centro)",
    description: "Carga de 300L de gas LP para los hornos de gaveta y rotativo principal",
    amount: 3850,
    paymentMethod: "transferencia",
    accountOrigin: "BBVA Bancomer (Don Toño)",
    supplier: "Gas Silza de México",
    cashier: "Don Toño Brito",
    status: "activo",
    notes: "Factura Folio A-8891 recibida en oficina",
    timestamp: new Date(Date.now() - 259200000).toISOString(),
  },
  {
    id: "GST-001002",
    date: getPastDateISO(3),
    displayDate: `${getPastDateISO(3).split("-").reverse().join("/")}, 09:15 AM`,
    category: "insumos",
    categoryLabel: "Materia Prima & Harinas",
    branchId: "branch-matriz",
    branchName: "Sucursal Matriz (Centro)",
    description: "Compra urgente de 2 cajas de manteca vegetal y 4 bloques de levadura fresca",
    amount: 680,
    paymentMethod: "efectivo",
    accountOrigin: "Caja Mostrador (Efectivo Turno)",
    supplier: "Materias Primas El Molino",
    cashier: "Lupita Brito",
    status: "activo",
    notes: "Ticket de compra adjunto en cajón",
    timestamp: new Date(Date.now() - 259200000).toISOString(),
  },
  {
    id: "GST-001003",
    date: getPastDateISO(2),
    displayDate: `${getPastDateISO(2).split("-").reverse().join("/")}, 10:45 AM`,
    category: "empaques",
    categoryLabel: "Bolsas Kraft & Empaques",
    branchId: "branch-sanjuan",
    branchName: "Sucursal San Juan",
    description: "10 paquetes de bolsas de papel kraft #6 y 5 millares de servilletas para mostrador",
    amount: 450,
    paymentMethod: "efectivo",
    accountOrigin: "Caja Mostrador (Efectivo Turno)",
    supplier: "Papelera San Juan",
    cashier: "Cajero San Juan",
    status: "activo",
    timestamp: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: "GST-001004",
    date: getPastDateISO(2),
    displayDate: `${getPastDateISO(2).split("-").reverse().join("/")}, 11:20 AM`,
    category: "gasolina",
    categoryLabel: "Gasolina & Repartos",
    branchId: "branch-matriz",
    branchName: "Sucursal Matriz (Centro)",
    description: "Gasolina Magna para camioneta de reparto matutino de bolillos a tienditas",
    amount: 500,
    paymentMethod: "efectivo",
    accountOrigin: "Caja Chica de Emergencias",
    supplier: "Gasolinera Pemex Centro",
    cashier: "Don Toño Brito",
    status: "activo",
    notes: "Odómetro: 142,580 km",
    timestamp: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: "GST-001005",
    date: getPastDateISO(1),
    displayDate: "Ayer, 12:30 PM",
    category: "mantenimiento",
    categoryLabel: "Mantenimiento & Refacciones",
    branchId: "branch-flores",
    branchName: "Sucursal Las Flores (Plaza)",
    description: "Ajuste de banda y engrase general de batidora industrial de 30L",
    amount: 850,
    paymentMethod: "transferencia",
    accountOrigin: "Santander Negocio Brito",
    supplier: "Técnico Luis Hernández",
    cashier: "Elena Brito",
    status: "activo",
    timestamp: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "GST-001006",
    date: getPastDateISO(1),
    displayDate: "Ayer, 01:10 PM",
    category: "retiro_dueno",
    categoryLabel: "Retiro Don Toño / Socios",
    branchId: "branch-matriz",
    branchName: "Sucursal Matriz (Centro)",
    description: "Retiro parcial de resguardo de efectivo de caja hacia caja de seguridad",
    amount: 2000,
    paymentMethod: "efectivo",
    accountOrigin: "Caja Mostrador (Efectivo Turno)",
    cashier: "Don Toño Brito",
    status: "activo",
    notes: "Resguardo preventivo turno mañana",
    timestamp: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "GST-001007",
    date: "2026-09-06",
    displayDate: "Ayer, 04:20 PM",
    category: "servicios",
    categoryLabel: "Luz, Agua e Internet",
    branchId: "branch-sanjuan",
    branchName: "Sucursal San Juan",
    description: "Pago de recibo bimestral de energía eléctrica CFE para refrigeración y vitrinas",
    amount: 2140,
    paymentMethod: "transferencia",
    accountOrigin: "BBVA Bancomer (Don Toño)",
    supplier: "CFE Suministrador de Servicios Básicos",
    cashier: "Maestro Juan",
    status: "activo",
    timestamp: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "GST-001008",
    date: "2026-09-05",
    displayDate: "05/09/2026",
    category: "otros",
    categoryLabel: "Gastos Menores / Varios",
    branchId: "branch-flores",
    branchName: "Sucursal Las Flores (Plaza)",
    description: "Compra de garrafones de agua purificada y artículos de limpieza para piso",
    amount: 190,
    paymentMethod: "efectivo",
    accountOrigin: "Caja Mostrador (Efectivo Turno)",
    supplier: "Tienda de Abarrotes La Esquina",
    cashier: "Sofía Morales",
    status: "activo",
    timestamp: new Date(Date.now() - 172800000).toISOString(),
  },
];

/**
 * Muestra el concepto compacto con botón "ver más" / "ver menos" si supera la longitud
 */
function ExpandableConceptText({ text, maxChars = 50 }: { text: string; maxChars?: number }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!text) return null;

  // Capitalizar primera letra si está en minúsculas
  const formattedText = text.length > 0 && text[0] === text[0].toLowerCase() && text[0] !== text[0].toUpperCase()
    ? text.charAt(0).toUpperCase() + text.slice(1)
    : text;

  const isLong = formattedText.length > maxChars;

  if (!isLong) {
    return (
      <div className="font-bold text-stone-950 text-sm leading-snug" title={formattedText}>
        {formattedText}
      </div>
    );
  }

  const preview = formattedText.slice(0, maxChars).trim() + "...";

  return (
    <div className="font-bold text-stone-950 text-sm leading-snug" title={formattedText}>
      <span>{isExpanded ? formattedText : preview}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsExpanded((prev) => !prev);
        }}
        className="inline-flex items-center text-[11px] font-black text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-2 py-0.5 rounded-full ml-1.5 transition-colors cursor-pointer select-none shadow-2xs"
        title={isExpanded ? "Mostrar menos texto" : "Mostrar texto completo"}
      >
        {isExpanded ? "ver menos" : "ver más"}
      </button>
    </div>
  );
}

export type PeriodoFiltro = "todos" | "dia" | "semana" | "mes" | "anio";

export default function GastosPage() {
  const { user } = useAuth();
  const { branches, currentBranch } = useBranch();
  const { addNotification } = useNotifications();

  // ── Estados de Datos ──
  const [gastos, setGastos] = useState<ExpenseRecord[]>([]);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mostrarStats, setMostrarStats] = useState(false);
  const [periodoStats, setPeriodoStats] = useState<"hoy" | "semana" | "mes" | "anio">("hoy");

  // ── Filtros ──
  const [viewMode, setViewMode] = useState<"tabla" | "fichas">("tabla");
  const [filtroPeriodo, setFiltroPeriodo] = useState<PeriodoFiltro>("todos");
  const [search, setSearch] = useState("");
  const [filtroSucursal, setFiltroSucursal] = useState<string>("all");
  const [filtroTipoPago, setFiltroTipoPago] = useState<string>("all");

  // ── Modales ──
  const [modalNuevoOpen, setModalNuevoOpen] = useState(false);
  const [modalEditarOpen, setModalEditarOpen] = useState(false);
  const [modalVerOpen, setModalVerOpen] = useState(false);
  const [modalAnularOpen, setModalAnularOpen] = useState(false);
  const [modalReceiptOpen, setModalReceiptOpen] = useState(false);

  // ── Formulario de Gasto ──
  const [form, setForm] = useState({
    fecha: TODAY_ISO(),
    categoriaId: "insumos",
    branchId: currentBranch ? currentBranch.id : "branch-matriz",
    description: "",
    amount: "",
    paymentMethod: "efectivo" as "efectivo" | "tarjeta" | "transferencia",
    accountOrigin: "Caja Mostrador (Efectivo Turno)",
    supplier: "",
    notes: "",
  });

  const [gastoSeleccionado, setGastoSeleccionado] = useState<ExpenseRecord | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Cargar Gastos al Iniciar y Sincronizar en Tiempo Real ──
  const reloadGastosFromStorage = useCallback(() => {
    try {
      const saved = localStorage.getItem("brito_gastos_registro");
      if (saved) {
        let rawParsed = JSON.parse(saved);
        if (Array.isArray(rawParsed) && rawParsed.length > 0) {
          const todayStr = getLocalDateISO(new Date());
          let needsUpdate = false;

          let parsed: ExpenseRecord[] = rawParsed
            .filter((item): item is ExpenseRecord => Boolean(item && typeof item === "object"))
            .map((item) => ({
              ...item,
              id: item.id || `GST-${Math.floor(1000 + Math.random() * 9000)}`,
              date: item.date || TODAY_ISO(),
              category: item.category || "otros",
              categoryLabel: item.categoryLabel || "Gastos Menores / Varios",
              branchId: item.branchId || "branch-matriz",
              branchName: item.branchName || "Sucursal Matriz (Centro)",
              description: item.description || "Gasto sin concepto",
              amount: Number(item.amount) || 0,
              paymentMethod: item.paymentMethod || "efectivo",
              accountOrigin: item.accountOrigin || "Caja Mostrador (Efectivo Turno)",
              cashier: item.cashier || "Cajero de Turno",
              status: item.status || "activo",
            }));

          parsed = parsed.map((item) => {
            // #GST-2460 fue registrado antes de hoy
            if (item.id === "GST-2460" && item.date === todayStr) {
              needsUpdate = true;
              return {
                ...item,
                date: getPastDateISO(1),
                displayDate: "Ayer, 01:30 p.m.",
                timestamp: new Date(Date.now() - 86400000).toISOString(),
              };
            }
            // GST-001001 a GST-001006 son datos demo que no deben marcarse con la fecha de hoy
            if (item.id === "GST-001006" && item.date === todayStr) {
              needsUpdate = true;
              return { ...item, date: getPastDateISO(1), displayDate: "Ayer, 01:10 PM", timestamp: new Date(Date.now() - 86400000).toISOString() };
            }
            if (item.id === "GST-001005" && item.date === todayStr) {
              needsUpdate = true;
              return { ...item, date: getPastDateISO(1), displayDate: "Ayer, 12:30 PM", timestamp: new Date(Date.now() - 86400000).toISOString() };
            }
            if (item.id === "GST-001004" && item.date === todayStr) {
              needsUpdate = true;
              return { ...item, date: getPastDateISO(2), displayDate: `${getPastDateISO(2).split("-").reverse().join("/")}, 11:20 AM`, timestamp: new Date(Date.now() - 172800000).toISOString() };
            }
            if (item.id === "GST-001003" && item.date === todayStr) {
              needsUpdate = true;
              return { ...item, date: getPastDateISO(2), displayDate: `${getPastDateISO(2).split("-").reverse().join("/")}, 10:45 AM`, timestamp: new Date(Date.now() - 172800000).toISOString() };
            }
            if (item.id === "GST-001002" && item.date === todayStr) {
              needsUpdate = true;
              return { ...item, date: getPastDateISO(3), displayDate: `${getPastDateISO(3).split("-").reverse().join("/")}, 09:15 AM`, timestamp: new Date(Date.now() - 259200000).toISOString() };
            }
            if (item.id === "GST-001001" && item.date === todayStr) {
              needsUpdate = true;
              return { ...item, date: getPastDateISO(3), displayDate: `${getPastDateISO(3).split("-").reverse().join("/")}, 07:30 AM`, timestamp: new Date(Date.now() - 259200000).toISOString() };
            }
            return item;
          });

          if (needsUpdate) {
            localStorage.setItem("brito_gastos_registro", JSON.stringify(parsed));
          }
          setGastos(parsed);
          return;
        } else if (Array.isArray(rawParsed) && rawParsed.length === 0 && localStorage.getItem("brito_gastos_initialized") === "true") {
          setGastos([]);
          return;
        }
      }
    } catch (e) {
      console.error("Error reading saved gastos:", e);
    }
    if (typeof window !== "undefined" && localStorage.getItem("brito_gastos_initialized") === "true") {
      setGastos([]);
      return;
    }
    setGastos(INITIAL_GASTOS);
    localStorage.setItem("brito_gastos_registro", JSON.stringify(INITIAL_GASTOS));
  }, []);

  useEffect(() => {
    reloadGastosFromStorage();

    const handleGastosUpdated = (e: any) => {
      if (e?.detail && Array.isArray(e.detail)) {
        setGastos(e.detail);
      } else {
        reloadGastosFromStorage();
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (!e.key || e.key === "brito_gastos_registro") {
        reloadGastosFromStorage();
      }
    };

    window.addEventListener("brito_gastos_updated", handleGastosUpdated);
    window.addEventListener("storage", handleStorage);

    const unsubRealtime = realtimeHub.onCashMovement((payload) => {
      if (payload && payload.type === "salida") {
        setTimeout(() => {
          reloadGastosFromStorage();
        }, 150);
      }
    });

    return () => {
      window.removeEventListener("brito_gastos_updated", handleGastosUpdated);
      window.removeEventListener("storage", handleStorage);
      if (unsubRealtime) unsubRealtime();
    };
  }, [reloadGastosFromStorage]);

  // Actualizar sucursal por defecto si cambia en el contexto global
  useEffect(() => {
    if (currentBranch) {
      setForm((prev) => ({ ...prev, branchId: currentBranch.id }));
    }
  }, [currentBranch]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleOutsideClick = () => setActiveDropdown(null);
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  // Guardar gastos en LocalStorage y notificar a la app
  const persistGastos = (newGastos: ExpenseRecord[]) => {
    setGastos(newGastos);
    saveStoredExpenses(newGastos);
  };

  // ─── Helpers de Categoría ──────────────────────────────────────────────────
  const getCategoryInfo = (catIdOrLabel?: string | null, description?: string): GastoCategoriaDef => {
    let target = catIdOrLabel;

    // Si la categoría no fue asignada o es genérica "otros"/"salida"/"caja", intentar inferirla inteligentemente de la descripción
    if ((!target || target === "otros" || target === "gasto" || target === "salida" || target === "caja") && description) {
      const descLower = description.toLowerCase();
      if (descLower.includes("cierre de turno") || descLower.includes("don toño") || descLower.includes("retiro") || descLower.includes("socio")) {
        target = "retiro_dueno";
      } else if (descLower.includes("gas") || descLower.includes("horno")) {
        target = "gas_lp";
      } else if (descLower.includes("harina") || descLower.includes("levadura") || descLower.includes("manteca") || descLower.includes("azucar") || descLower.includes("insumo")) {
        target = "insumos";
      } else if (descLower.includes("bolsa") || descLower.includes("empaque") || descLower.includes("papel")) {
        target = "empaques";
      } else if (descLower.includes("cfe") || descLower.includes("luz") || descLower.includes("agua") || descLower.includes("internet")) {
        target = "servicios";
      } else if (descLower.includes("gasolina") || descLower.includes("pemex") || descLower.includes("reparto") || descLower.includes("camioneta")) {
        target = "gasolina";
      } else if (descLower.includes("proveedor") || descLower.includes("factura") || descLower.includes("pago a")) {
        target = "proveedores";
      } else if (descLower.includes("nomina") || descLower.includes("sueldo") || descLower.includes("semana")) {
        target = "nomina";
      } else if (descLower.includes("mantenimiento") || descLower.includes("refaccion") || descLower.includes("tecnico") || descLower.includes("reparac")) {
        target = "mantenimiento";
      }
    }

    if (!target) {
      return {
        id: "otros",
        label: "Gastos Menores / Varios",
        shortLabel: "Varios",
        icon: "🧾",
        bg: "bg-stone-50",
        text: "text-stone-700",
        border: "border-stone-200",
      };
    }
    const catLower = String(target).toLowerCase();
    const found = GASTO_CATEGORIAS.find(
      (c) => c.id === target || c.label.toLowerCase() === catLower || (c.shortLabel && c.shortLabel.toLowerCase() === catLower)
    );
    return (
      found || {
        id: "otros",
        label: String(target) || "Otros Gastos",
        shortLabel: String(target) || "Gasto",
        icon: "🧾",
        bg: "bg-stone-50",
        text: "text-stone-700",
        border: "border-stone-200",
      }
    );
  };

  const getDisplayCashier = (g: ExpenseRecord): string => {
    const c = (g.cashier || "").trim();
    if (c && c.toLowerCase() !== "cajero" && c.toLowerCase() !== "cajero de turno") {
      return c;
    }
    if (g.description) {
      const match = g.description.match(/\(([^->\)]+)(?:\s*->|\s*➔|\))/i);
      if (match && match[1]) {
        const name = match[1].trim();
        return name.charAt(0).toUpperCase() + name.slice(1);
      }
    }
    if (g.notes) {
      const matchNotes = g.notes.match(/(?:cajero|responsable|entrega):\s*([a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+)/i);
      if (matchNotes && matchNotes[1]) {
        return matchNotes[1].trim();
      }
    }
    return c || "Cajero";
  };

  const cleanFolio = (id?: string | null): string => {
    if (!id) return "#-";
    let s = String(id).trim();
    if (s.startsWith("#")) s = s.substring(1);
    return `#${s}`;
  };

  // ─── Rangos de Fecha para Filtros y KPIs ───────────────────────────────────
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDate = now.getDate();

  // 1. Día (Hoy)
  const todayStart = useMemo(() => new Date(currentYear, currentMonth, currentDate, 0, 0, 0, 0), [currentYear, currentMonth, currentDate]);
  const todayEnd = useMemo(() => new Date(currentYear, currentMonth, currentDate, 23, 59, 59, 999), [currentYear, currentMonth, currentDate]);

  // 2. Semana (Esta Semana: Lunes a Domingo)
  const lunesSemana = useMemo(() => {
    const d = new Date(now);
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [currentYear, currentMonth, currentDate]);

  const domingoSemana = useMemo(() => {
    const d = new Date(lunesSemana);
    d.setDate(d.getDate() + 6);
    d.setHours(23, 59, 59, 999);
    return d;
  }, [lunesSemana]);

  // 3. Mes (Este Mes)
  const primerDiaMes = useMemo(() => new Date(currentYear, currentMonth, 1, 0, 0, 0, 0), [currentYear, currentMonth]);
  const ultimoDiaMes = useMemo(() => new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999), [currentYear, currentMonth]);

  // 4. Año (Este Año)
  const primerDiaAnio = useMemo(() => new Date(currentYear, 0, 1, 0, 0, 0, 0), [currentYear]);
  const ultimoDiaAnio = useMemo(() => new Date(currentYear, 11, 31, 23, 59, 59, 999), [currentYear]);

  // ─── Conteo de Gastos por Período de Tiempo (Día, Semana, Mes, Año, Todos) ──
  const countsByPeriod = useMemo(() => {
    let dia = 0;
    let semana = 0;
    let mes = 0;
    let anio = 0;
    let todos = 0;

    (gastos || []).forEach((g) => {
      if (!g) return;
      if (filtroSucursal !== "all" && g.branchId !== filtroSucursal) return;
      if (filtroTipoPago !== "all" && g.paymentMethod !== filtroTipoPago) return;

      todos++;
      const d = parseExpenseDate(g.date) || (g.timestamp ? new Date(g.timestamp) : null);
      if (!d) return;

      if (d >= todayStart && d <= todayEnd) dia++;
      if (d >= lunesSemana && d <= domingoSemana) semana++;
      if (d >= primerDiaMes && d <= ultimoDiaMes) mes++;
      if (d >= primerDiaAnio && d <= ultimoDiaAnio) anio++;
    });

    return { dia, semana, mes, anio, todos };
  }, [gastos, filtroSucursal, filtroTipoPago, todayStart, todayEnd, lunesSemana, domingoSemana, primerDiaMes, ultimoDiaMes, primerDiaAnio, ultimoDiaAnio]);

  // ─── Filtrado Principal y Ordenamiento Cronológico (Más reciente primero) ─
  const filteredGastos = useMemo(() => {
    return (gastos || [])
      .filter((g) => {
        if (!g) return false;

        // 1. Filtro por Período (Día / Semana / Mes / Año / Todos)
        if (filtroPeriodo !== "todos") {
          const d = parseExpenseDate(g.date) || (g.timestamp ? new Date(g.timestamp) : null);
          if (!d) return false;
          if (filtroPeriodo === "dia" && !(d >= todayStart && d <= todayEnd)) return false;
          if (filtroPeriodo === "semana" && !(d >= lunesSemana && d <= domingoSemana)) return false;
          if (filtroPeriodo === "mes" && !(d >= primerDiaMes && d <= ultimoDiaMes)) return false;
          if (filtroPeriodo === "anio" && !(d >= primerDiaAnio && d <= ultimoDiaAnio)) return false;
        }

        // 2. Filtro por Sucursal
        if (filtroSucursal !== "all" && g.branchId !== filtroSucursal) {
          return false;
        }
        // 3. Filtro por Tipo de Pago
        if (filtroTipoPago !== "all" && g.paymentMethod !== filtroTipoPago) {
          return false;
        }
        // 4. Búsqueda libre
        if (search.trim()) {
          const query = search.toLowerCase();
          const haystack = `${g.id || ""} ${g.date || ""} ${g.categoryLabel || ""} ${g.branchName || ""} ${g.description || ""} ${g.paymentMethod || ""} ${g.accountOrigin || ""} ${g.cashier || ""} ${g.supplier || ""}`.toLowerCase();
          if (!haystack.includes(query)) return false;
        }
        return true;
      })
      .sort((a, b) => getExpenseTimestamp(b) - getExpenseTimestamp(a));
  }, [gastos, filtroPeriodo, filtroSucursal, filtroTipoPago, search, todayStart, todayEnd, lunesSemana, domingoSemana, primerDiaMes, ultimoDiaMes, primerDiaAnio, ultimoDiaAnio]);

  // ─── Cálculos de KPIs (Reactivos al filtro de sucursal) ─────────────────────
  // Considerar únicamente los gastos de la sucursal activa en el filtro para los KPIs
  const gastosParaKPIs = useMemo(() => {
    if (filtroSucursal === "all") return gastos;
    return gastos.filter((g) => g.branchId === filtroSucursal);
  }, [gastos, filtroSucursal]);

  const { totalHoy, cantidadHoy } = useMemo(() => {
    return gastosParaKPIs.reduce(
      (acc, g) => {
        if (g.status === "anulado") return acc;
        const d = parseExpenseDate(g.date);
        if (d && d >= todayStart && d <= todayEnd) {
          acc.totalHoy += Number(g.amount || 0);
          acc.cantidadHoy += 1;
        }
        return acc;
      },
      { totalHoy: 0, cantidadHoy: 0 }
    );
  }, [gastosParaKPIs, todayStart, todayEnd]);

  const totalSemana = useMemo(() => {
    return gastosParaKPIs.reduce((acc, g) => {
      if (g.status === "anulado") return acc;
      const d = parseExpenseDate(g.date);
      if (d && d >= lunesSemana && d <= domingoSemana) {
        acc += Number(g.amount || 0);
      }
      return acc;
    }, 0);
  }, [gastosParaKPIs, lunesSemana, domingoSemana]);

  const totalMes = useMemo(() => {
    return gastosParaKPIs.reduce((acc, g) => {
      if (g.status === "anulado") return acc;
      const d = parseExpenseDate(g.date);
      if (d && d >= primerDiaMes && d <= ultimoDiaMes) {
        acc += Number(g.amount || 0);
      }
      return acc;
    }, 0);
  }, [gastosParaKPIs, primerDiaMes, ultimoDiaMes]);

  const totalAnio = useMemo(() => {
    return gastosParaKPIs.reduce((acc, g) => {
      if (g.status === "anulado") return acc;
      const d = parseExpenseDate(g.date);
      if (d && d >= primerDiaAnio && d <= ultimoDiaAnio) {
        acc += Number(g.amount || 0);
      }
      return acc;
    }, 0);
  }, [gastosParaKPIs, primerDiaAnio, ultimoDiaAnio]);

  // ─── Estadísticas y Distribución por Categoría ────────────────────────────
  const statsData = useMemo(() => {
    const gastosPeriodo = gastosParaKPIs.filter((g) => {
      if (g.status === "anulado") return false;
      const d = parseExpenseDate(g.date);
      if (!d) return false;

      if (periodoStats === "hoy") {
        return d >= todayStart && d <= todayEnd;
      } else if (periodoStats === "semana") {
        return d >= lunesSemana && d <= domingoSemana;
      } else if (periodoStats === "mes") {
        return d >= primerDiaMes && d <= ultimoDiaMes;
      } else if (periodoStats === "anio") {
        return d >= primerDiaAnio && d <= ultimoDiaAnio;
      }
      return true;
    });

    const map: Record<string, { total: number; count: number; label: string; icon: string }> = {};
    let totalPeriodo = 0;
    let totalOps = 0;

    gastosPeriodo.forEach((g) => {
      const catInfo = getCategoryInfo(g.category, g.description);
      if (!map[catInfo.id]) {
        map[catInfo.id] = { total: 0, count: 0, label: catInfo.label, icon: catInfo.icon };
      }
      map[catInfo.id].total += Number(g.amount || 0);
      map[catInfo.id].count += 1;
      totalPeriodo += Number(g.amount || 0);
      totalOps += 1;
    });

    const list = Object.entries(map)
      .map(([id, info]) => ({
        id,
        label: info.label,
        icon: info.icon,
        total: info.total,
        count: info.count,
        pct: totalPeriodo > 0 ? (info.total / totalPeriodo) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);

    return { list, totalPeriodo, totalOps };
  }, [gastosParaKPIs, periodoStats, todayStart, todayEnd, lunesSemana, primerDiaMes, now]);

  // ─── Manejadores de Formularios ───────────────────────────────────────────
  const abrirNuevoGasto = () => {
    setForm({
      fecha: TODAY_ISO(),
      categoriaId: "insumos",
      branchId: filtroSucursal !== "all" ? filtroSucursal : currentBranch ? currentBranch.id : "branch-matriz",
      description: "",
      amount: "",
      paymentMethod: "efectivo",
      accountOrigin: "Caja Mostrador (Efectivo Turno)",
      supplier: "",
      notes: "",
    });
    setModalNuevoOpen(true);
  };

  const handleCrearGasto = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = Number(form.amount);
    if (!parsedAmount || parsedAmount <= 0 || !form.description.trim()) return;

    setIsSubmitting(true);
    const catInfo = getCategoryInfo(form.categoriaId);
    const targetBranch = branches.find((b) => b.id === form.branchId) || (branches.length > 0 ? branches[0] : { id: "branch-matriz", name: "Sucursal Matriz (Centro)" });

    const nextNum = Math.floor(1000 + Math.random() * 9000);
    const nuevoGasto: ExpenseRecord = {
      id: `GST-${nextNum}`,
      date: form.fecha,
      displayDate: form.fecha === TODAY_ISO()
        ? `Hoy, ${new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}`
        : `${form.fecha.split("-").reverse().join("/")}, ${new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}`,
      category: form.categoriaId,
      categoryLabel: catInfo.label,
      branchId: targetBranch.id,
      branchName: targetBranch.name,
      description: form.description.trim(),
      amount: parsedAmount,
      paymentMethod: form.paymentMethod,
      accountOrigin: form.accountOrigin,
      supplier: form.supplier.trim() || undefined,
      notes: form.notes.trim() || undefined,
      cashier: user?.name || "Don Toño Brito",
      status: "activo",
      timestamp: new Date().toISOString(),
    };

    // Intentar insertar en Supabase
    try {
      const supabase = createClient();
      await supabase.from("cash_movements").insert({
        id: nuevoGasto.id,
        type: "salida",
        category: form.categoriaId,
        amount: nuevoGasto.amount,
        reason: `[${nuevoGasto.id}] ${nuevoGasto.categoryLabel}: ${nuevoGasto.description} (${nuevoGasto.branchName})`,
        authorized_by: nuevoGasto.cashier,
        branch_id: nuevoGasto.branchId || "branch-matriz",
      });
    } catch (err) {
      console.log("Offline mode, saved locally", err);
    }

    const updated = [nuevoGasto, ...gastos];
    persistGastos(updated);

    // Transmitir en tiempo real a las demás terminales
    try {
      if (realtimeHub?.broadcastCashMovement) {
        realtimeHub.broadcastCashMovement({
          id: nuevoGasto.id,
          branchId: nuevoGasto.branchId,
          branchName: nuevoGasto.branchName,
          type: "salida",
          category: nuevoGasto.category as any,
          categoryLabel: nuevoGasto.categoryLabel,
          amount: nuevoGasto.amount,
          reason: nuevoGasto.description,
          authorizedBy: nuevoGasto.cashier,
          timestamp: new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
        });
      }
    } catch (err) {
      console.log("Realtime broadcast error:", err);
    }

    // Notificación al administrador
    addNotification({
      senderName: `Gasto Registrado (${nuevoGasto.cashier})`,
      senderAvatar: "💸",
      badgeIcon: "dinero",
      title: `Egreso: ${formatCurrency(nuevoGasto.amount)}`,
      highlightText: nuevoGasto.categoryLabel,
      description: `Motivo: "${nuevoGasto.description}". Sucursal: ${nuevoGasto.branchName}.`,
      category: "caja",
      actionLabel: "Ver en Gastos",
      actionLink: "/gastos",
    });

    setIsSubmitting(false);
    setModalNuevoOpen(false);

    // Abrir comprobante
    setGastoSeleccionado(nuevoGasto);
    setModalReceiptOpen(true);
  };

  const abrirEditarGasto = (g: ExpenseRecord) => {
    setGastoSeleccionado(g);
    setForm({
      fecha: g.date,
      categoriaId: g.category,
      branchId: g.branchId,
      description: g.description,
      amount: String(g.amount),
      paymentMethod: g.paymentMethod,
      accountOrigin: g.accountOrigin,
      supplier: g.supplier || "",
      notes: g.notes || "",
    });
    setModalEditarOpen(true);
  };

  const handleGuardarEdicion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gastoSeleccionado) return;
    const parsedAmount = Number(form.amount);
    if (!parsedAmount || parsedAmount <= 0 || !form.description.trim()) return;

    const catInfo = getCategoryInfo(form.categoriaId);
    const targetBranch = branches.find((b) => b.id === form.branchId) || (branches.length > 0 ? branches[0] : { id: "branch-matriz", name: "Sucursal Matriz (Centro)" });

    const updatedList = gastos.map((item) => {
      if (item.id !== gastoSeleccionado.id) return item;
      return {
        ...item,
        date: form.fecha,
        category: form.categoriaId,
        categoryLabel: catInfo.label,
        branchId: targetBranch.id,
        branchName: targetBranch.name,
        description: form.description.trim(),
        amount: parsedAmount,
        paymentMethod: form.paymentMethod,
        accountOrigin: form.accountOrigin,
        supplier: form.supplier.trim() || undefined,
        notes: form.notes.trim() || undefined,
      };
    });

    persistGastos(updatedList);
    setModalEditarOpen(false);
    setGastoSeleccionado(null);
  };

  const abrirAnularGasto = (g: ExpenseRecord) => {
    setGastoSeleccionado(g);
    setMotivoAnulacion("");
    setModalAnularOpen(true);
  };

  const handleConfirmarAnulacion = () => {
    if (!gastoSeleccionado || !motivoAnulacion.trim()) return;

    const updatedList = gastos.map((item) => {
      if (item.id !== gastoSeleccionado.id) return item;
      return {
        ...item,
        status: "anulado" as const,
        cancelReason: motivoAnulacion.trim(),
        description: `[ANULADO: ${motivoAnulacion.trim()}] ${item.description}`,
      };
    });

    persistGastos(updatedList);
    setModalAnularOpen(false);
    setGastoSeleccionado(null);

    addNotification({
      senderName: "Gasto Anulado",
      senderAvatar: "🚫",
      badgeIcon: "dinero",
      title: `Gasto Anulado #${gastoSeleccionado.id}`,
      highlightText: formatCurrency(gastoSeleccionado.amount),
      description: `Motivo: ${motivoAnulacion.trim()}`,
      category: "caja",
      actionLabel: "Ver Gastos",
      actionLink: "/gastos",
    });
  };

  const handleEliminarGastoPermanente = (g: ExpenseRecord) => {
    if (typeof window !== "undefined") {
      const confirmDelete = window.confirm(`¿Deseas eliminar permanentemente el registro #${g.id} ("${g.description}")?`);
      if (!confirmDelete) return;
    }
    const updatedList = gastos.filter((item) => item.id !== g.id);
    persistGastos(updatedList);
    setActiveDropdown(null);
  };

  const handleExportCSV = () => {
    if (filteredGastos.length === 0) return;
    const headers = "Folio,Fecha,Sucursal,Categoria,Concepto,Monto,Metodo,CuentaOrigen,Proveedor,Cajero,Estado\n";
    const rows = filteredGastos
      .map((g) => {
        const descClean = (g.description || "").replace(/"/g, '""');
        return `"${g.id || ""}","${g.date || ""}","${g.branchName || ""}","${g.categoryLabel || ""}","${descClean}",${g.amount || 0},"${g.paymentMethod || ""}","${g.accountOrigin || ""}","${g.supplier || ""}","${g.cashier || ""}","${g.status || ""}"`;
      })
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `gastos_panaderia_brito_${TODAY_ISO()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full space-y-5 sm:space-y-6">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-gradient-to-br from-rose-600 to-rose-800 text-white rounded-2xl shadow-md shadow-rose-600/20">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-stone-900 tracking-tight">Registro de Gastos</h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Control de materias primas, gas LP para hornos, nómina, servicios y compras por sucursal.
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
            <BarChart3 className="w-4 h-4 text-brito-orange-500" />
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
            onClick={abrirNuevoGasto}
            className="flex items-center gap-2 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-black px-5 py-2.5 rounded-xl shadow-lg shadow-rose-600/25 text-xs transition-all active:scale-95"
          >
            <PlusCircle className="w-4 h-4" /> Registrar Nuevo Gasto
          </button>
        </div>
      </div>

      {/* ── Panel Colapsable de Estadísticas y Analítica (Estilo Sairec ERP) ── */}
      {mostrarStats && (
        <div className="bg-white rounded-3xl border border-stone-200/80 p-6 shadow-sm space-y-6 animate-in fade-in slide-in-from-top-4 duration-300 transition-all duration-200 hover:border-rose-400/80 hover:shadow-xl hover:shadow-rose-500/10 hover:ring-2 hover:ring-rose-400/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📊</span>
              <div>
                <h3 className="font-black text-base text-stone-900">
                  Estadísticas y Distribución de Gastos
                </h3>
                <p className="text-xs text-stone-500">
                  Análisis por categoría en {filtroSucursal === "all" ? "Todas las Sucursales" : branches.find(b => b.id === filtroSucursal)?.name || "la sucursal seleccionada"}
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
                      ? "bg-rose-600 text-white shadow-sm"
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
              <p className="font-bold text-sm text-stone-600">Sin gastos registrados en este período</p>
              <p className="text-xs">Prueba seleccionando otro período o registra nuevos egresos.</p>
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
                          <span>{formatCurrency(item.total)}</span>
                          <span className="text-stone-400 font-normal">({item.pct.toFixed(1)}%)</span>
                          <span className="text-stone-600 font-bold text-[11px] bg-stone-100 px-2 py-0.5 rounded-lg border border-stone-200/80 font-sans">
                            Cant: {item.count} {item.count === 1 ? "gasto" : "gastos"}
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${item.pct}%` }}
                          className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full transition-all duration-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tarjeta Resumen Total del Período */}
              <div className="lg:col-span-5 h-fit">
                <div className="bg-gradient-to-br from-stone-900 to-stone-950 p-5 rounded-2xl text-white border border-stone-800 shadow-md flex items-center justify-between transition-all duration-200 hover:border-rose-400 hover:shadow-xl hover:shadow-rose-900/30 hover:ring-2 hover:ring-rose-400/20">
                  <div>
                    <span className="text-[10px] font-bold text-rose-300 uppercase tracking-wider block">
                      Total del Período ({periodoStats.toUpperCase()})
                    </span>
                    <span className="text-2xl font-black text-white font-mono tracking-tight">
                      {formatCurrency(statsData.totalPeriodo)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                      Transacciones
                    </span>
                    <span className="text-2xl font-black text-amber-400 font-mono">
                      {statsData.totalOps}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── KPI Cards Grid ── */}
      {/* ── KPI Cards Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Gastos de Hoy */}
        <div
          onClick={() => setFiltroPeriodo(filtroPeriodo === "dia" ? "todos" : "dia")}
          role="button"
          tabIndex={0}
          title="Haz clic para filtrar solo los gastos de hoy"
          className={`bg-gradient-to-br from-rose-900 via-rose-950 to-stone-950 p-5 rounded-3xl border shadow-xl text-white transition-all duration-200 cursor-pointer relative overflow-hidden select-none hover:scale-[1.01] ${
            filtroPeriodo === "dia"
              ? "border-rose-400 ring-4 ring-rose-400/40 shadow-2xl shadow-rose-950/60"
              : "border-rose-800/60 hover:border-rose-400 hover:shadow-2xl hover:shadow-rose-950/50 hover:ring-2 hover:ring-rose-400/30"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-rose-200 uppercase tracking-wider flex items-center gap-1.5">
              <span>Gastos de Hoy</span>
              {filtroPeriodo === "dia" && (
                <span className="bg-rose-500 text-white text-[9px] px-1.5 py-0.2 rounded-full font-black uppercase tracking-wider animate-pulse">
                  Activo
                </span>
              )}
            </span>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-600/40 text-rose-200 rounded-xl border border-rose-500/30 shadow-sm" title="Símbolo de gastos: Gráfica en caída">
              <TrendingDown className="w-3.5 h-3.5 text-rose-300" />
              <span className="text-[10px] font-black uppercase tracking-wider">En caída</span>
            </div>
          </div>

          <div className="flex items-end justify-between gap-2 mt-1">
            <div>
              <p className="text-3xl font-black text-rose-300 tracking-tight font-mono">
                {formatCurrency(totalHoy)}
              </p>
              <p className="text-[11px] text-rose-200/80 font-medium mt-1">
                {cantidadHoy} gasto{cantidadHoy !== 1 ? "s" : ""} registrado{cantidadHoy !== 1 ? "s" : ""} hoy
              </p>
            </div>

            {/* Símbolo de gastos: Pequeña gráfica donde dice que va en caída */}
            <div className="shrink-0 pb-0.5" title="Símbolo de gastos: Gráfica en caída">
              <img
                src="/images/grafica-caida-gastos.svg"
                alt="Gráfica en caída - Símbolo de gastos"
                width={112}
                height={42}
                className="w-24 sm:w-28 h-auto object-contain filter drop-shadow-[0_2px_8px_rgba(225,29,72,0.45)] transition-transform duration-200 hover:scale-105 select-none pointer-events-none"
              />
            </div>
          </div>
        </div>

        {/* Gastos de la Semana */}
        <div
          onClick={() => setFiltroPeriodo(filtroPeriodo === "semana" ? "todos" : "semana")}
          role="button"
          tabIndex={0}
          title="Haz clic para filtrar los gastos de esta semana (Lunes a Domingo)"
          className={`bg-white p-5 rounded-3xl border shadow-sm transition-all duration-200 cursor-pointer select-none hover:scale-[1.01] ${
            filtroPeriodo === "semana"
              ? "border-amber-500 ring-4 ring-amber-400/30 shadow-lg shadow-amber-500/10 bg-amber-50/30"
              : "border-stone-200/80 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/10 hover:ring-2 hover:ring-amber-400/20"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500 flex items-center gap-1.5">
              <span>Gastos de la Semana</span>
              {filtroPeriodo === "semana" && (
                <span className="bg-amber-500 text-white text-[9px] px-1.5 py-0.2 rounded-full font-black uppercase tracking-wider animate-pulse">
                  Activo
                </span>
              )}
            </span>
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

        {/* Gastos del Mes */}
        <div
          onClick={() => setFiltroPeriodo(filtroPeriodo === "mes" ? "todos" : "mes")}
          role="button"
          tabIndex={0}
          title="Haz clic para filtrar los gastos del mes en curso"
          className={`bg-white p-5 rounded-3xl border shadow-sm transition-all duration-200 cursor-pointer select-none hover:scale-[1.01] ${
            filtroPeriodo === "mes"
              ? "border-blue-500 ring-4 ring-blue-400/30 shadow-lg shadow-blue-500/10 bg-blue-50/30"
              : "border-stone-200/80 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/10 hover:ring-2 hover:ring-blue-400/20"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500 flex items-center gap-1.5">
              <span>Gastos del Mes</span>
              {filtroPeriodo === "mes" && (
                <span className="bg-blue-600 text-white text-[9px] px-1.5 py-0.2 rounded-full font-black uppercase tracking-wider animate-pulse">
                  Activo
                </span>
              )}
            </span>
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

        {/* Total Registros / Vista General */}
        <div
          onClick={() => setFiltroPeriodo("todos")}
          role="button"
          tabIndex={0}
          title="Haz clic para mostrar todos los gastos sin filtro temporal"
          className={`bg-white p-5 rounded-3xl border shadow-sm transition-all duration-200 cursor-pointer select-none hover:scale-[1.01] ${
            filtroPeriodo === "todos"
              ? "border-rose-500 ring-4 ring-rose-400/20 shadow-lg shadow-rose-500/10 bg-rose-50/20"
              : "border-stone-200/80 hover:border-rose-400 hover:shadow-lg hover:shadow-rose-500/10 hover:ring-2 hover:ring-rose-400/20"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500 flex items-center gap-1.5">
              <span>Total Registros</span>
              {filtroPeriodo === "todos" && (
                <span className="bg-stone-700 text-white text-[9px] px-1.5 py-0.2 rounded-full font-black uppercase tracking-wider">
                  Todos
                </span>
              )}
            </span>
            <div className="p-2 bg-stone-100 text-stone-700 rounded-xl">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-stone-900 tracking-tight font-mono">
            {gastosParaKPIs.length}
          </p>
          <p className="text-[11px] text-stone-400 font-semibold mt-1">
            {filtroSucursal === "all" ? "Todas las tiendas" : "Sucursal activa"}
          </p>
        </div>
      </div>

      {/* ── Filtros y Buscador Dinámico (Con Filtro Temporal por Día, Semana, Mes, Año y Sucursal) ── */}
      <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-sm space-y-4 transition-all duration-200 hover:border-rose-400/80 hover:shadow-lg hover:shadow-rose-500/10 hover:ring-2 hover:ring-rose-400/20">
        
        {/* ── FILA DE BOTONES DE FILTRO TEMPORAL (DÍA, SEMANA, MES, AÑO, TODOS) ── */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-rose-100 text-rose-700 rounded-xl">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-black text-stone-700 uppercase tracking-wider block">
                Filtrar Registros por Período
              </span>
              <span className="text-[11px] text-stone-400 font-medium">
                Selecciona un rango para visualizar los gastos correspondientes
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-stone-100/90 rounded-2xl border border-stone-200">
            {/* Botón Día */}
            <button
              type="button"
              onClick={() => setFiltroPeriodo("dia")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs sm:text-sm transition-all duration-150 ${
                filtroPeriodo === "dia"
                  ? "bg-rose-900 text-white shadow-sm ring-2 ring-rose-400/40"
                  : "text-stone-700 hover:text-stone-900 hover:bg-white/80"
              }`}
            >
              <span>📅</span>
              <span>Día (Hoy)</span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                  filtroPeriodo === "dia" ? "bg-rose-700 text-rose-100" : "bg-stone-200 text-stone-700"
                }`}
              >
                {countsByPeriod.dia}
              </span>
            </button>

            {/* Botón Semana */}
            <button
              type="button"
              onClick={() => setFiltroPeriodo("semana")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs sm:text-sm transition-all duration-150 ${
                filtroPeriodo === "semana"
                  ? "bg-rose-900 text-white shadow-sm ring-2 ring-rose-400/40"
                  : "text-stone-700 hover:text-stone-900 hover:bg-white/80"
              }`}
            >
              <span>🗓️</span>
              <span>Semana</span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                  filtroPeriodo === "semana" ? "bg-rose-700 text-rose-100" : "bg-stone-200 text-stone-700"
                }`}
              >
                {countsByPeriod.semana}
              </span>
            </button>

            {/* Botón Mes */}
            <button
              type="button"
              onClick={() => setFiltroPeriodo("mes")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs sm:text-sm transition-all duration-150 ${
                filtroPeriodo === "mes"
                  ? "bg-rose-900 text-white shadow-sm ring-2 ring-rose-400/40"
                  : "text-stone-700 hover:text-stone-900 hover:bg-white/80"
              }`}
            >
              <span>📆</span>
              <span>Mes</span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                  filtroPeriodo === "mes" ? "bg-rose-700 text-rose-100" : "bg-stone-200 text-stone-700"
                }`}
              >
                {countsByPeriod.mes}
              </span>
            </button>

            {/* Botón Año */}
            <button
              type="button"
              onClick={() => setFiltroPeriodo("anio")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs sm:text-sm transition-all duration-150 ${
                filtroPeriodo === "anio"
                  ? "bg-rose-900 text-white shadow-sm ring-2 ring-rose-400/40"
                  : "text-stone-700 hover:text-stone-900 hover:bg-white/80"
              }`}
            >
              <span>📊</span>
              <span>Año ({currentYear})</span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                  filtroPeriodo === "anio" ? "bg-rose-700 text-rose-100" : "bg-stone-200 text-stone-700"
                }`}
              >
                {countsByPeriod.anio}
              </span>
            </button>

            {/* Botón Todos */}
            <button
              type="button"
              onClick={() => setFiltroPeriodo("todos")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs sm:text-sm transition-all duration-150 ${
                filtroPeriodo === "todos"
                  ? "bg-stone-800 text-white shadow-sm ring-2 ring-stone-400/40"
                  : "text-stone-700 hover:text-stone-900 hover:bg-white/80"
              }`}
            >
              <span>🌐</span>
              <span>Todos</span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                  filtroPeriodo === "todos" ? "bg-stone-600 text-stone-100" : "bg-stone-200 text-stone-700"
                }`}
              >
                {countsByPeriod.todos}
              </span>
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Buscador de Texto Libre */}
          <div className="relative flex-1 w-full">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Buscar por folio GST-XXXX, concepto, sucursal, proveedor o cajero..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-stone-50 rounded-2xl border border-stone-200 text-sm sm:text-base font-semibold text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-rose-500 focus:outline-none"
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
            {/* ⭐ FILTRO POR SUCURSAL (REQUISITO PRINCIPAL DEL USUARIO) */}
            <div className="flex items-center gap-1.5 bg-amber-50/90 border-2 border-amber-300 px-3 py-1.5 rounded-2xl shadow-xs">
              <Building2 className="w-4 h-4 text-amber-800 shrink-0" />
              <select
                value={filtroSucursal}
                onChange={(e) => setFiltroSucursal(e.target.value)}
                className="bg-transparent py-1 px-1 text-sm sm:text-base font-black text-amber-950 focus:outline-none cursor-pointer"
              >
                <option value="all">🏪 Todas las Sucursales</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    📍 {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por Método de Pago */}
            <select
              value={filtroTipoPago}
              onChange={(e) => setFiltroTipoPago(e.target.value)}
              className="bg-stone-50 px-3.5 py-2.5 rounded-2xl border-2 border-stone-200 text-sm sm:text-base font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer shadow-xs"
            >
              <option value="all">Todos los Métodos</option>
              <option value="efectivo">💵 Solo Efectivo</option>
              <option value="tarjeta">💳 Solo Tarjeta</option>
              <option value="transferencia">🏦 Solo Transferencia (SPEI)</option>
            </select>

            {/* Botón para limpiar filtros */}
            {(search || filtroSucursal !== "all" || filtroTipoPago !== "all" || filtroPeriodo !== "todos") && (
              <button
                onClick={() => {
                  setSearch("");
                  setFiltroSucursal("all");
                  setFiltroTipoPago("all");
                  setFiltroPeriodo("todos");
                }}
                className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border-2 border-rose-200 rounded-2xl text-sm font-black transition-colors shadow-xs"
              >
                ✕ Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Resumen de Resultados */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm sm:text-base text-stone-600 font-medium pt-2 border-t border-stone-100">
          <span className="flex items-center gap-1.5 flex-wrap">
            <span>Mostrando <strong className="text-stone-900 font-black">{filteredGastos.length}</strong> de <strong className="text-stone-900 font-bold">{gastos.length}</strong> gastos</span>
            {filtroPeriodo !== "todos" && (
              <span className="bg-rose-100 text-rose-900 font-black px-2 py-0.5 rounded-lg text-xs sm:text-sm border border-rose-300">
                Período: {filtroPeriodo === "dia" ? "Día (Hoy)" : filtroPeriodo === "semana" ? "Semana en curso" : filtroPeriodo === "mes" ? "Mes en curso" : `Año ${currentYear}`}
              </span>
            )}
            {filtroSucursal !== "all" && (
              <span className="bg-amber-100 text-amber-900 font-black px-2 py-0.5 rounded-lg text-xs sm:text-sm border border-amber-300">
                en {branches.find((b) => b.id === filtroSucursal)?.name}
              </span>
            )}
          </span>
          <span className="font-mono text-stone-800 font-bold text-sm sm:text-base flex items-center gap-1.5">
            <span className="text-stone-500 font-semibold">Suma filtrada:</span>
            <span className="text-rose-700 font-black text-base sm:text-lg bg-rose-50 px-2.5 py-0.5 rounded-xl border border-rose-200">
              {formatCurrency(filteredGastos.filter(g => g.status !== "anulado").reduce((sum, g) => sum + g.amount, 0))}
            </span>
          </span>
        </div>
      </div>

      {/* ── Tabla / Fichas de Gastos Adaptable a Cualquier Resolución ── */}
      <div className="bg-white rounded-3xl border border-stone-200/80 shadow-sm overflow-hidden transition-all duration-200 hover:border-rose-400/80 hover:shadow-lg hover:shadow-rose-500/10 hover:ring-2 hover:ring-rose-400/20">
        {/* Cabecera Responsiva con Selector de Vista */}
        <div className="p-4 sm:p-5 lg:p-6 border-b border-stone-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 sm:p-3 bg-rose-100 text-rose-700 rounded-2xl shrink-0">
              <Receipt className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h3 className="font-black text-lg sm:text-xl lg:text-2xl text-stone-900 leading-tight">
                Historial Detallado de Gastos
              </h3>
              <p className="text-xs sm:text-sm text-stone-500 font-medium mt-0.5">
                Todas las salidas de dinero (desde $1.00) de cualquier sucursal registradas en tiempo real • {filteredGastos.length} registros
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
            {/* Selector de Vista: Tabla Completa vs Fichas Adaptables */}
            <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode("tabla")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  viewMode === "tabla"
                    ? "bg-white text-stone-900 shadow-xs"
                    : "text-stone-600 hover:text-stone-900 hover:bg-white/50"
                }`}
                title="Ver en formato de tabla (ideal para escritorio y laptops)"
              >
                <Table className="w-3.5 h-3.5" />
                <span>Tabla</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("fichas")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  viewMode === "fichas"
                    ? "bg-white text-stone-900 shadow-xs"
                    : "text-stone-600 hover:text-stone-900 hover:bg-white/50"
                }`}
                title="Ver en formato de fichas cuadradas (ideal para pantallas compactas, tablets y móviles)"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Fichas</span>
              </button>
            </div>

            {/* Total Filtrado */}
            <span className="text-xs sm:text-sm font-mono font-bold text-stone-700 bg-stone-100 px-3.5 py-1.5 rounded-xl border border-stone-200">
              Total filtrado:{" "}
              <span className="text-rose-700 font-black text-sm sm:text-base tabular-nums">
                {formatCurrency(filteredGastos.filter(g => g.status !== "anulado").reduce((sum, g) => sum + g.amount, 0))}
              </span>
            </span>
          </div>
        </div>

        {/* ── MODO 1: TABLA FLUIDA QUE ENCAJA 100% AL ZOOM ESTÁNDAR ── */}
        {viewMode === "tabla" ? (
          <div className="overflow-x-auto w-full scrollbar-thin scrollbar-thumb-stone-300 scrollbar-track-stone-100/60 pb-1">
            <table className="w-full text-left border-collapse min-w-[980px]">
              <thead className="bg-stone-100/95 text-stone-700 font-black border-b border-stone-200 uppercase tracking-wider text-[11px] select-none sticky top-0 z-10 backdrop-blur-xs">
                <tr>
                  <th className="py-3 px-3 align-middle whitespace-nowrap w-[100px]">Folio</th>
                  <th className="py-3 px-3 align-middle whitespace-nowrap w-[95px]">Fecha</th>
                  <th className="py-3 px-3 align-middle whitespace-nowrap w-[130px]">Sucursal</th>
                  <th className="py-3 px-3 align-middle whitespace-nowrap w-[145px]">Categoría</th>
                  <th className="py-3 px-3.5 align-middle min-w-[180px]">Concepto / Motivo</th>
                  <th className="py-3 px-3 align-middle text-right whitespace-nowrap w-[120px]">Monto</th>
                  <th className="py-3 px-3 align-middle text-center whitespace-nowrap w-[125px]">Pago / Origen</th>
                  <th className="py-3 px-3 align-middle whitespace-nowrap w-[120px]">Cajero</th>
                  <th className="py-3 px-3 align-middle text-center whitespace-nowrap w-[90px]">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-xs sm:text-sm">
                {filteredGastos.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-16 text-stone-400">
                      <Receipt className="w-12 h-12 mx-auto text-stone-300 mb-3" />
                      <p className="font-black text-base sm:text-lg text-stone-700">No se encontraron gastos con los filtros aplicados</p>
                      <p className="text-sm text-stone-500 mt-1">Prueba cambiando la sucursal o los filtros de búsqueda.</p>
                    </td>
                  </tr>
                ) : (
                  filteredGastos.map((g, idx) => {
                    const isAnulado = g.status === "anulado";
                    const catInfo = getCategoryInfo(g.category, g.description);
                    const { isHoy, formattedDate, timeStr, cleanDate } = getExpenseDateTimeInfo(g);
                    const isNearBottom = idx >= filteredGastos.length - 2;
                    const displayCashier = getDisplayCashier(g);

                    return (
                      <tr
                        key={g.id}
                        className={`transition-colors group ${
                          isAnulado
                            ? "bg-stone-50/80 opacity-60 border-l-4 border-l-stone-300"
                            : isHoy
                            ? "border-l-4 border-l-amber-500 bg-amber-50/40 hover:bg-amber-100/60 shadow-xs"
                            : "border-l-4 border-l-transparent hover:bg-stone-50/70"
                        }`}
                      >
                        {/* 1. Folio */}
                        <td className="py-2.5 px-3 align-middle whitespace-nowrap w-[100px]">
                          <span className="font-mono tabular-nums font-bold text-[11px] text-stone-800 bg-stone-100 border border-stone-200/90 px-2 py-0.5 rounded-md inline-block">
                            {cleanFolio(g.id)}
                          </span>
                        </td>

                        {/* 2. Fecha */}
                        <td className="py-2.5 px-3 align-middle whitespace-nowrap w-[95px]">
                          {isHoy ? (
                            <div className="flex flex-col leading-tight">
                              <span className={`font-mono font-black text-xs ${isAnulado ? "line-through text-stone-400" : "text-stone-900"}`}>{timeStr || "Hoy"}</span>
                              {!isAnulado && (
                                <span className="text-[9px] text-amber-600 font-black uppercase tracking-wider">
                                  HOY
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col leading-tight">
                              <span className={`font-bold text-[11px] ${isAnulado ? "line-through text-stone-400" : "text-stone-800"}`}>
                                {cleanDate}
                              </span>
                              {timeStr && (
                                <span className="text-[9px] font-mono text-stone-400 font-medium">
                                  {timeStr}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* 3. Sucursal */}
                        <td className="py-2.5 px-3 align-middle whitespace-nowrap w-[130px]">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-800 bg-stone-100 px-2.5 py-1 rounded-lg border border-stone-200/80">
                            <Store className="w-3.5 h-3.5 text-brito-orange-600 shrink-0" />
                            <span>{(g.branchName || "Matriz").replace("Sucursal ", "").replace(" (Centro)", "")}</span>
                          </span>
                        </td>

                        {/* 4. Categoría */}
                        <td className="py-2.5 px-3 align-middle whitespace-nowrap w-[145px]">
                          <span
                            className={`px-2.5 py-1 rounded-lg font-bold text-xs inline-flex items-center gap-1.5 border shadow-2xs ${
                              isAnulado
                                ? "bg-stone-200 text-stone-600 border-stone-300 line-through"
                                : `${catInfo.bg} ${catInfo.text} ${catInfo.border}`
                            }`}
                            title={g.categoryLabel || catInfo.label}
                          >
                            <span className="text-xs shrink-0">{catInfo.icon}</span>
                            <span>{catInfo.shortLabel || catInfo.label || "Gasto"}</span>
                          </span>
                        </td>

                        {/* 5. Concepto / Motivo */}
                        <td className="py-2.5 px-3.5 align-middle min-w-[180px]">
                          <div className={`font-bold text-xs sm:text-sm text-stone-900 leading-snug ${isAnulado ? "line-through text-stone-500" : ""}`} title={g.description}>
                            {g.description}
                          </div>
                          {g.supplier && (
                            <div className="text-[10.5px] text-stone-500 mt-0.5" title={g.supplier}>
                              Prov: <strong className="text-stone-700 font-semibold">{g.supplier}</strong>
                            </div>
                          )}
                          {isAnulado && g.cancelReason && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-red-100 text-red-800 font-bold text-[9.5px] rounded border border-red-200">
                              {g.cancelReason}
                            </span>
                          )}
                        </td>

                        {/* 6. Monto */}
                        <td className="py-2.5 px-3 align-middle text-right font-mono tabular-nums font-black text-xs sm:text-sm whitespace-nowrap w-[120px]">
                          <span className={isAnulado ? "line-through text-stone-400" : "text-rose-700 text-sm font-black"}>
                            -{formatCurrency(g.amount)}
                          </span>
                        </td>

                        {/* 7. Forma de Pago y Origen */}
                        <td className="py-2.5 px-3 align-middle text-center whitespace-nowrap w-[125px]">
                          <div className="inline-flex flex-col items-center leading-tight">
                            <span
                              className={`px-2 py-0.5 rounded-md font-black text-[10px] uppercase inline-flex items-center gap-1 border ${
                                g.paymentMethod === "efectivo"
                                  ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                  : g.paymentMethod === "tarjeta"
                                  ? "bg-blue-100 text-blue-800 border-blue-200"
                                  : "bg-purple-100 text-purple-800 border-purple-200"
                              }`}
                            >
                              {g.paymentMethod === "efectivo" && <Wallet className="w-3 h-3 shrink-0" />}
                              {g.paymentMethod === "tarjeta" && <CreditCard className="w-3 h-3 shrink-0" />}
                              {g.paymentMethod === "transferencia" && <Building className="w-3 h-3 shrink-0" />}
                              <span>{g.paymentMethod === "transferencia" ? "SPEI" : g.paymentMethod}</span>
                            </span>
                            <span className="text-[10px] text-stone-500 font-medium mt-0.5 max-w-[120px] truncate" title={g.accountOrigin}>
                              {g.accountOrigin ? g.accountOrigin.replace(/\s*\(.*\)/, "") : "Caja Mostrador"}
                            </span>
                          </div>
                        </td>

                        {/* 8. Cajero */}
                        <td className="py-2.5 px-3 align-middle whitespace-nowrap w-[120px]" title={displayCashier}>
                          <div className="flex flex-col leading-tight">
                            <span className="font-bold text-xs text-stone-900 truncate max-w-[115px]">
                              {displayCashier.split(" - ")[0]}
                            </span>
                            {displayCashier.includes(" - ") && (
                              <span className="text-[10px] text-stone-500 font-medium truncate max-w-[115px]">
                                {displayCashier.split(" - ").slice(1).join(" - ")}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 9. Acciones */}
                        <td className="py-2.5 px-3 align-middle text-center whitespace-nowrap w-[90px]">
                          <div className="relative inline-block text-left">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdown(activeDropdown === g.id ? null : g.id);
                              }}
                              className="inline-flex items-center justify-center gap-1 px-2.5 py-1 bg-stone-100 hover:bg-stone-200 active:scale-95 border border-stone-200 text-stone-800 font-bold rounded-lg text-xs transition-all cursor-pointer shadow-2xs w-full max-w-[76px]"
                            >
                              <span>Acción</span>
                              <ChevronDown className="w-3 h-3 text-stone-500 shrink-0" />
                            </button>

                            {activeDropdown === g.id && (
                              <div
                                className={`absolute right-0 w-48 bg-white rounded-2xl shadow-2xl border border-stone-200 py-1.5 z-40 animate-in fade-in zoom-in-95 text-xs text-left font-bold ${
                                  isNearBottom ? "bottom-full mb-1" : "top-full mt-1"
                                }`}
                              >
                                {/* Ver Detalle */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setGastoSeleccionado(g);
                                    setModalVerOpen(true);
                                    setActiveDropdown(null);
                                  }}
                                  className="w-full px-3 py-2 text-stone-700 hover:bg-stone-50 flex items-center gap-2 cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5 text-blue-600" />
                                  <span>Ver Detalle</span>
                                </button>

                                {/* Imprimir Vale */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setGastoSeleccionado(g);
                                    setModalReceiptOpen(true);
                                    setActiveDropdown(null);
                                  }}
                                  className="w-full px-3 py-2 text-stone-700 hover:bg-stone-50 flex items-center gap-2 cursor-pointer"
                                >
                                  <Printer className="w-3.5 h-3.5 text-stone-600" />
                                  <span>Imprimir Vale (80mm)</span>
                                </button>

                                {!isAnulado && (
                                  <>
                                    {/* Editar */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        abrirEditarGasto(g);
                                        setActiveDropdown(null);
                                      }}
                                      className="w-full px-3 py-2 text-stone-700 hover:bg-stone-50 flex items-center gap-2 cursor-pointer"
                                    >
                                      <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                                      <span>Editar Gasto</span>
                                    </button>

                                    {/* Anular */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        abrirAnularGasto(g);
                                        setActiveDropdown(null);
                                      }}
                                      className="w-full px-3 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2 border-t border-stone-100 cursor-pointer"
                                    >
                                      <Ban className="w-3.5 h-3.5 text-rose-600" />
                                      <span>Anular Gasto</span>
                                    </button>
                                  </>
                                )}

                                {/* Eliminar Permanente */}
                                <button
                                  type="button"
                                  onClick={() => handleEliminarGastoPermanente(g)}
                                  className="w-full px-3 py-2 text-stone-600 hover:text-red-700 hover:bg-rose-50/50 flex items-center gap-2 border-t border-stone-100 cursor-pointer"
                                  title="Eliminar registro definitivamente"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-stone-400 group-hover:text-red-600" />
                                  <span>Eliminar Registro</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* ── MODO 2: FICHAS RESPONSIVAS (MÓVIL, TABLET Y PANTALLAS COMPACTAS) ── */
          <div className="p-3 sm:p-4 lg:p-5">
            {filteredGastos.length === 0 ? (
              <div className="text-center py-16 text-stone-400">
                <Receipt className="w-12 h-12 mx-auto text-stone-300 mb-3" />
                <p className="font-black text-base sm:text-lg text-stone-700">No se encontraron gastos con los filtros aplicados</p>
                <p className="text-sm text-stone-500 mt-1">Prueba cambiando la sucursal o los filtros de búsqueda.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4">
                {filteredGastos.map((g) => {
                  const isAnulado = g.status === "anulado";
                  const catInfo = getCategoryInfo(g.category, g.description);
                  const { isHoy, formattedDate, timeStr, cleanDate } = getExpenseDateTimeInfo(g);
                  const displayCashier = getDisplayCashier(g);

                  return (
                    <div
                      key={g.id}
                      className={`bg-white rounded-2xl border p-3.5 sm:p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between gap-3 border-l-4 ${
                        isAnulado
                          ? "border-l-stone-300 opacity-60 bg-stone-50/60"
                          : isHoy
                          ? "border-l-amber-500 bg-amber-50/20 hover:bg-amber-50/40"
                          : "border-l-rose-500 hover:bg-rose-50/20"
                      }`}
                    >
                      {/* Cabecera: Folio, Sucursal, Fecha y Monto */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono tabular-nums font-black text-xs text-stone-900 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-lg shadow-2xs">
                              {cleanFolio(g.id)}
                            </span>
                            <span className="text-[10px] font-bold text-stone-600 bg-stone-50 border border-stone-200 px-1.5 py-0.5 rounded-md">
                              🏬 {(g.branchName || "Matriz").replace("Sucursal ", "")}
                            </span>
                            {isHoy && !isAnulado && (
                              <span className="bg-amber-500 text-white font-black text-[10px] px-1.5 py-0.2 rounded-md uppercase tracking-wider">
                                Hoy
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-stone-500 font-semibold mt-1">
                            📅 {formattedDate}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <span className={`font-mono tabular-nums font-black text-base sm:text-lg block ${isAnulado ? "line-through text-stone-400" : "text-rose-700"}`}>
                            -{formatCurrency(g.amount)}
                          </span>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md inline-block border mt-0.5 ${
                            g.paymentMethod === "efectivo"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : g.paymentMethod === "tarjeta"
                              ? "bg-blue-50 text-blue-800 border-blue-200"
                              : "bg-purple-50 text-purple-800 border-purple-200"
                          }`}>
                            {g.paymentMethod}
                          </span>
                        </div>
                      </div>

                      {/* Concepto y Categoría */}
                      <div className="bg-stone-50/80 rounded-xl p-2.5 border border-stone-200/70 text-xs">
                        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] inline-flex items-center gap-1 border ${catInfo.bg} ${catInfo.text} ${catInfo.border}`}>
                            <span>{catInfo.icon}</span>
                            <span>{g.categoryLabel || catInfo.label}</span>
                          </span>
                        </div>
                        <p className="font-bold text-stone-900 text-xs sm:text-sm leading-snug">
                          {g.description}
                        </p>
                        {g.supplier && (
                          <p className="text-[11px] text-stone-500 mt-1">
                            Prov: <strong className="text-stone-700">{g.supplier}</strong>
                          </p>
                        )}
                        {isAnulado && g.cancelReason && (
                          <span className="inline-block mt-1 px-1.5 py-0.2 bg-red-100 text-red-800 font-bold text-[10px] rounded border border-red-200">
                            Motivo: {g.cancelReason}
                          </span>
                        )}
                      </div>

                      {/* Cuenta / Origen & Cajero */}
                      <div className="space-y-0.5 text-xs">
                        <p className="text-[11px] text-stone-700 font-bold leading-tight" title={g.accountOrigin}>
                          🏦 {g.accountOrigin}
                        </p>
                        <p className="text-[11px] text-stone-500 font-medium">
                          👤 Cajero: <strong className="text-stone-800 font-bold">{displayCashier}</strong>
                        </p>
                      </div>

                      {/* Botonera Directa de Acciones */}
                      <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-stone-100">
                        <button
                          type="button"
                          onClick={() => {
                            setGastoSeleccionado(g);
                            setModalVerOpen(true);
                          }}
                          className="flex-1 py-1.5 px-2 bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                          title="Ver Detalle Completo"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>Detalle</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setGastoSeleccionado(g);
                            setModalReceiptOpen(true);
                          }}
                          className="flex-1 py-1.5 px-2 bg-stone-100 hover:bg-amber-100 active:scale-95 text-stone-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                          title="Imprimir Vale de Caja"
                        >
                          <Printer className="w-3.5 h-3.5 text-stone-600 shrink-0" />
                          <span>Vale</span>
                        </button>

                        {!isAnulado && (
                          <>
                            <button
                              type="button"
                              onClick={() => abrirEditarGasto(g)}
                              className="py-1.5 px-2.5 bg-amber-50 hover:bg-amber-100 active:scale-95 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer shadow-2xs"
                              title="Editar Gasto"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                            </button>

                            <button
                              type="button"
                              onClick={() => abrirAnularGasto(g)}
                              className="py-1.5 px-2.5 bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-700 border border-rose-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer shadow-2xs"
                              title="Anular Gasto"
                            >
                              <Ban className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() => handleEliminarGastoPermanente(g)}
                          className="py-1.5 px-2.5 bg-stone-100 hover:bg-rose-100 active:scale-95 text-stone-500 hover:text-rose-700 border border-stone-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer shadow-2xs"
                          title="Eliminar Registro"
                        >
                          <Trash2 className="w-3.5 h-3.5 shrink-0" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modal: Registrar Nuevo Gasto ── */}
      {modalNuevoOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-4 border border-stone-100 animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto transition-all duration-200 hover:border-rose-400/60 hover:ring-2 hover:ring-rose-400/20">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl">
                  <TrendingDown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-stone-900">Registrar Salida de Dinero / Gasto</h3>
                  <p className="text-[11px] text-stone-500">Materia prima, gas LP, nómina o gastos operativos.</p>
                </div>
              </div>
              <button
                onClick={() => setModalNuevoOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCrearGasto} className="space-y-4 text-xs">
              {/* 1. Monto Principal */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-black text-stone-900 text-xs">
                    Monto Total del Gasto ($ MXN) *
                  </label>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Acepta desde $1.00 MXN
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-2xl text-rose-600">$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    autoFocus
                    placeholder="1.00"
                    value={form.amount}
                    onKeyDown={(e) => onlyNumbersKeyDown(e, true)}
                    onChange={(e) => setForm({ ...form, amount: cleanDecimalNumbers(e.target.value) })}
                    className="w-full pl-10 pr-4 py-3 bg-stone-50 rounded-2xl border-2 border-stone-200 focus:border-rose-500 focus:bg-white focus:outline-none text-2xl font-black text-stone-900 shadow-inner"
                  />
                </div>

                {/* Nominaciones rápidas en cuadros */}
                <div className="grid grid-cols-5 gap-2 pt-1.5">
                  {QUICK_AMOUNTS.map((amt) => {
                    const isSelected = form.amount === amt.toString();
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setForm({ ...form, amount: amt.toString() })}
                        className={`py-3 sm:py-3.5 rounded-2xl border-2 font-black text-sm sm:text-base transition-all active:scale-95 shadow-xs cursor-pointer flex items-center justify-center ${
                          isSelected
                            ? "bg-rose-600 text-white border-rose-600 shadow-md scale-102 ring-2 ring-rose-400/30"
                            : "bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 text-stone-900 border-stone-200"
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
                  <label className="font-black text-stone-900">Sucursal que Egresa *</label>
                  <select
                    value={form.branchId}
                    onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold text-xs text-stone-900 focus:ring-2 focus:ring-rose-500 focus:outline-none cursor-pointer"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-black text-stone-900">Categoría del Gasto *</label>
                  <select
                    value={form.categoriaId}
                    onChange={(e) => setForm({ ...form, categoriaId: e.target.value })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold text-xs text-stone-900 focus:ring-2 focus:ring-rose-500 focus:outline-none cursor-pointer"
                  >
                    {GASTO_CATEGORIAS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3. Forma de Pago y Cuenta de Origen */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-black text-stone-900">Forma de Pago *</label>
                  <div className="grid grid-cols-3 gap-1">
                    {(["efectivo", "tarjeta", "transferencia"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setForm({ ...form, paymentMethod: m })}
                        className={`py-2 rounded-xl font-bold text-[11px] border transition-all text-center ${
                          form.paymentMethod === m
                            ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                            : "bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100"
                        }`}
                      >
                        {m === "efectivo" ? "💵 Efvo" : m === "tarjeta" ? "💳 Tarj" : "🏦 SPEI"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-black text-stone-900">Caja / Cuenta de Origen *</label>
                  <select
                    value={form.accountOrigin}
                    onChange={(e) => setForm({ ...form, accountOrigin: e.target.value })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold text-xs text-stone-900 focus:ring-2 focus:ring-rose-500 focus:outline-none cursor-pointer"
                  >
                    {CUENTAS_ORIGEN.map((acc) => (
                      <option key={acc.id} value={acc.name}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 4. Concepto y Proveedor */}
              <div className="space-y-1">
                <label className="font-black text-stone-900">Concepto / Motivo del Egreso *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Carga de 200L gas LP hornos, compra de 5 costales de harina..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-xs font-medium text-stone-900 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-stone-700">Proveedor o Beneficiario (opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej. Harinera San Blas, Gas Silza, Técnico..."
                    value={form.supplier}
                    onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                    className="w-full p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-xs font-medium text-stone-900 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-stone-700">Fecha de Egreso *</label>
                  <input
                    type="date"
                    required
                    value={form.fecha}
                    onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                    className="w-full p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-xs font-medium text-stone-900 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {/* 5. Notas / Observaciones */}
              <div className="space-y-1">
                <label className="font-bold text-stone-700">Notas / Folio de Factura (opcional)</label>
                <textarea
                  rows={2}
                  placeholder="Número de remisión, factura o aclaraciones..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-xs font-medium text-stone-900 focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Botones de Acción */}
              <div className="flex gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setModalNuevoOpen(false)}
                  className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !form.amount || Number(form.amount) <= 0 || !form.description.trim()}
                  className="flex-1 py-3 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-black rounded-xl shadow-lg shadow-rose-600/25 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? "Guardando..." : "Guardar Gasto"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Editar Gasto ── */}
      {modalEditarOpen && gastoSeleccionado && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-4 border border-stone-100 animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto transition-all duration-200 hover:border-amber-400/60 hover:ring-2 hover:ring-amber-400/20">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-stone-900">Editar Gasto #{gastoSeleccionado.id}</h3>
                  <p className="text-[11px] text-stone-500">Actualiza los datos del comprobante de egreso.</p>
                </div>
              </div>
              <button
                onClick={() => setModalEditarOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGuardarEdicion} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-black text-stone-900">Monto ($ MXN) *</label>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  placeholder="0.00"
                  value={form.amount}
                  onKeyDown={(e) => onlyNumbersKeyDown(e, true)}
                  onChange={(e) => setForm({ ...form, amount: cleanDecimalNumbers(e.target.value) })}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-base font-black text-stone-900 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-black text-stone-900">Sucursal *</label>
                  <select
                    value={form.branchId}
                    onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold text-xs text-stone-900"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-black text-stone-900">Categoría *</label>
                  <select
                    value={form.categoriaId}
                    onChange={(e) => setForm({ ...form, categoriaId: e.target.value })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold text-xs text-stone-900"
                  >
                    {GASTO_CATEGORIAS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-black text-stone-900">Concepto / Motivo *</label>
                <input
                  type="text"
                  required
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-xs font-medium text-stone-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-stone-700">Proveedor</label>
                  <input
                    type="text"
                    value={form.supplier}
                    onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                    className="w-full p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-stone-700">Cuenta / Origen</label>
                  <select
                    value={form.accountOrigin}
                    onChange={(e) => setForm({ ...form, accountOrigin: e.target.value })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold text-xs"
                  >
                    {CUENTAS_ORIGEN.map((acc) => (
                      <option key={acc.id} value={acc.name}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setModalEditarOpen(false)}
                  className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-stone-900 hover:bg-black text-white font-black rounded-xl shadow-md"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Ver Detalle de Gasto ── */}
      {modalVerOpen && gastoSeleccionado && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-stone-100 animate-in fade-in zoom-in-95 transition-all duration-200 hover:border-rose-400/60 hover:ring-2 hover:ring-rose-400/20">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-stone-900">Detalle de Gasto #{gastoSeleccionado.id}</h3>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    gastoSeleccionado.status === "anulado"
                      ? "bg-red-100 text-red-800"
                      : "bg-emerald-100 text-emerald-800"
                  }`}>
                    {gastoSeleccionado.status === "anulado" ? "Anulado" : "Activo en Contabilidad"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setModalVerOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-stone-500">Monto:</span>
                  <span className="font-black text-xl text-rose-700 font-mono">
                    {formatCurrency(gastoSeleccionado.amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Sucursal:</span>
                  <span className="font-bold text-stone-900">{gastoSeleccionado.branchName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Categoría:</span>
                  <span className="font-bold text-stone-900">{gastoSeleccionado.categoryLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Método de Pago:</span>
                  <span className="font-bold text-stone-900 uppercase">{gastoSeleccionado.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Cuenta de Origen:</span>
                  <span className="font-bold text-stone-900">{gastoSeleccionado.accountOrigin}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Registrado por:</span>
                  <span className="font-bold text-stone-900">{gastoSeleccionado.cashier}</span>
                </div>
                {gastoSeleccionado.supplier && (
                  <div className="flex justify-between">
                    <span className="text-stone-500">Proveedor:</span>
                    <span className="font-bold text-stone-900">{gastoSeleccionado.supplier}</span>
                  </div>
                )}
              </div>

              <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200">
                <span className="text-[10px] font-bold text-stone-400 uppercase block mb-1">Concepto:</span>
                <p className="text-stone-800 font-medium">{gastoSeleccionado.description}</p>
                {gastoSeleccionado.notes && (
                  <p className="text-[11px] text-stone-500 mt-2 italic">Notas: {gastoSeleccionado.notes}</p>
                )}
              </div>

              {gastoSeleccionado.status === "anulado" && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-red-800">
                  <span className="text-[10px] font-black uppercase block">Motivo de Anulación:</span>
                  <p className="font-bold mt-0.5">{gastoSeleccionado.cancelReason || "Sin motivo especificado"}</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    setModalVerOpen(false);
                    setModalReceiptOpen(true);
                  }}
                  className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-xl flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>Ver Vale 80mm</span>
                </button>
                <button
                  onClick={() => setModalVerOpen(false)}
                  className="flex-1 py-2.5 bg-stone-900 hover:bg-black text-white font-bold rounded-xl"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Anular Gasto (Con Motivo Obligatorio como Sairec ERP) ── */}
      {modalAnularOpen && gastoSeleccionado && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-stone-100 animate-in fade-in zoom-in-95 transition-all duration-200 hover:border-rose-400/60 hover:ring-2 hover:ring-rose-400/20">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-stone-900">Anular Gasto #{gastoSeleccionado.id}</h3>
                  <p className="text-[11px] text-stone-500">El gasto no se eliminará físicamente, quedará registrado como ANULADO.</p>
                </div>
              </div>
              <button
                onClick={() => setModalAnularOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-rose-50 p-3.5 rounded-2xl border border-rose-200 text-rose-900 space-y-1">
                <div className="flex justify-between font-bold">
                  <span>Monto a anular:</span>
                  <span className="font-mono text-sm font-black">{formatCurrency(gastoSeleccionado.amount)}</span>
                </div>
                <div className="text-[11px] text-rose-700">
                  Concepto: {gastoSeleccionado.description} ({gastoSeleccionado.branchName})
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-black text-stone-900">
                  Motivo de la Anulación *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Ej. Error en monto capturado, compra cancelada por proveedor..."
                  value={motivoAnulacion}
                  onChange={(e) => setMotivoAnulacion(e.target.value)}
                  className="w-full p-3 bg-stone-50 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium text-stone-900"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalAnularOpen(false)}
                  className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!motivoAnulacion.trim()}
                  onClick={handleConfirmarAnulacion}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-black rounded-xl shadow-md"
                >
                  Confirmar Anulación
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de Impresión Térmica (80mm) ── */}
      <ExpenseReceiptModal
        isOpen={modalReceiptOpen}
        onClose={() => setModalReceiptOpen(false)}
        expense={gastoSeleccionado}
      />
    </div>
  );
}
