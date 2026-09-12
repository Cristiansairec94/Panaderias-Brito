"use client";

import { useState } from "react";
import { 
  Package, 
  Plus, 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Trash2, 
  History, 
  TrendingDown, 
  DollarSign, 
  Boxes,
  X,
  PlusCircle,
  FileCheck
} from "lucide-react";
import { InventoryItem, InventoryMovement } from "@/types";
import { formatCurrency, onlyNumbersKeyDown, cleanDecimalNumbers } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

const INITIAL_INVENTORY: InventoryItem[] = [
  { id: "1", name: "Harina de Trigo Extra Fina", unit: "bultos", currentStock: 8, minStock: 10, costPerUnit: 520, category: "harinas" },
  { id: "2", name: "Azúcar Estándar", unit: "bultos", currentStock: 14, minStock: 5, costPerUnit: 850, category: "azucares" },
  { id: "3", name: "Mantequilla Pura de Vaca", unit: "kg", currentStock: 4, minStock: 12, costPerUnit: 140, category: "grasas" },
  { id: "4", name: "Levadura Fresca", unit: "kg", currentStock: 15, minStock: 6, costPerUnit: 65, category: "harinas" },
  { id: "5", name: "Huevo Limpio", unit: "kg", currentStock: 45, minStock: 20, costPerUnit: 38, category: "lacteos" },
  { id: "6", name: "Manteca Vegetal Inca", unit: "kg", currentStock: 25, minStock: 10, costPerUnit: 55, category: "grasas" },
  { id: "7", name: "Leche Entera", unit: "litros", currentStock: 30, minStock: 15, costPerUnit: 24, category: "lacteos" },
  { id: "8", name: "Esencia de Vainilla", unit: "litros", currentStock: 5, minStock: 2, costPerUnit: 90, category: "esencias" },
  { id: "9", name: "Bolsas de Papel Kraft (Pan)", unit: "piezas", currentStock: 850, minStock: 300, costPerUnit: 0.85, category: "empaques" },
  { id: "10", name: "Domo para Pastel Grande", unit: "piezas", currentStock: 18, minStock: 25, costPerUnit: 18.00, category: "empaques" },
];

const INITIAL_MOVEMENTS: InventoryMovement[] = [
  { id: "mov-1", itemId: "1", itemName: "Harina de Trigo Extra Fina", type: "entrada_compra", quantity: 10, unit: "bultos", cost: 5200, reason: "Compra semanal a Harinera La Espiga", responsible: "Don Toño Brito", timestamp: "2026-09-01 10:30" },
  { id: "mov-2", itemId: "3", itemName: "Mantequilla Pura de Vaca", type: "merma_horno", quantity: 1.5, unit: "kg", cost: 210, reason: "Lote de cuernos pasado de horneado", responsible: "Maestro Juan", timestamp: "2026-09-01 13:15" },
  { id: "mov-3", itemId: "9", itemName: "Bolsas de Papel Kraft", type: "entrada_compra", quantity: 500, unit: "piezas", cost: 425, reason: "Resurtido de empaques para mostrador", responsible: "Lupita Brito", timestamp: "2026-08-31 16:00" },
];

