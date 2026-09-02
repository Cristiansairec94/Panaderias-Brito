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
  TrendingDown,
  Wallet,
  Coins,
  UserCheck,
  Layers
} from "lucide-react";
import { Product, CartItem, Sale, CashExpense } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import TicketModal from "@/components/pos/TicketModal";
import RecentSalesDrawer from "@/components/pos/RecentSalesDrawer";
import ExpensesModal from "@/components/pos/ExpensesModal";
import CashDrawerShiftModal from "@/components/pos/CashDrawerShiftModal";

const FALLBACK_PRODUCTS: Product[] = [
  {
    id: "1",
    name: "Concha de Vainilla",
    price: 12,
    category: "pan_dulce",
    icon: "🥖",
    stock: 50,
    tag: "Tradicional",
    description: "Esponjosa y suave con costra crujiente de azúcar y vainilla natural.",
    image: "https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?w=800&auto=format&fit=crop&q=80"
  },
  {
    id: "2",
    name: "Concha de Chocolate",
    price: 12,
    category: "pan_dulce",
    icon: "🍫",
    stock: 40,
    tag: "Favorito",
    description: "Masa fina aromatizada con cacao selecto y cubierta crujiente chocolatosa.",
    image: "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=800&auto=format&fit=crop&q=80"
  },
  {
    id: "3",
    name: "Cuerno de Mantequilla",
    price: 15,
    category: "pan_dulce",
    icon: "🥐",
    stock: 30,
    tag: "Artesanal",
    description: "Hojaldre 100% mantequilla pura de vaca, dorado y crujiente por capas.",
    image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&auto=format&fit=crop&q=80"
  },
  {
    id: "4",
    name: "Bolillo Tradicional",
    price: 5,
    category: "pan_blanco",
    icon: "🍞",
    stock: 150,
    tag: "Recién Salido",
    description: "Corteza dorada crujiente y migajón esponjoso, horneado en piso de piedra.",
    image: "https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?w=800&auto=format&fit=crop&q=80"
  },
  {
    id: "5",
    name: "Telera para Torta",
    price: 6,
    category: "pan_blanco",
    icon: "🥪",
    stock: 100,
    tag: "De la Casa",
    description: "Pan suave y dorado en tres secciones, el clásico para tortas mexicanas.",
    image: "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=800&auto=format&fit=crop&q=80"
  },
  {
    id: "6",
    name: "Oreja Hojaldrada",
    price: 14,
    category: "pan_dulce",
    icon: "🥨",
    stock: 35,
    tag: "Crujiente",
    description: "Hojaldre finamente caramelizado al horno con mantequilla y azúcar.",
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80"
  },
  {
    id: "7",
    name: "Dona Glaseada",
    price: 13,
    category: "pan_dulce",
    icon: "🍩",
    stock: 30,
    tag: "Más Vendido",
    description: "Masa esponjada frita a punto exacto con glaseado clásico brillante.",
    image: "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=800&auto=format&fit=crop&q=80"
  },
  {
    id: "8",
    name: "Rebanada Pastel 3 Leches",
    price: 45,
    category: "pasteleria",
    icon: "🍰",
    stock: 20,
    tag: "Gourmet",
    description: "Bizcocho húmedo bañado en infusión de tres leches y fresa fresca.",
    image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&auto=format&fit=crop&q=80"
  },
  {
    id: "9",
    name: "Pay de Queso con Zarzamora",
    price: 40,
    category: "pasteleria",
    icon: "🥧",
    stock: 15,
    tag: "Especialidad",
    description: "Base crujiente de galleta con suave crema de queso y zarzamora silvestre.",
    image: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=800&auto=format&fit=crop&q=80"
  },
  {
    id: "10",
    name: "Café de Olla Caliente",
    price: 25,
    category: "bebidas",
    icon: "☕",
    stock: 60,
    tag: "Calientito",
    description: "Café de grano selecto colado con canela criolla y toque de piloncillo.",
    image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80"
  },
  {
    id: "11",
    name: "Pan de Muerto Tradicional",
    price: 20,
    category: "temporada",
    icon: "✨",
    stock: 50,
    tag: "Temporada",
    description: "Aromatizado con flor de azahar y naranja, espolvoreado con azúcar fina.",
    image: "https://images.unsplash.com/photo-1621236378699-8597fee6a1ce?w=800&auto=format&fit=crop&q=80"
  },
  {
    id: "12",
    name: "Empanada de Calabaza",
    price: 16,
    category: "pan_dulce",
    icon: "🥟",
    stock: 25,
    tag: "Rellena",
    description: "Horneada al punto con relleno artesanal de dulce de calabaza y canela.",
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80"
  },
];

