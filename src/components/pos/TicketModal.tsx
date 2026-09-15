"use client";

import React, { useRef, useState, useEffect } from "react";
import { Printer, CheckCircle, X, Receipt, Sparkles, Scissors } from "lucide-react";
import { CartItem } from "@/types";
import { formatCurrency } from "@/lib/utils";
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
  const [compactMode, setCompactMode] = useState(true); // Activo por defecto para máximo ahorro de papel
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
  const formattedDate = date || new Date().toLocaleString("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const folio = saleId ? saleId.slice(-6).toUpperCase() : `POS-${Math.floor(1000 + Math.random() * 9000)}`;

  const handlePrint = () => {
    setPrinted(true);

    const ticketEl = document.getElementById("thermal-receipt");
    if (!ticketEl) {
      window.print();
      return;
    }

    // Utilizar iframe limpio y aislado: evita que la impresora avance papel en blanco previo
    try {
      const existingFrame = document.getElementById("brito-print-frame");
      if (existingFrame) existingFrame.remove();

      const iframe = document.createElement("iframe");
      iframe.id = "brito-print-frame";
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "none";
      iframe.style.visibility = "hidden";
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc) {
        window.print();
        return;
      }

      const headStyles = Array.from(document.querySelectorAll("link[rel='stylesheet'], style"))
        .map((el) => el.outerHTML)
        .join("\n");

      const paperWidth = printerConfig.paperWidth === "80mm" ? "72mm" : "48mm";

      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Ticket #${folio}</title>
            ${headStyles}
            <style>
              @page {
                size: auto;
                margin: 0mm !important;
              }
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: #fff !important;
                color: #000 !important;
                width: ${paperWidth} !important;
                max-width: ${paperWidth} !important;
                overflow: visible !important;
              }
              #thermal-receipt {
                width: ${paperWidth} !important;
                max-width: ${paperWidth} !important;
                margin: 0 !important;
                padding: 0.5mm 1mm !important;
                border: none !important;
                box-shadow: none !important;
              }
              img {
                max-width: 22mm !important;
                max-height: 12mm !important;
                height: auto !important;
                margin: 0 auto !important;
                display: block !important;
              }
            </style>
          </head>
          <body>
            <div id="thermal-receipt" class="${ticketEl.className}">
              ${ticketEl.innerHTML}
            </div>
          </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          window.print();
        }
      }, 250);
    } catch (err) {
      window.print();
    }
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
        <div className="flex-1 overflow-y-auto p-2.5 sm:p-4 bg-neutral-100 flex flex-col items-center">
          <div className="flex items-center justify-between w-full max-w-xs mb-2 px-1 text-xs">
            <span className="text-[11px] font-semibold text-neutral-500 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-neutral-400" />
              <span>Vista previa ({is58mm ? "58mm" : "80mm"})</span>
            </span>

            {/* Toggle de Ahorro de Papel */}
            <label className="flex items-center gap-1.5 cursor-pointer select-none bg-amber-100/90 hover:bg-amber-200/90 text-amber-900 px-2 py-1 rounded-lg border border-amber-300 transition-colors shadow-2xs">
              <input
                type="checkbox"
                checked={compactMode}
                onChange={(e) => setCompactMode(e.target.checked)}
                className="w-3.5 h-3.5 accent-amber-600 rounded cursor-pointer"
              />
              <Scissors className="w-3 h-3 text-amber-700" />
              <span className="text-[10px] font-bold">Ahorro de papel</span>
            </label>
          </div>

          <div
            ref={ticketRef}
            id="thermal-receipt"
            data-paper-width={printerConfig.paperWidth}
            className={`bg-white p-3 rounded-lg border border-neutral-300 shadow-md font-mono text-xs text-black space-y-2 mx-auto ${
              is58mm ? "w-[260px]" : "w-[330px]"
            } paper-${printerConfig.paperWidth}`}
          >
            {/* Business Header con Logotipo Oficial Panaderías Brito */}
            <div className="text-center space-y-0.5 border-b border-dashed border-black pb-2">
              <div className="flex justify-center mb-0.5">
                <img
                  src="/logo.svg"
                  alt="Panadería Brito Logo"
                  className={`${compactMode ? "w-9 h-9" : "w-11 h-11"} object-contain filter grayscale contrast-200`}
                />
              </div>
              <h1 className="font-black text-xs sm:text-sm tracking-wider uppercase text-black font-mono leading-tight">
                PANADERÍAS BRITO
              </h1>
              <div className="inline-block border border-black px-2 py-0.2 rounded-full text-[8px] font-black uppercase tracking-wider text-black">
                Tradición & Sabor Familiar
              </div>
              <p className="text-[10px] font-bold text-black font-sans mt-0.5">
                {branchName} {branchPhone ? `• Tel: ${branchPhone}` : ""}
              </p>
              {branchAddress && !compactMode && (
                <p className="text-[8px] text-neutral-700 font-sans leading-tight px-1">{branchAddress}</p>
              )}
            </div>

            {/* Ticket Metadata Compacta (Folio, Fecha, Atendió, Pago) */}
            <div className="text-[9.5px] space-y-0.5 text-black border-b border-dashed border-black pb-1.5">
              <div className="flex justify-between items-center">
                <span className="font-bold">FOLIO: #{folio}</span>
                <span className="font-mono font-bold">{formattedDate}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-neutral-800">CAJERO: {cashierName}</span>
                <span className="uppercase font-black border border-black px-1 py-0.2 rounded text-[8.5px] text-black">
                  [ {paymentMethod} ]
                </span>
              </div>
              {customerName && customerName !== "Público en General" && (
                <div className="flex justify-between text-[9px]">
                  <span className="font-semibold text-neutral-800">CLIENTE:</span>
                  <span className="font-bold text-black text-right max-w-[140px] truncate">{customerName}</span>
                </div>
              )}
              {paymentMethod === "transferencia" && transferAccount && (
                <div className="flex justify-between text-[8.5px] border-t border-dotted border-black pt-0.5">
                  <span className="font-bold text-black">CUENTA:</span>
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
            <div className="space-y-0.5 pt-0.5 text-[9.5px] text-black">
              <div className="flex justify-between text-neutral-800 text-[9px]">
                <span>Total de piezas: <strong className="text-black">{totalPieces} pzas</strong></span>
                <span>Subtotal: <strong className="text-black">{formatCurrency(total)}</strong></span>
              </div>

              {/* Total Destacado */}
              <div className="bg-black text-white py-1 px-2 rounded flex justify-between items-center my-1">
                <span className="font-black text-[10px] tracking-wider uppercase">TOTAL A PAGAR:</span>
                <span className="font-black text-xs sm:text-sm tracking-wide">{formatCurrency(total)} MXN</span>
              </div>

              {paymentMethod === "efectivo" && (
                <div className="flex justify-between text-neutral-900 text-[9.5px] pt-0.5 font-bold">
                  <span>Recibido: {formatCurrency(cashGiven || total)}</span>
                  <span>Cambio: <strong className="text-black underline">{formatCurrency(change || 0)}</strong></span>
                </div>
              )}
            </div>

            {/* Bloques Promocionales Opcionales (Solo si ahorro de papel está desactivado) */}
            {!compactMode && (
              <>
                {/* Horarios de Pan Calientito */}
                <div className="p-1.5 border border-black rounded text-center space-y-0.5 font-sans bg-white my-1">
                  <div className="flex items-center justify-center gap-1 text-[9px] font-black text-black uppercase tracking-wider">
                    <span>★</span>
                    <span>¡PAN CALIENTITO RECIÉN HORNEADO!</span>
                    <span>★</span>
                  </div>
                  <p className="text-[10px] font-black text-black">
                    🥐 De 6:00 AM a 10:00 PM 🥐
                  </p>
                </div>

                {/* Pedidos Especiales */}
                <div className="text-center pt-1 space-y-1 font-sans border-t border-dashed border-black">
                  <div className="space-y-0.5 border border-black rounded p-1.5 bg-neutral-50">
                    <p className="text-[9px] font-black text-black uppercase tracking-wider flex items-center justify-center gap-1">
                      <span>🎉</span>
                      <span>¿TIENES FIESTA O EVENTO?</span>
                      <span>🎂</span>
                    </p>
                    <p className="text-[8.5px] font-bold text-black leading-tight">
                      Horneamos pedidos especiales con 50% de anticipo en mostrador
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Pie de Ticket Compacto y Amable */}
            <div className="text-center pt-1 space-y-0.5 font-sans border-t border-dashed border-black">
              <p className="font-black text-black text-[10px] tracking-wide uppercase">
                ¡GRACIAS POR SU COMPRA!
              </p>
              <p className="text-[8px] font-semibold text-neutral-600">
                Panadería Brito • Sabor & Tradición Familiar
              </p>
              <p className="text-[7.5px] text-neutral-400 uppercase tracking-widest">
                Comprobante de venta
              </p>
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
