"use client";

import React, { useRef } from "react";
import { Printer, CheckCircle, X, Receipt } from "lucide-react";
import { CartItem } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { playCashRegisterSound } from "@/lib/sound";

interface TicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCancelTicket?: () => void;
  saleId?: string;
  items: CartItem[];
  total: number;
  paymentMethod: "efectivo" | "tarjeta" | "transferencia";
  transferAccount?: string;
  cashGiven?: number;
  change?: number;
  cashierName?: string;
  customerName?: string;
  customerType?: string;
  branchName?: string;
  branchAddress?: string;
  branchPhone?: string;
  date?: string;
}

export default function TicketModal({
  isOpen,
  onClose,
  onCancelTicket,
  saleId,
  items,
  total,
  paymentMethod,
  transferAccount,
  cashGiven,
  change,
  cashierName = "Caja Principal - Don Toño",
  customerName = "Público en General",
  customerType,
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

  const [printed, setPrinted] = React.useState(false);

  const handlePrint = () => {
    setPrinted(true);
    window.print();
    setTimeout(() => {
      setPrinted(false);
      try {
        playCashRegisterSound();
      } catch (e) {}
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header bar del modal */}
        <div className="bg-neutral-900 text-white p-4 px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-amber-400" />
            <div>
              <span className="font-bold text-sm block leading-tight">Comprobante de Venta</span>
              <span className="text-[10px] text-amber-300/90 font-normal">Optimizado para Térmica 58mm (POS-58)</span>
            </div>
          </div>
          <button
            onClick={onCancelTicket || onClose}
            className="p-1.5 hover:bg-neutral-800 rounded-xl text-neutral-400 hover:text-rose-400 transition-colors cursor-pointer"
            title={onCancelTicket ? "Cancelar ticket y compra (no cobrar panes)" : "Cerrar"}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Ticket Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-neutral-100">
          <div
            ref={ticketRef}
            id="thermal-receipt"
            className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-neutral-300 shadow-md font-mono text-xs text-black space-y-3 max-w-sm mx-auto"
          >
            {/* Business Header con Logotipo Oficial en escala de grises de alto contraste */}
            <div className="text-center space-y-1.5 border-b-2 border-dashed border-black pb-3">
              {/* Logotipo Oficial Panaderías Brito (Filtrado para B&N térmico) */}
              <div className="flex justify-center mb-1">
                <img
                  src="/logo.svg"
                  alt="Panadería Brito Logo"
                  className="w-16 h-16 object-contain filter grayscale contrast-200"
                />
              </div>
              <h1 className="font-black text-base sm:text-lg tracking-wider uppercase text-black font-mono leading-none">
                PANADERÍAS BRITO
              </h1>
              <div className="inline-block border border-black px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider text-black">
                Tradición & Sabor Familiar
              </div>
              <p className="text-xs font-bold text-black font-sans mt-1">{branchName}</p>
              {branchAddress && (
                <p className="text-[10px] text-neutral-700 font-sans leading-tight px-3">{branchAddress}</p>
              )}
              <p className="text-[10px] text-neutral-800 font-sans font-semibold">
                {branchPhone ? `Tel: ${branchPhone}` : "Don Antonio Brito & Hijos"}
              </p>
            </div>

            {/* Ticket Metadata (Folio, Fecha, Atendió, Pago) */}
            <div className="text-[11px] space-y-1.5 text-black border-b-2 border-dashed border-black pb-3">
              <div className="flex justify-between items-center">
                <span className="font-bold">FOLIO:</span>
                <span className="bg-black text-white font-mono font-black px-2 py-0.5 rounded text-[11px]">
                  #{folio}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-neutral-800">FECHA:</span>
                <span className="font-mono font-bold">{formattedDate}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-neutral-800">CLIENTE:</span>
                <span className="font-bold text-black text-right max-w-[200px] truncate">
                  {customerName || "Público en General"}
                  {customerType && customerType !== "general" && (
                    <span className="ml-1 text-[9px] font-black uppercase border border-black px-1.5 py-0.5 rounded">
                      {customerType}
                    </span>
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-neutral-800">ATENDIÓ:</span>
                <span className="font-bold text-black">{cashierName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-neutral-800">MÉTODO DE PAGO:</span>
                <span className="uppercase font-black border-1.5 border-black px-2 py-0.5 rounded text-[10px] text-black">
                  [ {paymentMethod} ]
                </span>
              </div>
              {paymentMethod === "transferencia" && transferAccount && (
                <div className="flex justify-between text-[10px] border-t border-dotted border-black pt-1">
                  <span className="font-bold text-black">CUENTA DEPÓSITO:</span>
                  <span className="font-black text-black text-right max-w-[190px] truncate">{transferAccount}</span>
                </div>
              )}
            </div>

            {/* Items Breakdown */}
            <div className="space-y-2 border-b-2 border-dashed border-black pb-3">
              <div className="border-y border-black py-1 flex justify-between font-black text-[10px] text-black uppercase tracking-wider">
                <span>CANT / PRODUCTO</span>
                <span className="text-right">IMPORTE</span>
              </div>

              <div className="space-y-1.5 pt-1">
                {items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-black text-[11px] leading-tight items-start">
                    <div className="flex-1 pr-2">
                      <div className="font-bold text-black">
                        <span className="font-black text-black border border-black px-1 py-0.2 rounded text-[10px] mr-1">
                          {item.quantity}x
                        </span>
                        {item.product.name}
                      </div>
                      <div className="text-[10px] text-neutral-600 font-sans pl-6">
                        @{formatCurrency(item.product.price)} c/u
                      </div>
                    </div>
                    <div className="font-black text-black whitespace-nowrap text-right pt-0.5">
                      {formatCurrency(item.product.price * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals Breakdown */}
            <div className="space-y-1.5 pt-1 text-[11px] text-black">
              <div className="flex justify-between text-neutral-800">
                <span>Total de piezas:</span>
                <span className="font-bold text-black">{totalPieces} pzas</span>
              </div>
              <div className="flex justify-between text-neutral-800">
                <span>Subtotal:</span>
                <span className="font-semibold text-black">{formatCurrency(total)}</span>
              </div>

              {/* Total Destacado en Bloque Negro Sólido (Alto Contraste para Láser) */}
              <div className="bg-black text-white p-2.5 rounded-lg flex justify-between items-center my-2">
                <span className="font-black text-xs tracking-wider uppercase">TOTAL A PAGAR:</span>
                <span className="font-black text-base tracking-wide">{formatCurrency(total)} MXN</span>
              </div>

              {paymentMethod === "efectivo" && (
                <div className="space-y-1 pt-0.5">
                  <div className="flex justify-between text-neutral-800 text-[11px]">
                    <span>Efectivo recibido:</span>
                    <span className="font-semibold text-black">{formatCurrency(cashGiven || total)}</span>
                  </div>
                  <div className="flex justify-between items-center border-2 border-black p-2 rounded-lg font-black text-xs bg-white text-black">
                    <span>SU CAMBIO:</span>
                    <span className="text-sm font-black">{formatCurrency(change || 0)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Horarios de Pan Calientito (Optimizado para B&N: Letras Grandes y Claridad Total) */}
            <div className="p-3 border-2 border-black rounded-xl text-center space-y-1 font-sans bg-white my-2">
              <div className="flex items-center justify-center gap-1 text-xs font-black text-black uppercase tracking-wider">
                <span>★</span>
                <span>¡PAN CALIENTITO RECIÉN HORNEADO!</span>
                <span>★</span>
              </div>
              <p className="text-xs sm:text-sm font-black text-black">
                🥐 De 6:00 AM a 10:00 PM 🥐
              </p>
              <p className="text-[9px] text-neutral-700 uppercase font-semibold">
                Horneado continuo todos los días
              </p>
            </div>

            {/* Pedidos Especiales y Agradecimiento (Encuadre B&N limpio) */}
            <div className="text-center pt-2 space-y-2.5 font-sans border-t-2 border-dashed border-black">
              <div className="space-y-2 border-2 border-black rounded-xl p-3.5 bg-neutral-50">
                <p className="text-sm sm:text-base font-black text-black uppercase tracking-wider flex items-center justify-center gap-1.5">
                  <span>🎉</span>
                  <span>¿TIENES FIESTA, REUNIÓN O EVENTO?</span>
                  <span>🎂</span>
                </p>
                <p className="text-sm sm:text-[15px] font-extrabold text-black leading-snug px-1">
                  ¡Endulzamos tus mejores momentos! Horneamos pedidos especiales para consentir a tus invitados con el auténtico sabor tradicional.
                </p>
                <div className="pt-1">
                  <span className="inline-block px-3.5 py-2 bg-white text-black font-black text-xs sm:text-sm rounded-xl border-2 border-black uppercase tracking-wide shadow-2xs">
                    ✨ PEDIDOS ESPECIALES CON 50% DE ANTICIPO EN MOSTRADOR ✨
                  </span>
                </div>
              </div>

              <div className="pt-1 space-y-0.5">
                <p className="font-black text-black text-sm tracking-wide uppercase">
                  ¡GRACIAS POR SU PREFERENCIA!
                </p>
                <p className="text-[10px] font-bold text-neutral-600">
                  Consérvese en un lugar fresco y seco • Panaderías Brito
                </p>
                <p className="text-[8px] text-neutral-500 uppercase tracking-widest pt-0.5">
                  Comprobante simplificado de venta
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-white border-t border-neutral-200 space-y-2.5">
          {/* Fila principal: Imprimir y Siguiente Cliente */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handlePrint}
              className={`flex items-center justify-center gap-2 py-3.5 px-3 font-bold rounded-2xl text-xs sm:text-sm shadow-md border transition-all active:scale-95 cursor-pointer ${
                printed
                  ? "bg-emerald-700 text-white border-emerald-600 animate-pulse"
                  : "bg-gradient-to-r from-[#24130c] to-[#3a1d12] hover:from-[#1b0d08] hover:to-[#2e160e] text-amber-200 hover:text-amber-100 border-amber-900/40"
              }`}
            >
              <Printer className={`w-4 h-4 shrink-0 ${printed ? "text-white" : "text-amber-400"}`} />
              <span className="whitespace-nowrap font-bold">
                {printed ? "✓ Imprimiendo en POS-58..." : "Imprimir Ticket"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                try {
                  playCashRegisterSound();
                } catch (e) {
                  console.error("Error al reproducir caja registradora:", e);
                }
                setTimeout(() => {
                  onClose();
                }, 100);
              }}
              className="flex items-center justify-center gap-2 py-3.5 px-3 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-black rounded-2xl text-xs sm:text-sm shadow-lg shadow-orange-500/25 transition-all active:scale-95 cursor-pointer"
            >
              <CheckCircle className="w-4 h-4 text-white shrink-0" />
              <span className="whitespace-nowrap font-black">Siguiente Cliente</span>
            </button>
          </div>

          {/* Botón de Cancelar Ticket */}
          {onCancelTicket && (
            <button
              type="button"
              onClick={onCancelTicket}
              className="w-full py-2.5 px-3 bg-rose-50 hover:bg-rose-100/90 border-2 border-rose-200 hover:border-rose-300 text-rose-700 hover:text-rose-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all active:scale-98 cursor-pointer shadow-2xs"
              title="Cancelar compra y regresar panes al inventario"
            >
              <X className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Cancelar Ticket (Anular compra y reponer panes)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
