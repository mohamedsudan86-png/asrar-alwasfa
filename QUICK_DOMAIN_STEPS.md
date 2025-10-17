# ⚡ خطوات سريعة: ربط دومين خاص

## 🎯 الخطوات (5 دقائق)

### 1️⃣ بعد شراء الدومين:

اذهب إلى Cloudflare Dashboard:
```
https://dash.cloudflare.com
```

### 2️⃣ أضف الموقع:

```
Add a Site → أدخل دومينك → Free Plan
```

### 3️⃣ غيّر Nameservers:

في موقع شراء الدومين، غيّر Nameservers إلى:
```
(انسخها من Cloudflare)
```

### 4️⃣ في Terminal:

```bash
cd /home/user/webapp
npx wrangler pages domain add YOUR-DOMAIN.com --project-name asrar-alwasfa
```

### 5️⃣ انتظر:

1-48 ساعة حتى يتم تفعيل DNS

### 6️⃣ اختبر:

افتح دومينك في المتصفح! ✅

---

## 🎉 انتهيت!

- ✅ البيانات لم تتغير
- ✅ الموقع نفسه
- ✅ فقط الرابط الجديد

---

## 💡 مثال عملي:

إذا اشتريت `asrar-coffee.com`:

```bash
# الخطوة 1: إضافة لـ Cloudflare Dashboard
# (عبر الموقع)

# الخطوة 2: ربط بـ Pages
npx wrangler pages domain add asrar-coffee.com --project-name asrar-alwasfa

# الخطوة 3: اختبار
curl -I https://asrar-coffee.com
```

---

## 📞 محتاج مساعدة؟

أخبرني باسم دومينك وسأساعدك مباشرة!

---

راجع `CUSTOM_DOMAIN_GUIDE.md` للدليل الكامل المفصل.
