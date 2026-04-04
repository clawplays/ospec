<h1><a href="https://ospec.ai/" target="_blank" rel="noopener noreferrer">OSpec.ai</a></h1>

<p align="center">
  <a href="https://www.npmjs.com/package/@clawplays/ospec-cli"><img src="https://img.shields.io/npm/v/%40clawplays%2Fospec-cli?style=for-the-badge&logo=npm&label=npm" alt="npm"></a>
  <a href="https://www.npmjs.com/package/@clawplays/ospec-cli"><img src="https://img.shields.io/npm/dm/%40clawplays%2Fospec-cli?style=for-the-badge&logo=npm&label=downloads&cacheSeconds=300" alt="npm downloads"></a>
  <a href="https://github.com/clawplays/ospec/stargazers"><img src="https://img.shields.io/github/stars/clawplays/ospec?style=for-the-badge&logo=github" alt="GitHub stars"></a>
  <a href="../LICENSE"><img src="https://img.shields.io/github/license/clawplays/ospec?style=for-the-badge&color=green" alt="License"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js 18+">
  <img src="https://img.shields.io/badge/npm-8%2B-CB3837?style=flat-square&logo=npm&logoColor=white" alt="npm 8+">
  <img src="https://img.shields.io/badge/language-TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/workflow-3_steps-0F766E?style=flat-square" alt="3-step workflow">
</p>

<p align="center">
  <a href="../README.md">English</a> |
  <a href="README.zh-CN.md">中文</a> |
  <a href="README.ja.md">日本語</a> |
  <strong>العربية</strong>
</p>

OSpec هو سير عمل موجّه بالمستندات للتطوير بمساعدة الذكاء الاصطناعي، يتيح لك تحديد المتطلبات والتغييرات في المستندات أولاً، ثم قيادة التنفيذ والتحقق والأرشفة عبر التعاون مع الذكاء الاصطناعي.

<p align="center">
  <a href="README.md">الوثائق</a> |
  <a href="prompt-guide.ar.md">دليل البرومبت</a> |
  <a href="usage.ar.md">الاستخدام</a> |
  <a href="project-overview.ar.md">نظرة عامة</a> |
  <a href="installation.ar.md">التثبيت</a> |
  <a href="https://github.com/clawplays/ospec/issues">Issues</a>
</p>

## لماذا OSpec؟

مساعدات البرمجة بالذكاء الاصطناعي قوية، لكن عندما تعيش المتطلبات داخل سجل الدردشة فقط يصبح من الصعب فحصها ومراجعتها وإغلاقها بشكل واضح. يضيف OSpec طبقة سير عمل خفيفة حتى يحتفظ المستودع بسياق التغيير قبل كتابة الكود وبعد شحنه.

- اتفق قبل كتابة الكود: اجعل proposal و tasks و state و verification و review ظاهرة داخل المستودع
- اجعل كل متطلب صريحا: المسار الافتراضي ينقل متطلبا واحدا عبر active change واحد
- ابق خفيفا: يحافظ التدفق اليومي على مسار قصير `init -> change -> verify/finalize`
- استخدم المساعدات التي لديك بالفعل: OSpec مصمم لـ Codex و Claude Code وسير عمل CLI المباشر

## التثبيت باستخدام npm

```bash
npm install -g @clawplays/ospec-cli
```

## البداية السريعة

استخدام OSpec يتطلب 3 خطوات فقط:

1. تهيئة OSpec داخل مجلد المشروع
2. إنشاء تغيير واحد ودفعه إلى الأمام لمتطلب أو تحديث مستندات أو إصلاح خلل
3. أرشفة التغيير المعتمد بعد اكتمال النشر والتحقق

### 1. تهيئة OSpec داخل مجلد المشروع

البرومبت الموصى به:

<pre dir="rtl" lang="ar"><code><span dir="ltr">OSpec</span>، هيّئ هذا المشروع.</code></pre>

وضع المهارة في Claude / Codex:

<pre dir="rtl" lang="ar"><code><span dir="ltr">$ospec</span>، هيّئ هذا المشروع.</code></pre>

<details>
<summary>سطر الأوامر</summary>

```bash
ospec init .
ospec init . --summary "Internal admin portal for operations"
ospec init . --summary "Internal admin portal for operations" --tech-stack node,react,postgres
ospec init . --architecture "Single web app with API and shared auth" --document-language ar
```

ملاحظات CLI:

