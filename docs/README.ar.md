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

حزمة CLI الرسمية لـ OSpec هي `@clawplays/ospec-cli`، والأمر الرسمي هو `ospec`. يدعم OSpec أسلوب التطوير المعتمد على المواصفات (SDD) والتطوير المعتمد على الوثائق لوكلاء البرمجة بالذكاء الاصطناعي وتدفقات العمل المعتمدة على CLI.


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

الحزمة الرسمية: `@clawplays/ospec-cli`  
الأمر الرسمي: `ospec`  
التحقق من التثبيت: `ospec --help`

## البداية السريعة

استخدام OSpec يتطلب 3 خطوات فقط:

1. تهيئة OSpec داخل مجلد المشروع
2. إنشاء تغيير واحد ودفعه إلى الأمام لمتطلب أو تحديث مستندات أو إصلاح خلل
3. أرشفة التغيير المعتمد بعد اكتمال النشر والتحقق

### طريقة تثبيت الإضافات

- `ospec plugins list`
- `ospec plugins install <plugin>`
- `ospec plugins enable <plugin> [path]`
- إذا قال المستخدم في المحادثة "افتح Stitch / Checkpoint" فالمقصود هو: افحص أولاً هل الإضافة مثبتة عالمياً، وإذا لم تكن مثبتة فثبّتها، ثم فعّلها داخل المشروع الحالي

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
