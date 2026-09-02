"use client";

import React, { useState } from "react";
import { 
  X, 
  DollarSign, 
  PlusCircle, 
  Trash2, 
  AlertCircle, 
  Sparkles, 
  UserCheck, 
  Package, 
  Droplet, 
  CheckCircle,
  Receipt,
  Wallet,
  ArrowDownRight,
  TrendingDown
} from "lucide-react";
import { CashExpense } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface ExpensesModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenses: CashExpense[];
  onAddExpense: (expense: CashExpense) => void;
  onDeleteExpense?: (id: string) => void;
  cashSalesTotal: number;
}

const CATEGORIES = [
  { id: "limpieza", label: "Limpieza & Aseo", icon: "🧹", desc: "Jabón, escobas, cloro, bolsas, papel" },
  { id: "retiro_personal", label: "Retiro Personal / Patrón", icon: "👤", desc: "Dinero tomado por Don Toño o personal" },
  { id: "insumos_menores", label: "Insumo Menor / Emergencia", icon: "📦", desc: "Gas, hielo, compras rápidas" },
  { id: "proveedor", label: "Pago Proveedor Menor", icon: "🚚", desc: "Repartidores, garrafón de agua" },
  { id: "otro", label: "Otros Gastos", icon: "🏷️", desc: "Cualquier otro desembolso de caja" },
];

const QUICK_TEMPLATES = [
  { label: "🧹 Jabón y Escoba", category: "limpieza", desc: "Jabón Roma, cloro y escoba para charolas" },
  { label: "👤 Retiro Don Toño", category: "retiro_personal", desc: "Retiro de efectivo para uso personal de Don Toño" },
  { label: "🛍️ Bolsas y Papel", category: "limpieza", desc: "Bolsas de plástico y papel de estraza para pan" },
  { label: "💧 Garrafón de Agua", category: "proveedor", desc: "Pago de garrafón de agua purificada" },
  { label: "🧊 Hielo / Refrescos", category: "insumos_menores", desc: "Bolsa de hielo para vitrina" },
];

