# 🔑 كيف تحصل على المفتاح الصحيح

## ❌ المفتاح الحالي خاطئ

المفتاح الذي حصلت عليه:
```
774154cb7ee47250172d2edf770ed08731a1c
```

هذا **Custom API Token** ولن يعمل مع D1 Database!

---

## ✅ المفتاح الصحيح: Global API Key

### الخطوة 1: افتح صفحة API Tokens
```
https://dash.cloudflare.com/profile/api-tokens
```

### الخطوة 2: اسحب الصفحة للأسفل

**مهم جداً:** يجب أن تسحب للأسفل حتى ترى قسمين منفصلين:

```
┌─────────────────────────────────────┐
│ API Tokens                          │  ← هنا يوجد Custom Tokens
│ (في الأعلى)                         │
├─────────────────────────────────────┤
│                                     │
│     ⬇️ اسحب للأسفل ⬇️               │
│                                     │
├─────────────────────────────────────┤
│ API Keys                            │  ← هنا يوجد Global API Key
│ (في الأسفل)                         │
│                                     │
│ Global API Key         [View]       │  ← اضغط هنا!
│                                     │
│ Origin CA Key          [Create]     │
└─────────────────────────────────────┘
```

### الخطوة 3: اضغط "View" بجانب "Global API Key"

**ليس "Create Token"!**
**يجب أن تضغط "View" بجانب "Global API Key"**

### الخطوة 4: أدخل كلمة المرور

سيطلب منك كلمة مرور حسابك في Cloudflare

### الخطوة 5: انسخ المفتاح

المفتاح الصحيح سيكون **أطول** من الذي عندك

---

## 🎯 كيف تعرف أنك في المكان الصحيح؟

✅ **إذا رأيت:**
- عنوان "API Keys" (ليس "API Tokens")
- سطر مكتوب عليه "Global API Key"
- زر "View" (ليس "Create")

❌ **إذا رأيت:**
- "Create Token"
- "Edit Cloudflare Workers"
- اختيار صلاحيات (Permissions)

→ معناها أنت في المكان الخطأ!

---

## 📸 دليل مصور

### المكان الخطأ (API Tokens):
```
API Tokens
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Create Token]

User API Tokens:
  - Token 1
  - Token 2
```

### المكان الصحيح (API Keys):
```
API Keys
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Global API Key          [View] ← اضغط هنا!
Origin CA Key          [Create]
```

---

## ⏱️ بعد الحصول على المفتاح الصحيح:

1. احذف Token القديم من GenSpark
2. الصق Global API Key الجديد
3. Save
4. أخبرني: "تم"

---

## 💡 لماذا Custom Token لا يعمل؟

Custom Token المصنوع يدوياً يحتاج صلاحيات محددة جداً:
- ✅ Account → D1 → Edit
- ✅ Account → Pages → Edit
- ✅ User → Memberships → Read
- ✅ User → User Details → Read

**لكن Global API Key أسهل** لأنه يملك كل الصلاحيات تلقائياً!

---

**🚀 يلّا، روح صفحة API واسحب للأسفل لحد ما تلاقي "API Keys"!**
