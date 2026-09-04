import { Customer } from "@/types";

export const STORAGE_CUSTOMERS_KEY = "brito_customers";

export const DEFAULT_GENERAL_CUSTOMER: Customer = {
  id: "cli-0",
  name: "Público General",
  phone: "N/A",
  type: "general",
  creditLimit: 0,
  currentDebt: 0,
  totalPurchases: 45800,
  notes: "Venta de mostrador al contado sin registro previo.",
  registeredAt: "2026-01-01",
};

export const INITIAL_CUSTOMERS: Customer[] = [
  DEFAULT_GENERAL_CUSTOMER,
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
    return parsed;
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
    notes: customerData.notes?.trim(),
    address: customerData.address?.trim(),
    email: customerData.email?.trim(),
    registeredAt: new Date().toISOString().split("T")[0],
  };

  const updated = [...current, newCustomer];
  saveStoredCustomers(updated);
  return newCustomer;
}
