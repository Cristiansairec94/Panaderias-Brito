"use client";

import React, { useRef, useState, useEffect } from "react";
import { Printer, CheckCircle, X, Receipt, Settings2, Zap, Sliders, SunMedium } from "lucide-react";
import { CartItem } from "@/types";
import { formatCurrency, formatDateTimeSafe } from "@/lib/utils";
import { playCashRegisterSound } from "@/lib/sound";
import {
  getStoredPrinterConfig,
  saveStoredPrinterConfig,
  PrinterConfig,
  TicketTone,
  TicketPrintableWidth,
} from "@/lib/printer";

interface TicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCancelTicket?: () => void;
  onConfigurePrinter?: () => void;
  isReprint?: boolean;
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
  isReprint = false,
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

  // Listener de tecla Escape para cerrar el ticket limpiamente
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const totalPieces = items.reduce((sum, item) => sum + item.quantity, 0);
  const formattedDate = date || formatDateTimeSafe();
  const folio = saleId ? saleId.slice(-6).toUpperCase() : `POS-${Math.floor(1000 + Math.random() * 9000)}`;

  const handlePrint = () => {
    setPrinted(true);
    window.print();
  };

  const handleFinishSale = () => {
    if (!isReprint) {
      try {
        playCashRegisterSound();
      } catch (e) {
        console.error("Error al reproducir caja registradora:", e);
      }
    }
    onClose();
  };

  const is58mm = printerConfig.paperWidth === "58mm";
  const currentTone: TicketTone = printerConfig.ticketTone || "oscuro";
  const currentWidth: TicketPrintableWidth = printerConfig.printableWidth || (is58mm ? "46mm" : "72mm");

  const handleUpdateTone = (newTone: TicketTone) => {
    const updated: PrinterConfig = {
      ...printerConfig,
      ticketTone: newTone,
    };
    setPrinterConfig(updated);
    saveStoredPrinterConfig(updated);
  };

  const handleUpdateWidth = (newWidth: TicketPrintableWidth) => {
    const updated: PrinterConfig = {
      ...printerConfig,
      printableWidth: newWidth,
    };
    setPrinterConfig(updated);
    saveStoredPrinterConfig(updated);
  };

  return (
    <div 
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
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
        </div>

        {/* Printable Ticket Area con Vista Previa Ampliada para Mostrador */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 bg-neutral-100 flex flex-col items-center">
          {/* Barra de Calibración de Tono y Brillo para Caja */}
          <div className="w-full max-w-[420px] mb-3 bg-white p-3 rounded-2xl border border-stone-300 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-black text-stone-900">
                <Sliders className="w-3.5 h-3.5 text-amber-600" />
                <span>Calibración de Tono y Brillo Térmico</span>
              </div>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                Ajuste en vivo
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* Selector de Tono / Intensidad */}
              <div>
                <span className="text-[10.5px] font-bold text-stone-600 block mb-1">Tono / Oscuridad:</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => handleUpdateTone("normal")}
                    className={`flex-1 py-1 px-1 rounded-lg text-[10.5px] font-bold border transition-all cursor-pointer ${
                      currentTone === "normal"
                        ? "bg-[#2d1810] text-amber-200 border-amber-700 shadow-xs"
                        : "bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200"
                    }`}
                  >
                    Normal
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateTone("oscuro")}
                    className={`flex-1 py-1 px-1 rounded-lg text-[10.5px] font-black border transition-all cursor-pointer ${
                      currentTone === "oscuro"
                        ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                        : "bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200"
                    }`}
                    title="Recomendado térmico: negro 100% nítido"
                  >
                    Oscuro ⭐
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateTone("ultra_oscuro")}
                    className={`flex-1 py-1 px-1 rounded-lg text-[10.5px] font-black border transition-all cursor-pointer ${
                      currentTone === "ultra_oscuro"
                        ? "bg-black text-amber-300 border-black shadow-xs"
                        : "bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200"
                    }`}
                    title="Máximo quemado térmico para cabezales desgastados"
                  >
                    Ultra
                  </button>
                </div>
              </div>

              {/* Selector de Ancho Seguro */}
              <div>
                <span className="text-[10.5px] font-bold text-stone-600 block mb-1">Ancho Seguro (No corta):</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => handleUpdateWidth("44mm")}
                    className={`flex-1 py-1 px-1 rounded-lg text-[10.5px] font-bold border transition-all cursor-pointer ${
                      currentWidth === "44mm"
                        ? "bg-[#2d1810] text-amber-200 border-amber-700 shadow-xs"
                        : "bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200"
                    }`}
                  >
                    44mm
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateWidth("46mm")}
                    className={`flex-1 py-1 px-1 rounded-lg text-[10.5px] font-black border transition-all cursor-pointer ${
                      currentWidth === "46mm"
                        ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                        : "bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200"
                    }`}
                    title="Recomendado para rollos de 58mm: no corta letras a la derecha"
                  >
                    46mm ⭐
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateWidth("48mm")}
                    className={`flex-1 py-1 px-1 rounded-lg text-[10.5px] font-bold border transition-all cursor-pointer ${
                      currentWidth === "48mm"
                        ? "bg-[#2d1810] text-amber-200 border-amber-700 shadow-xs"
                        : "bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200"
                    }`}
                  >
                    48mm
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div
            ref={ticketRef}
            id="thermal-receipt"
            data-paper-width={printerConfig.paperWidth}
            data-tone={currentTone}
            data-printable-width={currentWidth}
            className={`bg-white p-4 sm:p-5 print:p-0.5 rounded-2xl print:rounded-none border-2 print:border-none border-neutral-300 shadow-xl print:shadow-none font-mono text-black space-y-2.5 print:space-y-1 mx-auto w-full max-w-[390px] sm:max-w-[425px] print:w-[46mm] print:max-w-[46mm] paper-${printerConfig.paperWidth}`}
            style={{
              color: "#000000",
              WebkitPrintColorAdjust: "exact",
              printColorAdjust: "exact",
            }}
          >
            {/* Business Header con Logotipo Oficial Panaderías Brito */}
            <div className="text-center space-y-1 print:space-y-0.5 border-b-2 border-dashed border-black pb-2.5 print:pb-1">
              <div className="flex justify-center mb-1 print:mb-0.5">
                <img
                  src="/logo.svg"
                  alt="Panadería Brito Logo"
                  className="w-14 h-14 sm:w-16 sm:h-16 print:w-10 print:h-10 object-contain filter grayscale contrast-[300%]"
                />
              </div>
              <h1 className="font-black text-base sm:text-lg print:text-base tracking-wider uppercase text-black font-mono leading-tight">
                PANADERÍAS BRITO
              </h1>
              <div className="inline-block border-2 border-black px-3 py-0.5 rounded-full text-xs print:text-[10px] font-black uppercase tracking-wider text-black">
                Tradición & Sabor Familiar
              </div>
              <p className="text-sm sm:text-base print:text-[11.5px] font-black text-black font-mono mt-0.5">
                {branchName}
              </p>
              {branchAddress ? (
                <p className="text-xs sm:text-sm print:text-[11px] font-black text-black font-mono leading-tight px-1">
                  {branchAddress}
                </p>
              ) : (
                <p className="text-xs sm:text-sm print:text-[11px] font-black text-black font-mono leading-tight px-1">
                  Av. Principal #456, Centro
                </p>
              )}
              <p className="text-xs sm:text-sm print:text-[11px] text-black font-mono font-black">
                {branchPhone ? `Tel: ${branchPhone}` : "Don Antonio Brito & Hijos"}
              </p>
            </div>

            {/* Ticket Metadata (Folio, Fecha, Cliente, Atendió, Pago) */}
            <div className="text-xs sm:text-sm print:text-[11px] space-y-1 print:space-y-0.5 text-black border-b-2 border-dashed border-black pb-2 print:pb-1">
              <div className="flex justify-between items-center">
                <span className="font-black text-black">FOLIO:</span>
                <span className="border-2 border-black px-1.5 py-0.2 rounded font-mono font-black text-xs sm:text-sm print:text-[11px] text-black">
                  #{folio}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-black text-black">FECHA:</span>
                <span className="font-mono font-black text-black text-right">{formattedDate}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="font-black text-black shrink-0 pr-1">CLIENTE:</span>
                <span className="font-black text-black text-right break-words flex-1">
                  {customerName || "Público en General"}
                  {customerType && customerType !== "general" && (
                    <span className="ml-1 text-[10px] print:text-[9.5px] font-black uppercase border border-black px-1 py-0.2 rounded">
                      {customerType}
                    </span>
                  )}
                </span>
              </div>
              <div className="flex justify-between items-start">
                <span className="font-black text-black shrink-0 pr-1">ATENDIÓ:</span>
                <span className="font-black text-black text-right break-words flex-1">{cashierName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-black text-black">MÉTODO PAGO:</span>
                <span className="uppercase font-black border-2 border-black px-1.5 py-0.2 rounded text-xs print:text-[10px] text-black">
                  [ {paymentMethod} ]
                </span>
              </div>
              {paymentMethod === "transferencia" && transferAccount && (
                <div className="flex justify-between text-xs print:text-[10px] border-t border-dashed border-black pt-1">
                  <span className="font-black text-black">CUENTA DEPÓSITO:</span>
                  <span className="font-black text-black text-right break-words flex-1">{transferAccount}</span>
                </div>
              )}
            </div>

            {/* Items Breakdown */}
            <div className="space-y-1.5 border-b-2 border-dashed border-black pb-2 print:pb-1 font-mono">
              <div className="border-y-2 border-black py-1 print:py-0.5 flex justify-between font-black text-xs sm:text-sm print:text-[11.5px] text-black uppercase tracking-wider">
                <span>CANT. / PRODUCTO</span>
                <span className="text-right">IMPORTE</span>
              </div>

              <div className="space-y-1 pt-1 print:pt-0.5">
                {items.map((item, idx) => (
                  <div key={idx} className="text-black leading-tight space-y-0.5 border-b border-dashed border-black/40 pb-1 last:border-0 last:pb-0">
                    <div className="flex justify-between items-start gap-1">
                      <span className="font-black text-xs sm:text-sm print:text-[11.5px] text-black flex-1 pr-1 break-words">
                        {item.product.name}
                      </span>
                      <span className="font-black text-xs sm:text-sm print:text-[11.5px] text-black whitespace-nowrap text-right shrink-0">
                        {formatCurrency(item.product.price * item.quantity)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] sm:text-xs print:text-[11px] text-black font-black">
                      <span className="text-black font-black">
                        {item.quantity} {item.quantity === 1 ? "pza" : "pzas"} × {formatCurrency(item.product.price)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals Breakdown */}
            <div className="space-y-1 pt-1 text-xs sm:text-sm print:text-[11px] text-black">
              <div className="flex justify-between items-center text-xs sm:text-sm print:text-[11px] font-black text-black border-t border-dashed border-black pt-1">
                <span>PIEZAS: <strong className="font-black text-black">{totalPieces}</strong></span>
                <span>SUBTOTAL: <strong className="font-black text-black">{formatCurrency(total)}</strong></span>
              </div>

              {/* Total Destacado en Alto Contraste Térmico (Marco Doble Negro) */}
              <div className="border-2 border-black p-2 print:p-1.5 rounded-xl flex justify-between items-center my-1.5 bg-white text-black">
                <span className="font-black text-xs sm:text-sm print:text-[12px] tracking-wider uppercase text-black">
                  TOTAL A PAGAR:
                </span>
                <span className="font-black text-base sm:text-lg print:text-[14px] tracking-wide text-black">
                  {formatCurrency(total)} MXN
                </span>
              </div>

              {paymentMethod === "efectivo" && (
                <div className="space-y-1 pt-0.5 text-black">
                  <div className="flex justify-between items-center text-xs sm:text-sm print:text-[11px] font-black text-black">
                    <span>Efectivo recibido:</span>
                    <span className="font-black text-black">{formatCurrency(cashGiven || total)}</span>
                  </div>
                  <div className="flex justify-between items-center border-2 border-black p-1.5 print:p-1 rounded-xl font-black text-sm sm:text-base print:text-[13px] bg-white text-black">
                    <span>SU CAMBIO:</span>
                    <span className="text-base sm:text-lg print:text-[13px] font-black text-black">{formatCurrency(change || 0)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Agradecimiento y Pie de Ticket */}
            <div className="text-center pt-2 print:pt-1 space-y-1 font-sans border-t-2 border-dashed border-black my-1">
              <p className="font-black text-black text-xs sm:text-sm print:text-[12px] tracking-wide uppercase">
                ¡GRACIAS POR SU PREFERENCIA!
              </p>
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

            {/* Botón 2: Terminar Venta o Cerrar Ticket */}
            <button
              type="button"
              onClick={handleFinishSale}
              className="flex items-center justify-center gap-2 py-4 px-4 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black rounded-2xl text-sm sm:text-base shadow-lg shadow-emerald-600/30 transition-all active:scale-95 cursor-pointer"
            >
              <CheckCircle className="w-5 h-5 text-white shrink-0" />
              <span className="whitespace-nowrap font-black">
                {isReprint ? "Cerrar Ticket" : "Terminar Venta"}
              </span>
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
              <span>{isReprint ? "Anular Ticket (Cancelar venta y devolver panes)" : "Cancelar Ticket (Anular compra y reponer panes)"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
