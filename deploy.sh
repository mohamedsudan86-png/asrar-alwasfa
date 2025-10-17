#!/bin/bash

# 🚀 سكريبت النشر التلقائي لموقع محامص أسرار الوصفة
# هذا السكريبت يساعدك في نشر الموقع على Cloudflare Pages

set -e  # إيقاف عند أي خطأ

echo "🚀 بدء عملية النشر..."
echo "================================"

# الألوان للرسائل
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# دالة لطباعة رسائل ملونة
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# التحقق من وجود wrangler
if ! command -v wrangler &> /dev/null; then
    print_error "wrangler غير مثبت!"
    print_info "يرجى تثبيته أولاً: npm install -g wrangler"
    exit 1
fi

# التحقق من تسجيل الدخول
print_info "التحقق من تسجيل الدخول إلى Cloudflare..."
if ! wrangler whoami &> /dev/null; then
    print_error "لم تقم بتسجيل الدخول إلى Cloudflare!"
    print_info "يرجى إعداد API Token أولاً"
    print_info "راجع ملف DEPLOYMENT_GUIDE.md للتعليمات"
    exit 1
fi

print_success "تم التحقق من تسجيل الدخول"

# سؤال المستخدم عن نوع النشر
echo ""
print_info "اختر نوع النشر:"
echo "1) نشر كامل (أول مرة)"
echo "2) تحديث فقط"
read -p "اختيارك (1 أو 2): " choice

if [ "$choice" = "1" ]; then
    echo ""
    print_info "النشر الكامل - سيتم إنشاء كل شيء من البداية"
    echo ""
    
    # إنشاء قاعدة البيانات
    print_info "الخطوة 1/5: إنشاء قاعدة البيانات D1..."
    echo ""
    print_warning "ملاحظة: إذا كانت قاعدة البيانات موجودة بالفعل، سيتم تخطي هذه الخطوة"
    echo ""
    
    if wrangler d1 create asrar-alwasfa-production 2>&1 | grep -q "already exists"; then
        print_success "قاعدة البيانات موجودة بالفعل"
    else
        print_success "تم إنشاء قاعدة البيانات"
        echo ""
        print_warning "مهم جداً!"
        print_warning "انسخ database_id من الناتج أعلاه"
        print_warning "وضعه في ملف wrangler.jsonc"
        echo ""
        read -p "اضغط Enter بعد تحديث wrangler.jsonc..."
    fi
    
    # تطبيق Migrations
    print_info "الخطوة 2/5: تطبيق migrations على قاعدة البيانات..."
    npm run db:migrate:prod
    print_success "تم تطبيق migrations"
    
    # إنشاء مشروع Pages
    print_info "الخطوة 3/5: إنشاء مشروع Cloudflare Pages..."
    if wrangler pages project create asrar-alwasfa --production-branch main 2>&1 | grep -q "already exists"; then
        print_success "المشروع موجود بالفعل"
    else
        print_success "تم إنشاء المشروع"
    fi
    
elif [ "$choice" = "2" ]; then
    print_info "تحديث سريع - سيتم نشر آخر التغييرات فقط"
else
    print_error "اختيار غير صحيح!"
    exit 1
fi

# البناء
echo ""
print_info "بناء المشروع..."
npm run build
print_success "تم البناء بنجاح"

# النشر
echo ""
print_info "نشر الموقع على Cloudflare Pages..."
npm run deploy

echo ""
print_success "🎉 تم النشر بنجاح!"
echo ""
print_info "رابط موقعك:"
echo -e "${GREEN}https://asrar-alwasfa.pages.dev${NC}"
echo ""
print_info "لوحة التحكم:"
echo -e "${GREEN}https://asrar-alwasfa.pages.dev/admin${NC}"
echo ""
print_info "بيانات الدخول:"
echo "رقم الجوال: 0500000000"
echo "رمز OTP: سيظهر تلقائياً"
echo ""
print_warning "لا تنسى:"
echo "1. تحديث رقم الواتساب في الإعدادات"
echo "2. إضافة منتجاتك الحقيقية"
echo "3. حذف المنتجات التجريبية"
echo ""
print_success "عمل رائع! 🚀"
