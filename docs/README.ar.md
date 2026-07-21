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

حزمة CLI الرسمية لـ OSpec هي `@clawplays/ospec-cli`، والأمر الرسمي هو `ospec`. إن OSpec إطار عمل spec-driven وagentic لوكلاء البرمجة بالذكاء الاصطناعي (AI coding agents)، يجلب التطوير المعتمد على المواصفات (SDD) وLoop Engineering (حلقة هدف قابلة للتحقق: تخطيط → تنفيذ → تحقّق) إلى Claude Code وCodex وGemini وOpenCode والوكلاء المعتمدين على MCP وتدفقات عمل CLI المباشرة.


<p align="center">
  <a href="prompt-guide.ar.md">دليل البرومبت</a> |
  <a href="usage.ar.md">الاستخدام</a> |
  <a href="project-overview.ar.md">نظرة عامة</a> |
  <a href="installation.ar.md">التثبيت</a> |
  <a href="external-plugins.ar.md">الإضافات الخارجية</a> |
  <a href="plugin-release.ar.md">نشر الإضافات</a> |
  <a href="https://github.com/clawplays/ospec/issues">Issues</a>
</p>

## لماذا OSpec؟

مساعدات البرمجة بالذكاء الاصطناعي قوية، لكن عندما تعيش المتطلبات داخل سجل الدردشة فقط يصبح من الصعب فحصها ومراجعتها وإغلاقها بشكل واضح. يضيف OSpec طبقة سير عمل خفيفة حتى يحتفظ المستودع بسياق التغيير قبل كتابة الكود وبعد شحنه.

- **حوّل المتطلب إلى ملفات مواصفات داخل المستودع**: يحوّل OSpec المتطلب إلى ملفات proposal و design وخطة و tasks ومراجعات وأدلة تحقّق، ويحفظها في مستودعك بدلاً من سجل المحادثة——فيستطيع أي مساعد (Codex/GPT و Claude Code و Gemini و OpenCode أو CLI المباشر) أن يكمل من حيث توقّف السابق.
- **`ospec change` —— التدفّق اليومي السريع**: متطلب واحد يصبح active change واحداً عبر مسار قصير `init -> change -> verify/finalize`، خفيف وسهل المراجعة.
- **`ospec goal` —— انضباط بمستوى هندسي**: عصف ذهني وتثبيت التصميم قبل أي كود، وتقسيم العمل إلى رسم مهام (task graph)، وإرسال وكلاء فرعيين متوازين، وفرض TDD ومراجعة كود بمراجِع مستقل، وطلب أدلة اختبار/تحقّق قابلة للمراجعة قبل اعتبار أي شيء «منجزاً».
- **`ospec goal` يعمل كحلقة fast quality موحدة**: ينفّذ deterministic preflight وcombined planning review ثم tasks وreviews وverification ضمن مسار واحد متوقع.

## التثبيت باستخدام npm

```bash
npm install -g @clawplays/ospec-cli
```

الحزمة الرسمية: `@clawplays/ospec-cli`  
الأمر الرسمي: `ospec`  
التحقق من التثبيت: `ospec --help`

## البداية السريعة

استخدام OSpec يتطلب 3 خطوات فقط:

1. تهيئة OSpec داخل مجلد المشروع
2. إنشاء تغيير واحد ودفعه إلى الأمام لمتطلب أو تحديث مستندات أو إصلاح خلل
3. أرشفة التغيير المعتمد بعد اكتمال النشر والتحقق

### 1. تهيئة OSpec داخل مجلد المشروع

البرومبت الموصى به:

<pre dir="rtl" lang="ar"><code><span dir="ltr">OSpec</span>، هيّئ هذا المشروع.</code></pre>

وضع المهارة في Claude / Codex:

