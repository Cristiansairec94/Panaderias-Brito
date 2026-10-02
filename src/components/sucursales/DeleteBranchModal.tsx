"use client";

import React, { useState, useEffect } from "react";
import {
  Trash2,
  AlertTriangle,
  Building2,
  Store,
  MapPin,
  ShieldCheck,
  Wallet,
  Receipt,
  X,
  CheckCircle2,
  ChevronDown
} from "lucide-react";
import { Branch } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface DeleteBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchToDelete: Branch | null;
  branches: Branch[];
  onConfirmDelete: (branchId: string) => void;
  onSelectBranchToDelete?: (branch: Branch) => void;
}

export default function DeleteBranchModal({
  isOpen,
  onClose,
  branchToDelete,
  branches,
  onConfirmDelete,
  onSelectBranchToDelete,
}: DeleteBranchModalProps) {
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");

  useEffect(() => {
    const active = branchToDelete || (branches.length > 0 ? branches[0] : null);
    if (active) {
      setSelectedBranchId(active.id);
    }
  }, [branchToDelete, branches, isOpen]);

  if (!isOpen) return null;

  const currentBranch = branches.find((b) => b.id === selectedBranchId) || branchToDelete || branches[0];
  const isOnlyBranch = branches.length <= 1;

  const handleBranchSwitch = (id: string) => {
    setSelectedBranchId(id);
    const target = branches.find((b) => b.id === id);
    if (target && onSelectBranchToDelete) {
      onSelectBranchToDelete(target);
    }
  };

  const handleDelete = () => {
    if (!currentBranch || isOnlyBranch) return;
    onConfirmDelete(currentBranch.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh] animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Barra superior de arrastre en móviles */}
        <div className="w-12 h-1.5 bg-stone-300 rounded-full mx-auto mt-2.5 mb-1 sm:hidden" />

        {/* Encabezado */}
        <div className="px-5 py-4 bg-gradient-to-r from-rose-950 via-rose-900 to-stone-900 text-white flex items-center justify-between border-b border-rose-800/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-rose-300 shadow-sm shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base text-white flex items-center gap-1.5">
                Eliminar Sucursal de la Red
              </h3>
              <p className="text-[11px] text-rose-200/80 font-medium">
                Retiro permanente de tienda y puntos de cobro
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-rose-200 hover:text-white flex items-center justify-center transition-colors"
            title="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selector Desplegable de Sucursales */}
        {branches.length > 1 && (
          <div className="px-5 py-3 bg-stone-50 border-b border-stone-200/80 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 shrink-0">
            <label 
              htmlFor="delete-branch-select"
              className="text-xs font-bold text-stone-700 whitespace-nowrap flex items-center gap-1.5 shrink-0"
            >
              <Store className="w-4 h-4 text-rose-600" />
              <span>Seleccionar tienda:</span>
            </label>
            <div className="relative flex-1">
              <select
                id="delete-branch-select"
                value={selectedBranchId}
                onChange={(e) => handleBranchSwitch(e.target.value)}
                className="w-full pl-3.5 pr-9 py-2 rounded-xl border border-stone-300 bg-white text-xs sm:text-sm font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-2xs appearance-none cursor-pointer"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code}) — Encargado: {b.manager}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-stone-500">
                <ChevronDown className="w-4 h-4 text-stone-400" />
              </div>
            </div>
          </div>
        )}

        {/* Contenido */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Tarjeta de Resumen de la Sucursal a Retirar */}
          {currentBranch && (
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-stone-800 to-stone-900 text-white flex items-center justify-center font-black text-lg shadow-sm">
                    🏪
                  </div>
                  <div>
                    <h4 className="font-black text-stone-900 text-sm sm:text-base">
                      {currentBranch.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-stone-200 text-stone-700">
                        {currentBranch.code}
                      </span>
                      <span className="text-xs text-stone-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-stone-400" />
                        <span className="truncate max-w-[200px]">{currentBranch.address}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-200/70 text-xs">
                <div className="p-2 rounded-xl bg-white border border-stone-200/70">
                  <span className="text-[10px] font-bold text-stone-400 uppercase block">Encargado</span>
                  <span className="font-black text-stone-800 block truncate mt-0.5">
                    {currentBranch.manager}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-white border border-stone-200/70">
                  <span className="text-[10px] font-bold text-stone-400 uppercase block">Efectivo en Caja</span>
                  <span className="font-black text-emerald-600 block mt-0.5">
                    {formatCurrency(currentBranch.cashInDrawer)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Advertencia de Seguridad */}
          {isOnlyBranch ? (
            <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 space-y-2">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-black text-amber-900 text-xs uppercase tracking-wide">
                    Acción Bloqueada
                  </h5>
                  <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                    No es posible eliminar <strong>"{currentBranch?.name}"</strong> porque es la <strong>única sucursal activa</strong> de la panadería. El sistema requiere al menos una tienda activa para operar ventas y pedidos.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 space-y-2">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-black text-rose-900 text-xs uppercase tracking-wide">
                    Confirmación de Eliminación Definitiva
                  </h5>
                  <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                    Al confirmar, esta sucursal será <strong>retirada de la red</strong>, de las terminales de venta (POS) y de los reportes en vivo. Esta acción se sincronizará de inmediato en todos los celulares y computadoras conectados.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Botones de Acción */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-stone-100 text-stone-700 font-bold text-xs border border-stone-200 transition-colors"
          >
            Cancelar
          </button>

          {!isOnlyBranch && (
            <button
              type="button"
              onClick={handleDelete}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-black text-xs shadow-lg shadow-rose-600/30 transition-all active:scale-95 flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              <span>Sí, Eliminar Sucursal</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
