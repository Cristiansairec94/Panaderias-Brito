import type { Metadata, Viewport } from "next";
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#090a0f",
};

export const metadata: Metadata = {
  title: "Panadería Brito - Sistema ERP & Gestión",
  description: "Sistema integral de gestión, catálogo de precios, finanzas y control en tiempo real de Panadería Brito",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Panadería Brito",
  },
};

import { SyncProvider } from "@/context/SyncContext";
import PwaInstallPrompt from "@/components/ui/PwaInstallPrompt";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${satisfy.variable} ${dancingScript.variable}`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/logo.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Panadería Brito" />
      </head>
      <body className="antialiased font-sans">
        <AuthProvider>
          <SyncProvider>
            <NotificationProvider>
              <AppLayout>
                {children}
              </AppLayout>
              <PwaInstallPrompt />
            </NotificationProvider>
          </SyncProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
