"use client";

import { useState } from "react";
import { 
  Search, 
  Trash2, 
  Plus, 
  Minus, 
  CreditCard, 
  Banknote, 
  CheckCircle, 
  Receipt, 
  Sparkles
} from "lucide-react";
import { Product, CartItem } from "@/types";
import { formatCurrency } from "@/lib/utils";

const SAMPLE_PRODUCTS: Product[] = [
  { id: "1", name: "Concha de Vainilla", price: 12, category: "pan_dulce", icon: "🥖", stock: 45 },
  { id: "2", name: "Concha de Chocolate", price: 12, category: "pan_dulce", icon: "🍫", stock: 38 },
  { id: "3", name: "Cuerno de Mantequilla", price: 15, category: "pan_dulce", icon: "🥐", stock: 24 },
  { id: "4", name: "Bolillo Tradicional", price: 5, category: "pan_blanco", icon: "🍞", stock: 120 },
  { id: "5", name: "Telera para Torta", price: 6, category: "pan_blanco", icon: "🥪", stock: 80 },
  { id: "6", name: "Oreja Hojaldrada", price: 14, category: "pan_dulce", icon: "🥨", stock: 30 },
  { id: "7", name: "Dona Glaseada", price: 13, category: "pan_dulce", icon: "🍩", stock: 25 },
  { id: "8", name: "Rebanada Pastel 3 Leches", price: 45, category: "pasteleria", icon: "🍰", stock: 15 },
  { id: "9", name: "Pay de Queso con Zarzamora", price: 40, category: "pasteleria", icon: "🥧", stock: 10 },
  { id: "10", name: "Café de Olla Caliente", price: 25, category: "bebidas", icon: "☕", stock: 50 },
  { id: "11", name: "Pan de Muerto Tradicional", price: 20, category: "temporada", icon: "✨", stock: 60 },
  { id: "12", name: "Empanada de Calabaza", price: 16, category: "pan_dulce", icon: "🥟", stock: 20 },
];

const CATEGORIES = [
  { id: "all", label: "Todo" },
  { id: "pan_dulce", label: "Pan Dulce" },
  { id: "pan_blanco", label: "Bolillo & Telera" },
  { id: "pasteleria", label: "Pasteles & Pays" },
  { id: "bebidas", label: "Bebidas" },
];

