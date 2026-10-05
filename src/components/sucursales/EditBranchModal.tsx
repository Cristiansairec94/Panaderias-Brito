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
  ShieldCheck,
  Edit3,
  Clock,
  UserCheck,
  Tag,
  Sparkles,
  Check,
  ChevronDown
} from "lucide-react";
import { Branch } from "@/types";
import { useAuth } from "@/context/AuthContext";

interface EditBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchToEdit: Branch | null;
  branches: Branch[];
  onUpdateBranch: (branchId: string, updates: Partial<Branch>) => void;
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

const PRESET_SHIFTS = [
  "Turno Matutino (06:00 - 14:00)",
  "Turno Vespertino (14:00 - 22:00)",
  "Turno Mixto (07:00 - 19:00)",
  "Turno Especial (06:30 - 14:30)",
];

export default function EditBranchModal({
  isOpen,
  onClose,
  branchToEdit,
  branches,
  onUpdateBranch,
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
  
  // Assignment mode: "existing" user card vs "custom" name
  const [assignmentMode, setAssignmentMode] = useState<"existing" | "custom">("existing");
  const [assignedUserId, setAssignedUserId] = useState<string>("");

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
      setAssignmentMode(active.assignedUserId ? "existing" : "custom");
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
      setAssignmentMode(target.assignedUserId ? "existing" : "custom");
      if (onSelectBranchToEdit) onSelectBranchToEdit(target);
    }
  };

  if (!isOpen) return null;

  const currentBranch = branches.find((b) => b.id === selectedBranchId) || branchToEdit;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBranch || !name.trim()) return;

    let finalManager = manager.trim();
    let finalUserId: string | undefined = undefined;
    let finalUserName: string | undefined = undefined;
    let finalUserEmail: string | undefined = undefined;

    if (assignmentMode === "existing" && assignedUserId) {
      const assignedUser = usersList.find((u) => u.id === assignedUserId);
      if (assignedUser) {
        finalUserId = assignedUser.id;
        finalUserName = assignedUser.name;
        finalUserEmail = assignedUser.email;
        if (!finalManager || finalManager === currentBranch.manager) {
          finalManager = assignedUser.name;
        }
      }
    } else if (assignmentMode === "custom") {
      finalUserId = undefined;
      finalUserName = undefined;
      finalUserEmail = undefined;
    }

    const updates: Partial<Branch> = {
      name: name.trim(),
      shortName: shortName.trim() || name.trim().split(" ")[0],
      code: code.trim().toUpperCase() || currentBranch.code,
      address: address.trim() || currentBranch.address,
      phone: phone.trim() || currentBranch.phone,
      manager: finalManager || currentBranch.manager,
      assignedUserId: finalUserId,
      assignedUserName: finalUserName,
      assignedUserEmail: finalUserEmail,
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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full sm:max-w-xl md:max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[90vh] animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Barra superior de arrastre en móviles */}
        <div className="w-12 h-1.5 bg-stone-300 rounded-full mx-auto mt-2.5 mb-1 sm:hidden" />

        {/* Encabezado Principal */}
        <div className="px-5 py-4 bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 text-white flex items-center justify-between border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-sm shrink-0">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base text-white flex items-center gap-1.5">
                Editar Datos de la Sucursal
              </h3>
              <p className="text-[11px] text-stone-300 font-medium">
                Actualiza datos operativos, encargado y configuración de la tienda
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

        {/* Selector Desplegable de Sucursales */}
        {branches.length > 1 && (
          <div className="px-5 py-3 bg-stone-50 border-b border-stone-200/80 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 shrink-0">
            <label 
              htmlFor="edit-branch-select"
              className="text-xs font-bold text-stone-700 whitespace-nowrap flex items-center gap-1.5 shrink-0"
            >
              <Store className="w-4 h-4 text-orange-600" />
              <span>Seleccionar tienda a editar:</span>
            </label>
            <div className="relative flex-1">
              <select
                id="edit-branch-select"
                value={selectedBranchId}
                onChange={(e) => handleBranchSwitch(e.target.value)}
                className="w-full pl-3.5 pr-9 py-2 rounded-xl border border-stone-300 bg-white text-xs sm:text-sm font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-2xs appearance-none cursor-pointer"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code}) — {b.status === "abierta" ? "● Abierta" : b.status === "mantenimiento" ? "▲ Mantenimiento" : "○ Cerrada"}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-stone-500">
                <ChevronDown className="w-4 h-4 text-stone-400" />
              </div>
            </div>
          </div>
        )}

        {/* Formulario con Scroll Suave y Secciones Elevadas */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4 sm:space-y-5">
          
          {/* SECCIÓN 1: INFORMACIÓN Y LOCALIZACIÓN DE LA TIENDA */}
          <div className="bg-stone-50/70 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-stone-200/80 shadow-xs space-y-4">
            {/* Header de la Sección 1 */}
            <div className="flex items-center justify-between border-b border-stone-200/70 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-black shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-black text-stone-900 text-xs sm:text-sm uppercase tracking-wide">
                    1. Información de la Sucursal
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    Datos comerciales y localización física de la tienda
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-white border border-stone-200 text-[10px] font-mono font-bold text-stone-600 shadow-2xs">
                ID: {currentBranch?.id}
              </span>
            </div>

            {/* Inputs de la Sección 1 */}
            <div className="space-y-3.5">
              {/* Nombre Completo */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Nombre Completo de la Sucursal <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Sucursal San Juan"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-500 font-bold text-stone-900 text-sm bg-white shadow-2xs placeholder:text-stone-400"
                  />
                </div>
              </div>

              {/* Nombre Corto y Código Operativo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-stone-400" />
                    Nombre Corto (Botones y Tickets) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={shortName}
                    onChange={(e) => setShortName(e.target.value)}
                    placeholder="Ej. San Juan"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-500 font-bold text-stone-900 text-sm bg-white shadow-2xs placeholder:text-stone-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Código Operativo Único <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="Ej. SJU-02"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono font-black text-stone-900 text-sm uppercase bg-white shadow-2xs tracking-wider"
                  />
                </div>
              </div>

              {/* Dirección y Ubicación */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-stone-400" />
                  Dirección y Localización
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ej. Calle Morelos #45, Col. San Juan"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-500 text-stone-900 font-medium text-sm bg-white shadow-2xs placeholder:text-stone-400"
                />
              </div>

              {/* Teléfono de Contacto */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-stone-400" />
                  Teléfono de Contacto
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ej. 55 8765 4321"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-500 text-stone-900 font-medium text-sm bg-white shadow-2xs placeholder:text-stone-400"
                />
              </div>

              {/* Estado Operativo: Chips Táctiles Interactivos (reemplaza el select feo) */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  Estado Operativo de la Tienda
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setStatus("abierta")}
                    className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                      status === "abierta"
                        ? "bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20 shadow-xs font-black"
                        : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50 font-bold"
                    }`}
                  >
                    <span className="flex items-center gap-1.5 text-xs">
                      <span className={`w-2 h-2 rounded-full ${status === "abierta" ? "bg-emerald-500 animate-pulse" : "bg-stone-400"}`} />
                      Abierta
                    </span>
                    <span className="text-[10px] text-stone-500 font-normal hidden sm:inline">En Operación</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatus("mantenimiento")}
                    className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                      status === "mantenimiento"
                        ? "bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-500/20 shadow-xs font-black"
                        : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50 font-bold"
                    }`}
                  >
                    <span className="flex items-center gap-1.5 text-xs">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Mantenimiento
                    </span>
                    <span className="text-[10px] text-stone-500 font-normal hidden sm:inline">Pausa Temporal</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatus("cerrada")}
                    className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                      status === "cerrada"
                        ? "bg-stone-100 border-stone-500 text-stone-900 ring-2 ring-stone-400/20 shadow-xs font-black"
                        : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50 font-bold"
                    }`}
                  >
                    <span className="flex items-center gap-1.5 text-xs">
                      <span className="w-2 h-2 rounded-full bg-stone-400" />
                      Cerrada
                    </span>
                    <span className="text-[10px] text-stone-500 font-normal hidden sm:inline">Fuera de Servicio</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: ENCARGADO Y TURNO DE OPERACIÓN */}
          <div className="bg-stone-50/70 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-stone-200/80 shadow-xs space-y-4">
            {/* Header de la Sección 2 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-stone-200/70 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black shrink-0">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-black text-stone-900 text-xs sm:text-sm uppercase tracking-wide">
                    2. Encargado y Turno de Operación
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    Responsable de caja, usuario ligado al POS y turno de trabajo
                  </p>
                </div>
              </div>

              {/* Selector de Modo: Personal Registrado vs Nombre Libre */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-stone-200 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setAssignmentMode("existing")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    assignmentMode === "existing"
                      ? "bg-stone-900 text-white shadow-xs font-black"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  Personal Registrado
                </button>
                <button
                  type="button"
                  onClick={() => setAssignmentMode("custom")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    assignmentMode === "custom"
                      ? "bg-stone-900 text-white shadow-xs font-black"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  Nombre Manual
                </button>
              </div>
            </div>

            {/* Asignación de Encargado */}
            {assignmentMode === "existing" ? (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-stone-700">
                  Selecciona la cuenta de usuario ligada al POS de esta sucursal:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {usersList.map((usr) => {
                    const isSelected = assignedUserId === usr.id;
                    return (
                      <div
                        key={usr.id}
                        onClick={() => {
                          setAssignedUserId(usr.id);
                          setManager(usr.name);
                        }}
                        className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2.5 transition-all active:scale-[0.99] ${
                          isSelected
                            ? "bg-emerald-50 border-emerald-500 shadow-xs ring-1 ring-emerald-500"
                            : "bg-white border-stone-200 hover:border-stone-300"
                        }`}
                      >
                        <div className="w-8 h-8 rounded-xl bg-stone-100 flex items-center justify-center text-base shrink-0">
                          {usr.avatar || "👤"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-stone-900 text-xs truncate">{usr.name}</p>
                          <p className="text-[10px] text-stone-500 truncate">{usr.roleLabel} • {usr.email}</p>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Nombre del Encargado / Responsable en Mostrador
                </label>
                <input
                  type="text"
                  value={manager}
                  onChange={(e) => setManager(e.target.value)}
                  placeholder="Ej. Don Toño Brito o Maestro Juan"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-500 font-bold text-stone-900 text-sm bg-white shadow-2xs"
                />
              </div>
            )}

            {/* Nombre y Horario del Turno Activo */}
            <div className="pt-2 border-t border-stone-200/70 space-y-2">
              <label className="block text-xs font-bold text-stone-700 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  Nombre / Horario del Turno Activo
                </span>
                <span className="text-[10px] text-stone-400 font-normal">
                  Ej. Matutino (06:00 - 14:00)
                </span>
              </label>

              <input
                type="text"
                value={shiftName}
                onChange={(e) => setShiftName(e.target.value)}
                placeholder="Ej. Turno Matutino (06:30 - 14:30)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium text-stone-900 text-sm bg-white shadow-2xs"
              />

              {/* Botones de Horarios Predefinidos */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] font-bold text-stone-400 mr-1">Rápidos:</span>
                {PRESET_SHIFTS.map((ps) => (
                  <button
                    key={ps}
                    type="button"
                    onClick={() => setShiftName(ps)}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-stone-100 text-stone-600 font-bold text-[10px] border border-stone-200 transition-colors"
                  >
                    {ps.split(" ")[1]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: COLOR DISTINTIVO DE LA SUCURSAL */}
          <div className="bg-stone-50/70 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-stone-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-black shrink-0">
                  <Palette className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-black text-stone-900 text-xs uppercase tracking-wide">
                    3. Color Distintivo
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    Tono asignado en reportes, gráficas y tickets
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-stone-700 bg-white px-3 py-1 rounded-xl border border-stone-200 shadow-2xs">
                {COLOR_OPTIONS.find((c) => c.id === color)?.label || color}
              </span>
            </div>

            <div className="flex items-center gap-3 flex-wrap pt-1">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColor(c.id)}
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl ${c.bg} transition-all flex items-center justify-center text-white shadow-xs ${
                    color === c.id ? `ring-3 ${c.ring} ring-offset-2 scale-110 shadow-md` : "opacity-75 hover:opacity-100 active:scale-95"
                  }`}
                  title={c.label}
                >
                  {color === c.id && <Check className="w-5 h-5 stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Pie de Acciones del Formulario */}
          <div className="pt-2 flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:brightness-110 text-white font-black text-xs shadow-lg shadow-orange-500/25 transition-all active:scale-95 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Guardar Cambios</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
