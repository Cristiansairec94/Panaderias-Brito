"use client";

import React, { useState, useMemo, useRef } from "react";
import { 
  Users, 
  UserPlus, 
  Search, 
  Edit3, 
  Trash2, 
  Building2, 
  Phone, 
  Calendar, 
  Check, 
  X, 
  Camera, 
  Upload, 
  CheckCircle2, 
  Power, 
  Briefcase, 
  KeyRound, 
  UserCheck
} from "lucide-react";
import { useAuth, User } from "@/context/AuthContext";
import { useBranch } from "@/context/BranchContext";
import { onlyNumbersKeyDown, cleanOnlyNumbers } from "@/lib/utils";

const PUESTOS_PANADERIA = [
  "Maestro Panadero",
  "Hornero / Producción",
  "Pastelero / Repostero",
  "Cajero(a) de Mostrador",
  "Auxiliar Administrativo",
  "Encargado(a) de Sucursal",
  "Ayudante General de Panadería",
  "Repartidor / Logística",
  "Supervisor de Calidad"
];

const AVATAR_OPTIONS = [
  "👨‍🍳", "👩‍🍳", "🥖", "🥐", "👨‍💼", "👩‍💼", "🧑‍💻", "🧁", "🍪", "🏪", "📦", "📋", "🚚"
];

interface EmployeeManagementProps {
  onGoToUsersTab?: () => void;
}