<pre dir="rtl" lang="ar"><code><span dir="ltr">/ospec</span> هيّئ هذا المشروع.</code></pre>

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
- في محادثات AI تكون أولوية تحديد اللغة كالتالي: اللغة المطلوبة صراحة في المحادثة -> لغة المحادثة الحالية -> لغة المشروع المحفوظة في `.skillrc`
- في CLI تكون أولوية تحديد اللغة كالتالي: `--document-language` الصريح -> لغة المشروع المحفوظة في `.skillrc` -> وثائق المشروع الحالية / `.ospec/for-ai/*` أو `for-ai/*` القديم / asset manifest -> الرجوع إلى `en-US`
- يحفظ OSpec لغة مستندات المشروع المختارة داخل `.skillrc` ويعيد استخدامها في إرشادات `for-ai` وفي `ospec change` و `ospec update`
- تستخدم المشاريع الجديدة التي تُهيَّأ عبر `ospec init` تخطيط nested افتراضيا: يبقى في الجذر فقط `.skillrc` و `README.md` بينما تنتقل بقية ملفات OSpec المُدارة إلى `.ospec/`
- لا ينشئ `init` العادي خرائط معرفة اختيارية مثل `.ospec/knowledge/src/` أو `.ospec/knowledge/tests/` بشكل افتراضي
- ما زال CLI يقبل الاختصارات مثل `changes/active/<change-name>`، لكن المسار الفعلي في المشاريع nested هو `.ospec/changes/active/<change-name>`
- إذا مرّرت هذه القيم فسيستخدمها OSpec مباشرةً عند توليد مستندات المشروع
- إذا لم تمرّرها فسيعيد OSpec استخدام المستندات الموجودة إن أمكن، وإلا فسينشئ مستندات أولية كعناصر نائبة

</details>

### 2. إنشاء تغيير ودفعه إلى الأمام

استخدم هذا النمط لتسليم المتطلبات وتحديثات المستندات وعمليات إعادة الهيكلة وإصلاحات الأخطاء.

البرومبت الموصى به:

<pre dir="rtl" lang="ar"><code><span dir="ltr">OSpec</span>، أنشئ تغييرًا لهذا المتطلب وادفعه إلى الأمام.</code></pre>

وضع المهارة في Claude / Codex:

<pre dir="rtl" lang="ar"><code><span dir="ltr">/ospec-change</span> أنشئ تغييرًا لهذا المتطلب وادفعه إلى الأمام.</code></pre>

<details>
<summary>سطر الأوامر</summary>

```bash
ospec change docs-homepage-refresh .
ospec change fix-login-timeout .
ospec change update-billing-copy .
```

</details>

### 3. الأرشفة بعد القبول

بعد أن يجتاز المتطلب النشر أو الاختبارات أو QA أو أي فحوص قبول أخرى، قم بأرشفة التغيير الذي تم التحقق منه.

البرومبت الموصى به:

<pre dir="rtl" lang="ar"><code><span dir="ltr">OSpec</span>، أرشف هذا التغيير المقبول.</code></pre>

وضع المهارة في Claude / Codex:

<pre dir="rtl" lang="ar"><code><span dir="ltr">/ospec</span> أرشف هذا التغيير المقبول.</code></pre>

<details>
<summary>سطر الأوامر</summary>

```bash
ospec verify changes/active/<change-name>
ospec finalize changes/active/<change-name>
```

استخدم force archive فقط بعد أن يقبل المستخدم صراحة المخاطر غير المحلولة:

```bash
ospec finalize changes/active/<change-name> --force-archive --confirm-force-archive <اسم-change-الدقيق> --reason "قبول مخاطر تحقق غير محلولة"
```

ملاحظات الأرشفة:

- نفّذ أولاً عملية النشر والاختبار وQA الخاصة بمشروعك
- استخدم `ospec verify` للتأكد من أن التغيير الحالي جاهز للأرشفة
- استخدم `ospec finalize` لإعادة بناء الفهارس وأرشفة التغيير المعتمد
- لا يحول force archive evidence الفاشلة أو `NOT_VERIFIED` إلى pass. يتطلب force flag وتأكيد الاسم الدقيق وسبب audit. تظل Loop items ذات الحالة المفقودة أو `issued` أو `running` مانعة؛ ويمكن الاحتفاظ بـ pointer تاريخي عندما تكون كل items `completed` أو `failed` أو `expired`. يبقى archive موسوما `forced` و`incomplete` و`accepted-risk`
- تُؤرشف المشاريع الجديدة ذات تخطيط nested تحت `.ospec/changes/archived/YYYY-MM/YYYY-MM-DD/<change-name>`، وما زالت الاختصارات من نوع `changes/archived/...` تعمل من CLI
- تقوم `ospec update` بإعادة تنظيم الأرشيفات المسطحة القديمة

