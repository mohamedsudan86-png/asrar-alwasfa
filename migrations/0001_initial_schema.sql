-- جدول الإعدادات العامة للمتجر
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- جدول المستخدمين (المسؤولين والعملاء)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'customer', -- 'admin' or 'customer'
  otp_code TEXT,
  otp_expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- جدول الفئات
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  name_en TEXT,
  display_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- جدول المنتجات
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  image_url TEXT,
  is_available INTEGER DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- جدول الطلبات
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_phone TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  total_amount REAL NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'delivered', 'cancelled'
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- جدول تفاصيل الطلبات
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  product_name TEXT NOT NULL,
  product_price REAL NOT NULL,
  quantity INTEGER NOT NULL,
  subtotal REAL NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- إضافة الإعدادات الافتراضية
INSERT INTO settings (setting_key, setting_value) VALUES 
  ('store_name', 'محامص أسرار الوصفة للقهوة'),
  ('whatsapp_number', '966500000000'),
  ('store_logo', '/static/logo.png'),
  ('welcome_message', 'أهلاً بكم في محامص أسرار الوصفة للقهوة');

-- إضافة مستخدم admin افتراضي (رقم الجوال: 0500000000)
INSERT INTO users (phone, name, role) VALUES ('0500000000', 'المدير', 'admin');

-- إضافة الفئات الافتراضية
INSERT INTO categories (name, name_en, display_order) VALUES 
  ('البن والقهوة', 'Coffee & Beans', 1),
  ('المكسرات', 'Nuts', 2),
  ('المخبوزات', 'Bakery', 3);

-- إضافة منتجات تجريبية
INSERT INTO products (category_id, name, description, price, image_url, display_order) VALUES 
  (1, 'قهوة عربية فاخرة', 'قهوة عربية محمصة طازجة بنكهة مميزة', 45.00, '/static/products/coffee1.jpg', 1),
  (1, 'قهوة تركية', 'قهوة تركية أصلية محمصة بعناية', 35.00, '/static/products/coffee2.jpg', 2),
  (2, 'كاجو محمص', 'كاجو محمص بجودة عالية', 55.00, '/static/products/cashew.jpg', 3),
  (2, 'لوز محمص', 'لوز محمص طازج ولذيذ', 50.00, '/static/products/almond.jpg', 4),
  (3, 'معمول بالتمر', 'معمول طازج محشو بالتمر الفاخر', 30.00, '/static/products/maamoul.jpg', 5),
  (3, 'كعك بالسمسم', 'كعك مقرمش بالسمسم الطازج', 25.00, '/static/products/kaak.jpg', 6);

-- إنشاء الفهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_available ON products(is_available);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
