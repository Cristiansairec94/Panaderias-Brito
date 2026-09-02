"use client";

import { useState, useEffect } from "react";
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign, 
  Lock, 
  Receipt, 
  History, 
  Coins, 
  Calculator, 
  CheckCircle2, 
  AlertCircle, 
  UserCheck, 
  Plus, 
  Minus,
  X,
  CreditCard,
  Building
} from "lucide-react";
import { CashShift, CashMovement } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

const INITIAL_MOVEMENTS: CashMovement[] = [
  { id: "mov-1", shiftId: "shift-101", type: "entrada", category: "abono_cliente", categoryLabel: "Abono de Pedido", amount: 500, reason: "Anticipo Sra. María pastel XV años (PED-101)", authorizedBy: "Lupita Brito", timestamp: "08:45 AM" },
  { id: "mov-2", shiftId: "shift-101", type: "salida", category: "gasto_gas", categoryLabel: "Pago de Gas LP", amount: 450, reason: "Carga de tanque para hornos principales", authorizedBy: "Don Toño Brito", timestamp: "10:15 AM" },
  { id: "mov-3", shiftId: "shift-101", type: "salida", category: "compra_insumos", categoryLabel: "Insumo Urgente", amount: 120, reason: "Compra de 5 bolsas de hielo y servilletas en la esquina", authorizedBy: "Lupita Brito", timestamp: "12:30 PM" },
  { id: "mov-4", shiftId: "shift-101", type: "salida", category: "retiro_dueno", categoryLabel: "Retiro Don Toño", amount: 1000, reason: "Retiro parcial de efectivo por seguridad", authorizedBy: "Don Toño Brito", timestamp: "02:00 PM" },
];