</details>

### سير عمل Goal — التدفق الكامل والفرض الصارم

استخدم `ospec goal <goal-name>` فقط عندما تختار صراحة سير العمل الكامل. لا تتم ترقية Change الذي اخترته إلى Goal بسبب التعقيد أو عدد الملفات أو المخاطر أو حجم الدفعة.

تستخدم Change إرشادا مختصرا حسب المرحلة ومراجعة خفيفة واحدة بواسطة AI الحالي وcloseout مشتقا. عندما تمر بوابات verification وdocumentation وplugin وreview، يمكن لـ `APPROVED` أو `APPROVED_WITH_CONCERNS` تنفيذ finalize وarchive تلقائيا. تبقى الدفعات الصريحة متسلسلة في queue.

**أنت فقط تبدأ goal وتصف المتطلب.** ينفّذ الذكاء الاصطناعي كل أمر `ospec` بنفسه، وأنت تجيب فقط على الأسئلة في المحادثة (`Zero-Setup`).

يعمل goal على شكل **حلقة fast quality مرتبطة بالجلسة**. بعد deterministic preflight للتصميم والخطة يشتق task graph وينفّذ combined planning review مستقلة واحدة قبل workspace أو worker dispatch. يسمح بإصلاح تخطيط مجمّع واحد وfresh re-review واحدة فقط. يستخدم controller الأمر `ospec loop run --once --compact-json` وnative subagent capability الحالية فقط. عند غياب capacity يكون fallback لتوازي implementation هو 3، ويمكن رفعه بأمان إلى 5-10 عندما تسمح dependencies وfile conflicts وtoken و`maxParallel`. تكون optional allowlist حدا إضافيا فقط عند ضبطها صراحة. راجع [loop-engineering.md](loop-engineering.md).

عقود التجربة التي يلتزم بها الذكاء الاصطناعي في كل goal:

- **Announce-Before-Act**: يعلن أي skill ومرحلة، وأي أمر `ospec execute …` سيشغّله وما الأثر الذي يكتبه، وكم subagent يوزّع — لترى دائماً ما يجري.
- **Brainstorm-First**: قبل تثبيت التصميم يعرض القرارات المفتوحة (الاتجاه، البنية، API، البيانات، UI، المخاطر، النطاق) ويسألك واحداً تلو الآخر عبر واجهة الأسئلة الأصلية (في Claude Code: AskUserQuestion) بدلاً من الافتراض الصامت.
- **بوابات قرار دائمة**: تُسجَّل الخيارات المفتوحة عبر `ospec execute decision …`؛ وتحجب القرارات required توزيع العمال حتى تجيب.

الفرض الصارم في Claude Code (مرة واحدة؛ ينفّذه الذكاء الاصطناعي تلقائياً في بيئة Claude Code):

```bash
ospec session hook --target claude --apply
```

يكتب هذا حزمة hook تحت `.ospec/hooks/claude/` ويدمجها بشكل idempotent في `.claude/settings.json` (قابل للعكس). تقوم الـ hooks بما يلي:

- تعلن كل توزيع subagent وكل أمر `ospec` على مستوى الأداة،
- تحجب توزيع الـ subagents بشكل صارم طالما هناك قرار required معلّق،
- تعيد تأكيد عقد Announce-Before-Act / Brainstorm-First في كل دور.

تُحمَّل الـ hooks عند بدء الجلسة، لذا تسري اعتباراً من جلسة Claude Code التالية.

### طريقة تثبيت الإضافات

- `ospec plugins list`
- `ospec plugins install <plugin>`
- `ospec plugins enable <plugin> [path]`
- إذا قال المستخدم في المحادثة "افتح Stitch / Checkpoint" فالمقصود هو: افحص أولاً هل الإضافة مثبتة عالمياً، وإذا لم تكن مثبتة فثبّتها، ثم فعّلها داخل المشروع الحالي

## الوثائق

### الوثائق الأساسية

- [Prompt Guide](prompt-guide.ar.md)
- [Usage](usage.ar.md)
- [Project Overview](project-overview.ar.md)
- [Installation](installation.ar.md)
- [Skills Installation](skills-installation.ar.md)
- [External Plugins](external-plugins.ar.md)
- [Plugin Release](plugin-release.ar.md)

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
