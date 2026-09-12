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
  Building2
} from "lucide-react";
import { CashIncome, CashIncomeCategory, Customer, CustomOrder } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useBranch } from "@/context/BranchContext";
import { useNotifications } from "@/context/NotificationContext";
import { createClient } from "@/lib/supabase/client";
import IncomeReceiptModal from "@/components/ingresos/IncomeReceiptModal";

const INITIAL_INCOMES: CashIncome[] = [
  {
    id: "ING-849102",
    amount: 500,
    category: "abono_pedido",
    categoryLabel: "Abono a Pedido Especial",
    paymentMethod: "efectivo",
    concept: "Anticipo de pastel 3 leches XV años para Sra. María González (PED-101)",
    customerId: "cli-3",
    customerName: "Sra. María González",
    orderId: "PED-101",
    orderNumber: "PED-101",
    cashier: "Lupita Brito",
    branchName: "Sucursal Matriz Centro",
    date: "Hoy, 08:45 AM",
    timestamp: new Date().toISOString(),
  },
  {
    id: "ING-849103",
    amount: 850,
    category: "abono_cliente",
    categoryLabel: "Cobro a Mayorista / Tiendita",
    paymentMethod: "transferencia",
    referenceNumber: "SPEI-774921",
    concept: "Liquidación semanal de 150 bolillos y teleras",
    customerId: "cli-1",
    customerName: "Abarrotes La Guadalupana (Don Pepe)",
    cashier: "Don Toño Brito",
    branchName: "Sucursal Matriz Centro",
    date: "Hoy, 10:15 AM",
    timestamp: new Date().toISOString(),
  },
  {
    id: "ING-849104",
    amount: 300,
    category: "abono_pedido",
    categoryLabel: "Abono a Pedido Especial",
    paymentMethod: "efectivo",
    concept: "Anticipo pastel mil hojas de chocolate y café para cumpleaños",
    customerId: "cli-4",
    customerName: "Familia Brito",
    orderId: "PED-103",
    orderNumber: "PED-103",
    cashier: "Lupita Brito",
    branchName: "Sucursal Norte",
    date: "Hoy, 11:30 AM",
    timestamp: new Date().toISOString(),
  },
  {
    id: "ING-849105",
    amount: 250,
    category: "venta_costales",
    categoryLabel: "Venta de Costales / Reciclaje",
    paymentMethod: "efectivo",
    concept: "Venta de 50 costales de harina vacíos a forrajera local",
    cashier: "Maestro Juan",
    branchName: "Sucursal Matriz Centro",
    date: "Hoy, 12:45 PM",
    timestamp: new Date().toISOString(),
  },
  {
    id: "ING-849106",
    amount: 1000,
    category: "fondo_cambio",
    categoryLabel: "Aportación de Cambio a Caja",
    paymentMethod: "efectivo",
    concept: "Inyección de morralla y billetes de $20 y $50 para cambio del turno vespertino",
    cashier: "Don Toño Brito",
    branchName: "Sucursal Mercado",
    date: "Hoy, 01:20 PM",
    timestamp: new Date().toISOString(),
  },
];

const CATEGORY_OPTIONS: { id: CashIncomeCategory; label: string; icon: string }[] = [
  { id: "abono_pedido", label: "Abono a Pedido Especial (Pasteles/Eventos)", icon: "🎂" },
  { id: "abono_cliente", label: "Cobro a Cliente Mayorista / Tiendita", icon: "🏪" },
  { id: "fondo_cambio", label: "Aportación de Cambio / Fondo Adicional", icon: "🪙" },
  { id: "venta_costales", label: "Venta de Costales de Harina / Reciclaje", icon: "🌾" },
  { id: "ingreso_extraordinario", label: "Ingreso Extraordinario / Varios", icon: "✨" },
  { id: "otro", label: "Otro Concepto", icon: "💵" },
];

const QUICK_AMOUNTS = [50, 100, 200, 300, 500, 1000];

