-- =========================================================
-- PANADERÍA BRITO - SCHEMA COMPLETO DE BASE DE DATOS SUPABASE
-- =========================================================

-- 1. Categorías
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

INSERT INTO categories (id, name) VALUES
  ('pan_dulce', 'Pan Dulce'),
  ('pan_blanco', 'Bolillo y Telera'),
  ('pasteleria', 'Pasteles y Pays'),
  ('bebidas', 'Bebidas y Café'),
  ('temporada', 'Especiales de Temporada')
ON CONFLICT (id) DO NOTHING;

-- 2. Productos
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  category_id TEXT REFERENCES categories(id),
  icon TEXT DEFAULT '🥖',
  stock INTEGER DEFAULT 0 NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Clientes & Mayoristas
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  type TEXT DEFAULT 'frecuente' NOT NULL, -- 'general', 'frecuente', 'mayoreo', 'evento'
  credit_limit NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  current_debt NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  total_purchases NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

INSERT INTO customers (name, phone, type, credit_limit, current_debt, total_purchases, notes) VALUES
  ('Público en General', 'N/A', 'general', 0, 0, 45800, 'Ventas directas de mostrador al contado.'),
  ('Abarrotes La Guadalupana (Don Pepe)', '55 4433 2211', 'mayoreo', 3000, 850, 18500, 'Compra 150 bolillos y 80 teleras diario.'),
  ('Taquería El Pastorcito Dorado', '55 9988 1122', 'mayoreo', 2000, 0, 12400, 'Compra 120 teleras cada 2 días.')
ON CONFLICT DO NOTHING;

-- 4. Inventario de Insumos
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  unit TEXT NOT NULL, -- 'kg', 'litros', 'piezas', 'bultos'
  current_stock NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  min_stock NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  cost_per_unit NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  category TEXT DEFAULT 'harinas',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Movimientos de Inventario (Entradas por compra y Mermas)
CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID REFERENCES inventory_items(id),
  item_name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'entrada_compra', 'merma_horno', 'merma_mostrador', 'ajuste'
  quantity NUMERIC(10, 2) NOT NULL,
  unit TEXT NOT NULL,
  cost NUMERIC(10, 2),
  reason TEXT NOT NULL,
  responsible TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Turnos de Caja
CREATE TABLE IF NOT EXISTS cash_shifts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shift_name TEXT NOT NULL,
  cashier_name TEXT NOT NULL,
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
  status TEXT DEFAULT 'abierta' NOT NULL, -- 'abierta', 'cerrada'
  notes TEXT
);

-- 7. Movimientos de Dinero en Caja (Gastos menores, abonos, retiros)
CREATE TABLE IF NOT EXISTS cash_movements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shift_id UUID REFERENCES cash_shifts(id),
  type TEXT NOT NULL, -- 'entrada', 'salida'
  category TEXT NOT NULL, -- 'gasto_gas', 'compra_insumos', 'pago_proveedor', 'retiro_dueno', 'abono_cliente', 'otro'
  amount NUMERIC(10, 2) NOT NULL,
  reason TEXT NOT NULL,
  authorized_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Ventas & Tickets
CREATE TABLE IF NOT EXISTS sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id),
  total NUMERIC(10, 2) NOT NULL,
  payment_method TEXT DEFAULT 'efectivo' NOT NULL,
  cashier TEXT DEFAULT 'Caja 1' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Detalle de Ventas
CREATE TABLE IF NOT EXISTS sale_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  subtotal NUMERIC(10, 2) NOT NULL
);

-- 10. Encargos de Pastelería
CREATE TABLE IF NOT EXISTS custom_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  description TEXT NOT NULL,
  delivery_date TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pendiente' NOT NULL,
  total NUMERIC(10, 2) NOT NULL,
  deposit NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. Tabla de Gastos y Salidas de Caja en Turno
CREATE TABLE IF NOT EXISTS cash_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  amount NUMERIC(10, 2) NOT NULL,
  category TEXT NOT NULL, -- 'limpieza', 'retiro_personal', 'insumos_menores', 'proveedor', 'otro'
  description TEXT NOT NULL,
  cashier TEXT DEFAULT 'Caja Principal - Don Toño' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_categories" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_products" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_customers" ON customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_inventory" ON inventory_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_inventory_mov" ON inventory_movements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_cash_shifts" ON cash_shifts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_cash_movements" ON cash_movements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_sales" ON sales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_sale_items" ON sale_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_orders" ON custom_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_expenses" ON cash_expenses FOR ALL USING (true) WITH CHECK (true);

