"use client";

import React, { useState, useMemo } from "react";
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign, 
  Plus, 
  Minus, 
  X, 
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  Receipt, 
  Store, 
  Building2, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Flame, 
  ShoppingBag, 
  Filter, 
  Calendar,
  Lock,
  PieChart
} from "lucide-react";
import { Branch, BranchCashMovement } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface CashFlowPanelProps {
  branches: Branch[];
  currentBranch: Branch | null;
  isAllBranches: boolean;
  onSwitchBranch: (branchId: string | "all") => void;
  cashMovements: BranchCashMovement[];
  onAddCashMovement: (
    branchId: string,
    movement: {
      type: "entrada" | "salida";
      category: BranchCashMovement["category"];
      categoryLabel: string;
      amount: number;
      reason: string;
      authorizedBy: string;
    }
  ) => void;
  onAdvanceShift?: (branchId: string) => void;
}

export default function CashFlowPanel({
  branches,
  currentBranch,
  isAllBranches,
  onSwitchBranch,
  cashMovements,
  onAddCashMovement,
  onAdvanceShift,
}: CashFlowPanelProps) {
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalBranchId, setModalBranchId] = useState<string>(branches[0]?.id || "branch-matriz");
  const [modalType, setModalType] = useState<"entrada" | "salida">("salida");
  const [modalCategory, setModalCategory] = useState<BranchCashMovement["category"]>("gasto_gas");
  const [modalAmount, setModalAmount] = useState<string>("");
  const [modalReason, setModalReason] = useState<string>("");
  const [modalAuthBy, setModalAuthBy] = useState<string>("Don Toño Brito");

  // Filters state
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "entrada" | "salida">("all");

  // Cash flow aggregates
  const flowTotals = useMemo(() => {
    // Entries: Cash sales from active shifts + cash movement entries
    const totalCashSales = branches.reduce((sum, b) => sum + (b.currentShift?.cashSales || 0), 0);
    const totalCardSales = branches.reduce((sum, b) => sum + (b.currentShift?.cardSales || 0), 0);
    const totalTransferSales = branches.reduce((sum, b) => sum + (b.currentShift?.transferSales || 0), 0);
    const totalElectronicMoney = totalCardSales + totalTransferSales;

    // Entries and Exits from cashMovements
    const totalExtraInflow = cashMovements
      .filter((m) => m.type === "entrada")
      .reduce((sum, m) => sum + m.amount, 0);

    const totalOutflow = cashMovements
      .filter((m) => m.type === "salida")
      .reduce((sum, m) => sum + m.amount, 0);

    const totalInflow = totalCashSales + totalExtraInflow;
    const netCashFlow = totalInflow - totalOutflow;
    const totalCashInDrawers = branches.reduce((sum, b) => sum + b.cashInDrawer, 0);
    const totalInitialFunds = branches.reduce((sum, b) => sum + (b.currentShift?.initialFund || 0), 0);

    return {
      totalCashSales,
      totalCardSales,
      totalTransferSales,
      totalElectronicMoney,
      totalExtraInflow,
      totalInflow,
      totalOutflow,
      netCashFlow,
      totalCashInDrawers,
      totalInitialFunds,
    };
  }, [branches, cashMovements]);

  // Filtered movements
  const filteredMovements = useMemo(() => {
    return cashMovements.filter((m) => {
      const matchBranch = branchFilter === "all" || m.branchId === branchFilter;
      const matchType = typeFilter === "all" || m.type === typeFilter;
      return matchBranch && matchType;
    });
  }, [cashMovements, branchFilter, typeFilter]);

  // Categories helper
  const categoryOptions = {
    salida: [
      { key: "gasto_gas", label: "Pago de Gas LP para Hornos" },
      { key: "compra_insumos", label: "Compra Insumo Urgente (Harina/Levadura/Bolsas)" },
      { key: "pago_proveedor", label: "Pago a Proveedor Mostrador" },
      { key: "retiro_seguridad", label: "Retiro de Efectivo / Seguridad (Don Toño)" },
      { key: "otro", label: "Otro Gasto Operativo" },
    ],
    entrada: [
      { key: "abono_cliente", label: "Anticipo / Abono de Pedido Especial" },
      { key: "otro", label: "Aporte Extra de Fondo de Caja" },
    ],
  };

  const handleOpenModal = (presetBranchId?: string, presetType?: "entrada" | "salida", presetCat?: BranchCashMovement["category"]) => {
    if (presetBranchId) setModalBranchId(presetBranchId);
    if (presetType) {
      setModalType(presetType);
      setModalCategory(presetCat || (presetType === "salida" ? "gasto_gas" : "abono_cliente"));
    }
    setModalAmount("");
    setModalReason("");
    setIsModalOpen(true);
  };

  const handleSubmitMovement = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(modalAmount);
    if (!numAmount || numAmount <= 0) return;

    const catObj = [...categoryOptions.salida, ...categoryOptions.entrada].find(
      (c) => c.key === modalCategory
    );
    const categoryLabel = catObj ? catObj.label : "Movimiento de Caja";

    onAddCashMovement(modalBranchId, {
      type: modalType,
      category: modalCategory,
      categoryLabel,
      amount: numAmount,
      reason: modalReason.trim() || (modalType === "salida" ? "Gasto operativo" : "Ingreso adicional"),
      authorizedBy: modalAuthBy || "Don Toño Brito",
    });

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Register Action */}
      <div className="bg-gradient-to-r from-emerald-950 via-stone-900 to-stone-950 rounded-3xl p-6 text-white border border-emerald-900/40 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">
            <Wallet className="w-3.5 h-3.5" />
            Flujo de Dinero & Arqueo en Tiempo Real
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Control de Efectivo, Entradas y Egresos en Tienda
          </h2>
          <p className="text-xs text-stone-300 max-w-2xl leading-relaxed">
            Supervisa el dinero físico en las gavetas de cada sucursal, los ingresos de ventas de mostrador y los egresos cotidianos (gas para hornos, insumos urgentes y retiros de seguridad).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => handleOpenModal(undefined, "salida", "gasto_gas")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-lg shadow-rose-600/30 transition-all active:scale-95"
          >
            <Minus className="w-4 h-4" />
            <span>- Registrar Gasto / Salida</span>
          </button>

          <button
            onClick={() => handleOpenModal(undefined, "entrada", "abono_cliente")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Registrar Entrada / Abono</span>
          </button>
        </div>
      </div>

      {/* Main KPI Flow Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Inflow */}
        <div className="bg-white rounded-3xl border border-stone-200/90 p-5 shadow-sm space-y-2 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 flex items-center gap-1.5">
              <ArrowUpRight className="w-4 h-4 text-emerald-600" />
              Entradas de Efectivo
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              Ventas + Abonos
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight">
            +{formatCurrency(flowTotals.totalInflow)}
          </p>
          <div className="text-[11px] text-stone-400 space-y-0.5 pt-1 border-t border-stone-100">
            <p>Ventas efectivo: <strong className="text-stone-700">{formatCurrency(flowTotals.totalCashSales)}</strong></p>
            <p>Abonos/Anticipos: <strong className="text-stone-700">{formatCurrency(flowTotals.totalExtraInflow)}</strong></p>
          </div>
        </div>

        {/* Card 2: Total Outflow */}
        <div className="bg-white rounded-3xl border border-stone-200/90 p-5 shadow-sm space-y-2 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 flex items-center gap-1.5">
              <ArrowDownRight className="w-4 h-4 text-rose-600" />
              Egresos en Tienda
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
              Gastos & Retiros
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-rose-600 tracking-tight">
            -{formatCurrency(flowTotals.totalOutflow)}
          </p>
          <div className="text-[11px] text-stone-400 space-y-0.5 pt-1 border-t border-stone-100">
            <p>Gas LP, insumos y compras menores de mostrador</p>
            <p>Retiros de seguridad Don Toño</p>
          </div>
        </div>

        {/* Card 3: Net Cash Flow */}
        <div className="bg-white rounded-3xl border border-stone-200/90 p-5 shadow-sm space-y-2 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Flujo Neto del Día
            </span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
              flowTotals.netCashFlow >= 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
            }`}>
              {flowTotals.netCashFlow >= 0 ? "Superávit" : "Déficit"}
            </span>
          </div>
          <p className={`text-2xl sm:text-3xl font-black tracking-tight ${
            flowTotals.netCashFlow >= 0 ? "text-stone-900" : "text-rose-600"
          }`}>
            {formatCurrency(flowTotals.netCashFlow)}
          </p>
          <div className="text-[11px] text-stone-400 pt-1 border-t border-stone-100">
            <p>Entradas netas menos egresos en caja física</p>
          </div>
        </div>

        {/* Card 4: Total Cash in Drawers */}
        <div className="bg-gradient-to-br from-stone-900 to-stone-850 rounded-3xl p-5 text-white shadow-md space-y-2 border border-stone-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-300 flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-emerald-400" />
              Efectivo en Gavetas
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Arqueo en Vivo
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {formatCurrency(flowTotals.totalCashInDrawers)}
          </p>
          <div className="text-[11px] text-stone-300 space-y-0.5 pt-1 border-t border-stone-800">
            <p>Fondos iniciales: <strong className="text-white">{formatCurrency(flowTotals.totalInitialFunds)}</strong></p>
            <p>Bancos (Tarjetas/SPEI): <strong className="text-emerald-300">{formatCurrency(flowTotals.totalElectronicMoney)}</strong></p>
          </div>
        </div>
      </div>

      {/* Per-Branch Cash Flow Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {branches.map((b) => {
          const bMovements = cashMovements.filter((m) => m.branchId === b.id);
          const bInflow = b.currentShift.cashSales + bMovements.filter((m) => m.type === "entrada").reduce((sum, m) => sum + m.amount, 0);
          const bOutflow = bMovements.filter((m) => m.type === "salida").reduce((sum, m) => sum + m.amount, 0);
          const bNet = bInflow - bOutflow;

          return (
            <div
              key={b.id}
              className="bg-white rounded-3xl border border-stone-200/90 p-5 shadow-sm hover:shadow-md transition-all space-y-4"
            >
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-2xl flex items-center justify-center font-black text-white shrink-0 shadow-sm ${
                    b.id === "branch-matriz" ? "bg-orange-600" :
                    b.id === "branch-benito" ? "bg-rose-600" : "bg-amber-600"
                  }`}>
                    <Store className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-black text-stone-900 text-sm">{b.name}</h4>
                    <p className="text-[11px] text-stone-500 font-mono">{b.code} • {b.currentShift.cashier}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenModal(b.id, "salida")}
                  className="p-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold transition-all active:scale-95"
                  title="Registrar movimiento en esta tienda"
                >
                  <Plus className="w-4 h-4 text-orange-600" />
                </button>
              </div>

              {/* Cash in Drawer Primary Indicator */}
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/70 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-stone-500 block">Disponible en Gaveta</span>
                  <span className="text-xl font-black text-emerald-800">
                    {formatCurrency(b.cashInDrawer)}
                  </span>
                </div>
                <div className="text-right text-[11px] text-stone-500">
                  <span>Fondo base: <strong>{formatCurrency(b.currentShift.initialFund)}</strong></span>
                </div>
              </div>

              {/* Flow Distribution Bar */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-stone-600 font-medium">Entradas Efectivo:</span>
                  <span className="font-bold text-emerald-700">+{formatCurrency(bInflow)}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-stone-600 font-medium">Egresos del Turno:</span>
                  <span className="font-bold text-rose-600">-{formatCurrency(bOutflow)}</span>
                </div>
                <div className="flex justify-between items-center text-[11px] pt-1 border-t border-stone-100">
                  <span className="text-stone-800 font-bold">Flujo Neto en Tienda:</span>
                  <span className={`font-black ${bNet >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                    {formatCurrency(bNet)}
                  </span>
                </div>
              </div>

              {/* Payment Method Breakdown Pills */}
              <div className="pt-2 border-t border-stone-100 grid grid-cols-3 gap-1.5 text-center text-[10px]">
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-800 font-bold border border-emerald-100">
                  <p className="text-[9px] uppercase font-semibold">Efectivo</p>
                  <p>{formatCurrency(b.currentShift.cashSales)}</p>
                </div>
                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-800 font-bold border border-blue-100">
                  <p className="text-[9px] uppercase font-semibold">Tarjeta</p>
                  <p>{formatCurrency(b.currentShift.cardSales)}</p>
                </div>
                <div className="p-1.5 rounded-lg bg-purple-50 text-purple-800 font-bold border border-purple-100">
                  <p className="text-[9px] uppercase font-semibold">Transfer</p>
                  <p>{formatCurrency(b.currentShift.transferSales)}</p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => handleOpenModal(b.id, "salida")}
                  className="flex-1 py-1.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition-colors"
                >
                  - Gasto
                </button>
                <button
                  onClick={() => handleOpenModal(b.id, "entrada")}
                  className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs border border-emerald-200 transition-colors"
                >
                  + Abono
                </button>
                {onAdvanceShift && (
                  <button
                    onClick={() => onAdvanceShift(b.id)}
                    className="py-1.5 px-3 rounded-xl bg-stone-900 hover:bg-black text-white font-bold text-xs transition-colors"
                    title="Corte de Turno"
                  >
                    Corte
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Cash Flow Movements Table */}
      <div className="bg-white rounded-3xl border border-stone-200/90 shadow-lg overflow-hidden">
        {/* Table Header with Filters */}
        <div className="p-6 border-b border-stone-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-stone-50/50">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-black text-stone-900">
                  Historial de Movimientos de Dinero & Caja
                </h3>
                <p className="text-xs text-stone-500">
                  Registro cronológico de entradas extraordinarias, pagos de insumos y retiros de efectivo
                </p>
              </div>
            </div>
          </div>

          {/* Filter pills */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter by Branch */}
            <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-stone-200 text-xs">
              <span className="text-stone-400 font-bold px-1 text-[11px]">Tienda:</span>
              <button
                onClick={() => setBranchFilter("all")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  branchFilter === "all" ? "bg-stone-900 text-white" : "text-stone-600 hover:text-stone-900"
                }`}
              >
                Todas
              </button>
              {branches.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setBranchFilter(b.id)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    branchFilter === b.id ? "bg-stone-900 text-white" : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  {b.shortName}
                </button>
              ))}
            </div>

            {/* Filter by Type */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-stone-200 text-xs">
              <button
                onClick={() => setTypeFilter("all")}
                className={`px-2.5 py-1 rounded-lg font-bold ${
                  typeFilter === "all" ? "bg-stone-900 text-white" : "text-stone-600"
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setTypeFilter("entrada")}
                className={`px-2.5 py-1 rounded-lg font-bold ${
                  typeFilter === "entrada" ? "bg-emerald-600 text-white" : "text-stone-600"
                }`}
              >
                Entradas
              </button>
              <button
                onClick={() => setTypeFilter("salida")}
                className={`px-2.5 py-1 rounded-lg font-bold ${
                  typeFilter === "salida" ? "bg-rose-600 text-white" : "text-stone-600"
                }`}
              >
                Salidas
              </button>
            </div>
          </div>
        </div>

        {/* Movements Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-100/60 text-stone-600 uppercase tracking-wider font-extrabold text-[10px]">
                <th className="py-3 px-4">Hora</th>
                <th className="py-3 px-4">Sucursal</th>
                <th className="py-3 px-4">Tipo & Categoría</th>
                <th className="py-3 px-4">Concepto / Motivo</th>
                <th className="py-3 px-4">Autorizado por</th>
                <th className="py-3 px-4 text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-stone-400">
                    No hay movimientos registrados para este filtro.
                  </td>
                </tr>
              ) : (
                filteredMovements.map((m) => {
                  const isEntrada = m.type === "entrada";
                  return (
                    <tr key={m.id} className="hover:bg-stone-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-stone-500 font-bold">
                        {m.timestamp}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-stone-900">
                        {m.branchName}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full border ${
                          isEntrada
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}>
                          {isEntrada ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {m.categoryLabel}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-stone-600 max-w-xs truncate" title={m.reason}>
                        {m.reason}
                      </td>
                      <td className="py-3.5 px-4 text-stone-500 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-stone-400" />
                        {m.authorizedBy}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-sm">
                        <span className={isEntrada ? "text-emerald-700" : "text-rose-600"}>
                          {isEntrada ? "+" : "-"}{formatCurrency(m.amount)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Registrar Movimiento de Flujo */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-white ${
                  modalType === "entrada" ? "bg-emerald-600" : "bg-rose-600"
                }`}>
                  {modalType === "entrada" ? <Plus className="w-5 h-5" /> : <Minus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900">
                    {modalType === "entrada" ? "Registrar Entrada de Efectivo" : "Registrar Salida / Gasto"}
                  </h3>
                  <p className="text-xs text-stone-500">
                    Afecta inmediatamente la gaveta de la sucursal
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-stone-200 text-stone-400 hover:text-stone-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitMovement} className="p-6 space-y-4 text-xs">
              {/* Type Switcher */}
              <div>
                <label className="font-bold text-stone-700 block mb-1.5">Tipo de Movimiento</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setModalType("salida");
                      setModalCategory("gasto_gas");
                    }}
                    className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 border transition-all ${
                      modalType === "salida"
                        ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                        : "bg-white text-stone-600 border-stone-200"
                    }`}
                  >
                    <Minus className="w-3.5 h-3.5" /> Salida / Gasto
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setModalType("entrada");
                      setModalCategory("abono_cliente");
                    }}
                    className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 border transition-all ${
                      modalType === "entrada"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-white text-stone-600 border-stone-200"
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" /> Entrada / Abono
                  </button>
                </div>
              </div>

              {/* Branch Selector */}
              <div>
                <label className="font-bold text-stone-700 block mb-1.5">Sucursal Destino</label>
                <select
                  value={modalBranchId}
                  onChange={(e) => setModalBranchId(e.target.value)}
                  className="w-full px-3 py-2 bg-white rounded-xl border border-stone-300 font-bold text-stone-800 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code}) - Gaveta: {formatCurrency(b.cashInDrawer)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category Selector */}
              <div>
                <label className="font-bold text-stone-700 block mb-1.5">Categoría</label>
                <select
                  value={modalCategory}
                  onChange={(e) => setModalCategory(e.target.value as BranchCashMovement["category"])}
                  className="w-full px-3 py-2 bg-white rounded-xl border border-stone-300 font-bold text-stone-800 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                >
                  {(modalType === "salida" ? categoryOptions.salida : categoryOptions.entrada).map((cat) => (
                    <option key={cat.key} value={cat.key}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount Input */}
              <div>
                <label className="font-bold text-stone-700 block mb-1.5">Monto ($ MXN)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-stone-400 font-black text-sm">$</span>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    placeholder="0.00"
                    required
                    value={modalAmount}
                    onChange={(e) => setModalAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 bg-white rounded-xl border border-stone-300 font-mono font-black text-stone-900 text-base focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Reason / Concept */}
              <div>
                <label className="font-bold text-stone-700 block mb-1.5">Concepto o Justificación</label>
                <input
                  type="text"
                  placeholder="Ej. Carga de tanque de gas, 5 bolsas kraft, anticipo pedido pastel..."
                  value={modalReason}
                  onChange={(e) => setModalReason(e.target.value)}
                  className="w-full px-3 py-2 bg-white rounded-xl border border-stone-300 text-stone-800 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              {/* Authorized By */}
              <div>
                <label className="font-bold text-stone-700 block mb-1.5">Autorizado Por</label>
                <input
                  type="text"
                  value={modalAuthBy}
                  onChange={(e) => setModalAuthBy(e.target.value)}
                  className="w-full px-3 py-2 bg-white rounded-xl border border-stone-300 text-stone-800 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 flex items-center gap-2 justify-end border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2.5 rounded-xl text-white font-black text-xs shadow-md transition-all active:scale-95 ${
                    modalType === "entrada" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-rose-600 hover:bg-rose-500"
                  }`}
                >
                  Guardar Movimiento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
