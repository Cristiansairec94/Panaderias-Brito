import { TransferAccount, CardTerminalAccount } from "@/types";

export interface ExtendedTransferAccount extends TransferAccount {
  cardNumber?: string;
  cardType?: string;
  holder: string;
  themeColor: {
    bg: string;
    border: string;
    badge: string;
    gradient: string;
  };
}

export const DEFAULT_TRANSFER_ACCOUNTS: ExtendedTransferAccount[] = [
  {
    id: "cta-1",
    name: "Don Antonio Brito (Don Toño)",
    holder: "Antonio Brito Salgado",
    bank: "BBVA Bancomer",
    clabe: "012 180 01598423012 5",
    accountNumber: "159 842 3012",
    cardNumber: "4152 3138 9012 3456",
    cardType: "Tarjeta Débito BBVA",
    themeColor: {
      bg: "bg-blue-50/90",
      border: "border-blue-400",
      badge: "bg-blue-600 text-white",
      gradient: "from-blue-900 via-blue-800 to-indigo-950",
    },
  },
  {
    id: "cta-2",
    name: "Lupita Brito",
    holder: "María Guadalupe Brito",
    bank: "Banorte",
    clabe: "072 180 00847291104 8",
    accountNumber: "084 729 1104",
    cardNumber: "4915 6720 1104 8821",
    cardType: "Tarjeta Enlace Banorte",
    themeColor: {
      bg: "bg-rose-50/90",
      border: "border-rose-400",
      badge: "bg-rose-600 text-white",
      gradient: "from-red-950 via-rose-900 to-stone-950",
    },
  },
  {
    id: "cta-3",
    name: "Panaderías Brito (Cuenta Fiscal)",
    holder: "Panaderías y Pastelerías Brito S.A. de C.V.",
    bank: "Santander México",
    clabe: "014 180 06550914321 3",
    accountNumber: "655 091 4321",
    cardNumber: "5579 0914 4321 9081",
    cardType: "Cuenta Empresarial Santander",
    themeColor: {
      bg: "bg-red-50/90",
      border: "border-red-400",
      badge: "bg-red-600 text-white",
      gradient: "from-rose-950 via-red-900 to-neutral-950",
    },
  },
  {
    id: "cta-4",
    name: "Cobro Rápido Panadería Brito (STP / Terminal)",
    holder: "Panaderías Brito Digital STP",
    bank: "Mercado Pago / STP",
    clabe: "646 180 12345678901 2",
    accountNumber: "123 456 7890",
    cardNumber: "5256 7890 1234 5678",
    cardType: "STP / Mercado Pago Wallet",
    themeColor: {
      bg: "bg-sky-50/90",
      border: "border-sky-400",
      badge: "bg-sky-600 text-white",
      gradient: "from-sky-950 via-cyan-900 to-stone-950",
    },
  },
];

export const DEFAULT_CARD_TERMINALS: CardTerminalAccount[] = [
  {
    id: "term-1",
    name: "Terminal Mostrador Principal (Mercado Pago)",
    bank: "Mercado Pago / STP",
    accountDestination: "Cuenta Principal Mostrador",
    model: "Point Smart",
    terminalNumber: "MP-98421",
  },
  {
    id: "term-2",
    name: "Terminal BBVA Clip",
    bank: "BBVA Bancomer / Clip",
    accountDestination: "Don Antonio Brito",
    model: "Clip Pro",
    terminalNumber: "CLIP-5510",
  },
];
