# وثيقة مواصفات إضافة Checkpoint

توضح هذه الوثيقة أولاً كيفية استخدام المستخدمين لـ `checkpoint` ، تليها المواصفات الفنية التفصيلية.

## نظرة عامة

تُستخدم `checkpoint` لإجراء فحص الصفحات أثناء التشغيل، والتحقق من سير العمل، وبوابات الجودة الآلية.

السيناريوهات المناسبة:

- تدفقات التقديم الحرجة
- فحص الصفحات والتفاعلات قبل القبول
- التغييرات التي تتطلب تأكيداً آلياً لواجهة المستخدم، والتدفقات، والواجهات، والنتائج النهائية

وظائفها الأساسية هي:

- تشغيل الفحوصات الآلية
- توليد نتائج البوابة
- منع `verify / archive / finalize` قبل اجتياز الفحوصات

## كيفية تفعيل الإضافة

عبر محادثة الذكاء الاصطناعي:

<pre dir="rtl" lang="ar"><code>استخدم <span dir="ltr">OSpec</span> لمساعدتي في فتح إضافة <span dir="ltr">Checkpoint</span>.</code></pre>

عبر المهارة (Skill):

<pre dir="rtl" lang="ar"><code>استخدم <span dir="ltr">$ospec</span> لمساعدتي في فتح إضافة <span dir="ltr">Checkpoint</span>.</code></pre>

عبر سطر الأوامر:

```bash
ospec plugins enable checkpoint . --base-url http://127.0.0.1:3000
```

## ماذا تحتاج لتكوينه بعد الفتح

بعد تمكين `checkpoint` ، يجب إكمال المحتويات التالية على الأقل:

1. `base_url`
2. `routes.yaml`
3. `flows.yaml`
4. حالة تسجيل الدخول أو نص تسجيل الدخول
5. أمر بدء التشغيل وفحص الجاهزية (إذا كان لا يمكن الوصول إلى المشروع مباشرة)

### 1. `base_url`

يجب توفير `--base-url` عند تمكين `checkpoint` لأول مرة.

هذا العنوان هو عنوان التطبيق الفعلي الذي تزوره الفحوصات الآلية، على سبيل المثال:

- `http://127.0.0.1:3000`
- `http://localhost:4173`

### 2. `routes.yaml`

حدد ما يلي في `.ospec/plugins/checkpoint/routes.yaml`:

- الصفحات المراد فحصها
- منفذ العرض (Viewport) لكل صفحة
- لقطة الشاشة الأساسية المطابقة أو خط الأساس للتصميم
- المناطق التي يجب تجاهلها
- النصوص الرئيسية أو متطلبات واجهة المستخدم على الصفحة

### 3. `flows.yaml`

حدد ما يلي في `.ospec/plugins/checkpoint/flows.yaml`:

- من أين تبدأ التدفقات الحرجة
- الخطوات الوسيطة
- التوكيدات (Assertions) لنتائج الواجهة
- التوكيدات للحالات النهائية للأعمال

### 4. حالة تسجيل الدخول أو نص تسجيل الدخول

إذا كان التدفق يعتمد على تسجيل الدخول، فقم بإعداد واحد على الأقل من هذه:

- `.ospec/plugins/checkpoint/auth/storage-state.json`
- نص تسجيل دخول مثل `.ospec/plugins/checkpoint/auth/login.js`

بدون حالة تسجيل دخول، ستفشل العديد من التدفقات الحقيقية أثناء الفحوصات الآلية.

### 5. أمر بدء التشغيل وفحص الجاهزية

إذا لم يكن مشروعك "يعمل بالفعل بشكل طبيعي"، فأضف هذه إلى `.skillrc.plugins.checkpoint.runtime`:

- `startup`
- `readiness`
- `shutdown`

الممارسة الشائعة:

- البدء باستخدام `docker compose up -d`
- الانتظار حتى تصبح الخدمة جاهزة باستخدام عنوان URL لفحص الصحة
- إغلاق البيئة بعد التشغيل

## ماذا سيتم إنتاجه بعد الفتح

بعد التمكين، تظهر هذه العناصر المتعلقة بـ Checkpoint في المشروع:

- `.skillrc.plugins.checkpoint`
- `.ospec/plugins/checkpoint/routes.yaml`
- `.ospec/plugins/checkpoint/flows.yaml`
- `.ospec/plugins/checkpoint/baselines/`
- `.ospec/plugins/checkpoint/auth/`
- `.ospec/plugins/checkpoint/cache/`

توضع نتائج التنفيذ المرتبطة بتغيير (change) معين في:

- `changes/active/<change>/artifacts/checkpoint/`

