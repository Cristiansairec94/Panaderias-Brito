# 🥖 Panadería Brito - Reglas de Desarrollo del Equipo (Antigravity)

Este documento define los estándares del proyecto para que todos los agentes de **Antigravity** y desarrolladores mantengan la misma coherencia arquitectónica, visual y de código.

---

## 🛠️ Stack Tecnológico
- **Framework:** Next.js 14+ (App Router)
- **Lenguaje:** TypeScript (Estricto)
- **Estilos:** Tailwind CSS con paleta cálida `bakery-*`
- **Iconos:** `lucide-react`
- **Componentes:** Componentes funcionales con hooks de React
- **Base de Datos sugerida:** PostgreSQL (Supabase / Neon) + Prisma o Drizzle ORM
- **Deploy:** Vercel

---

## 📂 Estructura de Módulos (División de Trabajo)
Para evitar conflictos en Git entre los 3 desarrolladores:

```
src/
├── app/
│   ├── layout.tsx             # Layout global con navegación
│   ├── page.tsx               # Dashboard principal
│   ├── pos/                   # [Dev 1] Punto de Venta / Caja rápida
│   │   └── page.tsx
│   ├── inventario/            # [Dev 2] Materia prima, stock de harinas/insumos
│   │   └── page.tsx
│   ├── pedidos/               # [Dev 3] Encargos de pasteles y eventos
│   │   └── page.tsx
│   └── reportes/              # [Dev 3 / Compartido] Corte de caja, ventas diarias
│       └── page.tsx
├── components/
│   ├── ui/                    # Botones, Modales, Badges reutilizables
│   └── layout/                # Sidebar y Navbar
├── lib/                       # Utilidades, formateo de moneda (MXN), fechas
└── types/                     # Definiciones de TypeScript compartidas
```

---

## 🌿 Flujo de Git y Ramas
1. **Nunca hacer push directo a `main`**.
2. Cada desarrollador crea su rama:
   - `feature/pos-ticket-cobro`
   - `feature/inventario-recetas`
   - `feature/pedidos-pasteleria`
3. Al terminar, abrir un **Pull Request** en GitHub para revisión y merge.
4. Vercel creará automáticamente una URL de prueba para cada Pull Request.

---

## 🎨 Convenciones de Código y UI
1. Todos los precios se manejan en formato moneda mexicana (`$ MXN`).
2. Mantener la interfaz limpia, moderna y táctil (botones grandes aptos para pantalla táctil en caja).
3. Todas las interfaces de datos deben tiparse en `src/types/`.
