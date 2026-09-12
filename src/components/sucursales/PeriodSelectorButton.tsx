"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  Calendar, 
  CalendarRange, 
  CalendarDays, 
  ChevronDown, 
  Check, 
  Clock, 
  BarChart2, 
  Filter,
  ArrowRight
} from "lucide-react";

export type PeriodType = "hoy" | "semana" | "mes" | "año" | "custom";

interface PeriodSelectorButtonProps {
  selectedPeriod: PeriodType;
  onPeriodChange: (p: PeriodType) => void;
  customStartDate?: string;
  customEndDate?: string;
  onCustomDateChange?: (start: string, end: string) => void;
  size?: "sm" | "md";
  className?: string;
}

export default function PeriodSelectorButton({
  selectedPeriod,
  onPeriodChange,
  customStartDate = "2026-08-20",
  customEndDate = "2026-09-02",
  onCustomDateChange,
  size = "md",
  className = "",
}: PeriodSelectorButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempStart, setTempStart] = useState(customStartDate);
  const [tempEnd, setTempEnd] = useState(customEndDate);
  const [showCustomInputs, setShowCustomInputs] = useState(selectedPeriod === "custom");
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Sincronizar fechas temporales si cambian las propiedades
  useEffect(() => {
    if (customStartDate) setTempStart(customStartDate);
    if (customEndDate) setTempEnd(customEndDate);
  }, [customStartDate, customEndDate]);

  // Cerrar al hacer clic fuera del componente
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const periodOptions: {
    id: PeriodType;
    label: string;
    subtitle: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      id: "hoy",
      label: "Hoy",
      subtitle: "Día en curso",
      icon: Clock,
    },
    {
      id: "semana",
      label: "Esta Semana",
      subtitle: "Últimos 7 días",
      icon: Calendar,
    },
    {
      id: "mes",
      label: "Este Mes",
      subtitle: "Mes actual (30 días)",
      icon: CalendarDays,
    },
    {
      id: "año",
      label: "Este Año",
      subtitle: "Año actual (12 meses)",
      icon: BarChart2,
    },
    {
      id: "custom",
      label: "Entre Fechas",
      subtitle: "Rango personalizado",
      icon: CalendarRange,
    },
  ];

  const currentOption = periodOptions.find((o) => o.id === selectedPeriod) || periodOptions[0];

  const handleSelectPeriod = (periodId: PeriodType) => {
    if (periodId === "custom") {
      setShowCustomInputs(true);
      onPeriodChange("custom");
    } else {
      setShowCustomInputs(false);
      onPeriodChange(periodId);
      setIsOpen(false);
    }
  };

  const handleApplyCustomDates = () => {
    if (onCustomDateChange) {
      onCustomDateChange(tempStart, tempEnd);
    }
    onPeriodChange("custom");
    setIsOpen(false);
  };

  const currentLabel = selectedPeriod === "custom" && customStartDate && customEndDate
    ? `${customStartDate} al ${customEndDate}`
    : currentOption.label;

  const sizeClasses = size === "sm"
    ? "px-3.5 py-2 rounded-xl text-xs"
    : "px-4 py-3 rounded-2xl text-xs";

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* Botón Principal Selector */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-2 font-black transition-all shadow-sm active:scale-95 border ${
          isOpen
            ? "bg-stone-900 text-white border-stone-900 shadow-md ring-2 ring-orange-500/20"
            : "bg-stone-100 hover:bg-stone-200/80 text-stone-800 border-stone-200/90 hover:border-stone-300"
        } ${sizeClasses} ${className}`}
        title="Filtrar por periodo de análisis"
      >
        <Calendar className={`w-4 h-4 ${isOpen ? "text-orange-400" : "text-orange-600"}`} />
        <span className="flex items-center gap-1.5">
          <span className={isOpen ? "text-stone-300 font-medium" : "text-stone-500 font-medium"}>
            Periodo:
          </span>
          <span className={isOpen ? "text-white font-black" : "text-stone-900 font-black"}>
            {currentLabel}
          </span>
        </span>
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-orange-400" : "text-stone-500"
          }`}
        />
      </button>

      {/* Menú Desplegable */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-stone-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-2 border-b border-stone-100 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-stone-500">
              <Filter className="w-3 h-3 text-orange-600" />
              <span>Filtrar por Periodo</span>
            </div>
            {selectedPeriod === "custom" && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                Personalizado
              </span>
            )}
          </div>

          <div className="py-1 space-y-1">
            {periodOptions.map((opt) => {
              const isSelected = selectedPeriod === opt.id;
              const IconComp = opt.icon;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectPeriod(opt.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all ${
                    isSelected
                      ? "bg-orange-50 text-orange-950 font-black border border-orange-200/80 shadow-xs"
                      : "hover:bg-stone-50 text-stone-700 font-medium"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                        isSelected
                          ? "bg-orange-500 text-white shadow-sm shadow-orange-500/30"
                          : "bg-stone-100 text-stone-600"
                      }`}
                    >
                      <IconComp className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold leading-tight">{opt.label}</div>
                      <div className="text-[10px] text-stone-400">{opt.subtitle}</div>
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="w-4 h-4 text-orange-600 stroke-[3]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Sub-panel de rango personalizado de fechas */}
          {showCustomInputs && (
            <div className="mt-1 pt-2.5 px-2.5 pb-2 border-t border-stone-100 bg-stone-50/90 rounded-xl space-y-2">
              <div className="text-[10px] font-black text-stone-600 uppercase tracking-wider flex items-center gap-1">
                <CalendarRange className="w-3 h-3 text-orange-600" />
                <span>Rango Personalizado:</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-stone-500 mb-0.5">Desde</label>
                  <input
                    type="date"
                    value={tempStart}
                    onChange={(e) => setTempStart(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white rounded-lg border border-stone-300 font-mono font-bold text-[11px] text-stone-800 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-500 mb-0.5">Hasta</label>
                  <input
                    type="date"
                    value={tempEnd}
                    onChange={(e) => setTempEnd(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white rounded-lg border border-stone-300 font-mono font-bold text-[11px] text-stone-800 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleApplyCustomDates}
                className="w-full flex items-center justify-center gap-1.5 py-2 bg-stone-900 hover:bg-black text-white font-black text-xs rounded-xl transition-all shadow-sm active:scale-95"
              >
                <span>Aplicar Rango</span>
                <ArrowRight className="w-3.5 h-3.5 text-orange-400" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
