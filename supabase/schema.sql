-- =========================================================
-- PANADERÍA BRITO - SCHEMA MAESTRO DE BASE DE DATOS SUPABASE
-- Compatible con Vercel, POS en tiempo real y Celular
-- =========================================================
-- NOTA IMPORTANTE:
-- Para ejecutar este script en Supabase:
-- 1. Abre el "SQL Editor" en Supabase.
-- 2. Crea una consulta nueva ("New query").
-- 3. Borra cualquier texto que haya en el editor.
-- 4. Pega TODO este contenido (Ctrl + A -> Pegar).
-- 5. Asegúrate de NO tener nada seleccionado con el ratón.
-- 6. Presiona el botón verde "RUN".
-- =========================================================

-- 1. EXTENSIÓN PARA UUIDS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABLA DE CATEGORÍAS
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '🥖',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

INSERT INTO public.categories (id, name, icon) VALUES
  ('pan_dulce', 'Pan Dulce Tradicional', '🥖'),
  ('pan_blanco', 'Bolillo & Telera', '🍞'),
  ('pasteleria', 'Pastelería & Pays', '🍰'),
  ('bebidas', 'Cafetería & Bebidas', '☕'),
  ('temporada', 'Especiales de Temporada', '✨'),
  ('abarrotes', 'Abarrotes', '🥫'),
  ('materia_prima', 'Materia Prima', '🌾')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_categories" ON public.categories;
CREATE POLICY "anon_categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);

