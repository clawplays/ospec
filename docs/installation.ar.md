# التثبيت

يتم تثبيت OSpec عبر حزمة CLI الرسمية `@clawplays/ospec-cli` ويعمل من خلال الأمر `ospec`.

## المتطلبات

- Node.js `>= 18`
- npm `>= 8`

## التثبيت من npm

```bash
npm install -g @clawplays/ospec-cli
```

## التحقق

```bash
ospec --version
ospec --help
```

## طريقة تثبيت الإضافات

إذا كنت تستخدم OSpec أساسا عبر AI / `$ospec` فابدأ بهذه الصياغة:

```text
$ospec افتح إضافة Stitch لهذا المشروع.
$ospec افتح إضافة Checkpoint لهذا المشروع.
```

ويجب فهم هذا الطلب على أنه: افحص أولا هل الإضافة مثبتة عالميا، وإن لم تكن مثبتة فثبتها، ثم فعلها داخل المشروع الحالي.

قاعدة AI الصارمة:

1. افحص أولا هل الإضافة مثبتة عالميا بالفعل باستخدام `ospec plugins info <plugin>` أو `ospec plugins installed`.
2. إذا كانت مثبتة بالفعل، فلا تعد تثبيتها فقط لأن المشروع مختلف.
3. أعد استخدام الإضافة المثبتة ونفذ `ospec plugins enable ...` داخل المشروع الجديد.
4. لا تنفذ `ospec plugins install <plugin>` إلا إذا كانت الإضافة غير مثبتة بعد، أو إذا طلب المستخدم صراحة إعادة التثبيت أو الترقية.
5. لا تنفذ `ospec plugins update --all` إلا إذا طلب المستخدم صراحة تحديث كل الإضافات المثبتة على الجهاز.

البديل عبر سطر الأوامر:

```bash
ospec plugins list
ospec plugins install stitch
ospec plugins install checkpoint
```

ثم فعلها داخل المشروع الهدف:

```bash
ospec plugins enable stitch [path]
ospec plugins enable checkpoint [path] --base-url <url>
```

ملاحظات:

- استخدم `ospec plugins list` لعرض الإضافات المتاحة
- استخدم `ospec plugins install <plugin>` للتثبيت الصريح
- استخدم `ospec plugins update <plugin>` لتحديث حزمة إضافة عالمية واحدة
- استخدم `ospec plugins update --all` لتحديث كل حزم الإضافات العالمية التي يسجلها OSpec
- إذا طُلب ذلك عبر AI / `$ospec` فالمقصود هو: افحص أولا هل الإضافة مثبتة عالميا، وإن لم تكن مثبتة فثبتها، ثم فعلها داخل المشروع الحالي
- تثبيت الإضافة يتم على مستوى النظام وبشكل مشترك بين المشاريع، أما التفعيل فهو على مستوى المشروع
- إذا كانت الإضافة مثبتة عالميا بالفعل فيجب إعادة استخدامها في المشاريع الأخرى دون إعادة تنزيلها
- عند تشغيل `ospec plugins install <plugin>` يتم أيضا تثبيت اعتمادات npm الخاصة بحزمة الإضافة نفسها
- وبالنسبة إلى Checkpoint فإن `ospec plugins enable checkpoint ...` يثبت كذلك اعتمادات المراجعة المطلوبة داخل المشروع الهدف
- بعد التفعيل ستتم مزامنة وثائق الإضافة التفصيلية إلى `.ospec/plugins/<plugin>/docs/`

## المهارات المُدارة

- يقوم `ospec init [path]` و `ospec update [path]` بمزامنة المهارتين المُدارتين `ospec` و `ospec-change` لـ Codex
- يقوم `ospec update [path]` أيضا بإصلاح آثار OSpec القديمة، واستعادة الحزم العالمية المفقودة للإضافات المفعلة في المشروع الحالي، وترقية تلك الحزم تلقائيا عندما يتوفر إصدار متوافق أحدث
- لا يقوم `ospec update [path]` بترقية الإضافات العالمية غير المفعلة في المشروع الحالي
- الأمر الصريح لتحديث جميع الإضافات المثبتة هو `ospec plugins update --all`
- إذا وُجد `CLAUDE_HOME` أو مجلد `~/.claude` فستتم المزامنة أيضا إلى Claude Code
