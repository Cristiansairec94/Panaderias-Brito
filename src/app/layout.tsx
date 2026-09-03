import type { Metadata } from "next";
import { Satisfy, Dancing_Script } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { NotificationProvider } from "@/context/NotificationContext";
import AppLayout from "@/components/layout/AppLayout";

const satisfy = Satisfy({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-satisfy",
  display: "swap",
});

const dancingScript = Dancing_Script({
  weight: ["600", "700"],
  subsets: ["latin"],
  variable: "--font-dancing",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Panadería Bakery Brito - Sistema ERP & POS",
  description: "Sistema integral de punto de venta, inventario y gestión para Panadería Brito (Don Toño)",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${satisfy.variable} ${dancingScript.variable}`}>
      <body className="antialiased font-sans">
        <AuthProvider>
          <NotificationProvider>
            <AppLayout>
              {children}
            </AppLayout>
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