export default function CajaPage() {
  const { user } = useAuth();
  const [movements, setMovements] = useState<CashMovement[]>(INITIAL_MOVEMENTS);

  // Cash shift stats
  const [initialCash] = useState(1000); // Fondo inicial
  const [cashSales] = useState(4150);
  const [cardSales] = useState(700);
  const [transferSales] = useState(350);

  // Modals
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [movementType, setMovementType] = useState<"entrada" | "salida">("salida");
  const [movCategory, setMovCategory] = useState<CashMovement["category"]>("compra_insumos");
  const [movAmount, setMovAmount] = useState<string>("");
  const [movReason, setMovReason] = useState("");

  const [isCorteModalOpen, setIsCorteModalOpen] = useState(false);
  const [countedCash, setCountedCash] = useState<string>("");
  const [corteSuccess, setCorteSuccess] = useState(false);

  // Read URL query params (?tab=entradas o ?tab=salidas)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab === "entradas") {
        setMovementType("entrada");
        setMovCategory("abono_cliente");
        setIsMovementModalOpen(true);
      } else if (tab === "salidas") {
        setMovementType("salida");
        setMovCategory("compra_insumos");
        setIsMovementModalOpen(true);
      }
    }
  }, []);

  // Calculations
  const totalEntries = movements.filter((m) => m.type === "entrada").reduce((sum, m) => sum + m.amount, 0);
  const totalExpenses = movements.filter((m) => m.type === "salida").reduce((sum, m) => sum + m.amount, 0);

  const expectedCashInDrawer = initialCash + cashSales + totalEntries - totalExpenses;
  const actualCount = Number(countedCash) || 0;
  const cashDifference = actualCount - expectedCashInDrawer;

  const handleCreateMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!movAmount) return;

    const labels: Record<CashMovement["category"], string> = {
      gasto_gas: "Pago de Gas LP",
      compra_insumos: "Compra de Insumos",
      pago_proveedor: "Pago a Proveedor",
      retiro_dueno: "Retiro de Don Toño",
      abono_cliente: "Abono de Cliente",
      otro: "Otro Movimiento",
    };

    const newMov: CashMovement = {
      id: `mov-${Date.now()}`,
      shiftId: "shift-101",
      type: movementType,
      category: movCategory,
      categoryLabel: labels[movCategory],
      amount: Number(movAmount),
      reason: movReason || "Sin descripción",
      authorizedBy: user?.name || "Don Toño Brito",
      timestamp: new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
    };

    setMovements((prev) => [newMov, ...prev]);
    setIsMovementModalOpen(false);
    setMovAmount("");
    setMovReason("");
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-stone-900 tracking-tight">Caja & Flujo de Dinero</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Control de turno actual, gastos menores, abonos y arqueo de caja de Don Toño.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setMovementType("entrada");
              setMovCategory("abono_cliente");
              setIsMovementModalOpen(true);
            }}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-4 py-2.5 rounded-xl shadow-md text-xs transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" /> + Entrada de Efectivo
          </button>
          <button
            onClick={() => {
              setMovementType("salida");
              setMovCategory("compra_insumos");
              setIsMovementModalOpen(true);
            }}
            className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold px-4 py-2.5 rounded-xl shadow-md text-xs transition-all active:scale-95"
          >
            <Minus className="w-4 h-4" /> - Registrar Gasto / Retiro
          </button>
          <button
            onClick={() => setIsCorteModalOpen(true)}
            className="flex items-center gap-1.5 bg-stone-900 hover:bg-black text-white font-extrabold px-4 py-2.5 rounded-xl shadow-md text-xs transition-all active:scale-95"
          >
            <Lock className="w-4 h-4 text-brito-orange-400" /> Realizar Corte de Caja
          </button>
        </div>
      </div>

      {/* Live Shift Box Status */}
      <div className="bg-gradient-to-br from-stone-900 via-stone-850 to-stone-950 rounded-3xl p-6 text-white shadow-2xl border border-stone-800 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-brito-orange-600 text-white rounded-2xl shadow-lg shadow-brito-orange-600/30">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-tight">Turno Actual: Turno Matutino</h3>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase">
                  Caja Abierta
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                Encargada: <strong className="text-stone-200">Lupita Brito</strong> • Apertura: 06:00 AM con {formatCurrency(initialCash)} de fondo
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
              Efectivo Esperado en Caja:
            </span>
            <span className="text-3xl font-black text-emerald-400 tracking-tight">
              {formatCurrency(expectedCashInDrawer)}
            </span>
          </div>
        </div>

        {/* Breakdown Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-xs">
          <div className="bg-stone-850/80 p-3.5 rounded-2xl border border-stone-800">
            <span className="text-stone-400 text-[10px] font-bold block">Fondo Inicial:</span>
            <span className="text-base font-bold text-stone-200">{formatCurrency(initialCash)}</span>
          </div>
          <div className="bg-stone-850/80 p-3.5 rounded-2xl border border-stone-800">
            <span className="text-stone-400 text-[10px] font-bold block">Ventas Efectivo:</span>
            <span className="text-base font-bold text-emerald-400">+{formatCurrency(cashSales)}</span>
          </div>
          <div className="bg-stone-850/80 p-3.5 rounded-2xl border border-stone-800">
            <span className="text-stone-400 text-[10px] font-bold block">Otras Entradas:</span>
            <span className="text-base font-bold text-emerald-400">+{formatCurrency(totalEntries)}</span>
          </div>
          <div className="bg-stone-850/80 p-3.5 rounded-2xl border border-stone-800">
            <span className="text-stone-400 text-[10px] font-bold block">Gastos / Retiros:</span>
            <span className="text-base font-bold text-rose-400">-{formatCurrency(totalExpenses)}</span>
          </div>
          <div className="bg-stone-850/80 p-3.5 rounded-2xl border border-stone-800">
            <span className="text-stone-400 text-[10px] font-bold block">Cobros Tarjeta:</span>
            <span className="text-base font-bold text-blue-400">{formatCurrency(cardSales)}</span>
          </div>
          <div className="bg-stone-850/80 p-3.5 rounded-2xl border border-stone-800">
            <span className="text-stone-400 text-[10px] font-bold block">Transferencias:</span>
            <span className="text-base font-bold text-purple-400">{formatCurrency(transferSales)}</span>
          </div>
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-white rounded-3xl border border-stone-200/80 shadow-sm overflow-hidden space-y-3 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-brito-orange-600" />
            <h3 className="font-black text-base text-stone-900">Movimientos de Efectivo del Turno</h3>
          </div>
          <span className="text-xs text-stone-500 font-semibold">{movements.length} movimientos registrados</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-500 font-extrabold border-b border-stone-200">
              <tr>
                <th className="p-3.5">Hora</th>
                <th className="p-3.5">Tipo</th>
                <th className="p-3.5">Categoría</th>
                <th className="p-3.5">Monto</th>
                <th className="p-3.5">Motivo / Detalle</th>
                <th className="p-3.5">Autorizado Por</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {movements.map((m) => {
                const isEntry = m.type === "entrada";
                return (
                  <tr key={m.id} className="hover:bg-stone-50/50">
                    <td className="p-3.5 font-bold text-stone-500">{m.timestamp}</td>
                    <td className="p-3.5">
                      {isEntry ? (
                        <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md text-[10px] uppercase flex items-center gap-1 w-fit">
                          <ArrowUpRight className="w-3 h-3" /> Entrada
                        </span>
                      ) : (
                        <span className="bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-md text-[10px] uppercase flex items-center gap-1 w-fit">
                          <ArrowDownRight className="w-3 h-3" /> Salida
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 font-bold text-stone-900">{m.categoryLabel}</td>
                    <td className={`p-3.5 font-black text-sm ${isEntry ? "text-emerald-600" : "text-rose-600"}`}>
                      {isEntry ? `+${formatCurrency(m.amount)}` : `-${formatCurrency(m.amount)}`}
                    </td>
                    <td className="p-3.5 text-stone-600">{m.reason}</td>
                    <td className="p-3.5 font-medium text-stone-500">{m.authorizedBy}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Movement Modal */}
      {isMovementModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-stone-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${movementType === "entrada" ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"}`}>
                  <DollarSign className="w-5 h-5" />
                </div>
                <h3 className="font-black text-base text-stone-900">
                  {movementType === "entrada" ? "Registrar Entrada de Dinero" : "Registrar Salida / Gasto de Caja"}
                </h3>
              </div>
              <button onClick={() => setIsMovementModalOpen(false)} className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMovement} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-stone-700">Monto ($ MXN) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="Ej. 250"
                  value={movAmount}
                  onChange={(e) => setMovAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 text-base font-black text-stone-900 focus:ring-2 focus:ring-brito-orange-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700">Categoría</label>
                <select
                  value={movCategory}
                  onChange={(e) => setMovCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 font-bold text-stone-900 focus:ring-2 focus:ring-brito-orange-500 focus:outline-none"
                >
                  {movementType === "entrada" ? (
                    <>
                      <option value="abono_cliente">Abono de Pedido Especial</option>
                      <option value="otro">Aportación de Cambio / Otro</option>
                    </>
                  ) : (
                    <>
                      <option value="compra_insumos">Compra de Insumos Menores (Hielo, empaques)</option>
                      <option value="gasto_gas">Pago de Gas LP / Servicios</option>
                      <option value="pago_proveedor">Pago a Proveedor en Efectivo</option>
                      <option value="retiro_dueno">Retiro Parcial Don Toño</option>
                      <option value="otro">Otro Gasto</option>
                    </>
                  )}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700">Motivo / Detalle *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Se pagó garrafón de agua o abono pastel..."
                  value={movReason}
                  onChange={(e) => setMovReason(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 focus:ring-2 focus:ring-brito-orange-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsMovementModalOpen(false)}
                  className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-2.5 text-white font-extrabold rounded-xl shadow-md transition-all active:scale-95 ${
                    movementType === "entrada" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  Guardar Movimiento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Corte de Caja Modal */}
      {isCorteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 border border-stone-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-stone-900 text-white rounded-xl">
                  <Calculator className="w-5 h-5 text-brito-orange-400" />
                </div>
                <div>
                  <h3 className="font-black text-base text-stone-900">Arqueo y Corte de Caja</h3>
                  <p className="text-[11px] text-stone-500">Cierre de turno y entrega a Don Toño.</p>
                </div>
              </div>
              <button onClick={() => setIsCorteModalOpen(false)} className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-2">
                <div className="flex justify-between">
                  <span>Fondo Inicial:</span>
                  <span className="font-bold">{formatCurrency(initialCash)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ventas en Efectivo:</span>
                  <span className="font-bold text-emerald-600">+{formatCurrency(cashSales)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Otras Entradas:</span>
                  <span className="font-bold text-emerald-600">+{formatCurrency(totalEntries)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Gastos y Retiros:</span>
                  <span className="font-bold text-rose-600">-{formatCurrency(totalExpenses)}</span>
                </div>
                <div className="flex justify-between text-sm font-black border-t border-stone-200 pt-2 text-stone-900">
                  <span>Efectivo Esperado:</span>
                  <span className="text-brito-orange-700">{formatCurrency(expectedCashInDrawer)}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-stone-800">Efectivo Físico Contado en Caja ($ MXN) *</label>
                <input
                  type="number"
                  step="1"
                  placeholder="Total de billetes y monedas en el cajón"
                  value={countedCash}
                  onChange={(e) => setCountedCash(e.target.value)}
                  className="w-full px-4 py-3 bg-white rounded-xl border-2 border-stone-300 text-lg font-black text-stone-900 focus:ring-2 focus:ring-brito-orange-500 focus:border-brito-orange-500 focus:outline-none"
                />
              </div>

              {countedCash !== "" && (
                <div
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between ${
                    cashDifference === 0
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : cashDifference > 0
                      ? "bg-blue-50 text-blue-800 border-blue-200"
                      : "bg-rose-50 text-rose-800 border-rose-200"
                  }`}
                >
                  <span>Diferencia de Arqueo:</span>
                  <span className="text-sm font-black">
                    {cashDifference === 0
                      ? "Caja Exacta ($0.00)"
                      : cashDifference > 0
                      ? `Sobrante: +${formatCurrency(cashDifference)}`
                      : `Faltante: ${formatCurrency(cashDifference)}`}
                  </span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCorteModalOpen(false)}
                  className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    alert("¡Corte de caja registrado con éxito y enviado al resumen!");
                    setIsCorteModalOpen(false);
                  }}
                  className="flex-1 py-2.5 bg-stone-900 hover:bg-black text-white font-extrabold rounded-xl shadow-md transition-all active:scale-95"
                >
                  Confirmar y Cerrar Turno
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
