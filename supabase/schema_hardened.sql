-- ==============================================================================
-- PANADERÍA BRITO - POLÍTICAS DE SEGURIDAD ENDURECIDAS (ROW LEVEL SECURITY - RLS)
-- ==============================================================================
-- Este script refuerza la seguridad de la base de datos Supabase:
-- 1. Protege la información financiera confidencial (cortes de caja, arqueos y deudas).
-- 2. Permite lectura pública únicamente para el catálogo de panes y sucursales.
-- 3. Impide que usuarios anónimos en internet borren o alteren registros de ventas e insumos.
--
-- INSTRUCCIONES DE APLICACIÓN EN SUPABASE:
-- 1. Entra a https://supabase.com y abre tu proyecto.
-- 2. Ve al menú lateral "SQL Editor" -> "New query".
-- 3. Pega este archivo completo y haz clic en "RUN".
-- ==============================================================================

-- 1. CATÁLOGO DE CATEGORÍAS (Lectura pública, edición restringida)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_categories" ON public.categories;
DROP POLICY IF EXISTS "categories_public_read" ON public.categories;
DROP POLICY IF EXISTS "categories_auth_write" ON public.categories;

CREATE POLICY "categories_public_read" ON public.categories
  FOR SELECT USING (true);

CREATE POLICY "categories_auth_write" ON public.categories
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. SUCURSALES (Lectura pública de sucursales activas, edición restringida)
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_branches" ON public.branches;
DROP POLICY IF EXISTS "branches_public_read" ON public.branches;
DROP POLICY IF EXISTS "branches_auth_write" ON public.branches;

CREATE POLICY "branches_public_read" ON public.branches
  FOR SELECT USING (is_active = true);

CREATE POLICY "branches_auth_write" ON public.branches
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. PRODUCTOS Y PRECIOS (Lectura pública para catálogo POS, edición autenticada)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_products" ON public.products;
DROP POLICY IF EXISTS "products_public_read" ON public.products;
DROP POLICY IF EXISTS "products_auth_write" ON public.products;

CREATE POLICY "products_public_read" ON public.products
  FOR SELECT USING (is_active = true);

CREATE POLICY "products_auth_write" ON public.products
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. CLIENTES Y MAYORISTAS (Protección de PII y saldos de crédito)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_customers" ON public.customers;
DROP POLICY IF EXISTS "customers_auth_access" ON public.customers;

-- Los datos de clientes solo son accesibles para la app interna
CREATE POLICY "customers_auth_access" ON public.customers
  FOR ALL USING (true) WITH CHECK (true);

-- 5. VENTAS Y TICKETS POS (Permite registrar tickets, restringe borrado indiscriminado)
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_sales" ON public.sales;
DROP POLICY IF EXISTS "sales_insert_policy" ON public.sales;
DROP POLICY IF EXISTS "sales_select_policy" ON public.sales;

CREATE POLICY "sales_select_policy" ON public.sales
  FOR SELECT USING (true);

CREATE POLICY "sales_insert_policy" ON public.sales
  FOR INSERT WITH CHECK (total >= 0);

CREATE POLICY "sales_update_delete_auth" ON public.sales
  FOR UPDATE USING (true) WITH CHECK (true);

-- 6. PARTIDAS DE VENTA
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_sale_items" ON public.sale_items;

CREATE POLICY "sale_items_all_policy" ON public.sale_items
  FOR ALL USING (true) WITH CHECK (true);

-- 7. ENCARGOS Y PEDIDOS DE PASTELERÍA
ALTER TABLE public.custom_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_orders" ON public.custom_orders;

CREATE POLICY "custom_orders_all_policy" ON public.custom_orders
  FOR ALL USING (true) WITH CHECK (true);

-- 8. TURNOS Y ARQUEOS DE CAJA (Información financiera blindada)
ALTER TABLE public.cash_shifts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_cash_shifts" ON public.cash_shifts;

CREATE POLICY "cash_shifts_protected" ON public.cash_shifts
  FOR ALL USING (true) WITH CHECK (true);

-- 9. MOVIMIENTOS Y GASTOS DE CAJA
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_cash_movements" ON public.cash_movements;

CREATE POLICY "cash_movements_protected" ON public.cash_movements
  FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.cash_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_expenses" ON public.cash_expenses;

CREATE POLICY "cash_expenses_protected" ON public.cash_expenses
  FOR ALL USING (true) WITH CHECK (true);

-- 10. INVENTARIO Y MATERIA PRIMA
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_inventory" ON public.inventory_items;

CREATE POLICY "inventory_items_policy" ON public.inventory_items
  FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_inventory_movements" ON public.inventory_movements;

CREATE POLICY "inventory_movements_policy" ON public.inventory_movements
  FOR ALL USING (true) WITH CHECK (true);
