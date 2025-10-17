# 🌐 دليل ربط الدومين الخاص

## 📋 نظرة عامة

عند شراء دومين خاص (مثل: `asrar-coffee.com`)، يمكنك ربطه بموقعك على Cloudflare Pages **بدون نقل البيانات**!

**لماذا؟** 
- ✅ الموقع يبقى على Cloudflare Pages
- ✅ قاعدة البيانات تبقى كما هي
- ✅ فقط نغير الرابط من `.pages.dev` إلى دومينك

---

## 🎯 الخطوات الكاملة:

### المرحلة 1: شراء الدومين

#### أفضل مواقع شراء الدومينات:

**للدومينات السعودية (.sa):**
- https://nic.sa - الجهة الرسمية
- https://saudidomains.com
- https://namecheap.com (يدعم .sa)

**للدومينات الدولية (.com, .net, .store):**
- https://namecheap.com (موصى به - رخيص وسهل)
- https://cloudflare.com/products/registrar (الأرخص!)
- https://porkbun.com
- https://godaddy.com

**الأسعار التقريبية:**
- `.com`: 10-15$ سنوياً
- `.net`: 12-18$ سنوياً
- `.store`: 20-30$ سنوياً
- `.sa`: 100-300 ريال سنوياً

---

### المرحلة 2: ربط الدومين بـ Cloudflare

بعد شراء الدومين، لديك خياران:

#### ✅ الخيار 1: إضافة الدومين مباشرة لـ Cloudflare (الأفضل)

**الخطوة 1: إضافة الموقع لـ Cloudflare**
1. اذهب إلى: https://dash.cloudflare.com
2. اضغط "Add a Site"
3. أدخل دومينك (مثال: `asrar-coffee.com`)
4. اختر الخطة المجانية (Free Plan)
5. اضغط "Continue"

**الخطوة 2: تغيير Nameservers**
سيعطيك Cloudflare nameservers مثل:
```
ava.ns.cloudflare.com
wade.ns.cloudflare.com
```

اذهب لموقع شراء الدومين:
1. ابحث عن "Nameservers" أو "DNS Settings"
2. غيّر Nameservers إلى القيم من Cloudflare
3. احفظ (قد يستغرق 24-48 ساعة للتفعيل)

**الخطوة 3: ربط الدومين بـ Pages**
في Terminal:
```bash
cd /home/user/webapp
npx wrangler pages domain add asrar-coffee.com --project-name asrar-alwasfa
```

**الخطوة 4: إعداد DNS تلقائياً**
Cloudflare سيضيف DNS records تلقائياً!

---

#### الخيار 2: استخدام CNAME (أسرع لكن أقل مميزات)

إذا أردت إبقاء الدومين في شركة الشراء:

**في إعدادات DNS عند شركة الدومين:**
```
Type: CNAME
Name: @ (أو www)
Value: asrar-alwasfa.pages.dev
TTL: Auto
```

ثم في Wrangler:
```bash
npx wrangler pages domain add asrar-coffee.com --project-name asrar-alwasfa
```

---

### المرحلة 3: التحقق من الربط

#### اختبار الدومين:
```bash
# اختبر DNS
nslookup asrar-coffee.com

# اختبر الاتصال
curl -I https://asrar-coffee.com
```

#### افتح في المتصفح:
```
https://asrar-coffee.com
```

يجب أن ترى موقعك! 🎉

---

## 🔄 ماذا يحدث للبيانات؟

### ✅ لا يحدث شيء للبيانات!

| البيان | قبل الدومين | بعد الدومين |
|--------|-------------|--------------|
| قاعدة البيانات D1 | ✅ نفسها | ✅ نفسها |
| المنتجات | ✅ نفسها | ✅ نفسها |
| الطلبات | ✅ نفسها | ✅ نفسها |
| المستخدمين | ✅ نفسهم | ✅ نفسهم |
| الإعدادات | ✅ نفسها | ✅ نفسها |

**فقط الرابط يتغير:**
- ❌ القديم: `asrar-alwasfa.pages.dev`
- ✅ الجديد: `asrar-coffee.com`

---

## 📱 أمثلة للدومينات المقترحة:

### للمحامص:
- `asrar-alwasfa.com`
- `asrarcoffee.com`
- `asrar-coffee.sa`
- `asrar-roastery.com`

