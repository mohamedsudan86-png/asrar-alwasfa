import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

// تفعيل CORS
app.use('/api/*', cors())

// خدمة الملفات الثابتة
app.use('/static/*', serveStatic({ root: './public' }))

// ============ API - الإعدادات ============
app.get('/api/settings', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM settings').all()
    const settings: Record<string, string> = {}
    results.forEach((row: any) => {
      settings[row.setting_key] = row.setting_value
    })
    return c.json({ success: true, data: settings })
  } catch (error) {
    return c.json({ success: false, error: 'فشل في جلب الإعدادات' }, 500)
  }
})

app.post('/api/settings', async (c) => {
  try {
    const body = await c.req.json()
    const { key, value } = body
    
    await c.env.DB.prepare(
      'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON CONFLICT(setting_key) DO UPDATE SET setting_value = ?, updated_at = CURRENT_TIMESTAMP'
    ).bind(key, value, value).run()
    
    return c.json({ success: true, message: 'تم تحديث الإعدادات بنجاح' })
  } catch (error) {
    return c.json({ success: false, error: 'فشل في تحديث الإعدادات' }, 500)
  }
})

// ============ API - المصادقة ============
app.post('/api/auth/send-otp', async (c) => {
  try {
    const { phone } = await c.req.json()
    
    if (!phone || phone.length < 10) {
      return c.json({ success: false, error: 'رقم الجوال غير صحيح' }, 400)
    }
    
    // توليد رمز OTP (في الإنتاج، يجب إرساله عبر SMS)
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 دقائق
    
    // حفظ أو تحديث المستخدم
    await c.env.DB.prepare(
      'INSERT INTO users (phone, otp_code, otp_expires_at) VALUES (?, ?, ?) ON CONFLICT(phone) DO UPDATE SET otp_code = ?, otp_expires_at = ?'
    ).bind(phone, otp, expiresAt, otp, expiresAt).run()
    
    // في بيئة التطوير، نرجع الرمز (في الإنتاج، يجب إخفاؤه)
    return c.json({ 
      success: true, 
      message: 'تم إرسال رمز التحقق',
      otp: otp // فقط للتطوير
    })
  } catch (error) {
    return c.json({ success: false, error: 'فشل في إرسال رمز التحقق' }, 500)
  }
})

app.post('/api/auth/verify-otp', async (c) => {
  try {
    const { phone, otp, name } = await c.req.json()
    
    const user = await c.env.DB.prepare(
      'SELECT * FROM users WHERE phone = ? AND otp_code = ?'
    ).bind(phone, otp).first()
    
    if (!user) {
      return c.json({ success: false, error: 'رمز التحقق غير صحيح' }, 400)
    }
    
    // التحقق من انتهاء صلاحية الرمز
    const expiresAt = new Date(user.otp_expires_at as string)
    if (expiresAt < new Date()) {
      return c.json({ success: false, error: 'رمز التحقق منتهي الصلاحية' }, 400)
    }
    
    // تحديث اسم المستخدم إذا تم توفيره
    if (name && !user.name) {
      await c.env.DB.prepare(
        'UPDATE users SET name = ?, otp_code = NULL WHERE phone = ?'
      ).bind(name, phone).run()
    } else {
      await c.env.DB.prepare(
        'UPDATE users SET otp_code = NULL WHERE phone = ?'
      ).bind(phone).run()
    }
    
    return c.json({ 
      success: true, 
      message: 'تم تسجيل الدخول بنجاح',
      user: {
        phone: user.phone,
        name: user.name || name,
        role: user.role
      }
    })
  } catch (error) {
    return c.json({ success: false, error: 'فشل في التحقق من الرمز' }, 500)
  }
})

// ============ API - الفئات ============
app.get('/api/categories', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM categories WHERE is_active = 1 ORDER BY display_order, name'
    ).all()
    return c.json({ success: true, data: results })
  } catch (error) {
    return c.json({ success: false, error: 'فشل في جلب الفئات' }, 500)
  }
})

app.post('/api/categories', async (c) => {
  try {
    const { name, name_en, display_order } = await c.req.json()
    
    const result = await c.env.DB.prepare(
      'INSERT INTO categories (name, name_en, display_order) VALUES (?, ?, ?)'
    ).bind(name, name_en || '', display_order || 0).run()
    
    return c.json({ success: true, id: result.meta.last_row_id })
  } catch (error) {
    return c.json({ success: false, error: 'فشل في إضافة الفئة' }, 500)
  }
})

