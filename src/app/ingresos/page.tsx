"use client";

import { useState, useEffect } from "react";
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
  Check,
  Building2,
  Sparkles,
  RefreshCw,
  Radio
} from "lucide-react";
import { CashIncome, CashIncomeCategory, Customer, CustomOrder } from "@/types";
import { formatCurrency, formatDateTimeSafe, onlyNumbersKeyDown, cleanDecimalNumbers } from "@/lib/utils";
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

{/* Componente Gráfico SVG: Símbolo de gráfica hacia arriba que representa ingresos */}
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

      {/* Línea base horizontal de la gráfica */}
      <line x1="3" y1="31" x2="33" y2="31" stroke="#047857" strokeWidth="1.5" strokeLinecap="round" />

      {/* Barras de gráfica en ascenso */}
      <rect x="4" y="21" width="5" height="10" rx="1.5" fill="url(#incBarGrad1)" />
      <rect x="11.5" y="15" width="5" height="16" rx="1.5" fill="url(#incBarGrad2)" />
      <rect x="19" y="9" width="5" height="22" rx="1.5" fill="url(#incBarGrad3)" />

      {/* Línea de tendencia alcista con flecha que sube */}
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

      {/* Punto brillante de meta en la cima */}
      <circle cx="30" cy="3.5" r="2" fill="#ffffff" />

      {/* Moneda / Insignia de Dinero/Ingresos ($) */}
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

const CATEGORY_OPTIONS: { id: CashIncomeCategory; label: string; shortLabel: string; icon: string }[] = [
  { id: "venta_mostrador", label: "Ventas de Mostrador (Panadería / POS)", shortLabel: "Ventas Mostrador", icon: "🥖" },
  { id: "abono_pedido", label: "Abono a Pedido Especial (Pasteles/Eventos)", shortLabel: "Abono a Pedido", icon: "🎂" },
  { id: "abono_cliente", label: "Cobro a Cliente Mayorista / Tiendita", shortLabel: "Cobro a Cliente", icon: "🏪" },
  { id: "fondo_cambio", label: "Aportación de Cambio / Fondo Adicional", shortLabel: "Fondo de Cambio", icon: "🪙" },
  { id: "venta_costales", label: "Venta de Costales de Harina / Reciclaje", shortLabel: "Venta de Costales", icon: "🌾" },
  { id: "ingreso_extraordinario", label: "Ingreso Extraordinario / Varios", shortLabel: "Ingreso Extra", icon: "✨" },
  { id: "otro", label: "Otro Concepto", shortLabel: "Otro Concepto", icon: "💵" },
];

const QUICK_AMOUNTS = [50, 100, 200, 500, 1000, 2000];

