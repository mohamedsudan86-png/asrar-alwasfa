// حالة لوحة التحكم
const adminState = {
    products: [],
    categories: [],
    orders: [],
    settings: {},
    currentSection: 'dashboard'
}

// تحميل البيانات عند بدء التطبيق
document.addEventListener('DOMContentLoaded', async () => {
    await loadAllData()
    setupAdminEventListeners()
    updateDashboardStats()
})

// تحميل جميع البيانات
async function loadAllData() {
    await Promise.all([
        loadSettings(),
        loadCategories(),
        loadProducts(),
        loadOrders()
    ])
}

// تحميل الإعدادات
async function loadSettings() {
    try {
        const response = await axios.get('/api/settings')
        if (response.data.success) {
            adminState.settings = response.data.data
            
            // ملء الحقول
            document.getElementById('storeName').value = adminState.settings.store_name || ''
            document.getElementById('whatsappNumber').value = adminState.settings.whatsapp_number || ''
            document.getElementById('welcomeMessage').value = adminState.settings.welcome_message || ''
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
            adminState.categories = response.data.data
            renderCategories()
            updateCategorySelects()
        }
    } catch (error) {
        console.error('خطأ في تحميل الفئات:', error)
    }
}

// تحميل المنتجات
async function loadProducts() {
    try {
        const response = await axios.get('/api/products')
        if (response.data.success) {
            adminState.products = response.data.data
            renderProductsTable()
        }
    } catch (error) {
        console.error('خطأ في تحميل المنتجات:', error)
    }
}

// تحميل الطلبات
async function loadOrders() {
    try {
        const response = await axios.get('/api/orders')
        if (response.data.success) {
            adminState.orders = response.data.data
            renderOrders()
        }
    } catch (error) {
        console.error('خطأ في تحميل الطلبات:', error)
    }
}

// عرض الفئات
function renderCategories() {
    const grid = document.getElementById('categoriesGrid')
    
    if (adminState.categories.length === 0) {
        grid.innerHTML = '<p class="text-gray-500 col-span-full text-center py-8">لا توجد فئات</p>'
        return
    }
    
    grid.innerHTML = adminState.categories.map(category => `
        <div class="bg-white p-6 rounded-lg shadow-md">
            <div class="flex items-center justify-between mb-3">
                <h3 class="text-xl font-bold text-gray-800">${category.name}</h3>
                <span class="px-3 py-1 rounded-full text-sm ${category.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${category.is_active ? 'نشط' : 'غير نشط'}
                </span>
            </div>
            ${category.name_en ? `<p class="text-gray-600 text-sm mb-3">${category.name_en}</p>` : ''}
            <p class="text-gray-500 text-sm mb-4">ترتيب العرض: ${category.display_order}</p>
            <div class="flex gap-2">
                <button onclick="editCategory(${category.id})" class="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                    <i class="fas fa-edit ml-1"></i>
                    تعديل
                </button>
                <button onclick="deleteCategory(${category.id})" class="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">
                    <i class="fas fa-trash ml-1"></i>
                    حذف
                </button>
            </div>
        </div>
    `).join('')
}