app.put('/api/categories/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const { name, name_en, display_order, is_active } = await c.req.json()
    
    await c.env.DB.prepare(
      'UPDATE categories SET name = ?, name_en = ?, display_order = ?, is_active = ? WHERE id = ?'
    ).bind(name, name_en, display_order, is_active, id).run()
    
    return c.json({ success: true, message: 'تم تحديث الفئة بنجاح' })
  } catch (error) {
    return c.json({ success: false, error: 'فشل في تحديث الفئة' }, 500)
  }
})

app.delete('/api/categories/:id', async (c) => {
  try {
    const id = c.req.param('id')
    await c.env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(id).run()
    return c.json({ success: true, message: 'تم حذف الفئة بنجاح' })
  } catch (error) {
    return c.json({ success: false, error: 'فشل في حذف الفئة' }, 500)
  }
})

// ============ API - المنتجات ============
app.get('/api/products', async (c) => {
  try {
    const categoryId = c.req.query('category_id')
    const search = c.req.query('search')
    
    let query = `
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE 1=1
    `
    const params = []
    
    if (categoryId) {
      query += ' AND p.category_id = ?'
      params.push(categoryId)
    }
    
    if (search) {
      query += ' AND (p.name LIKE ? OR p.description LIKE ?)'
      params.push(`%${search}%`, `%${search}%`)
    }
    
    query += ' ORDER BY p.display_order, p.name'
    
    const { results } = await c.env.DB.prepare(query).bind(...params).all()
    return c.json({ success: true, data: results })
  } catch (error) {
    return c.json({ success: false, error: 'فشل في جلب المنتجات' }, 500)
  }
})

app.get('/api/products/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const product = await c.env.DB.prepare(
      'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?'
    ).bind(id).first()
    
    if (!product) {
      return c.json({ success: false, error: 'المنتج غير موجود' }, 404)
    }
    
    return c.json({ success: true, data: product })
  } catch (error) {
    return c.json({ success: false, error: 'فشل في جلب المنتج' }, 500)
  }
})

app.post('/api/products', async (c) => {
  try {
    const { category_id, name, description, price, image_url, display_order } = await c.req.json()
    
    const result = await c.env.DB.prepare(
      'INSERT INTO products (category_id, name, description, price, image_url, display_order) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(category_id, name, description || '', price, image_url || '', display_order || 0).run()
    
    return c.json({ success: true, id: result.meta.last_row_id, message: 'تم إضافة المنتج بنجاح' })
  } catch (error) {
    return c.json({ success: false, error: 'فشل في إضافة المنتج' }, 500)
  }
})

app.put('/api/products/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const { category_id, name, description, price, image_url, is_available, display_order } = await c.req.json()
    
    await c.env.DB.prepare(
      'UPDATE products SET category_id = ?, name = ?, description = ?, price = ?, image_url = ?, is_available = ?, display_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(category_id, name, description, price, image_url, is_available, display_order, id).run()
    
    return c.json({ success: true, message: 'تم تحديث المنتج بنجاح' })
  } catch (error) {
    return c.json({ success: false, error: 'فشل في تحديث المنتج' }, 500)
  }
})

app.delete('/api/products/:id', async (c) => {
  try {
    const id = c.req.param('id')
    await c.env.DB.prepare('DELETE FROM products WHERE id = ?').bind(id).run()
    return c.json({ success: true, message: 'تم حذف المنتج بنجاح' })
  } catch (error) {
    return c.json({ success: false, error: 'فشل في حذف المنتج' }, 500)
  }
})

