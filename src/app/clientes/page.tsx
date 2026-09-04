"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Users, 
  Plus, 
  Search, 
  Phone, 
  MessageCircle, 
  X, 
  FileText, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  User,
  AlertTriangle
} from "lucide-react";
import { Customer } from "@/types";
import { onlyNumbersKeyDown, cleanOnlyNumbers } from "@/lib/utils";
import { getStoredCustomers, saveStoredCustomers } from "@/lib/customers";

export default function ClientesPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");

  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Form State: Nuevo Cliente
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  // Form State: Editar Cliente
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editNotes, setEditNotes] = useState("");

  useEffect(() => {
    setCustomers(getStoredCustomers());
    const handleSync = () => {
      setCustomers(getStoredCustomers());
    };
    window.addEventListener("brito_customers_updated", handleSync);
    return () => window.removeEventListener("brito_customers_updated", handleSync);
  }, []);

  const showNotification = (msg: string) => {
    setSuccessNotice(msg);
    setTimeout(() => setSuccessNotice(null), 3500);
  };

  // Filtrado simple por búsqueda
  const filteredCustomers = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return customers;
    return customers.filter((c) => {
      return (
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.notes && c.notes.toLowerCase().includes(q))
      );
    });
  }, [customers, search]);

  // Apertura modal nuevo cliente
  const handleOpenCreate = () => {
    setName("");
    setPhone("");
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
      phone: phone.trim() || "N/A",
      type: "frecuente",
      creditLimit: 0,
      currentDebt: 0,
      totalPurchases: 0,
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
    setEditPhone(c.phone === "N/A" ? "" : c.phone || "");
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
          phone: editPhone.trim() || "N/A",
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
    if (deleteConfirm.id === "cli-0") return; // Proteger cliente general

    const updated = customers.filter((c) => c.id !== deleteConfirm.id);
    setCustomers(updated);
    saveStoredCustomers(updated);
    const deletedName = deleteConfirm.name;
    setDeleteConfirm(null);
    showNotification(`Cliente "${deletedName}" eliminado.`);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Notificación Flotante */}
      {successNotice && (
        <div className="fixed top-6 right-6 z-50 bg-stone-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border-2 border-amber-500 animate-in slide-in-from-top-4">
          <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
          <span className="text-sm sm:text-base font-black">{successNotice}</span>
        </div>
      )}

      {/* ENCABEZADO SIMPLE Y DIRECTO */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border-2 border-stone-200 shadow-sm">
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
                Ingreso rápido de clientes: teléfono, nombre y descripción
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="w-full sm:w-auto flex items-center justify-center gap-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-black px-7 py-4 rounded-2xl shadow-lg shadow-amber-600/25 text-base sm:text-lg transition-all active:scale-95 cursor-pointer"
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
            placeholder="Buscar por nombre, número de teléfono o descripción..."
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

        <div className="px-4 py-2 bg-stone-100 rounded-2xl border border-stone-200 shrink-0 text-center">
          <span className="text-xs text-stone-500 font-bold block uppercase tracking-wider">Total</span>
          <span className="text-base sm:text-lg font-black text-stone-900">{customers.length} Clientes</span>
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
                {search ? "Intenta con otro nombre o número." : "Haz clic en 'Registrar Nuevo Cliente' para agregar el primero."}
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
                  <th className="py-4 px-5 sm:px-6">Cliente / Nombre</th>
                  <th className="py-4 px-5 sm:px-6">Número Telefónico</th>
                  <th className="py-4 px-5 sm:px-6">Descripción del Cliente</th>
                  <th className="py-4 px-5 sm:px-6 text-center w-36">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {filteredCustomers.map((c) => {
                  const isDefaultGeneral = c.id === "cli-0";
                  const cleanPhone = c.phone ? c.phone.replace(/\D/g, "") : "";

                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-amber-50/50 transition-colors ${
                        isDefaultGeneral ? "bg-amber-50/30 font-semibold" : ""
                      }`}
                    >
                      {/* 1. Nombre */}
                      <td className="py-4 px-5 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center shrink-0 font-black text-base sm:text-lg shadow-xs ${
                            isDefaultGeneral 
                              ? "bg-amber-600 text-white" 
                              : "bg-amber-100 text-amber-900 border border-amber-300"
                          }`}>
                            {isDefaultGeneral ? "⭐" : c.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-base sm:text-lg font-black text-stone-900 block leading-snug">
                              {c.name}
                            </span>
                            {isDefaultGeneral && (
                              <span className="inline-block text-[11px] font-extrabold bg-amber-200/80 text-amber-950 px-2 py-0.5 rounded-md mt-0.5">
                                Cliente Predeterminado de Mostrador
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 2. Número / Teléfono */}
                      <td className="py-4 px-5 sm:px-6">
                        {c.phone && c.phone !== "N/A" ? (
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 text-sm sm:text-base font-black text-stone-900 font-mono">
                              <Phone className="w-4 h-4 text-stone-400 shrink-0" />
                              <span>{c.phone}</span>
                            </div>
                            {cleanPhone.length >= 8 && (
                              <a
                                href={`https://wa.me/52${cleanPhone}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black px-2.5 py-1 rounded-xl text-xs transition-colors shadow-2xs cursor-pointer ml-1"
                                title="Abrir WhatsApp"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span>WhatsApp</span>
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
                      <td className="py-4 px-5 sm:px-6">
                        {c.notes ? (
                          <div className="p-3 bg-stone-50 border border-stone-200 rounded-2xl text-xs sm:text-sm font-semibold text-stone-800 leading-relaxed max-w-md">
                            {c.notes}
                          </div>
                        ) : (
                          <span className="text-xs sm:text-sm font-medium text-stone-400 italic">
                            Sin descripción
                          </span>
                        )}
                      </td>

                      {/* 4. Acciones */}
                      <td className="py-4 px-5 sm:px-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(c)}
                            className="p-2.5 sm:p-3 rounded-2xl bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-900 border border-stone-300 font-bold transition-all active:scale-90 cursor-pointer shadow-2xs"
                            title="Editar cliente"
                          >
                            <Edit3 className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>

                          {!isDefaultGeneral && (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirm({ id: c.id, name: c.name })}
                              className="p-2.5 sm:p-3 rounded-2xl bg-stone-100 hover:bg-rose-100 text-stone-400 hover:text-rose-700 border border-stone-300 font-bold transition-all active:scale-90 cursor-pointer shadow-2xs"
                              title="Eliminar cliente"
                            >
                              <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
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
              {/* 1. Número Telefónico (Solo números) */}
              <div className="space-y-1.5">
                <label className="font-black text-stone-800 text-sm sm:text-base flex items-center gap-2">
                  <Phone className="w-4 h-4 text-amber-600" />
                  <span>Número Telefónico / WhatsApp</span>
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="Ej. 5512345678 (Solo números)"
                  value={phone}
                  onKeyDown={(e) => onlyNumbersKeyDown(e, false)}
                  onChange={(e) => setPhone(cleanOnlyNumbers(e.target.value))}
                  className="w-full px-4 py-3 bg-stone-50 focus:bg-white rounded-2xl border-2 border-stone-300 focus:border-amber-600 font-black text-base text-stone-900 focus:outline-none transition-all placeholder:text-stone-400 placeholder:font-normal"
                />
              </div>

              {/* 2. Nombre del Cliente */}
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

              {/* 3. Cuadro con Descripción del Cliente */}
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
              {/* 1. Número Telefónico (Solo números) */}
              <div className="space-y-1.5">
                <label className="font-black text-stone-800 text-sm sm:text-base flex items-center gap-2">
                  <Phone className="w-4 h-4 text-amber-600" />
                  <span>Número Telefónico / WhatsApp</span>
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="Ej. 5512345678 (Solo números)"
                  value={editPhone}
                  onKeyDown={(e) => onlyNumbersKeyDown(e, false)}
                  onChange={(e) => setEditPhone(cleanOnlyNumbers(e.target.value))}
                  className="w-full px-4 py-3 bg-stone-50 focus:bg-white rounded-2xl border-2 border-stone-300 focus:border-amber-600 font-black text-base text-stone-900 focus:outline-none transition-all"
                />
              </div>

              {/* 2. Nombre del Cliente */}
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

              {/* 3. Cuadro con Descripción del Cliente */}
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