- `--summary`: نص موجز للمشروع يُكتب داخل المستندات المُنشأة
- `--tech-stack`: قائمة تقنيات مفصولة بفواصل مثل `node,react,postgres`
- `--architecture`: وصف مختصر للمعمارية
- `--document-language`: لغة المستندات المُنشأة، ويمكن أن تكون `en-US` أو `zh-CN` أو `ja-JP` أو `ar`
- أولوية تحديد اللغة: `--document-language` الصريح -> وثائق المشروع الحالية / `for-ai/*` / asset manifest -> الرجوع إلى `en-US`
- إذا مرّرت هذه القيم فسيستخدمها OSpec مباشرةً عند توليد مستندات المشروع
- إذا لم تمرّرها فسيعيد OSpec استخدام المستندات الموجودة إن أمكن، وإلا فسينشئ مستندات أولية كعناصر نائبة

</details>

### 2. إنشاء تغيير ودفعه إلى الأمام

استخدم هذا النمط لتسليم المتطلبات وتحديثات المستندات وعمليات إعادة الهيكلة وإصلاحات الأخطاء.

البرومبت الموصى به:

<pre dir="rtl" lang="ar"><code><span dir="ltr">OSpec</span>، أنشئ تغييرًا لهذا المتطلب وادفعه إلى الأمام.</code></pre>

وضع المهارة في Claude / Codex:

<pre dir="rtl" lang="ar"><code><span dir="ltr">$ospec-change</span>، أنشئ تغييرًا لهذا المتطلب وادفعه إلى الأمام.</code></pre>

<details>
<summary>سطر الأوامر</summary>

```bash
ospec new docs-homepage-refresh .
ospec new fix-login-timeout .
ospec new update-billing-copy .
```

</details>

### 3. الأرشفة بعد القبول

بعد أن يجتاز المتطلب النشر أو الاختبارات أو QA أو أي فحوص قبول أخرى، قم بأرشفة التغيير الذي تم التحقق منه.

البرومبت الموصى به:

<pre dir="rtl" lang="ar"><code><span dir="ltr">OSpec</span>، أرشف هذا التغيير المقبول.</code></pre>

وضع المهارة في Claude / Codex:

<pre dir="rtl" lang="ar"><code><span dir="ltr">$ospec</span>، أرشف هذا التغيير المقبول.</code></pre>

<details>
<summary>سطر الأوامر</summary>

```bash
ospec verify changes/active/<change-name>
ospec finalize changes/active/<change-name>
```

ملاحظات الأرشفة:

- نفّذ أولاً عملية النشر والاختبار وQA الخاصة بمشروعك
- استخدم `ospec verify` للتأكد من أن التغيير الحالي جاهز للأرشفة
- استخدم `ospec finalize` لإعادة بناء الفهارس وأرشفة التغيير المعتمد

</details>

## التحديث باستخدام npm

إذا كان هذا مشروع OSpec قائما بالفعل، فبعد ترقية CLI عبر npm شغّل الأمر التالي داخل مجلد المشروع لتحديث ملفات OSpec الخاصة بالمشروع:

```bash
ospec update
```

## كيف يعمل سير عمل OSpec

```text
┌─────────────────────────────────────────────────────────────────┐
│  1. USER REQUEST                                               │
│     "OSpec, create and advance a change for this task."       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. INIT TO CHANGE-READY                                       │
│     ospec init                                                 │
│     - .skillrc                                                 │
│     - .ospec/                                                  │
│     - changes/active + changes/archived                        │
│     - root SKILL files and for-ai guidance                     │
│     - docs/project/* baseline knowledge docs                   │
│     - reuse docs or fall back to placeholders                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. EXECUTION                                                  │
│     ospec new <change-name>                                    │
│     ospec progress                                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. DEPLOY + VALIDATE                                          │
│     project deploy / test / QA                                 │
│     ospec verify                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. ARCHIVE                                                    │
│     ospec finalize                                             │
│     rebuild index + archive                                    │
└─────────────────────────────────────────────────────────────────┘
```

## المفاهيم الأساسية

| المفهوم | المعنى |
|---------|--------|
| **Protocol Shell** | الحد الأدنى من هيكل التعاون: `.skillrc` و `.ospec/` و `changes/` وملف `SKILL.md` في الجذر و `SKILL.index.json` وإرشادات `for-ai/`. |
| **Project Knowledge Layer** | سياق المشروع الصريح مثل `docs/project/*` وملفات المهارات المتدرجة وحالة الفهرس التي يستطيع الذكاء الاصطناعي قراءتها بشكل متسق. |
| **Active Change** | حاوية تنفيذ مخصصة لمتطلب واحد، وتحتوي عادةً على `proposal.md` و `tasks.md` و `state.json` و `verification.md` و `review.md`. |

