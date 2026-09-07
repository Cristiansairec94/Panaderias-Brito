"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  DollarSign,
  CreditCard,
  Banknote,
  CheckCircle2,
  AlertCircle,
  Receipt,
  User,
  Store,
  Calendar,
  Sparkles
} from "lucide-react";
import { CustomOrder } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { addOrderPayment } from "@/lib/orders";

interface OrderPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: CustomOrder | null;
  onPaymentSuccess: () => void;
}

export default function OrderPaymentModal({
  isOpen,
  onClose,
  order,
  onPaymentSuccess,
}: OrderPaymentModalProps) {
  const { user } = useAuth();
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<"efectivo" | "tarjeta" | "transferencia">("efectivo");
  const [markAsDelivered, setMarkAsDelivered] = useState(true);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (order) {
      setAmount(order.remainingBalance);
      setMarkAsDelivered(true);
      setNotes("");
    }
  }, [order]);

  if (!isOpen || !order) return null;

  const handleConfirmPayment = () => {
    if (amount <= 0) {
      alert("El monto del abono o liquidación debe ser mayor a $0.");
      return;
    }
    if (amount > order.remainingBalance) {
      alert(`El monto no puede ser mayor al saldo pendiente de ${formatCurrency(order.remainingBalance)}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      addOrderPayment(order.id, {
        amount,
        paymentMethod,
        cashier: user?.name || "Cajero en Turno",
        notes: notes.trim() || undefined,
        markAsDelivered: markAsDelivered && amount === order.remainingBalance,
      });

      onPaymentSuccess();
      onClose();
    } catch (err) {
      console.error("Error submitting order payment:", err);
      alert("Error al procesar el pago. Intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFullPayment = amount === order.remainingBalance;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-stone-200 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-stone-900 text-white p-5 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 border border-emerald-400/30 rounded-2xl text-emerald-300">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg leading-tight">
                {order.remainingBalance > 0 ? "Liquidar / Abonar al Pedido" : "Pedido Liquidado"}
              </h3>
              <span className="text-xs text-emerald-200/90 font-mono font-bold">
                {order.orderNumber} • {order.customerName}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-7 space-y-5">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4">
              <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">Total del Pedido</span>
              <span className="text-lg font-black text-stone-900 mt-0.5 block">{formatCurrency(order.total)}</span>
              <span className="text-[10px] text-emerald-700 font-semibold">Anticipo: {formatCurrency(order.deposit)}</span>
            </div>
            <div className="bg-rose-50/80 border border-rose-200 rounded-2xl p-4">
              <span className="text-[11px] font-bold text-rose-500 uppercase tracking-wider block">Falta por Liquidar</span>
              <span className="text-xl font-black text-rose-700 mt-0.5 block font-mono">
                {formatCurrency(order.remainingBalance)}
              </span>
              <span className="text-[10px] text-rose-600 font-medium">Saldo pendiente</span>
            </div>
          </div>

          {/* Amount input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-800">
                Monto que entrega el cliente ($ MXN)
              </label>
              <button
                type="button"
                onClick={() => setAmount(order.remainingBalance)}
                className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-lg transition-colors"
              >
                Liquidar todo ({formatCurrency(order.remainingBalance)})
              </button>
            </div>

            <div className="relative">
              <span className="absolute left-4 top-3 text-stone-400 font-bold text-lg">$</span>
              <input
                type="number"
                min="1"
                max={order.remainingBalance}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full pl-10 pr-4 py-3 border-2 border-stone-300 rounded-2xl font-black text-xl text-stone-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Quick chips if partial */}
            {order.remainingBalance > 100 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[100, 200, 500].filter((val) => val < order.remainingBalance).map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmount(val)}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700"
                  >
                    + ${val}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-800 block">
              Método de Pago
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setPaymentMethod("efectivo")}
                className={`p-3 rounded-2xl border-2 text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                  paymentMethod === "efectivo"
                    ? "bg-emerald-50 border-emerald-500 text-emerald-900 shadow-xs"
                    : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                }`}
              >
                <Banknote className="w-5 h-5 text-emerald-600" /> Efectivo
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("tarjeta")}
                className={`p-3 rounded-2xl border-2 text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                  paymentMethod === "tarjeta"
                    ? "bg-emerald-50 border-emerald-500 text-emerald-900 shadow-xs"
                    : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                }`}
              >
                <CreditCard className="w-5 h-5 text-blue-600" /> Tarjeta
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("transferencia")}
                className={`p-3 rounded-2xl border-2 text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                  paymentMethod === "transferencia"
                    ? "bg-emerald-50 border-emerald-500 text-emerald-900 shadow-xs"
                    : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                }`}
              >
                <Store className="w-5 h-5 text-purple-600" /> SPEI
              </button>
            </div>
          </div>

          {/* Mark as delivered option */}
          {isFullPayment && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-start gap-3">
              <input
                type="checkbox"
                id="deliveredCheck"
                checked={markAsDelivered}
                onChange={(e) => setMarkAsDelivered(e.target.checked)}
                className="mt-1 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
              />
              <label htmlFor="deliveredCheck" className="text-xs text-emerald-950 font-medium cursor-pointer">
                <strong className="block text-emerald-900">Marcar pedido como Entregado</strong>
                <span className="text-[11px] text-emerald-700">
                  El cliente está recogiendo el pedido en mostrador o se está enviando a domicilio.
                </span>
              </label>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-stone-500 block">Nota o referencia de pago (opcional)</label>
            <input
              type="text"
              placeholder="Ej. Pagó con billete de $500, entregado por Lupita..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="bg-stone-100 border-t border-stone-200 p-4 px-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold text-stone-600 hover:bg-stone-200 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isSubmitting || amount <= 0}
            onClick={handleConfirmPayment}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isSubmitting ? "Registrando cobro..." : `Cobrar ${formatCurrency(amount)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