// عرض جدول المنتجات
function renderProductsTable() {
    const table = document.getElementById('productsTable')
    
    if (adminState.products.length === 0) {
        table.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-500">لا توجد منتجات</td></tr>'
        return
    }
    
    table.innerHTML = adminState.products.map(product => `
        <tr class="border-b hover:bg-gray-50">
            <td class="px-6 py-4">
                <div class="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden">
                    ${product.image_url ? 
                        `<img src="${product.image_url}" alt="${product.name}" class="w-full h-full object-cover">` : 
                        `<div class="w-full h-full flex items-center justify-center">
                            <i class="fas fa-image text-gray-400"></i>
                        </div>`
                    }
                </div>
            </td>
            <td class="px-6 py-4">
                <div class="font-bold text-gray-800">${product.name}</div>
                ${product.description ? `<div class="text-sm text-gray-500 mt-1">${product.description.substring(0, 50)}${product.description.length > 50 ? '...' : ''}</div>` : ''}
            </td>
            <td class="px-6 py-4 text-gray-600">${product.category_name || '-'}</td>
            <td class="px-6 py-4 font-bold text-yellow-700">${product.price} ريال</td>
            <td class="px-6 py-4">
                <span class="px-3 py-1 rounded-full text-sm ${product.is_available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${product.is_available ? 'متوفر' : 'غير متوفر'}
                </span>
            </td>
            <td class="px-6 py-4">
                <div class="flex gap-2">
                    <button onclick="editProduct(${product.id})" class="text-blue-600 hover:text-blue-800" title="تعديل">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteProduct(${product.id})" class="text-red-600 hover:text-red-800" title="حذف">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('')
}

// عرض الطلبات
function renderOrders() {
    const container = document.getElementById('ordersContainer')
    
    if (adminState.orders.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-8">لا توجد طلبات</p>'
        return
    }
    
    container.innerHTML = adminState.orders.map(order => {
        const statusColors = {
            'pending': 'bg-yellow-100 text-yellow-800',
            'confirmed': 'bg-blue-100 text-blue-800',
            'delivered': 'bg-green-100 text-green-800',
            'cancelled': 'bg-red-100 text-red-800'
        }
        
        const statusLabels = {
            'pending': 'قيد الانتظار',
            'confirmed': 'تم التأكيد',
            'delivered': 'تم التوصيل',
            'cancelled': 'ملغي'
        }
        
        return `
            <div class="bg-white rounded-lg shadow-md p-6">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h3 class="text-xl font-bold text-gray-800">طلب رقم #${order.id}</h3>
                        <p class="text-gray-600 text-sm mt-1">
                            <i class="fas fa-calendar ml-1"></i>
                            ${new Date(order.created_at).toLocaleString('ar-SA')}
                        </p>
                    </div>
                    <span class="px-4 py-2 rounded-full text-sm font-bold ${statusColors[order.status]}">
                        ${statusLabels[order.status]}
                    </span>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <p class="text-gray-600 text-sm">العميل</p>
                        <p class="font-bold text-gray-800">${order.customer_name}</p>
                    </div>
                    <div>
                        <p class="text-gray-600 text-sm">رقم الجوال</p>
                        <p class="font-bold text-gray-800">${order.customer_phone}</p>
                    </div>
                    <div class="md:col-span-2">
                        <p class="text-gray-600 text-sm">العنوان</p>
                        <p class="font-bold text-gray-800">${order.customer_address}</p>
                    </div>
                    ${order.notes ? `
                        <div class="md:col-span-2">
                            <p class="text-gray-600 text-sm">ملاحظات</p>
                            <p class="text-gray-800">${order.notes}</p>
                        </div>
                    ` : ''}
                </div>
                
                <div class="border-t pt-4">
                    <div class="flex justify-between items-center mb-4">
                        <span class="text-gray-700 font-bold">المجموع الكلي:</span>
                        <span class="text-2xl font-bold text-yellow-700">${order.total_amount} ريال</span>
                    </div>
                    
                    <div class="flex gap-2">
                        <button onclick="viewOrderDetails(${order.id})" class="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                            <i class="fas fa-eye ml-1"></i>
                            عرض التفاصيل
                        </button>
                        ${order.status === 'pending' ? `
                            <button onclick="updateOrderStatus(${order.id}, 'confirmed')" class="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                                <i class="fas fa-check ml-1"></i>
                                تأكيد
                            </button>
                        ` : ''}
                        ${order.status === 'confirmed' ? `
                            <button onclick="updateOrderStatus(${order.id}, 'delivered')" class="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                                <i class="fas fa-truck ml-1"></i>
                                تم التوصيل
                            </button>
                        ` : ''}
                        ${order.status !== 'cancelled' && order.status !== 'delivered' ? `
                            <button onclick="updateOrderStatus(${order.id}, 'cancelled')" class="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">
                                <i class="fas fa-times ml-1"></i>
                                إلغاء
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `
    }).join('')
}

// تحديث حقول اختيار الفئة
function updateCategorySelects() {
    const selects = document.querySelectorAll('#productCategory')
    
    selects.forEach(select => {
        const currentValue = select.value
        select.innerHTML = '<option value="">اختر الفئة</option>' + 
            adminState.categories.map(cat => 
                `<option value="${cat.id}">${cat.name}</option>`
            ).join('')
        
        if (currentValue) {
            select.value = currentValue
        }
    })
}

// تحديث إحصائيات لوحة المعلومات
function updateDashboardStats() {
    document.getElementById('totalProducts').textContent = adminState.products.length
    document.getElementById('totalCategories').textContent = adminState.categories.length
    document.getElementById('totalOrders').textContent = adminState.orders.length
    document.getElementById('newOrders').textContent = adminState.orders.filter(o => o.status === 'pending').length
}

