import { Customer, CustomerPurchase } from "@/types";

export const STORAGE_CUSTOMERS_KEY = "brito_customers";

export const DEFAULT_GENERAL_CUSTOMER: Customer = {
  id: "cli-0",
  name: "Clientes Generales",
  phone: "N/A",
  type: "general",
  creditLimit: 0,
  currentDebt: 0,
  totalPurchases: 45800,
  notes: "Venta de mostrador al contado para clientes generales.",
  registeredAt: "2026-01-01",
};

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: "cli-1",
    name: "Abarrotes 'La Guadalupana' (Don Pepe)",
    phone: "55 4433 2211",
    email: "laguadalupana@gmail.com",
    address: "Av. Hidalgo #124, Col. Centro",
    type: "mayoreo",
    creditLimit: 3000,
    currentDebt: 850,
    totalPurchases: 18500,
    favoriteProduct: "Bolillo Caliente y Telera",
    purchaseCounts: {
      "Bolillo Caliente": 450,
      "Telera Tradicional": 240,
      "Pan Dulce Surtido": 45,
    },
    purchaseHistory: [
      {
        id: "comp-101",
        date: "04/09/2026, 07:15 AM",
        total: 730,
        branchName: "Sucursal Matriz (Centro)",
        cashier: "Don Toño Brito",
        paymentMethod: "efectivo",
        items: [
          { name: "Bolillo Caliente", quantity: 150, unitPrice: 3, subtotal: 450 },
          { name: "Telera Tradicional", quantity: 80, unitPrice: 3.5, subtotal: 280 },
        ],
      },
      {
        id: "comp-102",
        date: "03/09/2026, 07:20 AM",
        total: 730,
        branchName: "Sucursal Matriz (Centro)",
        cashier: "Don Toño Brito",
        paymentMethod: "efectivo",
        items: [
          { name: "Bolillo Caliente", quantity: 150, unitPrice: 3, subtotal: 450 },
          { name: "Telera Tradicional", quantity: 80, unitPrice: 3.5, subtotal: 280 },
        ],
      },
      {
        id: "comp-103",
        date: "02/09/2026, 07:10 AM",
        total: 775,
        branchName: "Sucursal Matriz (Centro)",
        cashier: "Lupita Brito",
        paymentMethod: "transferencia",
        items: [
          { name: "Bolillo Caliente", quantity: 150, unitPrice: 3, subtotal: 450 },
          { name: "Telera Tradicional", quantity: 80, unitPrice: 3.5, subtotal: 280 },
          { name: "Pan Dulce Surtido", quantity: 5, unitPrice: 9, subtotal: 45 },
        ],
      },
    ],
    notes: "Compra 150 bolillos y 80 teleras diario. Pago semanal los viernes.",
    registeredAt: "2026-03-15",
  },
  {
    id: "cli-2",
    name: "Taquería 'El Pastorcito Dorado'",
    phone: "55 9988 1122",
    address: "Calle Juárez #45",
    type: "mayoreo",
    creditLimit: 2000,
    currentDebt: 0,
    totalPurchases: 12400,
    favoriteProduct: "Telera Tradicional (Tortas)",
    purchaseCounts: {
      "Telera Tradicional": 360,
      "Bolillo Caliente": 60,
    },
    purchaseHistory: [
      {
        id: "comp-201",
        date: "04/09/2026, 11:30 AM",
        total: 420,
        branchName: "Sucursal San Benito (Mercado)",
        cashier: "Maestro Juan",
        paymentMethod: "efectivo",
        items: [
          { name: "Telera Tradicional", quantity: 120, unitPrice: 3.5, subtotal: 420 },
        ],
      },
      {
        id: "comp-202",
        date: "02/09/2026, 11:00 AM",
        total: 420,
        branchName: "Sucursal San Benito (Mercado)",
        cashier: "Maestro Juan",
        paymentMethod: "efectivo",
        items: [
          { name: "Telera Tradicional", quantity: 120, unitPrice: 3.5, subtotal: 420 },
        ],
      },
      {
        id: "comp-203",
        date: "31/08/2026, 10:45 AM",
        total: 510,
        branchName: "Sucursal San Benito (Mercado)",
        cashier: "Carlos Mendoza",
        paymentMethod: "efectivo",
        items: [
          { name: "Telera Tradicional", quantity: 120, unitPrice: 3.5, subtotal: 420 },
          { name: "Bolillo Caliente", quantity: 30, unitPrice: 3, subtotal: 90 },
        ],
      },
    ],
    notes: "Compra 120 teleras para tortas cada 2 días.",
    registeredAt: "2026-04-10",
  },
  {
    id: "cli-3",
    name: "Sra. María González",
    phone: "55 1234 5678",
    email: "maria.gonzalez@hotmail.com",
    address: "Privada de los Pinos #12",
    type: "evento",
    creditLimit: 0,
    currentDebt: 450,
    totalPurchases: 3200,
    favoriteProduct: "Pastel Tres Leches y Repostería",
    purchaseCounts: {
      "Pastel Tres Leches Especial": 2,
      "Pay de Queso con Zarzamora": 6,
      "Concha de Vainilla": 15,
    },
    purchaseHistory: [
      {
        id: "comp-301",
        date: "20/08/2026, 05:40 PM",
        total: 1450,
        branchName: "Sucursal Las Flores (Plaza)",
        cashier: "Elena Brito",
        paymentMethod: "tarjeta",
        items: [
          { name: "Pastel Tres Leches Especial", quantity: 1, unitPrice: 1200, subtotal: 1200 },
          { name: "Pay de Queso con Zarzamora", quantity: 2, unitPrice: 125, subtotal: 250 },
        ],
      },
      {
        id: "comp-302",
        date: "15/08/2026, 06:15 PM",
        total: 150,
        branchName: "Sucursal Matriz (Centro)",
        cashier: "Lupita Brito",
        paymentMethod: "efectivo",
        items: [
          { name: "Concha de Vainilla", quantity: 15, unitPrice: 10, subtotal: 150 },
        ],
      },
    ],
    notes: "Pastel XV años pedido PED-101 (Flores lilas). Anticipo pagado.",
    registeredAt: "2026-08-20",
  },
  {
    id: "cli-4",
    name: "Familia Ramírez (Vecinos)",
    phone: "55 7766 5544",
    type: "frecuente",
    creditLimit: 500,
    currentDebt: 0,
    totalPurchases: 4800,
    favoriteProduct: "Pan Dulce (Conchas y Donas)",
    purchaseCounts: {
      "Concha de Chocolate": 38,
      "Concha de Vainilla": 32,
      "Dona de Azúcar": 22,
      "Bolillo Caliente": 18,
    },
    purchaseHistory: [
      {
        id: "comp-401",
        date: "03/09/2026, 08:30 PM",
        total: 68,
        branchName: "Sucursal Matriz (Centro)",
        cashier: "Don Toño Brito",
        paymentMethod: "efectivo",
        items: [
          { name: "Concha de Chocolate", quantity: 4, unitPrice: 10, subtotal: 40 },
          { name: "Dona de Azúcar", quantity: 2, unitPrice: 10, subtotal: 20 },
          { name: "Bolillo Caliente", quantity: 4, unitPrice: 2, subtotal: 8 },
        ],
      },
      {
        id: "comp-402",
        date: "02/09/2026, 08:45 PM",
        total: 60,
        branchName: "Sucursal Matriz (Centro)",
        cashier: "Lupita Brito",
        paymentMethod: "efectivo",
        items: [
          { name: "Concha de Vainilla", quantity: 3, unitPrice: 10, subtotal: 30 },
          { name: "Concha de Chocolate", quantity: 3, unitPrice: 10, subtotal: 30 },
        ],
      },
      {
        id: "comp-403",
        date: "01/09/2026, 08:15 PM",
        total: 76,
        branchName: "Sucursal Matriz (Centro)",
        cashier: "Don Toño Brito",
        paymentMethod: "efectivo",
        items: [
          { name: "Concha de Chocolate", quantity: 5, unitPrice: 10, subtotal: 50 },
          { name: "Dona de Azúcar", quantity: 2, unitPrice: 10, subtotal: 20 },
          { name: "Bolillo Caliente", quantity: 3, unitPrice: 2, subtotal: 6 },
        ],
      },
    ],
    notes: "Cliente fiel, compra pan dulce todas las noches.",
    registeredAt: "2026-02-01",
  },
];