## سير العمل الموصى به

1. تهيئة المشروع: `ospec init .`
2. فتح Checkpoint: `ospec plugins enable checkpoint . --base-url <url>`
3. تكوين `routes.yaml` و `flows.yaml` وحالة تسجيل الدخول وبيئة التشغيل
4. تشغيل فحص التشخيص: `ospec plugins doctor checkpoint .`
5. إنشاء تغيير يتطلب تحققاً آلياً
6. تنفيذ الفحص: `ospec plugins run checkpoint <change-path>`
7. بعد اجتياز الفحص، قم بتنفيذ `ospec verify` و `ospec finalize`

## متى تستخدم هذه الإضافة

يوصى بتمكين أو تشغيل Checkpoint لهذه التغييرات:

- `ui_change`
- `page_design`
- `feature_flow`
- `api_change`
- `backend_change`
- `integration_change`

لا حاجة لـ Checkpoint عادةً للتغييرات التي تقتصر على النصوص فقط أو التوثيق فقط.

## المواصفات الفنية التفصيلية

تحدد هذه الوثيقة الأهداف وعقود التشغيل وحدود التنفيذ لإضافة `checkpoint` في OSpec، لضمان عدم فقدان القيود خلال المناقشات اللاحقة والتنفيذ المرحلي وضغط السياق.

تشير الأسماء التالية إلى هذه الوثيقة ما لم يتم تغييرها صراحة:

- `Checkpoint Plugin`
- `checkpoint specification`
- `Playwright Auto-Review Plugin`

## 1. الخلفية

تتعامل `stitch` مع مخرجات التصميم وبوابات مراجعة التصميم، ولكن المشاريع الحقيقية تحتاج لنوع آخر من البوابات الآلية قبل الأرشفة:

- هل الصفحة متوافقة مع التصميم؟
- هل توجد مشكلات في واجهة المستخدم مثل التخطيط، فواصل الأسطر، التداخل، الخطوط، الألوان، التباين؟
- هل تدفق الوظائف قابل للتشغيل؟
- هل بيانات الواجهة الأمامية والخلفية متسقة؟

هذه القدرات لا تنتمي لـ `stitch` لأنها تنتمي للفحوصات الآلية في وقت التشغيل، وليس لتوليد التصميم أو الموافقة اليدوية.

لذلك، تم تقديم إضافة مكملة لـ `stitch`:

- `checkpoint`

تقوم `checkpoint` بتشغيل فحوصات آلية قبل أرشفة التغيير. يُسمح بالأرشفة فقط إذا اجتازت جميع الفحوصات المفعلة.

## 2. القرارات المؤكدة

القرارات المؤكدة للتنفيذ:

1. `checkpoint` و `stitch` هما إضافتان متوازيتان؛ `checkpoint` ليست تحت `stitch`.
2. المشغل الافتراضي لـ `checkpoint` هو `Playwright` ، لكن دلالات الإضافة ليست مرتبطة باسم المشغل.
3. يجب توفير `base_url` عند تمكين `checkpoint` لأول مرة.
4. يدعم النظام حالياً `base_url` واحداً فقط، دون التبديل بين بيئات متعددة.
5. `checkpoint` هي إضافة بوابة آلية؛ ولا تقدم أوامر موافقة / رفض يدوية.

6. إذا كان المشروع مفعلاً لـ `stitch` وكان التغيير الحالي يفعل `stitch_design_review` ، فإن `checkpoint` تعطي الأولوية لإعادة استخدام تصميم الأساس المصدر من قبل Stitch.
7. إذا لم يكن المشروع مفعلاً لـ `stitch` ، فإن `checkpoint` تستخدم لقطات الشاشة الأساسية ومتطلبات النص داخل المستودع كأساس لفحص التصميم.
8. نظراً لأن المشاريع قد لا تمتلك قدرة بدء تشغيل محلية، يجب أن تدعم `checkpoint` أوامر بدء التشغيل المخصصة؛ وإذا كان المشروع يمكنه استخدام `docker compose` ، فمن الأفضل البدء من خلاله.
9. حالة تسجيل الدخول هي قدرة قياسية مدعومة، وتعتمد افتراضياً على `storageState` أو نص تسجيل دخول مخصص.
10. تتكون فحوصات صحة البيانات من جزأين: توكيدات Playwright للصفحة/الواجهة، وأوامر توكيد الحالة النهائية للخلفية المخصصة للمشروع.
11. تسمح `checkpoint` بتفعيل قدرات محددة فقط بناءً على أعلام التغيير، بدلاً من تشغيل فحوصات كاملة لكل تغيير.
12. ترتيب التنفيذ الموصى به هو `ui_review` أولاً، ثم `flow_check` .

