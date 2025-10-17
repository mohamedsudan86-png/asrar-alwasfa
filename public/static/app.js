// حالة التطبيق
const state = {
    products: [],
    categories: [],
    settings: {},
    cart: JSON.parse(localStorage.getItem('cart') || '[]'),
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    currentPhone: ''
}

// تحميل البيانات عند بدء التطبيق
document.addEventListener('DOMContentLoaded', async () => {
    await loadSettings()
    await loadCategories()
    await loadProducts()
    updateCartUI()
    setupEventListeners()
    checkUserLogin()
})

// تحميل الإعدادات
async function loadSettings() {
    try {
        const response = await axios.get('/api/settings')
        if (response.data.success) {
            state.settings = response.data.data
            
            // تحديث رابط الواتساب
            const whatsappBtn = document.getElementById('whatsappBtn')
            const whatsappNumber = state.settings.whatsapp_number || '966500000000'
            const message = encodeURIComponent('مرحباً، أود الاستفسار عن منتجاتكم')
            whatsappBtn.href = `https://wa.me/${whatsappNumber}?text=${message}`
        }
    } catch (error) {
        console.error('خطأ في تحميل الإعدادات:', error)
    }
}

// تحميل الفئات
async function loadCategories() {
    try {
        const response = await axios.get('/api/categories')
        if (response.data.success) {
            state.categories = response.data.data
            renderCategoryFilter()
        }
    } catch (error) {
        console.error('خطأ في تحميل الفئات:', error)
    }
}

// عرض الفئات في الفلتر
function renderCategoryFilter() {
    const filter = document.getElementById('categoryFilter')
    filter.innerHTML = '<option value="">جميع الفئات</option>'
    
    state.categories.forEach(category => {
        filter.innerHTML += `<option value="${category.id}">${category.name}</option>`
    })
}

// تحميل المنتجات
async function loadProducts(categoryId = '', search = '') {
    try {
        document.getElementById('loadingState').classList.remove('hidden')
        document.getElementById('emptyState').classList.add('hidden')
        
        let url = '/api/products'
        const params = []
        if (categoryId) params.push(`category_id=${categoryId}`)
        if (search) params.push(`search=${encodeURIComponent(search)}`)
        if (params.length) url += '?' + params.join('&')
        
        const response = await axios.get(url)
        
        document.getElementById('loadingState').classList.add('hidden')
        
        if (response.data.success) {
            state.products = response.data.data
            renderProducts()
        }
    } catch (error) {
        console.error('خطأ في تحميل المنتجات:', error)
        document.getElementById('loadingState').classList.add('hidden')
        document.getElementById('emptyState').classList.remove('hidden')
    }
}