export default function EmployeeManagement({ onGoToUsersTab }: EmployeeManagementProps) {
  const { usersList, updateUser, addUser, deleteUser, toggleUserStatus } = useAuth();
  const { branches } = useBranch();

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [puestoFilter, setPuestoFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);

  // Modal Form Fields
  const [formName, setFormName] = useState("");
  const [formJobTitle, setFormJobTitle] = useState("Maestro Panadero");
  const [formCustomJobTitle, setFormCustomJobTitle] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formBranchId, setFormBranchId] = useState("");
  const [formStatus, setFormStatus] = useState<"activo" | "inactivo">("activo");
  const [formAvatar, setFormAvatar] = useState("👨‍🍳");
  const [formPhotoUrl, setFormPhotoUrl] = useState<string>("");
  const [formCreatedAt, setFormCreatedAt] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingEmployeeId(null);
    setFormName("");
    setFormJobTitle("Maestro Panadero");
    setFormCustomJobTitle("");
    setFormPhone("");
    setFormBranchId(branches[0]?.id || "");
    setFormStatus("activo");
    setFormAvatar("👨‍🍳");
    setFormPhotoUrl("");
    setFormCreatedAt(new Date().toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric" }));
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (emp: User) => {
    setEditingEmployeeId(emp.id);
    setFormName(emp.name);
    
    const existingPuesto = emp.jobTitle || emp.roleLabel || "Personal de Panadería";
    if (PUESTOS_PANADERIA.includes(existingPuesto)) {
      setFormJobTitle(existingPuesto);
      setFormCustomJobTitle("");
    } else {
      setFormJobTitle("Otro");
      setFormCustomJobTitle(existingPuesto);
    }

    setFormPhone(emp.phone || "");
    setFormBranchId(emp.assignedBranchId || "");
    setFormStatus(emp.status || "activo");

    const isImageAvatar = emp.avatar?.startsWith("data:image") || emp.avatar?.startsWith("http");
    setFormPhotoUrl(emp.photoUrl || (isImageAvatar ? emp.avatar : ""));
    setFormAvatar(!isImageAvatar ? (emp.avatar || "👤") : "👨‍🍳");
    setFormCreatedAt(emp.createdAt || "Registrado");

    setIsModalOpen(true);
  };

  // Upload Photo
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Por favor selecciona una imagen válida (JPG, PNG o WebP).");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      alert("La imagen excede los 3MB recomendados.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setFormPhotoUrl(result);
        showToast("Fotografía cargada correctamente.");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setFormPhotoUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Save Modal
  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert("Por favor introduce el nombre completo del empleado.");
      return;
    }

    const assignedBranch = branches.find((b) => b.id === formBranchId);
    const finalJobTitle = formJobTitle === "Otro" ? formCustomJobTitle.trim() || "Personal" : formJobTitle;

    if (editingEmployeeId) {
      updateUser(editingEmployeeId, {
        name: formName.trim(),
        jobTitle: finalJobTitle,
        phone: formPhone.trim(),
        avatar: formPhotoUrl || formAvatar,
        photoUrl: formPhotoUrl || undefined,
        status: formStatus,
        assignedBranchId: formBranchId || undefined,
        assignedBranchName: assignedBranch ? assignedBranch.shortName : undefined,
      });
      showToast(`Ficha de "${formName}" actualizada con éxito.`);
    } else {
      const newId = `emp-${Date.now()}`;
      const defaultUsername = formName.trim().toLowerCase().replace(/[^a-z0-9]/g, ".");
      const newUser: User = {
        id: newId,
        name: formName.trim(),
        jobTitle: finalJobTitle,
        username: defaultUsername,
        email: `${defaultUsername}@panaderiabrito.com`,
        phone: formPhone.trim(),
        password: "1234",
        role: "cajero",
        roleLabel: finalJobTitle,
        avatar: formPhotoUrl || formAvatar,
        photoUrl: formPhotoUrl || undefined,
        status: formStatus,
        assignedBranchId: formBranchId || undefined,
        assignedBranchName: assignedBranch ? assignedBranch.shortName : undefined,
        createdAt: formCreatedAt || new Date().toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric" }),
      };
      addUser(newUser);
      showToast(`Empleado "${formName}" agregado a la plantilla.`);
    }

    setIsModalOpen(false);
  };

  // Delete employee
  const handleDelete = (emp: User) => {
    if (confirm(`¿Estás seguro de dar de baja a ${emp.name} de la plantilla de empleados?`)) {
      deleteUser(emp.id);
      showToast(`Empleado "${emp.name}" eliminado.`);
    }
  };

  // Stats
  const stats = useMemo(() => {
    const total = usersList.length;
    const activos = usersList.filter((u) => u.status !== "inactivo").length;
    const horneros = usersList.filter((u) => 
      (u.jobTitle?.toLowerCase().includes("panader") || u.jobTitle?.toLowerCase().includes("horn") || u.role === "panadero")
    ).length;
    const atencion = usersList.filter((u) => 
      (u.jobTitle?.toLowerCase().includes("caj") || u.role === "cajero")
    ).length;
    return { total, activos, horneros, atencion };
  }, [usersList]);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return usersList.filter((u) => {
      if (branchFilter !== "all" && u.assignedBranchId !== branchFilter) return false;
      if (puestoFilter !== "all") {
        const title = (u.jobTitle || u.roleLabel || "").toLowerCase();
        if (puestoFilter === "produccion" && !title.includes("panader") && !title.includes("horn") && !title.includes("past")) return false;
        if (puestoFilter === "mostrador" && !title.includes("caj") && !title.includes("tienda") && !title.includes("mostrador")) return false;
        if (puestoFilter === "admin" && !title.includes("admin") && !title.includes("geren") && !title.includes("super")) return false;
      }
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchName = u.name.toLowerCase().includes(term);
        const matchTitle = (u.jobTitle || u.roleLabel || "").toLowerCase().includes(term);
        const matchPhone = u.phone?.toLowerCase().includes(term);
        if (!matchName && !matchTitle && !matchPhone) return false;
      }
      return true;
    });
  }, [usersList, branchFilter, puestoFilter, searchTerm]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-stone-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-amber-400/50 animate-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-xs font-bold">{toastMessage}</p>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-transparent p-5 sm:p-6 rounded-3xl border border-blue-200/80 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-900 border border-blue-300 rounded-full text-xs font-black uppercase tracking-wider">
              <Users className="w-4 h-4 text-blue-600" /> Plantilla de Personal & Empleados
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
              Directorio de Empleados de Panadería
            </h3>
            <p className="text-xs text-stone-600 max-w-2xl leading-relaxed">
              Registra y administra la plantilla de trabajadores de Panaderías Brito: asigna fotografías, puestos de trabajo (panaderos, horneros, cajeros, repartidores), teléfonos de contacto y sucursales.
            </p>
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="self-start sm:self-center flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm rounded-2xl shadow-md shadow-blue-500/20 transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Nuevo Empleado</span>
          </button>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-blue-200/60 text-xs">
          <div className="bg-white/90 p-3 rounded-2xl border border-blue-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center text-lg font-bold">
              👥
            </div>
            <div>
              <p className="text-[10px] font-bold text-stone-400 uppercase">Total Plantilla</p>
              <p className="text-base font-black text-stone-900">{stats.total} trabajadores</p>
            </div>
          </div>

          <div className="bg-white/90 p-3 rounded-2xl border border-emerald-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-lg font-bold">
              🟢
            </div>
            <div>
              <p className="text-[10px] font-bold text-stone-400 uppercase">Personal Activo</p>
              <p className="text-base font-black text-emerald-900">{stats.activos}</p>
            </div>
          </div>

          <div className="bg-white/90 p-3 rounded-2xl border border-amber-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center text-lg font-bold">
              🥖
            </div>
            <div>
              <p className="text-[10px] font-bold text-stone-400 uppercase">Horno & Producción</p>
              <p className="text-base font-black text-amber-900">{stats.horneros}</p>
            </div>
          </div>

          <div className="bg-white/90 p-3 rounded-2xl border border-purple-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center text-lg font-bold">
              🛒
            </div>
            <div>
              <p className="text-[10px] font-bold text-stone-400 uppercase">Caja & Mostrador</p>
              <p className="text-base font-black text-purple-900">{stats.atencion}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, puesto o teléfono..."
            className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <div className="flex items-center bg-stone-100 p-1 rounded-xl font-bold text-[11px]">
            <button
              onClick={() => setPuestoFilter("all")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                puestoFilter === "all" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"
              }`}
            >
              Todos ({usersList.length})
            </button>
            <button
              onClick={() => setPuestoFilter("produccion")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                puestoFilter === "produccion" ? "bg-amber-500 text-stone-950 font-black shadow-sm" : "text-stone-500 hover:text-stone-800"
              }`}
            >
              Horno / Producción
            </button>
            <button
              onClick={() => setPuestoFilter("mostrador")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                puestoFilter === "mostrador" ? "bg-emerald-600 text-white font-bold shadow-sm" : "text-stone-500 hover:text-stone-800"
              }`}
            >
              Caja / Mostrador
            </button>
            <button
              onClick={() => setPuestoFilter("admin")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                puestoFilter === "admin" ? "bg-blue-600 text-white font-bold shadow-sm" : "text-stone-500 hover:text-stone-800"
              }`}
            >
              Administración
            </button>
          </div>

          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-700 text-xs focus:outline-none"
          >
            <option value="all">Todas las sucursales</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.shortName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Employees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEmployees.map((emp) => {
          const hasPhoto = Boolean(emp.photoUrl || (emp.avatar && (emp.avatar.startsWith("data:image") || emp.avatar.startsWith("http"))));
          const isInactive = emp.status === "inactivo";
          const assignedBranch = branches.find((b) => b.id === emp.assignedBranchId || b.assignedUserId === emp.id);
          const puesto = emp.jobTitle || emp.roleLabel || "Personal de Panadería";
          const hasSoftwareAccount = Boolean(emp.username);

          return (
            <div
              key={emp.id}
              className={`bg-white rounded-3xl border p-5 transition-all hover:shadow-md flex flex-col justify-between space-y-4 relative overflow-hidden group ${
                isInactive 
                  ? "border-stone-200 opacity-60 bg-stone-50/50" 
                  : "border-stone-200/90 hover:border-blue-300"
              }`}
            >
              <div>
                {/* Employee Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-50 to-indigo-50 border border-blue-200 flex items-center justify-center text-3xl shadow-sm group-hover:scale-105 transition-transform overflow-hidden shrink-0">
                      {hasPhoto ? (
                        <img src={emp.photoUrl || emp.avatar} alt={emp.name} className="w-full h-full object-cover" />
                      ) : (
                        emp.avatar || "👤"
                      )}
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-stone-900 leading-tight">{emp.name}</h4>
                      <p className="text-xs font-bold text-blue-700 mt-0.5 flex items-center gap-1">
                        <Briefcase className="w-3 h-3 text-blue-500" />
                        <span>{puesto}</span>
                      </p>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    isInactive
                      ? "bg-stone-100 text-stone-600 border-stone-200"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  }`}>
                    {isInactive ? "Inactivo" : "Activo"}
                  </span>
                </div>

                {/* Details list */}
                <div className="mt-4 space-y-2 text-xs text-stone-600 bg-stone-50/70 p-3.5 rounded-2xl border border-stone-100">
                  {emp.phone ? (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1.5 text-stone-500">
                        <Phone className="w-3.5 h-3.5 text-blue-500" /> Teléfono / WhatsApp:
                      </span>
                      <a href={`tel:${emp.phone}`} className="font-bold text-stone-900 hover:underline">
                        {emp.phone}
                      </a>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[11px] text-stone-400">
                      <Phone className="w-3.5 h-3.5" /> Sin teléfono registrado
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1.5 text-stone-500">
                      <Building2 className="w-3.5 h-3.5 text-amber-500" /> Sucursal:
                    </span>
                    <span className="font-bold text-stone-800">
                      {assignedBranch ? assignedBranch.shortName : "Todas las sucursales"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1.5 text-stone-500">
                      <Calendar className="w-3.5 h-3.5 text-purple-500" /> Ingreso:
                    </span>
                    <span className="font-medium text-stone-700">
                      {emp.createdAt || "Registrado"}
                    </span>
                  </div>

                  {/* Software Account Badge */}
                  <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between text-[11px]">
                    <span className="text-stone-500 flex items-center gap-1">
                      <KeyRound className="w-3 h-3 text-stone-400" /> Cuenta ERP:
                    </span>
                    {hasSoftwareAccount ? (
                      <span className="font-mono font-bold text-stone-800 bg-white px-2 py-0.5 rounded-md border border-stone-200">
                        @{emp.username}
                      </span>
                    ) : (
                      <span className="text-stone-400 italic">Sin cuenta asignada</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                <button
                  onClick={() => toggleUserStatus(emp.id)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold text-[11px] transition-all cursor-pointer ${
                    isInactive
                      ? "bg-rose-100 text-rose-800 hover:bg-rose-200"
                      : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                  }`}
                >
                  <Power className="w-3 h-3" />
                  <span>{isInactive ? "Dar de Alta" : "Dar de Baja"}</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEditModal(emp)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-xl text-[11px] transition-all cursor-pointer"
                    title="Editar ficha del empleado"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Editar Ficha</span>
                  </button>

                  <button
                    onClick={() => handleDelete(emp)}
                    className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                    title="Eliminar empleado"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredEmployees.length === 0 && (
        <div className="bg-white p-12 text-center rounded-3xl border border-stone-200 shadow-sm space-y-3">
          <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto text-2xl">
            🔍
          </div>
          <h4 className="font-black text-stone-900 text-base">No se encontraron empleados</h4>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            No hay trabajadores que coincidan con los filtros seleccionados.
          </p>
          <button
            onClick={() => {
              setSearchTerm("");
              setPuestoFilter("all");
              setBranchFilter("all");
            }}
            className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-xl text-xs"
          >
            Limpiar filtros
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT / CREATE EMPLOYEE RECORD                                      */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-stone-200 overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-gradient-to-r from-blue-500/15 via-indigo-500/10 to-transparent border-b border-blue-200/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-2xl shadow-md font-bold overflow-hidden">
                  {formPhotoUrl ? (
                    <img src={formPhotoUrl} alt="Vista previa" className="w-full h-full object-cover" />
                  ) : (
                    formAvatar
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-black text-stone-900 tracking-tight">
                    {editingEmployeeId ? `Editar Ficha: ${formName || "Empleado"}` : "Registrar Nuevo Empleado"}
                  </h3>
                  <p className="text-xs text-stone-500">
                    Datos personales, puesto de trabajo en panadería y fotografía.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-white/80 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEmployee} className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-xs">
              {/* Photo Upload */}
              <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-200/80 space-y-3">
                <label className="font-bold text-stone-800 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-blue-600" /> Fotografía del Trabajador
                </label>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="relative group">
                    <div className="w-20 h-20 rounded-2xl bg-white border-2 border-blue-300 overflow-hidden flex items-center justify-center text-4xl shadow-md">
                      {formPhotoUrl ? (
                        <img src={formPhotoUrl} alt="Foto empleado" className="w-full h-full object-cover" />
                      ) : (
                        formAvatar
                      )}
                    </div>
                    {formPhotoUrl && (
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="absolute -top-2 -right-2 p-1 bg-rose-500 hover:bg-rose-600 text-white rounded-full shadow-md transition-all cursor-pointer"
                        title="Eliminar foto"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 flex-1 w-full text-center sm:text-left">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-stone-900 hover:bg-black text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5 text-blue-400" />
                        <span>{formPhotoUrl ? "Cambiar Fotografía" : "Subir Foto desde el Equipo"}</span>
                      </button>
                      {formPhotoUrl && (
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="px-3 py-2 text-rose-700 hover:bg-rose-50 rounded-xl font-bold text-xs transition-all cursor-pointer"
                        >
                          Quitar Foto
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-stone-400 font-medium">
                      Formatos compatibles: JPG, PNG o WebP.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-blue-200/60">
                  <p className="text-[10px] font-bold text-stone-600 mb-1.5">
                    O selecciona un avatar representativo:
                  </p>
                  <div className="flex items-center gap-2 overflow-x-auto py-1">
                    {AVATAR_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          setFormAvatar(emoji);
                          setFormPhotoUrl("");
                        }}
                        className={`w-8 h-8 rounded-xl flex items-center justify-center text-base transition-all shrink-0 cursor-pointer ${
                          !formPhotoUrl && formAvatar === emoji
                            ? "bg-blue-500 text-white scale-110 shadow-md ring-2 ring-blue-300"
                            : "bg-white hover:bg-stone-100 text-stone-700 border border-stone-200"
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Data Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1 sm:col-span-2">
                  <label className="font-bold text-stone-700">Nombre Completo del Trabajador *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Roberto Méndez Brito"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-semibold text-stone-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-stone-700">Puesto de Trabajo</label>
                  <select
                    value={formJobTitle}
                    onChange={(e) => setFormJobTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {PUESTOS_PANADERIA.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                    <option value="Otro">Otro (Especificar)</option>
                  </select>
                </div>

                {formJobTitle === "Otro" && (
                  <div className="space-y-1">
                    <label className="font-bold text-stone-700">Especificar Puesto</label>
                    <input
                      type="text"
                      placeholder="Ej. Maestro Pastelero"
                      value={formCustomJobTitle}
                      onChange={(e) => setFormCustomJobTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-medium text-stone-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="font-bold text-stone-700">Teléfono / WhatsApp</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="55 1234 5678"
                    value={formPhone}
                    onKeyDown={(e) => onlyNumbersKeyDown(e, false)}
                    onChange={(e) => setFormPhone(cleanOnlyNumbers(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-medium text-stone-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-stone-700">Sucursal de Trabajo</label>
                  <select
                    value={formBranchId}
                    onChange={(e) => setFormBranchId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">Todas las Sucursales</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.shortName})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-stone-700">Estado Laboral</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as "activo" | "inactivo")}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="activo">Activo (En nómina / turno)</option>
                    <option value="inactivo">Inactivo (Baja temporal / definitiva)</option>
                  </select>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-stone-100 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-stone-600 font-bold hover:bg-stone-100 rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingEmployeeId ? "Guardar Ficha" : "Registrar Trabajador"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