export default function ExpensesModal({
  isOpen,
  onClose,
  expenses,
  onAddExpense,
  onDeleteExpense,
  cashSalesTotal,
}: ExpensesModalProps) {
  const [activeTab, setActiveTab] = useState<"register" | "list">("register");
  
  // Form fields
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<CashExpense["category"]>("limpieza");
  const [description, setDescription] = useState("");
  const [authorizedBy, setAuthorizedBy] = useState("Don Toño Brito");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  if (!isOpen) return null;

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netCashInDrawer = Math.max(0, cashSalesTotal - totalExpenses);

  const handleApplyTemplate = (tmpl: typeof QUICK_TEMPLATES[0]) => {
    setCategory(tmpl.category as any);
    setDescription(tmpl.desc);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0 || !description.trim()) return;

    setIsSubmitting(true);
    const newExpense: CashExpense = {
      id: `EXP-${Date.now().toString().slice(-6)}`,
      amount: parsedAmount,
      category,
      description: description.trim(),
      cashier: authorizedBy.trim() || "Caja Principal - Don Toño",
      date: new Date().toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }),
    };

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("cash_expenses")
        .insert({
          amount: newExpense.amount,
          category: newExpense.category,
          description: newExpense.description,
          cashier: newExpense.cashier,
        })
        .select()
        .single();

      if (data && !error) {
        newExpense.id = data.id;
      }
    } catch (err) {
      console.log("Offline mode for expenses", err);
    } finally {
      onAddExpense(newExpense);
      setIsSubmitting(false);
      setAmount("");
      setDescription("");
      setFeedbackSuccess(true);
      setTimeout(() => setFeedbackSuccess(false), 2500);
      setActiveTab("list");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Top Banner */}
        <div className="bg-amber-950 text-white p-5 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-600/90 text-white rounded-2xl shadow-md">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base leading-tight">Gastos y Salidas de Efectivo</h2>
              <p className="text-xs text-amber-200/80">Control de compras menores, jabón, escobas y retiros personales</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-amber-900 rounded-xl text-amber-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Drawer Balance Strip */}
        <div className="grid grid-cols-3 bg-stone-50 border-b border-stone-200 p-4 gap-3 text-center text-xs">
          <div className="bg-white p-3 rounded-2xl border border-stone-200/80 shadow-sm">
            <span className="text-[11px] font-bold text-stone-500 block">Ventas en Efectivo</span>
            <span className="text-base font-black text-emerald-700">{formatCurrency(cashSalesTotal)}</span>
          </div>

          <div className="bg-rose-50/70 p-3 rounded-2xl border border-rose-200/80 shadow-sm">
            <span className="text-[11px] font-bold text-rose-700 block">Total Salidas / Gastos</span>
            <span className="text-base font-black text-rose-700">-{formatCurrency(totalExpenses)}</span>
          </div>

          <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-300 shadow-sm">
            <span className="text-[11px] font-black text-amber-900 block">Efectivo Real en Caja</span>
            <span className="text-base font-black text-stone-900">{formatCurrency(netCashInDrawer)}</span>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex border-b border-stone-200 bg-stone-100/60 p-2 gap-2">
          <button
            onClick={() => setActiveTab("register")}
            className={`flex-1 py-2.5 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 ${
              activeTab === "register"
                ? "bg-white text-amber-900 shadow-sm border border-stone-200"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <PlusCircle className="w-4 h-4 text-amber-700" />
            <span>Registrar Salida de Dinero</span>
          </button>
          <button
            onClick={() => setActiveTab("list")}
            className={`flex-1 py-2.5 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 ${
              activeTab === "list"
                ? "bg-white text-amber-900 shadow-sm border border-stone-200"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <Receipt className="w-4 h-4 text-rose-600" />
            <span>Ver Gastos del Turno ({expenses.length})</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "register" ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              {feedbackSuccess && (
                <div className="bg-emerald-50 text-emerald-800 border border-emerald-300 p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>¡Gasto registrado correctamente! El arqueo de caja se actualizó.</span>
                </div>
              )}

              {/* Quick Template Buttons */}
              <div className="space-y-2">
                <span className="text-[11px] font-extrabold text-stone-500 uppercase tracking-wider block">
                  Plantillas Rápidas (1 Clic):
                </span>
                <div className="flex flex-wrap gap-2">
                  {QUICK_TEMPLATES.map((tmpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyTemplate(tmpl)}
                      className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100/80 text-stone-800 font-bold text-xs rounded-xl border border-amber-200 shadow-sm transition-all active:scale-95"
                    >
                      {tmpl.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount & Authorized By */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-stone-700">Monto Retirado ($ MXN):</label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="number"
                      step="0.50"
                      min="1"
                      required
                      placeholder="Ej. 150, 300, 500"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-stone-50 rounded-2xl border border-stone-300 text-sm font-black text-stone-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-stone-700">Autorizado / Tomado por:</label>
                  <div className="relative">
                    <UserCheck className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      required
                      placeholder="Don Toño, Cajero 1, etc."
                      value={authorizedBy}
                      onChange={(e) => setAuthorizedBy(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-stone-50 rounded-2xl border border-stone-300 text-xs font-bold text-stone-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Category selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-stone-700">Categoría del Gasto:</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id as any)}
                      className={`p-3 rounded-2xl text-left border transition-all flex flex-col justify-between ${
                        category === cat.id
                          ? "bg-amber-900 text-white border-amber-950 shadow-md scale-[1.02]"
                          : "bg-white text-stone-700 border-stone-200 hover:bg-stone-50"
                      }`}
                    >
                      <span className="text-xl mb-1">{cat.icon}</span>
                      <span className="font-extrabold text-xs leading-tight">{cat.label}</span>
                      <span className={`text-[10px] mt-0.5 ${category === cat.id ? "text-amber-200" : "text-stone-400"}`}>
                        {cat.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-stone-700">Concepto / Motivo de la salida:</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Describe exactamente en qué se utilizó el dinero (ej. 2 escobas, 1 bolsa de jabón Roma y cloro para limpieza de charolas)..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-300 text-xs font-medium text-stone-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none resize-none"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !amount || !description.trim()}
                className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-black rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-900/20 transition-all active:scale-95"
              >
                <TrendingDown className="w-4 h-4" />
                <span>{isSubmitting ? "Registrando salida..." : `Registrar Salida de Dinero (${formatCurrency(Number(amount) || 0)})`}</span>
              </button>
            </form>
          ) : (
            /* Expenses List Tab */
            <div className="space-y-3">
              {expenses.length === 0 ? (
                <div className="text-center py-12 text-stone-400 space-y-2">
                  <span className="text-4xl">🧾</span>
                  <p className="font-bold text-sm text-stone-700">No hay gastos registrados en el turno</p>
                  <p className="text-xs text-stone-400">Todo el dinero cobrado en efectivo permanece intacto en caja.</p>
                </div>
              ) : (
                expenses.map((expense) => {
                  const catObj = CATEGORIES.find((c) => c.id === expense.category);
                  const isPersonal = expense.category === "retiro_personal";
                  return (
                    <div
                      key={expense.id}
                      className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                        isPersonal
                          ? "bg-amber-50/70 border-amber-200"
                          : "bg-stone-50 border-stone-200"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl p-2 bg-white rounded-xl border border-stone-200/80 shadow-sm shrink-0">
                          {catObj?.icon || "💸"}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs text-stone-900">
                              {catObj?.label || "Gasto"}
                            </span>
                            <span className="text-[10px] text-stone-400">• {expense.date}</span>
                          </div>
                          <p className="text-xs text-stone-700 font-medium mt-0.5 leading-relaxed">
                            {expense.description}
                          </p>
                          <p className="text-[10px] text-stone-500 font-bold mt-1">
                            Autorizó: <span className="text-stone-800">{expense.cashier}</span>
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-base font-black text-rose-600 block">
                          -{formatCurrency(expense.amount)}
                        </span>
                        <span className="text-[10px] font-mono text-stone-400 uppercase">
                          #{expense.id.slice(-6)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