// ============ API - الطلبات ============
app.post('/api/orders', async (c) => {
  try {
    const { customer_phone, customer_name, customer_address, items, notes } = await c.req.json()
    
    // حساب المجموع الكلي
    let total = 0
    for (const item of items) {
      total += item.price * item.quantity
    }
    
    // إنشاء الطلب
    const orderResult = await c.env.DB.prepare(
      'INSERT INTO orders (customer_phone, customer_name, customer_address, total_amount, notes) VALUES (?, ?, ?, ?, ?)'
    ).bind(customer_phone, customer_name, customer_address, total, notes || '').run()
    
    const orderId = orderResult.meta.last_row_id
    
    // إضافة تفاصيل الطلب
    for (const item of items) {
      await c.env.DB.prepare(
        'INSERT INTO order_items (order_id, product_id, product_name, product_price, quantity, subtotal) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(orderId, item.id, item.name, item.price, item.quantity, item.price * item.quantity).run()
    }
    
    return c.json({ 
      success: true, 
      order_id: orderId,
      message: 'تم إنشاء الطلب بنجاح' 
    })
  } catch (error) {
    return c.json({ success: false, error: 'فشل في إنشاء الطلب' }, 500)
  }
})

app.get('/api/orders', async (c) => {
  try {
    const phone = c.req.query('phone')
    const status = c.req.query('status')
    
    let query = 'SELECT * FROM orders WHERE 1=1'
    const params = []
    
    if (phone) {
      query += ' AND customer_phone = ?'
      params.push(phone)
    }
    
    if (status) {
      query += ' AND status = ?'
      params.push(status)
    }
    
    query += ' ORDER BY created_at DESC'
    
    const { results } = await c.env.DB.prepare(query).bind(...params).all()
    return c.json({ success: true, data: results })
  } catch (error) {
    return c.json({ success: false, error: 'فشل في جلب الطلبات' }, 500)
  }
})

app.get('/api/orders/:id', async (c) => {
  try {
    const id = c.req.param('id')
    
    const order = await c.env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first()
    
    if (!order) {
      return c.json({ success: false, error: 'الطلب غير موجود' }, 404)
    }
    
    const { results: items } = await c.env.DB.prepare(
      'SELECT * FROM order_items WHERE order_id = ?'
    ).bind(id).all()
    
    return c.json({ 
      success: true, 
      data: { 
        ...order, 
        items 
      } 
    })
  } catch (error) {
    return c.json({ success: false, error: 'فشل في جلب تفاصيل الطلب' }, 500)
  }
})

app.put('/api/orders/:id/status', async (c) => {
  try {
    const id = c.req.param('id')
    const { status } = await c.req.json()
    
    await c.env.DB.prepare(
      'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(status, id).run()
    
    return c.json({ success: true, message: 'تم تحديث حالة الطلب بنجاح' })
  } catch (error) {
    return c.json({ success: false, error: 'فشل في تحديث حالة الطلب' }, 500)
  }
})

// ============ الصفحة الرئيسية ============
app.get('/', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>قريباً - محامص أسرار الوصفة للقهوة</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&display=swap');
        
        body {
            font-family: 'Tajawal', sans-serif;
        }
        
        .gradient-bg {
            background: linear-gradient(135deg, #6B4423 0%, #8B5A3C 50%, #A67C52 100%);
        }
        
        .coffee-animation {
            animation: float 3s ease-in-out infinite;
        }
        
        @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
        }
        
        .pulse-slow {
            animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        .fade-in {
            animation: fadeIn 1s ease-in;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
    </style>
</head>
<body class="gradient-bg min-h-screen flex items-center justify-center p-4">
    <div class="max-w-2xl w-full text-center fade-in">
        <!-- أيقونة القهوة -->
        <div class="coffee-animation mb-8">
            <i class="fas fa-mug-hot text-9xl text-amber-100 drop-shadow-2xl"></i>
        </div>
        
        <!-- العنوان الرئيسي -->
        <h1 class="text-5xl md:text-7xl font-black text-white mb-4 drop-shadow-lg">
            قريباً
        </h1>
        
        <!-- اسم المحمصة -->
        <div class="bg-white/10 backdrop-blur-sm rounded-3xl p-8 mb-8 border-2 border-white/20">
            <h2 class="text-3xl md:text-4xl font-bold text-amber-100 mb-4">
                ☕ محامص أسرار الوصفة للقهوة
            </h2>
            <p class="text-xl text-white/90 leading-relaxed">
                نعمل حالياً على تجهيز متجرنا الإلكتروني ليقدم لكم أفضل تجربة تسوق
            </p>
        </div>
        
        <!-- الميزات -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div class="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <i class="fas fa-coffee text-4xl text-amber-200 mb-3"></i>
                <h3 class="text-lg font-bold text-white mb-2">قهوة طازجة</h3>
                <p class="text-white/80 text-sm">محمصة حديثاً</p>
            </div>
            
            <div class="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <i class="fas fa-shipping-fast text-4xl text-amber-200 mb-3"></i>
                <h3 class="text-lg font-bold text-white mb-2">توصيل سريع</h3>
                <p class="text-white/80 text-sm">لباب منزلك</p>
            </div>
            
            <div class="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <i class="fas fa-star text-4xl text-amber-200 mb-3"></i>
                <h3 class="text-lg font-bold text-white mb-2">جودة عالية</h3>
                <p class="text-white/80 text-sm">منتجات مميزة</p>
            </div>
        </div>
        
        <!-- زر الواتساب -->
        <div class="mb-8">
            <a href="https://wa.me/966500000000" 
               target="_blank"
               class="inline-flex items-center gap-3 bg-green-500 hover:bg-green-600 text-white font-bold text-xl px-10 py-5 rounded-full shadow-2xl transform hover:scale-105 transition-all duration-300 pulse-slow">
                <i class="fab fa-whatsapp text-3xl"></i>
                <span>تواصل معنا الآن</span>
            </a>
        </div>
        
        <!-- رسالة إضافية -->
        <p class="text-white/70 text-lg">
            <i class="fas fa-clock ml-2"></i>
            نعمل على إضافة جميع منتجاتنا المميزة
        </p>
        
        <!-- Footer -->
        <div class="mt-12 pt-8 border-t border-white/20">
            <p class="text-white/60 text-sm">
                جميع الحقوق محفوظة © 2025 - محامص أسرار الوصفة للقهوة
            </p>
        </div>
    </div>
</body>
</html>
  `)
})

// ============ صفحة لوحة التحكم ============
app.get('/admin', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>لوحة التحكم - محامص أسرار الوصفة</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
        
        * {
            font-family: 'Cairo', sans-serif;
        }
        
        body {
            background: linear-gradient(180deg, #FFF8F0 0%, #F5F5F5 100%);
        }
        
        .gradient-bg {
            background: linear-gradient(135deg, #6B4423 0%, #8B5A3C 50%, #A67C52 100%);
            box-shadow: 0 4px 20px rgba(107, 68, 35, 0.2);
        }
        
        .sidebar-link {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            font-weight: 600;
        }
        
        .sidebar-link::before {
            content: '';
            position: absolute;
            right: 0;
            top: 0;
            height: 100%;
            width: 4px;
            background: linear-gradient(180deg, #A67C52 0%, #8B5A3C 100%);
            transform: scaleY(0);
            transition: transform 0.3s ease;
        }
        
        .sidebar-link:hover, .sidebar-link.active {
            background: linear-gradient(90deg, rgba(166, 124, 82, 0.15) 0%, rgba(166, 124, 82, 0.05) 100%);
            transform: translateX(-5px);
        }
        
        .sidebar-link:hover::before, .sidebar-link.active::before {
            transform: scaleY(1);
        }
        
        .stat-card {
            background: white;
            border-radius: 16px;
            padding: 24px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
            transition: all 0.3s ease;
            border: 2px solid transparent;
        }
        
        .stat-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 25px rgba(107, 68, 35, 0.15);
            border-color: #A67C52;
        }
        
        .admin-header {
            backdrop-filter: blur(10px);
            background: linear-gradient(135deg, rgba(107, 68, 35, 0.95) 0%, rgba(139, 90, 60, 0.95) 100%);
        }
    </style>
</head>
<body class="bg-gray-50">
    <!-- Header -->
    <header class="admin-header text-white shadow-2xl sticky top-0 z-50">
        <div class="container mx-auto px-4 py-5">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-4">
                    <div class="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                        <i class="fas fa-tools text-3xl text-amber-200"></i>
                    </div>
                    <div>
                        <h1 class="text-2xl font-black">لوحة التحكم</h1>
                        <p class="text-sm opacity-90 font-semibold">محامص أسرار الوصفة</p>
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    <a href="/" class="bg-white text-amber-900 px-5 py-2.5 rounded-xl font-bold hover:bg-amber-50 transition-all shadow-lg flex items-center gap-2">
                        <i class="fas fa-store"></i>
                        <span class="hidden md:inline">المتجر</span>
                    </a>
                    <button id="logoutBtn" class="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2">
                        <i class="fas fa-sign-out-alt"></i>
                        <span class="hidden md:inline">خروج</span>
                    </button>
                </div>
            </div>
        </div>
    </header>

    <div class="flex">
        <!-- Sidebar -->
        <aside class="w-64 bg-white shadow-lg min-h-screen">
            <nav class="p-4 space-y-2">
                <button class="sidebar-link active w-full text-right px-4 py-3 rounded-lg" data-section="dashboard">
                    <i class="fas fa-chart-line ml-2"></i>
                    لوحة المعلومات
                </button>
                <button class="sidebar-link w-full text-right px-4 py-3 rounded-lg" data-section="products">
                    <i class="fas fa-box ml-2"></i>
                    المنتجات
                </button>
                <button class="sidebar-link w-full text-right px-4 py-3 rounded-lg" data-section="categories">
                    <i class="fas fa-list ml-2"></i>
                    الفئات
                </button>
                <button class="sidebar-link w-full text-right px-4 py-3 rounded-lg" data-section="orders">
                    <i class="fas fa-shopping-bag ml-2"></i>
                    الطلبات
                </button>
                <button class="sidebar-link w-full text-right px-4 py-3 rounded-lg" data-section="settings">
                    <i class="fas fa-cog ml-2"></i>
                    الإعدادات
                </button>
            </nav>
        </aside>

        <!-- Main Content -->
        <main class="flex-1 p-8">
            <!-- Dashboard Section -->
            <div id="dashboardSection" class="section">
                <div class="mb-8">
                    <h2 class="text-4xl font-black text-gray-800 mb-2">لوحة المعلومات</h2>
                    <p class="text-gray-600">نظرة سريعة على إحصائيات متجرك</p>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div class="stat-card">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-500 text-sm font-semibold mb-2">إجمالي المنتجات</p>
                                <p class="text-4xl font-black text-amber-600" id="totalProducts">0</p>
                                <p class="text-xs text-gray-400 mt-1">منتج نشط</p>
                            </div>
                            <div class="bg-gradient-to-br from-amber-100 to-amber-50 p-4 rounded-xl">
                                <i class="fas fa-box text-5xl text-amber-600"></i>
                            </div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-500 text-sm font-semibold mb-2">الطلبات الجديدة</p>
                                <p class="text-4xl font-black text-blue-600" id="newOrders">0</p>
                                <p class="text-xs text-gray-400 mt-1">بانتظار المعالجة</p>
                            </div>
                            <div class="bg-gradient-to-br from-blue-100 to-blue-50 p-4 rounded-xl">
                                <i class="fas fa-bell text-5xl text-blue-600"></i>
                            </div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-500 text-sm font-semibold mb-2">إجمالي الطلبات</p>
                                <p class="text-4xl font-black text-green-600" id="totalOrders">0</p>
                                <p class="text-xs text-gray-400 mt-1">طلب كلي</p>
                            </div>
                            <div class="bg-gradient-to-br from-green-100 to-green-50 p-4 rounded-xl">
                                <i class="fas fa-chart-line text-5xl text-green-600"></i>
                            </div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-500 text-sm font-semibold mb-2">الفئات</p>
                                <p class="text-4xl font-black text-purple-600" id="totalCategories">0</p>
                                <p class="text-xs text-gray-400 mt-1">فئة نشطة</p>
                            </div>
                            <div class="bg-gradient-to-br from-purple-100 to-purple-50 p-4 rounded-xl">
                                <i class="fas fa-list text-5xl text-purple-600"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Products Section -->
            <div id="productsSection" class="section hidden">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-3xl font-bold">إدارة المنتجات</h2>
                    <button id="addProductBtn" class="gradient-bg text-white px-6 py-2 rounded-lg font-bold hover:opacity-90">
                        <i class="fas fa-plus ml-2"></i>
                        إضافة منتج جديد
                    </button>
                </div>
                <div class="bg-white rounded-lg shadow-md overflow-hidden">
                    <table class="w-full">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الصورة</th>
                                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">اسم المنتج</th>
                                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الفئة</th>
                                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">السعر</th>
                                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody id="productsTable">
                            <!-- Products will be loaded here -->
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Categories Section -->
            <div id="categoriesSection" class="section hidden">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-3xl font-bold">إدارة الفئات</h2>
                    <button id="addCategoryBtn" class="gradient-bg text-white px-6 py-2 rounded-lg font-bold hover:opacity-90">
                        <i class="fas fa-plus ml-2"></i>
                        إضافة فئة جديدة
                    </button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="categoriesGrid">
                    <!-- Categories will be loaded here -->
                </div>
            </div>

            <!-- Orders Section -->
            <div id="ordersSection" class="section hidden">
                <h2 class="text-3xl font-bold mb-6">إدارة الطلبات</h2>
                <div class="space-y-4" id="ordersContainer">
                    <!-- Orders will be loaded here -->
                </div>
            </div>

            <!-- Settings Section -->
            <div id="settingsSection" class="section hidden">
                <h2 class="text-3xl font-bold mb-6">إعدادات المتجر</h2>
                <div class="bg-white rounded-lg shadow-md p-6 max-w-2xl">
                    <div class="space-y-4">
                        <div>
                            <label class="block text-gray-700 mb-2">اسم المتجر</label>
                            <input 
                                type="text" 
                                id="storeName" 
                                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-600"
                            >
                        </div>
                        <div>
                            <label class="block text-gray-700 mb-2">رقم الواتساب</label>
                            <input 
                                type="tel" 
                                id="whatsappNumber" 
                                placeholder="966500000000" 
                                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-600"
                            >
                            <p class="text-sm text-gray-500 mt-1">أدخل الرقم بصيغة دولية (مثال: 966500000000)</p>
                        </div>
                        <div>
                            <label class="block text-gray-700 mb-2">رسالة الترحيب</label>
                            <textarea 
                                id="welcomeMessage" 
                                rows="3"
                                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-600"
                            ></textarea>
                        </div>
                        <button id="saveSettingsBtn" class="gradient-bg text-white px-6 py-3 rounded-lg font-bold hover:opacity-90">
                            <i class="fas fa-save ml-2"></i>
                            حفظ الإعدادات
                        </button>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <!-- Product Modal -->
    <div id="productModal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-bold text-gray-800" id="productModalTitle">إضافة منتج جديد</h2>
                <button id="closeProductModal" class="text-gray-500 hover:text-gray-700">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>
            
            <form id="productForm" class="space-y-4">
                <input type="hidden" id="productId">
                <div>
                    <label class="block text-gray-700 mb-2">اسم المنتج</label>
                    <input 
                        type="text" 
                        id="productName" 
                        required
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-600"
                    >
                </div>
                <div>
                    <label class="block text-gray-700 mb-2">الفئة</label>
                    <select 
                        id="productCategory" 
                        required
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-600"
                    >
                        <option value="">اختر الفئة</option>
                    </select>
                </div>
                <div>
                    <label class="block text-gray-700 mb-2">الوصف</label>
                    <textarea 
                        id="productDescription" 
                        rows="3"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-600"
                    ></textarea>
                </div>
                <div>
                    <label class="block text-gray-700 mb-2">السعر (ريال)</label>
                    <input 
                        type="number" 
                        id="productPrice" 
                        step="0.01"
                        required
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-600"
                    >
                </div>
                <div>
                    <label class="block text-gray-700 mb-2">رابط الصورة</label>
                    <input 
                        type="url" 
                        id="productImage" 
                        placeholder="https://example.com/image.jpg"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-600"
                    >
                    <p class="text-sm text-gray-500 mt-1">يمكنك استخدام روابط من مواقع مثل Imgur أو رفع الصور على خدمات استضافة الصور</p>
                </div>
                <div>
                    <label class="block text-gray-700 mb-2">ترتيب العرض</label>
                    <input 
                        type="number" 
                        id="productOrder" 
                        value="0"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-600"
                    >
                </div>
                <div class="flex items-center">
                    <input 
                        type="checkbox" 
                        id="productAvailable" 
                        checked
                        class="w-4 h-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-600"
                    >
                    <label class="mr-2 text-gray-700">متوفر للبيع</label>
                </div>
                <button type="submit" class="w-full gradient-bg text-white py-3 rounded-lg font-bold hover:opacity-90">
                    <i class="fas fa-save ml-2"></i>
                    حفظ المنتج
                </button>
            </form>
        </div>
    </div>

    <!-- Category Modal -->
    <div id="categoryModal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-lg max-w-md w-full p-6">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-bold text-gray-800" id="categoryModalTitle">إضافة فئة جديدة</h2>
                <button id="closeCategoryModal" class="text-gray-500 hover:text-gray-700">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>
            
            <form id="categoryForm" class="space-y-4">
                <input type="hidden" id="categoryId">
                <div>
                    <label class="block text-gray-700 mb-2">اسم الفئة (عربي)</label>
                    <input 
                        type="text" 
                        id="categoryName" 
                        required
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-600"
                    >
                </div>
                <div>
                    <label class="block text-gray-700 mb-2">اسم الفئة (إنجليزي)</label>
                    <input 
                        type="text" 
                        id="categoryNameEn" 
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-600"
                    >
                </div>
                <div>
                    <label class="block text-gray-700 mb-2">ترتيب العرض</label>
                    <input 
                        type="number" 
                        id="categoryOrder" 
                        value="0"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-600"
                    >
                </div>
                <button type="submit" class="w-full gradient-bg text-white py-3 rounded-lg font-bold hover:opacity-90">
                    <i class="fas fa-save ml-2"></i>
                    حفظ الفئة
                </button>
            </form>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
    <script src="/static/admin.js"></script>
</body>
</html>
  `)
})

export default app
