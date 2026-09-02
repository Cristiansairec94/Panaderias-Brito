import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";

export const metadata: Metadata = {
  title: "Panaderías Brito - Sistema de Gestión",
  description: "Sistema para Don Toño Brito",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="flex min-h-screen bg-amber-50/40 text-stone-900 antialiased">
        <Sidebar />
        <main className="flex-1 overflow-y-auto max-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