export default function IngresosPage() {
  const { user } = useAuth();
  const { branches, currentBranch } = useBranch();
  const { addNotification } = useNotifications();

  const [incomes, setIncomes] = useState<CashIncome[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"all" | CashIncomeCategory>("all");
  const [selectedMethod, setSelectedMethod] = useState<"all" | "efectivo" | "tarjeta" | "transferencia">("all");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [lastSyncTime, setLastSyncTime] = useState<string>("En vivo");
  
  // Modals state
  const [isNewIncomeModalOpen, setIsNewIncomeModalOpen] = useState(false);
  const [receiptIncome, setReceiptIncome] = useState<CashIncome | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // New Income Form State
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<CashIncomeCategory>("abono_pedido");
  const [paymentMethod, setPaymentMethod] = useState<"efectivo" | "tarjeta" | "transferencia">("efectivo");
  const [concept, setConcept] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [branchName, setBranchName] = useState(currentBranch ? currentBranch.name : "Sucursal Matriz Centro");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cargar ingresos con sincronización inmediata de compras POS y tiempo real
  useEffect(() => {
    // 1. Sincronizar todas las ventas previas de mostrador para que entren aquí directamente
    syncMissingSalesToIncomes();
    const loaded = getStoredIncomes();
    setIncomes(loaded);

    // 2. Escuchar evento de actualización local
    const handleLocalUpdate = () => {
      setIncomes(getStoredIncomes());
      setLastSyncTime(new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    };
    window.addEventListener("brito_incomes_updated", handleLocalUpdate);
    window.addEventListener("storage", handleLocalUpdate);

    // 3. Suscribirse a ventas en tiempo real de cualquier sucursal (WebSocket)
    const unsubSale = realtimeHub.onSale(() => {
      setTimeout(() => {
        setIncomes(getStoredIncomes());
        setLastSyncTime(new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      }, 60);
    });

    // 4. Suscribirse a entradas de caja de cualquier sucursal
    const unsubCash = realtimeHub.onCashMovement((mov) => {
      if (mov.type === "entrada") {
        setTimeout(() => {
          setIncomes(getStoredIncomes());
          setLastSyncTime(new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
        }, 60);
      }
    });

    // 5. Suscribirse a pagos y anticipos de pedidos especiales
    const unsubOrder = realtimeHub.onOrder(() => {
      setTimeout(() => {
        setIncomes(getStoredIncomes());
        setLastSyncTime(new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      }, 60);
    });

    return () => {
      window.removeEventListener("brito_incomes_updated", handleLocalUpdate);
      window.removeEventListener("storage", handleLocalUpdate);
      unsubSale();
      unsubCash();
      unsubOrder();
    };
  }, []);

  // Update default branch when context updates
  useEffect(() => {
    if (currentBranch) {
      setBranchName(currentBranch.name);
    }
  }, [currentBranch]);

  // Guardar en almacenamiento sin límite de monto
  const saveIncomes = (newIncomes: CashIncome[]) => {
    saveStoredIncomes(newIncomes);
    setIncomes(newIncomes);
  };

  // KPIs Calculations - Sin ningún límite artificial de dinero
  const totalAmount = incomes.reduce((sum, inc) => sum + inc.amount, 0);
  const posSalesAmount = incomes
    .filter((inc) => inc.category === "venta_mostrador")
    .reduce((sum, inc) => sum + inc.amount, 0);
  const ordersDepositsAmount = incomes
    .filter((inc) => inc.category === "abono_pedido")
    .reduce((sum, inc) => sum + inc.amount, 0);
  const wholesaleRecovered = incomes
    .filter((inc) => inc.category === "abono_cliente")
    .reduce((sum, inc) => sum + inc.amount, 0);
  const cashAmount = incomes
    .filter((inc) => inc.paymentMethod === "efectivo")
    .reduce((sum, inc) => sum + inc.amount, 0);
  const cardAmount = incomes
    .filter((inc) => inc.paymentMethod === "tarjeta")
    .reduce((sum, inc) => sum + inc.amount, 0);
  const transferAmount = incomes
    .filter((inc) => inc.paymentMethod === "transferencia")
    .reduce((sum, inc) => sum + inc.amount, 0);

  // Filtered List
  const filteredIncomes = incomes.filter((inc) => {
    const matchesSearch =
      inc.concept.toLowerCase().includes(search.toLowerCase()) ||
      inc.id.toLowerCase().includes(search.toLowerCase()) ||
      (inc.customerName && inc.customerName.toLowerCase().includes(search.toLowerCase())) ||
      (inc.orderNumber && inc.orderNumber.toLowerCase().includes(search.toLowerCase())) ||
      (inc.saleId && inc.saleId.toLowerCase().includes(search.toLowerCase())) ||
      inc.cashier.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = selectedCategory === "all" || inc.category === selectedCategory;
    const matchesMethod = selectedMethod === "all" || inc.paymentMethod === selectedMethod;
    const matchesBranch = selectedBranch === "all" || inc.branchName === selectedBranch;

    return matchesSearch && matchesCategory && matchesMethod && matchesBranch;
  });

  const handleCreateIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0 || !concept.trim()) return;

    setIsSubmitting(true);
    const catObj = CATEGORY_OPTIONS.find((c) => c.id === category);

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

    // Try Supabase insert
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

    // Transmitir por WebSocket a todas las computadoras y celulares
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

    // Enviar notificación al Administrador Don Toño
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

    // Reset Form
    setAmount("");
    setConcept("");
    setCustomerName("");
    setOrderNumber("");
    setReferenceNumber("");

    // Open receipt modal automatically
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
    const headers = "Folio,Fecha,Categoria,Concepto,Cliente,Pedido,Metodo,Monto,Cajero,Sucursal\n";
    const rows = filteredIncomes
      .map(
        (i) =>
          `"${i.id}","${i.date}","${i.categoryLabel}","${i.concept.replace(/"/g, '""')}","${i.customerName || ""}","${i.orderNumber || i.saleId || ""}","${i.paymentMethod}",${i.amount},"${i.cashier}","${i.branchName || ""}"`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `ingresos_panaderia_brito_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full space-y-5 sm:space-y-6">
      {/* Top Header */}
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
                Todas las compras desde 1 solo pan en mostrador hasta pedidos especiales y cobros de mayoreo de cualquier sucursal, sin límite de monto.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/pos"
            className="flex items-center gap-1.5 bg-stone-900 hover:bg-black text-white font-extrabold px-4 py-2.5 rounded-xl shadow-md text-xs transition-all active:scale-95"
          >
            <ShoppingBag className="w-4 h-4 text-amber-400" /> Ir a POS (Ventas)
          </Link>
          <Link
            href="/caja"
            className="flex items-center gap-1.5 bg-white hover:bg-stone-50 text-stone-700 font-extrabold px-4 py-2.5 rounded-xl border border-stone-200 shadow-sm text-xs transition-all"
          >
            <Wallet className="w-4 h-4 text-emerald-600" /> Ver Caja
          </Link>
          <button
            onClick={handlePurgeDuplicates}
            className="flex items-center gap-1.5 bg-white hover:bg-stone-50 text-stone-700 font-bold px-3 py-2.5 rounded-xl border border-stone-200 shadow-sm text-xs transition-all active:scale-95"
            title="Limpiar cualquier registro repetido para conservar únicamente 1 por compra"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-600" /> Depurar Duplicados
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 bg-white hover:bg-stone-50 text-stone-700 font-bold px-3.5 py-2.5 rounded-xl border border-stone-200 shadow-sm text-xs transition-all"
            title="Exportar listado a archivo CSV Excel"
          >
            <Download className="w-4 h-4" /> Exportar
          </button>
          <button
            onClick={() => setIsNewIncomeModalOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-black px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-600/25 text-xs transition-all active:scale-95"
          >
            <PlusCircle className="w-4 h-4" /> Registrar Nuevo Ingreso
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total General de Ingresos */}
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-950 to-stone-950 p-5 rounded-3xl border border-emerald-800/60 shadow-xl text-white transition-all duration-200 hover:border-emerald-400 hover:shadow-2xl hover:shadow-emerald-900/30 hover:ring-2 hover:ring-emerald-400/30 hover:-translate-y-0.5 cursor-default group">
          {/* Resplandor decorativo de fondo */}
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/20 transition-all duration-300" />

          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-200 uppercase tracking-wider">Total Entradas Hoy</span>
            {/* Símbolo Gráfico de Ingresos Alcistas */}
            <div 
              className="p-2 bg-gradient-to-br from-emerald-800/60 via-emerald-900/80 to-stone-950 text-emerald-300 rounded-2xl border border-emerald-500/40 shadow-lg shadow-emerald-950/50 hover:border-emerald-300 transition-all flex items-center justify-center shrink-0"
              title="Gráfica de ingresos en tendencia alcista"
            >
              <IncomeUpwardChartSymbol className="w-8 h-8" />
            </div>
          </div>

          <div className="flex items-end justify-between gap-3 mt-1">
            <div>
              <p className="text-3xl font-black text-emerald-300 tracking-tight font-mono">
                {formatCurrency(totalAmount)}
              </p>
              <p className="text-[11px] text-emerald-200/80 font-medium mt-1">
                {incomes.length} movimientos registrados (Sin límite de monto)
              </p>
            </div>

            {/* Mini gráfica visual de curva ascendente de ingresos */}
            <div className="flex flex-col items-end shrink-0 pl-2">
              <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-400/30 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>En alza</span>
              </div>
              <svg className="w-20 h-7 overflow-visible" viewBox="0 0 76 26" fill="none">
                <defs>
                  <linearGradient id="cardIncomeSparkline" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d="M2 22 C 16 20, 26 16, 38 14 C 50 12, 60 6, 74 3"
                  stroke="#34d399"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <path
                  d="M2 22 C 16 20, 26 16, 38 14 C 50 12, 60 6, 74 3 L 74 26 L 2 26 Z"
                  fill="url(#cardIncomeSparkline)"
                />
                <circle cx="74" cy="3" r="2.5" fill="#a7f3d0" />
              </svg>
            </div>
          </div>
        </div>

        {/* Ventas Mostrador (Desde 1 pan) */}
        <div className="bg-white p-5 rounded-3xl border border-amber-200/80 shadow-sm transition-all duration-200 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/10 hover:ring-2 hover:ring-amber-400/20 hover:-translate-y-0.5 cursor-default">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-800">Compras Mostrador (POS)</span>
            <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-700 tracking-tight font-mono">
            +{formatCurrency(posSalesAmount)}
          </p>
          <p className="text-[11px] text-stone-400 font-semibold mt-1">
            Desde 1 solo pan hasta charolas completas
          </p>
        </div>

        {/* Pedidos Especiales & Mayoreo */}
        <div className="bg-white p-5 rounded-3xl border border-rose-200/80 shadow-sm transition-all duration-200 hover:border-rose-400 hover:shadow-lg hover:shadow-rose-500/10 hover:ring-2 hover:ring-rose-400/20 hover:-translate-y-0.5 cursor-default">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-rose-800">Pedidos & Mayoreo</span>
            <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
              <Cake className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-700 tracking-tight font-mono">
            +{formatCurrency(ordersDepositsAmount + wholesaleRecovered)}
          </p>
          <p className="text-[11px] text-stone-400 font-semibold mt-1">
            Pasteles: {formatCurrency(ordersDepositsAmount)} • Mayoreo: {formatCurrency(wholesaleRecovered)}
          </p>
        </div>

        {/* Efectivo vs Bancos */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-sm transition-all duration-200 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/10 hover:ring-2 hover:ring-blue-400/20 hover:-translate-y-0.5 cursor-default">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500">Caja vs Bancos</span>
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-blue-700 tracking-tight font-mono">
            {formatCurrency(cashAmount)}
          </p>
          <p className="text-[11px] text-stone-400 font-semibold mt-1">
            Efectivo: {formatCurrency(cashAmount)} • Bancos: {formatCurrency(cardAmount + transferAmount)}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-sm space-y-4 transition-all duration-200 hover:border-emerald-400/80 hover:shadow-lg hover:shadow-emerald-500/10 hover:ring-2 hover:ring-emerald-400/20">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Buscar por folio ING-XXXX, ticket, cliente, concepto o cajero..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-stone-50 rounded-2xl border border-stone-200 text-sm sm:text-base font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none placeholder:text-stone-400 text-stone-900"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Payment Method Filter */}
            <select
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value as any)}
              className="bg-stone-50 px-4 py-2.5 rounded-xl border border-stone-200 text-sm font-bold text-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="all">Todas las Formas de Pago</option>
              <option value="efectivo">💵 Solo Efectivo</option>
              <option value="tarjeta">💳 Solo Tarjeta</option>
              <option value="transferencia">🏦 Solo Transferencia (SPEI)</option>
            </select>

            {/* Branch Filter */}
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-stone-50 px-4 py-2.5 rounded-xl border border-stone-200 text-sm font-bold text-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="all">Todas las Sucursales</option>
              {branches.map((b) => (
                <option key={b.id} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 text-sm">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-4 py-2 rounded-xl font-black text-sm whitespace-nowrap transition-all ${
              selectedCategory === "all"
                ? "bg-emerald-700 text-white shadow-sm"
                : "bg-stone-100 text-stone-700 hover:bg-stone-200"
            }`}
          >
            Todos ({incomes.length})
          </button>
          {CATEGORY_OPTIONS.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-all flex items-center gap-1.5 ${
                selectedCategory === cat.id
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "bg-stone-100 text-stone-700 hover:bg-stone-200"
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.shortLabel || cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Incomes History Table */}
      <div className="bg-white rounded-3xl border border-stone-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-stone-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Receipt className="w-6 h-6 text-emerald-600" />
            <h3 className="font-black text-lg sm:text-xl text-stone-900">Historial de Ingresos Registrados</h3>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100/80 px-3 py-1 rounded-full border border-emerald-200 hidden sm:inline-block">
              Entrada Directa de Sucursales
            </span>
          </div>
          <span className="text-sm font-bold text-stone-600 bg-stone-100 px-3 py-1 rounded-xl">
            Mostrando {filteredIncomes.length} de {incomes.length} movimientos
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-100/90 text-stone-700 font-black border-b border-stone-200 uppercase tracking-wider text-xs sm:text-sm">
              <tr>
                <th className="p-4">Folio</th>
                <th className="p-4">Fecha/Hora</th>
                <th className="p-4">Categoría</th>
                <th className="p-4">Concepto / Motivo</th>
                <th className="p-4">Cliente / Pedido</th>
                <th className="p-4">Forma de Pago</th>
                <th className="p-4">Sucursal</th>
                <th className="p-4">Cajero</th>
                <th className="p-4 text-right">Monto</th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-sm">
              {filteredIncomes.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-14 text-stone-400">
                    <Receipt className="w-12 h-12 mx-auto text-stone-300 mb-2.5" />
                    <p className="font-black text-base text-stone-700">No se encontraron registros de ingreso</p>
                    <p className="text-sm text-stone-500 mt-1">Prueba cambiando los filtros o registra uno nuevo.</p>
                  </td>
                </tr>
              ) : (
                filteredIncomes.map((inc) => (
                  <tr key={inc.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="p-4 font-mono font-black text-sm sm:text-base text-stone-900">
                      #{inc.id}
                    </td>
                    <td className="p-4 text-stone-600 font-semibold text-xs sm:text-sm whitespace-nowrap">
                      {inc.date}
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap block w-fit border ${
                        inc.category === "venta_mostrador"
                          ? "bg-amber-50 text-amber-900 border-amber-300 font-extrabold"
                          : inc.category === "abono_pedido"
                          ? "bg-rose-50 text-rose-800 border-rose-200"
                          : inc.category === "abono_cliente"
                          ? "bg-blue-50 text-blue-800 border-blue-200"
                          : "bg-emerald-50 text-emerald-800 border-emerald-200"
                      }`}>
                        {inc.category === "venta_mostrador" && "🥖 "}
                        {inc.category === "abono_pedido" && "🎂 "}
                        {inc.category === "abono_cliente" && "🏪 "}
                        {inc.categoryLabel}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-stone-950 text-sm sm:text-base max-w-xs">
                      {inc.concept}
                      {inc.referenceNumber && (
                        <span className="block font-mono text-xs text-blue-600 font-bold mt-1">
                          Ref: {inc.referenceNumber}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-stone-800 text-sm sm:text-base">
                      {inc.customerName ? (
                        <div className="font-black text-stone-950">{inc.customerName}</div>
                      ) : (
                        <span className="text-stone-400 italic font-medium">Público general</span>
                      )}
                      {inc.orderNumber && (
                        <span className="text-xs font-black text-rose-800 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 inline-block mt-1">
                          Pedido: {inc.orderNumber}
                        </span>
                      )}
                      {inc.saleId && (
                        <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 inline-block mt-1">
                          Ticket #{inc.saleId}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-3 py-1.5 rounded-xl font-black text-xs sm:text-sm uppercase inline-flex items-center gap-1.5 ${
                          inc.paymentMethod === "efectivo"
                            ? "bg-emerald-100 text-emerald-800"
                            : inc.paymentMethod === "tarjeta"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-purple-100 text-purple-800"
                        }`}
                      >
                        {inc.paymentMethod === "efectivo" && <Wallet className="w-4 h-4" />}
                        {inc.paymentMethod === "tarjeta" && <CreditCard className="w-4 h-4" />}
                        {inc.paymentMethod === "transferencia" && <Building className="w-4 h-4" />}
                        {inc.paymentMethod}
                      </span>
                    </td>
                    <td className="p-4 text-stone-700 font-bold text-xs sm:text-sm whitespace-nowrap">
                      {inc.branchName || "Matriz"}
                    </td>
                    <td className="p-4 text-stone-700 font-bold text-xs sm:text-sm whitespace-nowrap">
                      {inc.cashier}
                    </td>
                    <td className="p-4 text-right font-mono font-black text-base sm:text-lg text-emerald-700 whitespace-nowrap">
                      +{formatCurrency(inc.amount)}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handlePrintReceipt(inc)}
                          className="p-2 text-stone-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-all"
                          title="Imprimir Comprobante de Ingreso (80mm)"
                        >
                          <Printer className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteIncome(inc.id)}
                          className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          title="Eliminar registro"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Registrar Nuevo Ingreso */}
      {isNewIncomeModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-4 border border-stone-200/80 animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto transition-all duration-200 hover:border-emerald-400/60 hover:ring-2 hover:ring-emerald-400/20">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-stone-900">Registrar Entrada de Dinero</h3>
                  <p className="text-[11px] text-stone-500">Cualquier monto sin límite de dinero (Efectivo, Tarjeta o Transferencia).</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewIncomeModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateIncome} className="space-y-4 text-xs">
              {/* 1. Monto Principal */}
              <div className="space-y-1.5">
                <label className="font-black text-stone-900 text-xs">
                  Monto Recibido ($ MXN) *
                </label>
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

                {/* Botones rápidos de monto */}
                <div className="grid grid-cols-6 gap-1.5 pt-1">
                  {QUICK_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAmount(amt.toString())}
                      className="py-1.5 bg-stone-100 hover:bg-emerald-600 hover:text-white text-stone-800 font-extrabold text-xs rounded-xl border border-stone-200 transition-all active:scale-95"
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Categoría */}
              <div className="space-y-1">
                <label className="font-black text-stone-900">Tipo de Ingreso *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as CashIncomeCategory)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold text-xs text-stone-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.icon} {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Forma de Pago */}
              <div className="space-y-1">
                <label className="font-black text-stone-900">Forma de Pago *</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("efectivo")}
                    className={`py-2.5 px-3 rounded-xl font-bold text-xs border flex items-center justify-center gap-1.5 transition-all ${
                      paymentMethod === "efectivo"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                        : "bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100"
                    }`}
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>Efectivo en Caja</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("tarjeta")}
                    className={`py-2.5 px-3 rounded-xl font-bold text-xs border flex items-center justify-center gap-1.5 transition-all ${
                      paymentMethod === "tarjeta"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                        : "bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100"
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Tarjeta Bancaria</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("transferencia")}
                    className={`py-2.5 px-3 rounded-xl font-bold text-xs border flex items-center justify-center gap-1.5 transition-all ${
                      paymentMethod === "transferencia"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                        : "bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100"
                    }`}
                  >
                    <Building className="w-3.5 h-3.5" />
                    <span>Transferencia SPEI</span>
                  </button>
                </div>
              </div>

              {/* 4. Cliente / Pedido Vinculado */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-stone-700">Cliente / Negocio</label>
                  <input
                    type="text"
                    placeholder="Ej. Abarrotes Don Pepe o Sra. Carmen"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-xs font-medium text-stone-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-stone-700">Folio de Pedido (si aplica)</label>
                  <input
                    type="text"
                    placeholder="Ej. PED-101"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-xs font-mono font-bold text-stone-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* 5. Referencia SPEI & Sucursal */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-stone-700">Folio / Ref. de Transferencia</label>
                  <input
                    type="text"
                    placeholder="Ej. SPEI-883921"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-xs font-mono text-stone-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-stone-700">Sucursal</label>
                  <select
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold text-xs text-stone-900 focus:outline-none focus:border-emerald-500"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 6. Detalle del Movimiento */}
              <div className="space-y-1">
                <label className="font-black text-stone-900">Concepto / Detalle *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Ej. Liquidación semanal de pedido de 200 teleras para evento escolar..."
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  className="w-full p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs font-medium text-stone-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none leading-relaxed"
                />
              </div>

              {/* Submit and Cancel Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewIncomeModalOpen(false)}
                  className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !amount || Number(amount) <= 0 || !concept.trim()}
                  className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 disabled:opacity-50 text-white font-black rounded-xl shadow-lg shadow-emerald-600/30 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {isSubmitting
                      ? "Guardando..."
                      : `Guardar Ingreso ${amount ? `(${formatCurrency(Number(amount))})` : ""}`}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ticket Modal */}
      <IncomeReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        income={receiptIncome}
      />
    </div>
  );
}
