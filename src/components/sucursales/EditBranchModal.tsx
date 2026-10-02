"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  Store,
  MapPin,
  Phone,
  Palette,
  X,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  ShieldCheck,
  Edit3,
  Clock,
  Sparkles
} from "lucide-react";
import { Branch } from "@/types";
import { useAuth } from "@/context/AuthContext";

interface EditBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchToEdit: Branch | null;
  branches: Branch[];
  onUpdateBranch: (branchId: string, updates: Partial<Branch>) => void;
  onDeleteBranch: (branchId: string) => void;
  onSelectBranchToEdit?: (branch: Branch) => void;
}

const COLOR_OPTIONS = [
  { id: "orange", label: "Naranja Brito", bg: "bg-orange-500", ring: "ring-orange-500" },
  { id: "rose", label: "Rosa Mercado", bg: "bg-rose-500", ring: "ring-rose-500" },
  { id: "amber", label: "Ámbar Trigo", bg: "bg-amber-500", ring: "ring-amber-500" },
  { id: "emerald", label: "Verde Esmeralda", bg: "bg-emerald-500", ring: "ring-emerald-500" },
  { id: "blue", label: "Azul Real", bg: "bg-blue-500", ring: "ring-blue-500" },
  { id: "purple", label: "Púrpura Imperial", bg: "bg-purple-500", ring: "ring-purple-500" },
];

