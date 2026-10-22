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
import { BranchProvider } from "@/context/BranchContext";
import SessionRevokedModal from "@/components/auth/SessionRevokedModal";

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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var INCOMES_PURGE_KEY = 'brito_incomes_purged_epoch_20261022';
                  if (localStorage.getItem(INCOMES_PURGE_KEY) !== 'true') {
                    localStorage.setItem('brito_cash_incomes', '[]');
                    localStorage.setItem('brito_pos_current_incomes', '[]');
                    localStorage.setItem('brito_incomes', '[]');
                    localStorage.setItem('brito_incomes_v2', '[]');
                    localStorage.setItem('brito_incomes_initialized', 'true');
                    localStorage.setItem('brito_incomes_cleared_timestamp', String(Date.now()));
                    localStorage.setItem(INCOMES_PURGE_KEY, 'true');
                  }

                  var WIPE_KEY = 'brito_clean_slate_epoch_1792088600000';
                  if (localStorage.getItem(WIPE_KEY) !== 'true') {
                    var keys = [
                      'brito_notifications',
                      'brito_custom_orders',
                      'brito_orders',
                      'brito_pos_master_sales',
                      'brito_pos_current_sales',
                      'brito_recent_sales',
                      'brito_simulated_sales',
                      'brito_offline_sales',
                      'brito_sync_queue',
                      'brito_offline_archive',
                      'brito_synced_cache',
                      'brito_shift_cuts_history',
                      'brito_expenses',
                      'brito_gastos',
                      'brito_gastos_registro',
                      'brito_pos_current_expenses',
                      'brito_incomes',
                      'brito_incomes_v2',
                      'brito_cash_incomes',
                      'brito_pos_current_incomes',
                      'brito_branch_cash_movements',
                      'brito_bread_deliveries',
                      'brito_current_shift_start_timestamp'
                    ];
                    for (var i = 0; i < keys.length; i++) {
                      localStorage.setItem(keys[i], '[]');
                    }
                    localStorage.setItem('brito_orders_initialized', 'true');
                    localStorage.setItem('brito_incomes_initialized', 'true');
                    localStorage.setItem('brito_gastos_initialized', 'true');
                    localStorage.removeItem('brito_branches_data');
                    localStorage.removeItem('brito_branches');
                    localStorage.removeItem('brito_current_shift_start_timestamp');
                    localStorage.removeItem('brito_current_shift_cashier');
                    localStorage.removeItem('brito_current_shift_name');
                    localStorage.removeItem('brito_pos_shift_locked');
                    for (var j = localStorage.length - 1; j >= 0; j--) {
                      var k = localStorage.key(j);
                      if (k && (
                        k.indexOf('brito_shift_start_') === 0 ||
                        k.indexOf('brito_pos_initial_fund') === 0 ||
                        k.indexOf('brito_dismissed_terminal_orders_') === 0 ||
                        k.indexOf('brito_read_notifs_') === 0 ||
                        k.indexOf('brito_active_tab_') === 0 ||
                        k.indexOf('brito_clean_slate_epoch_') === 0
                      )) {
                        if (k !== WIPE_KEY) {
                          localStorage.removeItem(k);
                        }
                      }
                    }
                    localStorage.setItem(WIPE_KEY, 'true');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased font-sans">
        <AuthProvider>
          <SessionRevokedModal />
          <SyncProvider>
            <BranchProvider>
              <NotificationProvider>
                <AppLayout>
                  {children}
                </AppLayout>
              </NotificationProvider>
            </BranchProvider>
          </SyncProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