const INITIAL_EXPENSES: CashExpense[] = [
  {
    id: "EXP-001",
    amount: 145,
    category: "limpieza",
    description: "2 escobas y 1 bolsa de jabón Roma para lavado de charolas",
    cashier: "Don Toño Brito",
    date: "Hoy, 09:30 AM",
  },
  {
    id: "EXP-002",
    amount: 300,
    category: "retiro_personal",
    description: "Retiro para gastos personales de Don Toño",
    cashier: "Don Toño Brito",
    date: "Hoy, 11:15 AM",
  },
];

const CATEGORIES = [
  { id: "all", label: "Todo el Pan" },
  { id: "pan_dulce", label: "Pan Dulce Tradicional" },
  { id: "pan_blanco", label: "Bolillo & Telera" },
  { id: "pasteleria", label: "Pasteles & Pays" },
  { id: "bebidas", label: "Café & Bebidas" },
  { id: "temporada", label: "Especiales de Temporada" },
];

const QUICK_DENOMINATIONS = [20, 50, 100, 200, 500];

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>(FALLBACK_PRODUCTS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"efectivo" | "tarjeta" | "transferencia">("efectivo");
  const [cashGiven, setCashGiven] = useState<string>("");
  
  // Shift & Cashier state
  const [cashierName, setCashierName] = useState("Don Toño Brito");
  const [shiftName, setShiftName] = useState("Turno Matutino (06:00 - 14:00)");
  const [initialCashFund, setInitialCashFund] = useState(500);

  // Modals & Drawers state
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showRecentSales, setShowRecentSales] = useState(false);
  const [showExpensesModal, setShowExpensesModal] = useState(false);
  const [showCashDrawerModal, setShowCashDrawerModal] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [recentSalesList, setRecentSalesList] = useState<Sale[]>([]);
  const [expensesList, setExpensesList] = useState<CashExpense[]>(INITIAL_EXPENSES);
  
  // Status
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load products, recent sales & expenses from Supabase
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
          const mapped: Product[] = prodData.map((p: any) => {
            const fallbackMatch = FALLBACK_PRODUCTS.find((fb) => fb.name.toLowerCase() === p.name.toLowerCase());
            return {
              id: p.id,
              name: p.name,
              price: Number(p.price),
              category: p.category_id || "pan_dulce",
              icon: p.icon || "🥖",
              stock: p.stock || 0,
              image: p.image || fallbackMatch?.image,
              description: fallbackMatch?.description,
              tag: fallbackMatch?.tag || "Artesanal",
            };
          });
          setProducts(mapped);
          setIsDbConnected(true);
        }

        // 2. Load recent sales
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
            cashier: s.cashier || "Don Toño Brito",
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

        // 3. Load cash expenses from Supabase
        const { data: expData, error: expErr } = await supabase
          .from("cash_expenses")
          .select("*")
          .order("created_at", { ascending: false });

        if (expData && expData.length > 0 && !expErr) {
          const mappedExp: CashExpense[] = expData.map((e: any) => ({
            id: e.id,
            amount: Number(e.amount),
            category: e.category,
            description: e.description,
            cashier: e.cashier || "Don Toño Brito",
            date: new Date(e.created_at).toLocaleString("es-MX", {
              dateStyle: "short",
              timeStyle: "short",
            }),
          }));
          setExpensesList(mappedExp);
        }
      } catch (err) {
        console.log("Using fallback demo mode", err);
      }
    }
    loadInitialData();
  }, []);

  const filteredProducts = products.filter((prod) => {
    const matchesCat = selectedCategory === "all" || prod.category === selectedCategory;
    const matchesSearch = prod.name.toLowerCase().includes(search.toLowerCase()) || 
                          (prod.description && prod.description.toLowerCase().includes(search.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
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
              return item;
            }
            return newQ > 0 ? { ...item, quantity: newQ } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const total = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const totalPieces = cart.reduce((sum, item) => sum + item.quantity, 0);
  const parsedCashGiven = Number(cashGiven) || 0;
  const change = paymentMethod === "efectivo" && parsedCashGiven >= total ? parsedCashGiven - total : 0;
  const isPaymentValid = paymentMethod !== "efectivo" || parsedCashGiven >= total;

  // Financial calculations
  const totalCashSales = recentSalesList
    .filter((s) => s.paymentMethod === "efectivo")
    .reduce((sum, s) => sum + s.total, 0);
  const totalExpenses = expensesList.reduce((sum, e) => sum + e.amount, 0);
  const netCashInDrawer = initialCashFund + totalCashSales - totalExpenses;
  const totalStockValue = products.reduce((sum, p) => sum + (p.stock * p.price), 0);

  const handleQuickCash = (amount: number) => {
    setCashGiven(amount.toString());
  };

  const handleExactCash = () => {
    setCashGiven(total.toString());
  };

  const handleAddExpense = (newExpense: CashExpense) => {
    setExpensesList((prev) => [newExpense, ...prev]);
  };

  const handleCheckout = async () => {
    if (cart.length === 0 || !isPaymentValid || isSubmitting) return;
    setIsSubmitting(true);

    const currentItems = [...cart];
    const currentTotal = total;
    const currentPaymentMethod = paymentMethod;
    const currentCashGiven = paymentMethod === "efectivo" ? parsedCashGiven : undefined;
    const currentChange = paymentMethod === "efectivo" ? change : undefined;

    let createdSaleId = `POS-${Date.now().toString().slice(-6)}`;

    try {
      const supabase = createClient();
      
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

        const saleItemsToInsert = currentItems.map((item) => ({
          sale_id: saleData.id,
          product_id: item.product.id.includes("-") ? item.product.id : null,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: item.product.price,
          subtotal: item.product.price * item.quantity,
        }));
        await supabase.from("sale_items").insert(saleItemsToInsert);

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
      setProducts((prev) =>
        prev.map((prod) => {
          const bought = currentItems.find((ci) => ci.product.id === prod.id);
          if (bought) {
            return { ...prod, stock: Math.max(0, prod.stock - bought.quantity) };
          }
          return prod;
        })
      );

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
    <div className="flex h-full min-h-[calc(100vh-5rem)] overflow-hidden bg-stone-100/70">
      {/* Product Catalog Area (Main) */}
      <div className="flex-1 flex flex-col p-6 overflow-y-auto">
        {/* Top Control Bar */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md w-full">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Buscar concha, bolillo, pastel, dona..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white rounded-2xl border border-stone-200/90 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm text-sm"
              />
            </div>

            {/* Quick Actions & Live Financial Widgets */}
            <div className="flex items-center gap-2 flex-wrap self-end xl:self-auto">
              {/* BOTÓN PRINCIPAL: Dinero en Caja / Existencias / Turno */}
              <button
                onClick={() => setShowCashDrawerModal(true)}
                className="flex items-center gap-2.5 text-xs font-black bg-gradient-to-r from-amber-900 to-amber-950 text-white hover:from-black hover:to-black px-4 py-2.5 rounded-2xl shadow-md transition-all active:scale-95 border border-amber-800"
              >
                <Coins className="w-4 h-4 text-amber-400" />
                <div className="text-left">
                  <span className="text-[10px] text-amber-300 block leading-tight font-medium">
                    {cashierName} • {shiftName.split(" ")[0]}
                  </span>
                  <span className="text-xs font-black text-white">
                    Caja: {formatCurrency(netCashInDrawer)} | Stock: {formatCurrency(totalStockValue)}
                  </span>
                </div>
              </button>

              {/* Gastos / Salidas de Caja Button */}
              <button
                onClick={() => setShowExpensesModal(true)}
                className="flex items-center gap-1.5 text-xs font-black text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3.5 py-3 rounded-2xl shadow-sm transition-all active:scale-95"
              >
                <TrendingDown className="w-4 h-4 text-rose-600" />
                <span>Gastos:</span>
                <span className="font-extrabold text-rose-800">-{formatCurrency(totalExpenses)}</span>
              </button>

              {/* Turno / Ventas Recientes */}
              <button
                onClick={() => setShowRecentSales(true)}
                className="flex items-center gap-1.5 text-xs font-bold text-stone-800 bg-white hover:bg-stone-50 border border-stone-200/90 px-3.5 py-3 rounded-2xl shadow-sm transition-all active:scale-95"
              >
                <History className="w-4 h-4 text-amber-600" />
                <span>Turno ({recentSalesList.length})</span>
              </button>

              {/* Supabase status */}
              <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 bg-white border border-stone-200/90 px-3 py-3 rounded-2xl shadow-sm">
                <Database className={`w-4 h-4 ${isDbConnected ? "text-emerald-500" : "text-amber-500"}`} />
                <span className="hidden 2xl:inline">{isDbConnected ? "Supabase Online" : "Modo Demo"}</span>
              </div>
            </div>
          </div>

          {/* Category Filter Chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? "bg-amber-900 text-white shadow-md shadow-amber-950/20 scale-[1.02]"
                    : "bg-white text-stone-700 hover:bg-amber-50/80 border border-stone-200/80"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* High-End Bakery Product Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5 pb-14">
          {filteredProducts.map((product) => {
            const isOutOfStock = product.stock <= 0;
            const itemInCart = cart.find((i) => i.product.id === product.id);

            return (
              <div
                key={product.id}
                onClick={() => addToCart(product)}
                className={`group bg-white rounded-3xl border border-stone-200/90 overflow-hidden flex flex-col justify-between transition-all duration-300 relative select-none cursor-pointer ${
                  isOutOfStock
                    ? "opacity-60 cursor-not-allowed bg-stone-100"
                    : "hover:shadow-2xl hover:border-amber-400/90 hover:-translate-y-1 active:scale-[0.98]"
                }`}
              >
                {/* Active in-cart indicator */}
                {itemInCart && (
                  <span className="absolute top-3 right-3 z-20 bg-amber-600 text-white font-black text-xs px-2.5 py-1 rounded-full shadow-lg border-2 border-white animate-in zoom-in flex items-center gap-1">
                    <ShoppingBag className="w-3 h-3" /> {itemInCart.quantity} en charola
                  </span>
                )}

                {/* Big Hero Image Container */}
                <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-stone-100">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500 ease-out"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 text-6xl">
                      {product.icon || "🥖"}
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10 opacity-70 group-hover:opacity-50 transition-opacity" />

                  {/* Product Tag Badge */}
                  {product.tag && (
                    <div className="absolute top-3 left-3 z-10">
                      <span className="inline-flex items-center gap-1 bg-amber-950/80 backdrop-blur-md text-amber-200 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        {product.tag}
                      </span>
                    </div>
                  )}

                  {/* Stock Tag on Image */}
                  <div className="absolute bottom-3 left-3 z-10">
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full backdrop-blur-md shadow-sm ${
                      isOutOfStock
                        ? "bg-rose-600/90 text-white font-black"
                        : "bg-black/60 text-stone-100"
                    }`}>
                      {isOutOfStock ? "Agotado en mostrador" : `Disponibles: ${product.stock} pzas`}
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="font-extrabold text-stone-900 text-base leading-snug group-hover:text-amber-800 transition-colors">
                      {product.name}
                    </h3>
                    <p className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed font-sans">
                      {product.description || "Panadería artesanal horneada con la receta tradicional de la casa."}
                    </p>
                  </div>

                  {/* Price & Action Button */}
                  <div className="flex items-center justify-between pt-3 border-t border-stone-100">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-stone-400 block leading-none">Precio</span>
                      <span className="text-xl font-black text-amber-900 tracking-tight">
                        {formatCurrency(product.price)}
                      </span>
                    </div>

                    <button
                      disabled={isOutOfStock}
                      className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-black shadow-md transition-all ${
                        isOutOfStock
                          ? "bg-stone-200 text-stone-400 cursor-not-allowed"
                          : "bg-amber-600 group-hover:bg-amber-700 text-white shadow-amber-900/20 active:scale-95"
                      }`}
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span>Agregar</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cart & Cashier Sidebar (Right) */}
      <div className="w-[400px] bg-white border-l border-stone-200 flex flex-col h-full shadow-2xl">
        {/* Header */}
        <div className="p-4 px-5 border-b border-stone-100 flex items-center justify-between bg-amber-950 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-600 rounded-xl">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight">Charola de Cobro</h3>
              <p className="text-[10px] text-amber-300/80">{cashierName} • Mostrador</p>
            </div>
          </div>
          <span className="text-xs bg-amber-800/90 px-3 py-1.5 rounded-full font-extrabold text-amber-100">
            {totalPieces} {totalPieces === 1 ? "pieza" : "piezas"}
          </span>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-stone-400 text-center p-6 space-y-3">
              <div className="w-20 h-20 bg-amber-50/80 rounded-full flex items-center justify-center text-4xl shadow-inner">
                🧺
              </div>
              <p className="text-base font-bold text-stone-800">Charola vacía</p>
              <p className="text-xs text-stone-400 max-w-[220px] leading-relaxed">
                Toca cualquier pan del catálogo para agregarlo a la cuenta del cliente.
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.product.id}
                className="flex items-center justify-between p-3.5 bg-stone-50 hover:bg-amber-50/60 rounded-2xl border border-stone-200/80 transition-all gap-3"
              >
                {item.product.image && (
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    className="w-12 h-12 object-cover rounded-xl shrink-0 border border-stone-200"
                  />
                )}

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-xs text-stone-900 leading-tight truncate">{item.product.name}</p>
                  <p className="text-[11px] text-amber-800 font-semibold mt-0.5">
                    {formatCurrency(item.product.price)} c/u
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => updateQuantity(item.product.id, -1)}
                    className="p-1.5 hover:bg-stone-200 active:scale-90 rounded-xl text-stone-600 transition-all"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-black text-xs w-6 text-center text-stone-900">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.product.id, 1)}
                    className="p-1.5 hover:bg-stone-200 active:scale-90 rounded-xl text-stone-600 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-black text-xs text-stone-900 w-16 text-right">
                    {formatCurrency(item.product.price * item.quantity)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Payment Configuration & Checkout Area */}
        <div className="p-4 border-t border-stone-200 bg-stone-50/95 space-y-3">
          {/* Payment Method Selector */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Forma de Pago:</span>
            <div className="grid grid-cols-3 gap-2">
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
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-2xl text-xs font-extrabold transition-all ${
                      isSelected
                        ? "bg-amber-900 text-white shadow-md"
                        : "bg-white text-stone-700 hover:bg-stone-100 border border-stone-200"
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
          <div className="bg-white p-3.5 rounded-2xl border border-stone-200/90 space-y-1 shadow-sm">
            <div className="flex justify-between items-center text-xs font-medium text-stone-500">
              <span>Subtotal ({totalPieces} piezas):</span>
              <span>{formatCurrency(total)}</span>
            </div>
            <div className="flex justify-between items-center text-xl font-black text-stone-900 border-t border-stone-100 pt-1.5">
              <span>Total a Cobrar:</span>
              <span className="text-amber-800">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Cash Handling with Quick Denominations */}
          {paymentMethod === "efectivo" && (
            <div className="space-y-2 bg-amber-50/80 p-3.5 rounded-2xl border border-amber-200/80">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold text-stone-800">Paga con ($ Efectivo):</label>
                <button
                  onClick={handleExactCash}
                  disabled={cart.length === 0}
                  className="text-[11px] font-black text-amber-800 hover:underline active:scale-95 transition-transform"
                >
                  Cobro Exacto
                </button>
              </div>

              {/* Quick Bill Buttons */}
              <div className="grid grid-cols-5 gap-1.5">
                {QUICK_DENOMINATIONS.map((bill) => (
                  <button
                    key={bill}
                    onClick={() => handleQuickCash(bill)}
                    disabled={cart.length === 0}
                    className="py-2 bg-white hover:bg-amber-700 hover:text-white text-stone-900 font-black text-xs rounded-xl border border-amber-200 shadow-sm transition-all active:scale-95"
                  >
                    ${bill}
                  </button>
                ))}
              </div>

              {/* Custom Cash Input */}
              <input
                type="number"
                placeholder="O teclea la cantidad recibida..."
                value={cashGiven}
                onChange={(e) => setCashGiven(e.target.value)}
                className="w-full px-3.5 py-2 bg-white rounded-xl border border-amber-300 text-xs font-black text-stone-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />

              {/* Change Display */}
              {parsedCashGiven > 0 && (
                <div className={`flex justify-between items-center p-2.5 rounded-xl text-xs font-black border ${
                  parsedCashGiven >= total
                    ? "bg-emerald-100/90 text-emerald-950 border-emerald-300"
                    : "bg-rose-100 text-rose-900 border-rose-300"
                }`}>
                  <span>{parsedCashGiven >= total ? "Cambio a Entregar:" : "Falta por cubrir:"}</span>
                  <span className="text-base">
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
              className="px-3 py-3.5 bg-stone-200 hover:bg-stone-300 disabled:opacity-40 text-stone-700 font-bold rounded-2xl text-xs flex items-center justify-center gap-1 transition-all"
            >
              <Trash2 className="w-4 h-4" /> Cancelar
            </button>
            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || !isPaymentValid || isSubmitting}
              className="col-span-2 py-3.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-black rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-900/20 transition-all active:scale-95"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isSubmitting ? "Registrando Venta..." : "Cobrar & Ticket"}</span>
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

      {/* Expenses & Cash Out Modal */}
      <ExpensesModal
        isOpen={showExpensesModal}
        onClose={() => setShowExpensesModal(false)}
        expenses={expensesList}
        onAddExpense={handleAddExpense}
        cashSalesTotal={totalCashSales}
      />

      {/* Cash Drawer & Shift Control Modal */}
      <CashDrawerShiftModal
        isOpen={showCashDrawerModal}
        onClose={() => setShowCashDrawerModal(false)}
        cashierName={cashierName}
        onChangeCashier={setCashierName}
        shiftName={shiftName}
        onChangeShift={setShiftName}
        initialFund={initialCashFund}
        onChangeInitialFund={setInitialCashFund}
        sales={recentSalesList}
        expenses={expensesList}
        products={products}
      />
    </div>
  );
}
