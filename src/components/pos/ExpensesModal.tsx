"use client";

import React, { useState } from "react";
import { 
  X, 
  DollarSign, 
  PlusCircle, 
  Trash2, 
  AlertCircle, 
  CheckCircle,
  Receipt,
  Wallet,
  ArrowDownRight,
  TrendingDown,
  BellRing,
  Send,
  UserCheck
} from "lucide-react";
import { CashExpense } from "@/types";
import { formatCurrency, onlyNumbersKeyDown, cleanDecimalNumbers } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useNotifications } from "@/context/NotificationContext";

interface ExpensesModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenses: CashExpense[];
  onAddExpense: (expense: CashExpense) => void;
  onDeleteExpense?: (id: string) => void;
  cashSalesTotal: number;
  cashierName?: string;
}

const QUICK_AMOUNTS = [50, 100, 150, 200, 300, 500];

export default function ExpensesModal({
  isOpen,
  onClose,
  expenses,
  onAddExpense,
  onDeleteExpense,
  cashSalesTotal,
  cashierName = "Don Toño Brito",
}: ExpensesModalProps) {
  const { addNotification } = useNotifications();
  const [activeTab, setActiveTab] = useState<"register" | "list">("register");
  
  // Simple form fields
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  if (!isOpen) return null;

  // Filtrar exclusivamente las salidas correspondientes a la cajera y turno en operación
  const shiftExpenses = expenses.filter((e) => {
    if (!e.cashier) return true;
    const cName = cashierName.toLowerCase().trim();
    const expCashier = e.cashier.toLowerCase().trim();
    return expCashier === cName || cName.includes(expCashier) || expCashier.includes(cName);
  });

  const totalExpenses = shiftExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netCashInDrawer = Math.max(0, cashSalesTotal - totalExpenses);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0 || !description.trim()) return;

    setIsSubmitting(true);
    const newExpense: CashExpense = {
      id: `EXP-${Date.now().toString().slice(-6)}`,
      amount: parsedAmount,
      category: "otro",
      description: description.trim(),
      cashier: cashierName,
      date: new Date().toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }),
    };

    try {
      const supabase = createClient();
      await supabase
        .from("cash_expenses")
        .insert({
          amount: newExpense.amount,
          category: newExpense.category,
          description: newExpense.description,
          cashier: newExpense.cashier,
        });
    } catch (err) {
      console.log("Offline mode, saved locally", err);
    } finally {
      onAddExpense(newExpense);

      // Notificación DIRECTA e inmediata para el Administrador / Don Toño
      addNotification({
        senderName: `Salida de Caja (${newExpense.cashier})`,
        senderAvatar: "💸",
        badgeIcon: "dinero",
        title: `Salida de Efectivo: ${formatCurrency(newExpense.amount)}`,
        highlightText: newExpense.description,
        description: `Motivo registrado: "${newExpense.description}". Responsable: ${newExpense.cashier}.`,
        category: "caja",
        actionLabel: "Ver Flujo de Caja",
        actionLink: "/caja",
      });

      setIsSubmitting(false);
      setFeedbackSuccess(true);
      setAmount("");
      setDescription("");

      setTimeout(() => {
        setFeedbackSuccess(false);
        onClose();
      }, 1200);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh] border border-stone-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-950 via-stone-900 to-amber-950 text-white p-5 px-6 flex items-center justify-between border-b border-amber-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-600/90 rounded-2xl shadow-inner">
              <TrendingDown className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-base leading-tight">Salida de Efectivo / Gastos</h3>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-400/40 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                  👤 {cashierName}
                </span>
              </div>
              <p className="text-[11px] text-amber-200/80 font-medium">Historial exclusivo del turno en operación</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Cash Balances Bar */}
        <div className="grid grid-cols-3 gap-2 p-4 bg-stone-50 border-b border-stone-200/80 text-center">
          <div className="bg-white p-2.5 rounded-2xl border border-stone-200/80 shadow-xs">
            <span className="text-[10px] uppercase font-bold text-stone-400 block leading-tight">Ventas Efectivo</span>
            <span className="text-xs sm:text-sm font-black text-emerald-700">{formatCurrency(cashSalesTotal)}</span>
          </div>

          <div className="bg-rose-50 p-2.5 rounded-2xl border border-rose-200 shadow-xs">
            <span className="text-[10px] uppercase font-bold text-rose-700 block leading-tight">Total Salidas</span>
            <span className="text-xs sm:text-sm font-black text-rose-800">-{formatCurrency(totalExpenses)}</span>
          </div>

          <div className="bg-amber-50 p-2.5 rounded-2xl border border-amber-200 shadow-xs">
            <span className="text-[10px] uppercase font-bold text-amber-800 block leading-tight">En Caja (Cajón)</span>
            <span className="text-xs sm:text-sm font-black text-stone-900">{formatCurrency(netCashInDrawer)}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stone-200 bg-stone-100/60 p-1.5 gap-1.5">
          <button
            onClick={() => setActiveTab("register")}
            className={`flex-1 py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "register"
                ? "bg-white text-stone-900 shadow-sm border border-stone-200"
                : "text-stone-500 hover:text-stone-900"
            }`}
          >
            <PlusCircle className="w-4 h-4 text-rose-600" />
            <span>Registrar Salida</span>
          </button>
          <button
            onClick={() => setActiveTab("list")}
            className={`flex-1 py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "list"
                ? "bg-white text-stone-900 shadow-sm border border-stone-200"
                : "text-stone-500 hover:text-stone-900"
            }`}
          >
            <Receipt className="w-4 h-4 text-amber-700" />
            <span>Ver Salidas ({shiftExpenses.length})</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {feedbackSuccess ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 animate-in zoom-in">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-black text-stone-900">¡Salida Registrada con Éxito!</h4>
              <p className="text-xs text-stone-500 max-w-xs">
                Se descontó del efectivo en caja y se envió la notificación directa al administrador.
              </p>
            </div>
          ) : activeTab === "register" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 1. Monto */}
              <div className="space-y-2">
                <label className="text-xs font-black text-stone-900 block">
                  1. ¿Cuánto dinero se sacó de la caja?
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-xl text-rose-600">$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    autoFocus
                    placeholder="0.00"
                    value={amount}
                    onKeyDown={(e) => onlyNumbersKeyDown(e, true)}
                    onChange={(e) => setAmount(cleanDecimalNumbers(e.target.value))}
                    className="w-full pl-9 pr-4 py-3.5 bg-stone-50 rounded-2xl border-2 border-stone-200 focus:border-rose-500 focus:bg-white focus:outline-none text-2xl font-black text-stone-900 transition-all shadow-inner"
                  />
                </div>

                {/* Botones rápidos de monto */}
                <div className="grid grid-cols-6 gap-1.5 pt-0.5">
                  {QUICK_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAmount(amt.toString())}
                      className="py-1.5 bg-stone-100 hover:bg-rose-600 hover:text-white text-stone-800 font-extrabold text-xs rounded-xl border border-stone-200 transition-all active:scale-95"
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Motivo */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-stone-900 block">
                  2. ¿Para qué se usó el dinero?
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder=""
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3.5 bg-stone-50 rounded-2xl border-2 border-stone-200 focus:border-rose-500 focus:bg-white focus:outline-none text-xs font-medium text-stone-900 transition-all leading-relaxed"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !amount || Number(amount) <= 0 || !description.trim()}
                  className="w-full py-4 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 disabled:opacity-50 text-white font-black rounded-2xl text-sm shadow-xl shadow-rose-600/30 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {isSubmitting
                      ? "Guardando..."
                      : `Registrar Salida ${amount ? `(${formatCurrency(Number(amount))})` : ""}`}
                  </span>
                </button>
                <p className="text-[10px] text-center text-stone-400 mt-2 flex items-center justify-center gap-1">
                  <BellRing className="w-3 h-3 text-amber-500" />
                  Se notificará inmediatamente al panel del administrador
                </p>
              </div>
            </form>
          ) : (
            <div className="space-y-2.5">
              {shiftExpenses.length === 0 ? (
                <div className="text-center py-12 text-stone-400 space-y-2">
                  <Receipt className="w-10 h-10 mx-auto text-stone-300" />
                  <p className="font-bold text-xs text-stone-600">No hay salidas registradas en el turno de {cashierName}.</p>
                  <p className="text-[11px]">Todo el dinero de ventas permanece íntegro en caja.</p>
                </div>
              ) : (
                shiftExpenses.map((exp) => (
                  <div
                    key={exp.id}
                    className="p-3.5 bg-stone-50 hover:bg-stone-100 rounded-2xl border border-stone-200/80 flex items-start justify-between gap-3 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-rose-600 text-sm">
                          -{formatCurrency(exp.amount)}
                        </span>
                        <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full font-bold">
                          {exp.cashier}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-stone-900 mt-1 leading-snug">
                        {exp.description}
                      </p>
                      <p className="text-[10px] text-stone-400 mt-0.5">{exp.date}</p>
                    </div>

                    {onDeleteExpense && (
                      <button
                        onClick={() => onDeleteExpense(exp.id)}
                        className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Eliminar salida"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
