"use client";

import { useState } from "react";
import { CalendarClock, Plus, Phone, Cake, Clock } from "lucide-react";
import { CustomOrder } from "@/types";
import { formatCurrency } from "@/lib/utils";

const INITIAL_ORDERS: CustomOrder[] = [
  {
    id: "PED-101",
    customerName: "Sra. María González",
    phone: "55 1234 5678",
    description: "Pastel 3 Leches relleno de durazno, 50 personas, temático de XV años (flores lilas)",
    deliveryDate: "2026-09-04 16:00",
    status: "en_horno",
    total: 950,
    deposit: 500,
  },
  {
    id: "PED-102",
    customerName: "Ing. Carlos Mendoza",
    phone: "55 8765 4321",
    description: "100 piezas de mini cuernitos rellenos de jamón y queso para evento escolar",
    deliveryDate: "2026-09-02 08:30",
    status: "pendiente",
    total: 1200,
    deposit: 1200,
  },
  {
    id: "PED-103",
    customerName: "Familia Brito",
    phone: "55 9988 7766",
    description: "Pastel Mil Hojas de Chocolate y Café para cumpleaños de Don Toño",
    deliveryDate: "2026-09-05 18:00",
    status: "pendiente",
    total: 650,
    deposit: 300,
  },
];

export default function PedidosPage() {
  const [orders, setOrders] = useState<CustomOrder[]>(INITIAL_ORDERS);

  const getStatusBadge = (status: CustomOrder["status"]) => {
    switch (status) {
      case "pendiente":
        return <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full font-bold text-xs">Pendiente</span>;
      case "en_horno":
        return <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-bold text-xs">En Preparación</span>;
      case "listo":
        return <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full font-bold text-xs">Listo en Mostrador</span>;
      case "entregado":
        return <span className="bg-stone-200 text-stone-700 px-3 py-1 rounded-full font-bold text-xs">Entregado</span>;
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-stone-900">Encargos de Pastelería & Eventos</h2>
          <p className="text-xs text-stone-500 mt-1">Control de pedidos anticipados, anticipos y fechas de entrega.</p>
        </div>
        <button className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-md transition-all text-xs">
          <Plus className="w-4 h-4" /> Tomar Nuevo Pedido
        </button>
      </div>

      {/* Grid of Orders */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {orders.map((order) => (
          <div key={order.id} className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-xs text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                  {order.id}
                </span>
                {getStatusBadge(order.status)}
              </div>
              <h3 className="font-bold text-base text-stone-900">{order.customerName}</h3>
              <p className="text-xs text-stone-500 flex items-center gap-1.5 mt-1">
                <Phone className="w-3.5 h-3.5 text-stone-400" /> {order.phone}
              </p>
              <div className="bg-stone-50 p-3 rounded-xl mt-3 text-xs text-stone-700 leading-relaxed border border-stone-100">
                {order.description}
              </div>
            </div>

            <div className="border-t border-stone-100 pt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between text-stone-600">
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-amber-600" /> Entrega:</span>
                <span className="font-bold text-stone-900">{order.deliveryDate}</span>
              </div>
              <div className="flex items-center justify-between text-stone-600">
                <span>Total:</span>
                <span className="font-extrabold text-stone-900">{formatCurrency(order.total)}</span>
              </div>
              <div className="flex items-center justify-between text-emerald-700 font-bold">
                <span>Anticipo Pagado:</span>
                <span>{formatCurrency(order.deposit)}</span>
              </div>
              <div className="flex items-center justify-between text-rose-600 font-bold">
                <span>Resta al Entregar:</span>
                <span>{formatCurrency(order.total - order.deposit)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
