"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "cajero" | "panadero";
  roleLabel: string;
  avatar: string;
}

export const DEMO_USERS: User[] = [
  {
    id: "usr-1",
    name: "Don Toño Brito",
    email: "admin@panaderiabrito.com",
    role: "admin",
    roleLabel: "Dueño / Administrador",
    avatar: "👨‍🍳",
  },
  {
    id: "usr-2",
    name: "Lupita Brito",
    email: "caja@panaderiabrito.com",
    role: "cajero",
    roleLabel: "Cajera Mostrador",
    avatar: "👩‍💼",
  },
  {
    id: "usr-3",
    name: "Maestro Juan",
    email: "panadero@panaderiabrito.com",
    role: "panadero",
    roleLabel: "Jefe de Horno & Producción",
    avatar: "🥖",
  },
];

interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => boolean;
  loginAs: (user: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("brito_user");
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    } else {
      // Default to Don Toño for demo convenience
      setUser(DEMO_USERS[0]);
    }
    setIsLoading(false);
  }, []);

  const login = (email: string, pass: string) => {
    const found = DEMO_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (found) {
      setUser(found);
      localStorage.setItem("brito_user", JSON.stringify(found));
      return true;
    }
    return false;
  };

  const loginAs = (demoUser: User) => {
    setUser(demoUser);
    localStorage.setItem("brito_user", JSON.stringify(demoUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("brito_user");
  };

  return (
    <AuthContext.Provider value={{ user, login, loginAs, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
