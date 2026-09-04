"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Users, 
  Plus, 
  Search, 
  Phone, 
  MapPin, 
  Mail, 
  Store, 
  Cake, 
  UserCheck, 
  DollarSign, 
  CreditCard,
  MessageCircle,
  X,
  FileText,
  ArrowUpDown,
  List,
  LayoutGrid,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Wallet,
  Check,
  Building
} from "lucide-react";
import { Customer } from "@/types";
import { formatCurrency, onlyNumbersKeyDown, cleanOnlyNumbers, cleanDecimalNumbers } from "@/lib/utils";
import { getStoredCustomers, saveStoredCustomers } from "@/lib/customers";

type SortOption = "deuda_desc" | "nombre_asc" | "nombre_desc" | "ventas_desc" | "reciente";
type FilterOption = "all" | "con_deuda" | Customer["type"];

export default function ClientesPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<FilterOption>("all");
  const [sortBy, setSortBy] = useState<SortOption>("deuda_desc");
  const [viewMode, setViewMode] = useState<"list" | "cards">("list");

  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [payingCustomer, setPayingCustomer] = useState<Customer | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  useEffect(() => {
    setCustomers(getStoredCustomers());
    const handleSync = () => {
      setCustomers(getStoredCustomers());
    };
    window.addEventListener("brito_customers_updated", handleSync);
    return () => window.removeEventListener("brito_customers_updated", handleSync);
  }, []);

  // Form State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [type, setType] = useState<Customer["type"]>("frecuente");
  const [creditLimit, setCreditLimit] = useState<string>("0");
  const [notes, setNotes] = useState("");

  // KPIs
  const totalDebt = useMemo(() => customers.reduce((acc, c) => acc + (Number(c.currentDebt) || 0), 0), [customers]);
  const totalSalesAll = useMemo(() => customers.reduce((acc, c) => acc + (Number(c.totalPurchases) || 0), 0), [customers]);
  const wholesaleCount = useMemo(() => customers.filter((c) => c.type === "mayoreo").length, [customers]);
  const debtCount = useMemo(() => customers.filter((c) => (Number(c.currentDebt) || 0) > 0).length, [customers]);

  // Lista ordenada y filtrada
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return customers
      .filter((c) => {
        const matchesSearch =
          !q ||
          c.name.toLowerCase().includes(q) ||
          (c.phone && c.phone.includes(q)) ||
          (c.address && c.address.toLowerCase().includes(q)) ||
          (c.notes && c.notes.toLowerCase().includes(q));

        if (!matchesSearch) return false;

        if (typeFilter === "all") return true;
        if (typeFilter === "con_deuda") return (Number(c.currentDebt) || 0) > 0;
        return c.type === typeFilter;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "deuda_desc":
            if ((b.currentDebt || 0) !== (a.currentDebt || 0)) {
              return (b.currentDebt || 0) - (a.currentDebt || 0);
            }
            return a.name.localeCompare(b.name);
          case "nombre_asc":
            return a.name.localeCompare(b.name);
          case "nombre_desc":
            return b.name.localeCompare(a.name);
          case "ventas_desc":
            return (b.totalPurchases || 0) - (a.totalPurchases || 0);
          case "reciente":
            return (b.registeredAt || "").localeCompare(a.registeredAt || "");
          default:
            return 0;
        }
      });
  }, [customers, search, typeFilter, sortBy]);

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newCustomer: Customer = {
      id: `cli-${Date.now()}`,
      name: name.trim(),
      phone: phone.trim() || "N/A",
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      type,
      creditLimit: Number(creditLimit) || 0,
      currentDebt: 0,
      totalPurchases: 0,
      notes: notes.trim() || undefined,
      registeredAt: new Date().toISOString().split("T")[0],
    };

    const updated = [...customers, newCustomer];
    setCustomers(updated);
    saveStoredCustomers(updated);
    setIsModalOpen(false);
    setSuccessNotice(`¡Cliente "${newCustomer.name}" registrado con éxito!`);
    setTimeout(() => setSuccessNotice(null), 3000);

    // Reset form
    setName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setType("frecuente");
    setCreditLimit("0");
    setNotes("");
  };

  const handleSaveCustomerEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer || !editingCustomer.name.trim()) return;

    const updated = customers.map((c) => (c.id === editingCustomer.id ? editingCustomer : c));
    setCustomers(updated);
    saveStoredCustomers(updated);
    setSuccessNotice(`¡Cliente "${editingCustomer.name}" actualizado!`);
    setTimeout(() => setSuccessNotice(null), 3000);
    setEditingCustomer(null);
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingCustomer) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;

    const updated = customers.map((c) => {
      if (c.id === payingCustomer.id) {
        const newDebt = Math.max(0, (c.currentDebt || 0) - amount);
        const dateStr = new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
        const paymentEntry = `Abono de ${formatCurrency(amount)} (${dateStr}${paymentNote.trim() ? `: ${paymentNote.trim()}` : ""})`;
        const updatedNotes = c.notes ? `${c.notes} • ${paymentEntry}` : paymentEntry;

        return {
          ...c,
          currentDebt: newDebt,
          notes: updatedNotes,
        };
      }
      return c;
    });

    setCustomers(updated);
    saveStoredCustomers(updated);
    setSuccessNotice(`¡Abono de ${formatCurrency(amount)} registrado a ${payingCustomer.name}!`);
    setTimeout(() => setSuccessNotice(null), 3500);

    setPayingCustomer(null);
    setPaymentAmount("");
    setPaymentNote("");
  };

  const handleDeleteCustomer = (id: string, customerName: string) => {
    if (id === "cli-0") {
      alert("El cliente 'Público General' es requerido por el sistema del mostrador y no se puede eliminar.");
      return;
    }
    if (confirm(`¿Estás seguro de eliminar a "${customerName}" del directorio de clientes?`)) {
      const updated = customers.filter((c) => c.id !== id);
      setCustomers(updated);
      saveStoredCustomers(updated);
      setSuccessNotice(`Cliente "${customerName}" eliminado.`);
      setTimeout(() => setSuccessNotice(null), 3000);
    }
  };

  const getTypeBadge = (cType: Customer["type"]) => {
    switch (cType) {
      case "general":
        return (
          <span className="bg-stone-100 text-stone-700 border border-stone-200 px-2.5 py-0.5 rounded-lg text-[11px] font-black uppercase inline-flex items-center gap-1">
            <Building className="w-3 h-3 text-stone-500" />
            <span>Mostrador General</span>
          </span>
        );
      case "mayoreo":
        return (
          <span className="bg-amber-100 text-amber-900 border border-amber-300/80 px-2.5 py-0.5 rounded-lg text-[11px] font-black uppercase inline-flex items-center gap-1 shadow-2xs">
            <Store className="w-3 h-3 text-amber-700" />
            <span>Mayorista / Tiendita</span>
          </span>
        );
      case "frecuente":
        return (
          <span className="bg-emerald-100 text-emerald-900 border border-emerald-300/80 px-2.5 py-0.5 rounded-lg text-[11px] font-black uppercase inline-flex items-center gap-1 shadow-2xs">
            <UserCheck className="w-3 h-3 text-emerald-700" />
            <span>Cliente Frecuente</span>
          </span>
        );
      case "evento":
        return (
          <span className="bg-rose-100 text-rose-900 border border-rose-300/80 px-2.5 py-0.5 rounded-lg text-[11px] font-black uppercase inline-flex items-center gap-1 shadow-2xs">
            <Cake className="w-3 h-3 text-rose-700" />
            <span>Eventos & Pastelería</span>
          </span>
        );
    }
  };

  const getTypeIcon = (cType: Customer["type"]) => {
    switch (cType) {
      case "mayoreo":
        return <Store className="w-5 h-5 text-amber-700" />;
      case "evento":
        return <Cake className="w-5 h-5 text-rose-700" />;
      case "frecuente":
        return <UserCheck className="w-5 h-5 text-emerald-700" />;
      default:
        return <Users className="w-5 h-5 text-stone-600" />;
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Notificación de éxito */}
      {successNotice && (
        <div className="bg-emerald-50 border-2 border-emerald-300 text-emerald-900 px-5 py-3 rounded-2xl flex items-center gap-2.5 font-bold text-sm shadow-md animate-in slide-in-from-top duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight flex items-center gap-2">
            <span>Directorio de Clientes & Mayoristas</span>
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-1 font-medium">
            Gestión organizada de tienditas de mayoreo, clientes con crédito y pedidos especiales.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-brito-orange-600 to-brito-crimson-600 hover:from-brito-orange-700 hover:to-brito-crimson-700 text-white font-black px-6 py-3 rounded-2xl shadow-lg shadow-brito-orange-600/20 text-xs sm:text-sm transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          <span>Registrar Nuevo Cliente</span>
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-200/90 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500">Total Clientes</span>
            <div className="p-2 bg-stone-100 text-stone-700 rounded-xl">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-stone-900">{customers.length}</p>
          <p className="text-[11px] text-stone-400 font-medium">Público y registrados</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-200/90 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700">Tiendas de Mayoreo</span>
            <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-800">{wholesaleCount} tiendas</p>
          <p className="text-[11px] text-stone-400 font-medium">Bolillo y telera diaria</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-rose-200 shadow-sm space-y-1 bg-rose-50/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700">Cuentas por Cobrar (Deuda)</span>
            <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-rose-600">{formatCurrency(totalDebt)}</p>
          <p className="text-[11px] text-rose-600 font-bold">
            {debtCount} {debtCount === 1 ? "cliente con saldo" : "clientes con saldo pendiente"}
          </p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-200/90 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700">Ventas Acumuladas</span>
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-stone-900">{formatCurrency(totalSalesAll)}</p>
          <p className="text-[11px] text-emerald-700 font-bold">Histórico de compras</p>
        </div>
      </div>

      {/* Barra de Filtros, Búsqueda y Ordenamiento */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-200/90 shadow-sm space-y-4">
        {/* Fila superior: Buscador + Selector de Ordenamiento + Vista Toggle */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Buscador inteligente */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, teléfono, dirección o nota..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-stone-50 hover:bg-stone-100/70 focus:bg-white rounded-2xl border border-stone-200 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-brito-orange-500 focus:outline-none transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 text-xs font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Ordenar por */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 px-3 py-2 rounded-2xl text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-stone-500 shrink-0" />
              <span className="font-bold text-stone-600 hidden sm:inline">Ordenar:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-transparent font-black text-stone-800 focus:outline-none cursor-pointer"
              >
                <option value="deuda_desc">⚠️ Mayor deuda primero</option>
                <option value="nombre_asc">🔤 Nombre (A - Z)</option>
                <option value="nombre_desc">🔤 Nombre (Z - A)</option>
                <option value="ventas_desc">💰 Mayor total comprado</option>
                <option value="reciente">📅 Registrados recientemente</option>
              </select>
            </div>

            {/* Selector de Vista: Lista vs Tarjetas */}
            <div className="flex items-center bg-stone-100 p-1 rounded-2xl border border-stone-200">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  viewMode === "list"
                    ? "bg-white text-stone-900 shadow-sm"
                    : "text-stone-500 hover:text-stone-800"
                }`}
                title="Vista de Lista (Recomendada)"
              >
                <List className="w-4 h-4 text-brito-orange-600" />
                <span className="hidden sm:inline">Lista</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  viewMode === "cards"
                    ? "bg-white text-stone-900 shadow-sm"
                    : "text-stone-500 hover:text-stone-800"
                }`}
                title="Vista de Tarjetas"
              >
                <LayoutGrid className="w-4 h-4 text-brito-crimson-600" />
                <span className="hidden sm:inline">Tarjetas</span>
              </button>
            </div>
          </div>
        </div>

        {/* Fila de Filtros Rápidos */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-stone-100">
          <button
            onClick={() => setTypeFilter("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs ${
              typeFilter === "all"
                ? "bg-stone-900 text-white shadow-sm"
                : "bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200"
            }`}
          >
            Todos ({customers.length})
          </button>

          <button
            onClick={() => setTypeFilter("con_deuda")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs flex items-center gap-1.5 ${
              typeFilter === "con_deuda"
                ? "bg-rose-600 text-white shadow-sm ring-2 ring-rose-400/40"
                : "bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200"
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>Con Deuda Pendiente ({debtCount})</span>
          </button>

          <button
            onClick={() => setTypeFilter("mayoreo")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs flex items-center gap-1.5 ${
              typeFilter === "mayoreo"
                ? "bg-amber-600 text-white shadow-sm ring-2 ring-amber-400/40"
                : "bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200"
            }`}
          >
            <Store className="w-3.5 h-3.5 text-amber-600" />
            <span>Mayoristas & Tienditas ({wholesaleCount})</span>
          </button>

          <button
            onClick={() => setTypeFilter("frecuente")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs flex items-center gap-1.5 ${
              typeFilter === "frecuente"
                ? "bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-500/30"
                : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Clientes Frecuentes</span>
          </button>

          <button
            onClick={() => setTypeFilter("evento")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs flex items-center gap-1.5 ${
              typeFilter === "evento"
                ? "bg-rose-700 text-white shadow-sm ring-2 ring-rose-500/30"
                : "bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200"
            }`}
          >
            <Cake className="w-3.5 h-3.5 text-rose-500" />
            <span>Pasteles & Eventos</span>
          </button>

          <button
            onClick={() => setTypeFilter("general")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs ${
              typeFilter === "general"
                ? "bg-stone-700 text-white shadow-sm"
                : "bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200"
            }`}
          >
            Mostrador General
          </button>
        </div>
      </div>

      {/* VISTA PRINCIPAL: ORDENADO POR LISTA (TABLA CLARA E INTUITIVA) */}
      {viewMode === "list" ? (
        <div className="bg-white rounded-3xl border border-stone-200/90 shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-stone-400 space-y-2">
              <Users className="w-12 h-12 mx-auto text-stone-300" />
              <p className="font-bold text-stone-600 text-sm">No se encontraron clientes con esos criterios</p>
              <p className="text-xs text-stone-400">Prueba con otra búsqueda o limpia los filtros.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-100/80 text-[11px] font-black text-stone-600 uppercase tracking-wider border-b border-stone-200">
                    <th className="py-3.5 px-4 sm:px-6">Cliente / Negocio</th>
                    <th className="py-3.5 px-4">Contacto & Ubicación</th>
                    <th className="py-3.5 px-4 hidden md:table-cell">Notas / Preferencias</th>
                    <th className="py-3.5 px-4 text-right">Total Comprado</th>
                    <th className="py-3.5 px-4 text-right">Estado de Deuda</th>
                    <th className="py-3.5 px-4 sm:px-6 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-xs">
                  {filtered.map((c) => {
                    const hasDebt = (c.currentDebt || 0) > 0;
                    return (
                      <tr
                        key={c.id}
                        className={`transition-colors ${
                          hasDebt ? "bg-rose-50/20 hover:bg-rose-50/50" : "hover:bg-stone-50/80"
                        }`}
                      >
                        {/* Columna 1: Nombre, Avatar y Tipo */}
                        <td className="py-3.5 px-4 sm:px-6">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                                c.type === "mayoreo"
                                  ? "bg-amber-100/80 border-amber-200"
                                  : c.type === "evento"
                                  ? "bg-rose-100/80 border-rose-200"
                                  : c.type === "frecuente"
                                  ? "bg-emerald-100/80 border-emerald-200"
                                  : "bg-stone-100 border-stone-200"
                              }`}
                            >
                              {getTypeIcon(c.type)}
                            </div>
                            <div className="space-y-0.5">
                              <p className="font-black text-stone-900 text-sm leading-snug">
                                {c.name}
                              </p>
                              <div className="flex flex-wrap items-center gap-1.5">
                                {getTypeBadge(c.type)}
                                {c.registeredAt && (
                                  <span className="text-[10px] text-stone-400">
                                    • Desde {c.registeredAt}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Columna 2: Teléfono, WhatsApp y Dirección */}
                        <td className="py-3.5 px-4 space-y-1">
                          {c.phone && c.phone !== "N/A" ? (
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-stone-800">{c.phone}</span>
                              <a
                                href={`https://wa.me/52${c.phone.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[10px] transition-colors"
                                title="Abrir WhatsApp"
                              >
                                <MessageCircle className="w-3 h-3" />
                                <span>WhatsApp</span>
                              </a>
                            </div>
                          ) : (
                            <span className="text-stone-400 text-[11px] italic">Sin teléfono</span>
                          )}

                          {c.address ? (
                            <div className="flex items-center gap-1 text-stone-500 text-[11px] truncate max-w-xs">
                              <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                              <span className="truncate">{c.address}</span>
                            </div>
                          ) : null}
                        </td>

                        {/* Columna 3: Notas / Observaciones */}
                        <td className="py-3.5 px-4 hidden md:table-cell max-w-xs">
                          {c.notes ? (
                            <div className="p-2 rounded-xl bg-stone-50 border border-stone-100 text-stone-600 text-[11px] line-clamp-2 leading-relaxed flex items-start gap-1.5">
                              <FileText className="w-3 h-3 text-stone-400 shrink-0 mt-0.5" />
                              <span>{c.notes}</span>
                            </div>
                          ) : (
                            <span className="text-stone-300 text-[11px] italic">Sin notas</span>
                          )}
                        </td>

                        {/* Columna 4: Total Comprado */}
                        <td className="py-3.5 px-4 text-right">
                          <p className="font-black text-stone-900 text-sm">
                            {formatCurrency(c.totalPurchases || 0)}
                          </p>
                          <span className="text-[10px] text-stone-400 font-medium">Histórico</span>
                        </td>

                        {/* Columna 5: Estado de Cuenta (Deuda) */}
                        <td className="py-3.5 px-4 text-right space-y-0.5">
                          {hasDebt ? (
                            <div>
                              <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 border border-rose-300 font-black px-2.5 py-1 rounded-xl text-xs shadow-2xs">
                                <span>⚠️ Debe {formatCurrency(c.currentDebt)}</span>
                              </span>
                              {c.creditLimit > 0 && (
                                <p className="text-[10px] text-stone-500 mt-0.5">
                                  Límite: <strong>{formatCurrency(c.creditLimit)}</strong>
                                </p>
                              )}
                            </div>
                          ) : (
                            <div>
                              <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-300/80 font-bold px-2.5 py-1 rounded-xl text-xs">
                                <Check className="w-3 h-3 text-emerald-700" />
                                <span>Al corriente ($0.00)</span>
                              </span>
                              {c.creditLimit > 0 && (
                                <p className="text-[10px] text-stone-400 mt-0.5">
                                  Límite: {formatCurrency(c.creditLimit)}
                                </p>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Columna 6: Acciones Rápidas */}
                        <td className="py-3.5 px-4 sm:px-6 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {hasDebt && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPayingCustomer(c);
                                  setPaymentAmount(String(c.currentDebt));
                                }}
                                className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
                                title="Registrar abono de deuda"
                              >
                                <Wallet className="w-3 h-3" />
                                <span>Abonar</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setEditingCustomer({ ...c })}
                              className="p-1.5 rounded-xl hover:bg-stone-200/80 text-stone-600 hover:text-stone-900 cursor-pointer transition-colors"
                              title="Editar datos del cliente"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {c.id !== "cli-0" && (
                              <button
                                type="button"
                                onClick={() => handleDeleteCustomer(c.id, c.name)}
                                className="p-1.5 rounded-xl hover:bg-rose-100 text-stone-400 hover:text-rose-600 cursor-pointer transition-colors"
                                title="Eliminar cliente"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer de la lista con conteo */}
          <div className="bg-stone-50 px-4 sm:px-6 py-3 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500 font-medium">
            <span>
              Mostrando <strong>{filtered.length}</strong> de <strong>{customers.length}</strong> clientes registrados
            </span>
            <span className="text-[11px] text-stone-400 hidden sm:inline">
              Panaderías Brito • Directorio Unificado
            </span>
          </div>
        </div>
      ) : (
        /* VISTA ALTERNATIVA: TARJETAS */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((c) => {
            const hasDebt = (c.currentDebt || 0) > 0;
            return (
              <div
                key={c.id}
                className={`bg-white rounded-3xl border p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 ${
                  hasDebt ? "border-rose-300 bg-rose-50/10" : "border-stone-200/90"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-extrabold text-sm sm:text-base text-stone-900 leading-snug">
                        {c.name}
                      </h3>
                      <p className="text-[10px] text-stone-400 mt-0.5">Registrado: {c.registeredAt}</p>
                    </div>
                    {getTypeBadge(c.type)}
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-1 text-xs text-stone-600">
                    {c.phone !== "N/A" && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-stone-400" />
                        <span className="font-medium">{c.phone}</span>
                        <a
                          href={`https://wa.me/52${c.phone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-auto text-emerald-700 hover:text-emerald-800 text-[11px] font-bold flex items-center gap-1 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200"
                        >
                          <MessageCircle className="w-3 h-3" /> WhatsApp
                        </a>
                      </div>
                    )}
                    {c.address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="truncate">{c.address}</span>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  {c.notes && (
                    <div className="p-2.5 bg-stone-50 rounded-2xl text-[11px] text-stone-600 leading-relaxed border border-stone-100 flex items-start gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                      <span>{c.notes}</span>
                    </div>
                  )}
                </div>

                {/* Balances & Credit */}
                <div className="border-t border-stone-100 pt-3 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-stone-600">
                    <span>Total Comprado:</span>
                    <span className="font-extrabold text-stone-900">{formatCurrency(c.totalPurchases || 0)}</span>
                  </div>
                  {c.creditLimit > 0 && (
                    <div className="flex justify-between items-center text-stone-600">
                      <span>Límite de Crédito:</span>
                      <span className="font-semibold">{formatCurrency(c.creditLimit)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-1.5 border-t border-dashed border-stone-200">
                    <span className="font-bold text-stone-700">Deuda Actual:</span>
                    <span
                      className={`font-black ${
                        hasDebt ? "text-rose-600 text-sm" : "text-emerald-700"
                      }`}
                    >
                      {hasDebt ? `⚠️ ${formatCurrency(c.currentDebt)}` : "Al corriente ($0.00)"}
                    </span>
                  </div>

                  {/* Botones de acción */}
                  <div className="pt-2 flex items-center justify-end gap-2">
                    {hasDebt && (
                      <button
                        type="button"
                        onClick={() => {
                          setPayingCustomer(c);
                          setPaymentAmount(String(c.currentDebt));
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs cursor-pointer"
                      >
                        <Wallet className="w-3.5 h-3.5" />
                        <span>Abonar</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setEditingCustomer({ ...c })}
                      className="px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: REGISTRAR NUEVO CLIENTE */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 border border-stone-100 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2.5 bg-brito-orange-100 text-brito-orange-700 rounded-2xl">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-stone-900">Registrar Nuevo Cliente</h3>
                  <p className="text-[11px] text-stone-500">Agrega un cliente frecuente, mayorista o con crédito</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-stone-700">Nombre Completo o Razón Social *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Abarrotes Los Güeros o Doña Carmen"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 focus:ring-2 focus:ring-brito-orange-500 focus:outline-none font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-stone-700">Teléfono / WhatsApp</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="Ej. 55 1234 5678"
                    value={phone}
                    onKeyDown={(e) => onlyNumbersKeyDown(e, false)}
                    onChange={(e) => setPhone(cleanOnlyNumbers(e.target.value))}
                    className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 focus:ring-2 focus:ring-brito-orange-500 focus:outline-none font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-stone-700">Tipo de Cliente</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as Customer["type"])}
                    className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 focus:ring-2 focus:ring-brito-orange-500 focus:outline-none font-bold text-stone-800 cursor-pointer"
                  >
                    <option value="mayoreo">Mayorista (Tiendita / Taquería)</option>
                    <option value="frecuente">Cliente Frecuente</option>
                    <option value="evento">Eventos / Pastelería</option>
                    <option value="general">Público General</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700">Dirección de Entrega</label>
                <input
                  type="text"
                  placeholder="Calle, número, colonia..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 focus:ring-2 focus:ring-brito-orange-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700">Límite de Crédito Permitido ($ MXN)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0 para clientes sin crédito"
                  value={creditLimit}
                  onKeyDown={(e) => onlyNumbersKeyDown(e, true)}
                  onChange={(e) => setCreditLimit(cleanDecimalNumbers(e.target.value))}
                  className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 focus:ring-2 focus:ring-brito-orange-500 focus:outline-none font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700">Notas / Preferencias del Pedido</label>
                <textarea
                  rows={2}
                  placeholder="Ej. Paga los viernes, compra 100 teleras cada 2 días..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 focus:ring-2 focus:ring-brito-orange-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-brito-orange-600 to-brito-crimson-600 hover:from-brito-orange-700 hover:to-brito-crimson-700 text-white font-extrabold rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  Guardar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDITAR CLIENTE */}
      {editingCustomer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 border border-stone-100 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-2xl">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-stone-900">Editar Datos del Cliente</h3>
                  <p className="text-[11px] text-stone-500">{editingCustomer.name}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingCustomer(null)}
                className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomerEdit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-stone-700">Nombre Completo o Razón Social *</label>
                <input
                  type="text"
                  required
                  value={editingCustomer.name}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-stone-700">Teléfono / WhatsApp</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={editingCustomer.phone || ""}
                    onKeyDown={(e) => onlyNumbersKeyDown(e, false)}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: cleanOnlyNumbers(e.target.value) })}
                    className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-stone-700">Tipo de Cliente</label>
                  <select
                    value={editingCustomer.type}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, type: e.target.value as Customer["type"] })}
                    className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-stone-800 cursor-pointer"
                  >
                    <option value="mayoreo">Mayorista (Tiendita / Taquería)</option>
                    <option value="frecuente">Cliente Frecuente</option>
                    <option value="evento">Eventos / Pastelería</option>
                    <option value="general">Público General</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700">Dirección de Entrega</label>
                <input
                  type="text"
                  value={editingCustomer.address || ""}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, address: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700">Límite de Crédito ($ MXN)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={editingCustomer.creditLimit}
                  onKeyDown={(e) => onlyNumbersKeyDown(e, true)}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, creditLimit: Number(cleanDecimalNumbers(e.target.value)) || 0 })}
                  className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700">Notas / Preferencias</label>
                <textarea
                  rows={2}
                  value={editingCustomer.notes || ""}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: REGISTRAR ABONO / PAGO DE DEUDA */}
      {payingCustomer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border-2 border-emerald-500/30 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-2xl">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-stone-900">Registrar Abono a Deuda</h3>
                  <p className="text-[11px] text-stone-500">{payingCustomer.name}</p>
                </div>
              </div>
              <button
                onClick={() => setPayingCustomer(null)}
                className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Resumen de la deuda */}
            <div className="bg-rose-50 p-4 rounded-2xl border border-rose-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-rose-700">Deuda pendiente:</span>
                <p className="text-2xl font-black text-rose-800">
                  {formatCurrency(payingCustomer.currentDebt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPaymentAmount(String(payingCustomer.currentDebt))}
                className="px-3 py-1.5 bg-rose-200 hover:bg-rose-300 text-rose-900 text-xs font-black rounded-xl cursor-pointer transition-colors shadow-2xs"
              >
                Liquidar Total
              </button>
            </div>

            <form onSubmit={handleConfirmPayment} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-stone-700">Monto del Abono ($ MXN) *</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500 font-bold text-sm">
                    $
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    autoFocus
                    placeholder="0.00"
                    value={paymentAmount}
                    onKeyDown={(e) => onlyNumbersKeyDown(e, true)}
                    onChange={(e) => setPaymentAmount(cleanDecimalNumbers(e.target.value))}
                    className="w-full pl-8 pr-4 py-2.5 bg-stone-50 text-stone-900 font-black text-base rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Atajos de montos comunes */}
              <div className="flex items-center gap-2">
                {[100, 200, 500].map((quick) => (
                  <button
                    key={quick}
                    type="button"
                    onClick={() => setPaymentAmount(String(quick))}
                    className="flex-1 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs cursor-pointer"
                  >
                    +${quick}
                  </button>
                ))}
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700">Nota o Comentario (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej. Pago en efectivo por Don Pepe"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                />
              </div>

              {/* Saldo resultante estimado */}
              {parseFloat(paymentAmount) > 0 && (
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs flex justify-between items-center">
                  <span className="text-stone-500 font-medium">Saldo restante estimado:</span>
                  <strong className="text-stone-900 font-black">
                    {formatCurrency(Math.max(0, payingCustomer.currentDebt - (parseFloat(paymentAmount) || 0)))}
                  </strong>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPayingCustomer(null)}
                  className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  Confirmar Abono
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
