---
name: project-ai-guide
title: دليل الذكاء الاصطناعي
tags: [ai, guide, ospec]
---

# دليل الذكاء الاصطناعي

## الهدف

هذه الوثيقة هي النسخة المعتمدة داخل المشروع من مواصفة OSpec الأم. يجب على الذكاء الاصطناعي اتباع القواعد المعتمدة داخل المشروع أولاً بدلاً من الارتجال انطلاقاً من المستودع الأم.

## ترتيب العمل

1. اقرأ `.skillrc`
2. اقرأ `SKILL.index.json`
3. اقرأ القواعد المعتمدة للمشروع تحت `docs/project/`
4. اقرأ ملفات `SKILL.md` ذات الصلة
5. اقرأ ملفات التنفيذ الخاصة بالتغيير الحالي
6. إذا كان Stitch مفعلاً وكان التغيير الحالي يفعّل `stitch_design_review`، فافحص `artifacts/stitch/approval.json` أولاً
7. إذا احتجت إلى تثبيت Stitch أو تبديل provider أو إصلاح doctor أو إعداد MCP أو المصادقة، فاقرأ مواصفة Stitch المحلية في المستودع أولاً. وعندما يوجد `docs/stitch-plugin-spec.zh-CN.md` فاعتبر مقاطع الإعداد فيه هي المصدر المعتمد

## السلوك المطلوب

- حافظ على `proposal.md` و`tasks.md` و`verification.md` و`review.md` باللغة المعتمدة للمشروع
- لا تستنتج لغة وثائق change من لغة واجهة المنتج أو locale الموقع أو من متطلب "الإنجليزية أولاً" فقط
- إذا كان البروتوكول المعتمد للمشروع بالصينية أو كانت وثائق change الحالية بالصينية بالفعل، فاستمر بالصينية ما لم تغيّر قواعد المشروع ذلك صراحةً
- استخدم الفهرس لتحديد موقع المعرفة قبل قراءة الملفات الهدف
- اقرأ القواعد المعتمدة للمشروع قبل بدء التنفيذ
- إذا كان `stitch_design_review` مفعلاً وكان `approval.json.preview_url` أو `submitted_at` فارغاً، فشغّل أولاً `ospec plugins run stitch <change-path>` لتوليد preview ثم أرسل الرابط للمستخدم
- إذا كانت `.skillrc.plugins.stitch.project.project_id` مضبوطة مسبقاً، فيجب إعادة استخدام مشروع Stitch نفسه وعدم إنشاء مشروع جديد
- إذا كانت `.skillrc.plugins.stitch.project.project_id` فارغة، فاعتبر أول تشغيل ناجح لـ Stitch هو المشروع canonical وأعد استخدامه لاحقاً
- إذا كان `stitch_design_review` مفعلاً وكان `approval.json.status != approved` فتوقف عند بوابة مراجعة التصميم
- يجب أن تفرض مراجعة صفحات Stitch تخطيطاً canonical واحداً لكل مسار أعمال
- عند إنتاج `light/dark` اشتق النسختين من الشاشة canonical نفسها ولا تعِد ترتيب الوحدات أو تغيّر هيكل المعلومات أو تنقل CTA أو تنشئ تركيباً مختلفاً
- إذا كانت الصفحة المطابقة موجودة بالفعل ففضّل `edit existing screen` أو `duplicate existing canonical screen and derive a theme variant`
- يجب أن يتضمن كل تسليم Stitch ملف `screen mapping` يحتوي على route ومعرفات canonical dark/light وعلاقة الاشتقاق ومعرفات الشاشات المؤرشفة
- يجب أرشفة أو إعادة تسمية الشاشات القديمة وشاشات الاستكشاف والشاشات المستبدلة بدلاً من تركها كصفحات رئيسية موازية للشاشة canonical
- إذا كان اختيار canonical أو pairing للثيمات أو screen mapping أو تنظيف التكرارات ناقصاً فلا تعتبر المراجعة مكتملة
- يستخدم `ospec plugins run stitch <change-path>` افتراضياً موائم Stitch provider المضبوط. استخدم runner مخصصاً فقط عند وجود override صريح في `.skillrc.plugins.stitch.runner`
- إذا استخدم runner مخصص `token_env` فتأكد من ضبط متغير البيئة الموافق قبل التشغيل
- إذا لم تتضح جاهزية runner أو Gemini CLI أو Codex CLI أو stitch MCP أو المصادقة، فشغّل أولاً `ospec plugins doctor stitch <project-path>`
- إذا أظهر `plugins doctor stitch` نتيجة غير PASS لفحوص provider المحدد، فاطلب من المستخدم تثبيت CLI المطلوب وإكمال إعداد stitch MCP / API token
- عند تثبيت Stitch أو تبديل provider أو إصلاح doctor أو إعداد MCP أو المصادقة، اقرأ مواصفة Stitch المحلية أولاً. وعندما يوجد `docs/stitch-plugin-spec.zh-CN.md` فانسخ شكل إعداد Gemini / Codex الموثق فيه بدلاً من ابتكار إعداد بديل
- إذا كان provider الداخلي `codex` ينجح في الاستدعاءات للقراءة فقط لكن `create_project` أو `generate_screen` أو `edit_screens` يتوقف محلياً، فتحقق أولاً من أن التشغيل يستخدم `codex exec --dangerously-bypass-approvals-and-sandbox`
- إذا كان المشروع يبدّل `.skillrc.plugins.stitch.runner` صراحةً ومع ذلك يبقى Codex مسؤولاً عن كتابات Stitch، فيجب على runner / wrapper المخصص تمرير `--dangerously-bypass-approvals-and-sandbox` أيضاً
- زامن `SKILL.md` بعد التغييرات البرمجية المهمة
- أعد بناء `SKILL.index.json` عند الحاجة

## أولوية قواعد المشروع

- اتفاقيات التسمية: `docs/project/naming-conventions.md`
- اتفاقيات SKILL: `docs/project/skill-conventions.md`
- اتفاقيات سير العمل: `docs/project/workflow-conventions.md`
- دليل التطوير: `docs/project/development-guide.md`
