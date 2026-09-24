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
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg sm:max-w-xl w-full overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header bar del modal */}
        <div className="bg-neutral-900 text-white p-4 px-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Receipt className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 shrink-0" />
            <div>
              <span className="font-black text-sm sm:text-base block leading-tight">Comprobante de Venta</span>
              <div className="flex items-center gap-1.5 text-xs text-amber-300/90 font-medium mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
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
            className="p-2 hover:bg-neutral-800 rounded-xl text-neutral-400 hover:text-rose-400 transition-colors cursor-pointer"
            title={onCancelTicket ? "Cancelar ticket y compra" : "Cerrar"}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Ticket Area con Vista Previa Ampliada para Mostrador */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 bg-neutral-100 flex flex-col items-center">
          <div className="flex items-center justify-between w-full max-w-[420px] mb-2.5 px-1 text-xs">
            <span className="text-xs font-bold text-neutral-600 flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-amber-600" />
              <span>Vista previa ({is58mm ? "Rollo 58mm" : "Rollo 80mm"})</span>
            </span>

            <span className="text-[11px] font-black text-amber-900 bg-amber-200/90 border border-amber-300 px-2.5 py-0.5 rounded-full shadow-2xs">
              Vista Ampliada de Caja
            </span>
          </div>

          <div
            ref={ticketRef}
            id="thermal-receipt"
            data-paper-width={printerConfig.paperWidth}
            className={`bg-white p-5 sm:p-6 print:p-1.5 rounded-2xl print:rounded-none border-2 print:border-none border-neutral-300 shadow-xl print:shadow-none font-mono text-black space-y-3 print:space-y-1 mx-auto w-full max-w-[390px] sm:max-w-[425px] print:w-[48mm] print:max-w-[48mm] paper-${printerConfig.paperWidth}`}
          >
            {/* Business Header con Logotipo Oficial Panaderías Brito */}
            <div className="text-center space-y-1.5 print:space-y-0.5 border-b-2 border-dashed border-black pb-3 print:pb-1.5">
              <div className="flex justify-center mb-1 print:mb-0.5">
                <img
                  src="/logo.svg"
                  alt="Panadería Brito Logo"
                  className="w-16 h-16 sm:w-18 sm:h-18 print:w-10 print:h-10 object-contain filter grayscale contrast-200"
                />
              </div>
              <h1 className="font-black text-base sm:text-lg print:text-sm tracking-wider uppercase text-black font-mono leading-tight">
                PANADERÍAS BRITO
              </h1>
              <div className="inline-block border-2 border-black px-3 py-0.5 rounded-full text-xs print:text-[8px] font-black uppercase tracking-wider text-black">
                Tradición & Sabor Familiar
              </div>
              <p className="text-sm sm:text-base print:text-[10px] font-black text-black font-sans mt-1 print:mt-0.5">
                {branchName}
              </p>
              {branchAddress && (
                <p className="text-xs print:text-[8.5px] text-neutral-800 font-sans leading-tight px-2">
                  {branchAddress}
                </p>
              )}
              <p className="text-xs sm:text-sm print:text-[9px] text-neutral-900 font-sans font-bold">
                {branchPhone ? `Tel: ${branchPhone}` : "Don Antonio Brito & Hijos"}
              </p>
            </div>

            {/* Ticket Metadata (Folio, Fecha, Cliente, Atendió, Pago) */}
            <div className="text-xs sm:text-sm print:text-[9.5px] space-y-1.5 print:space-y-0.5 text-black border-b-2 border-dashed border-black pb-3 print:pb-1.5">
              <div className="flex justify-between items-center">
                <span className="font-black">FOLIO:</span>
                <span className="bg-black text-white font-mono font-black px-2 py-0.5 rounded text-xs sm:text-sm print:text-[9.5px]">
                  #{folio}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-neutral-800">FECHA:</span>
                <span className="font-mono font-bold text-right">{formattedDate}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-neutral-800">CLIENTE:</span>
                <span className="font-black text-black text-right max-w-[200px] print:max-w-[140px] truncate">
                  {customerName || "Público en General"}
                  {customerType && customerType !== "general" && (
                    <span className="ml-1 text-[10px] print:text-[8px] font-black uppercase border border-black px-1 py-0.2 rounded">
                      {customerType}
                    </span>
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-neutral-800">ATENDIÓ:</span>
                <span className="font-bold text-black text-right max-w-[200px] print:max-w-[140px] truncate">{cashierName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-neutral-800">MÉTODO PAGO:</span>
                <span className="uppercase font-black border-2 border-black px-2 py-0.5 rounded text-xs print:text-[8.5px] text-black">
                  [ {paymentMethod} ]
                </span>
              </div>
              {paymentMethod === "transferencia" && transferAccount && (
                <div className="flex justify-between text-xs print:text-[8.5px] border-t border-dotted border-black pt-1">
                  <span className="font-black text-black">CUENTA DEPÓSITO:</span>
                  <span className="font-bold text-black text-right max-w-[180px] truncate">{transferAccount}</span>
                </div>
              )}
            </div>

            {/* Items Breakdown */}
            <div className="space-y-1.5 border-b-2 border-dashed border-black pb-3 print:pb-1.5 font-mono">
              <div className="border-y-2 border-black py-1 print:py-0.5 flex justify-between font-black text-xs sm:text-sm print:text-[8.5px] text-black uppercase tracking-wider">
                <span>CANT. / PRODUCTO</span>
                <span className="text-right">P.UNIT / IMPORTE</span>
              </div>

              <div className="space-y-1.5 pt-1 print:pt-0.5">
                {items.map((item, idx) => (
                  <div key={idx} className="text-black leading-tight space-y-0.5 border-b border-dotted border-neutral-300 pb-1.5 last:border-0 last:pb-0">
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-black text-xs sm:text-sm print:text-[9.5px] text-black flex-1 pr-1">
                        {item.product.name}
                      </span>
                      <span className="font-black text-xs sm:text-sm print:text-[9.5px] text-black whitespace-nowrap text-right shrink-0">
                        {formatCurrency(item.product.price * item.quantity)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] sm:text-xs print:text-[8.5px] text-neutral-700">
                      <span className="font-bold text-neutral-900">
                        {item.quantity} {item.quantity === 1 ? "pza" : "pzas"} × {formatCurrency(item.product.price)} c/u
                      </span>
                      <span className="text-[10px] print:text-[8px] text-neutral-500 font-semibold">Subtotal</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals Breakdown */}
            <div className="space-y-1.5 pt-1 text-xs sm:text-sm print:text-[9.5px] text-black">
              <div className="flex justify-between text-neutral-800 text-xs sm:text-sm print:text-[9px]">
                <span>Total de piezas: <strong className="text-black">{totalPieces} pzas</strong></span>
                <span>Subtotal: <strong className="text-black">{formatCurrency(total)}</strong></span>
              </div>

              {/* Total Destacado */}
              <div className="bg-black text-white p-2.5 sm:p-3 print:p-1.5 rounded-xl flex justify-between items-center my-2 print:my-1">
                <span className="font-black text-xs sm:text-sm print:text-[10px] tracking-wider uppercase">
                  TOTAL A PAGAR:
                </span>
                <span className="font-black text-base sm:text-lg print:text-xs tracking-wide">
                  {formatCurrency(total)} MXN
                </span>
              </div>

              {paymentMethod === "efectivo" && (
                <div className="space-y-1.5 pt-1 print:pt-0.5">
                  <div className="flex justify-between text-neutral-800 text-xs sm:text-sm print:text-[9.5px]">
                    <span>Efectivo recibido:</span>
                    <span className="font-bold text-black">{formatCurrency(cashGiven || total)}</span>
                  </div>
                  <div className="flex justify-between items-center border-2 border-black p-2 sm:p-2.5 print:p-1 rounded-xl font-black text-sm sm:text-base print:text-[11px] bg-white text-black">
                    <span>SU CAMBIO:</span>
                    <span className="text-base sm:text-lg print:text-xs font-black">{formatCurrency(change || 0)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Horarios de Pan Calientito */}
            <div className="p-2.5 sm:p-3 print:p-1.5 border-2 border-black rounded-xl text-center space-y-1 font-sans bg-white my-2 print:my-1">
              <div className="flex items-center justify-center gap-1.5 text-xs sm:text-sm print:text-[9px] font-black text-black uppercase tracking-wider">
                <span>★</span>
                <span>¡PAN CALIENTITO RECIÉN HORNEADO!</span>
                <span>★</span>
              </div>
              <p className="text-sm sm:text-base print:text-[10px] font-black text-black">
                🥐 De 6:00 AM a 10:00 PM 🥐
              </p>
              <p className="text-[10px] sm:text-xs print:text-[8px] text-neutral-700 uppercase font-bold">
                Horneado continuo todos los días
              </p>
            </div>

            {/* Pedidos Especiales y Agradecimiento */}
            <div className="text-center pt-2 print:pt-1 space-y-2 print:space-y-1 font-sans border-t-2 border-dashed border-black">
              <div className="space-y-1 border-2 border-black rounded-xl p-2.5 print:p-1.5 bg-neutral-50">
                <p className="text-xs sm:text-sm print:text-[9px] font-black text-black uppercase tracking-wider flex items-center justify-center gap-1">
                  <span>🎉</span>
                  <span>¿TIENES FIESTA O EVENTO?</span>
                  <span>🎂</span>
                </p>
                <p className="text-xs sm:text-sm print:text-[9px] font-bold text-black leading-tight px-1">
                  ¡Endulzamos tus mejores momentos! Horneamos pedidos especiales con auténtico sabor tradicional.
                </p>
                <div className="pt-0.5">
                  <span className="inline-block px-2.5 py-0.5 bg-white text-black font-black text-[11px] sm:text-xs print:text-[8.5px] rounded-md border-2 border-black uppercase">
                    ✨ 50% DE ANTICIPO EN MOSTRADOR ✨
                  </span>
                </div>
              </div>

              <div className="pt-1 space-y-0.5">
                <p className="font-black text-black text-sm sm:text-base print:text-xs tracking-wide uppercase">
                  ¡GRACIAS POR SU PREFERENCIA!
                </p>
                <p className="text-xs print:text-[8px] font-bold text-neutral-600">
                  Consérvese en un lugar fresco y seco • Panaderías Brito
                </p>
                <p className="text-[10px] print:text-[7.5px] text-neutral-400 uppercase tracking-widest pt-0.5">
                  Comprobante simplificado de venta
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Info bar del formato de salida */}
        <div className="px-5 py-2.5 bg-amber-50/90 border-t border-amber-200/80 flex items-center justify-between text-xs sm:text-sm">
          <div className="flex items-center gap-2 text-stone-700 font-medium">
            <Printer className="w-4 h-4 text-amber-700" />
            <span>Formato: <strong>{printerConfig.paperWidth} ({printerConfig.selectedPrinterName})</strong></span>
          </div>
          <span className="text-xs font-bold text-amber-900 bg-amber-200/80 px-2.5 py-0.5 rounded-full">
            {printed ? "✓ Ticket Enviado" : "Listo para Imprimir"}
          </span>
        </div>

        {/* Action Buttons: Imprimir Ticket o Terminar Venta */}
        <div className="p-4 sm:p-5 bg-white border-t border-neutral-200 space-y-2.5">
          <div className="grid grid-cols-2 gap-3">
            {/* Botón 1: Imprimir Ticket */}
            <button
              type="button"
              onClick={handlePrint}
              className={`flex items-center justify-center gap-2 py-4 px-4 font-black rounded-2xl text-sm sm:text-base shadow-md border-2 transition-all active:scale-95 cursor-pointer ${
                printed
                  ? "bg-neutral-900 text-amber-300 border-amber-500/50 hover:bg-neutral-800"
                  : "bg-gradient-to-r from-[#24130c] via-[#2d1810] to-[#3a1d12] hover:from-[#1b0d08] hover:to-[#2e160e] text-amber-200 hover:text-amber-100 border-amber-900/40 shadow-lg shadow-amber-950/20"
              }`}
            >
              <Printer className={`w-5 h-5 shrink-0 ${printed ? "text-amber-300" : "text-amber-400"}`} />
              <span className="whitespace-nowrap font-black">
                {printed ? "✓ Imprimir de Nuevo" : "Imprimir Ticket"}
              </span>
            </button>

            {/* Botón 2: Terminar Venta */}
            <button
              type="button"
              onClick={handleFinishSale}
              className="flex items-center justify-center gap-2 py-4 px-4 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black rounded-2xl text-sm sm:text-base shadow-lg shadow-emerald-600/30 transition-all active:scale-95 cursor-pointer"
            >
              <CheckCircle className="w-5 h-5 text-white shrink-0" />
              <span className="whitespace-nowrap font-black">Terminar Venta</span>
            </button>
          </div>

          {/* Botón de Cancelar Ticket */}
          {onCancelTicket && (
            <button
              type="button"
              onClick={onCancelTicket}
              className="w-full py-2.5 px-3 text-stone-500 hover:text-rose-600 hover:bg-rose-50 text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Cancelar compra y regresar panes al inventario"
            >
              <X className="w-4 h-4 text-rose-500 shrink-0" />
              <span>Cancelar Ticket (Anular compra y reponer panes)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
