"use client";

import { useAuth } from "@/context/AuthContext";
import Sidebar from "./Sidebar";
import Header from "./Header";
import LoginForm from "@/components/auth/LoginForm";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center text-white space-y-3">
        <div className="w-10 h-10 border-4 border-brito-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-stone-400">Cargando Panadería Brito...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  return (
    <div className="flex min-h-screen bg-stone-50/50 text-stone-900 antialiased selection:bg-brito-orange-500 selection:text-white">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 max-h-screen overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-stone-50/60">
          {children}
        </main>
      </div>
    </div>
  );
}