export function getStoredCustomers(): Customer[] {
  if (typeof window === "undefined") return INITIAL_CUSTOMERS;
  try {
    const raw = localStorage.getItem(STORAGE_CUSTOMERS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_CUSTOMERS_KEY, JSON.stringify(INITIAL_CUSTOMERS));
      return INITIAL_CUSTOMERS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_CUSTOMERS_KEY, JSON.stringify(INITIAL_CUSTOMERS));
      return INITIAL_CUSTOMERS;
    }
    // Depurar y eliminar cualquier cliente virtual de mostrador (cli-0 / general) del listado guardado
    const cleaned = parsed.filter((c: Customer) => c.id !== "cli-0" && c.type !== "general");

    // Retrocompatibilidad: Asignar producto habitual (moda) e historial a los clientes por defecto si les falta
    let updatedNeeded = false;
    cleaned.forEach((c: Customer) => {
      const defaultMatch = INITIAL_CUSTOMERS.find((init) => init.id === c.id);
      if (defaultMatch) {
        if (!c.favoriteProduct) {
          c.favoriteProduct = defaultMatch.favoriteProduct;
          updatedNeeded = true;
        }
        if (!c.purchaseCounts || Object.keys(c.purchaseCounts).length === 0) {
          c.purchaseCounts = defaultMatch.purchaseCounts;
          updatedNeeded = true;
        }
        if (!c.purchaseHistory || c.purchaseHistory.length === 0) {
          c.purchaseHistory = defaultMatch.purchaseHistory;
          updatedNeeded = true;
        }
      }
    });

    if (cleaned.length !== parsed.length || updatedNeeded) {
      localStorage.setItem(STORAGE_CUSTOMERS_KEY, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch {
    return INITIAL_CUSTOMERS;
  }
}

export function saveStoredCustomers(customers: Customer[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_CUSTOMERS_KEY, JSON.stringify(customers));
    window.dispatchEvent(new Event("brito_customers_updated"));
  } catch (e) {
    console.error("Error saving customers to localStorage", e);
  }
}

