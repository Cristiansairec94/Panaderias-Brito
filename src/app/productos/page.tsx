"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Croissant, 
  Search, 
  Plus, 
  ShoppingBag, 
  Star, 
  Sparkles, 
  Layers, 
  ArrowRight,
  Filter,
  CheckCircle2,
  Clock
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface BakeryProduct {
  id: string;
  name: string;
  category: "pan_dulce" | "pan_blanco" | "pasteleria" | "hojaldre" | "bebidas";
  price: number;
  cost: number;
  stock: number;
  dailyBake: number; // piezas horneadas hoy
  badge?: string;
  icon: string;
  description: string;
}

const BAKERY_CATALOG: BakeryProduct[] = [
  {
    id: "p1",
    name: "Concha Tradicional de Vainilla",
    category: "pan_dulce",
    price: 14,
    cost: 4.8,
    stock: 65,
    dailyBake: 80,
    badge: "Estrella",
    icon: "🥖",
    description: "Masa madre dulce con costra craquelada de mantequilla y vainilla natural.",
  },
  {
    id: "p2",
    name: "Concha de Chocolate Gourmet",
    category: "pan_dulce",
    price: 14,
    cost: 5.2,
    stock: 48,
    dailyBake: 60,
    badge: "Favorito",
    icon: "🍫",
    description: "Cobertura de cacao amargo con un toque de canela y mantequilla.",
  },
  {
    id: "p3",
    name: "Cuerno de Mantequilla Francés",
    category: "hojaldre",
    price: 18,
    cost: 6.5,
    stock: 42,
    dailyBake: 50,
    badge: "Hojaldre Fino",
    icon: "🥐",
    description: "Auténtico laminado con 100% mantequilla de vaca, crujiente y aireado.",
  },
  {
    id: "p4",
    name: "Bolillo Artesanal de Leña",
    category: "pan_blanco",
    price: 6,
    cost: 1.8,
    stock: 180,
    dailyBake: 250,
    badge: "Recién Horneado",
    icon: "🍞",
    description: "Corteza crocante, migajón tierno con fermentación prolongada.",
  },
  {
    id: "p5",
    name: "Telera Especial para Tortas",
    category: "pan_blanco",
    price: 7,
    cost: 2.1,
    stock: 110,
    dailyBake: 150,
    icon: "🥪",
    description: "División tradicional en 3 gajos, suave e ideal para tortas calientes.",
  },
  {
    id: "p6",
    name: "Pastel Tres Leches Don Toño",
    category: "pasteleria",
    price: 360,
    cost: 135,
    stock: 8,
    dailyBake: 12,
    badge: "Especialidad",
    icon: "🎂",
    description: "Bizcocho bañado con infusión de tres leches, canela y crema chantilly.",
  },
  {
    id: "p7",
    name: "Rebanada Pastel Selva Negra",
    category: "pasteleria",
    price: 48,
    cost: 18,
    stock: 16,
    dailyBake: 20,
    badge: "Fina Repostería",
    icon: "🍰",
    description: "Capas de bizcocho de chocolate, cerezas maceradas y virutas de chocolate.",
  },
  {
    id: "p8",
    name: "Oreja Caramelizada de Hojaldre",
    category: "hojaldre",
    price: 16,
    cost: 5.0,
    stock: 55,
    dailyBake: 70,
    icon: "🥨",
    description: "Capas infinitas con azúcar caramelizada dorada al horno de bóveda.",
  },
  {
    id: "p9",
    name: "Pay de Queso con Zarzamoras",
    category: "pasteleria",
    price: 240,
    cost: 85,
    stock: 6,
    dailyBake: 8,
    icon: "🥧",
    description: "Base crujiente de galleta con crema de queso suave y mermelada de zarzamora.",
  },
  {
    id: "p10",
    name: "Dona Glaseada Artesanal",
    category: "pan_dulce",
    price: 15,
    cost: 4.2,
    stock: 35,
    dailyBake: 45,
    icon: "🍩",
    description: "Esponjosa y suave con fino glaseado de vainilla que funde al paladar.",
  },
  {
    id: "p11",
    name: "Café de Olla Don Benito",
    category: "bebidas",
    price: 28,
    cost: 7.5,
    stock: 90,
    dailyBake: 100,
    badge: "Bebida Caliente",
    icon: "☕",
    description: "Preparado en barro con piloncillo natural, canela en rama y clavo de olor.",
  },
  {
    id: "p12",
    name: "Pan de Muerto Azucarado",
    category: "pan_dulce",
    price: 25,
    cost: 8.0,
    stock: 50,
    dailyBake: 60,
    badge: "Temporada",
    icon: "✨",
    description: "Aromas de agua de azahar y ralladura de naranja con mantequilla fresca.",
  },
];

