# الاستخدام

## الأوامر الشائعة

```bash
ospec status [path]
ospec init [path]
ospec docs status [path]
ospec docs generate [path]
ospec sync [path]
ospec changes status [path]
ospec new <change-name> [path]
ospec progress [changes/active/<change>]
ospec verify [changes/active/<change>]
ospec archive [changes/active/<change>]
ospec finalize [changes/active/<change>]
ospec skill status
ospec skill install
ospec skill status-claude
ospec skill install-claude
ospec update [path]
ospec plugins status [path]
ospec plugins enable stitch [path]
```

## المسار الموصى به

لدليل جديد:

```bash
ospec init [path]
ospec new <change-name> [path]
ospec verify [changes/active/<change>]
ospec finalize [changes/active/<change>]
```

التسلسل الموصى به للمستخدم:

- تهيئة المستودع
- تنفيذ متطلب واحد في تغيير (change)
- النشر والتحقق باستخدام المسار الخاص بمشروعك، ثم تشغيل `ospec verify`
- أرشفة التغيير الذي تم التحقق منه باستخدام `ospec finalize`

يهدف `ospec init` الآن إلى ترك المستودع في حالة "جاهز للتغيير" (change-ready):

- إنشاء غلاف البروتوكول (protocol shell)
- إنشاء وثائق معرفة المشروع الأساسية
- إعادة استخدام وثائق المشروع الحالية عند توفرها
- طلب متابعة موجزة واحدة لملخص المشروع أو مكدس التقنيات في المسارات المدعومة بالذكاء الاصطناعي عند فقدان السياق
- الرجوع إلى وثائق مؤقتة (placeholder) عندما لا يزال السياق مفقوداً
- عدم إنشاء التغيير الأول تلقائياً
- عدم تطبيق الهيكل التجاري (business scaffold) تلقائياً

إذا كنت ترغب في تمرير سياق المشروع أثناء التهيئة، يمكنك القيام بذلك مباشرة:

```bash
ospec init [path] --summary "Internal admin portal" --tech-stack node,react,postgres
ospec init [path] --architecture "Single web app with API and shared auth" --document-language en-US
```

تبقى التهيئة المباشرة عبر واجهة سطر الأوامر غير تفاعلية. إذا كان المستودع لا يحتوي على وصف مشروع قابل للاستخدام ولم تقم بتمرير وسوم (flags)، فسيظل OSpec ينشئ وثائق مؤقتة ويترك المستودع جاهزاً لـ `ospec new`.

## صيانة معرفة المشروع

استخدم `docs generate` عندما يكون المستودع مهيأً بالفعل وتريد تحديث أو إصلاح أو ملء وثائق معرفة المشروع:

```bash
ospec docs generate [path]
```

حالات الاستخدام:

- تم تهيئة مستودع قديم قبل مسار التهيئة الجديد "change-ready"
- تم حذف وثائق المشروع أو أصبحت قديمة
- قمت بإضافة وحدات أو واجهات برمجة تطبيقات (APIs) جديدة وتريد تحديث طبقة المعرفة

## وضع الطابور (Queue Flow)

إذا كنت ترغب صراحة في إدارة تغييرات متعددة كطابور:

```bash
ospec queue add <change-name> [path]
ospec queue status [path]
ospec run start [path] --profile manual-safe
ospec run step [path]
```

يبقى وضع الطابور صريحاً:

- سير العمل الافتراضي لا يزال تغييراً نشطاً واحداً
- يبدأ وضع الطابور فقط عندما تستخدم صراحة `queue` أو `run`

## ترقية مشروع حالي

لمشروع تم تهيئته بالفعل:

```bash
npm install -g @clawplays/ospec-cli@0.3.2
ospec update [path]
```

سيقوم `ospec update [path]` بـ:

- تحديث وثائق البروتوكول
- تحديث أدوات المشروع وخطافات Git
- مزامنة مهارات `ospec` و `ospec-change` المدارة
- تحديث أصول مساحة العمل المدارة للمكونات الإضافية الممكّنة بالفعل

## التقدم والإغلاق

أثناء التنفيذ، الأوامر الرئيسية هي:

```bash
ospec changes status [path]
ospec progress [changes/active/<change>]
ospec verify [changes/active/<change>]
ospec archive [changes/active/<change>]
ospec finalize [changes/active/<change>]
```

يعتبر `ospec finalize` هو مسار الإغلاق القياسي. يقوم بالتحقق من التغيير، وتحديث الفهرس، وأرشفة التغيير، ويترك التزام Git (commit) كخطوة يدوية منفصلة.
