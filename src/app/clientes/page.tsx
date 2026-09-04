"use client";

import { useState, useEffect } from "react";
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
  FileText
} from "lucide-react";
import { Customer } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { getStoredCustomers, saveStoredCustomers } from "@/lib/customers";

export default function ClientesPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | Customer["type"]>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const filtered = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      (c.address && c.address.toLowerCase().includes(search.toLowerCase()));
    const matchesType = typeFilter === "all" || c.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const totalDebt = customers.reduce((acc, c) => acc + c.currentDebt, 0);
  const totalSalesAll = customers.reduce((acc, c) => acc + c.totalPurchases, 0);
  const wholesaleCount = customers.filter((c) => c.type === "mayoreo").length;

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
    // Reset form
    setName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setType("frecuente");
    setCreditLimit("0");
    setNotes("");
  };

  const getTypeBadge = (cType: Customer["type"]) => {
    switch (cType) {
      case "general":
        return <span className="bg-stone-100 text-stone-700 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase">Mostrador General</span>;
      case "mayoreo":
        return <span className="bg-brito-orange-100 text-brito-orange-800 border border-brito-orange-300 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase flex items-center gap-1"><Store className="w-3 h-3" /> Mayorista</span>;
      case "frecuente":
        return <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase flex items-center gap-1"><UserCheck className="w-3 h-3" /> Frecuente</span>;
      case "evento":
        return <span className="bg-brito-crimson-100 text-brito-crimson-800 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase flex items-center gap-1"><Cake className="w-3 h-3" /> Eventos & Pastelería</span>;
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-stone-900 tracking-tight">Directorio de Clientes & Mayoristas</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Gestión de público general, tienditas de mayoreo, clientes con crédito y pedidos de pastelería.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-brito-orange-600 to-brito-crimson-600 hover:from-brito-orange-700 hover:to-brito-crimson-700 text-white font-extrabold px-5 py-2.5 rounded-xl shadow-lg shadow-brito-orange-600/20 text-xs transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" /> Registrar Nuevo Cliente
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500">Total Clientes</span>
            <div className="p-2 bg-stone-100 text-stone-700 rounded-xl">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-stone-900">{customers.length}</p>
          <p className="text-[11px] text-stone-400 mt-0.5">Público y registrados</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500">Tiendas de Mayoreo</span>
            <div className="p-2 bg-brito-orange-100 text-brito-orange-700 rounded-xl">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-brito-orange-600">{wholesaleCount} tiendas</p>
          <p className="text-[11px] text-stone-400 mt-0.5">Bolillo y telera diaria</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500">Cuentas por Cobrar (Deuda)</span>
            <div className="p-2 bg-rose-100 text-rose-600 rounded-xl">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-600">{formatCurrency(totalDebt)}</p>
          <p className="text-[11px] text-rose-400 font-semibold mt-0.5">Crédito pendiente de pago</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500">Ventas Acumuladas</span>
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-stone-900">{formatCurrency(totalSalesAll)}</p>
          <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Histórico de compras</p>
        </div>
      </div>

      {/* Search & Tabs */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, teléfono o dirección de entrega..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-stone-50 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-brito-orange-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setTypeFilter("all")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              typeFilter === "all" ? "bg-stone-900 text-white shadow-sm" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            Todos ({customers.length})
          </button>
          <button
            onClick={() => setTypeFilter("mayoreo")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              typeFilter === "mayoreo" ? "bg-brito-orange-600 text-white shadow-sm" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            Mayoristas & Tienditas
          </button>
          <button
            onClick={() => setTypeFilter("frecuente")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              typeFilter === "frecuente" ? "bg-emerald-600 text-white shadow-sm" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            Clientes Frecuentes
          </button>
          <button
            onClick={() => setTypeFilter("evento")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              typeFilter === "evento" ? "bg-brito-crimson-600 text-white shadow-sm" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            Pasteles & Eventos
          </button>
          <button
            onClick={() => setTypeFilter("general")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              typeFilter === "general" ? "bg-stone-600 text-white shadow-sm" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            Mostrador General
          </button>
        </div>
      </div>

      {/* Customer Directory Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((c) => (
          <div
            key={c.id}
            className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-extrabold text-sm text-stone-900 leading-snug">{c.name}</h3>
                  <p className="text-[10px] text-stone-400 mt-0.5">Registrado: {c.registeredAt}</p>
                </div>
                {getTypeBadge(c.type)}
              </div>

              {/* Contact Info */}
              <div className="space-y-1 text-xs text-stone-600">
                {c.phone !== "N/A" && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-stone-400" />
                    <span>{c.phone}</span>
                    <a
                      href={`https://wa.me/52${c.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto text-emerald-600 hover:text-emerald-700 text-[11px] font-bold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-md"
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
                <div className="p-2.5 bg-stone-50 rounded-xl text-[11px] text-stone-600 leading-relaxed border border-stone-100 flex items-start gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                  <span>{c.notes}</span>
                </div>
              )}
            </div>

            {/* Balances & Credit */}
            <div className="border-t border-stone-100 pt-3 space-y-1.5 text-xs">
              <div className="flex justify-between items-center text-stone-600">
                <span>Total Comprado:</span>
                <span className="font-extrabold text-stone-900">{formatCurrency(c.totalPurchases)}</span>
              </div>
              {c.creditLimit > 0 && (
                <div className="flex justify-between items-center text-stone-600">
                  <span>Límite de Crédito:</span>
                  <span className="font-semibold">{formatCurrency(c.creditLimit)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-1 border-t border-dashed border-stone-200">
                <span className="font-bold text-stone-700">Deuda Actual:</span>
                <span
                  className={`font-black ${
                    c.currentDebt > 0 ? "text-rose-600" : "text-emerald-600"
                  }`}
                >
                  {c.currentDebt > 0 ? formatCurrency(c.currentDebt) : "Al corriente ($0.00)"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* New Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 border border-stone-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-brito-orange-100 text-brito-orange-600 rounded-xl">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="font-black text-base text-stone-900">Registrar Nuevo Cliente</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-stone-700">Nombre Completo / Negocio *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Abarrotes Los Güeros o Doña Carmen"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 focus:ring-2 focus:ring-brito-orange-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-stone-700">Teléfono / WhatsApp</label>
                  <input
                    type="tel"
                    placeholder="Ej. 55 1234 5678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 focus:ring-2 focus:ring-brito-orange-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-stone-700">Tipo de Cliente</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as Customer["type"])}
                    className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 focus:ring-2 focus:ring-brito-orange-500 focus:outline-none font-semibold"
                  >
                    <option value="frecuente">Cliente Frecuente</option>
                    <option value="mayoreo">Mayorista (Tiendita / Taquería)</option>
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
                <label className="font-bold text-stone-700">Límite de Crédito ($ MXN)</label>
                <input
                  type="number"
                  placeholder="0 para sin crédito"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 focus:ring-2 focus:ring-brito-orange-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700">Notas / Preferencias</label>
                <textarea
                  rows={2}
                  placeholder="Ej. Paga los sábados, pide bolillo bien dorado..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 focus:ring-2 focus:ring-brito-orange-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-brito-orange-600 to-brito-crimson-600 hover:from-brito-orange-700 hover:to-brito-crimson-700 text-white font-extrabold rounded-xl shadow-md transition-all active:scale-95"
                >
                  Guardar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
