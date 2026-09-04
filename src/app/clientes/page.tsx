"use client";

import { useState, useEffect, useMemo, Fragment } from "react";
import { 
  Users, 
  Plus, 
  Search, 
  Phone, 
  X, 
  FileText, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  User,
  AlertTriangle,
  Sparkles,
  ChevronDown,
  Receipt,
  Calendar,
  BarChart3,
  Clock,
  ShoppingBag
} from "lucide-react";
import { Customer } from "@/types";
import { onlyNumbersKeyDown, cleanOnlyNumbers, formatCurrency } from "@/lib/utils";
import { getStoredCustomers, saveStoredCustomers } from "@/lib/customers";

// Opciones de panes y productos más comunes para el selector de moda
const PRESET_BREAD_OPTIONS = [
  "Bolillo Caliente y Telera",
  "Bolillo Tradicional",
  "Telera Tradicional (Tortas)",
  "Pan Dulce Surtido (Conchas)",
  "Concha de Vainilla",
  "Concha de Chocolate",
  "Cuerno de Mantequilla",
  "Pastel Tres Leches y Repostería",
  "Pay de Queso con Zarzamora",
  "Pambazo Tradicional",
  "Pizza Artesanal / Pastes",
  "Dona de Chocolate",
  "Mantecada de Nuez",
  "Oreja Crujiente",
];

// Ícono SVG oficial y ordenado de WhatsApp
function WhatsAppIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.711 1.457h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
  );
}

// Formateador limpio y ordenado de números telefónicos (evita que se dividan en 2 renglones)
function formatPhoneNumber(phone: string | undefined | null): string {
  if (!phone || phone === "N/A") return "";
  const digits = phone.replace(/\D/g, "");
  // Formato mexicano de 10 dígitos con espacios indivisibles (\u00A0): 55 4433 2211
  if (digits.length === 10) {
    return `${digits.slice(0, 2)}\u00A0${digits.slice(2, 6)}\u00A0${digits.slice(6)}`;
  }
  if (digits.length === 8) {
    return `${digits.slice(0, 4)}\u00A0${digits.slice(4)}`;
  }
  return phone.replace(/ /g, "\u00A0");
}