export default function InventarioPage() {
  const { hasPermission } = useAuth();
  const canViewCosts = hasPermission("canViewProfitMargins");

  const [items, setItems] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [movements, setMovements] = useState<InventoryMovement[]>(INITIAL_MOVEMENTS);
  const [activeTab, setActiveTab] = useState<"catalogo" | "entrada" | "merma" | "historial">("catalogo");
  const [search, setSearch] = useState("");

  // Entry Form State
  const [selectedItemForEntry, setSelectedItemForEntry] = useState(items[0]?.id || "");
  const [entryQty, setEntryQty] = useState<string>("");
  const [entryCost, setEntryCost] = useState<string>("");
  const [entrySupplier, setEntrySupplier] = useState("");

  // Waste / Merma Form State
  const [selectedItemForWaste, setSelectedItemForWaste] = useState(items[0]?.id || "");
  const [wasteQty, setWasteQty] = useState<string>("");
  const [wasteType, setWasteType] = useState<"merma_horno" | "merma_mostrador">("merma_horno");
  const [wasteReason, setWasteReason] = useState("");

  const filtered = items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));

  const totalInventoryValue = items.reduce((sum, item) => sum + item.currentStock * item.costPerUnit, 0);
  const lowStockCount = items.filter((item) => item.currentStock <= item.minStock).length;

  const handleAddStock = (e: React.FormEvent) => {
    e.preventDefault();
    const targetItem = items.find((i) => i.id === selectedItemForEntry);
    if (!targetItem || !entryQty) return;

    const qtyNumber = Number(entryQty);
    const totalCostNumber = Number(entryCost) || qtyNumber * targetItem.costPerUnit;

    setItems((prev) =>
      prev.map((i) =>
        i.id === targetItem.id ? { ...i, currentStock: i.currentStock + qtyNumber } : i
      )
    );

    const newMov: InventoryMovement = {
      id: `mov-${Date.now()}`,
      itemId: targetItem.id,
      itemName: targetItem.name,
      type: "entrada_compra",
      quantity: qtyNumber,
      unit: targetItem.unit,
      cost: totalCostNumber,
      reason: entrySupplier ? `Compra: ${entrySupplier}` : "Entrada directa de almacén",
      responsible: "Don Toño Brito",
      timestamp: new Date().toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }),
    };

    setMovements((prev) => [newMov, ...prev]);
    setEntryQty("");
    setEntryCost("");
    setEntrySupplier("");
    setActiveTab("catalogo");
  };

  const handleRegisterWaste = (e: React.FormEvent) => {
    e.preventDefault();
    const targetItem = items.find((i) => i.id === selectedItemForWaste);
    if (!targetItem || !wasteQty) return;

    const qtyNumber = Number(wasteQty);

    setItems((prev) =>
      prev.map((i) =>
        i.id === targetItem.id ? { ...i, currentStock: Math.max(0, i.currentStock - qtyNumber) } : i
      )
    );

    const newMov: InventoryMovement = {
      id: `mov-${Date.now()}`,
      itemId: targetItem.id,
      itemName: targetItem.name,
      type: wasteType,
      quantity: qtyNumber,
      unit: targetItem.unit,
      cost: qtyNumber * targetItem.costPerUnit,
      reason: wasteReason || (wasteType === "merma_horno" ? "Merma en horneado" : "Pan duro de mostrador"),
      responsible: "Maestro Panadero Juan",
      timestamp: new Date().toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }),
    };

    setMovements((prev) => [newMov, ...prev]);
    setWasteQty("");
    setWasteReason("");
    setActiveTab("catalogo");
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-stone-900 tracking-tight">Inventario & Materia Prima</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Control de insumos, entradas por compras a proveedores, costos y mermas de panadería.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("entrada")}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-4 py-2.5 rounded-xl shadow-md text-xs transition-all active:scale-95"
          >
            <ArrowDownCircle className="w-4 h-4" /> + Entrada / Compra
          </button>
          <button
            onClick={() => setActiveTab("merma")}
            className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold px-4 py-2.5 rounded-xl shadow-md text-xs transition-all active:scale-95"
          >
            <TrendingDown className="w-4 h-4" /> - Registrar Merma
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500">Valor en Almacén</span>
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          {canViewCosts ? (
            <>
              <p className="text-2xl font-black text-stone-900">{formatCurrency(totalInventoryValue)}</p>
              <p className="text-[11px] text-stone-400 mt-0.5">Costo total de insumos</p>
            </>
          ) : (
            <>
              <p className="text-sm font-black text-amber-800 bg-amber-50 px-2 py-1 rounded-lg inline-block mt-1">
                🔒 Confidencial
              </p>
              <p className="text-[10px] text-stone-400 mt-1">Visible para Administración</p>
            </>
          )}
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500">Insumos Registrados</span>
            <div className="p-2 bg-stone-100 text-stone-700 rounded-xl">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-stone-900">{items.length} artículos</p>
          <p className="text-[11px] text-stone-400 mt-0.5">Harinas, grasas, empaques</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500">Alertas de Stock Bajo</span>
            <div className="p-2 bg-rose-100 text-rose-600 rounded-xl">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-600">{lowStockCount} artículos</p>
          <p className="text-[11px] text-rose-400 font-semibold mt-0.5">Requieren compra urgente</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500">Movimientos del Mes</span>
            <div className="p-2 bg-brito-orange-100 text-brito-orange-700 rounded-xl">
              <History className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-stone-900">{movements.length} registros</p>
          <p className="text-[11px] text-stone-400 mt-0.5">Entradas y mermas</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-stone-200 pb-2 text-xs font-bold">
        <button
          onClick={() => setActiveTab("catalogo")}
          className={`px-4 py-2 rounded-xl transition-all ${
            activeTab === "catalogo" ? "bg-stone-900 text-white shadow-sm" : "bg-white text-stone-600 hover:bg-stone-100"
          }`}
        >
          📦 Catálogo de Insumos ({items.length})
        </button>
        <button
          onClick={() => setActiveTab("entrada")}
          className={`px-4 py-2 rounded-xl transition-all ${
            activeTab === "entrada" ? "bg-emerald-600 text-white shadow-sm" : "bg-white text-stone-600 hover:bg-stone-100"
          }`}
        >
          ➕ Registrar Entrada / Compra
        </button>
        <button
          onClick={() => setActiveTab("merma")}
          className={`px-4 py-2 rounded-xl transition-all ${
            activeTab === "merma" ? "bg-rose-600 text-white shadow-sm" : "bg-white text-stone-600 hover:bg-stone-100"
          }`}
        >
          ⚠️ Registrar Merma / Baja
        </button>
        <button
          onClick={() => setActiveTab("historial")}
          className={`px-4 py-2 rounded-xl transition-all ${
            activeTab === "historial" ? "bg-brito-orange-600 text-white shadow-sm" : "bg-white text-stone-600 hover:bg-stone-100"
          }`}
        >
          📋 Historial de Movimientos ({movements.length})
        </button>
      </div>

      {/* Tab 1: Catalog */}
      {activeTab === "catalogo" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-stone-200/80 shadow-sm">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Buscar harina, mantequilla, bolsas..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-stone-50 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-brito-orange-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-500 font-extrabold border-b border-stone-200">
                <tr>
                  <th className="p-4">Insumo / Materia Prima</th>
                  <th className="p-4">Unidad</th>
                  <th className="p-4">Stock en Almacén</th>
                  <th className="p-4">Mínimo</th>
                  {canViewCosts && <th className="p-4">Costo Unitario</th>}
                  {canViewCosts && <th className="p-4">Valor Total</th>}
                  <th className="p-4">Semáforo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map((item) => {
                  const isLow = item.currentStock <= item.minStock;
                  return (
                    <tr key={item.id} className="hover:bg-amber-50/30 transition-colors">
                      <td className="p-4 font-bold text-stone-900 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-brito-orange-500" />
                        {item.name}
                      </td>
                      <td className="p-4 uppercase text-stone-500 font-semibold">{item.unit}</td>
                      <td className="p-4 font-black text-stone-900 text-sm">{item.currentStock} {item.unit}</td>
                      <td className="p-4 text-stone-500 font-medium">{item.minStock} {item.unit}</td>
                      {canViewCosts && (
                        <td className="p-4 font-semibold text-stone-700">{formatCurrency(item.costPerUnit)}</td>
                      )}
                      {canViewCosts && (
                        <td className="p-4 font-extrabold text-stone-900">
                          {formatCurrency(item.currentStock * item.costPerUnit)}
                        </td>
                      )}
                      <td className="p-4">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-100 text-rose-700">
                            <AlertTriangle className="w-3 h-3" /> Reordenar
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700">
                            <CheckCircle2 className="w-3 h-3" /> Suficiente
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Stock Entry Form */}
      {activeTab === "entrada" && (
        <div className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-sm max-w-2xl space-y-4 animate-in fade-in">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
              <ArrowDownCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-stone-900">Registrar Entrada / Compra de Insumos</h3>
              <p className="text-[11px] text-stone-500">Incrementa las existencias en almacén y registra el costo.</p>
            </div>
          </div>

          <form onSubmit={handleAddStock} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-stone-700">Seleccionar Insumo *</label>
              <select
                value={selectedItemForEntry}
                onChange={(e) => setSelectedItemForEntry(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 font-bold text-stone-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {items.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} (Stock actual: {i.currentStock} {i.unit})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-stone-700">Cantidad que Entra *</label>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  placeholder="Ej. 10"
                  value={entryQty}
                  onKeyDown={(e) => onlyNumbersKeyDown(e, true)}
                  onChange={(e) => setEntryQty(cleanDecimalNumbers(e.target.value))}
                  className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-stone-700">Costo Total de la Compra ($ MXN)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ej. 5200"
                  value={entryCost}
                  onKeyDown={(e) => onlyNumbersKeyDown(e, true)}
                  onChange={(e) => setEntryCost(cleanDecimalNumbers(e.target.value))}
                  className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-stone-700">Proveedor / Nota de Remisión</label>
              <input
                type="text"
                placeholder="Ej. Harinera La Espiga - Factura #9482"
                value={entrySupplier}
                onChange={(e) => setEntrySupplier(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-md transition-all active:scale-95"
            >
              Confirmar e Ingresar al Almacén
            </button>
          </form>
        </div>
      )}

      {/* Tab 3: Waste / Merma Form */}
      {activeTab === "merma" && (
        <div className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-sm max-w-2xl space-y-4 animate-in fade-in">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
            <div className="p-2 bg-rose-100 text-rose-600 rounded-xl">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-stone-900">Registrar Merma o Baja</h3>
              <p className="text-[11px] text-stone-500">Descuenta producto dañado en horno o pan no vendido de mostrador.</p>
            </div>
          </div>

          <form onSubmit={handleRegisterWaste} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-stone-700">Seleccionar Artículo / Insumo *</label>
              <select
                value={selectedItemForWaste}
                onChange={(e) => setSelectedItemForWaste(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 font-bold text-stone-900 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              >
                {items.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} (Stock actual: {i.currentStock} {i.unit})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-stone-700">Cantidad a Descontar *</label>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  placeholder="Ej. 2.5"
                  value={wasteQty}
                  onKeyDown={(e) => onlyNumbersKeyDown(e, true)}
                  onChange={(e) => setWasteQty(cleanDecimalNumbers(e.target.value))}
                  className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 font-bold text-rose-600 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-stone-700">Tipo de Merma</label>
                <select
                  value={wasteType}
                  onChange={(e) => setWasteType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 font-bold text-stone-900 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                >
                  <option value="merma_horno">Merma en Horno / Producción</option>
                  <option value="merma_mostrador">Merma de Mostrador (Pan Duro)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-stone-700">Motivo de la Merma</label>
              <input
                type="text"
                placeholder="Ej. Se quemó charola en horno 2 o pan frío no vendido"
                value={wasteReason}
                onChange={(e) => setWasteReason(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl shadow-md transition-all active:scale-95"
            >
              Registrar Merma y Ajustar Stock
            </button>
          </form>
        </div>
      )}

      {/* Tab 4: Movement History */}
      {activeTab === "historial" && (
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm overflow-hidden animate-in fade-in">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-500 font-extrabold border-b border-stone-200">
              <tr>
                <th className="p-4">Fecha & Hora</th>
                <th className="p-4">Insumo</th>
                <th className="p-4">Tipo</th>
                <th className="p-4">Cantidad</th>
                <th className="p-4">Costo Estimado</th>
                <th className="p-4">Motivo / Proveedor</th>
                <th className="p-4">Responsable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {movements.map((mov) => {
                const isEntry = mov.type === "entrada_compra";
                return (
                  <tr key={mov.id} className="hover:bg-stone-50/50">
                    <td className="p-4 text-stone-500 font-medium">{mov.timestamp}</td>
                    <td className="p-4 font-bold text-stone-900">{mov.itemName}</td>
                    <td className="p-4">
                      {isEntry ? (
                        <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-bold text-[10px] uppercase">
                          + Entrada
                        </span>
                      ) : (
                        <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded-md font-bold text-[10px] uppercase">
                          - Merma
                        </span>
                      )}
                    </td>
                    <td className="p-4 font-black text-stone-900">
                      {isEntry ? `+${mov.quantity}` : `-${mov.quantity}`} {mov.unit}
                    </td>
                    <td className="p-4 font-semibold text-stone-700">
                      {mov.cost ? formatCurrency(mov.cost) : "—"}
                    </td>
                    <td className="p-4 text-stone-600">{mov.reason}</td>
                    <td className="p-4 font-medium text-stone-500">{mov.responsible}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
