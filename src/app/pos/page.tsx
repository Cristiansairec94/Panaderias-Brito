"use client";

import { useState, useEffect } from "react";
import { 
  Search, 
  Trash2, 
  Plus, 
  Minus, 
  CheckCircle, 
  Receipt, 
  Database,
  History,
  DollarSign,
  CreditCard,
  Send,
  Sparkles,
  ShoppingBag,
  AlertCircle
} from "lucide-react";
import { Product, CartItem, Sale } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import TicketModal from "@/components/pos/TicketModal";
import RecentSalesDrawer from "@/components/pos/RecentSalesDrawer";

const FALLBACK_PRODUCTS: Product[] = [
  { id: "1", name: "Concha de Vainilla", price: 12, category: "pan_dulce", icon: "🥖", stock: 50 },
  { id: "2", name: "Concha de Chocolate", price: 12, category: "pan_dulce", icon: "🍫", stock: 40 },
  { id: "3", name: "Cuerno de Mantequilla", price: 15, category: "pan_dulce", icon: "🥐", stock: 30 },
  { id: "4", name: "Bolillo Tradicional", price: 5, category: "pan_blanco", icon: "🍞", stock: 150 },
  { id: "5", name: "Telera para Torta", price: 6, category: "pan_blanco", icon: "🥪", stock: 100 },
  { id: "6", name: "Oreja Hojaldrada", price: 14, category: "pan_dulce", icon: "🥨", stock: 35 },
  { id: "7", name: "Dona Glaseada", price: 13, category: "pan_dulce", icon: "🍩", stock: 30 },
  { id: "8", name: "Rebanada Pastel 3 Leches", price: 45, category: "pasteleria", icon: "🍰", stock: 20 },
  { id: "9", name: "Pay de Queso con Zarzamora", price: 40, category: "pasteleria", icon: "🥧", stock: 15 },
  { id: "10", name: "Café de Olla Caliente", price: 25, category: "bebidas", icon: "☕", stock: 60 },
  { id: "11", name: "Pan de Muerto Tradicional", price: 20, category: "temporada", icon: "✨", stock: 50 },
  { id: "12", name: "Empanada de Calabaza", price: 16, category: "pan_dulce", icon: "🥟", stock: 25 },
];

const CATEGORIES = [
  { id: "all", label: "Todo" },
  { id: "pan_dulce", label: "Pan Dulce" },
  { id: "pan_blanco", label: "Bolillo & Telera" },
  { id: "pasteleria", label: "Pasteles & Pays" },
  { id: "bebidas", label: "Bebidas" },
  { id: "temporada", label: "Temporada" },
];