// إعداد مستمعي الأحداث
function setupAdminEventListeners() {
    // التنقل بين الأقسام
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.addEventListener('click', (e) => {
            const section = e.currentTarget.dataset.section
            switchSection(section)
        })
    })
    
    // زر إضافة منتج
    document.getElementById('addProductBtn').addEventListener('click', () => {
        openProductModal()
    })
    
    // زر إضافة فئة
    document.getElementById('addCategoryBtn').addEventListener('click', () => {
        openCategoryModal()
    })
    
    // نموذج المنتج
    document.getElementById('productForm').addEventListener('submit', saveProduct)
    
    // نموذج الفئة
    document.getElementById('categoryForm').addEventListener('submit', saveCategory)
    
    // إغلاق النوافذ المنبثقة
    document.getElementById('closeProductModal').addEventListener('click', () => {
        document.getElementById('productModal').classList.add('hidden')
    })
    
    document.getElementById('closeCategoryModal').addEventListener('click', () => {
        document.getElementById('categoryModal').classList.add('hidden')
    })
    
    // حفظ الإعدادات
    document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings)
}

// التبديل بين الأقسام
function switchSection(section) {
    // إخفاء جميع الأقسام
    document.querySelectorAll('.section').forEach(sec => {
        sec.classList.add('hidden')
    })
    
    // إزالة التحديد من جميع الروابط
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.classList.remove('active')
    })
    
    // إظهار القسم المحدد
    document.getElementById(`${section}Section`).classList.remove('hidden')
    
    // تحديد الرابط النشط
    document.querySelector(`[data-section="${section}"]`).classList.add('active')
    
    adminState.currentSection = section
}

// فتح نافذة المنتج
function openProductModal(productId = null) {
    const modal = document.getElementById('productModal')
    const form = document.getElementById('productForm')
    const title = document.getElementById('productModalTitle')
    
    form.reset()
    updateCategorySelects()
    
    if (productId) {
        const product = adminState.products.find(p => p.id === productId)
        if (product) {
            title.textContent = 'تعديل المنتج'
            document.getElementById('productId').value = product.id
            document.getElementById('productName').value = product.name
            document.getElementById('productCategory').value = product.category_id
            document.getElementById('productDescription').value = product.description || ''
            document.getElementById('productPrice').value = product.price
            document.getElementById('productImage').value = product.image_url || ''
            document.getElementById('productOrder').value = product.display_order
            document.getElementById('productAvailable').checked = product.is_available === 1
        }
    } else {
        title.textContent = 'إضافة منتج جديد'
        document.getElementById('productId').value = ''
    }
    
    modal.classList.remove('hidden')
}

// فتح نافذة الفئة
function openCategoryModal(categoryId = null) {
    const modal = document.getElementById('categoryModal')
    const form = document.getElementById('categoryForm')
    const title = document.getElementById('categoryModalTitle')
    
    form.reset()
    
    if (categoryId) {
        const category = adminState.categories.find(c => c.id === categoryId)
        if (category) {
            title.textContent = 'تعديل الفئة'
            document.getElementById('categoryId').value = category.id
            document.getElementById('categoryName').value = category.name
            document.getElementById('categoryNameEn').value = category.name_en || ''
            document.getElementById('categoryOrder').value = category.display_order
        }
    } else {
        title.textContent = 'إضافة فئة جديدة'
        document.getElementById('categoryId').value = ''
    }
    
    modal.classList.remove('hidden')
}

// حفظ المنتج
async function saveProduct(e) {
    e.preventDefault()
    
    const productId = document.getElementById('productId').value
    const data = {
        category_id: document.getElementById('productCategory').value,
        name: document.getElementById('productName').value,
        description: document.getElementById('productDescription').value,
        price: parseFloat(document.getElementById('productPrice').value),
        image_url: document.getElementById('productImage').value,
        display_order: parseInt(document.getElementById('productOrder').value),
        is_available: document.getElementById('productAvailable').checked ? 1 : 0
    }
    
    try {
        let response
        if (productId) {
            response = await axios.put(`/api/products/${productId}`, data)
        } else {
            response = await axios.post('/api/products', data)
        }
        
        if (response.data.success) {
            showNotification(response.data.message || 'تم الحفظ بنجاح', 'success')
            document.getElementById('productModal').classList.add('hidden')
            await loadProducts()
            updateDashboardStats()
        } else {
            showNotification(response.data.error || 'فشل في الحفظ', 'error')
        }
    } catch (error) {
        console.error('خطأ:', error)
        showNotification('حدث خطأ أثناء الحفظ', 'error')
    }
}

