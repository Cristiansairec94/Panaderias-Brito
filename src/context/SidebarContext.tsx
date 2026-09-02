"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface SidebarContextType {
  isCollapsed: boolean;
  toggleCollapse: () => void;
  setCollapsed: (collapsed: boolean) => void;
  isMobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  toggleMobile: () => void;
  openMenus: Record<string, boolean>;
  toggleSubmenu: (menuKey: string) => void;
  isSubmenuOpen: (menuKey: string) => boolean;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setMobileOpen] = useState(false);
  // Default open menus for quick access
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    ingresos: true,
    gastos: false,
    finanzas: false,
    configuracion: false,
  });

  // Load persisted collapse state if available
  useEffect(() => {
    try {
      const saved = localStorage.getItem("brito_sidebar_collapsed");
      if (saved !== null) {
        setIsCollapsed(JSON.parse(saved));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("brito_sidebar_collapsed", JSON.stringify(next));
      } catch {
        // Ignore
      }
      return next;
    });
  };

  const setCollapsed = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
    try {
      localStorage.setItem("brito_sidebar_collapsed", JSON.stringify(collapsed));
    } catch {
      // Ignore
    }
  };

  const toggleMobile = () => {
    setMobileOpen((prev) => !prev);
  };

  const toggleSubmenu = (menuKey: string) => {
    setOpenMenus((prev) => ({
      ...prev,
      [menuKey]: !prev[menuKey],
    }));
  };

  const isSubmenuOpen = (menuKey: string) => {
    return Boolean(openMenus[menuKey]);
  };

  return (
    <SidebarContext.Provider
      value={{
        isCollapsed,
        toggleCollapse,
        setCollapsed,
        isMobileOpen,
        setMobileOpen,
        toggleMobile,
        openMenus,
        toggleSubmenu,
        isSubmenuOpen,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}
