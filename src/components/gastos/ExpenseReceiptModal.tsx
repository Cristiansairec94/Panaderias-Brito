"use client";

import React, { useRef } from "react";
import { Printer, X, Receipt, ArrowDownRight } from "lucide-react";
import { ExpenseRecord } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface ExpenseReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: ExpenseRecord | null;
  branchAddress?: string;
  branchPhone?: string;
}

export default function ExpenseReceiptModal({
  isOpen,
  onClose,
  expense,
  branchAddress = "Av. Principal #450, Centro Histórico",
  branchPhone = "55 1234 5678",
}: ExpenseReceiptModalProps) {
  const ticketRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !expense) return null;

  const handlePrint = () => {
    window.print();
  };

  const getMethodBadge = (method: ExpenseRecord["paymentMethod"]) => {
    switch (method) {
      case "efectivo":
        return "Efectivo en Caja";
      case "tarjeta":
        return "Tarjeta Bancaria";
      case "transferencia":
        return "Transferencia / SPEI";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[92vh] border border-stone-200">
        {/* Header bar */}
        <div className="bg-gradient-to-r from-stone-950 via-rose-950 to-stone-950 text-white p-4 px-6 flex items-center justify-between border-b border-rose-900/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-600/90 rounded-xl shadow-inner text-white">
              <ArrowDownRight className="w-4 h-4" />
            </div>
            <div>
              <span className="font-black text-sm block leading-tight">Vale de Egreso / Gasto</span>
              <span className="text-[10px] text-rose-300 font-medium">Comprobante físico de salida de dinero</span>
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
              <div className="inline-flex items-center justify-center p-2 bg-rose-50 rounded-2xl mb-1 text-2xl shadow-inner border border-rose-100">
                🥖
              </div>
              <h2 className="font-black text-sm tracking-wider uppercase text-stone-900 font-sans">
                PANADERÍAS BRITO
              </h2>
              <p className="text-[11px] font-black text-amber-800 font-sans">
                {expense.branchName || "Sucursal Matriz (Centro)"}
              </p>
              <p className="text-[10px] text-stone-500 font-sans leading-tight px-2">
                {branchAddress}
              </p>
              <p className="text-[10px] text-stone-400 font-sans">
                Tel: {branchPhone}
              </p>
              <div className="pt-2">
                <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider font-sans border ${
                  expense.status === "anulado"
                    ? "bg-stone-200 text-stone-600 border-stone-300 line-through"
                    : "bg-rose-100 text-rose-900 border-rose-300"
                }`}>
                  {expense.status === "anulado" ? "VALE ANULADO" : "VALE DE SALIDA DE CAJA"}
                </span>
              </div>
            </div>

            {/* Ticket Metadata */}
            <div className="text-[11px] space-y-1.5 text-stone-600 border-b border-dashed border-stone-300 pb-3 font-sans">
              <div className="flex justify-between">
                <span className="text-stone-400">FOLIO:</span>
                <span className="font-black text-stone-900 font-mono">#{expense.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">FECHA/HORA:</span>
                <span className="font-bold text-stone-700">{expense.displayDate || expense.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">AUTORIZÓ / CAJERO:</span>
                <span className="font-bold text-stone-900">{expense.cashier}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">CUENTA / ORIGEN:</span>
                <span className="font-bold text-stone-700">{expense.accountOrigin || "Caja Mostrador"}</span>
              </div>
              {expense.supplier && (
                <div className="flex justify-between">
                  <span className="text-stone-400">PROVEEDOR / BENEFICIARIO:</span>
                  <span className="font-bold text-stone-900">{expense.supplier}</span>
                </div>
              )}
            </div>

            {/* Concept & Details */}
            <div className="space-y-2 border-b border-dashed border-stone-300 pb-3 font-sans">
              <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">
                Concepto del Gasto
              </span>
              <div className={`p-3 rounded-xl border ${
                expense.status === "anulado"
                  ? "bg-stone-100 border-stone-300 text-stone-500"
                  : "bg-rose-50/60 border-rose-200/70"
              }`}>
                <div className="font-black text-xs text-rose-950 flex items-center justify-between">
                  <span>{expense.categoryLabel || expense.category}</span>
                  <span className="text-[10px] bg-rose-200/80 text-rose-900 px-2 py-0.5 rounded-md uppercase font-bold">
                    {expense.paymentMethod}
                  </span>
                </div>
                <p className={`text-xs mt-1 font-medium leading-snug ${
                  expense.status === "anulado" ? "line-through text-stone-400" : "text-stone-700"
                }`}>
                  {expense.description}
                </p>
                {expense.notes && (
                  <p className="text-[10px] text-stone-500 mt-1 italic">
                    Notas: {expense.notes}
                  </p>
                )}
                {expense.status === "anulado" && expense.cancelReason && (
                  <div className="mt-2 p-1.5 bg-red-100 border border-red-200 rounded text-[10px] font-bold text-red-800">
                    Motivo anulación: {expense.cancelReason}
                  </div>
                )}
              </div>
            </div>

            {/* Amount and Payment Total */}
            <div className="space-y-1.5 pt-1 font-sans">
              <div className="flex justify-between text-xs text-stone-600">
                <span>Forma de Pago:</span>
                <span className="font-bold text-stone-900">{getMethodBadge(expense.paymentMethod)}</span>
              </div>
              <div className="flex justify-between items-baseline pt-2 border-t border-stone-300">
                <span className="font-black text-sm uppercase text-stone-900">TOTAL EGRESO:</span>
                <span className={`font-black text-2xl font-mono ${
                  expense.status === "anulado" ? "text-stone-400 line-through" : "text-rose-700"
                }`}>
                  {formatCurrency(expense.amount)}
                </span>
              </div>
            </div>

            {/* Signatures */}
            <div className="pt-6 space-y-4 font-sans">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="border-t border-stone-300 pt-1">
                    <span className="text-[9px] text-stone-500 uppercase font-semibold block">Entregó en Caja</span>
                    <span className="text-[10px] font-bold text-stone-800">{expense.cashier}</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="border-t border-stone-300 pt-1">
                    <span className="text-[9px] text-stone-500 uppercase font-semibold block">Recibió Conforme</span>
                    <span className="text-[10px] font-bold text-stone-800">{expense.supplier || "Persona / Firma"}</span>
                  </div>
                </div>
              </div>
              <div className="p-2 bg-stone-50 rounded-xl border border-stone-200/60 text-center">
                <p className="text-[9px] text-stone-400">Comprobante de control interno para arqueo de caja de Don Toño Brito.</p>
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
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 active:scale-95 text-white font-extrabold text-xs shadow-md shadow-rose-600/20 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Vale (80mm)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
