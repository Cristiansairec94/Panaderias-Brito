"use client";

import { useState, useEffect } from "react";
import { 
  Settings, 
  Store, 
  Users, 
  Printer, 
  Database, 
  Save, 
  Sliders, 
  ShieldCheck, 
  KeyRound, 
  CheckCircle2, 
  Receipt,
  Clock,
  Sparkles,
  DollarSign,
  Plus,
  X,
  ShieldAlert,
  Check
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useAuth, ROLE_PERMISSIONS, User } from "@/context/AuthContext";
import { UserRole } from "@/types";

export default function ConfiguracionPage() {
  const { usersList, addUser } = useAuth();
  const [activeTab, setActiveTab] = useState<"general" | "usuarios" | "ticket" | "operaciones" | "database">("general");
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<UserRole>("cajero");
  const [newUserAvatar, setNewUserAvatar] = useState("👤");

  const [savedAlert, setSavedAlert] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab === "usuarios") {
        setActiveTab("usuarios");
      } else if (tab === "general") {
        setActiveTab("general");
      }
    }
  }, []);

  // Business Info Form State
  const [businessName, setBusinessName] = useState("Panadería Bakery Brito");
  const [ownerName, setOwnerName] = useState("Don Toño Brito");
  const [phone, setPhone] = useState("55 1234 5678");
  const [address, setAddress] = useState("Av. Principal #450, Centro");
  const [rfc, setRfc] = useState("BRIT850912-XX1");
  const [currency, setCurrency] = useState("MXN");

  // Ticket Form State
  const [ticketHeader, setTicketHeader] = useState("¡Gracias por su compra en Panaderías Brito!\nEl mejor pan tradicional recién horneado");
  const [ticketFooter, setTicketFooter] = useState("Para encargos y pasteles especiales:\nTel. 55 1234 5678 • WhatsApp disponible");
  const [paperWidth, setPaperWidth] = useState("80mm");
  const [autoCut, setAutoCut] = useState(true);

  // Operations Form State
  const [defaultCashFund, setDefaultCashFund] = useState("1000");
  const [minWasteAlertPercent, setMinWasteAlertPercent] = useState("5");
  const [autoShiftAlert, setAutoShiftAlert] = useState(true);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedAlert(true);
    setTimeout(() => setSavedAlert(false), 3000);
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-stone-900 tracking-tight">Configuración del Sistema ERP</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Personalización de la panadería, impresión de tickets, usuarios, turnos y conexión a base de datos.
          </p>
        </div>
        {savedAlert && (
          <div className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg animate-in fade-in zoom-in-95">
            <CheckCircle2 className="w-4 h-4" /> Cambios guardados correctamente
          </div>
        )}
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex gap-2 border-b border-stone-200 pb-2 text-xs font-bold overflow-x-auto">
        <button
          onClick={() => setActiveTab("general")}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "general" ? "bg-stone-900 text-white shadow-sm" : "bg-white text-stone-600 hover:bg-stone-100"
          }`}
        >
          <Store className="w-4 h-4 text-brito-orange-500" /> Datos de la Panadería
        </button>
        <button
          onClick={() => setActiveTab("usuarios")}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "usuarios" ? "bg-stone-900 text-white shadow-sm" : "bg-white text-stone-600 hover:bg-stone-100"
          }`}
        >
          <Users className="w-4 h-4 text-blue-500" /> Usuarios & Empleados
        </button>
        <button
          onClick={() => setActiveTab("ticket")}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "ticket" ? "bg-stone-900 text-white shadow-sm" : "bg-white text-stone-600 hover:bg-stone-100"
          }`}
        >
          <Printer className="w-4 h-4 text-emerald-500" /> Impresión de Tickets
        </button>
        <button
          onClick={() => setActiveTab("operaciones")}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "operaciones" ? "bg-stone-900 text-white shadow-sm" : "bg-white text-stone-600 hover:bg-stone-100"
          }`}
        >
          <Sliders className="w-4 h-4 text-purple-500" /> Parámetros de Caja
        </button>
        <button
          onClick={() => setActiveTab("database")}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "database" ? "bg-stone-900 text-white shadow-sm" : "bg-white text-stone-600 hover:bg-stone-100"
          }`}
        >
          <Database className="w-4 h-4 text-brito-crimson-500" /> Base de Datos & Nube
        </button>
      </div>

      {/* Tab 1: General Business Info */}
      {activeTab === "general" && (
        <form onSubmit={handleSave} className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-sm max-w-3xl space-y-6 animate-in fade-in">
          <div className="border-b border-stone-100 pb-3">
            <h3 className="font-black text-base text-stone-900">Identidad del Negocio</h3>
            <p className="text-[11px] text-stone-500">Estos datos aparecerán en los tickets de venta y reportes financieros.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-stone-700">Nombre de la Panadería *</label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 font-bold text-stone-900 focus:ring-2 focus:ring-brito-orange-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-stone-700">Dueño / Titular *</label>
              <input
                type="text"
                required
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 font-bold text-stone-900 focus:ring-2 focus:ring-brito-orange-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-stone-700">Teléfono / WhatsApp de Atención</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 focus:ring-2 focus:ring-brito-orange-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-stone-700">RFC / Identificación Fiscal</label>
              <input
                type="text"
                value={rfc}
                onChange={(e) => setRfc(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 focus:ring-2 focus:ring-brito-orange-500 focus:outline-none uppercase"
              />
            </div>
            <div className="md:col-span-2 space-y-1">
              <label className="font-bold text-stone-700">Dirección de la Sucursal Matriz</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 focus:ring-2 focus:ring-brito-orange-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-stone-100 flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 bg-gradient-to-r from-brito-orange-600 to-brito-crimson-600 hover:from-brito-orange-700 hover:to-brito-crimson-700 text-white font-extrabold px-6 py-2.5 rounded-xl shadow-md text-xs transition-all active:scale-95"
            >
              <Save className="w-4 h-4" /> Guardar Datos Generales
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Users & Roles */}
      {activeTab === "usuarios" && (
        <div className="space-y-6 max-w-5xl animate-in fade-in">
          {/* User List Card */}
          <div className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-black text-base text-stone-900">Personal & Roles con Acceso al ERP</h3>
                <p className="text-[11px] text-stone-500">Cuentas habilitadas para Don Toño, cajeras y maestros panaderos.</p>
              </div>
              <button 
                onClick={() => setShowAddUserModal(!showAddUserModal)}
                className="flex items-center gap-1.5 bg-stone-900 hover:bg-black text-white font-bold px-3.5 py-2 rounded-xl text-xs transition-all"
              >
                <Plus className="w-4 h-4 text-brito-orange-400" /> {showAddUserModal ? "Cancelar" : "Agregar Empleado"}
              </button>
            </div>

            {/* Modal / Form to add employee */}
            {showAddUserModal && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newUserName || !newUserEmail) return;
                  const roleLabels: Record<UserRole, string> = {
                    admin: "Administrador",
                    cajero: "Cajero Mostrador",
                    panadero: "Panadero / Horno",
                    supervisor: "Supervisor de Turno",
                  };
                  const newUser: User = {
                    id: `usr-${Date.now()}`,
                    name: newUserName,
                    email: newUserEmail,
                    password: newUserPassword || "1234",
                    role: newUserRole,
                    roleLabel: roleLabels[newUserRole],
                    avatar: newUserAvatar,
                  };
                  addUser(newUser);
                  setNewUserName("");
                  setNewUserEmail("");
                  setNewUserPassword("");
                  setShowAddUserModal(false);
                }}
                className="p-4 bg-amber-50/50 rounded-2xl border border-amber-200/80 space-y-3 animate-in fade-in"
              >
                <h4 className="font-black text-xs text-amber-950">Nuevo Empleado / Usuario</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="font-bold text-stone-700">Nombre Completo</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. María Gómez"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      className="w-full mt-1 px-3 py-2 bg-white rounded-xl border border-stone-200"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-stone-700">Correo Electrónico</label>
                    <input
                      type="email"
                      required
                      placeholder="maria@panaderiabrito.com"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      className="w-full mt-1 px-3 py-2 bg-white rounded-xl border border-stone-200"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-stone-700">Contraseña</label>
                    <input
                      type="text"
                      placeholder="••••••"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      className="w-full mt-1 px-3 py-2 bg-white rounded-xl border border-stone-200"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-stone-700">Rol Operativo</label>
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                      className="w-full mt-1 px-3 py-2 bg-white rounded-xl border border-stone-200 font-bold"
                    >
                      <option value="cajero">Cajero Mostrador</option>
                      <option value="panadero">Panadero / Horno</option>
                      <option value="supervisor">Supervisor de Turno</option>
                      <option value="admin">Administrador General</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddUserModal(false)}
                    className="px-4 py-2 text-stone-600 font-bold text-xs hover:bg-stone-100 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-gradient-to-r from-brito-orange-600 to-brito-crimson-600 text-white font-extrabold text-xs rounded-xl shadow-md"
                  >
                    Guardar Empleado
                  </button>
                </div>
              </form>
            )}

            {/* Users List */}
            <div className="space-y-3">
              {usersList.map((usr) => (
                <div
                  key={usr.id}
                  className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-200/80 hover:bg-amber-50/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white border border-stone-200 flex items-center justify-center text-2xl shadow-sm">
                      {usr.avatar}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-xs text-stone-900">{usr.name}</h4>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                          usr.role === "admin"
                            ? "bg-amber-100 text-amber-800 border border-amber-300"
                            : usr.role === "cajero"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : usr.role === "panadero"
                            ? "bg-orange-100 text-orange-800 border border-orange-300"
                            : "bg-indigo-100 text-indigo-800 border border-indigo-300"
                        }`}>
                          {usr.roleLabel}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 mt-0.5">{usr.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                      Activo
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RBAC Permission Matrix Card */}
          <div className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-sm space-y-4">
            <div className="border-b border-stone-100 pb-3">
              <h3 className="font-black text-base text-stone-900">Matriz de Permisos por Rol (RBAC)</h3>
              <p className="text-[11px] text-stone-500">
                Visualización de accesos autorizados por cada perfil operativo en Panaderías Brito.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 text-stone-600 font-black border-b border-stone-200">
                  <tr>
                    <th className="p-3">Módulo / Capacidad</th>
                    <th className="p-3 text-center">Administrador</th>
                    <th className="p-3 text-center">Supervisor</th>
                    <th className="p-3 text-center">Cajero Mostrador</th>
                    <th className="p-3 text-center">Panadero / Horno</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium">
                  {[
                    { name: "Dashboard / Resumen General", perm: "canAccessDashboard" },
                    { name: "Punto de Venta (POS)", perm: "canAccessPos" },
                    { name: "Caja & Flujo de Efectivo", perm: "canAccessCaja" },
                    { name: "Inventario & Insumos", perm: "canAccessInventario" },
                    { name: "Pedidos & Encargos", perm: "canAccessPedidos" },
                    { name: "Clientes & Mayoristas", perm: "canAccessClientes" },
                    { name: "Finanzas & Balances", perm: "canAccessFinanzas" },
                    { name: "Reportes & Métricas", perm: "canAccessReportes" },
                    { name: "Configuración del Sistema", perm: "canAccessConfiguracion" },
                    { name: "Ver Costos Unitarios & Margen", perm: "canViewProfitMargins" },
                  ].map((row) => (
                    <tr key={row.perm} className="hover:bg-amber-50/20">
                      <td className="p-3 font-bold text-stone-800">{row.name}</td>
                      <td className="p-3 text-center">
                        {ROLE_PERMISSIONS.admin[row.perm as keyof typeof ROLE_PERMISSIONS.admin] ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full font-bold">✓</span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-6 h-6 bg-stone-100 text-stone-400 rounded-full">—</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {ROLE_PERMISSIONS.supervisor[row.perm as keyof typeof ROLE_PERMISSIONS.supervisor] ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full font-bold">✓</span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-6 h-6 bg-stone-100 text-stone-400 rounded-full">—</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {ROLE_PERMISSIONS.cajero[row.perm as keyof typeof ROLE_PERMISSIONS.cajero] ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full font-bold">✓</span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-6 h-6 bg-stone-100 text-stone-400 rounded-full">—</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {ROLE_PERMISSIONS.panadero[row.perm as keyof typeof ROLE_PERMISSIONS.panadero] ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full font-bold">✓</span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-6 h-6 bg-stone-100 text-stone-400 rounded-full">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Tickets & Printing */}
      {activeTab === "ticket" && (
        <form onSubmit={handleSave} className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-sm max-w-3xl space-y-6 animate-in fade-in">
          <div className="border-b border-stone-100 pb-3">
            <h3 className="font-black text-base text-stone-900">Formato y Encabezado del Ticket de Venta</h3>
            <p className="text-[11px] text-stone-500">Configura el texto que se imprimirá en la impresora térmica de mostrador.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-stone-700">Ancho de Papel Térmico</label>
              <select
                value={paperWidth}
                onChange={(e) => setPaperWidth(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 font-bold text-stone-900 focus:ring-2 focus:ring-brito-orange-500 focus:outline-none"
              >
                <option value="80mm">80 mm (Estándar Punto de Venta)</option>
                <option value="58mm">58 mm (Impresora Térmica Pequeña)</option>
              </select>
            </div>

            <div className="flex items-center gap-3 pt-4">
              <input
                type="checkbox"
                id="autocut"
                checked={autoCut}
                onChange={(e) => setAutoCut(e.target.checked)}
                className="w-4 h-4 text-brito-orange-600 rounded border-stone-300 focus:ring-brito-orange-500"
              />
              <label htmlFor="autocut" className="font-bold text-stone-700">
                Activar corte automático de papel al finalizar venta
              </label>
            </div>

            <div className="md:col-span-2 space-y-1">
              <label className="font-bold text-stone-700">Encabezado del Ticket</label>
              <textarea
                rows={2}
                value={ticketHeader}
                onChange={(e) => setTicketHeader(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 focus:ring-2 focus:ring-brito-orange-500 focus:outline-none font-mono text-xs"
              />
            </div>

            <div className="md:col-span-2 space-y-1">
              <label className="font-bold text-stone-700">Pie de Ticket / Mensaje Final</label>
              <textarea
                rows={2}
                value={ticketFooter}
                onChange={(e) => setTicketFooter(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 focus:ring-2 focus:ring-brito-orange-500 focus:outline-none font-mono text-xs"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-stone-100 flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-6 py-2.5 rounded-xl shadow-md text-xs transition-all active:scale-95"
            >
              <Save className="w-4 h-4" /> Guardar Formato de Ticket
            </button>
          </div>
        </form>
      )}

      {/* Tab 4: Operational Defaults */}
      {activeTab === "operaciones" && (
        <form onSubmit={handleSave} className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-sm max-w-3xl space-y-6 animate-in fade-in">
          <div className="border-b border-stone-100 pb-3">
            <h3 className="font-black text-base text-stone-900">Parámetros de Caja & Operaciones</h3>
            <p className="text-[11px] text-stone-500">Valores predeterminados para aperturas de turno y límites de alerta.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-stone-700">Fondo Inicial Predeterminado de Caja ($ MXN)</label>
              <input
                type="number"
                value={defaultCashFund}
                onChange={(e) => setDefaultCashFund(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 font-black text-stone-900 text-sm focus:ring-2 focus:ring-brito-orange-500 focus:outline-none"
              />
              <p className="text-[10px] text-stone-400">Dinero sugerido en monedas/billetes al abrir turno.</p>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-stone-700">Límite Máximo de Merma Tolerable (%)</label>
              <input
                type="number"
                value={minWasteAlertPercent}
                onChange={(e) => setMinWasteAlertPercent(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 font-bold text-rose-600 focus:ring-2 focus:ring-brito-orange-500 focus:outline-none"
              />
              <p className="text-[10px] text-stone-400">Genera alerta si la merma supera este porcentaje de la producción.</p>
            </div>
          </div>

          <div className="pt-3 border-t border-stone-100 flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 bg-stone-900 hover:bg-black text-white font-extrabold px-6 py-2.5 rounded-xl shadow-md text-xs transition-all active:scale-95"
            >
              <Save className="w-4 h-4" /> Guardar Parámetros
            </button>
          </div>
        </form>
      )}

      {/* Tab 5: Database & Cloud */}
      {activeTab === "database" && (
        <div className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-sm max-w-3xl space-y-6 animate-in fade-in">
          <div className="border-b border-stone-100 pb-3">
            <h3 className="font-black text-base text-stone-900">Estado de Conexión a Supabase (Nube)</h3>
            <p className="text-[11px] text-stone-500">Monitoreo de sincronización con PostgreSQL y Vercel.</p>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-black text-xs text-emerald-900">Conexión en Tiempo Real Activa</h4>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                La base de datos en la nube está sincronizada. Todos los cambios de ventas, clientes e inventario se reflejan inmediatamente en todos los dispositivos.
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex justify-between items-center">
              <div>
                <span className="text-stone-400 block text-[10px] font-bold uppercase">Project Reference:</span>
                <span className="font-mono font-bold text-stone-900">yaxqevvvoluaqanspqqf</span>
              </div>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-md">
                Conectado
              </span>
            </div>

            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex justify-between items-center">
              <div>
                <span className="text-stone-400 block text-[10px] font-bold uppercase">Servidor de Despliegue:</span>
                <span className="font-mono font-bold text-stone-900">Vercel Production Edge</span>
              </div>
              <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2 py-0.5 rounded-md">
                panaderias-brito.vercel.app
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
