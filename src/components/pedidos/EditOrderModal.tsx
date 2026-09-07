"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Calendar,
  Clock,
  User,
  Phone,
  Store,
  MapPin,
  Sparkles,
  Save,
  CheckCircle2
} from "lucide-react";
import { CustomOrder } from "@/types";
import { useBranch } from "@/context/BranchContext";
import { updateCustomOrder } from "@/lib/orders";

interface EditOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: CustomOrder | null;
  onOrderUpdated: () => void;
}

export default function EditOrderModal({
  isOpen,
  onClose,
  order,
  onOrderUpdated,
}: EditOrderModalProps) {
  const { branches } = useBranch();

  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [branchId, setBranchId] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [deliveryType, setDeliveryType] = useState<"sucursal" | "domicilio">("sucursal");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [dedication, setDedication] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (order) {
      setCustomerName(order.customerName);
      setPhone(order.phone);
      setBranchId(order.branchId || "branch-matriz");
      setDeliveryDate(order.deliveryDate);
      setDeliveryTime(order.deliveryTime || "16:00");
      setDeliveryType(order.deliveryType || "sucursal");
      setDeliveryAddress(order.deliveryAddress || "");
      setDedication(order.dedication || "");
      setNotes(order.notes || "");
    }
  }, [order]);

  if (!isOpen || !order) return null;

  const handleSave = () => {
    if (!customerName.trim()) {
      alert("El nombre del cliente no puede estar vacío.");
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedBranch = branches.find((b) => b.id === branchId);

      updateCustomOrder(order.id, {
        customerName: customerName.trim(),
        phone: phone.trim(),
        branchId: branchId,
        branchName: selectedBranch?.name || order.branchName,
        deliveryDate: deliveryDate,
        deliveryTime: deliveryTime,
        deliveryType: deliveryType,
        deliveryAddress: deliveryType === "domicilio" ? deliveryAddress.trim() : undefined,
        dedication: dedication.trim(),
        notes: notes.trim(),
      });

      onOrderUpdated();
      onClose();
    } catch (err) {
      console.error("Error updating order:", err);
      alert("Error al actualizar los datos del pedido.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-stone-200 flex flex-col">
        {/* Header */}
        <div className="bg-stone-900 text-white p-5 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-base flex items-center gap-2">
              Editar Pedido
              <span className="text-amber-400 font-mono text-sm bg-stone-800 px-2 py-0.5 rounded">
                {order.orderNumber}
              </span>
            </h3>
            <p className="text-xs text-stone-400 mt-0.5">Modificar fecha, sucursal, datos de entrega o notas</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Customer */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">Nombre del Cliente</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">Teléfono</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Branch */}
          <div>
            <label className="text-xs font-bold text-stone-700 block mb-1">Sucursal Asignada</label>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-semibold"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Delivery Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">Fecha de Entrega</label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-bold text-stone-800"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">Hora Estimada</label>
              <input
                type="time"
                value={deliveryTime}
                onChange={(e) => setDeliveryTime(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-bold text-stone-800"
              />
            </div>
          </div>

          {/* Delivery Type */}
          <div>
            <label className="text-xs font-bold text-stone-700 block mb-1">Modalidad de Entrega</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDeliveryType("sucursal")}
                className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                  deliveryType === "sucursal"
                    ? "bg-amber-600 text-white border-amber-600"
                    : "bg-white text-stone-700 border-stone-300 hover:bg-stone-50"
                }`}
              >
                🏬 En Tienda (Mostrador)
              </button>
              <button
                type="button"
                onClick={() => setDeliveryType("domicilio")}
                className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                  deliveryType === "domicilio"
                    ? "bg-amber-600 text-white border-amber-600"
                    : "bg-white text-stone-700 border-stone-300 hover:bg-stone-50"
                }`}
              >
                🚚 Envío a Domicilio
              </button>
            </div>
            {deliveryType === "domicilio" && (
              <input
                type="text"
                placeholder="Dirección completa de entrega..."
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none mt-2"
              />
            )}
          </div>

          {/* Dedication */}
          <div>
            <label className="text-xs font-bold text-stone-700 block mb-1">Dedicatoria / Letrero del Pastel</label>
            <input
              type="text"
              placeholder="Ej. ¡Feliz Cumpleaños Mariana!"
              value={dedication}
              onChange={(e) => setDedication(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-bold text-stone-700 block mb-1">Notas / Observaciones</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
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
            disabled={isSubmitting}
            onClick={handleSave}
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}
