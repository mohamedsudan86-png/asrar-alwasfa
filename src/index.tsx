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
    <title>محامص أسرار الوصفة للقهوة - أجود أنواع القهوة والمكسرات</title>
    <meta name="description" content="محامص أسرار الوصفة للقهوة - نقدم أجود أنواع البن المحمص والمكسرات الطازجة والمخبوزات اللذيذة مع خدمة التوصيل">
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
        
        * {
            font-family: 'Cairo', sans-serif;
        }
        
        body {
            background: linear-gradient(180deg, #FFF8F0 0%, #FFFFFF 100%);
        }
        
        .gradient-bg {
            background: linear-gradient(135deg, #6B4423 0%, #8B5A3C 50%, #A67C52 100%);
            position: relative;
            overflow: hidden;
        }
        
        .gradient-bg::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320"><path fill="%23ffffff" fill-opacity="0.1" d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,122.7C672,117,768,139,864,138.7C960,139,1056,117,1152,96C1248,75,1344,53,1392,42.7L1440,32L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path></svg>') no-repeat bottom;
            background-size: cover;
            opacity: 0.3;
        }
        
        .hero-section {
            background: linear-gradient(135deg, rgba(107, 68, 35, 0.95) 0%, rgba(139, 90, 60, 0.95) 100%),
                        url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320"><path fill="%23f3f4f6" fill-opacity="0.1" d="M0,96L48,112C96,128,192,160,288,165.3C384,171,480,149,576,128C672,107,768,85,864,90.7C960,96,1056,128,1152,133.3C1248,139,1344,117,1392,106.7L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path></svg>');
            padding: 60px 0;
            margin-bottom: 40px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }
        
        .card-hover {
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            border: 2px solid transparent;
        }
        
        .card-hover:hover {
            transform: translateY(-8px) scale(1.02);
            box-shadow: 0 20px 40px rgba(107, 68, 35, 0.2);
            border-color: #A67C52;
        }
        
        .product-image {
            position: relative;
            overflow: hidden;
            border-radius: 12px 12px 0 0;
        }
        
        .product-image img {
            transition: transform 0.5s ease;
        }
        
        .card-hover:hover .product-image img {
            transform: scale(1.1);
        }
        
        .whatsapp-float {
            position: fixed;
            bottom: 80px;
            left: 20px;
            background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
            color: white;
            border-radius: 50%;
            width: 65px;
            height: 65px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 8px 25px rgba(37, 211, 102, 0.4);
            z-index: 1000;
            cursor: pointer;
            transition: all 0.3s ease;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0%, 100% {
                box-shadow: 0 8px 25px rgba(37, 211, 102, 0.4);
            }
            50% {
                box-shadow: 0 8px 35px rgba(37, 211, 102, 0.6);
            }
        }
        
        .whatsapp-float:hover {
            transform: scale(1.15) rotate(5deg);
            box-shadow: 0 12px 35px rgba(37, 211, 102, 0.6);
        }
        
        .cart-badge {
            position: absolute;
            top: -8px;
            right: -8px;
            background: linear-gradient(135deg, #DC2626 0%, #991B1B 100%);
            color: white;
            border-radius: 50%;
            width: 26px;
            height: 26px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 13px;
            font-weight: bold;
            box-shadow: 0 2px 8px rgba(220, 38, 38, 0.4);
            animation: bounce 1s ease infinite;
        }
        
        @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
        }
        
        .category-badge {
            background: linear-gradient(135deg, rgba(107, 68, 35, 0.9) 0%, rgba(139, 90, 60, 0.9) 100%);
            backdrop-filter: blur(10px);
        }
        
        .price-tag {
            background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            font-weight: 900;
        }
        
        .search-box {
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
            transition: all 0.3s ease;
        }
        
        .search-box:focus-within {
            box-shadow: 0 8px 25px rgba(107, 68, 35, 0.15);
            transform: translateY(-2px);
        }
        
        .btn-primary {
            background: linear-gradient(135deg, #8B5A3C 0%, #6B4423 100%);
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }
        
        .btn-primary::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 0;
            height: 0;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.2);
            transform: translate(-50%, -50%);
            transition: width 0.6s, height 0.6s;
        }
        
        .btn-primary:hover::before {
            width: 300px;
            height: 300px;
        }
        
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(107, 68, 35, 0.3);
        }
        
        .section-title {
            position: relative;
            display: inline-block;
            padding-bottom: 15px;
        }
        
        .section-title::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 100px;
            height: 4px;
            background: linear-gradient(90deg, transparent, #A67C52, transparent);
            border-radius: 2px;
        }
        
        .loading-spinner {
            border: 4px solid #f3f4f6;
            border-top: 4px solid #8B5A3C;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .header-logo {
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        }
        
        /* تحسينات الجوال */
        @media (max-width: 768px) {
            .hero-section {
                padding: 40px 0;
            }
            
            .whatsapp-float {
                bottom: 70px;
                width: 60px;
                height: 60px;
            }
        }
    </style>
