"use client";

import { useState, useEffect, useRef, useMemo } from "react";
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
  Users,
  UserPlus,
  Star,
  Store,
  Cake,
  Phone,
  RefreshCw,
  Layers,
  ChevronDown,
  ChevronUp,
  Check,
  Filter,
  X,
  Building2,
  MapPin,
  ArrowRight,
  Lock,
  Unlock,
  KeyRound,
  Eye,
  EyeOff,
  ShieldCheck,
  Menu,
  Pencil
} from "lucide-react";
import { Product, CartItem, Sale, CashExpense, Customer, BreadDeliveryRecord } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { getStoredProducts, saveStoredProducts, DEFAULT_PRODUCTS, PRODUCT_CATEGORIES } from "@/lib/products";
import { 
  DEFAULT_GENERAL_CUSTOMER, 
  getStoredCustomers, 
  saveStoredCustomers, 
  addQuickCustomer 
} from "@/lib/customers";
import { useAuth } from "@/context/AuthContext";
import { useBranch } from "@/context/BranchContext";
import { useSidebar } from "@/context/SidebarContext";
import { useNotifications } from "@/context/NotificationContext";
import TicketModal from "@/components/pos/TicketModal";
import RecentSalesDrawer from "@/components/pos/RecentSalesDrawer";
import ExpensesModal from "@/components/pos/ExpensesModal";
import CashDrawerShiftModal from "@/components/pos/CashDrawerShiftModal";
import BreadDeliveryModal from "@/components/pos/BreadDeliveryModal";
import NotificationsDropdown from "@/components/layout/NotificationsDropdown";

const INITIAL_EXPENSES: CashExpense[] = [];

const POS_CATEGORIES = [
  { id: "all", label: "Todo el Pan", priceTag: "", icon: "🧺" },
  { id: "bolillo_3", label: "Bolillo $3", priceTag: "$3", icon: "🍞" },
  { id: "telera_350", label: "Telera $3.50", priceTag: "$3.50", icon: "🥪" },
  { id: "pambazo_4", label: "Pambazo $4", priceTag: "$4", icon: "🥖" },
  { id: "dulce_10", label: "Pan Dulce $10", priceTag: "$10", icon: "🥐" },
  { id: "dulce_12", label: "Dulce Especial $12", priceTag: "$12", icon: "🍫" },
  { id: "rollos_15", label: "Rollos $15", priceTag: "$15", icon: "🥨" },
  { id: "strudel_18", label: "Strudel $18", priceTag: "$18", icon: "🥧" },
  { id: "pastes_20", label: "Pastes $20", priceTag: "$20", icon: "🥟" },
  { id: "pizza_20", label: "Pizza $20", priceTag: "$20", icon: "🍕" },
  { id: "pay_25", label: "Pay $25", priceTag: "$25", icon: "🍰" },
  { id: "cuerno_65", label: "Cuerno $65", priceTag: "$65", icon: "🥐" },
  { id: "abarrotes", label: "Abarrotes", priceTag: "", icon: "🥫" },
  { id: "materia_prima", label: "Materia Prima", priceTag: "", icon: "🌾" },
];

function matchesPosCategory(prod: Product, catId: string): boolean {
  if (catId === "all") return true;
  if (prod.category === catId) return true;

  const name = prod.name.toLowerCase();
  const cat = prod.category?.toLowerCase() || "";
  const price = prod.price;

  switch (catId) {
    case "bolillo_3":
      return name.includes("bolillo") || price === 3 || price === 5;
    case "telera_350":
      return name.includes("telera") || price === 3.5 || price === 6;
    case "pambazo_4":
      return name.includes("pambazo") || price === 4;
    case "dulce_10":
      return (cat === "pan_dulce" && price <= 10) || name.includes("concha") || price === 10;
    case "dulce_12":
      return (cat === "pan_dulce" && price === 12) || price === 12;
    case "rollos_15":
      return name.includes("rollo") || name.includes("cuerno") || name.includes("oreja") || price === 15 || price === 14;
    case "strudel_18":
      return name.includes("strudel") || name.includes("empanada") || price === 18;
    case "pastes_20":
      return name.includes("paste") || price === 20;
    case "pizza_20":
      return name.includes("pizza") || price === 20;
    case "pay_25":
      return name.includes("pay") || cat === "pasteleria" || cat === "bebidas" || price === 25 || price === 40 || price === 45 || price === 30;
    case "cuerno_65":
      return name.includes("cuerno grande") || price >= 50;
    case "abarrotes":
      return cat === "abarrotes" || name.includes("leche");
    case "materia_prima":
      return cat === "materia_prima" || name.includes("harina");
    default:
      return prod.category === catId;
  }
}

const CATEGORIES = POS_CATEGORIES;
const QUICK_DENOMINATIONS = [20, 50, 100, 200, 500];

