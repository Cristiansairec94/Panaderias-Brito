"use client";

import { useAuth } from "@/context/AuthContext";
import { SidebarProvider } from "@/context/SidebarContext";
import Sidebar from "./Sidebar";
import Header from "./Header";
import LoginForm from "@/components/auth/LoginForm";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1c120c] flex flex-col items-center justify-center text-white space-y-3">
        <div className="w-10 h-10 border-4 border-[#d4af37] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-[#e6ded6] tracking-wider uppercase">
          Cargando Panaderías Brito...
        </p>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-[#faf7f2] text-stone-900 antialiased selection:bg-[#b45309] selection:text-white">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 max-h-screen overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto bg-[#faf7f2] p-4 sm:p-6 md:p-8">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