</head>
<body class="min-h-screen">
    <!-- Header -->
    <header class="gradient-bg text-white shadow-2xl sticky top-0 z-50 backdrop-blur-sm">
        <div class="container mx-auto px-4 py-5">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-4">
                    <div class="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                        <i class="fas fa-mug-hot text-4xl text-amber-200"></i>
                    </div>
                    <div>
                        <h1 class="text-2xl font-black header-logo">محامص أسرار الوصفة</h1>
                        <p class="text-sm opacity-90 font-semibold">✨ للقهوة والمكسرات والمخبوزات ✨</p>
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    <button id="cartBtn" class="relative bg-white/20 hover:bg-white/30 p-3 rounded-xl transition-all backdrop-blur-sm">
                        <i class="fas fa-shopping-cart text-2xl"></i>
                        <span id="cartCount" class="cart-badge hidden">0</span>
                    </button>
                    <button id="loginBtn" class="bg-white text-amber-900 px-5 py-2.5 rounded-xl font-bold hover:bg-amber-50 transition-all shadow-lg hidden md:flex items-center gap-2">
                        <i class="fas fa-user"></i>
                        <span>تسجيل الدخول</span>
                    </button>
                </div>
            </div>
        </div>
    </header>

    <!-- Hero Section -->
    <section class="hero-section text-white">
        <div class="container mx-auto px-4 text-center relative z-10">
            <div class="max-w-3xl mx-auto">
                <h2 class="text-4xl md:text-5xl font-black mb-4 animate-fade-in">
                    <i class="fas fa-star text-amber-300"></i>
                    أجود أنواع القهوة والمكسرات
                    <i class="fas fa-star text-amber-300"></i>
                </h2>
                <p class="text-xl md:text-2xl mb-6 opacity-90 font-semibold">
                    محمصة بحب وخبرة لتصلك طازجة إلى باب منزلك
                </p>
                <div class="flex flex-wrap justify-center gap-4 mb-6">
                    <div class="bg-white/20 backdrop-blur-md px-6 py-3 rounded-full">
                        <i class="fas fa-truck text-amber-300 ml-2"></i>
                        <span class="font-bold">توصيل سريع</span>
                    </div>
                    <div class="bg-white/20 backdrop-blur-md px-6 py-3 rounded-full">
                        <i class="fas fa-shield-alt text-amber-300 ml-2"></i>
                        <span class="font-bold">جودة مضمونة</span>
                    </div>
                    <div class="bg-white/20 backdrop-blur-md px-6 py-3 rounded-full">
                        <i class="fas fa-hand-holding-usd text-amber-300 ml-2"></i>
                        <span class="font-bold">دفع عند الاستلام</span>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Search & Filters -->
    <div class="container mx-auto px-4 -mt-8 mb-8 relative z-20">
        <div class="bg-white rounded-2xl shadow-2xl p-6">
            <div class="flex flex-col md:flex-row gap-4">
                <div class="flex-1 relative">
                    <i class="fas fa-search absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                    <input 
                        type="text" 
                        id="searchInput" 
                        placeholder="ابحث عن القهوة، المكسرات، المخبوزات..." 
                        class="search-box w-full pr-12 pl-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 text-lg"
                    >
                </div>
                <div class="relative">
                    <i class="fas fa-filter absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                    <select id="categoryFilter" class="search-box pr-12 pl-6 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 text-lg font-semibold cursor-pointer appearance-none bg-white min-w-[200px]">
                        <option value="">🏷️ جميع الفئات</option>
                    </select>
                    <i class="fas fa-chevron-down absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"></i>
                </div>
            </div>
        </div>
    </div>

    <!-- Products Section -->
    <main class="container mx-auto px-4 pb-16">
        <div class="text-center mb-10">
            <h3 class="section-title text-4xl font-black text-gray-800 inline-block">
                منتجاتنا المميزة
            </h3>
            <p class="text-gray-600 text-lg mt-4">اختر من تشكيلتنا الواسعة من المنتجات الطازجة</p>
        </div>
        
        <div id="productsGrid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            <!-- Products will be loaded here -->
        </div>
        
        <div id="loadingState" class="text-center py-20">
            <div class="loading-spinner mx-auto mb-6"></div>
            <p class="text-xl text-gray-600 font-semibold">جاري تحميل المنتجات الرائعة...</p>
        </div>
        
        <div id="emptyState" class="hidden text-center py-20">
            <div class="text-8xl mb-6">📦</div>
            <h4 class="text-2xl font-bold text-gray-700 mb-2">لا توجد منتجات متاحة</h4>
            <p class="text-gray-500">جرب تغيير الفلتر أو البحث</p>
        </div>
    </main>

    <!-- WhatsApp Float Button -->
    <a href="#" id="whatsappBtn" class="whatsapp-float group" title="تواصل معنا عبر واتساب">
        <i class="fab fa-whatsapp text-4xl group-hover:scale-110 transition-transform"></i>
    </a>
    
    <!-- Scroll to Top Button -->
    <button id="scrollTopBtn" class="hidden fixed bottom-20px right-20px bg-amber-600 hover:bg-amber-700 text-white rounded-full w-14 h-14 shadow-lg transition-all z-50">
        <i class="fas fa-arrow-up text-xl"></i>
    </button>

    <!-- Login Modal -->
    <div id="loginModal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-lg max-w-md w-full p-6">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-bold text-gray-800">تسجيل الدخول</h2>
                <button id="closeLogin" class="text-gray-500 hover:text-gray-700">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>
            
            <div id="phoneStep" class="space-y-4">
                <div>
                    <label class="block text-gray-700 mb-2">رقم الجوال</label>
                    <input 
                        type="tel" 
                        id="phoneInput" 
                        placeholder="05xxxxxxxx" 
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-600"
                        maxlength="10"
                    >
                </div>
                <button id="sendOtpBtn" class="w-full gradient-bg text-white py-3 rounded-lg font-bold hover:opacity-90">
                    إرسال رمز التحقق
                </button>
            </div>
            
            <div id="otpStep" class="hidden space-y-4">
                <div>
                    <label class="block text-gray-700 mb-2">رمز التحقق</label>
                    <input 
                        type="text" 
                        id="otpInput" 
                        placeholder="أدخل الرمز المكون من 6 أرقام" 
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-600"
                        maxlength="6"
                    >
                    <p class="text-sm text-gray-500 mt-2">تم إرسال رمز التحقق إلى رقم الجوال</p>
                    <p id="otpDisplay" class="text-sm text-green-600 mt-1 font-bold"></p>
                </div>
                <div>
                    <label class="block text-gray-700 mb-2">الاسم (اختياري)</label>
                    <input 
                        type="text" 
                        id="nameInput" 
                        placeholder="أدخل اسمك" 
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-600"
                    >
                </div>
                <button id="verifyOtpBtn" class="w-full gradient-bg text-white py-3 rounded-lg font-bold hover:opacity-90">
                    تحقق وتسجيل الدخول
                </button>
                <button id="backToPhone" class="w-full text-gray-600 py-2 hover:text-gray-800">
                    العودة
                </button>
            </div>
        </div>
    </div>

    <!-- Cart Modal -->
    <div id="cartModal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-bold text-gray-800">
                    <i class="fas fa-shopping-cart ml-2"></i>
                    سلة المشتريات
                </h2>
                <button id="closeCart" class="text-gray-500 hover:text-gray-700">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>
            
            <div id="cartItems" class="space-y-3 mb-4">
                <!-- Cart items will be loaded here -->
            </div>
            
            <div id="cartEmpty" class="hidden text-center py-8 text-gray-500">
                <i class="fas fa-shopping-cart text-5xl mb-3"></i>
                <p>السلة فارغة</p>
            </div>
            
            <div id="cartSummary" class="hidden border-t pt-4">
                <div class="flex justify-between items-center text-xl font-bold mb-4">
                    <span>المجموع الكلي:</span>
                    <span id="cartTotal" class="text-yellow-700">0 ريال</span>
                </div>
                <button id="checkoutBtn" class="w-full gradient-bg text-white py-3 rounded-lg font-bold hover:opacity-90">
                    إتمام الطلب
                </button>
            </div>
        </div>
    </div>

    <!-- Checkout Modal -->
    <div id="checkoutModal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-lg max-w-md w-full p-6">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-bold text-gray-800">إتمام الطلب</h2>
                <button id="closeCheckout" class="text-gray-500 hover:text-gray-700">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>
            
            <div class="space-y-4">
                <div>
                    <label class="block text-gray-700 mb-2">رقم الجوال</label>
                    <input 
                        type="tel" 
                        id="checkoutPhone" 
                        placeholder="05xxxxxxxx" 
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-600"
                    >
                </div>
                <div>
                    <label class="block text-gray-700 mb-2">الاسم</label>
                    <input 
                        type="text" 
                        id="checkoutName" 
                        placeholder="أدخل اسمك" 
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-600"
                    >
                </div>
                <div>
                    <label class="block text-gray-700 mb-2">العنوان</label>
                    <textarea 
                        id="checkoutAddress" 
                        placeholder="أدخل عنوانك الكامل" 
                        rows="3"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-600"
                    ></textarea>
                </div>
                <div>
                    <label class="block text-gray-700 mb-2">ملاحظات (اختياري)</label>
                    <textarea 
                        id="checkoutNotes" 
                        placeholder="أي ملاحظات على الطلب" 
                        rows="2"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-600"
                    ></textarea>
                </div>
                <div class="bg-yellow-50 p-4 rounded-lg">
                    <p class="text-gray-700 mb-2">المجموع الكلي:</p>
                    <p class="text-2xl font-bold text-yellow-700" id="checkoutTotal">0 ريال</p>
                    <p class="text-sm text-gray-600 mt-2">
                        <i class="fas fa-info-circle ml-1"></i>
                        الدفع عند الاستلام
                    </p>
                </div>
                <button id="confirmOrderBtn" class="w-full gradient-bg text-white py-3 rounded-lg font-bold hover:opacity-90">
                    تأكيد الطلب
                </button>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
    <script src="/static/app.js"></script>
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
