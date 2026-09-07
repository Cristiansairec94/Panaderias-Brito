"use client";

import React, { useRef, useState } from "react";
import { 
  X, 
  Printer, 
  Check, 
  Copy, 
  ShieldCheck, 
  Clock, 
  UserCheck, 
  Wallet, 
  Receipt,
  ArrowRight,
  Sparkles,
  Building2
} from "lucide-react";
import { ShiftCutRecord } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface ShiftCutDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  cut: ShiftCutRecord | null;
}

export default function ShiftCutDetailModal({
  isOpen,
  onClose,
  cut,
}: ShiftCutDetailModalProps) {
  const [copied, setCopied] = useState(false);
  const ticketRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !cut) return null;

  const totalSalesCalculated =
    cut.totalSalesAll ||
    cut.totalSales ||
    cut.cashSales + cut.cardSales + cut.transferSales ||
    0;

  const deliveredCash = Math.max(0, cut.countedCash - (cut.nextFund ?? 0));
  const responsibleName = cut.responsible || cut.outgoingCashier || "Responsable de Caja";

  const handlePrint = () => {
    window.print();
  };

  const handleCopySummary = () => {
    const summary = `🥖 PANADERÍAS BRITO - COMPROBANTE DE CORTE DE CAJA
Folio: ${cut.id}
Fecha: ${cut.date} (${cut.shiftRange})
Responsable del Turno: ${responsibleName}
Relevo: ${cut.outgoingCashier} ➔ ${cut.incomingCashier}
----------------------------------------
(+) Fondo Inicial: ${formatCurrency(cut.initialFund)}
(+) Ventas Efectivo: ${formatCurrency(cut.cashSales)}
(-) Gastos/Retiros: ${formatCurrency(cut.totalExpenses)}
(=) Efectivo Esperado: ${formatCurrency(cut.expectedCash)}
(=) Efectivo Contado: ${formatCurrency(cut.countedCash)}
Dictamen: ${cut.difference === 0 ? "Cuadrada Exacta ($0.00)" : cut.difference > 0 ? `Sobrante +${formatCurrency(cut.difference)}` : `Faltante ${formatCurrency(cut.difference)}`}
----------------------------------------
Fondo Dejado Siguiente Turno: ${formatCurrency(cut.nextFund ?? 0)}
Efectivo Entregado a Don Toño: ${formatCurrency(deliveredCash)}
Gran Total Vendido: ${formatCurrency(totalSalesCalculated)}`;

    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-stone-950/80 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200">
      {/* Estilos para impresión limpia de ticket térmico */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #thermal-ticket-print,
          #thermal-ticket-print * {
            visibility: visible;
          }
          #thermal-ticket-print {
            position: fixed;
            left: 0;
            top: 0;
            width: 80mm !important;
            max-width: 80mm !important;
            margin: 0 auto;
            padding: 4mm !important;
            background: white !important;
            color: black !important;
            font-size: 11px !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[92vh] border-2 border-stone-200">
        {/* Cabecera del Modal */}
        <div className="bg-gradient-to-r from-stone-900 via-amber-950 to-stone-900 text-white p-4 sm:p-5 px-6 flex items-center justify-between border-b border-amber-900/50 shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300 text-lg font-black shrink-0">
              🧾
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg text-white">Comprobante Oficial de Corte</h3>
                <span className="font-mono bg-amber-400/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded-lg text-xs font-bold">
                  {cut.id}
                </span>
              </div>
              <p className="text-xs text-amber-200/90 font-medium mt-0.5">
                Reimpresión de ticket archivado en historial
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Acciones Rápidas (Reimprimir e info de Responsable) */}
        <div className="bg-amber-50/80 px-6 py-3 border-b border-amber-200/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-7 h-7 rounded-xl bg-amber-200/80 text-amber-900 flex items-center justify-center font-black text-sm shrink-0">
              👩‍🍳
            </span>
            <div>
              <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider block leading-none">
                Responsable del Turno
              </span>
              <span className="text-sm font-black text-stone-900 leading-tight">
                {responsibleName}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleCopySummary}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-700 transition-colors shadow-2xs"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-black">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-stone-500" />
                  <span>Copiar Resumen</span>
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-xl text-xs font-black shadow-md shadow-amber-600/20 transition-all active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>🖨️ Reimprimir Ticket</span>
            </button>
          </div>
        </div>

        {/* Cuerpo del Modal con el Ticket Térmico Oficial */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-stone-100 flex justify-center">
          <div
            id="thermal-ticket-print"
            ref={ticketRef}
            className="w-full max-w-[370px] bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border-2 border-dashed border-stone-300 shadow-lg space-y-4 font-mono text-stone-900"
          >
            {/* Header del Ticket */}
            <div className="text-center space-y-1 border-b-2 border-dashed border-stone-300 pb-3">
              <div className="flex items-center justify-center gap-1.5 text-base font-black tracking-tight text-amber-950 font-sans">
                <span>🥖</span>
                <span>PANADERÍAS BRITO</span>
              </div>
              <p className="text-[11px] text-stone-600 font-sans font-bold">
                {cut.branchName || "Sucursal Matriz Centro"}
              </p>
              <p className="text-[10px] text-stone-500 font-sans">
                Av. Principal #100 • Tel: 55 1234 5678
              </p>
              <div className="inline-block bg-stone-900 text-white font-black text-[10px] px-3 py-0.5 rounded-md uppercase tracking-wider mt-1">
                COMPROBANTE DE CORTE DE CAJA
              </div>
            </div>

            {/* Datos Clave y Responsables */}
            <div className="space-y-1 text-xs border-b-2 border-dashed border-stone-300 pb-3">
              <div className="flex justify-between">
                <span className="text-stone-500">FOLIO CORTE:</span>
                <span className="font-black text-amber-950">{cut.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">FECHA/HORA:</span>
                <span className="font-bold">{cut.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">HORARIO TURNO:</span>
                <span className="font-bold">{cut.shiftRange}</span>
              </div>
              
              {/* RESPONSABLE DESTACADO */}
              <div className="mt-2 pt-2 border-t border-dotted border-stone-300 bg-amber-50/70 p-2 rounded-xl text-stone-900 font-sans">
                <span className="text-[10px] font-black text-amber-900 uppercase block">
                  👤 Responsable del Turno:
                </span>
                <span className="text-xs font-black text-stone-950 block mt-0.5">
                  {responsibleName}
                </span>
              </div>

              <div className="flex justify-between pt-1 text-[11px]">
                <span className="text-stone-500">ENTREGÓ (Saliente):</span>
                <span className="font-bold text-stone-800">{cut.outgoingCashier}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-stone-500">RECIBIÓ (Entrante):</span>
                <span className="font-bold text-emerald-800">{cut.incomingCashier}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-stone-500">SIGUIENTE TURNO:</span>
                <span className="font-medium text-stone-700">{cut.nextShift}</span>
              </div>
            </div>

            {/* Arqueo de Efectivo */}
            <div className="space-y-1.5 text-xs border-b-2 border-dashed border-stone-300 pb-3">
              <div className="flex justify-between font-black text-stone-500 text-[10px] uppercase pb-0.5">
                <span>Concepto de Caja</span>
                <span>Monto</span>
              </div>
              <div className="flex justify-between">
                <span>(+) Fondo Inicial de Turno:</span>
                <span className="font-bold">{formatCurrency(cut.initialFund)}</span>
              </div>
              <div className="flex justify-between text-emerald-800 font-bold">
                <span>(+) Ventas en Efectivo:</span>
                <span>+{formatCurrency(cut.cashSales)}</span>
              </div>
              <div className="flex justify-between text-rose-800 font-bold">
                <span>(-) Gastos / Salidas:</span>
                <span>-{formatCurrency(cut.totalExpenses)}</span>
              </div>
              <div className="flex justify-between font-black text-stone-950 border-t border-dotted border-stone-300 pt-1.5">
                <span>(=) Total Esperado en Caja:</span>
                <span>{formatCurrency(cut.expectedCash)}</span>
              </div>
              <div className="flex justify-between font-black text-amber-950 text-sm pt-0.5">
                <span>(=) Efectivo Físico Contado:</span>
                <span>{formatCurrency(cut.countedCash)}</span>
              </div>

              {/* Dictamen de Arqueo */}
              <div className={`p-2 rounded-xl mt-2 flex items-center justify-between font-sans text-xs font-black ${
                cut.difference === 0
                  ? "bg-emerald-100 text-emerald-950 border border-emerald-300"
                  : cut.difference > 0
                  ? "bg-blue-100 text-blue-950 border border-blue-300"
                  : "bg-rose-100 text-rose-950 border border-rose-300"
              }`}>
                <span>DICTAMEN ARQUEO:</span>
                <span>
                  {cut.difference === 0
                    ? "✓ Cuadrada Exacta ($0.00)"
                    : cut.difference > 0
                    ? `Sobrante: +${formatCurrency(cut.difference)}`
                    : `Faltante: ${formatCurrency(cut.difference)}`}
                </span>
              </div>
            </div>

            {/* Distribución del Dinero */}
            <div className="space-y-1 text-xs border-b-2 border-dashed border-stone-300 pb-3">
              <div className="flex justify-between text-amber-950 font-bold">
                <span>🪙 Fondo dejado para sig. turno:</span>
                <span className="font-black text-stone-950">{formatCurrency(cut.nextFund ?? 0)}</span>
              </div>
              <div className="flex justify-between text-emerald-900 font-bold">
                <span>💰 Efectivo entregado a Don Toño:</span>
                <span className="font-black text-emerald-950">{formatCurrency(deliveredCash)}</span>
              </div>
            </div>

            {/* Ventas por otros métodos */}
            <div className="space-y-1 text-xs border-b-2 border-dashed border-stone-300 pb-3">
              <div className="flex justify-between text-stone-600">
                <span>Ventas con Tarjeta:</span>
                <span className="font-bold">{formatCurrency(cut.cardSales)}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Ventas con Transferencia:</span>
                <span className="font-bold">{formatCurrency(cut.transferSales)}</span>
              </div>
              <div className="flex justify-between font-black text-stone-950 pt-1 border-t border-dotted border-stone-300">
                <span>Total General Vendido:</span>
                <span className="text-amber-900 text-sm font-black">{formatCurrency(totalSalesCalculated)}</span>
              </div>
            </div>

            {/* Notas si existen */}
            {cut.notes && (
              <div className="bg-stone-50 p-2 rounded-xl text-[11px] font-sans border border-stone-200">
                <span className="font-bold text-stone-700 block">Observaciones:</span>
                <p className="text-stone-600 italic">"{cut.notes}"</p>
              </div>
            )}

            {/* Sello de Seguridad Digital */}
            <div className="bg-stone-900 text-white p-3 rounded-2xl text-center space-y-1 font-sans">
              <div className="flex items-center justify-center gap-1 text-emerald-400 text-xs font-black uppercase">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Auditoría Digital de Turno</span>
              </div>
              <p className="text-[10px] text-amber-200 font-mono">
                FOLIO REGISTRO: {cut.id}
              </p>
              <p className="text-[9px] text-stone-400 leading-tight">
                Comprobante inmutable generado por Sistema Panaderías Brito.
              </p>
            </div>

            {/* Líneas de Firma Física opcionales para archivo */}
            <div className="pt-4 grid grid-cols-2 gap-4 text-center font-sans text-[10px] text-stone-600">
              <div className="space-y-1">
                <div className="border-b border-stone-400 h-6"></div>
                <span className="font-bold block">{responsibleName}</span>
                <span className="text-[9px] text-stone-400 block">Responsable de Caja</span>
              </div>
              <div className="space-y-1">
                <div className="border-b border-stone-400 h-6"></div>
                <span className="font-bold block">Don Toño Brito / Admin</span>
                <span className="text-[9px] text-stone-400 block">Recibió Conforme</span>
              </div>
            </div>

            <div className="text-center pt-2 text-[9px] text-stone-400 font-sans">
              Panaderías Brito • Sabor & Tradición Familiar
            </div>
          </div>
        </div>

        {/* Footer Modal */}
        <div className="p-4 px-6 bg-white border-t border-stone-200 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs transition-colors"
          >
            Cerrar Ventana
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-2.5 bg-stone-900 hover:bg-black text-white font-extrabold rounded-xl text-xs shadow-md transition-all active:scale-95"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>🖨️ Imprimir Ticket Oficial</span>
          </button>
        </div>
      </div>
    </div>
  );
}