export function addQuickCustomer(customerData: {
  name: string;
  phone?: string;
  type?: Customer["type"];
  creditLimit?: number;
  notes?: string;
  address?: string;
  email?: string;
  favoriteProduct?: string;
}): Customer {
  const current = getStoredCustomers();
  const newCustomer: Customer = {
    id: `cli-${Date.now()}`,
    name: customerData.name.trim(),
    phone: customerData.phone?.trim() || "N/A",
    type: customerData.type || "frecuente",
    creditLimit: customerData.creditLimit || 0,
    currentDebt: 0,
    totalPurchases: 0,
    favoriteProduct: customerData.favoriteProduct?.trim() || undefined,
    purchaseCounts: {},
    purchaseHistory: [],
    notes: customerData.notes?.trim(),
    address: customerData.address?.trim(),
    email: customerData.email?.trim(),
    registeredAt: new Date().toISOString().split("T")[0],
  };

  const updated = [...current, newCustomer];
  saveStoredCustomers(updated);
  return newCustomer;
}

/**
 * Registra los productos de una venta para un cliente y calcula automáticamente la MODA estadística
 * (el producto que compra con mayor frecuencia / más piezas)
 */
export function recordCustomerSale(
  customerId: string,
  items: { name: string; quantity: number; unitPrice?: number; subtotal?: number }[],
  saleAmount: number,
  branchName?: string,
  cashier?: string,
  paymentMethod?: string
): void {
  if (typeof window === "undefined" || !customerId || customerId === "cli-0") return;
  try {
    const customers = getStoredCustomers();
    const idx = customers.findIndex((c) => c.id === customerId);
    if (idx === -1) return;

    const customer = { ...customers[idx] };
    customer.totalPurchases = (customer.totalPurchases || 0) + saleAmount;

    // Actualizar conteos acumulados de compra por producto
    const counts: Record<string, number> = { ...(customer.purchaseCounts || {}) };
    for (const it of items) {
      if (it.name) {
        counts[it.name] = (counts[it.name] || 0) + (it.quantity || 1);
      }
    }
    customer.purchaseCounts = counts;

    // Calcular la moda estadística (producto con mayor frecuencia acumulada)
    let maxCount = 0;
    let modeItem = customer.favoriteProduct || "";
    for (const [prodName, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        modeItem = prodName;
      }
    }

    if (modeItem) {
      customer.favoriteProduct = modeItem;
    }

    // Registrar en el historial de compras del cliente
    const newPurchase: CustomerPurchase = {
      id: `comp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      date: new Date().toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }),
      total: saleAmount,
      branchName: branchName || "Sucursal Matriz",
      cashier: cashier || "Don Toño Brito",
      paymentMethod: paymentMethod || "efectivo",
      items: items.map((it) => ({
        name: it.name,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        subtotal: it.subtotal || (it.unitPrice ? it.unitPrice * it.quantity : undefined),
      })),
    };

    customer.purchaseHistory = [newPurchase, ...(customer.purchaseHistory || [])];

    customers[idx] = customer;
    saveStoredCustomers(customers);
  } catch (e) {
    console.error("Error recording customer purchase mode", e);
  }
}
