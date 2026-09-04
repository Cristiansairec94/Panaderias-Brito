import { Customer } from "@/types";

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
    favoriteProduct: "Bolillo y Telera (150 pz)",
    purchaseCounts: { "Bolillo Caliente": 150, "Telera Tradicional": 80 },
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
    favoriteProduct: "Telera para Tortas (120 pz)",
    purchaseCounts: { "Telera Tradicional": 120 },
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
    favoriteProduct: "Pastelería y Eventos",
    purchaseCounts: { "Pastel Tres Leches": 2, "Pay de Queso": 5 },
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
    purchaseCounts: { "Concha de Vainilla": 24, "Concha de Chocolate": 18, "Dona de Azúcar": 15 },
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

    // Retrocompatibilidad: Asignar producto habitual (moda) a los clientes por defecto si les falta
    let updatedNeeded = false;
    cleaned.forEach((c: Customer) => {
      if (!c.favoriteProduct) {
        if (c.id === "cli-1") {
          c.favoriteProduct = "Bolillo y Telera (150 pz)";
          updatedNeeded = true;
        } else if (c.id === "cli-2") {
          c.favoriteProduct = "Telera para Tortas (120 pz)";
          updatedNeeded = true;
        } else if (c.id === "cli-3") {
          c.favoriteProduct = "Pastelería y Eventos";
          updatedNeeded = true;
        } else if (c.id === "cli-4") {
          c.favoriteProduct = "Pan Dulce (Conchas y Donas)";
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
  items: { name: string; quantity: number }[],
  saleAmount: number
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

    // Calcular la moda (producto con mayor frecuencia acumulada)
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

    customers[idx] = customer;
    saveStoredCustomers(customers);
  } catch (e) {
    console.error("Error recording customer purchase mode", e);
  }
}
