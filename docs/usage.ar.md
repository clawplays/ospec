# الاستخدام

## الأوامر الشائعة

```bash
ospec status [path]
ospec init [path]
ospec docs status [path]
ospec docs generate [path]
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
ospec plugins list
ospec plugins install <plugin>
ospec plugins installed
ospec plugins update <plugin>
ospec plugins update --all
ospec plugins status [path]
ospec plugins enable stitch [path]
ospec plugins enable checkpoint [path] --base-url <url>
```

## البدء السريع مع الإضافات

AI / `$ospec`:

- طلب "افتح Stitch" يعني: افحص أولا هل Stitch مثبت عالميا، وإن لم يكن مثبتا فثبته، ثم فعله داخل المشروع الحالي
- طلب "افتح Checkpoint" يعني: افحص أولا هل Checkpoint مثبت عالميا، وإن لم يكن مثبتا فثبته، ثم فعله داخل المشروع الحالي
- بعد التفعيل ستتم مزامنة وثائق الإضافة التفصيلية إلى `.ospec/plugins/<plugin>/docs/`
- لا تشغل `ospec plugins update --all` إلا إذا طلب المستخدم صراحة تحديث كل الإضافات المثبتة

سطر الأوامر:

```bash
ospec plugins list
ospec plugins info stitch
ospec plugins install stitch
ospec plugins enable stitch [path]
```

```bash
ospec plugins list
ospec plugins info checkpoint
ospec plugins install checkpoint
ospec plugins enable checkpoint [path] --base-url <url>
```

## المسار الموصى به

لدليل جديد:

```bash
ospec init [path]
ospec new <change-name> [path]
ospec verify [changes/active/<change>]
ospec finalize [changes/active/<change>]
```

تستخدم المشاريع الجديدة التي تُهيَّأ عبر `ospec init [path]` تخطيط nested افتراضيا. يبقى في جذر المستودع فقط `.skillrc` و `README.md`، بينما تنتقل بقية ملفات OSpec المُدارة إلى `.ospec/`.
وما زال سطر الأوامر يقبل الاختصارات مثل `changes/active/<change>`، لكن المسار الفعلي داخل المشاريع nested هو `.ospec/changes/active/<change>`.
ولترحيل مشروع classic قديم إلى التخطيط الجديد، شغّل صراحة `ospec layout migrate --to nested`.

## تحديث مشروع موجود

```bash
npm install -g @clawplays/ospec-cli@1.0.0
ospec update [path]
```

إذا كنت قد ثبت الأداة محليا من هذا المستودع:

```bash
npm install -g .
ospec update [path]
```

يقوم `ospec update [path]` بتحديث وثائق البروتوكول والأدوات والمهارات المُدارة وبيانات تخطيط الأرشفة وملفات الإضافات المفعلة.
كما يمكنه إصلاح مشاريع OSpec القديمة التي ما زالت تحتفظ ببصمة OSpec ولكنها تفتقد بعض المجلدات الأساسية الأحدث، كما ينقل `build-index-auto.*` من الجذر إلى `.ospec/tools/` ويطبع مفاتيح Stitch القديمة داخل `.skillrc` إلى البنية الجديدة.
إذا كانت حزمة إضافة مفعلة قد حُذفت يدويا من التثبيت العالمي، فإن `ospec update [path]` يحاول أولا استعادتها قبل متابعة مزامنة أصول المشروع.
إذا كانت هناك نسخة npm متوافقة أحدث لإضافة مفعلة بالفعل، فإن `ospec update [path]` يرقّي هذه الحزمة العالمية تلقائيا ويعرض الانتقال من النسخة القديمة إلى النسخة الجديدة.
لكنه لا يرقّي الإضافات العالمية غير المفعلة في المشروع الحالي.
ولا يرقّي CLI نفسه.
ولا يثبت إضافات جديدة تلقائيا، ولا يفعّل الإضافات تلقائيا، ولا يرحّل active / queued changes تلقائيا.

## تحديث كل الإضافات المثبتة

إذا أردت تحديث كل الإضافات المثبتة على الجهاز، وليس فقط إضافات المشروع الحالي، فاستخدم الأمر الصريح:

يقوم `ospec update [path]` فقط بإصلاح المشروع الحالي وتحديثه، لكنه لا يحول تخطيط classic إلى nested تلقائيا. وعندما تريد تغيير التخطيط استخدم `ospec layout migrate --to nested`.

```bash
ospec plugins update --all
```

صيغ مفيدة:

```bash
ospec plugins update stitch
ospec plugins update --all --check
```

يقوم `ospec plugins update --all` بفحص كل الإضافات المثبتة عالميا والمسجلة لدى OSpec، ويرقّي كل إضافة عندما يتوفر إصدار متوافق أحدث.
وإذا كانت حزمة إضافة مثبتة قد حُذفت يدويا، فإنه يحاول أولا استعادتها قبل الترقية.
وفي مسارات AI / `$ospec` يجب تشغيل `ospec plugins update --all` فقط عندما يطلب المستخدم صراحة تحديث جميع الإضافات المثبتة.