-- 3. TABLA DE SUCURSALES
CREATE TABLE IF NOT EXISTS public.branches (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

INSERT INTO public.branches (id, name, short_name, address, phone) VALUES
  ('branch-matriz', 'Sucursal Matriz (Centro)', 'Matriz', 'Av. Hidalgo #120, Centro Histórico', '55 1234 5678'),
  ('branch-sanjuan', 'Sucursal San Juan', 'San Juan', 'Calle Morelos #45, Col. San Juan', '55 8765 4321'),
  ('branch-angeles', 'Sucursal Los Ángeles', 'Los Ángeles', 'Calz. Guadalupe #890, Los Ángeles', '55 4321 8765')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_branches" ON public.branches;
CREATE POLICY "anon_branches" ON public.branches FOR ALL USING (true) WITH CHECK (true);

-- 4. TABLA DE PRODUCTOS
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  code TEXT,
  barcode TEXT,
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  category TEXT NOT NULL REFERENCES public.categories(id) ON UPDATE CASCADE,
  image TEXT,
  icon TEXT DEFAULT '🥖',
  stock INTEGER DEFAULT 0 NOT NULL,
  description TEXT,
  unit TEXT DEFAULT 'pieza',
  has_iva BOOLEAN DEFAULT false,
  iva_rate NUMERIC(5, 2) DEFAULT 0,
  has_ieps BOOLEAN DEFAULT false,
  ieps_rate NUMERIC(5, 2) DEFAULT 0,
  tax_included BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_products" ON public.products;
CREATE POLICY "anon_products" ON public.products FOR ALL USING (true) WITH CHECK (true);

-- 5. TABLA DE CLIENTES Y MAYORISTAS
CREATE TABLE IF NOT EXISTS public.customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  type TEXT DEFAULT 'frecuente' NOT NULL, -- 'general', 'frecuente', 'mayoreo', 'evento'
  credit_limit NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  current_debt NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  total_purchases NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  favorite_product TEXT,
  purchase_counts JSONB DEFAULT '{}'::jsonb,
  purchase_history JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_customers" ON public.customers;
CREATE POLICY "anon_customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);

-- 6. TABLA DE VENTAS (TICKETS POS)
CREATE TABLE IF NOT EXISTS public.sales (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  total NUMERIC(10, 2) NOT NULL,
  payment_method TEXT DEFAULT 'efectivo' NOT NULL,
  transfer_account TEXT,
  card_terminal TEXT,
  payment_reference TEXT,
  cashier TEXT DEFAULT 'Caja 1' NOT NULL,
  cash_given NUMERIC(10, 2),
  change NUMERIC(10, 2),
  customer_id TEXT,
  customer_name TEXT,
  customer_type TEXT,
  is_custom_order BOOLEAN DEFAULT false,
  order_number TEXT,
  branch_id TEXT DEFAULT 'branch-matriz',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_sales" ON public.sales;
CREATE POLICY "anon_sales" ON public.sales FOR ALL USING (true) WITH CHECK (true);

-- 7. TABLA DE PARTIDAS DE VENTA
CREATE TABLE IF NOT EXISTS public.sale_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id TEXT REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id TEXT,
  product_name TEXT NOT NULL,
  quantity NUMERIC(10, 2) NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  subtotal NUMERIC(10, 2) NOT NULL
);

ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_sale_items" ON public.sale_items;
CREATE POLICY "anon_sale_items" ON public.sale_items FOR ALL USING (true) WITH CHECK (true);

-- 8. TABLA DE ENCARGOS Y PEDIDOS DE PASTELERÍA
CREATE TABLE IF NOT EXISTS public.custom_orders (
  id TEXT PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  customer_id TEXT,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  branch_id TEXT DEFAULT 'branch-matriz',
  branch_name TEXT DEFAULT 'Sucursal Matriz (Centro)',
  description TEXT NOT NULL,
  items JSONB DEFAULT '[]'::jsonb,
  delivery_date DATE NOT NULL,
  delivery_time TEXT DEFAULT '16:00',
  delivery_type TEXT DEFAULT 'sucursal',
  delivery_address TEXT,
  status TEXT DEFAULT 'pendiente' NOT NULL,
  total NUMERIC(10, 2) NOT NULL,
  deposit NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  remaining_balance NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  payment_status TEXT DEFAULT 'anticipo' NOT NULL,
  payment_method TEXT DEFAULT 'efectivo',
  payments JSONB DEFAULT '[]'::jsonb,
  dedication TEXT,
  notes TEXT,
  cashier TEXT,
  shift_name TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.custom_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_orders" ON public.custom_orders;
CREATE POLICY "anon_orders" ON public.custom_orders FOR ALL USING (true) WITH CHECK (true);

-- 9. TABLA DE TURNOS Y ARQUEOS DE CAJA
CREATE TABLE IF NOT EXISTS public.cash_shifts (
  id TEXT PRIMARY KEY,
  shift_name TEXT NOT NULL,
  cashier_name TEXT NOT NULL,
  branch_id TEXT DEFAULT 'branch-matriz',
  opened_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  closed_at TIMESTAMPTZ,
  initial_cash NUMERIC(10, 2) DEFAULT 1000 NOT NULL,
  cash_sales NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  card_sales NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  transfer_sales NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  total_cash_in NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  total_cash_out NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  expected_cash NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  actual_cash NUMERIC(10, 2),
  difference NUMERIC(10, 2),
  status TEXT DEFAULT 'abierta' NOT NULL,
  notes TEXT
);

ALTER TABLE public.cash_shifts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_cash_shifts" ON public.cash_shifts;
CREATE POLICY "anon_cash_shifts" ON public.cash_shifts FOR ALL USING (true) WITH CHECK (true);

-- 10. TABLA DE MOVIMIENTOS DE CAJA (GASTOS E INGRESOS)
CREATE TABLE IF NOT EXISTS public.cash_movements (
  id TEXT PRIMARY KEY,
  shift_id TEXT,
  type TEXT NOT NULL, -- 'entrada', 'salida'
  category TEXT NOT NULL,
  category_label TEXT,
  amount NUMERIC(10, 2) NOT NULL,
  reason TEXT NOT NULL,
  authorized_by TEXT NOT NULL,
  branch_id TEXT DEFAULT 'branch-matriz',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_cash_movements" ON public.cash_movements;
CREATE POLICY "anon_cash_movements" ON public.cash_movements FOR ALL USING (true) WITH CHECK (true);

-- 11. TABLA DE GASTOS RÁPIDOS DE CAJA
CREATE TABLE IF NOT EXISTS public.cash_expenses (
  id TEXT PRIMARY KEY,
  amount NUMERIC(10, 2) NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  cashier TEXT DEFAULT 'Caja Principal' NOT NULL,
  branch_id TEXT DEFAULT 'branch-matriz',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.cash_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_expenses" ON public.cash_expenses;
CREATE POLICY "anon_expenses" ON public.cash_expenses FOR ALL USING (true) WITH CHECK (true);

-- 12. TABLA DE INVENTARIO Y MATERIA PRIMA
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  current_stock NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  min_stock NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  cost_per_unit NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  category TEXT DEFAULT 'harinas',
  branch_id TEXT DEFAULT 'branch-matriz',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_inventory" ON public.inventory_items;
CREATE POLICY "anon_inventory" ON public.inventory_items FOR ALL USING (true) WITH CHECK (true);

-- 13. TABLA DE MOVIMIENTOS DE INVENTARIO
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id TEXT PRIMARY KEY,
  item_id TEXT,
  item_name TEXT NOT NULL,
  type TEXT NOT NULL,
  quantity NUMERIC(10, 2) NOT NULL,
  unit TEXT NOT NULL,
  cost NUMERIC(10, 2),
  reason TEXT NOT NULL,
  responsible TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_inventory_mov" ON public.inventory_movements;
CREATE POLICY "anon_inventory_mov" ON public.inventory_movements FOR ALL USING (true) WITH CHECK (true);
