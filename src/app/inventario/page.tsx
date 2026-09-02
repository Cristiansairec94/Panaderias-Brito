"use client";

import { useState } from "react";
import { Package, Plus, AlertTriangle, CheckCircle2, Search, ArrowDownCircle } from "lucide-react";
import { InventoryItem } from "@/types";
import { formatCurrency } from "@/lib/utils";

const INITIAL_INVENTORY: InventoryItem[] = [
  { id: "1", name: "Harina de Trigo Extra Fina", unit: "bultos", currentStock: 8, minStock: 10, costPerUnit: 520 },
  { id: "2", name: "Azúcar Estándar", unit: "bultos", currentStock: 14, minStock: 5, costPerUnit: 850 },
  { id: "3", name: "Mantequilla Pura de Vaca", unit: "kg", currentStock: 4, minStock: 12, costPerUnit: 140 },
  { id: "4", name: "Levadura Fresca", unit: "kg", currentStock: 15, minStock: 6, costPerUnit: 65 },
  { id: "5", name: "Huevo Limpio", unit: "kg", currentStock: 45, minStock: 20, costPerUnit: 38 },
  { id: "6", name: "Manteca Vegetal Inca", unit: "kg", currentStock: 25, minStock: 10, costPerUnit: 55 },
  { id: "7", name: "Leche Entera", unit: "litros", currentStock: 30, minStock: 15, costPerUnit: 24 },
  { id: "8", name: "Esencia de Vainilla", unit: "litros", currentStock: 5, minStock: 2, costPerUnit: 90 },
];

export default function InventarioPage() {
  const [items, setItems] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [search, setSearch] = useState("");

  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-stone-900">Inventario de Insumos & Materia Prima</h2>
          <p className="text-xs text-stone-500 mt-1">Control de ingredientes para producción y alertas de resurtido.</p>
        </div>
        <button className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-md transition-all text-xs">
          <Plus className="w-4 h-4" /> Registrar Entrada de Insumos
        </button>
      </div>

      {/* Filter / Search */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Buscar insumo (harina, mantequilla, huevo)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-stone-50 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-stone-50 text-stone-500 font-semibold border-b border-stone-200">
            <tr>
              <th className="p-4">Insumo / Ingrediente</th>
              <th className="p-4">Unidad</th>
              <th className="p-4">Stock Actual</th>
              <th className="p-4">Mínimo Requerido</th>
              <th className="p-4">Costo Unitario</th>
              <th className="p-4">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filtered.map((item) => {
              const isLow = item.currentStock <= item.minStock;
              return (
                <tr key={item.id} className="hover:bg-amber-50/40 transition-colors">
                  <td className="p-4 font-bold text-stone-900 flex items-center gap-2">
                    <Package className="w-4 h-4 text-amber-600" />
                    {item.name}
                  </td>
                  <td className="p-4 uppercase text-stone-500 font-medium">{item.unit}</td>
                  <td className="p-4 font-extrabold text-stone-900">{item.currentStock}</td>
                  <td className="p-4 text-stone-500">{item.minStock}</td>
                  <td className="p-4 font-semibold text-stone-700">{formatCurrency(item.costPerUnit)}</td>
                  <td className="p-4">
                    {isLow ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
                        <AlertTriangle className="w-3.5 h-3.5" /> Reordenar Urgente
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Suficiente
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
  );
}