## 3. تعريفات المصطلحات

### 3.1 Plugin

تمثل الإضافة (plugin) مصدراً للقدرات القابلة للتوسيع. اسم هذه الإضافة ثابت كـ:

- `checkpoint`

### 3.2 Capability

يتم تقسيم `checkpoint` إلى قدرتين:

- `ui_review`
- `flow_check`

### 3.3 Optional Step

تساهم `checkpoint` بخطوتين اختياريتين في سير العمل:

- `checkpoint_ui_review`
- `checkpoint_flow_check`

### 3.4 Plugin Workspace

تمثل مساحة عمل الإضافة (plugin workspace) دليلاً لمشروع على مستوى المشروع، قابلاً لإعادة الاستخدام، وليس حصرياً لتغيير واحد. دليل عمل `checkpoint` ثابت في:

```text
.ospec/plugins/checkpoint/
```

### 3.5 Gate Artifact

يمثل أثر البوابة (gate artifact) نتيجة قابلة للقراءة آلياً تُستخدم لتحديد بوابة `verify / archive / finalize`. ملف البوابة الرئيسي لـ `checkpoint` ثابت في:

```text
changes/active/<change>/artifacts/checkpoint/gate.json
```

## 4. الأهداف

الهدف هنا ليس بناء منصة اختبار كاملة دفعة واحدة، بل تفعيل بوابات آلية قبل الأرشفة:

1. يمكن للمشاريع تمكين إضافة `checkpoint` .
2. يمكن للتغييرات الجديدة تفعيل `checkpoint_ui_review` و `checkpoint_flow_check` بناءً على الأعلام.
3. يمكن للإضافة بدء التشغيل أو الاتصال بالمشروع المستهدف وتنفيذ تدفقات Playwright بناءً على `base_url` .
4. يمكن لـ `ui_review` إجراء فحوصات الصفحات بناءً على صادرات Stitch أو لقطات الشاشة الأساسية للمستودع.
5. يمكن لـ `flow_check` تشغيل التدفقات الحرجة، وتوكيدات الواجهة، وتوكيدات الخلفية المخصصة.
6. يمكن لـ `verify / archive / finalize` منع التدفق بناءً على `gate.json` .
7. عند تمكين `stitch` أيضاً، يمكن لـ `checkpoint` مزامنة حالة موافقة Stitch تلقائياً عند الاجتياز.

## 5. ما ليس ضمن النطاق

ما يلي لا يدخل ضمن النطاق الحالي:

1. تنفيذ مصفوفة بيئات متعددة.
2. برامج تشغيل قواعد بيانات عامة أو طبقات محول اتصال مباشر بقاعدة البيانات.
3. مسجل عام أو منصة إعادة تشغيل كاملة.
4. منصة تقييم بصرية كاملة بالذكاء الاصطناعي.
5. تكييف مدمج لمرة واحدة لجميع أطر عمل الأعمال.
6. واجهة مستخدم للموافقة اليدوية أو نظام تعليقات يدوية.

## 6. اتفاقية الدليل الموحد

ستتبع جميع الإضافات اللاحقة نموذج دليل مكون من ثلاث طبقات:

- تكوين المشروع: `.skillrc.plugins.<plugin>`
- دليل عمل المشروع: `.ospec/plugins/<plugin>/`
- دليل مخرجات التغيير: `changes/active/<change>/artifacts/<plugin>/`

لذلك، تستخدم `checkpoint` :

- `.skillrc.plugins.checkpoint`
- `.ospec/plugins/checkpoint/`
- `changes/active/<change>/artifacts/checkpoint/`

### 6.1 دليل عمل `checkpoint` على مستوى المشروع

الهيكل الموصى به:

```text
.ospec/plugins/checkpoint/
  routes.yaml
  flows.yaml
  baselines/
  auth/
    README.md
    login.example.js
  cache/
```

- `routes.yaml`: أهداف فحص الصفحة، والمسارات، ومنافذ العرض، ومصادر خط الأساس، ومناطق التجاهل، ومتطلبات النص.
- `flows.yaml`: نقاط دخول التدفق، والخطوات، وتوكيدات الواجهة، وأوامر توكيد الخلفية المخصصة.
- `baselines/`: لقطات الشاشة الأساسية للمستودع.
- `auth/`: ملفات حالة تسجيل الدخول، وقوالب نصوص المصادقة، والتعليمات (مثل `storage-state.json`, `login.example.js`).
- `cache/`: ذاكرة تخزين مؤقتة، نتائج صادرات وسيطة.

### 6.2 دليل مخرجات التغيير لـ `checkpoint` 

