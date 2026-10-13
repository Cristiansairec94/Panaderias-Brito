"use client";

import React, { useEffect } from "react";
import { 
  PackageCheck, 
  CheckCircle2, 
  ShieldCheck, 
  X, 
  Store, 
  Clock, 
  Sparkles,
  Cake,
  BadgeCheck,
  Truck
} from "lucide-react";
import { CustomOrder } from "@/types";
import { formatCurrency, playScanBeep } from "@/lib/utils";

interface DeliverOrderConfirmModalProps {
  isOpen: boolean;
  order: CustomOrder | null;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
}

export default function DeliverOrderConfirmModal({
  isOpen,
  order,
  onClose,
  onConfirm,
  isSubmitting = false,
}: DeliverOrderConfirmModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (!isSubmitting) onClose();
      } else if (e.key === "Enter") {
        if (!isSubmitting) {
          try {
            playScanBeep(true);
          } catch {}
          onConfirm();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose, onConfirm]);

  if (!isOpen || !order) return null;

  const handleConfirm = () => {
    try {
      playScanBeep(true);
    } catch {}
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-[450] flex items-center justify-center p-3 sm:p-4 bg-stone-950/85 backdrop-blur-md animate-in fade-in duration-200">
      {/* Backdrop click to close */}
      <div 
        className="fixed inset-0" 
        onClick={isSubmitting ? undefined : onClose} 
      />

      {/* Main Centered Bakery Modal Card */}
      <div className="relative w-full max-w-md bg-gradient-to-b from-[#24130b] via-[#1c0e08] to-[#140a05] text-white rounded-3xl border-2 border-amber-500/40 shadow-2xl shadow-orange-950/80 overflow-hidden z-10 animate-in zoom-in-95 duration-200">
        
        {/* Top Warm Bakery Ambient Glow */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-48 h-48 bg-gradient-to-b from-orange-500/30 to-transparent rounded-full blur-2xl pointer-events-none" />

        {/* Close Button Top Right */}
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer z-20"
          title="Cancelar y cerrar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 text-center space-y-4 relative z-10">
          
          {/* Animated Center Icon (Bakery Delivery Badge) */}
          <div className="relative mx-auto w-20 h-20 rounded-3xl p-[2px] bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-300 shadow-xl shadow-orange-500/30 flex items-center justify-center animate-bounce [animation-duration:2.5s]">
            <div className="w-full h-full bg-[#1c0e08] rounded-[22px] flex items-center justify-center text-4xl shadow-inner select-none">
              🎂
            </div>
            <span className="absolute -bottom-1 -right-1 w-7 h-7 bg-emerald-500 border-2 border-[#1c0e08] text-white rounded-full flex items-center justify-center shadow-md animate-pulse">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>

          {/* Bakery Brand Pill */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-black uppercase tracking-wider shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin [animation-duration:4s]" />
            <span>Panadería Brito • {order.deliveryType === "domicilio" ? "Entrega a Domicilio" : "Entrega en Mostrador"}</span>
          </div>

          {/* Main Title & Prompt */}
          <div className="space-y-1">
            <h3 className="text-lg sm:text-xl font-black text-white tracking-tight leading-snug">
              ¿Confirmas entregar este pedido?
            </h3>
            <p className="text-xs text-stone-300 font-medium max-w-xs mx-auto leading-relaxed">
              Marcarás el pedido como <strong className="text-emerald-400">ENTREGADO</strong> {order.deliveryType === "domicilio" ? "al repartidor / domicilio" : "al cliente en mostrador"}.
            </p>
          </div>

          {/* Highlighted Order Card (Visual Safety Details) */}
          <div className="bg-[#2a160d] border border-amber-900/70 rounded-2xl p-3.5 text-left space-y-2.5 shadow-inner">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-black text-amber-400 bg-amber-400/20 px-2 py-0.5 rounded border border-amber-400/30">
                  {order.orderNumber}
                </span>
                <span className="text-[11px] font-bold text-stone-400">
                  Folio de Pedido
                </span>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                <BadgeCheck className="w-3.5 h-3.5" />
                100% Pagado
              </span>
            </div>

            {/* Customer Name */}
            <div>
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                Cliente que Recibe:
              </span>
              <p className="text-sm sm:text-base font-black text-amber-100 capitalize truncate">
                👤 {order.customerName}
              </p>
            </div>

            {/* Order Items Description preview if exists */}
            {order.description && (
              <div className="text-[11px] text-stone-300 font-medium bg-[#1c0e08]/60 p-2 rounded-xl border border-white/5 line-clamp-2">
                🎂 {order.description}
              </div>
            )}

            {/* Branch and Total */}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5 text-stone-300">
              <span className="flex items-center gap-1 truncate max-w-[190px]">
                <Store className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">{order.branchName || "Sucursal"}</span>
              </span>
              <span className="font-mono font-black text-emerald-300 text-sm">
                {formatCurrency(order.total)}
              </span>
            </div>
          </div>

          {/* Safety Reassurance Notice ("como seguro") */}
          <div className="bg-gradient-to-r from-emerald-950/60 to-emerald-900/40 border border-emerald-500/35 rounded-2xl p-3 flex items-start gap-2.5 text-left text-xs text-emerald-200 shadow-inner">
            <div className="p-1 rounded-lg bg-emerald-500/20 text-emerald-300 shrink-0 mt-0.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="space-y-0.5 leading-snug">
              <p className="font-black text-emerald-300 flex items-center gap-1.5 text-xs">
                <span>Confirmación Segura de Entrega</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 bg-emerald-500/20 text-emerald-200 rounded border border-emerald-500/30 uppercase">Sin Saldo Pendiente</span>
              </p>
              <p className="text-[11px] text-emerald-200/90">
                Al confirmar, el pedido pasará automáticamente al Historial de Entregas y se actualizará en tiempo real en todas las sucursales.
              </p>
            </div>
          </div>

          {/* Actions: Cancelar vs Confirmar */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full py-2.5 sm:py-3 px-3 rounded-2xl font-bold text-xs sm:text-sm text-stone-300 hover:text-white bg-stone-800/90 hover:bg-stone-800 border border-stone-700 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              Volver / Cancelar
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="w-full py-2.5 sm:py-3 px-3 rounded-2xl font-black text-xs sm:text-sm text-stone-950 bg-gradient-to-r from-emerald-400 via-emerald-300 to-emerald-400 hover:from-emerald-300 hover:to-emerald-300 shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-95 disabled:opacity-50"
            >
              <PackageCheck className="w-4 h-4 shrink-0" />
              <span>{isSubmitting ? "Entregando..." : "Sí, Entregar"}</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
