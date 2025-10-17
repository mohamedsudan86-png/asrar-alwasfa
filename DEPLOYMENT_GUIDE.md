# 🚀 دليل النشر على Cloudflare Pages

## المتطلبات
- حساب Cloudflare مجاني (إذا لم يكن لديك)
- Cloudflare API Token

---

## الخطوة 1: إنشاء حساب Cloudflare

1. اذهب إلى: https://dash.cloudflare.com/sign-up
2. أدخل بريدك الإلكتروني وكلمة المرور
3. تحقق من بريدك الإلكتروني
4. سجّل الدخول إلى لوحة التحكم

---

## الخطوة 2: إنشاء API Token

### الطريقة السهلة (API Key):
1. اذهب إلى: https://dash.cloudflare.com/profile/api-tokens
2. في قسم "API Keys"، اضغط على "View" بجانب "Global API Key"
3. أدخل كلمة المرور للتأكيد
4. انسخ المفتاح (سيبدأ بـ...)

### الطريقة الأفضل (Custom Token):
1. اذهب إلى: https://dash.cloudflare.com/profile/api-tokens
2. اضغط على "Create Token"
3. اختر "Edit Cloudflare Workers" template
4. أو استخدم الإعدادات التالية:
   - **Permissions:**
     - Account → Cloudflare Pages → Edit
     - Account → Account Settings → Read
   - **Account Resources:**
     - Include → [حسابك]
5. اضغط "Continue to summary"
6. اضغط "Create Token"
7. **انسخ Token واحفظه في مكان آمن** (لن تراه مرة أخرى!)

---

## الخطوة 3: إضافة API Token في GenSpark

1. في GenSpark، اذهب إلى تبويب **"Deploy"** في القائمة الجانبية
2. اضغط على **"Cloudflare"**
3. الصق الـ API Token الذي نسخته
4. اضغط **"Save"**

---

## الخطوة 4: النشر من Terminal

بعد إعداد API Token، قم بتشغيل هذه الأوامر:

### أ) إنشاء قاعدة البيانات في Cloudflare

```bash
cd /home/user/webapp
npx wrangler d1 create asrar-alwasfa-production
```

**مهم جداً:** انسخ `database_id` من النتيجة

### ب) تحديث wrangler.jsonc

افتح ملف `wrangler.jsonc` وحدّث `database_id`:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "asrar-alwasfa",
  "compatibility_date": "2025-10-17",
  "pages_build_output_dir": "./dist",
  "compatibility_flags": ["nodejs_compat"],
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "asrar-alwasfa-production",
      "database_id": "ضع-الـ-database_id-هنا"  // 👈 هنا!
    }
  ]
}
```

### ج) تطبيق Migrations على قاعدة البيانات الإنتاجية

```bash
npm run db:migrate:prod
```

### د) إنشاء مشروع Cloudflare Pages

```bash
npx wrangler pages project create asrar-alwasfa --production-branch main
```

### هـ) النشر!

```bash
npm run deploy
```

---

## الخطوة 5: الحصول على رابط موقعك

بعد النشر الناجح، ستحصل على رابطين:

1. **Production URL:**
   ```
   https://asrar-alwasfa.pages.dev
   ```
   هذا هو رابط موقعك الرسمي!

2. **Deployment URL:**
   ```
   https://[random-id].asrar-alwasfa.pages.dev
   ```
   رابط خاص بكل نشر

---

## 🎯 بعد النشر

### إضافة رقم واتساب حقيقي:

1. اذهب إلى: `https://asrar-alwasfa.pages.dev/admin`
2. سجّل الدخول برقم: `0500000000`
3. اذهب إلى "الإعدادات"
4. غيّر رقم الواتساب إلى رقمك الحقيقي (بصيغة دولية)
   - مثال: `966500000000` (بدون + أو 00)
5. احفظ التغييرات

### إضافة منتجاتك:

1. في لوحة التحكم، اذهب إلى "المنتجات"
2. احذف المنتجات التجريبية
3. أضف منتجاتك الحقيقية مع:
   - صور عالية الجودة (استخدم Imgur)
   - أسعار صحيحة
   - وصف واضح

---

## 🔧 إعدادات متقدمة (اختيارية)

### إضافة متغيرات بيئة (Secrets):

إذا كان لديك API keys أخرى (مثل بوابة دفع):

```bash
npx wrangler pages secret put API_KEY --project-name asrar-alwasfa
```

### ربط دومين خاص (عندما تحصل عليه لاحقاً):

```bash
npx wrangler pages domain add yourdomain.com --project-name asrar-alwasfa
```

---

## ❓ حل المشاكل الشائعة

### مشكلة: "Authentication error"
**الحل:** تأكد من صحة API Token

### مشكلة: "Database not found"
**الحل:** تأكد من تطبيق migrations: `npm run db:migrate:prod`

### مشكلة: "Build failed"
**الحل:** تأكد من تشغيل `npm run build` محلياً أولاً للتأكد من عدم وجود أخطاء

---

## 📞 الدعم

إذا واجهت أي مشكلة:
1. راجع logs: `npx wrangler pages deployment list --project-name asrar-alwasfa`
2. تحقق من Cloudflare Dashboard: https://dash.cloudflare.com/

---

## ✅ قائمة التحقق النهائية

- [ ] إنشاء حساب Cloudflare
- [ ] إنشاء API Token
- [ ] إضافة Token في GenSpark Deploy Tab
- [ ] إنشاء قاعدة البيانات D1
- [ ] تحديث wrangler.jsonc بـ database_id
- [ ] تطبيق migrations
- [ ] إنشاء مشروع Pages
- [ ] النشر
- [ ] تحديث رقم الواتساب
- [ ] إضافة منتجات حقيقية
- [ ] اختبار الموقع

---

**🎉 مبروك! موقعك أصبح على الإنترنت!**