export default function EditBranchModal({
  isOpen,
  onClose,
  branchToEdit,
  branches,
  onUpdateBranch,
  onDeleteBranch,
  onSelectBranchToEdit,
}: EditBranchModalProps) {
  const { usersList } = useAuth();

  // Active branch being edited
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");

  // Form states
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [manager, setManager] = useState("");
  const [status, setStatus] = useState<"abierta" | "cerrada" | "mantenimiento">("abierta");
  const [color, setColor] = useState("orange");
  const [shiftName, setShiftName] = useState("");
  const [assignedUserId, setAssignedUserId] = useState<string>("");

  // Deletion confirmation state
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Sync state whenever branchToEdit or branches change
  useEffect(() => {
    const active = branchToEdit || (branches.length > 0 ? branches[0] : null);
    if (active) {
      setSelectedBranchId(active.id);
      setName(active.name);
      setShortName(active.shortName);
      setCode(active.code);
      setAddress(active.address);
      setPhone(active.phone);
      setManager(active.manager);
      setStatus(active.status);
      setColor(active.color || "orange");
      setShiftName(active.currentShift?.name || "Turno Matutino (06:00 - 14:00)");
      setAssignedUserId(active.assignedUserId || "");
      setConfirmDelete(false);
    }
  }, [branchToEdit, branches, isOpen]);

  // When changing branch from the selector inside modal
  const handleBranchSwitch = (id: string) => {
    const target = branches.find((b) => b.id === id);
    if (target) {
      setSelectedBranchId(target.id);
      setName(target.name);
      setShortName(target.shortName);
      setCode(target.code);
      setAddress(target.address);
      setPhone(target.phone);
      setManager(target.manager);
      setStatus(target.status);
      setColor(target.color || "orange");
      setShiftName(target.currentShift?.name || "Turno Matutino (06:00 - 14:00)");
      setAssignedUserId(target.assignedUserId || "");
      setConfirmDelete(false);
      if (onSelectBranchToEdit) onSelectBranchToEdit(target);
    }
  };

  if (!isOpen) return null;

  const currentBranch = branches.find((b) => b.id === selectedBranchId) || branchToEdit;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBranch || !name.trim()) return;

    const assignedUser = usersList.find((u) => u.id === assignedUserId);

    const updates: Partial<Branch> = {
      name: name.trim(),
      shortName: shortName.trim() || name.trim().split(" ")[0],
      code: code.trim().toUpperCase() || currentBranch.code,
      address: address.trim() || currentBranch.address,
      phone: phone.trim() || currentBranch.phone,
      manager: manager.trim() || (assignedUser ? assignedUser.name : currentBranch.manager),
      assignedUserId: assignedUserId || undefined,
      assignedUserName: assignedUser ? assignedUser.name : undefined,
      assignedUserEmail: assignedUser ? assignedUser.email : undefined,
      status,
      color,
    };

    if (currentBranch.currentShift && shiftName) {
      updates.currentShift = {
        ...currentBranch.currentShift,
        name: shiftName.trim(),
      };
    }

    onUpdateBranch(currentBranch.id, updates);
    onClose();
  };

  const handleDelete = () => {
    if (!currentBranch) return;
    if (branches.length <= 1) {
      alert("No se puede eliminar la única sucursal activa de la red.");
      return;
    }
    onDeleteBranch(currentBranch.id);
    setConfirmDelete(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full sm:max-w-xl md:max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-stone-200/80 overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[90vh] animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Barra superior de arrastre en móviles */}
        <div className="w-12 h-1.5 bg-stone-300 rounded-full mx-auto mt-2.5 mb-1 sm:hidden" />

        {/* Encabezado del Modal */}
        <div className="px-5 py-4 bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 text-white flex items-center justify-between border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-sm shrink-0">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base text-white flex items-center gap-1.5">
                Editar o Eliminar Sucursal
              </h3>
              <p className="text-[11px] text-stone-300 font-medium">
                Actualiza datos operativos o retira una sucursal de la red
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white flex items-center justify-center transition-colors"
            title="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selector de Sucursal a Modificar (si hay más de 1) */}
        {branches.length > 1 && (
          <div className="px-5 py-3 bg-stone-50 border-b border-stone-200/80 flex items-center gap-2 overflow-x-auto shrink-0">
            <span className="text-[11px] font-bold text-stone-500 whitespace-nowrap">
              Sucursal:
            </span>
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              {branches.map((b) => {
                const isSelected = b.id === selectedBranchId;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => handleBranchSwitch(b.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 border ${
                      isSelected
                        ? "bg-stone-900 text-white border-stone-900 shadow-xs"
                        : "bg-white text-stone-700 border-stone-200 hover:bg-stone-100"
                    }`}
                  >
                    <Store className={`w-3.5 h-3.5 ${isSelected ? "text-amber-400" : "text-stone-400"}`} />
                    <span>{b.shortName}</span>
                    <span className="text-[10px] font-mono opacity-70">({b.code})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Contenido con Scroll */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-5">
          {/* Alerta de confirmación de eliminación inline */}
          {confirmDelete ? (
            <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 space-y-3 animate-in fade-in">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-rose-900 text-sm">
                    ¿Eliminar permanentemente "{currentBranch?.name}"?
                  </h4>
                  <p className="text-xs text-rose-700 mt-0.5 leading-relaxed">
                    Esta acción retirará la sucursal de la red de ventas, terminales POS y estadísticas operativas. Los cambios se sincronizarán en todos los dispositivos conectados.
                  </p>
                </div>
              </div>

              {branches.length <= 1 ? (
                <div className="p-2.5 rounded-xl bg-rose-100/70 text-rose-800 text-xs font-bold">
                  ⚠️ No es posible eliminar esta sucursal porque es la única registrada en la panadería.
                </div>
              ) : (
                <div className="flex items-center gap-2 pt-1 justify-end">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="px-4 py-2 rounded-xl bg-white hover:bg-stone-100 text-stone-700 font-bold text-xs border border-stone-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md transition-colors flex items-center gap-1.5 active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Sí, Eliminar Definitivamente</span>
                  </button>
                </div>
              )}
            </div>
          ) : null}

          {/* Sección 1: Datos Principales de la Tienda */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-orange-500" />
                1. Información de la Sucursal
              </span>
              <span className="text-[10px] font-bold text-stone-400">ID: {currentBranch?.id}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Nombre Completo de la Sucursal *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Sucursal Matriz (Centro)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-500 text-stone-900 font-medium text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Nombre Corto (Botones y Tickets) *
                </label>
                <input
                  type="text"
                  required
                  value={shortName}
                  onChange={(e) => setShortName(e.target.value)}
                  placeholder="Ej. Matriz"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-500 text-stone-900 font-medium text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Código Operativo *
                </label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Ej. MAT-01"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono text-stone-900 font-bold text-sm uppercase"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-stone-400" />
                  Dirección y Localización
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ej. Av. Principal #450, Centro Histórico"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-500 text-stone-900 font-medium text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-stone-400" />
                  Teléfono de Contacto
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ej. 55 1234 5678"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-500 text-stone-900 font-medium text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Estado Operativo
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-500 text-stone-900 font-bold text-sm bg-white"
                >
                  <option value="abierta">● Abierta (En Operación)</option>
                  <option value="cerrada">○ Cerrada Temporalmente</option>
                  <option value="mantenimiento">▲ En Mantenimiento</option>
                </select>
              </div>
            </div>
          </div>

          {/* Sección 2: Encargado y Turno */}
          <div className="space-y-3.5 pt-4 border-t border-stone-200">
            <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-rose-500" />
              2. Encargado y Turno de Operación
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Nombre del Encargado / Responsable
                </label>
                <input
                  type="text"
                  value={manager}
                  onChange={(e) => setManager(e.target.value)}
                  placeholder="Ej. Don Toño Brito"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-500 text-stone-900 font-medium text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Usuario del Sistema Ligado (POS)
                </label>
                <select
                  value={assignedUserId}
                  onChange={(e) => {
                    setAssignedUserId(e.target.value);
                    const u = usersList.find((usr) => usr.id === e.target.value);
                    if (u && !manager) setManager(u.name);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-500 text-stone-900 font-medium text-sm bg-white"
                >
                  <option value="">-- Sin usuario ligado --</option>
                  {usersList.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.roleLabel})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-orange-500" />
                  Nombre / Horario del Turno Activo
                </label>
                <input
                  type="text"
                  value={shiftName}
                  onChange={(e) => setShiftName(e.target.value)}
                  placeholder="Ej. Turno Matutino (06:00 - 14:00)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-500 text-stone-900 font-medium text-sm"
                />
              </div>
            </div>
          </div>

          {/* Sección 3: Color Distintivo */}
          <div className="space-y-2.5 pt-4 border-t border-stone-200">
            <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-amber-500" />
              3. Color Distintivo de la Sucursal
            </span>
            <div className="flex items-center gap-2.5 flex-wrap">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColor(c.id)}
                  className={`w-9 h-9 rounded-xl ${c.bg} transition-all flex items-center justify-center text-white shadow-xs ${
                    color === c.id ? `ring-3 ${c.ring} ring-offset-2 scale-110` : "opacity-75 hover:opacity-100"
                  }`}
                  title={c.label}
                >
                  {color === c.id && <CheckCircle2 className="w-4 h-4 stroke-[3]" />}
                </button>
              ))}
              <span className="text-xs font-bold text-stone-600 ml-2">
                {COLOR_OPTIONS.find((c) => c.id === color)?.label || color}
              </span>
            </div>
          </div>

          {/* Pie de Acciones del Formulario */}
          <div className="pt-4 border-t border-stone-200 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 shrink-0">
            {/* Botón de Eliminar Sucursal */}
            {!confirmDelete && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-rose-600 hover:bg-rose-50 font-bold text-xs border border-rose-200 flex items-center justify-center gap-1.5 transition-colors active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>Eliminar Sucursal</span>
              </button>
            )}

            <div className="w-full sm:w-auto flex items-center justify-end gap-2.5 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:brightness-110 text-white font-black text-xs shadow-lg shadow-orange-500/25 transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Guardar Cambios</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
