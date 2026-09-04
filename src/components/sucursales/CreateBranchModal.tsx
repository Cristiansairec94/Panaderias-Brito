"use client";

import React, { useState } from "react";
import { 
  Building2, 
  Store, 
  UserCheck, 
  MapPin, 
  Phone, 
  DollarSign, 
  Wallet, 
  Target, 
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
  const [dailyGoal, setDailyGoal] = useState("8500");
  const [initialFund, setInitialFund] = useState("1000");
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
      dailyGoal: Number(dailyGoal) || 8500,
      todaySales: 0,
      todayTickets: 0,
      cashInDrawer: Number(initialFund) || 1000,
      color,
      currentShift: {
        id: `shift-${branchCode.toLowerCase()}-${Date.now()}`,
        name: shiftName,
        cashier: finalManager,
        openedAt: new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
        initialFund: Number(initialFund) || 1000,
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
    <div className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-2xl w-full overflow-hidden my-6 animate-in zoom-in-95">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-stone-950 via-stone-900 to-stone-950 p-6 text-white flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center text-white shadow-md shrink-0">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-tight text-white">
                  Registrar Nueva Sucursal
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">
                  Cadena Brito
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                Añade una nueva panadería a la red y asigna a su responsable de caja y operaciones.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs">
          {/* Section 1: Store Identification */}
          <div className="space-y-3">
            <h4 className="font-black text-stone-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5 border-b border-stone-100 pb-1.5">
              <Building2 className="w-4 h-4 text-orange-600" />
              1. Datos Generales de la Tienda
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="font-bold text-stone-700 block mb-1">
                  Nombre Completo de la Sucursal <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Sucursal Tepeyac (Norte) o Plaza Galerías"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 font-bold text-stone-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">
                  Código Único <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. TEP-04"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 font-mono font-black text-stone-900 uppercase focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-bold text-stone-700 block mb-1">
                  Nombre Corto (Para Tickets) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Tepeyac"
                  value={shortName}
                  onChange={(e) => setShortName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 font-bold text-stone-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-bold text-stone-700 block mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-stone-400" />
                  Dirección / Ubicación
                </label>
                <input
                  type="text"
                  placeholder="Ej. Calzada de Guadalupe #320, Col. Tepeyac"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-800 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-stone-700 block mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-stone-400" />
                  Teléfono de Contacto
                </label>
                <input
                  type="text"
                  placeholder="55 1234 5678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-800 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1 flex items-center gap-1">
                  <Palette className="w-3.5 h-3.5 text-stone-400" />
                  Color Distintivo en Paneles & Gráficas
                </label>
                <div className="flex items-center gap-2 pt-1">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setColor(c.id)}
                      className={`w-7 h-7 rounded-xl ${c.bg} transition-all relative ${
                        color === c.id ? "ring-2 ring-offset-2 " + c.ring + " scale-110 shadow-md" : "opacity-75 hover:opacity-100"
                      }`}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Manager Assignment (Encargado) */}
          <div className="space-y-3 bg-stone-50 p-4 rounded-2xl border border-stone-200/80">
            <div className="flex items-center justify-between border-b border-stone-200/70 pb-2">
              <h4 className="font-black text-stone-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                2. Asignación de Encargado de Sucursal
              </h4>

              <div className="flex items-center gap-1 bg-white p-0.5 rounded-xl border border-stone-200 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setAssignmentMode("existing")}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    assignmentMode === "existing" ? "bg-stone-900 text-white shadow-sm" : "text-stone-600"
                  }`}
                >
                  Personal Registrado
                </button>
                <button
                  type="button"
                  onClick={() => setAssignmentMode("custom")}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    assignmentMode === "custom" ? "bg-stone-900 text-white shadow-sm" : "text-stone-600"
                  }`}
                >
                  Nuevo Nombre
                </button>
              </div>
            </div>

            {assignmentMode === "existing" ? (
              <div className="space-y-2">
                <label className="font-bold text-stone-700 block">
                  Selecciona al empleado o encargado responsable:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {usersList.map((usr) => {
                    const isSelected = selectedUserId === usr.id;
                    return (
                      <div
                        key={usr.id}
                        onClick={() => setSelectedUserId(usr.id)}
                        className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2.5 transition-all ${
                          isSelected
                            ? "bg-emerald-50 border-emerald-500 shadow-sm ring-1 ring-emerald-500"
                            : "bg-white border-stone-200 hover:border-stone-300"
                        }`}
                      >
                        <div className="w-8 h-8 rounded-xl bg-stone-100 flex items-center justify-center text-lg shrink-0">
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
                <label className="font-bold text-stone-700 block mb-1">
                  Nombre del Encargado / Responsable Externo <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej. Roberto Sánchez Gómez"
                  value={customManagerName}
                  onChange={(e) => setCustomManagerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-stone-300 font-bold text-stone-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Section 3: Daily Goal & Opening Cash Fund */}
          <div className="space-y-3">
            <h4 className="font-black text-stone-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5 border-b border-stone-100 pb-1.5">
              <DollarSign className="w-4 h-4 text-amber-600" />
              3. Metas y Fondo de Caja Inicial
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-stone-700 block mb-1 flex items-center gap-1">
                  <Target className="w-3.5 h-3.5 text-orange-600" />
                  Meta Diaria de Ventas ($ MXN)
                </label>
                <input
                  type="number"
                  step="100"
                  min="1000"
                  required
                  value={dailyGoal}
                  onChange={(e) => setDailyGoal(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 font-mono font-bold text-stone-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1 flex items-center gap-1">
                  <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                  Fondo Inicial de Caja / Gaveta ($ MXN)
                </label>
                <input
                  type="number"
                  step="100"
                  min="0"
                  required
                  value={initialFund}
                  onChange={(e) => setInitialFund(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 font-mono font-bold text-stone-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Modal Footer Buttons */}
          <div className="pt-4 border-t border-stone-200 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 hover:brightness-110 text-white font-black text-xs shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Crear y Abrir Sucursal</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