export default function IngresosPage() {
  const { user } = useAuth();
  const { branches, currentBranch } = useBranch();
  const { addNotification } = useNotifications();

  const [incomes, setIncomes] = useState<CashIncome[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"all" | CashIncomeCategory>("all");
  const [selectedMethod, setSelectedMethod] = useState<"all" | "efectivo" | "tarjeta" | "transferencia">("all");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  
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

  // Load incomes on mount with localStorage caching
  useEffect(() => {
    try {
      const saved = localStorage.getItem("brito_cash_incomes");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setIncomes(parsed);
          return;
        }
      }
    } catch (e) {
      console.error("Error reading saved incomes", e);
    }
    setIncomes(INITIAL_INCOMES);
    localStorage.setItem("brito_cash_incomes", JSON.stringify(INITIAL_INCOMES));
  }, []);

  // Update default branch when context updates
  useEffect(() => {
    if (currentBranch) {
      setBranchName(currentBranch.name);
    }
  }, [currentBranch]);

  // Save to localStorage when incomes changes
  const saveIncomes = (newIncomes: CashIncome[]) => {
    setIncomes(newIncomes);
    try {
      localStorage.setItem("brito_cash_incomes", JSON.stringify(newIncomes));
    } catch (e) {
      console.error("Error persisting incomes", e);
    }
  };

  // KPIs Calculations
  const totalAmount = incomes.reduce((sum, inc) => sum + inc.amount, 0);
  const cashAmount = incomes
    .filter((inc) => inc.paymentMethod === "efectivo")
    .reduce((sum, inc) => sum + inc.amount, 0);
  const cardAmount = incomes
    .filter((inc) => inc.paymentMethod === "tarjeta")
    .reduce((sum, inc) => sum + inc.amount, 0);
  const transferAmount = incomes
    .filter((inc) => inc.paymentMethod === "transferencia")
    .reduce((sum, inc) => sum + inc.amount, 0);
  const ordersDepositsAmount = incomes
    .filter((inc) => inc.category === "abono_pedido")
    .reduce((sum, inc) => sum + inc.amount, 0);
  const wholesaleRecovered = incomes
    .filter((inc) => inc.category === "abono_cliente")
    .reduce((sum, inc) => sum + inc.amount, 0);

  // Filtered List
  const filteredIncomes = incomes.filter((inc) => {
    const matchesSearch =
      inc.concept.toLowerCase().includes(search.toLowerCase()) ||
      inc.id.toLowerCase().includes(search.toLowerCase()) ||
      (inc.customerName && inc.customerName.toLowerCase().includes(search.toLowerCase())) ||
      (inc.orderNumber && inc.orderNumber.toLowerCase().includes(search.toLowerCase())) ||
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

    const newIncome: CashIncome = {
      id: `ING-${Math.floor(100000 + Math.random() * 900000)}`,
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
      date: new Date().toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }),
      timestamp: new Date().toISOString(),
    };

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

    const updated = [newIncome, ...incomes];
    saveIncomes(updated);

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

  const handleExportCSV = () => {
    const headers = "Folio,Fecha,Categoria,Concepto,Cliente,Pedido,Metodo,Monto,Cajero,Sucursal\n";
    const rows = filteredIncomes
      .map(
        (i) =>
          `"${i.id}","${i.date}","${i.categoryLabel}","${i.concept.replace(/"/g, '""')}","${i.customerName || ""}","${i.orderNumber || ""}","${i.paymentMethod}",${i.amount},"${i.cashier}","${i.branchName || ""}"`
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
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-gradient-to-br from-emerald-600 to-emerald-800 text-white rounded-2xl shadow-md shadow-emerald-600/20">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-stone-900 tracking-tight">Registro de Ingresos</h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Control de abonos a pedidos especiales, cobros a clientes mayoristas y entradas a caja.
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
        <div className="bg-gradient-to-br from-emerald-900 via-emerald-950 to-stone-950 p-5 rounded-3xl border border-emerald-800/60 shadow-xl text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-200 uppercase tracking-wider">Total Entradas Hoy</span>
            <div className="p-2 bg-emerald-600/40 text-emerald-300 rounded-xl border border-emerald-500/30">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-300 tracking-tight font-mono">
            {formatCurrency(totalAmount)}
          </p>
          <p className="text-[11px] text-emerald-200/80 font-medium mt-1">
            {incomes.length} movimientos de ingreso registrados
          </p>
        </div>

        {/* Efectivo en Cajón */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500">Efectivo a Cajón</span>
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-700 tracking-tight font-mono">
            +{formatCurrency(cashAmount)}
          </p>
          <p className="text-[11px] text-stone-400 font-semibold mt-1">
            Suma directamente a caja física
          </p>
        </div>

        {/* Tarjeta & Transferencia */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500">Bancos (Tarjeta & SPEI)</span>
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-blue-700 tracking-tight font-mono">
            {formatCurrency(cardAmount + transferAmount)}
          </p>
          <p className="text-[11px] text-stone-400 font-semibold mt-1">
            Tarjeta: {formatCurrency(cardAmount)} • SPEI: {formatCurrency(transferAmount)}
          </p>
        </div>

        {/* Abonos y Deudas Recuperadas */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500">Anticipos & Deudas</span>
            <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
              <Cake className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-800 tracking-tight font-mono">
            {formatCurrency(ordersDepositsAmount + wholesaleRecovered)}
          </p>
          <p className="text-[11px] text-stone-400 font-semibold mt-1">
            Pasteles: {formatCurrency(ordersDepositsAmount)} • Mayoreo: {formatCurrency(wholesaleRecovered)}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Buscar por folio ING-XXXX, cliente, concepto o cajero..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-stone-50 rounded-2xl border border-stone-200 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Payment Method Filter */}
            <select
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value as any)}
              className="bg-stone-50 px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold text-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
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
              className="bg-stone-50 px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold text-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
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
        <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-3.5 py-1.5 rounded-xl font-black transition-all ${
              selectedCategory === "all"
                ? "bg-emerald-700 text-white shadow-sm"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            Todos ({incomes.length})
          </button>
          {CATEGORY_OPTIONS.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              {cat.icon} {cat.label.split(" ")[0]} {cat.label.split(" ")[1] || ""}
            </button>
          ))}
        </div>
      </div>

      {/* Incomes History Table */}
      <div className="bg-white rounded-3xl border border-stone-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-600" />
            <h3 className="font-black text-base text-stone-900">Historial de Ingresos Registrados</h3>
          </div>
          <span className="text-xs text-stone-500 font-bold">
            Mostrando {filteredIncomes.length} de {incomes.length} movimientos
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-500 font-extrabold border-b border-stone-200 uppercase tracking-wider text-[10px]">
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
            <tbody className="divide-y divide-stone-100">
              {filteredIncomes.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-stone-400">
                    <Receipt className="w-10 h-10 mx-auto text-stone-300 mb-2" />
                    <p className="font-bold text-sm text-stone-600">No se encontraron registros de ingreso</p>
                    <p className="text-xs">Prueba cambiando los filtros o registra uno nuevo.</p>
                  </td>
                </tr>
              ) : (
                filteredIncomes.map((inc) => (
                  <tr key={inc.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="p-4 font-mono font-bold text-stone-900">
                      #{inc.id}
                    </td>
                    <td className="p-4 text-stone-500 font-medium whitespace-nowrap">
                      {inc.date}
                    </td>
                    <td className="p-4">
                      <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg font-bold text-[10px] whitespace-nowrap block w-fit">
                        {inc.categoryLabel}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-stone-900 max-w-xs">
                      {inc.concept}
                      {inc.referenceNumber && (
                        <span className="block font-mono text-[10px] text-blue-600 font-semibold mt-0.5">
                          Ref: {inc.referenceNumber}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-stone-700">
                      {inc.customerName ? (
                        <div className="font-bold text-stone-900">{inc.customerName}</div>
                      ) : (
                        <span className="text-stone-400 italic">Público general</span>
                      )}
                      {inc.orderNumber && (
                        <span className="text-[10px] font-black text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block mt-0.5">
                          {inc.orderNumber}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-lg font-black text-[10px] uppercase inline-flex items-center gap-1 ${
                          inc.paymentMethod === "efectivo"
                            ? "bg-emerald-100 text-emerald-800"
                            : inc.paymentMethod === "tarjeta"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-purple-100 text-purple-800"
                        }`}
                      >
                        {inc.paymentMethod === "efectivo" && <Wallet className="w-3 h-3" />}
                        {inc.paymentMethod === "tarjeta" && <CreditCard className="w-3 h-3" />}
                        {inc.paymentMethod === "transferencia" && <Building className="w-3 h-3" />}
                        {inc.paymentMethod}
                      </span>
                    </td>
                    <td className="p-4 text-stone-600 font-medium whitespace-nowrap">
                      {inc.branchName || "Matriz"}
                    </td>
                    <td className="p-4 text-stone-600 font-medium whitespace-nowrap">
                      {inc.cashier}
                    </td>
                    <td className="p-4 text-right font-mono font-black text-base text-emerald-700 whitespace-nowrap">
                      +{formatCurrency(inc.amount)}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handlePrintReceipt(inc)}
                          className="p-1.5 text-stone-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-all"
                          title="Imprimir Comprobante de Ingreso (80mm)"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteIncome(inc.id)}
                          className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          title="Eliminar registro"
                        >
                          <Trash2 className="w-4 h-4" />
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
          <div className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-4 border border-stone-100 animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-stone-900">Registrar Entrada de Dinero</h3>
                  <p className="text-[11px] text-stone-500">Abono de pedido, cobro a mayorista o aportación a caja.</p>
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
                    type="number"
                    step="0.01"
                    required
                    autoFocus
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
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