## الميزات

- **تهيئة جاهزة للتغيير**: ينشئ `ospec init` هيكل البروتوكول ومستندات معرفة المشروع الأساسية دفعة واحدة.
- **تهيئة موجهة**: أثناء التهيئة بمساعدة الذكاء الاصطناعي يمكن طرح سؤال واحد فقط عند غياب ملخص المشروع أو المكدس التقني؛ أما التهيئة المباشرة عبر CLI فتعتمد على مستندات أولية بديلة عند نقص السياق.
- **صيانة المستندات**: يقوم `ospec docs generate` بتحديث أو إصلاح مستندات معرفة المشروع عند الحاجة لاحقاً.
- **تنفيذ متطلبات قابل للتتبع**: يمكن لكل تغيير الحفاظ على اتساق ملفات proposal وtasks وstate وverification وreview.
- **مساعدات الطوابير**: يدعم `queue` و `run` تنفيذ عدة تغييرات بشكل صريح عندما لا يكفي تغيير نشط واحد.
- **بوابات سير العمل للإضافات**: تدعم أوامر الإضافات المدمجة مراجعة التصميم عبر Stitch وأتمتة Checkpoint.
- **إدارة المهارات**: تثبيت وفحص مهارات OSpec لكل من Codex وClaude Code.
- **إغلاق معياري**: يقوم `finalize` بالتحقق وإعادة بناء الفهارس وأرشفة التغيير قبل تنفيذ Git commit يدوياً.

## ميزات الإضافات

يتضمن OSpec إضافتين اختياريتين توسعان سير العمل الموجّه بالمستندات عبر مراجعة الواجهات والتحقق من التدفقات.

### Stitch

استخدم Stitch لمراجعة تصميم الصفحات والتعاون على المعاينة، خصوصاً لصفحات الهبوط وصفحات التسويق والتغييرات الكثيفة على الواجهة.

محادثة مع الذكاء الاصطناعي:

<pre dir="rtl" lang="ar"><code><span dir="ltr">OSpec</span>، فعّل إضافة <span dir="ltr">Stitch</span> واتصل باستخدام <span dir="ltr">Codex/Gemini</span>.</code></pre>

وضع المهارة في Claude / Codex:

<pre dir="rtl" lang="ar"><code><span dir="ltr">$ospec</span>، فعّل إضافة <span dir="ltr">Stitch</span> واتصل باستخدام <span dir="ltr">Codex/Gemini</span>.</code></pre>

<details>
<summary>سطر الأوامر</summary>

```bash
ospec plugins enable stitch .
```

</details>

### Checkpoint

استخدم Checkpoint للتحقق من تدفقات التطبيق والفحوص المؤتمتة، خصوصاً لمسارات الإرسال والمسارات الحرجة والتحقق التشغيلي قبل القبول.

محادثة مع الذكاء الاصطناعي:

<pre dir="rtl" lang="ar"><code><span dir="ltr">OSpec</span>، فعّل إضافة <span dir="ltr">Checkpoint</span>.</code></pre>

وضع المهارة في Claude / Codex:

<pre dir="rtl" lang="ar"><code><span dir="ltr">$ospec</span>، فعّل إضافة <span dir="ltr">Checkpoint</span>.</code></pre>

<details>
<summary>سطر الأوامر</summary>

```bash
ospec plugins enable checkpoint . --base-url http://127.0.0.1:3000
```

ملاحظات:

- يشير `--base-url` إلى التطبيق الجاري تشغيله والمستخدم في الفحوص المؤتمتة

</details>

## الوثائق

### الوثائق الأساسية

- [دليل البرومبت](prompt-guide.ar.md)
- [الاستخدام](usage.ar.md)
- [نظرة عامة على المشروع](project-overview.ar.md)
- [التثبيت](installation.ar.md)
- [تثبيت المهارات](skills-installation.ar.md)

### مواصفات الإضافات

- [مواصفات إضافة Stitch](stitch-plugin-spec.ar.md)
- [مواصفات إضافة Checkpoint](checkpoint-plugin-spec.ar.md)

## هيكل المستودع

```text
dist/                       Compiled CLI runtime
assets/                     Managed protocol assets, hooks, and skill payloads
docs/                       Public documentation
scripts/                    Release and installation helpers
.ospec/templates/hooks/     Hook templates shipped with the package
```

## الترخيص

هذا المشروع مرخّص بموجب [MIT License](../LICENSE).