export default function POSPage() {
  const { user } = useAuth();
  const { branches, currentBranch, switchBranch, registerRealSale } = useBranch();
  const { addNotification } = useNotifications();
  const { toggleMobile } = useSidebar();
  const activeBranch = currentBranch || branches[0];

  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"efectivo" | "tarjeta" | "transferencia">("efectivo");
  const [cashGiven, setCashGiven] = useState<string>("");
  
  // Shift & Cashier state
  const [cashierName, setCashierName] = useState(activeBranch ? activeBranch.currentShift.cashier : "Cajera 1 - Turno Matutino");
  const [shiftName, setShiftName] = useState(activeBranch ? activeBranch.currentShift.name : "Turno Matutino (06:00 - 14:00)");
  const [initialCashFund, setInitialCashFund] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("brito_pos_initial_fund");
        if (saved && !isNaN(Number(saved))) return Number(saved);
      } catch (e) {}
    }
    return activeBranch ? activeBranch.currentShift.initialFund : 500;
  });

  // Auto-sync user and branch
  useEffect(() => {
    if (user) {
      const userBranch = branches.find((b) => b.assignedUserId === user.id);
      if (userBranch && currentBranch?.id !== userBranch.id) {
        switchBranch(userBranch.id);
      }
      setCashierName(user.name);
    }
  }, [user, branches]);

  // Sync shift info when branch changes
  useEffect(() => {
    if (activeBranch) {
      setInitialCashFund(activeBranch.currentShift.initialFund);
      setShiftName(activeBranch.currentShift.name);
      if (!user) {
        setCashierName(activeBranch.assignedUserName || activeBranch.currentShift.cashier);
      }
    }
  }, [activeBranch?.id, user]);

  // Modals & Drawers state
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showRecentSales, setShowRecentSales] = useState(false);
  const [showExpensesModal, setShowExpensesModal] = useState(false);
  const [showCashDrawerModal, setShowCashDrawerModal] = useState(false);
  const [showBreadDeliveryModal, setShowBreadDeliveryModal] = useState(false);
  const [breadDeliveriesList, setBreadDeliveriesList] = useState<BreadDeliveryRecord[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("brito_bread_deliveries");
        if (saved) return JSON.parse(saved);
      } catch (e) {}
    }
    return [];
  });
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [recentSalesList, setRecentSalesList] = useState<Sale[]>([]);
  const [expensesList, setExpensesList] = useState<CashExpense[]>(INITIAL_EXPENSES);
  const [shiftModalTab, setShiftModalTab] = useState<"cuentas" | "cambio" | "corte" | "historial">("cambio");
  
  // Customer State (Público General + Clientes Frecuentes, Mayoreo y Eventos)
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer>(DEFAULT_GENERAL_CUSTOMER);
  const [isCustomerPickerOpen, setIsCustomerPickerOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [customerTypeFilter, setCustomerTypeFilter] = useState<"all" | Customer["type"]>("all");
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const customerPickerRef = useRef<HTMLDivElement>(null);

  // New Customer Form State
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustType, setNewCustType] = useState<Customer["type"]>("frecuente");
  const [newCustCreditLimit, setNewCustCreditLimit] = useState("0");
  const [newCustNotes, setNewCustNotes] = useState("");

  // Status
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCategoryPanel, setShowCategoryPanel] = useState(false);
  const [showOperationsMenu, setShowOperationsMenu] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // Shift Lock State (Candado de Seguridad por Cierre de Turno)
  const [isShiftLocked, setIsShiftLocked] = useState(false);
  const [shiftFundInput, setShiftFundInput] = useState<string>("");

  const lastCutInfo = useMemo(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("brito_shift_cuts_history");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed[0];
          }
        }
      } catch (e) {}
    }
    return null;
  }, [isShiftLocked]);

  const baseShiftFund = useMemo(() => {
    if (lastCutInfo && typeof lastCutInfo.nextFund === "number") {
      return lastCutInfo.nextFund;
    }
    return initialCashFund;
  }, [lastCutInfo, initialCashFund]);

  // Sincronizar el cuadro editable cuando se bloquea la terminal o cambia baseShiftFund
  useEffect(() => {
    if (isShiftLocked) {
      setShiftFundInput(baseShiftFund ? baseShiftFund.toString() : "0");
    }
  }, [isShiftLocked, baseShiftFund]);

  const finalShiftFund = useMemo(() => {
    if (!shiftFundInput.trim()) return 0;
    const val = Number(shiftFundInput);
    return isNaN(val) ? 0 : Math.max(0, val);
  }, [shiftFundInput]);

  const handleDirectUnlockShift = () => {
    setInitialCashFund(finalShiftFund);
    try {
      localStorage.setItem("brito_pos_initial_fund", finalShiftFund.toString());
      localStorage.removeItem("brito_pos_shift_locked");
    } catch (e) {}
    setIsShiftLocked(false);
  };

  useEffect(() => {
    try {
      const locked = localStorage.getItem("brito_pos_shift_locked");
      if (locked === "true") {
        setIsShiftLocked(true);
      }
    } catch (e) {}
  }, []);

  // Load and synchronize customers
  useEffect(() => {
    setCustomers(getStoredCustomers());
    const handleCustomerSync = () => {
      setCustomers(getStoredCustomers());
    };
    window.addEventListener("brito_customers_updated", handleCustomerSync);
    return () => window.removeEventListener("brito_customers_updated", handleCustomerSync);
  }, []);

  // Close customer picker on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (customerPickerRef.current && !customerPickerRef.current.contains(event.target as Node)) {
        setIsCustomerPickerOpen(false);
      }
    }
    if (isCustomerPickerOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isCustomerPickerOpen]);

  const handleCreateQuickCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;

    const created = addQuickCustomer({
      name: newCustName.trim(),
      phone: newCustPhone.trim() || "Sin teléfono",
      type: "frecuente",
      creditLimit: 0,
      notes: newCustNotes.trim(),
    });

    setSelectedCustomer(created);
    setIsCustomerPickerOpen(false);
    setIsNewCustomerModalOpen(false);
    
    // Reset form
    setNewCustName("");
    setNewCustPhone("");
    setNewCustType("frecuente");
    setNewCustCreditLimit("0");
    setNewCustNotes("");
  };


  const handleCompleteShiftCut = () => {
    setRecentSalesList([]);
    setExpensesList([]);
    setShowCashDrawerModal(false);
    setIsShiftLocked(true);
    try {
      localStorage.setItem("brito_pos_shift_locked", "true");
    } catch (e) {}
  };

  // Load and synchronize products with catalog
  useEffect(() => {
    setProducts(getStoredProducts());

    const handleSync = () => {
      setProducts(getStoredProducts());
    };

    window.addEventListener("brito_products_updated", handleSync);
    return () => window.removeEventListener("brito_products_updated", handleSync);
  }, []);

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
            const fallbackMatch = DEFAULT_PRODUCTS.find((fb) => fb.name.toLowerCase() === p.name.toLowerCase());
            return {
              id: p.id,
              name: p.name,
              price: Number(p.price),
              category: p.category_id || "dulce_10",
              icon: p.icon || "🥐",
              stock: p.stock || 0,
              image: p.image || fallbackMatch?.image,
              description: fallbackMatch?.description,
              tag: fallbackMatch?.tag || `Pan $${p.price}`,
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
    const matchesCat = matchesPosCategory(prod, selectedCategory);
    const matchesSearch = 
      (prod.code && prod.code.toLowerCase().includes(search.toLowerCase())) ||
      prod.name.toLowerCase().includes(search.toLowerCase()) || 
      (prod.description && prod.description.toLowerCase().includes(search.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const addToCart = (product: Product) => {
    if (isShiftLocked) {
      setIsMobileCartOpen(true);
      return;
    }
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

  const addMultipleToCart = (product: Product, count: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isShiftLocked) {
      setIsMobileCartOpen(true);
      return;
    }
    if (product.stock <= 0) return;

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + count } : item
        );
      }
      return [...prev, { product, quantity: count }];
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

  const setExactQuantity = (id: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((item) => item.product.id !== id));
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === id ? { ...item, quantity: qty } : item
      )
    );
  };

  const total = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const totalPieces = cart.reduce((sum, item) => sum + item.quantity, 0);
  const parsedCashGiven = Number(cashGiven) || 0;
  const change = paymentMethod === "efectivo" && parsedCashGiven >= total ? parsedCashGiven - total : 0;
  const isPaymentValid = paymentMethod !== "efectivo" || parsedCashGiven >= total;

  // Financial calculations strictly for the current operating cashier's shift
  const currentShiftExpenses = useMemo(() => {
    return expensesList.filter((e) => {
      if (!e.cashier) return true;
      const cName = cashierName.toLowerCase().trim();
      const expCashier = e.cashier.toLowerCase().trim();
      return expCashier === cName || cName.includes(expCashier) || expCashier.includes(cName);
    });
  }, [expensesList, cashierName]);

  const totalCashSales = recentSalesList
    .filter((s) => s.paymentMethod === "efectivo")
    .reduce((sum, s) => sum + s.total, 0);
  const totalExpenses = currentShiftExpenses.reduce((sum, e) => sum + e.amount, 0);
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
      setProducts((prev) => {
        const updated = prev.map((prod) => {
          const bought = currentItems.find((ci) => ci.product.id === prod.id);
          if (bought) {
            return { ...prod, stock: Math.max(0, prod.stock - bought.quantity) };
          }
          return prod;
        });
        saveStoredProducts(updated);
        return updated;
      });

      const newSaleRecord: Sale = {
        id: createdSaleId,
        date: new Date().toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }),
        items: currentItems,
        total: currentTotal,
        paymentMethod: currentPaymentMethod,
        cashier: cashierName,
        cashGiven: currentCashGiven,
        change: currentChange,
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        customerType: selectedCustomer.type,
      };

      if (activeBranch) {
        const itemsSummary = currentItems.map((ci) => `${ci.quantity}x ${ci.product.name}`).join(", ");
        registerRealSale(activeBranch.id, currentTotal, currentPaymentMethod, cashierName, itemsSummary);
      }

      setCompletedSale(newSaleRecord);
      setRecentSalesList((prev) => [newSaleRecord, ...prev]);
      setIsSubmitting(false);
      setShowReceiptModal(true);
    }
  };

  const handleReceiveBreadDelivery = async (delivery: BreadDeliveryRecord) => {
    // 1. Sumar existencias en el catálogo local y estado
    setProducts((prev) => {
      const updated = prev.map((prod) => {
        const delivered = delivery.items.find((item) => item.productId === prod.id);
        if (delivered) {
          return { ...prod, stock: prod.stock + delivered.quantity };
        }
        return prod;
      });
      saveStoredProducts(updated);
      return updated;
    });

    // 2. Guardar en el historial de camionetas
    const updatedDeliveries = [delivery, ...breadDeliveriesList];
    setBreadDeliveriesList(updatedDeliveries);
    try {
      localStorage.setItem("brito_bread_deliveries", JSON.stringify(updatedDeliveries));
    } catch (e) {}

    // 3. Sincronizar en Supabase si está disponible
    try {
      const supabase = createClient();
      for (const item of delivery.items) {
        if (item.productId.includes("-")) {
          await supabase
            .from("products")
            .update({ stock: item.newStock })
            .eq("id", item.productId);
        }
      }
    } catch (err) {
      console.log("Offline mode or pending db sync", err);
    }

    // 4. Disparar notificación de pan surtido
    addNotification({
      senderName: `🚐 Camioneta Brito (${delivery.source})`,
      senderAvatar: "🥖",
      badgeIcon: "horno",
      title: "Entrada de Pan Recibida",
      highlightText: `+${delivery.totalPieces} piezas agregadas`,
      description: `Se ingresaron ${delivery.totalPieces} piezas de pan al mostrador recibidas por ${delivery.cashier}.`,
      category: "inventario",
    });
  };

  const handleReprintSale = (sale: Sale) => {
    setCompletedSale(sale);
    setShowRecentSales(false);
    setShowReceiptModal(true);
  };

  const resetSale = () => {
    setCart([]);
    setCashGiven("");
    setSelectedCustomer(DEFAULT_GENERAL_CUSTOMER);
    setShowReceiptModal(false);
    setCompletedSale(null);
  };

  const catalogScrollRef = useRef<HTMLDivElement>(null);

  const scrollToTop = () => {
    catalogScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToBottom = () => {
    if (catalogScrollRef.current) {
      catalogScrollRef.current.scrollTo({
        top: catalogScrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  const activeCategory = CATEGORIES.find((c) => c.id === selectedCategory);

  const filteredCustomers = customers.filter((c) => {
    const rawQ = customerSearchQuery.trim();
    if (!rawQ) return true;
    const q = rawQ.toLowerCase();
    const cleanPhoneQ = rawQ.replace(/\D/g, "");

    const nameMatch = c.name.toLowerCase().includes(q);
    const notesMatch = (c.notes || "").toLowerCase().includes(q);
    const addressMatch = (c.address || "").toLowerCase().includes(q);
    const cleanCustPhone = (c.phone || "").replace(/\D/g, "");
    const phoneMatch =
      (c.phone && c.phone.toLowerCase().includes(q)) ||
      (cleanPhoneQ.length >= 2 && cleanCustPhone.includes(cleanPhoneQ));

    return nameMatch || notesMatch || phoneMatch || addressMatch;
  });

  return (
    <div className="flex h-full w-full overflow-hidden bg-stone-100/70 relative">
      {/* PANTALLA DE BLOQUEO COMPLETA DE TODA LA HOJA DEL PUNTO DE VENTA */}
      {isShiftLocked && (
        <div className="absolute inset-0 z-50 bg-gradient-to-b from-[#1c0e08] via-[#140a05] to-[#0d0603] text-white flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-300">
          {/* Luces de fondo ambient */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-10 left-1/3 w-80 h-80 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="w-full max-w-lg my-auto relative z-10 flex flex-col justify-between py-6 space-y-5 animate-in zoom-in-95 duration-200">
            {/* Header del Relevo */}
            <div className="text-center space-y-2">
              <div className="w-18 h-18 sm:w-20 sm:h-20 mx-auto bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-amber-500/40 ring-4 ring-amber-400/40 text-white text-3xl sm:text-4xl animate-bounce">
                🪙
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-wide">
                  Relevo & Apertura de Turno
                </h2>
                <p className="text-xs sm:text-sm text-amber-300 font-bold mt-0.5">
                  Corte de caja registrado. Lista para que la cajera entrante comience a vender.
                </p>
              </div>
            </div>

            {/* Contenedor Principal de Información Financiera de Relevo */}
            <div className="bg-gradient-to-b from-[#24120a] to-[#1a0c06] border-2 border-amber-500/50 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
              
              {/* 1. TARJETA PROMINENTE: CON CUÁNTO DINERO SE INICIARÁ EL TURNO (CUADRO DIRECTO PARA EDITAR) */}
              <div className="bg-gradient-to-br from-amber-950/90 via-stone-900 to-amber-950/90 border-2 border-amber-400 p-5 sm:p-6 rounded-3xl text-center space-y-3 shadow-xl ring-2 ring-amber-400/20 relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />
                
                <span className="text-xs sm:text-sm font-black uppercase text-amber-300 tracking-wider flex items-center justify-center gap-1.5">
                  <span>🪙</span> Con este dinero se iniciará el turno:
                </span>

                {/* EL CUADRO PARA EDITAR DIRECTO */}
                <div className="relative max-w-sm mx-auto my-2">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-3xl sm:text-4xl text-amber-400 select-none">
                    $
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={shiftFundInput}
                    onChange={(e) => setShiftFundInput(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-12 pr-12 py-4 bg-black/65 border-2 border-amber-400 focus:border-amber-300 focus:ring-4 focus:ring-amber-400/30 rounded-2xl font-black text-4xl sm:text-5xl text-amber-300 text-center tracking-tight focus:outline-none transition-all shadow-inner [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  {shiftFundInput && (
                    <button
                      type="button"
                      onClick={() => setShiftFundInput("")}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-white flex items-center justify-center font-black text-sm transition-all cursor-pointer"
                      title="Borrar para escribir nuevo monto"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="inline-block bg-amber-500/20 text-amber-200 text-[11px] font-bold px-3 py-1 rounded-full border border-amber-400/30">
                  Fondo Inicial disponible en el cajón para cambio
                </div>
              </div>

              {/* 2. RESUMEN: TOTAL DE DINERO QUE HUBO ANTERIORMENTE */}
              <div className="bg-stone-900/90 border border-stone-700/80 p-4 rounded-2xl text-xs space-y-2 shadow-inner">
                <div className="flex items-center justify-between pb-2 border-b border-stone-800">
                  <span className="text-stone-400 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <span>📊</span> Total de dinero en el turno anterior:
                  </span>
                  <span className="font-black text-white text-base sm:text-lg">
                    {formatCurrency(lastCutInfo ? lastCutInfo.countedCash : initialCashFund)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-0.5">
                  <div className="bg-stone-950/60 p-2 rounded-xl border border-stone-800">
                    <span className="text-stone-400 block text-[10px]">Entregó el turno:</span>
                    <span className="font-extrabold text-stone-200 truncate block mt-0.5">
                      👩‍🍳 {lastCutInfo ? lastCutInfo.outgoingCashier : "Cajera Anterior"}
                    </span>
                  </div>
                  <div className="bg-stone-950/60 p-2 rounded-xl border border-stone-800">
                    <span className="text-stone-400 block text-[10px]">Comprobante / Folio:</span>
                    <span className="font-extrabold text-amber-300 truncate block mt-0.5 font-mono">
                      🧾 {lastCutInfo ? lastCutInfo.id : "CORTE-RELEVO"}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. RELEVO DE QUIÉN TOMA EL TURNO */}
              <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-emerald-950/80 to-stone-900 border border-emerald-500/40 rounded-2xl">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 bg-emerald-600/30 rounded-xl border border-emerald-400/40 flex items-center justify-center text-lg shrink-0">
                    👩‍🍳
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] text-emerald-400 uppercase font-black tracking-wider block">
                      Toma el turno ahora:
                    </span>
                    <span className="text-sm font-black text-white truncate block">
                      {cashierName}
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-emerald-300 bg-emerald-900/60 px-2.5 py-1 rounded-lg border border-emerald-500/30 shrink-0">
                  {shiftName.split(" ")[0]}
                </span>
              </div>

              {/* 4. BOTÓN DIRECTO DE 1 SOLO TOQUE PARA COMENZAR INMEDIATAMENTE (SIN CONTRASEÑAS) */}
              <button
                type="button"
                onClick={handleDirectUnlockShift}
                className="w-full py-4.5 sm:py-5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-stone-950 font-black rounded-2xl text-base sm:text-lg flex items-center justify-center gap-2.5 shadow-2xl shadow-amber-500/30 active:scale-95 transition-all hover:scale-[1.02] cursor-pointer animate-pulse"
              >
                <span>🚀</span>
                <span>TOMAR TURNO Y COMENZAR A COBRAR ➔</span>
              </button>
            </div>

            <div className="text-center text-[11px] text-stone-500 font-medium">
              Panaderías Brito • Sistema Punto de Venta • Relevo Rápido
            </div>
          </div>
        </div>
      )}

      {/* Product Catalog Area (Main) con espacio y scrollbar estilizado */}
      <div 
        ref={catalogScrollRef}
        className="flex-1 flex flex-col min-w-0 px-4 lg:px-5 pb-6 pt-0 pr-3 sm:pr-4 overflow-y-auto scroll-smooth relative"
      >
        {/* Top Fixed Header Toolbar & Category Panel Container (Anclado y sellado al ras para tapar el espacio) */}
        <div className={`sticky top-0 z-30 -mx-4 lg:-mx-5 px-4 py-2.5 lg:px-5 lg:py-3 bg-stone-100 border-b border-stone-200/90 shadow-sm transition-all duration-200 ${showCategoryPanel ? "space-y-2 pb-2.5 mb-3" : "mb-4"}`}>
          <div className="flex items-center justify-between gap-3 w-full">
            {/* Botón Menú Móvil */}
            <button
              type="button"
              onClick={toggleMobile}
              className="md:hidden p-3 rounded-2xl bg-white hover:bg-stone-50 text-stone-700 transition-colors border-2 border-stone-200 shrink-0 shadow-xs"
              title="Abrir menú"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Buscador de Productos (Grande, Claro y Cómodo) */}
            <div className="relative flex-1 max-w-xl">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Buscar dulce $10, bolillo, telera, pizza, strudel..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-10 py-3.5 bg-white rounded-2xl border-2 border-stone-300 focus:border-amber-600 focus:outline-none shadow-xs text-sm font-bold text-stone-800 placeholder:text-stone-400 transition-all"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Botón Grande: Categorías y Precios (Fijo con colores oficiales, texto y tamaño estables) */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setShowCategoryPanel(!showCategoryPanel)}
                className="flex items-center gap-2.5 px-4 sm:px-5 py-3.5 rounded-2xl border-2 border-amber-400 bg-white hover:bg-amber-50 text-stone-900 text-sm sm:text-base font-black transition-all active:scale-95 shadow-sm whitespace-nowrap"
                title="Mostrar u ocultar panel de categorías y precios"
              >
                <span className="text-xl">🧺</span>
                <span>Categorías y Precios</span>
                {selectedCategory !== "all" && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCategory("all");
                      setShowCategoryPanel(false);
                    }}
                    className="w-5 h-5 rounded-full bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center text-xs font-black transition-transform active:scale-90 ml-0.5"
                    title="Ver todo el pan y quitar filtro"
                  >
                    ✕
                  </span>
                )}
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 text-stone-400 ${showCategoryPanel ? "rotate-180" : ""}`} />
              </button>
            </div>

            {/* Botón Surtir / Entrada de Pan (Camionetas) */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setShowBreadDeliveryModal(true)}
                className="flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-3.5 rounded-2xl border-2 border-emerald-300 hover:border-emerald-500 bg-emerald-50 hover:bg-emerald-100/90 text-emerald-950 text-sm sm:text-base font-black shadow-sm transition-all active:scale-95 whitespace-nowrap cursor-pointer"
                title="Registrar pan recibido de las camionetas o taller"
              >
                <span className="text-lg">🚐</span>
                <span>Entrada de Pan</span>
              </button>
            </div>

            {/* Botón Gasto Rápido (Colores, texto y tamaño estables) */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (isShiftLocked) {
                    addNotification({
                      senderName: "🔒 Terminal Bloqueada",
                      senderAvatar: "⚠️",
                      badgeIcon: "alerta",
                      title: "Terminal Bloqueada",
                      highlightText: "Turno cerrado por seguridad",
                      description: "Debes desbloquear la terminal ingresando las credenciales de la encargada antes de registrar gastos.",
                      category: "caja",
                    });
                    return;
                  }
                  setShowExpensesModal(true);
                }}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-3.5 rounded-2xl border-2 transition-all active:scale-95 shadow-xs whitespace-nowrap ${
                  isShiftLocked
                    ? "border-stone-300 bg-stone-100 text-stone-400 opacity-60 cursor-not-allowed"
                    : "border-rose-200 hover:border-rose-400 bg-rose-50 hover:bg-rose-100/80 text-rose-900 text-sm sm:text-base font-black"
                }`}
                title={isShiftLocked ? "Terminal bloqueada" : "Registrar salida o gasto de dinero"}
              >
                <span className="text-lg">💸</span>
                <span>Gasto</span>
              </button>
            </div>

            {/* Botón Destacado: Cerrar Turno & Bloquear Punto de Venta */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (isShiftLocked) {
                    addNotification({
                      senderName: "🔒 Terminal Bloqueada",
                      senderAvatar: "ℹ️",
                      badgeIcon: "alerta",
                      title: "Turno Ya Cerrado",
                      highlightText: "La terminal ya está bloqueada",
                      description: "El turno anterior ya fue cerrado. Ingresa las credenciales de la encargada en la terminal para habilitar el nuevo turno.",
                      category: "caja",
                    });
                    return;
                  }
                  setShiftModalTab("cambio");
                  setShowCashDrawerModal(true);
                }}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-3.5 rounded-2xl border-2 transition-all active:scale-95 shadow-md shadow-orange-950/20 whitespace-nowrap ${
                  isShiftLocked
                    ? "border-amber-900/60 bg-gradient-to-r from-stone-800 to-stone-900 text-amber-300"
                    : "border-amber-600/80 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-700 hover:to-orange-700 text-white text-sm sm:text-base font-black"
                }`}
                title={isShiftLocked ? "Turno ya cerrado y bloqueado" : "Cerrar turno de la cajera y bloquear la terminal con candado"}
              >
                <Lock className="w-4 h-4 text-amber-200" />
                <span>{isShiftLocked ? "Turno Cerrado 🔒" : "Cerrar Turno"}</span>
              </button>
            </div>

            {/* Campana de Notificaciones Frontal */}
            <div className="relative shrink-0">
              <NotificationsDropdown />
            </div>

            {/* Botón Móvil para Ver Charola / Carrito */}
            <div className="relative shrink-0 lg:hidden">
              <button
                type="button"
                onClick={() => setIsMobileCartOpen(true)}
                className="relative flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shadow-md shadow-amber-600/30 active:scale-95 transition-all"
                title="Abrir charola de cobro"
              >
                <ShoppingBag className="w-4 h-4" />
                <span className="hidden sm:inline">Charola</span>
                {totalPieces > 0 && (
                  <span className="w-5 h-5 bg-rose-600 text-white rounded-full text-[10px] font-black flex items-center justify-center border-2 border-white">
                    {totalPieces}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Tarjeta CATEGORÍAS Y PRECIOS COMPACTA (Permite ver el pan y productos simultáneamente) */}
          {showCategoryPanel && (
            <div className="bg-white/95 backdrop-blur-xs rounded-2xl p-2.5 sm:p-3 border-2 border-amber-200/90 shadow-md space-y-2 shrink-0 animate-in fade-in duration-200">
              {/* Cabecera Compacta */}
              <div className="flex items-center justify-between pb-1.5 border-b border-stone-100 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <Layers className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <h3 className="text-[11px] font-black text-stone-800 uppercase tracking-wider truncate">
                    Categorías y Precios
                  </h3>
                  {selectedCategory !== "all" && (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 shrink-0">
                      Filtro: {activeCategory?.label}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {selectedCategory !== "all" && (
                    <button
                      type="button"
                      onClick={() => setSelectedCategory("all")}
                      className="text-[11px] font-black text-amber-900 hover:text-amber-950 px-2 py-0.5 rounded-lg bg-amber-100/70 hover:bg-amber-200 transition-colors"
                    >
                      Mostrar Todo
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowCategoryPanel(false)}
                    className="text-[11px] font-bold text-stone-500 hover:text-stone-800 bg-stone-100 hover:bg-stone-200 px-2.5 py-0.5 rounded-lg transition-colors"
                  >
                    Ocultar ✕
                  </button>
                </div>
              </div>

              {/* Cuadrícula de Categorías y Precios Completos (Sin cortes ni puntos suspensivos) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7 gap-2 max-h-[190px] overflow-y-auto pr-1">
                {CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  const count = cat.id === "all"
                    ? products.length
                    : products.filter((p) => matchesPosCategory(p, cat.id)).length;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat.id);
                      }}
                      className={`relative px-3 py-2.5 rounded-xl text-left transition-all duration-150 flex items-center justify-between gap-2 border active:scale-95 shadow-2xs ${
                        isSelected
                          ? "bg-[#2d1810] text-amber-50 shadow-xs font-black border-amber-500 ring-1 ring-amber-400"
                          : "bg-stone-50/90 hover:bg-amber-50/90 hover:border-amber-300 text-stone-900 border-stone-200/90"
                      }`}
                      title={`${cat.label} (${count} productos)`}
                    >
                      {/* Icono + Nombre y Precio Completo */}
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-lg shrink-0">{cat.icon}</span>
                        <span className="font-black text-xs leading-snug whitespace-normal break-words">
                          {cat.label}
                        </span>
                      </div>

                      {/* Badge de Conteo y botón X si está seleccionado */}
                      <div className="flex items-center gap-1 shrink-0">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-black ${
                          isSelected
                            ? "bg-amber-500 text-stone-950"
                            : "bg-stone-200/90 text-stone-700"
                        }`}>
                          {count}
                        </span>

                        {isSelected && cat.id !== "all" && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCategory("all");
                              setShowCategoryPanel(false);
                            }}
                            title="Ver todo el pan"
                            className="w-4 h-4 rounded-full bg-amber-400 hover:bg-amber-300 text-stone-950 flex items-center justify-center font-black text-[9px] transition-transform active:scale-90"
                          >
                            ✕
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4 pb-12">
          {filteredProducts.map((product) => {
            const isOutOfStock = product.stock <= 0;
            const itemInCart = cart.find((i) => i.product.id === product.id);

            return (
              <div
                key={product.id}
                onClick={() => addToCart(product)}
                className={`group bg-white rounded-2xl border border-stone-200/90 overflow-hidden flex flex-col justify-between transition-all duration-200 relative select-none cursor-pointer ${
                  isOutOfStock
                    ? "opacity-60 cursor-not-allowed bg-stone-100"
                    : "hover:shadow-lg hover:border-amber-400 hover:-translate-y-0.5 active:scale-[0.99]"
                }`}
              >
                {/* Active in-cart indicator */}
                {itemInCart && (
                  <span className="absolute top-2.5 right-2.5 z-20 bg-amber-600 text-white font-black text-xs px-2.5 py-0.5 rounded-full shadow-md border-2 border-white animate-in zoom-in flex items-center gap-1">
                    <ShoppingBag className="w-3 h-3" /> {itemInCart.quantity} en charola
                  </span>
                )}

                {/* Compact Image Container */}
                <div className="relative h-32 sm:h-36 w-full overflow-hidden bg-stone-100">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 text-5xl">
                      {product.icon || "🥐"}
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10 opacity-60 group-hover:opacity-30 transition-opacity" />

                  {/* PROMINENT PRICE BADGE (Top Right) */}
                  <div className="absolute top-2.5 right-2.5 z-10">
                    <span className="inline-flex items-center gap-0.5 bg-gradient-to-r from-amber-600 to-amber-700 text-white font-black text-xs px-2.5 py-0.5 rounded-xl shadow-md border border-white/80">
                      <span>{formatCurrency(product.price)}</span>
                      {product.unit && (
                        <span className="text-[10px] font-bold text-amber-100">
                          /{product.unit === "kg" ? "kg" : product.unit === "g" ? "g" : "pz"}
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Stock Tag on Image */}
                  <div className="absolute bottom-2.5 left-2.5 z-10">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-md shadow-xs ${
                      isOutOfStock
                        ? "bg-rose-600/90 text-white font-black"
                        : "bg-black/65 text-stone-100"
                    }`}>
                      {isOutOfStock ? "Agotado" : `${product.stock} disp.`}
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-3 sm:p-3.5 flex-1 flex flex-col justify-between space-y-1.5">
                  <div>
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="min-w-0">
                        <h3 className="font-extrabold text-stone-900 text-sm sm:text-base leading-snug group-hover:text-amber-800 transition-colors line-clamp-2 break-words">
                          {product.name}
                        </h3>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-black text-amber-900 text-base">
                          {formatCurrency(product.price)}
                        </span>
                        {product.unit && (
                          <span className="text-[11px] font-bold text-amber-700 ml-1">
                            /{product.unit === "kg" ? "kg" : product.unit === "g" ? "g" : "pz"}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5 line-clamp-1 font-sans">
                      {product.description || "Panadería artesanal horneada diariamente."}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Backdrop for Cart */}
      {isMobileCartOpen && (
        <div
          onClick={() => setIsMobileCartOpen(false)}
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        />
      )}

      {/* Cart & Cashier Sidebar (Right on desktop, sliding drawer on phone - Amplia y Espaciosa) */}
      <div className={`fixed lg:static inset-y-0 right-0 z-40 w-full sm:w-[420px] lg:w-[460px] xl:w-[500px] 2xl:w-[540px] shrink-0 bg-white border-l-2 border-stone-200 flex flex-col h-full shadow-2xl transition-transform duration-300 ease-in-out relative overflow-hidden ${
        isMobileCartOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
      }`}>
        {/* Header con colores de la marca y micro-animación */}
        <div className="p-2.5 px-4 border-b border-amber-900/50 flex items-center justify-between bg-gradient-to-r from-[#24130c] via-[#2d1810] to-[#3d1d11] text-white shadow-md relative overflow-hidden shrink-0">
          <div className="absolute -top-6 -right-6 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center gap-2.5 relative z-10">
            <div className="p-2 bg-gradient-to-tr from-amber-500 to-orange-500 rounded-xl shadow-md shadow-amber-500/30 ring-2 ring-amber-400/40">
              <ShoppingBag className="w-4 h-4 text-white" />
            </div>
            <div>
                  <h3 className="font-black text-sm sm:text-base leading-tight tracking-wide text-white flex items-center gap-1.5">
                    Charola de Cobro
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </h3>
                  <p className="text-[11px] text-amber-300 font-bold">{cashierName} • Mostrador</p>
                </div>
              </div>
              <div className="flex items-center gap-2 relative z-10">
                <span className={`text-xs px-3 py-1 rounded-full font-black tracking-wide transition-all ${
                  totalPieces > 0
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-stone-950 shadow-md shadow-amber-500/30 ring-2 ring-amber-300/60 scale-105 animate-pulse"
                    : "bg-amber-900/60 text-amber-200 border border-amber-800"
                }`}>
                  {totalPieces} {totalPieces === 1 ? "pieza" : "piezas"}
                </span>
                <button
                  type="button"
                  onClick={() => setIsMobileCartOpen(false)}
                  className="lg:hidden p-1 rounded-lg bg-white/10 hover:bg-white/20 text-amber-200 transition-colors"
                  title="Cerrar charola"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

        {/* CUSTOMER SELECTION / SMART SEARCH QUICK BAR */}
        <div ref={customerPickerRef} className="p-2 sm:px-3 bg-gradient-to-r from-amber-50/90 via-stone-50 to-orange-50/70 border-b border-amber-200/80 shrink-0 relative">
          {selectedCustomer.type === "general" ? (
            /* 1. MODO BÚSQUEDA RÁPIDA / PÚBLICO GENERAL */
            <div className="flex items-center gap-2 w-full">
              {/* Buscador Inteligente Integrado Directo */}
              <div className="flex-1 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-amber-700 pointer-events-none" />
                <input
                  type="text"
                  placeholder="🔍 Buscar cliente rápido (Teléfono, Nombre o Característica)..."
                  value={customerSearchQuery}
                  onFocus={() => setIsCustomerPickerOpen(true)}
                  onChange={(e) => {
                    setCustomerSearchQuery(e.target.value);
                    if (!isCustomerPickerOpen) setIsCustomerPickerOpen(true);
                  }}
                  className="w-full pl-9 pr-8 py-2 bg-white rounded-xl text-xs font-bold text-stone-900 border-2 border-amber-300/90 focus:border-amber-500 focus:ring-2 focus:ring-amber-400/20 focus:outline-none transition-all placeholder:text-stone-400 shadow-2xs"
                />
                {customerSearchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerSearchQuery("");
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>


              {/* Botón Registrar Nuevo Cliente */}
              <button
                type="button"
                onClick={() => {
                  setNewCustName("");
                  setNewCustPhone("");
                  setNewCustNotes("");
                  setIsNewCustomerModalOpen(true);
                  setIsCustomerPickerOpen(false);
                }}
                className="py-2 px-3 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs shadow-2xs transition-all active:scale-95 border border-amber-400 flex items-center gap-1 shrink-0"
                title="Registrar nuevo cliente"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="text-[11px]">Nuevo</span>
              </button>
            </div>
          ) : (
            /* 2. MODO CLIENTE ASIGNADO */
            <div className="flex items-center justify-between gap-2 w-full">
              {/* Tarjeta del cliente asignado */}
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shrink-0 shadow-xs font-bold text-sm">
                  ⭐
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-black text-xs text-stone-900 truncate" title={selectedCustomer.name}>
                      {selectedCustomer.name}
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                      Cliente Asignado
                    </span>
                  </div>
                  <p className="text-[10px] text-stone-500 font-medium truncate">
                    {selectedCustomer.phone && selectedCustomer.phone !== "N/A" && selectedCustomer.phone !== "Sin teléfono" ? `📞 ${selectedCustomer.phone}` : "Cliente frecuente"}
                    {selectedCustomer.notes ? ` • 📝 ${selectedCustomer.notes}` : ""}
                  </p>
                </div>
              </div>

              {/* Acciones */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomer(DEFAULT_GENERAL_CUSTOMER);
                    setCustomerSearchQuery("");
                    setIsCustomerPickerOpen(false);
                  }}
                  className="px-2.5 py-1.5 rounded-xl text-stone-600 hover:text-rose-700 bg-white hover:bg-rose-50 border border-stone-200 hover:border-rose-200 text-xs font-bold transition-all flex items-center gap-1 shadow-2xs active:scale-95"
                  title="Volver a Público General"
                >
                  <X className="w-3.5 h-3.5 text-rose-500" />
                  <span className="text-[11px]">General</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsCustomerPickerOpen(!isCustomerPickerOpen)}
                  className={`p-1.5 px-2.5 rounded-xl text-xs font-black flex items-center gap-1 transition-all active:scale-95 shadow-2xs border ${
                    isCustomerPickerOpen
                      ? "bg-stone-900 text-amber-300 border-stone-900 shadow-md"
                      : "bg-white hover:bg-amber-100/70 text-stone-800 border-stone-200"
                  }`}
                  title="Buscar otro cliente"
                >
                  <Search className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-[11px] hidden sm:inline">Buscar</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNewCustName("");
                    setNewCustPhone("");
                    setNewCustNotes("");
                    setIsNewCustomerModalOpen(true);
                    setIsCustomerPickerOpen(false);
                  }}
                  className="p-1.5 px-2.5 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs shadow-2xs transition-all active:scale-95 border border-amber-400 flex items-center gap-1"
                  title="Registrar nuevo cliente"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Nuevo</span>
                </button>
              </div>
            </div>
          )}

          {/* Customer Dropdown Popover con resultados desplegables */}
          {isCustomerPickerOpen && (
            <div className="absolute left-2 right-2 top-full mt-1.5 z-50 bg-white rounded-2xl shadow-2xl border-2 border-amber-400/90 p-3 space-y-2.5 animate-in fade-in zoom-in-95 duration-150 max-h-[400px] flex flex-col">
              {/* Popover Header */}
              <div className="flex items-center justify-between pb-1 border-b border-stone-100">
                <span className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-amber-600" /> Resultados de Clientes
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-stone-400 font-bold">
                    {filteredCustomers.length} {filteredCustomers.length === 1 ? "resultado" : "resultados"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsCustomerPickerOpen(false)}
                    className="p-0.5 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Options List */}
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[240px]">
                {/* Default Público General Quick Select Option */}
                {!customerSearchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCustomer(DEFAULT_GENERAL_CUSTOMER);
                      setIsCustomerPickerOpen(false);
                    }}
                    className={`w-full p-2.5 rounded-xl flex items-center justify-between text-left transition-all border ${
                      selectedCustomer.id === DEFAULT_GENERAL_CUSTOMER.id
                        ? "bg-amber-50 border-amber-300 ring-1 ring-amber-300"
                        : "bg-stone-50/70 hover:bg-amber-50/50 border-stone-200"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-stone-200 text-stone-700 flex items-center justify-center font-bold text-sm shrink-0">
                        👤
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-xs text-stone-900">Público General (Mostrador)</p>
                        <p className="text-[10px] text-stone-500 font-medium">Venta rápida sin registro</p>
                      </div>
                    </div>
                    {selectedCustomer.id === DEFAULT_GENERAL_CUSTOMER.id && (
                      <Check className="w-4 h-4 text-amber-600 shrink-0" />
                    )}
                  </button>
                )}

                {filteredCustomers
                  .filter((c) => c.id !== "cli-0")
                  .map((c) => {
                    const isSelected = selectedCustomer.id === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(c);
                          setIsCustomerPickerOpen(false);
                          setCustomerSearchQuery("");
                        }}
                        className={`w-full p-2.5 rounded-xl flex items-center justify-between text-left transition-all border ${
                          isSelected
                            ? "bg-amber-50 border-amber-300 ring-1 ring-amber-300 shadow-2xs"
                            : "bg-white hover:bg-amber-50/50 border-stone-200"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                            ⭐
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="font-black text-xs text-stone-900 truncate block">
                              {c.name}
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-stone-500 font-medium mt-0.5">
                              {c.phone && c.phone !== "N/A" && c.phone !== "Sin teléfono" && (
                                <span className="font-bold text-stone-700">📞 {c.phone}</span>
                              )}
                              {c.notes && (
                                <span className="text-amber-900 bg-amber-50 border border-amber-200/80 px-1.5 py-0.2 rounded">
                                  📝 {c.notes}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <Check className="w-4 h-4 text-amber-600 shrink-0" />
                        )}
                      </button>
                    );
                  })}

                {filteredCustomers.filter((c) => c.id !== "cli-0").length === 0 && (
                  <div className="p-4 text-center space-y-1.5 bg-stone-50 rounded-xl border border-dashed border-stone-200">
                    <p className="text-xs font-black text-stone-700">No se encontró el cliente</p>
                    <p className="text-[10px] text-stone-500">¿Deseas registrarlo con estos datos?</p>
                    <button
                      type="button"
                      onClick={() => {
                        const isPhone = /^\d+$/.test(customerSearchQuery.replace(/\s+/g, ""));
                        if (isPhone) {
                          setNewCustPhone(customerSearchQuery);
                          setNewCustName("");
                        } else {
                          setNewCustName(customerSearchQuery);
                          setNewCustPhone("");
                        }
                        setNewCustNotes("");
                        setIsNewCustomerModalOpen(true);
                        setIsCustomerPickerOpen(false);
                      }}
                      className="mt-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-stone-950 rounded-xl text-xs font-black transition-all active:scale-95 shadow-xs cursor-pointer"
                    >
                      + Registrar como nuevo
                    </button>
                  </div>
                )}
              </div>

              {/* Bottom Quick Register Action */}
              <div className="pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => {
                    setNewCustName("");
                    setNewCustPhone("");
                    setNewCustNotes("");
                    setIsNewCustomerModalOpen(true);
                    setIsCustomerPickerOpen(false);
                  }}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Registrar Nuevo Cliente</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Cart Items List - Optimizado para ver al menos 5 productos simultáneamente */}
        <div className="flex-1 overflow-y-auto p-2.5 sm:p-3 space-y-1.5">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-2 animate-in fade-in zoom-in-95 duration-200">
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-amber-100 via-orange-50 to-amber-50 rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-amber-200">
                  🧺
                </div>
              </div>
              <div className="space-y-0.5">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black uppercase tracking-wider border border-amber-200">
                  Mostrador Listo
                </span>
                <p className="text-sm font-black text-stone-900">Charola vacía</p>
                <p className="text-[11px] text-stone-500 max-w-[220px] leading-relaxed mx-auto font-medium">
                  Toca cualquier pan del mostrador para agregarlo al pedido.
                </p>
              </div>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.product.id}
                className="p-2 sm:p-2.5 bg-white hover:bg-amber-50/30 rounded-2xl border border-stone-200 hover:border-amber-300 transition-all shadow-2xs hover:shadow-xs space-y-1.5"
              >
                <div className="flex items-center gap-2 sm:gap-2.5">
                  {/* Foto del Pan */}
                  {item.product.image ? (
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-11 h-11 sm:w-12 sm:h-12 object-cover rounded-xl shrink-0 border border-amber-200 shadow-2xs"
                    />
                  ) : (
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-amber-100 flex items-center justify-center text-xl shrink-0 border border-amber-200">
                      🥖
                    </div>
                  )}

                  {/* Nombre y Precio Unitario */}
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-xs sm:text-sm text-stone-900 leading-tight truncate" title={item.product.name}>
                      {item.product.name}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-xs text-amber-800 font-black">
                        {formatCurrency(item.product.price)}
                      </span>
                      <span className="text-[10px] text-stone-400 font-medium">c/pieza</span>
                    </div>
                  </div>

                  {/* Controles de Piezas y Total de línea */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.product.id, -1)}
                      className="w-7 h-7 flex items-center justify-center bg-stone-100 hover:bg-amber-100 active:scale-90 rounded-lg text-stone-800 transition-all font-black border border-stone-200 shadow-2xs"
                      title="Restar 1 pieza"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>

                    {/* Input editable directo para escribir piezas (ej. 100 bolillos) */}
                    <input
                      type="number"
                      min="1"
                      max="9999"
                      value={item.quantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setExactQuantity(item.product.id, isNaN(val) ? 1 : Math.max(1, val));
                      }}
                      onFocus={(e) => e.target.select()}
                      className="w-11 h-7 text-center font-black text-xs sm:text-sm bg-white border border-amber-400 focus:border-amber-600 rounded-lg focus:outline-none shadow-inner text-stone-900 cursor-text"
                      title="Haz clic para escribir la cantidad de piezas directamente (ej. 100)"
                    />

                    <button
                      type="button"
                      onClick={() => updateQuantity(item.product.id, 1)}
                      className="w-7 h-7 flex items-center justify-center bg-stone-100 hover:bg-amber-100 active:scale-90 rounded-lg text-stone-800 transition-all font-black border border-stone-200 shadow-2xs"
                      title="Sumar 1 pieza"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>

                    <span className="font-black text-xs sm:text-sm text-stone-900 min-w-[56px] text-right pl-1">
                      {formatCurrency(item.product.price * item.quantity)}
                    </span>

                    <button
                      type="button"
                      onClick={() => setExactQuantity(item.product.id, 0)}
                      className="p-1 text-stone-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-0.5"
                      title="Eliminar de la charola"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Micro-chips de mayoreo sutiles y compactos */}
                <div className="flex items-center gap-1 pt-1 border-t border-stone-100 text-[10px] justify-end">
                  <span className="text-stone-400 font-extrabold mr-auto text-[10px]">Mayoreo rápido:</span>
                  {[10, 20, 50, 100].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setExactQuantity(item.product.id, qty)}
                      className={`px-1.5 py-0.5 rounded-md text-[10px] font-black transition-all active:scale-95 ${
                        item.quantity === qty
                          ? "bg-amber-600 text-white shadow-2xs"
                          : "bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-900"
                      }`}
                      title={`Fijar a ${qty} piezas de ${item.product.name}`}
                    >
                      {qty} pzs
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Payment Configuration & Checkout Area (Más grande, números destacados y micro-animaciones) */}
        <div className="p-3 sm:p-4 border-t-2 border-stone-200/80 bg-gradient-to-b from-stone-50 via-white to-amber-50/40 space-y-2.5 shadow-xl shrink-0">
          {/* Fila Principal: Total a Cobrar + Selector de Forma de Pago */}
          <div className="bg-gradient-to-br from-[#24130c] via-[#2d1810] to-[#1f100a] text-white p-3 sm:p-3.5 px-4 rounded-2xl shadow-lg border-2 border-amber-900/70 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-amber-300/90 flex items-center gap-1.5">
                <span>Total a Cobrar</span>
                <span className="text-amber-200/70 font-bold">({totalPieces} {totalPieces === 1 ? "pz" : "pzs"})</span>
              </div>
              <div className="text-3xl sm:text-4xl font-black text-amber-400 tracking-tight leading-none mt-1 transition-all duration-300">
                {formatCurrency(total)}
              </div>
            </div>

            {/* Selector de Método de Pago integrado y animado */}
            <div className="flex items-center bg-black/40 p-1.5 rounded-xl border border-white/10 gap-1.5 shrink-0">
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
                    type="button"
                    onClick={() => setPaymentMethod(m.id as any)}
                    className={`flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs sm:text-sm font-black transition-all duration-200 active:scale-95 ${
                      isSelected
                        ? "bg-gradient-to-r from-amber-500 to-orange-500 text-stone-950 shadow-md scale-105 ring-2 ring-amber-300/40"
                        : "text-amber-200/80 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="hidden xs:inline">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Manejo de Efectivo con Números Grandes y Animados */}
          {paymentMethod === "efectivo" && (
            <div className="p-3 bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-stone-50 rounded-2xl border-2 border-amber-300/90 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200 shadow-xs">
              {/* Billetes rápidos + Cobro Exacto con Números Más Grandes */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleExactCash}
                  disabled={cart.length === 0}
                  className="px-3 py-2.5 rounded-xl bg-gradient-to-r from-amber-200 to-amber-300 hover:from-amber-300 hover:to-amber-400 text-stone-950 text-xs sm:text-sm font-black shrink-0 transition-all active:scale-90 hover:scale-105 shadow-sm"
                  title="Cobro Exacto"
                >
                  ⚡ Exacto
                </button>
                <div className="grid grid-cols-5 gap-1.5 flex-1">
                  {QUICK_DENOMINATIONS.map((bill) => (
                    <button
                      key={bill}
                      type="button"
                      onClick={() => handleQuickCash(bill)}
                      disabled={cart.length === 0}
                      className="py-2 sm:py-2.5 bg-white hover:bg-gradient-to-tr hover:from-amber-500 hover:to-orange-500 hover:text-white text-stone-900 font-black text-sm sm:text-base rounded-xl border-2 border-amber-200 shadow-xs transition-all duration-200 active:scale-90 hover:scale-105 text-center"
                    >
                      ${bill}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input de cantidad recibida y badge de cambio con Tipografía Grande */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-black text-sm">💵</span>
                  <input
                    type="number"
                    placeholder="Paga con... ($)"
                    value={cashGiven}
                    onChange={(e) => setCashGiven(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-white rounded-xl border-2 border-amber-400 focus:border-amber-600 focus:ring-2 focus:ring-amber-400/30 text-sm sm:text-base font-black text-stone-900 focus:outline-none shadow-inner placeholder:text-stone-400 placeholder:font-medium transition-all"
                  />
                </div>

                {parsedCashGiven > 0 && (
                  <div className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-black flex items-center gap-1.5 shrink-0 shadow-md animate-in zoom-in-95 duration-150 ${
                    parsedCashGiven >= total
                      ? "bg-emerald-600 text-white"
                      : "bg-rose-600 text-white"
                  }`}>
                    <span className="text-[11px] opacity-90">{parsedCashGiven >= total ? "Cambio:" : "Falta:"}</span>
                    <span className="font-black text-sm sm:text-base">
                      {parsedCashGiven >= total ? formatCurrency(change) : formatCurrency(total - parsedCashGiven)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Botones de Acción */}
          <div className="grid grid-cols-4 gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => {
                setCart([]);
                setCashGiven("");
              }}
              disabled={cart.length === 0}
              className="col-span-1 py-3 bg-stone-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 disabled:opacity-40 text-stone-600 font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 border border-stone-200 transition-all active:scale-95 shadow-xs"
              title="Limpiar charola"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Limpiar</span>
            </button>
            <button
              type="button"
              onClick={handleCheckout}
              disabled={cart.length === 0 || !isPaymentValid || isSubmitting}
              className={`col-span-3 py-3 sm:py-3.5 rounded-xl text-sm sm:text-base font-black flex items-center justify-center gap-2 transition-all duration-200 shadow-md ${
                cart.length > 0 && isPaymentValid && !isSubmitting
                  ? "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-[1.01] active:scale-95 border border-amber-300/70 ring-2 ring-amber-400/40"
                  : "bg-stone-200 text-stone-400 border border-stone-300/60 opacity-60 cursor-not-allowed"
              }`}
            >
              <CheckCircle className={`w-5 h-5 ${cart.length > 0 && isPaymentValid ? "animate-bounce" : ""}`} />
              <span>{isSubmitting ? "Registrando Venta..." : "Cobrar & Ticket"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Floating Bottom Bar on Mobile when Cart has items */}
      {cart.length > 0 && !isMobileCartOpen && (
        <div className="lg:hidden fixed bottom-4 left-3 right-3 z-30 animate-in slide-in-from-bottom-3 duration-200">
          <button
            type="button"
            onClick={() => setIsMobileCartOpen(true)}
            className="w-full bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white p-3 rounded-2xl shadow-xl shadow-amber-950/40 flex items-center justify-between font-black text-xs sm:text-sm active:scale-98 transition-all border border-white/20"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-base">
                🧺
              </div>
              <div className="text-left">
                <p className="text-[10px] font-bold text-amber-200 leading-tight">Charola ({totalPieces} {totalPieces === 1 ? "pz" : "pzs"})</p>
                <p className="text-xs sm:text-sm font-black text-white">Ver orden y cobrar</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-black bg-white text-stone-950 px-3 py-1 rounded-xl shadow-sm">
                {formatCurrency(total)}
              </span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

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
          customerName={completedSale.customerName || "Público General"}
          customerType={completedSale.customerType}
          branchName={activeBranch ? activeBranch.name : "Sucursal Matriz"}
          branchAddress={activeBranch ? activeBranch.address : undefined}
          branchPhone={activeBranch ? activeBranch.phone : undefined}
          date={completedSale.date}
        />
      )}

      {/* Modal de Registro Rápido de Nuevo Cliente (Simple: Teléfono, Nombre y Característica) */}
      {isNewCustomerModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border-2 border-amber-900/30 text-stone-900 animate-in zoom-in-95 duration-200">
            {/* Header café tostado oficial Panadería Brito */}
            <div className="bg-gradient-to-r from-[#24130c] via-[#2d1810] to-[#3d1d11] p-4 px-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-gradient-to-tr from-amber-500 to-orange-500 rounded-xl text-white shadow-md">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white">Registrar Nuevo Cliente</h3>
                  <p className="text-[10px] text-amber-300 font-medium">Asignación directa a la venta actual</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewCustomerModalOpen(false)}
                className="p-1 rounded-lg text-amber-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Formulario Simple */}
            <form onSubmit={handleCreateQuickCustomer} className="p-5 space-y-4 text-xs">
              {/* 1. Teléfono */}
              <div>
                <label className="block text-stone-700 font-extrabold mb-1">
                  📱 Número Telefónico (WhatsApp)
                </label>
                <input
                  type="tel"
                  autoFocus
                  placeholder="ej. 55 1234 5678"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border-2 border-stone-200 focus:border-amber-500 focus:bg-white rounded-xl font-bold text-stone-900 focus:outline-none transition-all text-sm"
                />
              </div>

              {/* 2. Nombre */}
              <div>
                <label className="block text-stone-700 font-extrabold mb-1">
                  👤 Nombre del Cliente <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Doña Lupita o Don Carlos"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border-2 border-stone-200 focus:border-amber-500 focus:bg-white rounded-xl font-bold text-stone-900 focus:outline-none transition-all text-sm"
                />
              </div>

              {/* 3. Característica Opcional */}
              <div>
                <label className="block text-stone-700 font-extrabold mb-1">
                  ✨ Característica o Detalle <span className="text-stone-400 font-normal">(Opcional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="ej. Vecina de la esquina, le gusta el bolillo bien dorado, pide 10 teleras..."
                  value={newCustNotes}
                  onChange={(e) => setNewCustNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border-2 border-stone-200 focus:border-amber-500 focus:bg-white rounded-xl font-medium text-stone-900 focus:outline-none transition-all text-xs leading-relaxed"
                />
              </div>

              {/* Botones */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsNewCustomerModalOpen(false)}
                  className="px-4 py-2.5 text-stone-600 hover:text-stone-900 font-bold rounded-xl hover:bg-stone-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!newCustName.trim()}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 text-white font-black rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Guardar y Asignar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
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
        cashierName={cashierName}
      />

      {/* Cash Drawer & Shift Control Modal */}
      {showCashDrawerModal && (
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
          initialTab={shiftModalTab}
          onCompleteShiftCut={handleCompleteShiftCut}
        />
      )}

      {/* Bread Delivery Modal (Recepción de Pan de Camionetas) */}
      {showBreadDeliveryModal && (
        <BreadDeliveryModal
          isOpen={showBreadDeliveryModal}
          onClose={() => setShowBreadDeliveryModal(false)}
          products={products}
          onConfirmDelivery={handleReceiveBreadDelivery}
          cashierName={cashierName}
          deliveriesHistory={breadDeliveriesList}
        />
      )}
    </div>
  );
}