const QUICK_DENOMINATIONS = [20, 50, 100, 200, 500];

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>(FALLBACK_PRODUCTS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"efectivo" | "tarjeta" | "transferencia">("efectivo");
  const [cashGiven, setCashGiven] = useState<string>("");
  
  // Modals & Drawers state
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showRecentSales, setShowRecentSales] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [recentSalesList, setRecentSalesList] = useState<Sale[]>([]);
  
  // Status
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load products & recent sales from Supabase
  useEffect(() => {
    async function loadInitialData() {
      try {
        const supabase = createClient();
        
        // 1. Load products
        const { data: prodData, error: prodErr } = await supabase
          .from("products")
          .select("*")
          .eq("is_active", true)
          .order("name");

        if (prodData && prodData.length > 0 && !prodErr) {
          const mapped: Product[] = prodData.map((p: any) => ({
            id: p.id,
            name: p.name,
            price: Number(p.price),
            category: p.category_id || "pan_dulce",
            icon: p.icon || "🥖",
            stock: p.stock || 0,
          }));
          setProducts(mapped);
          setIsDbConnected(true);
        }

        // 2. Load recent sales of today
        const { data: salesData, error: salesErr } = await supabase
          .from("sales")
          .select(`
            id,
            total,
            payment_method,
            cashier,
            created_at,
            sale_items (
              product_id,
              product_name,
              quantity,
              unit_price,
              subtotal
            )
          `)
          .order("created_at", { ascending: false })
          .limit(20);

        if (salesData && !salesErr) {
          const mappedSales: Sale[] = salesData.map((s: any) => ({
            id: s.id,
            date: new Date(s.created_at).toLocaleString("es-MX", {
              dateStyle: "short",
              timeStyle: "short",
            }),
            total: Number(s.total),
            paymentMethod: (s.payment_method as any) || "efectivo",
            cashier: s.cashier || "Caja Principal - Don Toño",
            items: (s.sale_items || []).map((si: any) => ({
              product: {
                id: si.product_id || "temp",
                name: si.product_name,
                price: Number(si.unit_price),
                category: "pan_dulce",
                stock: 0,
              },
              quantity: si.quantity,
            })),
          }));
          setRecentSalesList(mappedSales);
        }
      } catch (err) {
        console.log("Using fallback demo mode", err);
      }
    }
    loadInitialData();
  }, []);

  const filteredProducts = products.filter((prod) => {
    const matchesCat = selectedCategory === "all" || prod.category === selectedCategory;
    const matchesSearch = prod.name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        // Check stock limit
        if (existing.quantity >= product.stock) return prev;
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    const targetProduct = products.find((p) => p.id === id);
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === id) {
            const newQ = item.quantity + delta;
            if (targetProduct && newQ > targetProduct.stock) {
              return item; // Cap at max available stock
            }
            return newQ > 0 ? { ...item, quantity: newQ } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const total = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const parsedCashGiven = Number(cashGiven) || 0;
  const change = paymentMethod === "efectivo" && parsedCashGiven >= total ? parsedCashGiven - total : 0;
  const isPaymentValid = paymentMethod !== "efectivo" || parsedCashGiven >= total;

  const handleQuickCash = (amount: number) => {
    setCashGiven(amount.toString());
  };

  const handleExactCash = () => {
    setCashGiven(total.toString());
  };

  const handleCheckout = async () => {
    if (cart.length === 0 || !isPaymentValid || isSubmitting) return;
    setIsSubmitting(true);

    const cashierName = "Caja Principal - Don Toño";
    const currentItems = [...cart];
    const currentTotal = total;
    const currentPaymentMethod = paymentMethod;
    const currentCashGiven = paymentMethod === "efectivo" ? parsedCashGiven : undefined;
    const currentChange = paymentMethod === "efectivo" ? change : undefined;

    let createdSaleId = `POS-${Date.now().toString().slice(-6)}`;

    try {
      const supabase = createClient();
      
      // 1. Insert sale into Supabase
      const { data: saleData, error: saleErr } = await supabase
        .from("sales")
        .insert({
          total: currentTotal,
          payment_method: currentPaymentMethod,
          cashier: cashierName,
        })
        .select()
        .single();

      if (saleData && !saleErr) {
        createdSaleId = saleData.id;

        // 2. Insert items
        const saleItemsToInsert = currentItems.map((item) => ({
          sale_id: saleData.id,
          product_id: item.product.id.includes("-") ? item.product.id : null,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: item.product.price,
          subtotal: item.product.price * item.quantity,
        }));
        await supabase.from("sale_items").insert(saleItemsToInsert);

        // 3. Discount product stock in Supabase & Local state
        for (const item of currentItems) {
          if (item.product.id.includes("-")) {
            const newStock = Math.max(0, item.product.stock - item.quantity);
            await supabase
              .from("products")
              .update({ stock: newStock })
              .eq("id", item.product.id);
          }
        }
      }
    } catch (e) {
      console.log("Offline sale or db pending", e);
    } finally {
      // 4. Update local state stock
      setProducts((prev) =>
        prev.map((prod) => {
          const bought = currentItems.find((ci) => ci.product.id === prod.id);
          if (bought) {
            return { ...prod, stock: Math.max(0, prod.stock - bought.quantity) };
          }
          return prod;
        })
      );

      // 5. Construct completed sale object for Ticket
      const newSaleRecord: Sale = {
        id: createdSaleId,
        date: new Date().toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }),
        items: currentItems,
        total: currentTotal,
        paymentMethod: currentPaymentMethod,
        cashier: cashierName,
        cashGiven: currentCashGiven,
        change: currentChange,
      };

      setCompletedSale(newSaleRecord);
      setRecentSalesList((prev) => [newSaleRecord, ...prev]);
      setIsSubmitting(false);
      setShowReceiptModal(true);
    }
  };

  const handleReprintSale = (sale: Sale) => {
    setCompletedSale(sale);
    setShowRecentSales(false);
    setShowReceiptModal(true);
  };

  const resetSale = () => {
    setCart([]);
    setCashGiven("");
    setShowReceiptModal(false);
    setCompletedSale(null);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-stone-100">
      {/* Product Catalog Grid (Left / Main) */}
      <div className="flex-1 flex flex-col p-6 overflow-y-auto">
        {/* Top bar */}
        <div className="flex flex-col gap-4 mb-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md w-full">
              <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Buscar concha, bolillo, pastel, dona..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-white rounded-2xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm text-sm"
              />
            </div>

            {/* Quick Status and History triggers */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={() => setShowRecentSales(true)}
                className="flex items-center gap-1.5 text-xs font-bold text-stone-700 bg-white hover:bg-stone-50 border border-stone-200 px-3.5 py-2.5 rounded-2xl shadow-sm transition-all"
              >
                <History className="w-4 h-4 text-amber-600" />
                <span>Turno ({recentSalesList.length})</span>
              </button>

              <div className="flex items-center gap-2 text-xs font-semibold text-stone-700 bg-white border border-stone-200 px-3.5 py-2.5 rounded-2xl shadow-sm">
                <Database className={`w-4 h-4 ${isDbConnected ? "text-emerald-500" : "text-amber-500"}`} />
                <span className="hidden md:inline">{isDbConnected ? "Supabase Conectado" : "Modo Local / Demo"}</span>
              </div>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
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
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5 pb-12">
          {filteredProducts.map((product) => {
            const isOutOfStock = product.stock <= 0;
            const itemInCart = cart.find((i) => i.product.id === product.id);
            return (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                disabled={isOutOfStock}
                className={`p-4 rounded-3xl border transition-all text-left flex flex-col justify-between group relative select-none ${
                  isOutOfStock
                    ? "bg-stone-100 border-stone-200 opacity-60 cursor-not-allowed"
                    : "bg-white border-stone-200 hover:border-amber-500 hover:shadow-lg active:scale-95"
                }`}
              >
                {/* Active in-cart indicator badge */}
                {itemInCart && (
                  <span className="absolute -top-2 -right-2 bg-amber-600 text-white font-black text-xs w-6 h-6 rounded-full flex items-center justify-center shadow-md animate-in zoom-in">
                    {itemInCart.quantity}
                  </span>
                )}

                <div>
                  <div className="text-4xl mb-2.5 flex items-center justify-center h-16 bg-amber-50/60 rounded-2xl group-hover:scale-105 transition-transform">
                    {product.icon || "🥖"}
                  </div>
                  <h4 className="font-bold text-stone-900 text-sm leading-snug line-clamp-1">{product.name}</h4>
                  <p className={`text-[11px] font-semibold mt-0.5 ${isOutOfStock ? "text-rose-500" : "text-stone-400"}`}>
                    {isOutOfStock ? "Agotado" : `Stock: ${product.stock} pzas`}
                  </p>
                </div>

                <div className="mt-3.5 flex items-center justify-between pt-2 border-t border-stone-100">
                  <span className="text-base font-black text-amber-700">
                    {formatCurrency(product.price)}
                  </span>
                  <span className={`p-1.5 rounded-xl transition-colors ${
                    isOutOfStock
                      ? "bg-stone-200 text-stone-400"
                      : "bg-amber-100 group-hover:bg-amber-600 group-hover:text-white text-amber-800"
                  }`}>
                    <Plus className="w-4 h-4" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cart & Cashier Sidebar (Right) */}
      <div className="w-96 bg-white border-l border-stone-200 flex flex-col h-full shadow-2xl">
        {/* Header */}
        <div className="p-4 px-5 border-b border-stone-100 flex items-center justify-between bg-amber-950 text-white">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-sm leading-tight">Charola de Cobro</h3>
              <p className="text-[10px] text-amber-300/80">Don Toño Brito</p>
            </div>
          </div>
          <span className="text-xs bg-amber-800/80 px-2.5 py-1 rounded-full font-bold">
            {totalItems} {totalItems === 1 ? "pieza" : "piezas"}
          </span>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-stone-400 text-center p-6 space-y-2">
              <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center text-3xl">
                🧺
              </div>
              <p className="text-sm font-bold text-stone-700">Charola vacía</p>
              <p className="text-xs text-stone-400 max-w-[200px]">
                Selecciona los panes en pantalla para agregarlos a la cuenta.
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.product.id}
                className="flex items-center justify-between p-3 bg-stone-50 hover:bg-stone-100/80 rounded-2xl border border-stone-200/80 transition-all"
              >
                <div className="flex-1 pr-2">
                  <p className="font-bold text-xs text-stone-900 leading-tight">{item.product.name}</p>
                  <p className="text-[11px] text-amber-700 font-semibold mt-0.5">
                    {formatCurrency(item.product.price)} c/u
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => updateQuantity(item.product.id, -1)}
                    className="p-1.5 hover:bg-stone-200 active:scale-90 rounded-xl text-stone-600 transition-all"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-black text-xs w-6 text-center text-stone-800">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.product.id, 1)}
                    className="p-1.5 hover:bg-stone-200 active:scale-90 rounded-xl text-stone-600 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-black text-xs text-stone-900 w-14 text-right">
                    {formatCurrency(item.product.price * item.quantity)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Payment Configuration & Checkout Area */}
        <div className="p-4 border-t border-stone-200 bg-stone-50/90 space-y-3">
          {/* Payment Method Selector */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Método de Pago:</span>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: "efectivo", label: "Efectivo", icon: DollarSign },
                { id: "tarjeta", label: "Tarjeta", icon: CreditCard },
                { id: "transferencia", label: "Transfer.", icon: Send },
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setPaymentMethod(m.id as any)}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all ${
                      isSelected
                        ? "bg-amber-800 text-white shadow-sm"
                        : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Totals Banner */}
          <div className="bg-white p-3 rounded-2xl border border-stone-200 space-y-1 shadow-sm">
            <div className="flex justify-between items-center text-xs font-medium text-stone-500">
              <span>Subtotal ({totalItems} pzas):</span>
              <span>{formatCurrency(total)}</span>
            </div>
            <div className="flex justify-between items-center text-lg font-black text-stone-900 border-t border-stone-100 pt-1.5">
              <span>Total a Cobrar:</span>
              <span className="text-amber-700">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Cash Handling with Quick Denominations */}
          {paymentMethod === "efectivo" && (
            <div className="space-y-2 bg-amber-50/70 p-3 rounded-2xl border border-amber-200/80">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-700">Paga con ($ Efectivo):</label>
                <button
                  onClick={handleExactCash}
                  disabled={cart.length === 0}
                  className="text-[11px] font-extrabold text-amber-800 hover:underline"
                >
                  Pago Exacto
                </button>
              </div>

              {/* Quick Bill Buttons */}
              <div className="grid grid-cols-5 gap-1">
                {QUICK_DENOMINATIONS.map((bill) => (
                  <button
                    key={bill}
                    onClick={() => handleQuickCash(bill)}
                    disabled={cart.length === 0}
                    className="py-1.5 bg-white hover:bg-amber-600 hover:text-white text-stone-800 font-extrabold text-xs rounded-lg border border-amber-200 shadow-sm transition-all active:scale-95"
                  >
                    ${bill}
                  </button>
                ))}
              </div>

              {/* Custom Cash Input */}
              <input
                type="number"
                placeholder="O escribe cantidad..."
                value={cashGiven}
                onChange={(e) => setCashGiven(e.target.value)}
                className="w-full px-3 py-1.5 bg-white rounded-xl border border-amber-300 text-xs font-black text-stone-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />

              {/* Change Display */}
              {parsedCashGiven > 0 && (
                <div className={`flex justify-between items-center p-2 rounded-xl text-xs font-bold border ${
                  parsedCashGiven >= total
                    ? "bg-emerald-100/80 text-emerald-900 border-emerald-300"
                    : "bg-rose-100 text-rose-800 border-rose-300"
                }`}>
                  <span>{parsedCashGiven >= total ? "Cambio a Devolver:" : "Falta dinero:"}</span>
                  <span className="text-sm">
                    {parsedCashGiven >= total ? formatCurrency(change) : formatCurrency(total - parsedCashGiven)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              onClick={() => {
                setCart([]);
                setCashGiven("");
              }}
              disabled={cart.length === 0}
              className="px-3 py-3 bg-stone-200 hover:bg-stone-300 disabled:opacity-40 text-stone-700 font-bold rounded-2xl text-xs flex items-center justify-center gap-1 transition-all"
            >
              <Trash2 className="w-4 h-4" /> Cancelar
            </button>
            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || !isPaymentValid || isSubmitting}
              className="col-span-2 py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-extrabold rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-900/20 transition-all active:scale-95"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isSubmitting ? "Registrando..." : "Cobrar & Ticket"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Ticket Modal */}
      {completedSale && (
        <TicketModal
          isOpen={showReceiptModal}
          onClose={resetSale}
          saleId={completedSale.id}
          items={completedSale.items}
          total={completedSale.total}
          paymentMethod={completedSale.paymentMethod}
          cashGiven={completedSale.cashGiven}
          change={completedSale.change}
          cashierName={completedSale.cashier}
          date={completedSale.date}
        />
      )}

      {/* Recent Sales Drawer */}
      <RecentSalesDrawer
        isOpen={showRecentSales}
        onClose={() => setShowRecentSales(false)}
        sales={recentSalesList}
        onSelectSaleForReprint={handleReprintSale}
      />
    </div>
  );
}
