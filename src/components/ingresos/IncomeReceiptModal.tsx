"use client";

import React, { useRef } from "react";
import { Printer, CheckCircle, X, Receipt, Download } from "lucide-react";
import { CashIncome } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface IncomeReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  income: CashIncome | null;
  branchAddress?: string;
  branchPhone?: string;
}

export default function IncomeReceiptModal({
  isOpen,
  onClose,
  income,
  branchAddress = "Av. Principal #100, Col. Centro",
  branchPhone = "55 1234 5678",
}: IncomeReceiptModalProps) {
  const ticketRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !income) return null;

  const handlePrint = () => {
    window.print();
  };

  const getMethodBadge = (method: CashIncome["paymentMethod"]) => {
    switch (method) {
      case "efectivo":
        return "Efectivo en Caja";
      case "tarjeta":
        return "Tarjeta Débito/Crédito";
      case "transferencia":
        return "Transferencia / SPEI";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[92vh] border border-stone-200">
        {/* Header bar */}
        <div className="bg-gradient-to-r from-emerald-950 via-stone-900 to-emerald-950 text-white p-4 px-6 flex items-center justify-between border-b border-emerald-900/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-600/90 rounded-xl shadow-inner text-white">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <span className="font-black text-sm block leading-tight">Comprobante de Ingreso</span>
              <span className="text-[10px] text-emerald-300 font-medium">Recibo oficial de abono / entrada de dinero</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-xl text-stone-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Ticket Area */}
        <div className="flex-1 overflow-y-auto p-5 bg-stone-100/70">
          <div
            ref={ticketRef}
            id="thermal-receipt"
            className="bg-white p-6 rounded-2xl border border-stone-200 shadow-md font-mono text-xs text-stone-800 space-y-4 max-w-sm mx-auto"
          >
            {/* Business Header */}
            <div className="text-center space-y-1 border-b border-dashed border-stone-300 pb-4">
              <div className="inline-flex items-center justify-center p-2 bg-emerald-50 rounded-2xl mb-1 text-2xl shadow-inner border border-emerald-100">
                🥖
              </div>
              <h2 className="font-black text-sm tracking-wider uppercase text-stone-900 font-sans">
                PANADERÍAS BRITO
              </h2>
              <p className="text-[11px] font-black text-amber-800 font-sans">
                {income.branchName || "Sucursal Matriz Centro"}
              </p>
              <p className="text-[10px] text-stone-500 font-sans leading-tight px-2">
                {branchAddress}
              </p>
              <p className="text-[10px] text-stone-400 font-sans">
                Tel: {branchPhone}
              </p>
              <div className="pt-2">
                <span className="inline-block bg-emerald-100 text-emerald-900 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider font-sans border border-emerald-300">
                  RECIBO DE INGRESO / ABONO
                </span>
              </div>
            </div>

            {/* Ticket Metadata */}
            <div className="text-[11px] space-y-1.5 text-stone-600 border-b border-dashed border-stone-300 pb-3 font-sans">
              <div className="flex justify-between">
                <span className="text-stone-400">FOLIO:</span>
                <span className="font-black text-stone-900 font-mono">#{income.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">FECHA/HORA:</span>
                <span className="font-bold text-stone-700">{income.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">CAJERO / RECIBIÓ:</span>
                <span className="font-bold text-stone-900">{income.cashier}</span>
              </div>
              {income.referenceNumber && (
                <div className="flex justify-between">
                  <span className="text-stone-400">REFERENCIA / SPEI:</span>
                  <span className="font-mono font-bold text-stone-700">{income.referenceNumber}</span>
                </div>
              )}
            </div>

            {/* Customer & Order Data (if any) */}
            {(income.customerName || income.orderNumber) && (
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-[11px] space-y-1 font-sans">
                {income.customerName && (
                  <div className="flex justify-between">
                    <span className="text-stone-500">Cliente:</span>
                    <span className="font-bold text-stone-900">{income.customerName}</span>
                  </div>
                )}
                {income.orderNumber && (
                  <div className="flex justify-between">
                    <span className="text-stone-500">Pedido Vinculado:</span>
                    <span className="font-bold text-amber-800">{income.orderNumber}</span>
                  </div>
                )}
              </div>
            )}

            {/* Concept & Details */}
            <div className="space-y-2 border-b border-dashed border-stone-300 pb-3 font-sans">
              <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">
                Concepto del Movimiento
              </span>
              <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200/70">
                <div className="font-black text-xs text-emerald-950 flex items-center justify-between">
                  <span>{income.categoryLabel}</span>
                  <span className="text-[10px] bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-md uppercase font-bold">
                    {income.paymentMethod}
                  </span>
                </div>
                <p className="text-xs text-stone-700 mt-1 font-medium leading-snug">
                  {income.concept}
                </p>
              </div>
            </div>

            {/* Amount and Payment Total */}
            <div className="space-y-1.5 pt-1 font-sans">
              <div className="flex justify-between text-xs text-stone-600">
                <span>Forma de Pago:</span>
                <span className="font-bold text-stone-900">{getMethodBadge(income.paymentMethod)}</span>
              </div>
              <div className="flex justify-between items-baseline pt-2 border-t border-stone-300">
                <span className="font-black text-sm uppercase text-stone-900">MONTO RECIBIDO:</span>
                <span className="font-black text-2xl text-emerald-700 font-mono">
                  {formatCurrency(income.amount)}
                </span>
              </div>
            </div>

            {/* Signature & Disclaimer */}
            <div className="text-center pt-6 space-y-3 font-sans">
              <div className="border-t border-stone-300 mx-8 pt-1.5">
                <span className="text-[10px] text-stone-500 uppercase font-semibold">Firma de Conformidad</span>
              </div>
              <div className="p-2 bg-stone-50 rounded-xl border border-stone-200/60">
                <p className="text-[10px] font-bold text-stone-800">¡Gracias por su preferencia!</p>
                <p className="text-[9px] text-stone-400">Conserve este comprobante para cualquier aclaración o entrega.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-white border-t border-stone-200 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100 font-bold text-xs transition-colors"
          >
            Cerrar
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Ticket (80mm)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