export default function POSPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [cashGiven, setCashGiven] = useState<string>("");
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const filteredProducts = SAMPLE_PRODUCTS.filter((prod) => {
    const matchesCat = selectedCategory === "all" || prod.category === selectedCategory;
    const matchesSearch = prod.name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === id) {
            const newQ = item.quantity + delta;
            return newQ > 0 ? { ...item, quantity: newQ } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const total = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const change = Number(cashGiven) >= total ? Number(cashGiven) - total : 0;

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setShowReceiptModal(true);
  };

  const resetSale = () => {
    setCart([]);
    setCashGiven("");
    setShowReceiptModal(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-stone-100">
      {/* Product Catalog Grid */}
      <div className="flex-1 flex flex-col p-6 overflow-y-auto">
        {/* Search & Categories */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Buscar concha, bolillo, pastel..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-white rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm text-sm"
              />
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-stone-600 bg-amber-100/70 px-3.5 py-2 rounded-xl">
              <Sparkles className="w-4 h-4 text-amber-600" />
              Precios Actualizados
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? "bg-amber-600 text-white shadow-sm"
                    : "bg-white text-stone-600 hover:bg-amber-50 border border-stone-200"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 pb-12">
          {filteredProducts.map((product) => (
            <button
              key={product.id}
              onClick={() => addToCart(product)}
              className="bg-white p-4 rounded-2xl border border-stone-200 hover:border-amber-500 hover:shadow-lg transition-all text-left flex flex-col justify-between group active:scale-95"
            >
              <div>
                <div className="text-4xl mb-3 flex items-center justify-center h-16 bg-amber-50/60 rounded-xl group-hover:scale-105 transition-transform">
                  {product.icon || "🥖"}
                </div>
                <h4 className="font-bold text-stone-900 text-sm leading-snug">{product.name}</h4>
                <p className="text-xs text-stone-400 mt-0.5">Stock: {product.stock} pzas</p>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-base font-extrabold text-amber-700">
                  {formatCurrency(product.price)}
                </span>
                <span className="p-1.5 bg-amber-100 group-hover:bg-amber-600 group-hover:text-white text-amber-800 rounded-lg transition-colors">
                  <Plus className="w-4 h-4" />
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Cart & Cashier Sidebar */}
      <div className="w-96 bg-white border-l border-stone-200 flex flex-col h-full shadow-lg">
        <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-amber-950 text-white">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-base">Ticket de Venta</h3>
          </div>
          <span className="text-xs bg-amber-800/80 px-2.5 py-1 rounded-full font-semibold">
            {totalItems} piezas
          </span>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-stone-400 text-center p-6">
              <span className="text-5xl mb-3">🧺</span>
              <p className="text-sm font-semibold text-stone-600">Charola vacía</p>
              <p className="text-xs mt-1">Haz clic en los panes para agregarlos al ticket</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.product.id}
                className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-200/80"
              >
                <div className="flex-1 pr-2">
                  <p className="font-bold text-xs text-stone-900 leading-tight">{item.product.name}</p>
                  <p className="text-xs text-amber-700 font-semibold mt-0.5">
                    {formatCurrency(item.product.price)} c/u
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.product.id, -1)}
                    className="p-1 hover:bg-stone-200 rounded-lg text-stone-600"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-bold text-xs w-5 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.product.id, 1)}
                    className="p-1 hover:bg-stone-200 rounded-lg text-stone-600"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-bold text-xs text-stone-900 w-16 text-right">
                    {formatCurrency(item.product.price * item.quantity)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Payment Summary */}
        <div className="p-5 border-t border-stone-200 bg-stone-50/80 space-y-3">
          <div className="flex justify-between items-center text-sm font-medium text-stone-600">
            <span>Subtotal:</span>
            <span>{formatCurrency(total)}</span>
          </div>
          <div className="flex justify-between items-center text-xl font-extrabold text-stone-900 border-t border-stone-200 pt-2">
            <span>Total a Cobrar:</span>
            <span className="text-amber-700">{formatCurrency(total)}</span>
          </div>

          {/* Cash input */}
          <div className="space-y-1 pt-1">
            <label className="text-xs font-semibold text-stone-600">Paga con ($ Efectivo):</label>
            <input
              type="number"
              placeholder="Ej. 100, 200, 500"
              value={cashGiven}
              onChange={(e) => setCashGiven(e.target.value)}
              className="w-full px-3 py-2 bg-white rounded-xl border border-stone-300 text-sm font-bold text-stone-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          {Number(cashGiven) > 0 && (
            <div className="flex justify-between items-center bg-emerald-50 text-emerald-800 p-2.5 rounded-xl text-sm font-bold border border-emerald-200">
              <span>Cambio:</span>
              <span>{formatCurrency(change)}</span>
            </div>
          )}

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              onClick={() => setCart([])}
              disabled={cart.length === 0}
              className="px-4 py-3 bg-stone-200 hover:bg-stone-300 disabled:opacity-50 text-stone-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all"
            >
              <Trash2 className="w-4 h-4" /> Cancelar
            </button>
            <button
              onClick={handleCheckout}
              disabled={cart.length === 0}
              className="px-4 py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95"
            >
              <CheckCircle className="w-4 h-4" /> Cobrar Venta
            </button>
          </div>
        </div>
      </div>

      {/* Sale Success Modal */}
      {showReceiptModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl animate-in fade-in zoom-in">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-stone-900">¡Venta Registrada!</h3>
            <p className="text-xs text-stone-500">
              Venta completada con éxito. Se actualizó el stock de piezas horneadas.
            </p>
            <div className="bg-stone-50 p-4 rounded-2xl text-left text-xs space-y-1.5 border border-stone-200">
              <div className="flex justify-between">
                <span>Total:</span>
                <span className="font-bold">{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between">
                <span>Efectivo:</span>
                <span className="font-bold">{formatCurrency(Number(cashGiven) || total)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-bold border-t pt-1">
                <span>Cambio:</span>
                <span>{formatCurrency(change)}</span>
              </div>
            </div>
            <button
              onClick={resetSale}
              className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-sm transition-all"
            >
              Siguiente Cliente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