// حفظ الفئة
async function saveCategory(e) {
    e.preventDefault()
    
    const categoryId = document.getElementById('categoryId').value
    const data = {
        name: document.getElementById('categoryName').value,
        name_en: document.getElementById('categoryNameEn').value,
        display_order: parseInt(document.getElementById('categoryOrder').value),
        is_active: 1
    }
    
    try {
        let response
        if (categoryId) {
            response = await axios.put(`/api/categories/${categoryId}`, data)
        } else {
            response = await axios.post('/api/categories', data)
        }
        
        if (response.data.success) {
            showNotification(response.data.message || 'تم الحفظ بنجاح', 'success')
            document.getElementById('categoryModal').classList.add('hidden')
            await loadCategories()
            updateDashboardStats()
        } else {
            showNotification(response.data.error || 'فشل في الحفظ', 'error')
        }
    } catch (error) {
        console.error('خطأ:', error)
        showNotification('حدث خطأ أثناء الحفظ', 'error')
    }
}

// تعديل منتج
function editProduct(productId) {
    openProductModal(productId)
}

// حذف منتج
async function deleteProduct(productId) {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return
    
    try {
        const response = await axios.delete(`/api/products/${productId}`)
        
        if (response.data.success) {
            showNotification('تم حذف المنتج بنجاح', 'success')
            await loadProducts()
            updateDashboardStats()
        } else {
            showNotification(response.data.error || 'فشل في الحذف', 'error')
        }
    } catch (error) {
        console.error('خطأ:', error)
        showNotification('حدث خطأ أثناء الحذف', 'error')
    }
}

// تعديل فئة
function editCategory(categoryId) {
    openCategoryModal(categoryId)
}

// حذف فئة
async function deleteCategory(categoryId) {
    if (!confirm('هل أنت متأكد من حذف هذه الفئة؟')) return
    
    try {
        const response = await axios.delete(`/api/categories/${categoryId}`)
        
        if (response.data.success) {
            showNotification('تم حذف الفئة بنجاح', 'success')
            await loadCategories()
            updateDashboardStats()
        } else {
            showNotification(response.data.error || 'فشل في الحذف', 'error')
        }
    } catch (error) {
        console.error('خطأ:', error)
        showNotification('حدث خطأ أثناء الحذف', 'error')
    }
}

// عرض تفاصيل الطلب
async function viewOrderDetails(orderId) {
    try {
        const response = await axios.get(`/api/orders/${orderId}`)
        
        if (response.data.success) {
            const order = response.data.data
            
            let itemsHtml = order.items.map(item => `
                <div class="flex justify-between py-2 border-b">
                    <div>
                        <p class="font-bold">${item.product_name}</p>
                        <p class="text-sm text-gray-600">الكمية: ${item.quantity}</p>
                    </div>
                    <p class="font-bold text-yellow-700">${item.subtotal} ريال</p>
                </div>
            `).join('')
            
            alert(`تفاصيل الطلب #${order.id}\n\nالمنتجات:\n${order.items.map(i => `- ${i.product_name} (${i.quantity}x) = ${i.subtotal} ريال`).join('\n')}\n\nالمجموع الكلي: ${order.total_amount} ريال`)
        }
    } catch (error) {
        console.error('خطأ:', error)
        showNotification('فشل في تحميل تفاصيل الطلب', 'error')
    }
}

// تحديث حالة الطلب
async function updateOrderStatus(orderId, status) {
    try {
        const response = await axios.put(`/api/orders/${orderId}/status`, { status })
        
        if (response.data.success) {
            showNotification('تم تحديث حالة الطلب بنجاح', 'success')
            await loadOrders()
            updateDashboardStats()
        } else {
            showNotification(response.data.error || 'فشل في تحديث الحالة', 'error')
        }
    } catch (error) {
        console.error('خطأ:', error)
        showNotification('حدث خطأ أثناء تحديث الحالة', 'error')
    }
}

// حفظ الإعدادات
async function saveSettings() {
    const settings = {
        store_name: document.getElementById('storeName').value,
        whatsapp_number: document.getElementById('whatsappNumber').value,
        welcome_message: document.getElementById('welcomeMessage').value
    }
    
    try {
        for (const [key, value] of Object.entries(settings)) {
            await axios.post('/api/settings', { key, value })
        }
        
        showNotification('تم حفظ الإعدادات بنجاح', 'success')
        await loadSettings()
    } catch (error) {
        console.error('خطأ:', error)
        showNotification('حدث خطأ أثناء حفظ الإعدادات', 'error')
    }
}

// عرض إشعار
function showNotification(message, type = 'info') {
    const notification = document.createElement('div')
    notification.className = `fixed top-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg z-50 text-white font-bold transition-all ${
        type === 'success' ? 'bg-green-600' : 
        type === 'error' ? 'bg-red-600' : 
        'bg-blue-600'
    }`
    notification.textContent = message
    
    document.body.appendChild(notification)
    
    setTimeout(() => {
        notification.style.opacity = '0'
        setTimeout(() => notification.remove(), 300)
    }, 3000)
}
