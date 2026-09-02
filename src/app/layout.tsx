import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { NotificationProvider } from "@/context/NotificationContext";
import AppLayout from "@/components/layout/AppLayout";

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
    <html lang="es">
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