// عرض المنتجات
function renderProducts() {
    const grid = document.getElementById('productsGrid')
    
    if (state.products.length === 0) {
        grid.innerHTML = ''
        document.getElementById('emptyState').classList.remove('hidden')
        return
    }
    
    document.getElementById('emptyState').classList.add('hidden')
    
    grid.innerHTML = state.products.map(product => `
        <div class="bg-white rounded-2xl shadow-xl overflow-hidden card-hover relative group">
            <!-- صورة المنتج -->
            <div class="product-image relative h-64 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                ${product.image_url ? 
                    `<img src="${product.image_url}" alt="${product.name}" class="w-full h-full object-cover" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 200 200%27%3E%3Crect fill=%27%23f3f4f6%27 width=%27200%27 height=%27200%27/%3E%3Ctext x=%2750%25%27 y=%2745%25%27 dominant-baseline=%27middle%27 text-anchor=%27middle%27 font-family=%27Cairo%27 font-size=%2716%27 fill=%27%236b7280%27%3E${product.name}%3C/text%3E%3Ctext x=%2750%25%27 y=%2760%25%27 dominant-baseline=%27middle%27 text-anchor=%27middle%27 font-family=%27Arial%27 font-size=%2740%27 fill=%27%239ca3af%27%3E☕%3C/text%3E%3C/svg%3E'">` : 
                    `<div class="w-full h-full flex flex-col items-center justify-center">
                        <i class="fas fa-mug-hot text-7xl text-amber-200 mb-3"></i>
                        <span class="text-gray-500 font-bold">${product.name}</span>
                    </div>`
                }
                
                <!-- شارة الفئة -->
                ${product.category_name ? `<div class="category-badge absolute top-3 right-3 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg">
                    <i class="fas fa-tag ml-1"></i>
                    ${product.category_name}
                </div>` : ''}
                
                <!-- حالة عدم التوفر -->
                ${!product.is_available ? `
                    <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-black/40 backdrop-blur-sm flex items-center justify-center">
                        <div class="text-center">
                            <i class="fas fa-times-circle text-5xl text-red-400 mb-2"></i>
                            <p class="text-white font-bold text-xl">غير متوفر حالياً</p>
                        </div>
                    </div>
                ` : ''}
                
                <!-- شارة جديد -->
                ${product.display_order < 3 ? `
                    <div class="absolute top-3 left-3 bg-gradient-to-r from-red-500 to-pink-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg animate-pulse">
                        <i class="fas fa-star ml-1"></i>
                        جديد
                    </div>
                ` : ''}
            </div>
            
            <!-- معلومات المنتج -->
            <div class="p-5">
                <h3 class="font-black text-xl mb-2 text-gray-800 group-hover:text-amber-700 transition-colors line-clamp-1">
                    ${product.name}
                </h3>
                
                ${product.description ? `
                    <p class="text-gray-600 text-sm mb-4 line-clamp-2 leading-relaxed">
                        ${product.description}
                    </p>
                ` : '<div class="mb-4"></div>'}
                
                <div class="flex items-center justify-between border-t pt-4">
                    <div>
                        <div class="text-xs text-gray-500 mb-1">السعر</div>
                        <div class="price-tag text-3xl font-black">${product.price} ر.س</div>
                    </div>
                    
                    ${product.is_available ? 
                        `<button onclick="addToCart(${product.id})" class="btn-primary text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg relative z-10">
                            <i class="fas fa-cart-plus ml-2"></i>
                            أضف للسلة
                        </button>` : 
                        `<button class="bg-gray-300 text-gray-600 px-6 py-3 rounded-xl font-bold cursor-not-allowed" disabled>
                            <i class="fas fa-ban ml-2"></i>
                            غير متوفر
                        </button>`
                    }
                </div>
            </div>
            
            <!-- تأثير الهوفر -->
            <div class="absolute inset-0 border-2 border-amber-400 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
        </div>
    `).join('')
    
    // إضافة زر العودة للأعلى
    setupScrollToTop()
}

// إضافة منتج للسلة
function addToCart(productId) {
    const product = state.products.find(p => p.id === productId)
    if (!product || !product.is_available) return
    
    const existingItem = state.cart.find(item => item.id === productId)
    
    if (existingItem) {
        existingItem.quantity++
    } else {
        state.cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image_url: product.image_url,
            quantity: 1
        })
    }
    
    saveCart()
    updateCartUI()
    
    // عرض رسالة نجاح
    showNotification('تم إضافة المنتج إلى السلة', 'success')
}

// حذف منتج من السلة
function removeFromCart(productId) {
    state.cart = state.cart.filter(item => item.id !== productId)
    saveCart()
    updateCartUI()
    renderCart()
}

// تحديث كمية المنتج
function updateQuantity(productId, change) {
    const item = state.cart.find(item => item.id === productId)
    if (!item) return
    
    item.quantity += change
    
    if (item.quantity <= 0) {
        removeFromCart(productId)
        return
    }
    
    saveCart()
    updateCartUI()
    renderCart()
}

// حفظ السلة في localStorage
function saveCart() {
    localStorage.setItem('cart', JSON.stringify(state.cart))
}

// تحديث واجهة السلة
function updateCartUI() {
    const cartCount = document.getElementById('cartCount')
    const totalItems = state.cart.reduce((sum, item) => sum + item.quantity, 0)
    
    if (totalItems > 0) {
        cartCount.textContent = totalItems
        cartCount.classList.remove('hidden')
    } else {
        cartCount.classList.add('hidden')
    }
}

// عرض محتويات السلة
function renderCart() {
    const cartItems = document.getElementById('cartItems')
    const cartEmpty = document.getElementById('cartEmpty')
    const cartSummary = document.getElementById('cartSummary')
    const cartTotal = document.getElementById('cartTotal')
    
    if (state.cart.length === 0) {
        cartItems.innerHTML = ''
        cartEmpty.classList.remove('hidden')
        cartSummary.classList.add('hidden')
        return
    }
    
    cartEmpty.classList.add('hidden')
    cartSummary.classList.remove('hidden')
    
    let total = 0
    
    cartItems.innerHTML = state.cart.map(item => {
        const subtotal = item.price * item.quantity
        total += subtotal
        
        return `
            <div class="flex items-center gap-4 bg-gray-50 p-4 rounded-lg">
                <div class="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                    ${item.image_url ? 
                        `<img src="${item.image_url}" alt="${item.name}" class="w-full h-full object-cover">` : 
                        `<div class="w-full h-full flex items-center justify-center">
                            <i class="fas fa-image text-2xl text-gray-400"></i>
                        </div>`
                    }
                </div>
                <div class="flex-1">
                    <h3 class="font-bold text-gray-800">${item.name}</h3>
                    <p class="text-yellow-700 font-bold">${item.price} ريال</p>
                </div>
                <div class="flex items-center gap-2">
                    <button onclick="updateQuantity(${item.id}, -1)" class="w-8 h-8 bg-gray-300 rounded-full hover:bg-gray-400">
                        <i class="fas fa-minus text-sm"></i>
                    </button>
                    <span class="w-8 text-center font-bold">${item.quantity}</span>
                    <button onclick="updateQuantity(${item.id}, 1)" class="w-8 h-8 bg-yellow-600 text-white rounded-full hover:bg-yellow-700">
                        <i class="fas fa-plus text-sm"></i>
                    </button>
                </div>
                <button onclick="removeFromCart(${item.id})" class="text-red-600 hover:text-red-700">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `
    }).join('')
    
    cartTotal.textContent = `${total.toFixed(2)} ريال`
}

// إعداد مستمعي الأحداث
function setupEventListeners() {
    // البحث
    const searchInput = document.getElementById('searchInput')
    searchInput.addEventListener('input', (e) => {
        const categoryId = document.getElementById('categoryFilter').value
        loadProducts(categoryId, e.target.value)
    })
    
    // فلتر الفئات
    const categoryFilter = document.getElementById('categoryFilter')
    categoryFilter.addEventListener('change', (e) => {
        const search = document.getElementById('searchInput').value
        loadProducts(e.target.value, search)
    })
    
    // زر السلة
    const cartBtn = document.getElementById('cartBtn')
    cartBtn.addEventListener('click', () => {
        renderCart()
        document.getElementById('cartModal').classList.remove('hidden')
    })
    
    // إغلاق السلة
    const closeCart = document.getElementById('closeCart')
    closeCart.addEventListener('click', () => {
        document.getElementById('cartModal').classList.add('hidden')
    })
    
    // زر تسجيل الدخول
    const loginBtn = document.getElementById('loginBtn')
    loginBtn.addEventListener('click', () => {
        document.getElementById('loginModal').classList.remove('hidden')
    })
    
    // إغلاق تسجيل الدخول
    const closeLogin = document.getElementById('closeLogin')
    closeLogin.addEventListener('click', () => {
        document.getElementById('loginModal').classList.add('hidden')
    })
    
    // إرسال OTP
    const sendOtpBtn = document.getElementById('sendOtpBtn')
    sendOtpBtn.addEventListener('click', sendOTP)
    
    // التحقق من OTP
    const verifyOtpBtn = document.getElementById('verifyOtpBtn')
    verifyOtpBtn.addEventListener('click', verifyOTP)
    
    // العودة إلى إدخال الجوال
    const backToPhone = document.getElementById('backToPhone')
    backToPhone.addEventListener('click', () => {
        document.getElementById('otpStep').classList.add('hidden')
        document.getElementById('phoneStep').classList.remove('hidden')
    })
    
    // زر إتمام الطلب
    const checkoutBtn = document.getElementById('checkoutBtn')
    checkoutBtn.addEventListener('click', () => {
        if (state.cart.length === 0) return
        
        document.getElementById('cartModal').classList.add('hidden')
        
        // ملء البيانات إذا كان المستخدم مسجل الدخول
        if (state.user) {
            document.getElementById('checkoutPhone').value = state.user.phone || ''
            document.getElementById('checkoutName').value = state.user.name || ''
        }
        
        const total = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
        document.getElementById('checkoutTotal').textContent = `${total.toFixed(2)} ريال`
        
        document.getElementById('checkoutModal').classList.remove('hidden')
    })
    
    // إغلاق صفحة الطلب
    const closeCheckout = document.getElementById('closeCheckout')
    closeCheckout.addEventListener('click', () => {
        document.getElementById('checkoutModal').classList.add('hidden')
    })
    
    // تأكيد الطلب
    const confirmOrderBtn = document.getElementById('confirmOrderBtn')
    confirmOrderBtn.addEventListener('click', confirmOrder)
}

// إرسال رمز التحقق
async function sendOTP() {
    const phone = document.getElementById('phoneInput').value.trim()
    
    if (!phone || phone.length < 10) {
        showNotification('يرجى إدخال رقم جوال صحيح', 'error')
        return
    }
    
    try {
        const response = await axios.post('/api/auth/send-otp', { phone })
        
        if (response.data.success) {
            state.currentPhone = phone
            document.getElementById('phoneStep').classList.add('hidden')
            document.getElementById('otpStep').classList.remove('hidden')
            
            // عرض رمز OTP (للتطوير فقط)
            if (response.data.otp) {
                document.getElementById('otpDisplay').textContent = `رمز التحقق: ${response.data.otp}`
            }
            
            showNotification('تم إرسال رمز التحقق إلى جوالك', 'success')
        } else {
            showNotification(response.data.error || 'فشل في إرسال رمز التحقق', 'error')
        }
    } catch (error) {
        console.error('خطأ:', error)
        showNotification('حدث خطأ أثناء إرسال رمز التحقق', 'error')
    }
}

// التحقق من رمز OTP
async function verifyOTP() {
    const otp = document.getElementById('otpInput').value.trim()
    const name = document.getElementById('nameInput').value.trim()
    
    if (!otp || otp.length !== 6) {
        showNotification('يرجى إدخال رمز التحقق المكون من 6 أرقام', 'error')
        return
    }
    
    try {
        const response = await axios.post('/api/auth/verify-otp', {
            phone: state.currentPhone,
            otp: otp,
            name: name
        })
        
        if (response.data.success) {
            state.user = response.data.user
            localStorage.setItem('user', JSON.stringify(state.user))
            
            document.getElementById('loginModal').classList.add('hidden')
            updateLoginButton()
            
            showNotification('تم تسجيل الدخول بنجاح', 'success')
        } else {
            showNotification(response.data.error || 'رمز التحقق غير صحيح', 'error')
        }
    } catch (error) {
        console.error('خطأ:', error)
        showNotification('حدث خطأ أثناء التحقق من الرمز', 'error')
    }
}

// التحقق من تسجيل الدخول
function checkUserLogin() {
    if (state.user) {
        updateLoginButton()
    }
}

// تحديث زر تسجيل الدخول
function updateLoginButton() {
    const loginBtn = document.getElementById('loginBtn')
    if (state.user) {
        loginBtn.innerHTML = `
            <i class="fas fa-user ml-1"></i>
            ${state.user.name || state.user.phone}
        `
    }
}

// تأكيد الطلب
async function confirmOrder() {
    const phone = document.getElementById('checkoutPhone').value.trim()
    const name = document.getElementById('checkoutName').value.trim()
    const address = document.getElementById('checkoutAddress').value.trim()
    const notes = document.getElementById('checkoutNotes').value.trim()
    
    if (!phone || !name || !address) {
        showNotification('يرجى ملء جميع الحقول المطلوبة', 'error')
        return
    }
    
    if (state.cart.length === 0) {
        showNotification('السلة فارغة', 'error')
        return
    }
    
    try {
        const response = await axios.post('/api/orders', {
            customer_phone: phone,
            customer_name: name,
            customer_address: address,
            items: state.cart,
            notes: notes
        })
        
        if (response.data.success) {
            // مسح السلة
            state.cart = []
            saveCart()
            updateCartUI()
            
            document.getElementById('checkoutModal').classList.add('hidden')
            
            showNotification('تم إرسال طلبك بنجاح! سنتواصل معك قريباً', 'success')
            
            // إعادة تعيين الحقول
            document.getElementById('checkoutPhone').value = ''
            document.getElementById('checkoutName').value = ''
            document.getElementById('checkoutAddress').value = ''
            document.getElementById('checkoutNotes').value = ''
        } else {
            showNotification(response.data.error || 'فشل في إرسال الطلب', 'error')
        }
    } catch (error) {
        console.error('خطأ:', error)
        showNotification('حدث خطأ أثناء إرسال الطلب', 'error')
    }
}

// زر العودة للأعلى
function setupScrollToTop() {
    const scrollBtn = document.getElementById('scrollTopBtn')
    
    if (!scrollBtn) return
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            scrollBtn.classList.remove('hidden')
        } else {
            scrollBtn.classList.add('hidden')
        }
    })
    
    scrollBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        })
    })
}

// عرض إشعار محسّن
function showNotification(message, type = 'info') {
    // إنشاء عنصر الإشعار
    const notification = document.createElement('div')
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-times-circle',
        info: 'fa-info-circle'
    }
    
    const colors = {
        success: 'bg-gradient-to-r from-green-500 to-emerald-600',
        error: 'bg-gradient-to-r from-red-500 to-rose-600',
        info: 'bg-gradient-to-r from-blue-500 to-indigo-600'
    }
    
    notification.className = `fixed top-24 left-1/2 transform -translate-x-1/2 px-8 py-4 rounded-2xl shadow-2xl z-[60] text-white font-bold transition-all ${colors[type]} flex items-center gap-3 animate-slide-down`
    notification.innerHTML = `
        <i class="fas ${icons[type]} text-2xl"></i>
        <span class="text-lg">${message}</span>
    `
    
    document.body.appendChild(notification)
    
    // تأثير الدخول
    setTimeout(() => {
        notification.style.transform = 'translate(-50%, 0)'
    }, 10)
    
    // إزالة الإشعار بعد 3 ثوانٍ
    setTimeout(() => {
        notification.style.opacity = '0'
        notification.style.transform = 'translate(-50%, -20px)'
        setTimeout(() => notification.remove(), 300)
    }, 3000)
}

// إضافة styles للتحريك
const style = document.createElement('style')
style.textContent = `
    @keyframes slide-down {
        from {
            opacity: 0;
            transform: translate(-50%, -100px);
        }
        to {
            opacity: 1;
            transform: translate(-50%, 0);
        }
    }
    .animate-slide-down {
        animation: slide-down 0.5s ease-out;
    }
`
document.head.appendChild(style)