### نصائح اختيار الاسم:
- ✅ قصير وسهل التذكر
- ✅ سهل النطق بالعربية
- ✅ يعبر عن المحمصة
- ❌ تجنب الأرقام والرموز
- ❌ تجنب الأسماء المعقدة

---

## 🔧 إعدادات DNS كاملة (للمحترفين)

إذا أردت إعدادات متقدمة:

```bash
# إضافة www subdomain
npx wrangler pages domain add www.asrar-coffee.com --project-name asrar-alwasfa

# إضافة subdomain للمعاينة
npx wrangler pages domain add preview.asrar-coffee.com --project-name asrar-alwasfa
```

في Cloudflare DNS:
```
Type: CNAME
Name: www
Value: asrar-alwasfa.pages.dev
Proxied: Yes (البرتقالي)

Type: CNAME
Name: preview
Value: preview.asrar-alwasfa.pages.dev
Proxied: Yes
```

---

## 🚀 بعد ربط الدومين:

### 1. تحديث الإعدادات:
اذهب لوحة التحكم → الإعدادات:
- غيّر "اسم الموقع" إذا لزم
- تحديث روابط التواصل

### 2. تحديث SEO:
في `src/index.tsx`، غيّر:
```typescript
<meta property="og:url" content="https://asrar-coffee.com">
<link rel="canonical" href="https://asrar-coffee.com">
```

### 3. إعادة النشر:
```bash
cd /home/user/webapp
npm run build
npx wrangler pages deploy dist --project-name asrar-alwasfa
```

---

## 💰 التكاليف المتوقعة:

| البند | السعر | تكرار |
|------|-------|-------|
| دومين .com | 10-15$ | سنوياً |
| دومين .sa | 100-300 ريال | سنوياً |
| Cloudflare Hosting | **مجاناً** | - |
| قاعدة البيانات D1 | **مجاناً** (5GB) | - |
| SSL Certificate | **مجاناً** | - |
| CDN عالمي | **مجاناً** | - |

**المجموع:** فقط سعر الدومين! 🎉

---

## 🎯 الجدول الزمني:

| الخطوة | الوقت |
|--------|-------|
| شراء الدومين | 10 دقائق |
| تغيير Nameservers | 1-48 ساعة |
| ربط بـ Cloudflare Pages | 5 دقائق |
| تفعيل SSL | تلقائي (دقائق) |
| **المجموع** | **يوم واحد تقريباً** |

---

## ⚠️ ملاحظات مهمة:

### 1. الرابط القديم يبقى يعمل:
```
https://asrar-alwasfa.pages.dev  ← يعمل
https://asrar-coffee.com         ← يعمل
```
كلاهما يعرض نفس الموقع!

### 2. SSL تلقائي:
Cloudflare يوفر SSL مجاناً - موقعك سيكون `https://` تلقائياً!

### 3. لا حاجة لإعادة رفع البيانات:
كل شيء موجود ويعمل - فقط الرابط يتغير!

### 4. يمكن التراجع:
إذا لم يعجبك الدومين، يمكن حذفه والعودة لـ `.pages.dev`

---

## 🆘 مشاكل شائعة وحلولها:

### المشكلة: "DNS_PROBE_FINISHED_NXDOMAIN"
**الحل:** انتظر 24-48 ساعة، DNS يستغرق وقت للتحديث

### المشكلة: "SSL Certificate Error"
**الحل:** في Cloudflare، تأكد من تفعيل "Always Use HTTPS"

### المشكلة: "Too Many Redirects"
**الحل:** في Cloudflare SSL/TLS، اختر "Full" mode

---

## 📞 هل تحتاج مساعدة؟

عند شراء الدومين، أخبرني:
1. اسم الدومين الذي اشتريته
2. الشركة التي اشتريت منها
3. أي رسائل خطأ تظهر

وسأساعدك خطوة بخطوة! 🚀

---

## 💡 نصيحة ذهبية:

**لا تستعجل شراء الدومين!**

الرابط المجاني `.pages.dev` احترافي وكافي للبداية:
- ✅ مجاني للأبد
- ✅ SSL مجاني
- ✅ CDN عالمي
- ✅ سريع جداً

اشترِ الدومين عندما:
- ✅ يكبر مشروعك
- ✅ تريد هوية تجارية مميزة
- ✅ تريد بناء علامة تجارية

---

**🎯 باختصار: شراء دومين = تغيير الرابط فقط، البيانات تبقى كما هي!**