const CATEGORIES = [
  { id: "all", label: "Todo el Catálogo", icon: Sparkles },
  { id: "pan_dulce", label: "Pan Dulce Tradicional", icon: Croissant },
  { id: "pan_blanco", label: "Bolillo & Telera Rústica", icon: Layers },
  { id: "hojaldre", label: "Hojaldres & Masas Finas", icon: Star },
  { id: "pasteleria", label: "Pastelería & Pays", icon: Star },
  { id: "bebidas", label: "Cafetería & Bebidas", icon: Clock },
];

export default function ProductosPage() {
  const [products] = useState<BakeryProduct[]>(BAKERY_CATALOG);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [search, setSearch] = useState("");

  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === "all" || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner - El Globo Luxury Style */}
      <div className="bg-gradient-to-r from-[#2a1a11] via-[#3a2518] to-[#1f130b] rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-[#d4af37]/40 relative overflow-hidden">
        {/* Golden Glow Accent */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#d4af37]/20 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#d4af37]/20 border border-[#d4af37]/40 text-[#fef08a] text-xs font-bold uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5 text-[#fef08a]" />
              Vitrina & Catálogo de Panadería Fina
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-serif tracking-tight text-[#fdfbf7]">
              Productos & Recetas Don Toño
            </h1>
            <p className="text-xs sm:text-sm text-[#d4c3b0] max-w-2xl leading-relaxed">
              Catálogo oficial de pan dulce, hojaldres, bollería y pastelería fina elaborados con ingredientes selectos y recetas tradicionales desde 1985.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/pos"
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-[#d4af37] via-[#f59e0b] to-[#d97706] text-[#241710] font-black text-xs hover:brightness-110 shadow-lg shadow-[#d4af37]/30 transition-all"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Abrir en Caja (POS)</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-[#2b1b13] text-[#fef08a] shadow-md border border-[#d4af37]/60"
                    : "bg-white text-[#5c4938] hover:bg-[#f6eee4] border border-[#e5d8c8]"
                }`}
              >
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#8c7a68] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre de pan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-[#e2d5c5] text-xs font-medium text-[#2e1d14] placeholder-[#a89886] focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50"
          />
        </div>
      </div>

      {/* Product Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {filteredProducts.map((p) => {
          const margin = (((p.price - p.cost) / p.price) * 100).toFixed(0);

          return (
            <div
              key={p.id}
              className="bg-white rounded-3xl border border-[#e8dfd3] shadow-sm hover:shadow-xl hover:border-[#d4af37]/60 transition-all duration-300 p-5 flex flex-col justify-between group"
            >
              <div>
                {/* Card Top: Icon & Badge */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#faf6f0] border border-[#ecdcc9] flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform">
                    {p.icon}
                  </div>
                  {p.badge && (
                    <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-[#fef3c7] text-[#92400e] border border-[#fde68a]">
                      {p.badge}
                    </span>
                  )}
                </div>

                {/* Name & Description */}
                <h3 className="font-serif font-black text-sm text-[#2b1b13] group-hover:text-[#b45309] transition-colors leading-tight">
                  {p.name}
                </h3>
                <p className="text-[11px] text-[#786958] mt-1 line-clamp-2 leading-relaxed">
                  {p.description}
                </p>
              </div>

              {/* Stats & Price */}
              <div className="mt-4 pt-3 border-t border-[#f0e6da] space-y-3">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#8c7a68] flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#b45309]" /> Horneado hoy:
                  </span>
                  <span className="font-bold text-[#2e1d14]">{p.dailyBake} pzas</span>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#8c7a68]">Margen bruto:</span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    +{margin}%
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-[10px] text-[#8c7a68] uppercase font-bold tracking-wider block">Precio Venta</span>
                    <span className="text-lg font-black text-[#2e1d14] font-serif">
                      {formatCurrency(p.price)}
                    </span>
                  </div>

                  <Link
                    href="/pos"
                    className="p-2.5 rounded-xl bg-[#faf4ec] hover:bg-[#2b1b13] text-[#593922] hover:text-[#fef08a] transition-all border border-[#decbb7] hover:border-[#d4af37]"
                    title="Cobrar este producto en Caja rápida"
                  >
                    <ShoppingBag className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
