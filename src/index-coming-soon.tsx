import { Hono } from 'hono'

const app = new Hono()

// صفحة "قريباً" فقط
app.get('*', (c) => {
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

export default app
