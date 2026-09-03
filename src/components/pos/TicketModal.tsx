"use client";

import React, { useRef } from "react";
import { Printer, CheckCircle, X, Receipt } from "lucide-react";
import { CartItem } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface TicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  saleId?: string;
  items: CartItem[];
  total: number;
  paymentMethod: "efectivo" | "tarjeta" | "transferencia";
  cashGiven?: number;
  change?: number;
  cashierName?: string;
  branchName?: string;
  branchAddress?: string;
  branchPhone?: string;
  date?: string;
}

export default function TicketModal({
  isOpen,
  onClose,
  saleId,
  items,
  total,
  paymentMethod,
  cashGiven,
  change,
  cashierName = "Caja Principal - Don Toño",
  branchName = "Sucursal Matriz",
  branchAddress,
  branchPhone = "55 1234 5678",
  date,
}: TicketModalProps) {
  const ticketRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const totalPieces = items.reduce((sum, item) => sum + item.quantity, 0);
  const formattedDate = date || new Date().toLocaleString("es-MX", {
    dateStyle: "short",
    timeStyle: "short",
  });
  const folio = saleId ? saleId.slice(-6).toUpperCase() : `POS-${Math.floor(1000 + Math.random() * 9000)}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header bar */}
        <div className="bg-amber-950 text-amber-100 p-4 px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-sm">Comprobante de Venta</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-amber-900 rounded-lg text-amber-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Ticket Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-stone-100/70">
          <div
            ref={ticketRef}
            id="thermal-receipt"
            className="bg-white p-5 sm:p-6 rounded-3xl border-2 border-stone-200 shadow-md font-mono text-xs text-stone-800 space-y-3.5 max-w-sm mx-auto"
          >
            {/* Business Header con Logotipo Oficial */}
            <div className="text-center space-y-1 border-b-2 border-dashed border-stone-300 pb-3.5">
              {/* Logotipo Oficial Panaderías Brito */}
              <div className="flex justify-center mb-1">
                <img
                  src="/logo.svg"
                  alt="Panadería Brito Logo"
                  className="w-20 h-20 object-contain drop-shadow-xs"
                />
              </div>
              <h2 className="font-black text-base tracking-wider uppercase text-stone-900">
                PANADERÍAS BRITO
              </h2>
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-900 bg-amber-100/80 px-2.5 py-0.5 rounded-full inline-block">
                Tradición & Sabor Familiar
              </p>
              <p className="text-xs font-bold text-stone-800 font-sans mt-1">{branchName}</p>
              {branchAddress && (
                <p className="text-[10px] text-stone-500 font-sans leading-tight px-3">{branchAddress}</p>
              )}
              <p className="text-[10px] text-stone-500 font-sans font-medium">
                {branchPhone ? `Tel / WhatsApp: ${branchPhone}` : "Don Antonio Brito & Hijos"}
              </p>
            </div>

            {/* Ticket Metadata */}
            <div className="text-[11px] space-y-1 text-stone-600 border-b border-dashed border-stone-300 pb-3">
              <div className="flex justify-between">
                <span className="font-bold">FOLIO:</span>
                <span className="font-black text-stone-900">#{folio}</span>
              </div>
              <div className="flex justify-between">
                <span>FECHA:</span>
                <span>{formattedDate}</span>
              </div>
              <div className="flex justify-between">
                <span>ATENDIÓ:</span>
                <span className="font-bold text-stone-800">{cashierName}</span>
              </div>
              <div className="flex justify-between">
                <span>PAGO:</span>
                <span className="uppercase font-black text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  {paymentMethod}
                </span>
              </div>
            </div>

            {/* Items Breakdown */}
            <div className="space-y-2 border-b border-dashed border-stone-300 pb-3">
              <div className="flex justify-between font-black text-[10px] text-stone-400 uppercase tracking-wider pb-1">
                <span>CANT / PRODUCTO</span>
                <span>IMPORTE</span>
              </div>

              {items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-stone-800 text-[11px] leading-tight items-start">
                  <span className="flex-1 pr-2">
                    <span className="font-black text-stone-900">{item.quantity}x</span> {item.product.name}
                    <span className="block text-[10px] text-stone-400 font-sans">
                      @{formatCurrency(item.product.price)} c/u
                    </span>
                  </span>
                  <span className="font-black text-stone-900 whitespace-nowrap">
                    {formatCurrency(item.product.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Totals Breakdown */}
            <div className="space-y-1.5 pt-1 text-[11px]">
              <div className="flex justify-between text-stone-600">
                <span>Total de piezas:</span>
                <span className="font-bold text-stone-900">{totalPieces} pzas</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Subtotal:</span>
                <span>{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between text-base font-black text-stone-900 border-t-2 border-dashed border-stone-300 pt-2">
                <span>TOTAL A PAGAR:</span>
                <span className="text-amber-800">{formatCurrency(total)} MXN</span>
              </div>

              {paymentMethod === "efectivo" && (
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-stone-600 text-[11px]">
                    <span>Efectivo recibido:</span>
                    <span className="font-semibold">{formatCurrency(cashGiven || total)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-800 font-black bg-emerald-100/80 p-2 rounded-xl border border-emerald-200 text-xs">
                    <span>SU CAMBIO:</span>
                    <span className="text-sm">{formatCurrency(change || 0)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* GANCHO DE RECOMPRA: Cupón de Fidelización */}
            <div className="border-2 border-dashed border-amber-400 bg-gradient-to-br from-amber-50 to-orange-50/80 p-3 rounded-2xl text-center space-y-1 font-sans">
              <div className="flex items-center justify-center gap-1 text-[10px] font-black text-amber-900 uppercase tracking-wide">
                <span>🎁</span>
                <span>¡PREMIO EN TU PRÓXIMA COMPRA!</span>
              </div>
              <p className="text-[11px] font-extrabold text-stone-900 leading-tight">
                Presenta este ticket y llévate:
              </p>
              <div className="py-1 px-2.5 bg-amber-600 text-white font-black text-xs rounded-xl shadow-xs inline-block my-0.5">
                ⭐ 1 PIEZA DE PAN DULCE GRATIS ⭐
              </div>
              <p className="text-[9px] text-amber-900 font-bold leading-tight">
                En tu siguiente compra de $50 o más • Válido por 7 días
              </p>
            </div>

            {/* Horarios de Pan Calientito (Impulso de Visita) */}
            <div className="p-2.5 bg-stone-50 rounded-xl text-center border border-stone-200/90 space-y-0.5 font-sans">
              <p className="text-[10px] font-black text-stone-900 flex items-center justify-center gap-1">
                <span>🔥</span>
                <span>¡Ven por tu pan calientito recién horneado!</span>
              </p>
              <p className="text-[9px] text-stone-600 font-semibold">
                Mañanas: <strong className="text-amber-800 font-black">6:30 AM</strong> • Tardes: <strong className="text-amber-800 font-black">5:30 PM</strong>
              </p>
            </div>

            {/* Pedidos Especiales y Agradecimiento */}
            <div className="text-center pt-2 space-y-1 text-[10px] text-stone-500 font-sans border-t border-dashed border-stone-300">
              <p className="text-[10px] font-bold text-stone-800">
                🎂 ¿Tienes fiesta o evento? Hacemos pedidos especiales.
              </p>
              <p className="text-[9px] font-extrabold text-amber-800">
                WhatsApp: {branchPhone || "55 1234 5678"}
              </p>
              <p className="font-black text-stone-900 text-xs pt-1">
                ¡GRACIAS POR SU PREFERENCIA! 🥐
              </p>
              <p className="text-[9px] text-stone-400">
                Consérvese en un lugar fresco y seco • Panaderías Brito
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-white border-t border-stone-200 flex gap-3">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-stone-900 hover:bg-black text-white font-bold rounded-2xl text-xs shadow-md transition-all active:scale-95"
          >
            <Printer className="w-4 h-4" /> Imprimir Ticket
          </button>
          <button
            onClick={onClose}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-2xl text-xs shadow-md transition-all active:scale-95"
          >
            <CheckCircle className="w-4 h-4" /> Siguiente Cliente
          </button>
        </div>
      </div>
    </div>
  );
}
