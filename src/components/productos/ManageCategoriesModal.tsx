"use client";

import { useState } from "react";
import { 
  X, 
  Plus, 
  Edit2, 
  Trash2, 
  Layers, 
  Check, 
  AlertTriangle, 
  Sparkles,
  RefreshCw,
  Tag
} from "lucide-react";
import { ProductCategory, addCategory, updateCategory, deleteCategory } from "@/lib/products";
import { Product } from "@/types";

interface ManageCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: ProductCategory[];
  products: Product[];
  onCategoriesChanged: () => void;
}

const PRESET_ICONS = [
  "🥖", "🍞", "🥐", "🥯", "🍰", "🧁", "🥧", "🍪", 
  "🍩", "☕", "🥤", "🧃", "🥫", "🌾", "🥚", "🧈", 
  "🧀", "🍕", "🥪", "📦", "🏷️", "✨", "🎂", "🍬"
];

export function ManageCategoriesModal({
  isOpen,
  onClose,
  categories,
  products,
  onCategoriesChanged,
}: ManageCategoriesModalProps) {
  // Form State
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("🥖");
  const [customIconInput, setCustomIconInput] = useState("");

  // Delete State
  const [deletingCategory, setDeletingCategory] = useState<ProductCategory | null>(null);
  const [reassignTargetId, setReassignTargetId] = useState<string>("");
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  if (!isOpen) return null;

  const showFeedback = (text: string, type: "success" | "error" = "success") => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const handleStartCreate = () => {
    setFormMode("create");
    setEditingId(null);
    setLabel("");
    setSelectedIcon("🥖");
    setCustomIconInput("");
  };

  const handleStartEdit = (cat: ProductCategory) => {
    setFormMode("edit");
    setEditingId(cat.id);
    setLabel(cat.label);
    setSelectedIcon(cat.icon || "🏷️");
    setCustomIconInput(cat.icon || "");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanLabel = label.trim();
    if (!cleanLabel) {
      showFeedback("El nombre de la categoría es obligatorio.", "error");
      return;
    }

    const finalIcon = (customIconInput.trim() || selectedIcon || "🏷️").trim();

    if (formMode === "create") {
      const created = addCategory({
        label: cleanLabel,
        icon: finalIcon,
      });
      showFeedback(`Categoría "${created.label}" agregada con éxito.`);
      handleStartCreate();
      onCategoriesChanged();
    } else if (formMode === "edit" && editingId) {
      const updated = updateCategory(editingId, {
        label: cleanLabel,
        icon: finalIcon,
      });
      if (updated) {
        showFeedback(`Categoría "${updated.label}" actualizada.`);
      }
      handleStartCreate();
      onCategoriesChanged();
    }
  };

  const handleOpenDelete = (cat: ProductCategory) => {
    setDeletingCategory(cat);
    // Find first other category to default reassignment
    const otherCat = categories.find((c) => c.id !== cat.id);
    setReassignTargetId(otherCat ? otherCat.id : "pan_dulce");
  };

  const handleConfirmDelete = () => {
    if (!deletingCategory) return;
    const catName = deletingCategory.label;
    const success = deleteCategory(deletingCategory.id, reassignTargetId);
    if (success) {
      showFeedback(`Categoría "${catName}" eliminada correctamente.`);
      if (editingId === deletingCategory.id) {
        handleStartCreate();
      }
      setDeletingCategory(null);
      onCategoriesChanged();
    } else {
      showFeedback("No se pudo eliminar la categoría.", "error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-stone-200 flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#2c1810] to-[#3e2723] text-amber-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-inner">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-amber-50 leading-tight">
                Gestionar Categorías del Catálogo
              </h2>
              <p className="text-[11px] sm:text-xs text-amber-200/80 font-medium">
                Añade, edita o elimina las categorías de tus productos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-stone-200 flex items-center justify-center transition-all cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedbackMsg && (
          <div 
            className={`px-4 py-2.5 text-xs font-bold flex items-center justify-between animate-in slide-in-from-top-2 duration-200 ${
              feedbackMsg.type === "success" 
                ? "bg-emerald-50 text-emerald-800 border-b border-emerald-200" 
                : "bg-red-50 text-red-800 border-b border-red-200"
            }`}
          >
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{feedbackMsg.text}</span>
            </div>
            <button 
              type="button"
              onClick={() => setFeedbackMsg(null)}
              className="text-stone-400 hover:text-stone-600"
            >
              ✕
            </button>
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-stone-50/50">
          
          {/* Form Box (Add / Edit) */}
          <div className="p-4 sm:p-5 bg-white rounded-2xl border-2 border-amber-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <h3 className="text-xs sm:text-sm font-black text-stone-900 flex items-center gap-2">
                {formMode === "create" ? (
                  <>
                    <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center text-xs font-black">
                      +
                    </span>
                    <span>Añadir Nueva Categoría</span>
                  </>
                ) : (
                  <>
                    <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center text-xs">
                      ✏️
                    </span>
                    <span>Modificar Categoría</span>
                  </>
                )}
              </h3>

              {formMode === "edit" && (
                <button
                  type="button"
                  onClick={handleStartCreate}
                  className="text-xs font-bold text-stone-500 hover:text-stone-800 underline cursor-pointer"
                >
                  Cancelar edición
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Icon Selector */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  Icono o Emoji de la Categoría
                </label>
                <div className="flex flex-wrap items-center gap-1.5 p-2 bg-stone-50 rounded-xl border border-stone-200">
                  {PRESET_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => {
                        setSelectedIcon(icon);
                        setCustomIconInput(icon);
                      }}
                      className={`w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-all cursor-pointer ${
                        selectedIcon === icon
                          ? "bg-amber-500 shadow-md scale-110 ring-2 ring-amber-600/30 text-white"
                          : "hover:bg-white bg-transparent"
                      }`}
                      title={`Elegir ${icon}`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>

                {/* Custom Emoji / Text Input */}
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[11px] font-bold text-stone-500 shrink-0">O escribe otro emoji:</span>
                  <input
                    type="text"
                    maxLength={4}
                    value={customIconInput}
                    onChange={(e) => {
                      setCustomIconInput(e.target.value);
                      if (e.target.value) setSelectedIcon(e.target.value);
                    }}
                    placeholder="🏷️"
                    className="w-16 px-2 py-1 text-center bg-white border border-stone-200 rounded-lg text-sm font-bold focus:border-amber-500 focus:outline-none"
                  />
                  <div className="flex items-center gap-1 text-[11px] text-stone-500">
                    <span>Vista previa:</span>
                    <span className="text-xl font-bold p-1 bg-amber-100 rounded-md">
                      {customIconInput || selectedIcon || "🏷️"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Category Name Input */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-stone-700">
                  Nombre de la Categoría *
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    required
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="Ej. Galletas y Pastas, Lácteos, Empanadas..."
                    className="flex-1 px-3.5 py-2.5 bg-stone-50 rounded-xl border border-stone-200 text-xs font-bold text-stone-900 focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none"
                  />
                  <button
                    type="submit"
                    className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2 shrink-0 ${
                      formMode === "create"
                        ? "bg-amber-500 hover:bg-amber-600 active:scale-95 text-stone-950 font-black"
                        : "bg-[#3e2723] hover:bg-[#2c1810] active:scale-95 text-amber-100"
                    }`}
                  >
                    {formMode === "create" ? (
                      <>
                        <Plus className="w-4 h-4 stroke-[3]" />
                        <span>Añadir Categoría</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>Guardar Cambios</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* List of Existing Categories */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase text-stone-700 tracking-wider flex items-center gap-2">
                <Tag className="w-3.5 h-3.5 text-amber-600" />
                <span>Categorías Existentes ({categories.length})</span>
              </h3>
              <span className="text-[11px] text-stone-500 font-medium">
                Haz clic en editar o eliminar según necesites
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {categories.map((cat) => {
                const count = products.filter((p) => p.category === cat.id).length;
                const isCurrentlyEditing = editingId === cat.id;

                return (
                  <div
                    key={cat.id}
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      isCurrentlyEditing
                        ? "bg-amber-50 border-amber-400 ring-2 ring-amber-500/20 shadow-sm"
                        : "bg-white hover:bg-stone-50 border-stone-200"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate min-w-0">
                      <span className="w-8 h-8 rounded-xl bg-stone-100 flex items-center justify-center text-lg shrink-0 border border-stone-200/60 shadow-2xs">
                        {cat.icon || "🏷️"}
                      </span>
                      <div className="truncate">
                        <h4 className="text-xs font-black text-stone-900 truncate">
                          {cat.label}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-mono font-bold text-stone-500 bg-stone-100 px-1.5 py-0.2 rounded">
                            {count} {count === 1 ? "producto" : "productos"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Edit Button */}
                      <button
                        type="button"
                        onClick={() => handleStartEdit(cat)}
                        className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                          isCurrentlyEditing
                            ? "bg-amber-500 text-stone-950 font-black"
                            : "hover:bg-amber-100 text-stone-600 hover:text-amber-900"
                        }`}
                        title={`Editar ${cat.label}`}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenDelete(cat)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-stone-400 hover:text-red-600 transition-all cursor-pointer"
                        title={`Eliminar ${cat.label}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-stone-200 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-800 text-xs font-bold transition-all cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal Sub-Dialog */}
      {deletingCategory && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border-2 border-red-200 overflow-hidden p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-stone-900">
                  ¿Eliminar categoría?
                </h3>
                <p className="text-xs text-stone-500 font-medium">
                  {deletingCategory.icon} {deletingCategory.label}
                </p>
              </div>
            </div>

            {(() => {
              const assignedCount = products.filter((p) => p.category === deletingCategory.id).length;
              return assignedCount > 0 ? (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                  <p className="text-xs font-bold text-amber-900">
                    ⚠️ Esta categoría tiene <span className="underline">{assignedCount} producto(s)</span> asignados.
                  </p>
                  <p className="text-[11px] text-amber-800">
                    Selecciona a qué categoría deseas reasignar estos productos para no perderlos:
                  </p>
                  <select
                    value={reassignTargetId}
                    onChange={(e) => setReassignTargetId(e.target.value)}
                    className="w-full px-3 py-2 bg-white rounded-lg border border-amber-300 text-xs font-bold text-stone-800 focus:outline-none"
                  >
                    {categories
                      .filter((c) => c.id !== deletingCategory.id)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.icon} {c.label}
                        </option>
                      ))}
                  </select>
                </div>
              ) : (
                <p className="text-xs text-stone-600">
                  Esta categoría no tiene productos asignados. Se eliminará de la lista del catálogo inmediatamente.
                </p>
              );
            })()}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setDeletingCategory(null)}
                className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-black shadow-md transition-all cursor-pointer"
              >
                Sí, eliminar categoría
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