الهيكل الموصى به:

```text
changes/active/<change>/artifacts/checkpoint/
  gate.json
  result.json
  summary.md
  screenshots/
  diffs/
  traces/
```

- `gate.json`: نقطة الدخول لتحديد بوابة الأرشفة.
- `result.json`: النتائج الهيكلية الخام.
- `summary.md`: ملخص للقراءة البشرية.
- `screenshots/`: لقطات الشاشة الفعلية.
- `diffs/`: صور الفروقات البصرية.
- `traces/`: آثار Playwright ، HAR، السجلات، إلخ.

## 13. اتفاقية التعاون مع Stitch

عندما يُمكّن مشروع كلاً من `stitch` و `checkpoint` ، ويفعل التغيير الحالي كلاً من `stitch_design_review` و `checkpoint_ui_review` :

1. تعطي `checkpoint_ui_review` الأولوية لقراءة مسار/سمة خط الأساس المصدر من قبل Stitch.
2. إذا لم تُصدّر Stitch لقطات شاشة قابلة للمقارنة، فلا يمكن لـ `checkpoint_ui_review` المطالبة بإكمال فحص اتساق التصميم.
3. إذا اجتازت `checkpoint_ui_review` وكان `stitch_integration.auto_pass_stitch_review = true` ، فيمكن لـ `checkpoint` مزامنة `artifacts/stitch/approval.json` تلقائياً لتكون `approved` .
4. إذا فشلت `checkpoint_ui_review` ، فيجب عدم منح موافقة Stitch تلقائياً.

هذا يعني أن `stitch` تتعامل مع مخرجات التصميم وبوابات الهيكل، بينما تتعامل `checkpoint` مع اتساق الصفحة أثناء التشغيل وبوابات التدفق الآلي.

## 14. آثار البوابة

### 14.1 الهيكل المقترح لـ `gate.json` 

```json
{
  "plugin": "checkpoint",
  "status": "passed",
  "blocking": true,
  "executed_at": "2026-03-29T08:00:00Z",
  "steps": {
    "checkpoint_ui_review": {
      "status": "passed",
      "issues": []
    },
    "checkpoint_flow_check": {
      "status": "passed",
      "issues": []
    }
  },
  "stitch_sync": {
    "attempted": true,
    "status": "approved"
  },
  "issues": []
}
```

### 14.2 قيم `status` 

- `pending`
- `passed`
- `failed`

## 15. تصميم أوامر CLI

- `ospec plugins status [path]`
- `ospec plugins enable checkpoint [path] --base-url <url>`
- `ospec plugins disable checkpoint [path]`
- `ospec plugins doctor checkpoint [path]`
- `ospec plugins run checkpoint <change-path>`

ملاحظة: لا توفر `checkpoint` أوامر `approve` أو `reject` لأنها بوابة آلية.

## 16. سلوك Verify / Archive / Finalize

### 16.1 `verify` 

عند تفعيل أي خطوة من خطوات `checkpoint` ، تُضاف الفحوصات التالية:

1. وجود `artifacts/checkpoint/gate.json` .
2. `gate.json.status` هي `passed` .
3. اجتياز كل خطوة مفعلة من خطوات `checkpoint` .
4. مزامنة موافقة Stitch إذا كانت مرتبطة.

### 16.2 `archive` 

إذا تم تفعيل أي خطوة من خطوات `checkpoint` وكان `blocking = true` :

- يتم منع الأرشفة إذا كانت `gate.json.status != passed` .
- يتم منع الأرشفة إذا فشلت أي خطوة مفعلة أو بقيت مشكلات حرجة.

## 17. ترتيب التنفيذ

1. **المرحلة الأولى: المخطط ودليل عمل المشروع**: تحديد `.skillrc.plugins.checkpoint` وهيكل دليل `.ospec/plugins/checkpoint/` .
2. **المرحلة الثانية: بوابة `ui_review`**: تنفيذ فحوصات صفحة Playwright ونتائج البوابة.
3. **المرحلة الثالثة: التكامل مع Stitch**: مزامنة `checkpoint_ui_review` مع موافقة Stitch.
4. **المرحلة الرابعة: بوابة `flow_check`**: تنفيذ التدفقات الحرجة والتوكيدات.

## 18. الغرض من هذه الوثيقة

عند تنفيذ `checkpoint` ، ارجع إلى هذه الوثيقة للتأكد من النطاق. يجب أن يتضمن أي انحراف تحديث الوثيقة أولاً. يضمن ذلك بقاء `checkpoint` كإضافة بوابة آلية متميزة ذات حدود واضحة بالنسبة لـ `stitch` .
