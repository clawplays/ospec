# دليل الأوامر (Prompt Guide)

## المبدأ

قم بتوجيه OSpec باستخدام نوايا قصيرة، وليس بقوائم مراجعة داخلية طويلة.

يجب أن يتولى OSpec توسيع عمليات الفحص، والتهيئة (initialization)، وصيانة الوثائق، وقواعد التغيير داخلياً.

## الأوامر الموصى بها

في العمل المعتاد، يمكن شرح استخدام OSpec في 3 أجزاء:

1. تهيئة المشروع
2. إنشاء وتطوير تغيير واحد لمتطلب، أو تحديث وثائق، أو إصلاح خطأ
3. أرشفة التغيير المقبول بعد اكتمال النشر والتحقق

### 1. تهيئة المشروع

الأمر الموصى به:

```text
Use OSpec to initialize this project.
```

صيغة مهارة Claude / Codex:

```text
Use $ospec to initialize this project.
```

ما يعادله في واجهة سطر الأوامر (CLI):

```bash
ospec init .
ospec init . --summary "Internal admin portal for operations"
ospec init . --summary "Internal admin portal for operations" --tech-stack node,react,postgres
ospec init . --architecture "Single web app with API and shared auth" --document-language en-US
```

ماذا يعني هذا:

- يجب أن ينقل `ospec init` المستودع إلى حالة جاهزة للتغيير (change-ready)
- إذا كانت مساعدة الذكاء الاصطناعي متوفرة وسياق المشروع مفقوداً، يمكن لـ OSpec السؤال مرة واحدة عن الملخص أو مكدس التقنيات
- إذا لم يتم تقديم سياق إضافي، يجب أن يستمر OSpec باستخدام وثائق مؤقتة (placeholder)

### 2. إنشاء وتطوير تغيير واحد

الأمر الموصى به:

```text
Use OSpec to create and advance a change for this requirement.
```

صيغة مهارة Claude / Codex:

```text
Use $ospec-change to create and advance a change for this requirement.
```

ما يعادله في واجهة سطر الأوامر (CLI):

```bash
ospec new docs-homepage-refresh .
ospec new fix-login-timeout .
ospec new update-billing-copy .
```

### 3. الأرشفة بعد القبول

الأمر الموصى به:

```text
Use OSpec to archive this accepted change.
```

صيغة مهارة Claude / Codex:

```text
Use $ospec to archive this accepted change.
```

ما يعادله في واجهة سطر الأوامر (CLI):

```bash
ospec verify changes/active/<change-name>
ospec finalize changes/active/<change-name>
```

ماذا يعني هذا:

- أولاً، أكمل عملية النشر أو الاختبار أو ضمان الجودة أو القبول الخاصة بمشروعك
- ثم استخدم `ospec verify` للتأكيد على أن التغيير جاهز
- أخيراً، استخدم `ospec finalize` لإعادة بناء الفهارس وأرشفة التغيير المقبول

## حدود الأوامر

عادةً لا تحتاج إلى تكرار:

- قائمة مراجعة الملفات الداخلية للتهيئة (init)
- خطوات التحقق من غلاف البروتوكول (protocol-shell)
- تحذيرات مثل "لا تقم بإنشاء قالب ويب" في كل أمر
- تحذيرات مثل "لا تبدأ وضع الطابور" في كل أمر

هذه هي إعدادات OSpec الافتراضية ويجب فرضها بواسطة واجهة سطر الأوامر والمهارات المثبتة.