export default function ClientesPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");

  // Desplegable de Moda e Historial de Compras por Cliente
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);

  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Form State: Nuevo Cliente
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [favoriteProduct, setFavoriteProduct] = useState("");
  const [notes, setNotes] = useState("");

  // Form State: Editar Cliente
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editFavoriteProduct, setEditFavoriteProduct] = useState("");
  const [editNotes, setEditNotes] = useState("");

  useEffect(() => {
    const loaded = getStoredCustomers();
    const cleaned = loaded.filter((c) => c.id !== "cli-0" && c.type !== "general");
    setCustomers(cleaned);
    if (cleaned.length !== loaded.length) {
      saveStoredCustomers(cleaned);
    }
    const handleSync = () => {
      const syncLoaded = getStoredCustomers();
      const syncCleaned = syncLoaded.filter((c) => c.id !== "cli-0" && c.type !== "general");
      setCustomers(syncCleaned);
    };
    window.addEventListener("brito_customers_updated", handleSync);
    return () => window.removeEventListener("brito_customers_updated", handleSync);
  }, []);

  const showNotification = (msg: string) => {
    setSuccessNotice(msg);
    setTimeout(() => setSuccessNotice(null), 3500);
  };

  const handleUpdateFavoriteProduct = (customerId: string, newFavorite: string) => {
    const updated = customers.map((c) => {
      if (c.id === customerId) {
        return {
          ...c,
          favoriteProduct: newFavorite.trim() || undefined,
        };
      }
      return c;
    });
    setCustomers(updated);
    saveStoredCustomers(updated);
    showNotification(
      newFavorite
        ? `¡Moda habitual de compra actualizada a "${newFavorite}"!`
        : "Moda habitual de compra restablecida."
    );
  };

  // Filtrado por búsqueda y ordenamiento en estricto orden de lista (A - Z)
  const filteredCustomers = useMemo(() => {
    const validCustomers = customers.filter((c) => c.id !== "cli-0" && c.type !== "general");
    const q = search.toLowerCase().trim();
    const qClean = q.replace(/\D/g, "");
    const matched = !q
      ? validCustomers
      : validCustomers.filter((c) => {
          const cClean = c.phone ? c.phone.replace(/\D/g, "") : "";
          return (
            c.name.toLowerCase().includes(q) ||
            (c.phone && c.phone.toLowerCase().includes(q)) ||
            (qClean.length > 0 && cClean.includes(qClean)) ||
            (c.notes && c.notes.toLowerCase().includes(q)) ||
            (c.favoriteProduct && c.favoriteProduct.toLowerCase().includes(q))
          );
        });

    return [...matched].sort((a, b) =>
      a.name.localeCompare(b.name, "es", { sensitivity: "base", numeric: true })
    );
  }, [customers, search]);

  // Apertura modal nuevo cliente
  const handleOpenCreate = () => {
    setName("");
    setPhone("");
    setFavoriteProduct("");
    setNotes("");
    setIsModalOpen(true);
  };

  // Guardar nuevo cliente
  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newCustomer: Customer = {
      id: `cli-${Date.now()}`,
      name: name.trim(),
      phone: phone.trim() ? formatPhoneNumber(phone.trim()) : "N/A",
      type: "frecuente",
      creditLimit: 0,
      currentDebt: 0,
      totalPurchases: 0,
      favoriteProduct: favoriteProduct.trim() || undefined,
      notes: notes.trim() || undefined,
      registeredAt: new Date().toISOString().split("T")[0],
    };

    const updated = [...customers, newCustomer];
    setCustomers(updated);
    saveStoredCustomers(updated);
    setIsModalOpen(false);
    showNotification(`¡Cliente "${newCustomer.name}" registrado correctamente!`);
  };

  // Apertura modal editar
  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setEditName(c.name);
    setEditPhone(c.phone === "N/A" ? "" : c.phone?.replace(/\D/g, "") || "");
    setEditFavoriteProduct(c.favoriteProduct || "");
    setEditNotes(c.notes || "");
  };

  // Guardar edición
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer || !editName.trim()) return;

    const updated = customers.map((c) => {
      if (c.id === editingCustomer.id) {
        return {
          ...c,
          name: editName.trim(),
          phone: editPhone.trim() ? formatPhoneNumber(editPhone.trim()) : "N/A",
          favoriteProduct: editFavoriteProduct.trim() || undefined,
          notes: editNotes.trim() || undefined,
        };
      }
      return c;
    });

    setCustomers(updated);
    saveStoredCustomers(updated);
    setEditingCustomer(null);
    showNotification(`¡Cliente "${editName.trim()}" actualizado con éxito!`);
  };

  // Confirmar eliminación
  const handleConfirmDelete = () => {
    if (!deleteConfirm) return;

    const updated = customers.filter((c) => c.id !== deleteConfirm.id);
    setCustomers(updated);
    saveStoredCustomers(updated);
    const deletedName = deleteConfirm.name;
    setDeleteConfirm(null);
    showNotification(`Cliente "${deletedName}" eliminado.`);
  };

  return (
    <div className="px-2 sm:px-4 lg:px-6 py-4 sm:py-6 w-full max-w-[1650px] mx-auto space-y-4 sm:space-y-5 animate-in fade-in duration-200">
      {/* Notificación Flotante */}
      {successNotice && (
        <div className="fixed top-6 right-6 z-50 bg-stone-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border-2 border-amber-500 animate-in slide-in-from-top-4">
          <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
          <span className="text-sm sm:text-base font-black">{successNotice}</span>
        </div>
      )}

      {/* ENCABEZADO SIMPLE Y DIRECTO */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 sm:p-7 rounded-3xl border-2 border-stone-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 text-amber-900 rounded-2xl">
              <Users className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                Directorio de Clientes
              </h1>
              <p className="text-sm sm:text-base text-stone-600 font-bold mt-0.5">
                Directorio organizado con historial y moda de compra habitual
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="w-full sm:w-auto flex items-center justify-center gap-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-black px-6 py-3.5 rounded-2xl shadow-lg shadow-amber-600/25 text-base sm:text-lg transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-6 h-6" />
          <span>Registrar Nuevo Cliente</span>
        </button>
      </div>

      {/* BUSCADOR SIMPLE */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border-2 border-stone-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, número de teléfono, pan habitual o descripción..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-10 py-3.5 bg-stone-50 hover:bg-white focus:bg-white rounded-2xl border-2 border-stone-300 focus:border-amber-600 text-sm sm:text-base font-bold text-stone-900 focus:outline-none transition-all placeholder:text-stone-400 shadow-2xs"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 text-sm font-bold w-7 h-7 rounded-full flex items-center justify-center cursor-pointer bg-stone-200/60"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 rounded-2xl border border-amber-200 text-xs font-black text-amber-900 shadow-2xs">
            <span>🔤 Orden de lista: A - Z</span>
          </div>
          <div className="px-4 py-2 bg-stone-100 rounded-2xl border border-stone-200 shrink-0 text-center">
            <span className="text-xs text-stone-500 font-bold block uppercase tracking-wider">Total</span>
            <span className="text-base sm:text-lg font-black text-stone-900">
              {filteredCustomers.length} {filteredCustomers.length === 1 ? "Cliente" : "Clientes"}
            </span>
          </div>
        </div>
      </div>

      {/* TABLA LIMPIA Y CON LETRAS GRANDES */}
      <div className="bg-white rounded-3xl border-2 border-stone-200 shadow-sm overflow-hidden">
        {filteredCustomers.length === 0 ? (
          <div className="text-center py-16 px-4 space-y-4">
            <div className="w-16 h-16 bg-stone-100 text-stone-400 rounded-full flex items-center justify-center mx-auto">
              <Users className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-black text-stone-800">
                {search ? "No se encontraron clientes con esa búsqueda" : "Aún no hay clientes registrados"}
              </p>
              <p className="text-sm text-stone-500 font-medium">
                {search ? "Intenta con otro nombre, número o tipo de pan." : "Haz clic en 'Registrar Nuevo Cliente' para agregar el primero."}
              </p>
            </div>
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-sm font-bold rounded-xl cursor-pointer"
              >
                Limpiar búsqueda
              </button>
            ) : (
              <button
                type="button"
                onClick={handleOpenCreate}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-black rounded-xl cursor-pointer shadow-md"
              >
                + Registrar Primer Cliente
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-100 border-b-2 border-stone-200 text-xs sm:text-sm font-black text-stone-700 uppercase tracking-wider">
                  <th className="py-3.5 px-3 sm:px-4 w-16 text-center whitespace-nowrap"># Lista</th>
                  <th className="py-3.5 px-4 sm:px-5 min-w-[200px]">Cliente / Nombre</th>
                  <th className="py-3.5 px-4 sm:px-5 min-w-[210px] whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-4 h-4 text-stone-500" />
                      <span>Teléfono / WhatsApp</span>
                    </div>
                  </th>
                  <th className="py-3.5 px-4 sm:px-5 min-w-[220px]">Descripción del Cliente</th>
                  <th className="py-3.5 px-4 sm:px-5 min-w-[160px] whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <span>Historial</span>
                    </div>
                  </th>
                  <th className="py-3.5 px-4 sm:px-5 text-center w-28 whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {filteredCustomers.map((c, idx) => {
                  const cleanPhone = c.phone ? c.phone.replace(/\D/g, "") : "";

                  return (
                    <Fragment key={c.id}>
                      <tr
                        className={`transition-colors ${
                          expandedClientId === c.id ? "bg-amber-50/70" : "hover:bg-amber-50/50"
                        }`}
                      >
                        {/* Número de Orden de Lista */}
                        <td className="py-3.5 px-3 sm:px-4 text-center whitespace-nowrap">
                          <span className="inline-flex items-center justify-center min-w-8 h-8 px-2 rounded-xl bg-stone-100 border border-stone-300 font-mono text-xs sm:text-sm font-black text-stone-700 shadow-2xs">
                            {idx + 1}
                          </span>
                        </td>

                        {/* 1. Nombre */}
                        <td className="py-3.5 px-4 sm:px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center shrink-0 font-black text-sm sm:text-base shadow-xs bg-amber-100 text-amber-900 border border-amber-300">
                              {c.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="text-sm sm:text-base font-black text-stone-900 block leading-snug">
                                {c.name}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 2. Número / Teléfono y WhatsApp */}
                        <td className="py-3.5 px-4 sm:px-5 whitespace-nowrap">
                          {c.phone && c.phone !== "N/A" ? (
                            <div className="inline-flex items-center gap-2 whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-stone-100/90 border border-stone-300/80 rounded-xl font-mono text-xs sm:text-sm font-black text-stone-900 tracking-wide select-all shadow-2xs">
                                <Phone className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                                <span className="tabular-nums tracking-wider">{formatPhoneNumber(c.phone)}</span>
                              </div>
                              {cleanPhone.length >= 8 && (
                                <a
                                  href={`https://wa.me/52${cleanPhone}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-90 text-white flex items-center justify-center transition-all shadow-2xs hover:shadow-md cursor-pointer shrink-0"
                                  title={`Abrir WhatsApp (${formatPhoneNumber(c.phone)})`}
                                >
                                  <WhatsAppIcon className="w-4 h-4 fill-white" />
                                </a>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs sm:text-sm font-medium text-stone-400 italic">
                              Sin número registrado
                            </span>
                          )}
                        </td>

                        {/* 3. Cuadro de Descripción */}
                        <td className="py-3.5 px-4 sm:px-5">
                          {c.notes ? (
                            <div className="p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-800 leading-relaxed max-w-sm">
                              {c.notes}
                            </div>
                          ) : (
                            <span className="text-xs sm:text-sm font-medium text-stone-400 italic">
                              Sin descripción
                            </span>
                          )}
                        </td>

                        {/* 4. Historial Desplegable */}
                        <td className="py-3.5 px-4 sm:px-5 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setExpandedClientId(expandedClientId === c.id ? null : c.id)}
                            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl text-xs sm:text-sm font-bold border transition-all cursor-pointer shadow-2xs ${
                              expandedClientId === c.id
                                ? "bg-amber-600 text-white border-amber-700 shadow-md ring-2 ring-amber-400/40"
                                : "bg-gradient-to-r from-amber-50 to-orange-50/80 hover:bg-amber-100/90 border-amber-200/90 text-amber-950"
                            }`}
                            title="Haz clic para ver el historial y moda de compra"
                          >
                            <span className="text-base shrink-0">🍞</span>
                            <span className="font-black leading-snug">Historial</span>
                            <ChevronDown
                              className={`w-4 h-4 transition-transform duration-200 shrink-0 ${
                                expandedClientId === c.id ? "rotate-180 text-white" : "text-amber-700"
                              }`}
                            />
                          </button>
                        </td>

                        {/* 5. Acciones (Editar y Eliminar) */}
                        <td className="py-3.5 px-4 sm:px-5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(c)}
                              className="p-2 sm:p-2.5 rounded-xl bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-900 border border-stone-300 font-bold transition-all active:scale-90 cursor-pointer shadow-2xs"
                              title="Editar cliente"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeleteConfirm({ id: c.id, name: c.name })}
                              className="p-2 sm:p-2.5 rounded-xl bg-stone-100 hover:bg-rose-100 text-stone-400 hover:text-rose-700 border border-stone-300 font-bold transition-all active:scale-90 cursor-pointer shadow-2xs"
                              title="Eliminar cliente"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* FILA EXPANDIBLE: MODA DESPLEGABLE E HISTORIAL DE COMPRAS */}
                      {expandedClientId === c.id && (() => {
                        const purchaseCounts = c.purchaseCounts || {};
                        const aggregatedCounts: Record<string, number> = { ...purchaseCounts };
                        if (Object.keys(aggregatedCounts).length === 0 && c.purchaseHistory) {
                          for (const purchase of c.purchaseHistory) {
                            for (const item of purchase.items) {
                              if (item.name) {
                                aggregatedCounts[item.name] = (aggregatedCounts[item.name] || 0) + (item.quantity || 1);
                              }
                            }
                          }
                        }
                        const sortedProducts = Object.entries(aggregatedCounts).sort((a, b) => b[1] - a[1]);
                        const totalPieces = sortedProducts.reduce((sum, [, count]) => sum + count, 0);

                        return (
                          <tr key={`${c.id}-expanded`} className="bg-gradient-to-br from-amber-50/70 via-stone-50 to-amber-100/30 border-y-2 border-amber-300">
                            <td colSpan={6} className="p-3 sm:p-5">
                              <div className="bg-white rounded-3xl border-2 border-amber-300/80 p-5 sm:p-7 shadow-lg space-y-6">
                                {/* Cabecera del Panel Desplegable */}
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-200">
                                  <div className="flex items-center gap-3">
                                    <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-md">
                                      <Sparkles className="w-6 h-6" />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2.5 flex-wrap">
                                        <h4 className="text-lg sm:text-xl font-black text-stone-900">
                                          Historial y Moda de Compra: {c.name}
                                        </h4>
                                        <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs">
                                          Cliente Registrado
                                        </span>
                                      </div>
                                      <p className="text-xs sm:text-sm text-stone-500 font-medium mt-0.5">
                                        Análisis de lo que más compra, moda estadística y detalle cronológico de compras
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3 flex-wrap">
                                    {/* Opción Desplegable para Asignar / Cambiar Moda */}
                                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-2xl">
                                      <span className="text-xs font-black text-amber-950 whitespace-nowrap">
                                        Moda habitual:
                                      </span>
                                      <select
                                        value={c.favoriteProduct || ""}
                                        onChange={(e) => handleUpdateFavoriteProduct(c.id, e.target.value)}
                                        className="bg-white text-stone-900 border border-amber-300 rounded-xl px-2.5 py-1 text-xs font-black focus:outline-none focus:border-amber-600 cursor-pointer shadow-2xs"
                                      >
                                        <option value="">-- Seleccionar producto habitual --</option>
                                        {PRESET_BREAD_OPTIONS.map((opt) => (
                                          <option key={opt} value={opt}>
                                            {opt}
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => setExpandedClientId(null)}
                                      className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-black rounded-xl text-xs transition-colors cursor-pointer"
                                    >
                                      ✕ Cerrar
                                    </button>
                                  </div>
                                </div>

                                {/* Resumen Superior de Indicadores */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                  <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200">
                                    <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
                                      Pan Más Comprado (Moda)
                                    </span>
                                    <span className="text-sm sm:text-base font-black text-amber-800 flex items-center gap-1.5 mt-0.5">
                                      <span>🍞</span>
                                      <span className="truncate">{c.favoriteProduct || "Por definir"}</span>
                                    </span>
                                  </div>

                                  <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200">
                                    <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
                                      Total Acumulado Comprado
                                    </span>
                                    <span className="text-base sm:text-lg font-black text-emerald-700 mt-0.5 block">
                                      {formatCurrency(c.totalPurchases || 0)}
                                    </span>
                                  </div>

                                  <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200">
                                    <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
                                      Tickets / Compras
                                    </span>
                                    <span className="text-base sm:text-lg font-black text-stone-900 mt-0.5 block">
                                      {(c.purchaseHistory || []).length} {(c.purchaseHistory || []).length === 1 ? "ticket" : "tickets"}
                                    </span>
                                  </div>

                                  <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200">
                                    <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
                                      Piezas Acumuladas
                                    </span>
                                    <span className="text-base sm:text-lg font-black text-stone-900 mt-0.5 block">
                                      {totalPieces} piezas
                                    </span>
                                  </div>
                                </div>

                                {/* Grid de 2 Columnas: Moda/Desglose vs Historial */}
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                  {/* Columna 1: Desglose de qué es lo que más compra (5 cols) */}
                                  <div className="lg:col-span-5 bg-stone-50/80 rounded-2xl border border-stone-200 p-4 sm:p-5 space-y-4">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <BarChart3 className="w-5 h-5 text-amber-600" />
                                        <h5 className="font-black text-stone-900 text-sm sm:text-base">
                                          ¿Qué es lo que más compra?
                                        </h5>
                                      </div>
                                      <span className="text-xs font-bold text-stone-500">
                                        Frecuencia de piezas
                                      </span>
                                    </div>

                                    {sortedProducts.length === 0 ? (
                                      <div className="text-center py-8 text-stone-400 text-xs sm:text-sm font-medium italic">
                                        Aún no hay desglose estadístico acumulado para este cliente.
                                      </div>
                                    ) : (
                                      <div className="space-y-3">
                                        {sortedProducts.map(([prodName, count], pIdx) => {
                                          const percent = totalPieces > 0 ? Math.round((count / totalPieces) * 100) : 0;
                                          const isTop = pIdx === 0;

                                          return (
                                            <div
                                              key={prodName}
                                              className={`p-3 rounded-xl border transition-all ${
                                                isTop
                                                  ? "bg-amber-50/90 border-amber-300 shadow-2xs"
                                                  : "bg-white border-stone-200"
                                              }`}
                                            >
                                              <div className="flex items-center justify-between text-xs sm:text-sm font-black text-stone-900 mb-1.5">
                                                <div className="flex items-center gap-1.5 truncate mr-2">
                                                  <span>{isTop ? "⭐" : "🥖"}</span>
                                                  <span className="truncate">{prodName}</span>
                                                  {isTop && (
                                                    <span className="px-1.5 py-0.5 bg-amber-500 text-white rounded-md text-[10px] uppercase font-black shrink-0">
                                                      Moda #1
                                                    </span>
                                                  )}
                                                </div>
                                                <span className="tabular-nums font-mono shrink-0 text-stone-700">
                                                  {count} pz ({percent}%)
                                                </span>
                                              </div>
                                              {/* Barra de progreso */}
                                              <div className="w-full bg-stone-200 h-2.5 rounded-full overflow-hidden">
                                                <div
                                                  className={`h-full rounded-full transition-all duration-500 ${
                                                    isTop ? "bg-amber-500" : "bg-stone-400"
                                                  }`}
                                                  style={{ width: `${percent}%` }}
                                                />
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>

                                  {/* Columna 2: Historial de Compras (Tickets) (7 cols) */}
                                  <div className="lg:col-span-7 bg-stone-50/80 rounded-2xl border border-stone-200 p-4 sm:p-5 space-y-4">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <Receipt className="w-5 h-5 text-amber-600" />
                                        <h5 className="font-black text-stone-900 text-sm sm:text-base">
                                          Historial de Compras (Tickets)
                                        </h5>
                                      </div>
                                      <span className="text-xs font-bold text-stone-500">
                                        {(c.purchaseHistory || []).length} registros
                                      </span>
                                    </div>

                                    {(!c.purchaseHistory || c.purchaseHistory.length === 0) ? (
                                      <div className="text-center py-10 px-4 bg-white rounded-2xl border border-dashed border-stone-300 space-y-2">
                                        <Clock className="w-8 h-8 text-stone-400 mx-auto" />
                                        <p className="text-sm font-black text-stone-700">
                                          Sin tickets de venta registrados aún
                                        </p>
                                        <p className="text-xs text-stone-500 max-w-md mx-auto font-medium">
                                          Al cobrar una venta en el Punto de Venta (POS) y asignarla a este cliente, aquí aparecerá el ticket con los panes que llevó, sucursal, cajero y total pagado.
                                        </p>
                                      </div>
                                    ) : (
                                      <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                                        {c.purchaseHistory.map((purchase) => (
                                          <div
                                            key={purchase.id}
                                            className="p-3.5 bg-white rounded-2xl border border-stone-200 hover:border-amber-300 shadow-2xs space-y-2.5 transition-all"
                                          >
                                            <div className="flex items-center justify-between gap-2 border-b border-stone-100 pb-2 flex-wrap">
                                              <div className="flex items-center gap-2 text-xs font-bold text-stone-600">
                                                <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                                <span>{purchase.date}</span>
                                                {purchase.branchName && (
                                                  <span className="bg-stone-100 text-stone-700 px-2 py-0.5 rounded-lg text-[11px] font-bold">
                                                    {purchase.branchName}
                                                  </span>
                                                )}
                                                {purchase.cashier && (
                                                  <span className="text-stone-400 text-[11px]">
                                                    • Cajero: {purchase.cashier}
                                                  </span>
                                                )}
                                              </div>
                                              <div className="flex items-center gap-2">
                                                {purchase.paymentMethod && (
                                                  <span className="text-[11px] uppercase font-black px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200">
                                                    {purchase.paymentMethod}
                                                  </span>
                                                )}
                                                <span className="font-black text-base text-stone-900">
                                                  {formatCurrency(purchase.total)}
                                                </span>
                                              </div>
                                            </div>

                                            {/* Detalle de productos del ticket */}
                                            <div className="flex flex-wrap gap-2 pt-0.5">
                                              {purchase.items.map((it, itIdx) => (
                                                <div
                                                  key={itIdx}
                                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-stone-50 rounded-xl border border-stone-200 text-xs font-bold text-stone-800"
                                                >
                                                  <span className="text-amber-700 font-mono font-black">{it.quantity}x</span>
                                                  <span>{it.name}</span>
                                                  {it.subtotal && (
                                                    <span className="text-stone-400 text-[11px]">
                                                      ({formatCurrency(it.subtotal)})
                                                    </span>
                                                  )}
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })()}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: REGISTRAR NUEVO CLIENTE (SIMPLE: NÚMERO, NOMBRE Y DESCRIPCIÓN) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 border-2 border-stone-300 animate-in zoom-in-95">
            {/* Header del Modal */}
            <div className="flex items-center justify-between border-b-2 border-stone-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-100 text-amber-900 rounded-2xl">
                  <Plus className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-xl text-stone-900">Registrar Nuevo Cliente</h3>
                  <p className="text-xs sm:text-sm text-stone-500 font-medium">Ingresa los 3 datos requeridos</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 cursor-pointer text-base font-bold"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-5 text-sm">
              {/* 1. Nombre del Cliente */}
              <div className="space-y-1.5">
                <label className="font-black text-stone-800 text-sm sm:text-base flex items-center gap-2">
                  <User className="w-4 h-4 text-amber-600" />
                  <span>Nombre Completo del Cliente *</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ej. Doña Carmen o Juan Pérez"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-stone-50 focus:bg-white rounded-2xl border-2 border-stone-300 focus:border-amber-600 font-black text-base text-stone-900 focus:outline-none transition-all placeholder:text-stone-400 placeholder:font-normal"
                />
              </div>

              {/* 2. Número Telefónico (Solo números) */}
              <div className="space-y-1.5">
                <label className="font-black text-stone-800 text-sm sm:text-base flex items-center gap-2">
                  <Phone className="w-4 h-4 text-amber-600" />
                  <span>Número Telefónico / WhatsApp</span>
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="Ej. 5512345678 (10 dígitos)"
                  value={phone}
                  onKeyDown={(e) => onlyNumbersKeyDown(e, false)}
                  onChange={(e) => setPhone(cleanOnlyNumbers(e.target.value))}
                  className="w-full px-4 py-3 bg-stone-50 focus:bg-white rounded-2xl border-2 border-stone-300 focus:border-amber-600 font-black text-base text-stone-900 focus:outline-none transition-all placeholder:text-stone-400 placeholder:font-normal"
                />
                {phone.length >= 8 && (
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="text-xs text-stone-500 font-bold">Vista ordenada:</span>
                    <span className="font-mono text-xs font-black bg-stone-100 text-stone-800 px-2.5 py-0.5 rounded-lg border border-stone-200">
                      {formatPhoneNumber(phone)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                      <WhatsAppIcon className="w-3 h-3 fill-emerald-600" /> WhatsApp listo
                    </span>
                  </div>
                )}
              </div>

              {/* 3. Pan o Producto Habitual (Moda de compra) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-black text-stone-800 text-sm sm:text-base flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>Pan o Producto Habitual (Moda de Compra)</span>
                  </label>
                  <span className="text-xs text-stone-500 font-bold">Opcional</span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={favoriteProduct}
                    onChange={(e) => setFavoriteProduct(e.target.value)}
                    className="w-full sm:w-1/2 px-3.5 py-3 bg-stone-50 focus:bg-white rounded-2xl border-2 border-stone-300 focus:border-amber-600 font-bold text-sm text-stone-900 focus:outline-none transition-all cursor-pointer shadow-2xs"
                  >
                    <option value="">-- Seleccionar de la lista desplegable --</option>
                    {PRESET_BREAD_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    placeholder="O escribir personalizado..."
                    value={favoriteProduct}
                    onChange={(e) => setFavoriteProduct(e.target.value)}
                    className="w-full sm:w-1/2 px-4 py-3 bg-stone-50 focus:bg-white rounded-2xl border-2 border-stone-300 focus:border-amber-600 font-black text-sm text-stone-900 focus:outline-none transition-all placeholder:text-stone-400 placeholder:font-normal"
                  />
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-xs text-stone-500 font-bold self-center mr-1">Común:</span>
                  {[
                    "🍞 Bolillo",
                    "🥪 Telera",
                    "🥐 Pan Dulce (Conchas)",
                    "🥖 Pambazo",
                    "🥧 Pastelería / Pastel",
                    "🍕 Pizza / Pastes",
                    "🥨 Repostería Fina",
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setFavoriteProduct(chip)}
                      className="px-2.5 py-1 bg-stone-100 hover:bg-amber-100 hover:text-amber-900 text-stone-700 text-xs font-bold rounded-lg border border-stone-200 transition-colors cursor-pointer"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Cuadro con Descripción del Cliente */}
              <div className="space-y-1.5">
                <label className="font-black text-stone-800 text-sm sm:text-base flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-600" />
                  <span>Descripción o Detalle del Cliente</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Ej. Compra bolillo para su puesto de tortas, viene todos los días a las 7am..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-3 bg-stone-50 focus:bg-white rounded-2xl border-2 border-stone-300 focus:border-amber-600 font-semibold text-sm sm:text-base text-stone-900 focus:outline-none transition-all placeholder:text-stone-400 placeholder:font-normal leading-relaxed"
                />
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-black rounded-2xl transition-all cursor-pointer text-base"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!name.trim()}
                  className="flex-1 py-3.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-black rounded-2xl shadow-lg shadow-amber-600/20 transition-all active:scale-95 cursor-pointer text-base"
                >
                  Guardar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDITAR CLIENTE (SIMPLE: NÚMERO, NOMBRE Y DESCRIPCIÓN) */}
      {editingCustomer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 border-2 border-stone-300 animate-in zoom-in-95">
            {/* Header del Modal */}
            <div className="flex items-center justify-between border-b-2 border-stone-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-100 text-amber-900 rounded-2xl">
                  <Edit3 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-xl text-stone-900">Editar Datos del Cliente</h3>
                  <p className="text-xs sm:text-sm text-stone-500 font-medium">{editingCustomer.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingCustomer(null)}
                className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 cursor-pointer font-bold"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-5 text-sm">
              {/* 1. Nombre del Cliente */}
              <div className="space-y-1.5">
                <label className="font-black text-stone-800 text-sm sm:text-base flex items-center gap-2">
                  <User className="w-4 h-4 text-amber-600" />
                  <span>Nombre Completo del Cliente *</span>
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-3 bg-stone-50 focus:bg-white rounded-2xl border-2 border-stone-300 focus:border-amber-600 font-black text-base text-stone-900 focus:outline-none transition-all"
                />
              </div>

              {/* 2. Número Telefónico (Solo números) */}
              <div className="space-y-1.5">
                <label className="font-black text-stone-800 text-sm sm:text-base flex items-center gap-2">
                  <Phone className="w-4 h-4 text-amber-600" />
                  <span>Número Telefónico / WhatsApp</span>
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="Ej. 5512345678 (10 dígitos)"
                  value={editPhone}
                  onKeyDown={(e) => onlyNumbersKeyDown(e, false)}
                  onChange={(e) => setEditPhone(cleanOnlyNumbers(e.target.value))}
                  className="w-full px-4 py-3 bg-stone-50 focus:bg-white rounded-2xl border-2 border-stone-300 focus:border-amber-600 font-black text-base text-stone-900 focus:outline-none transition-all"
                />
                {editPhone.length >= 8 && (
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="text-xs text-stone-500 font-bold">Vista ordenada:</span>
                    <span className="font-mono text-xs font-black bg-stone-100 text-stone-800 px-2.5 py-0.5 rounded-lg border border-stone-200">
                      {formatPhoneNumber(editPhone)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                      <WhatsAppIcon className="w-3 h-3 fill-emerald-600" /> WhatsApp listo
                    </span>
                  </div>
                )}
              </div>

              {/* 3. Pan o Producto Habitual (Moda de compra) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-black text-stone-800 text-sm sm:text-base flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>Pan o Producto Habitual (Moda de Compra)</span>
                  </label>
                  <span className="text-xs text-stone-500 font-bold">Opcional</span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={editFavoriteProduct}
                    onChange={(e) => setEditFavoriteProduct(e.target.value)}
                    className="w-full sm:w-1/2 px-3.5 py-3 bg-stone-50 focus:bg-white rounded-2xl border-2 border-stone-300 focus:border-amber-600 font-bold text-sm text-stone-900 focus:outline-none transition-all cursor-pointer shadow-2xs"
                  >
                    <option value="">-- Seleccionar de la lista desplegable --</option>
                    {PRESET_BREAD_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    placeholder="O escribir personalizado..."
                    value={editFavoriteProduct}
                    onChange={(e) => setEditFavoriteProduct(e.target.value)}
                    className="w-full sm:w-1/2 px-4 py-3 bg-stone-50 focus:bg-white rounded-2xl border-2 border-stone-300 focus:border-amber-600 font-black text-sm text-stone-900 focus:outline-none transition-all"
                  />
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-xs text-stone-500 font-bold self-center mr-1">Común:</span>
                  {[
                    "🍞 Bolillo",
                    "🥪 Telera",
                    "🥐 Pan Dulce (Conchas)",
                    "🥖 Pambazo",
                    "🥧 Pastelería / Pastel",
                    "🍕 Pizza / Pastes",
                    "🥨 Repostería Fina",
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setEditFavoriteProduct(chip)}
                      className="px-2.5 py-1 bg-stone-100 hover:bg-amber-100 hover:text-amber-900 text-stone-700 text-xs font-bold rounded-lg border border-stone-200 transition-colors cursor-pointer"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Cuadro con Descripción del Cliente */}
              <div className="space-y-1.5">
                <label className="font-black text-stone-800 text-sm sm:text-base flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-600" />
                  <span>Descripción o Detalle del Cliente</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Descripción o detalle del cliente..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-4 py-3 bg-stone-50 focus:bg-white rounded-2xl border-2 border-stone-300 focus:border-amber-600 font-semibold text-sm sm:text-base text-stone-900 focus:outline-none transition-all leading-relaxed"
                />
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="flex-1 py-3.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-black rounded-2xl transition-all cursor-pointer text-base"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!editName.trim()}
                  className="flex-1 py-3.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-black rounded-2xl shadow-lg shadow-amber-600/20 transition-all active:scale-95 cursor-pointer text-base"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CONFIRMAR ELIMINACIÓN */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4 border-2 border-rose-200 animate-in zoom-in-95 text-center">
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl font-black text-stone-900">¿Eliminar este cliente?</h3>
              <p className="text-sm text-stone-500 font-bold mt-1">
                Se eliminará a <strong className="text-stone-900">{deleteConfirm.name}</strong> del directorio.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-black rounded-xl text-sm cursor-pointer"
              >
                No, mantener
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-sm cursor-pointer shadow-md"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
