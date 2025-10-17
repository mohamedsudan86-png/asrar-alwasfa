# 🚀 دليل النشر المبسط - خطوتين فقط!

## ✅ الخطوة 1: أحضر Global API Key من Cloudflare

### أ) افتح الرابط التالي:
```
https://dash.cloudflare.com/profile/api-tokens
```

### ب) اسحب الصفحة للأسفل حتى ترى:
```
API Keys  (ليس API Tokens!)
```

### ج) اضغط "View" بجانب "Global API Key"

### د) أدخل كلمة المرور → انسخ المفتاح

---

## ✅ الخطوة 2: احفظ المفتاح في GenSpark

### أ) في GenSpark، اذهب لتبويب "Deploy" 🚀

### ب) اختر "Cloudflare"

### ج) الصق المفتاح → Save

---

## 🎉 انتهيت! الآن شغّل:

```bash
cd /home/user/webapp
./deploy.sh
```

اختر **"1"** للنشر الكامل

---

## ❓ مشكلة: لا أتذكر كلمة المرور

**الحل:**
1. اذهب: https://dash.cloudflare.com/login
2. اضغط "Forgot password"
3. افتح بريدك → اضغط الرابط
4. ضع كلمة مرور جديدة

---

## ❓ مشكلة: سجلت عن طريق Google/Apple/GitHub

**الحل:**
1. سجّل دخول بنفس الطريقة
2. اذهب Profile → Set Password
3. اختر كلمة مرور جديدة

---

## 🧪 اختبار سريع

بعد حفظ المفتاح، اختبر:

```bash
cd /home/user/webapp
npx wrangler whoami
```

**إذا ظهرت معلوماتك** → نجحت! 🎊

---

## 📞 ما زلت محتاج مساعدة؟

راجع `AUTH_FIX.md` للدليل المفصل

---

**🎯 تذكر: الموضوع كله خطوتين بس!**
