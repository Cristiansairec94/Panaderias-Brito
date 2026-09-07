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
  Calendar
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-stone-200 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-stone-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 border border-emerald-400/30 rounded-2xl text-emerald-300">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg leading-tight">
                {order.remainingBalance > 0 ? "Liquidar / Abonar a Pedido" : "Pedido Liquidado"}
              </h3>
              <span className="text-xs text-emerald-200/90 font-mono font-bold">
                {order.orderNumber} • {order.customerName}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Summary Box */}
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-2.5 text-xs">
            <div className="flex justify-between text-stone-600">
              <span>Monto Total del Pedido:</span>
              <span className="font-bold text-stone-900">{formatCurrency(order.total)}</span>
            </div>
            <div className="flex justify-between text-emerald-700">
              <span>Anticipo Previo Pagado:</span>
              <span className="font-bold">{formatCurrency(order.deposit)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-stone-200 font-extrabold">
              <span className="text-stone-800 text-sm">Falta por Liquidar:</span>
              <span className="text-base text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-lg border border-rose-200">
                {formatCurrency(order.remainingBalance)}
              </span>
            </div>
          </div>

          {/* Amount input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 block">
              Monto a Cobrar / Abonar ($ MXN)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-stone-400 font-bold text-base">$</span>
              <input
                type="number"
                min="1"
                max={order.remainingBalance}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full pl-8 pr-4 py-2.5 border-2 border-stone-300 rounded-xl font-black text-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setAmount(order.remainingBalance)}
                className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-lg transition-colors"
              >
                Cobrar saldo restante completo ({formatCurrency(order.remainingBalance)})
              </button>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 block">
              Método de Pago
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod("efectivo")}
                className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                  paymentMethod === "efectivo"
                    ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-2xs"
                    : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                }`}
              >
                <Banknote className="w-4 h-4 text-emerald-600" /> Efectivo
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("tarjeta")}
                className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                  paymentMethod === "tarjeta"
                    ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-2xs"
                    : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                }`}
              >
                <CreditCard className="w-4 h-4 text-blue-600" /> Tarjeta
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("transferencia")}
                className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                  paymentMethod === "transferencia"
                    ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-2xs"
                    : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                }`}
              >
                <Store className="w-4 h-4 text-purple-600" /> SPEI
              </button>
            </div>
          </div>

          {/* Mark as delivered option */}
          {isFullPayment && (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 flex items-start gap-2.5">
              <input
                type="checkbox"
                id="deliveredCheck"
                checked={markAsDelivered}
                onChange={(e) => setMarkAsDelivered(e.target.checked)}
                className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="deliveredCheck" className="text-xs text-emerald-950 font-medium cursor-pointer">
                <strong>Marcar pedido como Entregado</strong>
                <span className="block text-[11px] text-emerald-700">
                  El cliente está recogiendo o recibiendo el pedido en este momento.
                </span>
              </label>
            </div>
          )}

          {/* Notes */}
          <div>
            <input
              type="text"
              placeholder="Nota adicional sobre el cobro (opcional)..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="bg-stone-100 border-t border-stone-200 p-4 px-6 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-200 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isSubmitting || amount <= 0}
            onClick={handleConfirmPayment}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isSubmitting ? "Registrando..." : `Cobrar ${formatCurrency(amount)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
