-- =========================================================
-- PANADERÍA BRITO - SCHEMA DE BASE DE DATOS SUPABASE
-- =========================================================

-- 1. Tabla de Categorías
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

-- 2. Tabla de Productos (Catálogo de Panadería)
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

-- Seed de productos iniciales
INSERT INTO products (name, price, category_id, icon, stock) VALUES
  ('Concha de Vainilla', 12.00, 'pan_dulce', '🥖', 50),
  ('Concha de Chocolate', 12.00, 'pan_dulce', '🍫', 40),
  ('Cuerno de Mantequilla', 15.00, 'pan_dulce', '🥐', 30),
  ('Bolillo Tradicional', 5.00, 'pan_blanco', '🍞', 150),
  ('Telera para Torta', 6.00, 'pan_blanco', '🥪', 100),
  ('Oreja Hojaldrada', 14.00, 'pan_dulce', '🥨', 35),
  ('Dona Glaseada', 13.00, 'pan_dulce', '🍩', 30),
  ('Rebanada Pastel 3 Leches', 45.00, 'pasteleria', '🍰', 20),
  ('Pay de Queso con Zarzamora', 40.00, 'pasteleria', '🥧', 15),
  ('Café de Olla Caliente', 25.00, 'bebidas', '☕', 60),
  ('Pan de Muerto Tradicional', 20.00, 'temporada', '✨', 50),
  ('Empanada de Calabaza', 16.00, 'pan_dulce', '🥟', 25);

-- 3. Tabla de Inventario / Insumos
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  unit TEXT NOT NULL, -- 'kg', 'litros', 'piezas', 'bultos'
  current_stock NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  min_stock NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  cost_per_unit NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed de inventario inicial
INSERT INTO inventory_items (name, unit, current_stock, min_stock, cost_per_unit) VALUES
  ('Harina de Trigo Extra Fina', 'bultos', 8, 10, 520.00),
  ('Azúcar Estándar', 'bultos', 14, 5, 850.00),
  ('Mantequilla Pura de Vaca', 'kg', 4, 12, 140.00),
  ('Levadura Fresca', 'kg', 15, 6, 65.00),
  ('Huevo Limpio', 'kg', 45, 20, 38.00),
  ('Manteca Vegetal Inca', 'kg', 25, 10, 55.00),
  ('Leche Entera', 'litros', 30, 15, 24.00),
  ('Esencia de Vainilla', 'litros', 5, 2, 90.00);

-- 4. Tabla de Ventas (Tickets de POS)
CREATE TABLE IF NOT EXISTS sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  total NUMERIC(10, 2) NOT NULL,
  payment_method TEXT DEFAULT 'efectivo' NOT NULL,
  cashier TEXT DEFAULT 'Caja 1' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Detalle de Ventas (Productos en cada ticket)
CREATE TABLE IF NOT EXISTS sale_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  subtotal NUMERIC(10, 2) NOT NULL
);

-- 6. Encargos y Pedidos Especiales
CREATE TABLE IF NOT EXISTS custom_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  description TEXT NOT NULL,
  delivery_date TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pendiente' NOT NULL, -- 'pendiente', 'en_horno', 'listo', 'entregado'
  total NUMERIC(10, 2) NOT NULL,
  deposit NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Tabla de Gastos y Salidas de Caja en Turno
CREATE TABLE IF NOT EXISTS cash_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  amount NUMERIC(10, 2) NOT NULL,
  category TEXT NOT NULL, -- 'limpieza', 'retiro_personal', 'insumos_menores', 'proveedor', 'otro'
  description TEXT NOT NULL,
  cashier TEXT DEFAULT 'Caja Principal - Don Toño' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar Políticas de Seguridad (RLS) abiertas para la app
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read/write all for anon users" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow read/write all for anon users" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow read/write all for anon users" ON inventory_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow read/write all for anon users" ON sales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow read/write all for anon users" ON sale_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow read/write all for anon users" ON custom_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow read/write all for anon users" ON cash_expenses FOR ALL USING (true) WITH CHECK (true);

