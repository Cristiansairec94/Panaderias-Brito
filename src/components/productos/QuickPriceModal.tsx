"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { X, Check, DollarSign, Tag, Sparkles } from "lucide-react";
import { Product } from "@/types";
import { formatCurrency, onlyNumbersKeyDown, cleanDecimalNumbers } from "@/lib/utils";

interface QuickPriceModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (productId: string, newPrice: number) => void;
}

export function QuickPriceModal({
  product,
  isOpen,
  onClose,
  onSave,
}: QuickPriceModalProps) {
  const [priceInput, setPriceInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setPriceInput(String(product.price));
      setError(null);
    }
  }, [product]);

  if (!isOpen || !product) return null;

  const handleQuickAdd = (delta: number) => {
    const current = parseFloat(priceInput) || product.price || 0;
    const next = Math.max(0, current + delta);
    setPriceInput(next.toFixed(2));
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = cleanDecimalNumbers(priceInput);
    const parsed = parseFloat(clean);
    if (isNaN(parsed) || parsed < 0) {
      setError("Ingresa un precio válido mayor o igual a 0");
      return;
    }

    onSave(product.id, parsed);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-3 animate-in fade-in duration-150">
      <div 
        className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 p-4 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-sm">
              <Tag className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black tracking-wider uppercase text-amber-100">
                Panadería Brito
              </p>
              <h3 className="text-sm font-black leading-tight">
                Modificar Precio Rápido
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Product Summary */}
        <div className="p-4 border-b border-stone-100 bg-stone-50/60 flex items-center gap-3">
          <div className="relative w-14 h-14 rounded-2xl bg-white border border-stone-200 overflow-hidden flex items-center justify-center shrink-0 shadow-xs">
            {product.image ? (
              <Image
                src={product.image}
                alt={product.name}
                fill
                unoptimized
                className="object-cover"
              />
            ) : (
              <span className="text-2xl">{product.icon || "🥖"}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-stone-900 leading-snug truncate">
              {product.name}
            </p>
            <p className="text-[11px] text-stone-500 font-medium">
              Precio actual: <strong className="text-stone-900">{formatCurrency(product.price)}</strong>
              {product.unit && ` / ${product.unit}`}
            </p>
          </div>
        </div>

        {/* Price Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-[11px] font-black text-stone-700 uppercase tracking-wider mb-1.5">
              Nuevo Precio ($ MXN)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-amber-600 select-none">
                $
              </span>
              <input
                type="text"
                inputMode="decimal"
                pattern="[0-9]*[.,]?[0-9]*"
                autoFocus
                value={priceInput}
                onKeyDown={onlyNumbersKeyDown}
                onChange={(e) => {
                  setPriceInput(cleanDecimalNumbers(e.target.value));
                  setError(null);
                }}
                placeholder="0.00"
                className="w-full pl-10 pr-4 py-3 bg-stone-50 border-2 border-stone-200 focus:border-orange-500 rounded-2xl text-2xl font-black text-stone-900 tracking-tight text-right transition-all outline-none"
              />
            </div>
            {error && (
              <p className="text-xs font-bold text-rose-600 mt-1">{error}</p>
            )}
          </div>

          {/* Quick Increment/Decrement Buttons for Phone */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
              Ajuste rápido:
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickAdd(0.5)}
                className="py-1.5 px-2 bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-800 text-xs font-bold rounded-xl transition-all"
              >
                +$0.50
              </button>
              <button
                type="button"
                onClick={() => handleQuickAdd(1.0)}
                className="py-1.5 px-2 bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-800 text-xs font-bold rounded-xl transition-all"
              >
                +$1.00
              </button>
              <button
                type="button"
                onClick={() => handleQuickAdd(2.0)}
                className="py-1.5 px-2 bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-800 text-xs font-bold rounded-xl transition-all"
              >
                +$2.00
              </button>
              <button
                type="button"
                onClick={() => handleQuickAdd(-0.5)}
                className="py-1.5 px-2 bg-stone-100 hover:bg-rose-100 hover:text-rose-700 active:scale-95 text-stone-700 text-xs font-bold rounded-xl transition-all"
              >
                -$0.50
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-2xl border border-stone-200 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-[2] py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 hover:brightness-110 active:scale-95 text-white font-black text-xs shadow-lg shadow-orange-500/25 flex items-center justify-center gap-1.5 transition-all"
            >
              <Check className="w-4 h-4" /> Guardar Precio
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
