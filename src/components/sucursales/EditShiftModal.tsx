"use client";

import React, { useState, useEffect } from "react";
import { 
  X, 
  Clock, 
  Store, 
  Sun, 
  Sunset, 
  Moon, 
  Check, 
  Calendar, 
  User as UserIcon,
  Sparkles,
  AlertCircle
} from "lucide-react";
import { Branch, BranchShift } from "@/types";
import { useAuth } from "@/context/AuthContext";

interface EditShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  branch: Branch | null;
  onSaveShift: (branchId: string, updatedShift: BranchShift) => void;
}

const PRESET_SCHEDULES = [
  { label: "Matutino Temprano", start: "06:00", end: "14:00", shiftType: "Turno Matutino", icon: "🌅" },
  { label: "Matutino Mercado", start: "06:30", end: "14:30", shiftType: "Turno Matutino", icon: "🥐" },
  { label: "Matutino Plaza", start: "07:00", end: "15:00", shiftType: "Turno Matutino", icon: "☕" },
  { label: "Vespertino Tarde", start: "14:00", end: "22:00", shiftType: "Turno Vespertino", icon: "☀️" },
  { label: "Vespertino Cierre", start: "15:00", end: "23:00", shiftType: "Turno Vespertino", icon: "🌙" },
  { label: "Turno Mixto", start: "10:00", end: "18:00", shiftType: "Turno Mixto", icon: "🔄" },
];

export default function EditShiftModal({
  isOpen,
  onClose,
  branch,
  onSaveShift,
}: EditShiftModalProps) {
  const { usersList } = useAuth();

  const [shiftType, setShiftType] = useState<string>("Turno Matutino");
  const [startTime, setStartTime] = useState<string>("06:00");
  const [endTime, setEndTime] = useState<string>("14:00");
  const [cashier, setCashier] = useState<string>("");
  const [initialFund, setInitialFund] = useState<number>(1000);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Parse existing branch currentShift on open
  useEffect(() => {
    if (!branch) return;

    const current = branch.currentShift;
    setCashier(current.cashier || branch.manager || "Cajero");
    setInitialFund(current.initialFund || 1000);
    setSavedSuccess(false);

    // Try parsing name like "Turno Matutino (06:00 - 14:00)"
    const match = current.name.match(/^(.*?)\s*\((.*?)\s*-\s*(.*?)\)$/);
    if (match) {
      setShiftType(match[1].trim());
      setStartTime(match[2].trim());
      setEndTime(match[3].trim());
    } else {
      // Fallback
      setShiftType(current.name || "Turno Matutino");
      setStartTime("06:00");
      setEndTime("14:00");
    }
  }, [branch, isOpen]);

  if (!isOpen || !branch) return null;

  // Compute composite name
  const formattedShiftName = `${shiftType.trim()} (${startTime} - ${endTime})`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const updatedShift: BranchShift = {
      ...branch.currentShift,
      name: formattedShiftName,
      cashier: cashier.trim() || branch.currentShift.cashier,
      initialFund: Number(initialFund) || branch.currentShift.initialFund,
      openedAt: `${startTime} hrs`,
    };

    onSaveShift(branch.id, updatedShift);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 900);
  };

  const applyPreset = (preset: typeof PRESET_SCHEDULES[0]) => {
    setShiftType(preset.shiftType);
    setStartTime(preset.start);
    setEndTime(preset.end);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 text-white p-5 sm:p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-stone-300 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/25">
              <Clock className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">
                  {branch.code}
                </span>
                <span className="text-xs text-stone-400 font-semibold">Configuración de Horario</span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight mt-0.5">
                Modificar Horario de Turno
              </h3>
              <p className="text-xs text-stone-300 font-medium">
                {branch.name}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 max-h-[calc(90vh-140px)] overflow-y-auto">
          {/* Plantillas Rápidas de Horario */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-orange-500" />
              <span>Plantillas Rápidas de Horarios:</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PRESET_SCHEDULES.map((preset, idx) => {
                const isCurrent = startTime === preset.start && endTime === preset.end && shiftType === preset.shiftType;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className={`p-2.5 rounded-xl text-left text-xs transition-all border ${
                      isCurrent
                        ? "bg-orange-50 border-orange-500 text-orange-950 font-black shadow-sm ring-1 ring-orange-500"
                        : "bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700 font-medium"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{preset.icon}</span>
                      <span className="text-[10px] font-bold text-stone-500">{preset.start} - {preset.end}</span>
                    </div>
                    <p className="text-[11px] font-bold mt-1 truncate">{preset.label}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Nombre / Tipo de Turno */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-orange-500" />
              <span>Nombre o Tipo de Turno:</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {["Turno Matutino", "Turno Vespertino", "Turno Mixto"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setShiftType(type)}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold border text-center transition-all ${
                    shiftType === type
                      ? "bg-stone-900 text-white border-stone-900 shadow-sm"
                      : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
                  }`}
                >
                  {type.replace("Turno ", "")}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={shiftType}
              onChange={(e) => setShiftType(e.target.value)}
              placeholder="O escribe un nombre personalizado (ej. Turno Nocturno)"
              className="w-full mt-1.5 px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>

          {/* Rango de Horas: Inicio y Fin */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 flex items-center gap-1">
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Hora de Entrada (Inicio):</span>
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-black text-stone-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 flex items-center gap-1">
                <Sunset className="w-3.5 h-3.5 text-rose-500" />
                <span>Hora de Salida (Fin):</span>
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-black text-stone-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              />
            </div>
          </div>

          {/* Cajera / Operador Asignado */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5 text-orange-500" />
              <span>Cajera u Operador Responsable:</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={cashier}
                onChange={(e) => setCashier(e.target.value)}
                placeholder="Nombre de la cajera"
                className="flex-1 px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              />
              {usersList && usersList.length > 0 && (
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) setCashier(e.target.value);
                  }}
                  className="px-3 py-2.5 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-xl text-xs font-bold text-stone-700 cursor-pointer"
                >
                  <option value="">Elegir usuario...</option>
                  {usersList.map((u) => (
                    <option key={u.id} value={u.name}>
                      {u.name} ({u.roleLabel})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Vista Previa del Nuevo Horario */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-600" /> Vista previa en el sistema:
            </span>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-800 font-black text-xs border border-orange-300/80 shadow-xs">
                {formattedShiftName}
              </span>
              <span className="text-xs text-stone-500 font-medium">
                • Responsable: <strong className="text-stone-800">{cashier || "Sin asignar"}</strong>
              </span>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={savedSuccess}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-rose-600 hover:brightness-110 text-white font-black text-xs shadow-lg shadow-orange-500/25 active:scale-95 transition-all disabled:opacity-80"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>¡Horario Guardado!</span>
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4" />
                  <span>Guardar Horario</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
