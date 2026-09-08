"use client";

import React, { useState } from "react";
import { 
  Building2, 
  Store, 
  UserCheck, 
  MapPin, 
  Phone, 
  Palette, 
  X, 
  CheckCircle2, 
  Plus,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { Branch, AppUser } from "@/types";
import { useAuth } from "@/context/AuthContext";

interface CreateBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddBranch: (newBranch: Branch) => void;
  existingCount: number;
}

const COLOR_OPTIONS = [
  { id: "orange", label: "Naranja Brito", bg: "bg-orange-500", ring: "ring-orange-500" },
  { id: "rose", label: "Rosa Mercado", bg: "bg-rose-500", ring: "ring-rose-500" },
  { id: "amber", label: "Ámbar Trigo", bg: "bg-amber-500", ring: "ring-amber-500" },
  { id: "emerald", label: "Verde Esmeralda", bg: "bg-emerald-500", ring: "ring-emerald-500" },
  { id: "blue", label: "Azul Real", bg: "bg-blue-500", ring: "ring-blue-500" },
  { id: "purple", label: "Púrpura Imperial", bg: "bg-purple-500", ring: "ring-purple-500" },
];

export default function CreateBranchModal({
  isOpen,
  onClose,
  onAddBranch,
  existingCount,
}: CreateBranchModalProps) {
  const { usersList } = useAuth();

  // Form State
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [code, setCode] = useState(`SUC-0${existingCount + 1}`);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("55 ");
  const [color, setColor] = useState("emerald");
  const [shiftName, setShiftName] = useState("Turno Matutino (06:00 - 14:00)");

  // Manager assignment state
  const [assignmentMode, setAssignmentMode] = useState<"existing" | "custom">("existing");
  const [selectedUserId, setSelectedUserId] = useState<string>(usersList[0]?.id || "");
  const [customManagerName, setCustomManagerName] = useState("");

  if (!isOpen) return null;

  // Auto-generate code and shortName when typing branch name
  const handleNameChange = (val: string) => {
    setName(val);
    if (!shortName || shortName === name.split(" ")[0]) {
      const clean = val.replace(/sucursal/i, "").trim().split(" ")[0] || "";
      setShortName(clean);
      if (clean && (!code || code.startsWith("SUC-"))) {
        setCode(`${clean.slice(0, 3).toUpperCase()}-0${existingCount + 1}`);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let finalManager = "";
    let finalUserId: string | undefined = undefined;
    let finalUserName: string | undefined = undefined;
    let finalUserEmail: string | undefined = undefined;

    if (assignmentMode === "existing") {
      const foundUser = usersList.find((u) => u.id === selectedUserId);
      if (foundUser) {
        finalManager = foundUser.name;
        finalUserId = foundUser.id;
        finalUserName = foundUser.name;
        finalUserEmail = foundUser.email;
      } else {
        finalManager = "Don Toño Brito";
      }
    } else {
      finalManager = customManagerName.trim() || "Encargado Asignado";
    }

    const branchCode = code.trim().toUpperCase() || `SUC-0${existingCount + 1}`;
    const newBranch: Branch = {
      id: `branch-${Date.now()}`,
      name: name.trim(),
      shortName: shortName.trim() || name.trim().split(" ")[0],
      code: branchCode,
      address: address.trim() || "Dirección de la nueva sucursal",
      phone: phone.trim() || "55 1234 5678",
      manager: finalManager,
      assignedUserId: finalUserId,
      assignedUserName: finalUserName,
      assignedUserEmail: finalUserEmail,
      status: "abierta",
      dailyGoal: 0,
      todaySales: 0,
      todayTickets: 0,
      cashInDrawer: 0,
      color,
      currentShift: {
        id: `shift-${branchCode.toLowerCase()}-${Date.now()}`,
        name: shiftName,
        cashier: finalManager,
        openedAt: new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
        initialFund: 0,
        cashSales: 0,
        cardSales: 0,
        transferSales: 0,
        totalSales: 0,
        ticketCount: 0,
        status: "abierto",
      },
    };

    onAddBranch(newBranch);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 overflow-hidden animate-in fade-in duration-200">
      <div className="bg-white rounded-t-[28px] sm:rounded-3xl border border-stone-200 shadow-2xl w-full max-w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl flex flex-col h-[92vh] sm:h-auto sm:max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        {/* Mobile Drag Indicator Bar */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 bg-stone-950">
          <div className="w-12 h-1.5 bg-stone-700 rounded-full" />
        </div>

        {/* Modal Header */}
        <div className="bg-gradient-to-r from-stone-950 via-stone-900 to-stone-950 px-4 py-3.5 sm:px-6 sm:py-5 text-white flex items-center justify-between border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center text-white shadow-md shrink-0">
              <Store className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white truncate">
                  Registrar Nueva Sucursal
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30 shrink-0 hidden xs:inline-block">
                  Cadena Brito
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-stone-400 mt-0.5 truncate sm:whitespace-normal">
                Añade una nueva panadería a la red y asigna a su responsable.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="p-2 sm:p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white transition-colors shrink-0 active:scale-95 ml-2"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Modal Form with Scrollable Body and Fixed Footer */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          {/* Scrollable Form Content */}
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1 overscroll-contain">
            {/* Section 1: Store Identification */}
            <div className="space-y-3">
              <h4 className="font-black text-stone-900 uppercase tracking-wider text-[11px] sm:text-xs flex items-center gap-1.5 border-b border-stone-100 pb-1.5">
                <Building2 className="w-4 h-4 text-orange-600" />
                1. Datos Generales de la Tienda
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="font-bold text-stone-700 text-xs sm:text-[13px] block mb-1">
                    Nombre Completo de la Sucursal <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Sucursal Tepeyac (Norte) o Plaza Galerías"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 sm:py-2 text-sm sm:text-xs rounded-xl border border-stone-300 font-bold text-stone-900 focus:ring-2 focus:ring-orange-500 focus:outline-none transition-all placeholder:text-stone-400"
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-700 text-xs sm:text-[13px] block mb-1">
                    Código Único <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. TEP-04"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2.5 sm:py-2 text-sm sm:text-xs rounded-xl border border-stone-300 font-mono font-black text-stone-900 uppercase focus:ring-2 focus:ring-orange-500 focus:outline-none transition-all placeholder:text-stone-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-stone-700 text-xs sm:text-[13px] block mb-1">
                    Nombre Corto (Para Tickets) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Tepeyac"
                    value={shortName}
                    onChange={(e) => setShortName(e.target.value)}
                    className="w-full px-3.5 py-2.5 sm:py-2 text-sm sm:text-xs rounded-xl border border-stone-300 font-bold text-stone-900 focus:ring-2 focus:ring-orange-500 focus:outline-none transition-all placeholder:text-stone-400"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-bold text-stone-700 text-xs sm:text-[13px] block mb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-stone-400" />
                    Dirección / Ubicación
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Calzada de Guadalupe #320, Col. Tepeyac"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 sm:py-2 text-sm sm:text-xs rounded-xl border border-stone-300 text-stone-800 focus:ring-2 focus:ring-orange-500 focus:outline-none transition-all placeholder:text-stone-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <label className="font-bold text-stone-700 text-xs sm:text-[13px] block mb-1 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-stone-400" />
                    Teléfono de Contacto
                  </label>
                  <input
                    type="text"
                    placeholder="55 1234 5678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 sm:py-2 text-sm sm:text-xs rounded-xl border border-stone-300 text-stone-800 focus:ring-2 focus:ring-orange-500 focus:outline-none transition-all placeholder:text-stone-400"
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-700 text-xs sm:text-[13px] block mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Palette className="w-3.5 h-3.5 text-stone-400" />
                      Color Distintivo
                    </span>
                    <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wide">
                      {COLOR_OPTIONS.find((c) => c.id === color)?.label}
                    </span>
                  </label>
                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    {COLOR_OPTIONS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setColor(c.id)}
                        className={`w-8 h-8 sm:w-7 sm:h-7 rounded-xl ${c.bg} transition-all relative ${
                          color === c.id ? "ring-2 ring-offset-2 " + c.ring + " scale-110 shadow-md" : "opacity-75 hover:opacity-100 active:scale-95"
                        }`}
                        title={c.label}
                        aria-label={c.label}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Manager Assignment (Encargado) */}
            <div className="space-y-3 bg-stone-50 p-3.5 sm:p-4 rounded-2xl border border-stone-200/80">
              <div className="flex flex-col xs:flex-row sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200/70 pb-2.5">
                <h4 className="font-black text-stone-900 uppercase tracking-wider text-[11px] sm:text-xs flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>2. Asignación de Encargado</span>
                </h4>

                <div className="grid grid-cols-2 sm:flex items-center gap-1 bg-white p-1 rounded-xl border border-stone-200 text-[11px] font-bold w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setAssignmentMode("existing")}
                    className={`px-3 py-1.5 sm:py-1 rounded-lg transition-all text-center ${
                      assignmentMode === "existing" ? "bg-stone-900 text-white shadow-sm font-black" : "text-stone-600 hover:text-stone-900"
                    }`}
                  >
                    Personal Registrado
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignmentMode("custom")}
                    className={`px-3 py-1.5 sm:py-1 rounded-lg transition-all text-center ${
                      assignmentMode === "custom" ? "bg-stone-900 text-white shadow-sm font-black" : "text-stone-600 hover:text-stone-900"
                    }`}
                  >
                    Nuevo Nombre
                  </button>
                </div>
              </div>

              {assignmentMode === "existing" ? (
                <div className="space-y-2">
                  <label className="font-bold text-stone-700 text-xs block">
                    Selecciona al empleado o encargado responsable:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 sm:max-h-52 overflow-y-auto pr-1">
                    {usersList.map((usr) => {
                      const isSelected = selectedUserId === usr.id;
                      return (
                        <div
                          key={usr.id}
                          onClick={() => setSelectedUserId(usr.id)}
                          className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2.5 transition-all active:scale-[0.99] ${
                            isSelected
                              ? "bg-emerald-50 border-emerald-500 shadow-sm ring-1 ring-emerald-500"
                              : "bg-white border-stone-200 hover:border-stone-300"
                          }`}
                        >
                          <div className="w-8 h-8 rounded-xl bg-stone-100 flex items-center justify-center text-base sm:text-lg shrink-0">
                            {usr.avatar || "👤"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-stone-900 text-xs truncate">{usr.name}</p>
                            <p className="text-[10px] text-stone-500 truncate">{usr.roleLabel}</p>
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
                  <label className="font-bold text-stone-700 text-xs block mb-1">
                    Nombre del Encargado / Responsable Externo <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Roberto Sánchez Gómez"
                    value={customManagerName}
                    onChange={(e) => setCustomManagerName(e.target.value)}
                    className="w-full px-3.5 py-2.5 sm:py-2 bg-white rounded-xl border border-stone-300 text-sm sm:text-xs font-bold text-stone-900 focus:ring-2 focus:ring-orange-500 focus:outline-none transition-all placeholder:text-stone-400"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer Buttons (Pinned at Bottom) */}
          <div className="p-3.5 sm:p-4 px-4 sm:px-6 bg-stone-50/95 backdrop-blur border-t border-stone-200 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 sm:py-2 rounded-xl bg-white hover:bg-stone-100 text-stone-700 font-bold text-xs border border-stone-300 sm:border-stone-200 transition-colors text-center active:scale-95"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 sm:py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 hover:brightness-110 text-white font-black text-xs shadow-lg shadow-orange-500/20 active:scale-95 transition-all text-center"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Crear y Abrir Sucursal</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
