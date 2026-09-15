"use client";

import React, { useRef, useState, useEffect } from "react";
import { Printer, CheckCircle, X, Receipt, Settings2, Zap } from "lucide-react";
import { CartItem } from "@/types";
import { formatCurrency, formatDateTimeSafe } from "@/lib/utils";
import { playCashRegisterSound } from "@/lib/sound";
import { getStoredPrinterConfig, PrinterConfig } from "@/lib/printer";

interface TicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCancelTicket?: () => void;
  onConfigurePrinter?: () => void;
  saleId?: string;
  items: CartItem[];
  total: number;
  paymentMethod: "efectivo" | "tarjeta" | "transferencia";
  transferAccount?: string;
  cardTerminal?: string;
  paymentReference?: string;
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
  onConfigurePrinter,
  saleId,
  items,
  total,
  paymentMethod,
  transferAccount,
  cardTerminal,
  paymentReference,
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
  const [printed, setPrinted] = useState(false);
  const [printerConfig, setPrinterConfig] = useState<PrinterConfig>(() => getStoredPrinterConfig());

  useEffect(() => {
    const handleUpdate = (e: any) => {
      if (e.detail) {
        setPrinterConfig(e.detail);
      } else {
        setPrinterConfig(getStoredPrinterConfig());
      }
    };
    window.addEventListener("brito_printer_config_updated", handleUpdate);
    return () => window.removeEventListener("brito_printer_config_updated", handleUpdate);
  }, []);

  // Al abrir el modal, reiniciamos el estado de impreso para permitir nueva impresión
  useEffect(() => {
    if (isOpen) {
      setPrinted(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalPieces = items.reduce((sum, item) => sum + item.quantity, 0);
  const formattedDate = date || formatDateTimeSafe();
  const folio = saleId ? saleId.slice(-6).toUpperCase() : `POS-${Math.floor(1000 + Math.random() * 9000)}`;

  const handlePrint = () => {
    setPrinted(true);
    window.print();
  };

  const handleFinishSale = () => {
    try {
      playCashRegisterSound();
    } catch (e) {
      console.error("Error al reproducir caja registradora:", e);
    }
    onClose();
  };

  const is58mm = printerConfig.paperWidth === "58mm";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header bar del modal */}
        <div className="bg-neutral-900 text-white p-4 px-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Receipt className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <span className="font-bold text-sm block leading-tight">Comprobante de Venta</span>
              <div className="flex items-center gap-1 text-[10px] text-amber-300/90 font-normal">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                <span>Impresora: <strong>{printerConfig.selectedPrinterName}</strong> ({printerConfig.paperWidth})</span>
                {onConfigurePrinter && (
                  <button
                    type="button"
                    onClick={onConfigurePrinter}
                    className="underline hover:text-white ml-1 cursor-pointer font-bold text-amber-200"
                    title="Cambiar impresora de tickets"
                  >
                    [Elegir]
                  </button>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onCancelTicket || handleFinishSale}
            className="p-1.5 hover:bg-neutral-800 rounded-xl text-neutral-400 hover:text-rose-400 transition-colors cursor-pointer"
            title={onCancelTicket ? "Cancelar ticket y compra" : "Cerrar"}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Ticket Area con Vista Previa Fiel al Ancho de la Impresora */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 bg-neutral-100 flex flex-col items-center">
          <div className="text-center mb-2 text-[11px] font-semibold text-neutral-500 flex items-center gap-1.5">
            <Receipt className="w-3.5 h-3.5 text-neutral-400" />
            <span>Vista previa lista ({is58mm ? "Rollo 58mm" : "Rollo 80mm"})</span>
          </div>

          <div
            ref={ticketRef}
            id="thermal-receipt"
            data-paper-width={printerConfig.paperWidth}
            className={`bg-white p-3.5 sm:p-4 rounded-xl border border-neutral-300 shadow-md font-mono text-xs text-black space-y-2.5 mx-auto ${
              is58mm ? "w-[275px]" : "w-[340px]"
            } paper-${printerConfig.paperWidth}`}
          >
            {/* Business Header con Logotipo Oficial Panaderías Brito */}
            <div className="text-center space-y-1 border-b-2 border-dashed border-black pb-2.5">
              <div className="flex justify-center mb-1">
                <img
                  src="/logo.svg"
                  alt="Panadería Brito Logo"
                  className="w-12 h-12 object-contain filter grayscale contrast-200"
                />
              </div>
              <h1 className="font-black text-sm sm:text-base tracking-wider uppercase text-black font-mono leading-tight">
                PANADERÍAS BRITO
              </h1>
              <div className="inline-block border border-black px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider text-black">
                Tradición & Sabor Familiar
              </div>
              <p className="text-[11px] font-bold text-black font-sans mt-0.5">{branchName}</p>
              {branchAddress && (
                <p className="text-[9px] text-neutral-700 font-sans leading-tight px-2">{branchAddress}</p>
              )}
              <p className="text-[9px] text-neutral-800 font-sans font-semibold">
                {branchPhone ? `Tel: ${branchPhone}` : "Don Antonio Brito & Hijos"}
              </p>
            </div>

            {/* Ticket Metadata (Folio, Fecha, Cliente, Atendió, Pago) */}
            <div className="text-[10px] space-y-1 text-black border-b-2 border-dashed border-black pb-2.5">
              <div className="flex justify-between items-center">
                <span className="font-bold">FOLIO:</span>
                <span className="bg-black text-white font-mono font-black px-1.5 py-0.2 rounded text-[10px]">
                  #{folio}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-neutral-800">FECHA:</span>
                <span className="font-mono font-bold text-right">{formattedDate}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-neutral-800">CLIENTE:</span>
                <span className="font-bold text-black text-right max-w-[150px] truncate">
                  {customerName || "Público en General"}
                  {customerType && customerType !== "general" && (
                    <span className="ml-1 text-[8px] font-black uppercase border border-black px-1 py-0.2 rounded">
                      {customerType}
                    </span>
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-neutral-800">ATENDIÓ:</span>
                <span className="font-bold text-black text-right max-w-[140px] truncate">{cashierName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-neutral-800">MÉTODO PAGO:</span>
                <span className="uppercase font-black border border-black px-1.5 py-0.2 rounded text-[9px] text-black">
                  [ {paymentMethod} ]
                </span>
              </div>
              {paymentMethod === "transferencia" && transferAccount && (
                <div className="flex justify-between text-[9px] border-t border-dotted border-black pt-1">
                  <span className="font-bold text-black">CUENTA DEPÓSITO:</span>
                  <span className="font-black text-black text-right max-w-[140px] truncate">{transferAccount}</span>
                </div>
              )}
            </div>

            {/* Items Breakdown */}
            <div className="space-y-1 border-b border-dashed border-black pb-1.5 font-mono">
              <div className="border-y border-black py-0.5 flex justify-between font-black text-[8.5px] text-black uppercase tracking-wider">
                <span>CANT. / PRODUCTO</span>
                <span className="text-right">P.UNIT / IMPORTE</span>
              </div>

              <div className="space-y-1 pt-0.5">
                {items.map((item, idx) => (
                  <div key={idx} className="text-black text-[9.5px] leading-tight space-y-0.5 border-b border-dotted border-neutral-200 pb-1 last:border-0 last:pb-0">
                    <div className="flex justify-between items-start gap-1">
                      <span className="font-bold text-black flex-1 pr-1">{item.product.name}</span>
                      <span className="font-black text-black whitespace-nowrap text-right shrink-0">
                        {formatCurrency(item.product.price * item.quantity)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[8.5px] text-neutral-600">
                      <span className="font-bold text-neutral-800">
                        {item.quantity} {item.quantity === 1 ? "pza" : "pzas"} × {formatCurrency(item.product.price)} c/u
                      </span>
                      <span className="text-[8px] text-neutral-400">Subtotal</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals Breakdown */}
            <div className="space-y-1 pt-0.5 text-[10px] text-black">
              <div className="flex justify-between text-neutral-800">
                <span>Total de piezas:</span>
                <span className="font-bold text-black">{totalPieces} pzas</span>
              </div>
              <div className="flex justify-between text-neutral-800">
                <span>Subtotal:</span>
                <span className="font-semibold text-black">{formatCurrency(total)}</span>
              </div>

              {/* Total Destacado */}
              <div className="bg-black text-white p-2 rounded-lg flex justify-between items-center my-1.5">
                <span className="font-black text-[11px] tracking-wider uppercase">TOTAL A PAGAR:</span>
                <span className="font-black text-sm tracking-wide">{formatCurrency(total)} MXN</span>
              </div>

              {paymentMethod === "efectivo" && (
                <div className="space-y-1 pt-0.5">
                  <div className="flex justify-between text-neutral-800 text-[10px]">
                    <span>Efectivo recibido:</span>
                    <span className="font-semibold text-black">{formatCurrency(cashGiven || total)}</span>
                  </div>
                  <div className="flex justify-between items-center border-2 border-black p-1.5 rounded-lg font-black text-[11px] bg-white text-black">
                    <span>SU CAMBIO:</span>
                    <span className="text-xs font-black">{formatCurrency(change || 0)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Horarios de Pan Calientito */}
            <div className="p-2 border-2 border-black rounded-lg text-center space-y-0.5 font-sans bg-white my-1.5">
              <div className="flex items-center justify-center gap-1 text-[10px] font-black text-black uppercase tracking-wider">
                <span>★</span>
                <span>¡PAN CALIENTITO RECIÉN HORNEADO!</span>
                <span>★</span>
              </div>
              <p className="text-xs font-black text-black">
                🥐 De 6:00 AM a 10:00 PM 🥐
              </p>
              <p className="text-[8px] text-neutral-700 uppercase font-semibold">
                Horneado continuo todos los días
              </p>
            </div>

            {/* Pedidos Especiales y Agradecimiento */}
            <div className="text-center pt-1.5 space-y-1.5 font-sans border-t-2 border-dashed border-black">
              <div className="space-y-1 border-2 border-black rounded-lg p-2 bg-neutral-50">
                <p className="text-[10px] font-black text-black uppercase tracking-wider flex items-center justify-center gap-1">
                  <span>🎉</span>
                  <span>¿TIENES FIESTA O EVENTO?</span>
                  <span>🎂</span>
                </p>
                <p className="text-[10px] font-bold text-black leading-tight px-1">
                  ¡Endulzamos tus mejores momentos! Horneamos pedidos especiales con auténtico sabor tradicional.
                </p>
                <div className="pt-0.5">
                  <span className="inline-block px-2 py-0.5 bg-white text-black font-black text-[9px] rounded-md border border-black uppercase">
                    ✨ 50% DE ANTICIPO EN MOSTRADOR ✨
                  </span>
                </div>
              </div>

              <div className="pt-0.5 space-y-0.5">
                <p className="font-black text-black text-xs tracking-wide uppercase">
                  ¡GRACIAS POR SU PREFERENCIA!
                </p>
                <p className="text-[8px] font-bold text-neutral-600">
                  Consérvese en un lugar fresco y seco • Panaderías Brito
                </p>
                <p className="text-[8px] text-neutral-400 uppercase tracking-widest pt-0.5">
                  Comprobante simplificado de venta
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Info bar del formato de salida */}
        <div className="px-5 py-2 bg-amber-50/90 border-t border-amber-200/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-stone-700 font-medium">
            <Printer className="w-3.5 h-3.5 text-amber-700" />
            <span>Formato: <strong>{printerConfig.paperWidth} ({printerConfig.selectedPrinterName})</strong></span>
          </div>
          <span className="text-[10px] font-bold text-amber-900 bg-amber-200/80 px-2.5 py-0.5 rounded-full">
            {printed ? "✓ Ticket Enviado" : "Listo para Imprimir"}
          </span>
        </div>

        {/* Action Buttons: Imprimir Ticket o Terminar Venta */}
        <div className="p-4 bg-white border-t border-neutral-200 space-y-2.5">
          <div className="grid grid-cols-2 gap-3">
            {/* Botón 1: Imprimir Ticket */}
            <button
              type="button"
              onClick={handlePrint}
              className={`flex items-center justify-center gap-2 py-3.5 px-3 font-bold rounded-2xl text-xs sm:text-sm shadow-md border transition-all active:scale-95 cursor-pointer ${
                printed
                  ? "bg-neutral-900 text-amber-300 border-amber-500/50 hover:bg-neutral-800"
                  : "bg-gradient-to-r from-[#24130c] via-[#2d1810] to-[#3a1d12] hover:from-[#1b0d08] hover:to-[#2e160e] text-amber-200 hover:text-amber-100 border-amber-900/40"
              }`}
            >
              <Printer className={`w-4 h-4 shrink-0 ${printed ? "text-amber-300" : "text-amber-400"}`} />
              <span className="whitespace-nowrap font-bold">
                {printed ? "✓ Imprimir de Nuevo" : "Imprimir Ticket"}
              </span>
            </button>

            {/* Botón 2: Terminar Venta */}
            <button
              type="button"
              onClick={handleFinishSale}
              className="flex items-center justify-center gap-2 py-3.5 px-3 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black rounded-2xl text-xs sm:text-sm shadow-lg shadow-emerald-600/25 transition-all active:scale-95 cursor-pointer"
            >
              <CheckCircle className="w-4 h-4 text-white shrink-0" />
              <span className="whitespace-nowrap font-black">Terminar Venta</span>
            </button>
          </div>

          {/* Botón de Cancelar Ticket */}
          {onCancelTicket && (
            <button
              type="button"
              onClick={onCancelTicket}
              className="w-full py-2 px-3 text-stone-500 hover:text-rose-600 hover:bg-rose-50 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Cancelar compra y regresar panes al inventario"
            >
              <X className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span>Cancelar Ticket (Anular compra y reponer panes)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
