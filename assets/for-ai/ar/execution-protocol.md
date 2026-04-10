---
name: project-execution-protocol
title: بروتوكول التنفيذ
tags: [ai, protocol, ospec]
---

# بروتوكول تنفيذ الذكاء الاصطناعي

## اقرأ هذا أولاً في كل مرة تدخل فيها إلى مشروع

1. `.skillrc`
2. `SKILL.index.json`
3. `docs/project/naming-conventions.md`
4. `docs/project/skill-conventions.md`
5. `docs/project/workflow-conventions.md`
6. ملفات change الحالية: `proposal.md / tasks.md / state.json / verification.md`
7. إذا وُجد `stitch_design_review` فاقرأ `artifacts/stitch/approval.json`
8. إذا كنت تحتاج إلى تعديل إعدادات Stitch أو Checkpoint المتعلقة بـ provider أو MCP أو المصادقة أو التثبيت أو التفعيل، فاقرأ أولاً مواصفة الإضافة المحلية المطابقة للغة الوثائق المعتمدة للمشروع، ولا تنتقل إلى لغة أخرى إلا إذا كان الملف المطابق غير موجود

## القواعد الإلزامية

- حافظ على `proposal.md` و`tasks.md` و`verification.md` و`review.md` باللغة المعتمدة للمشروع
- لا تعِد كتابة وثائق change إلى الإنجليزية فقط لأن واجهة المنتج أو locale الموقع أو نص المتطلب يميل إلى الإنجليزية
- إذا كانت وثائق change الحالية بالصينية بالفعل، فاستمر بالصينية ما لم تتطلب قواعد المشروع التحويل إلى الإنجليزية صراحةً
- لا تتجاوز proposal/tasks وتنتقل مباشرة إلى التنفيذ
- استخدم `state.json` كمصدر الحقيقة لحالة التنفيذ
- يجب أن تظهر optional steps المفعلة في `tasks.md` و`verification.md`
- إذا كان `stitch_design_review` مفعلاً وكان `approval.json.preview_url` أو `submitted_at` فارغاً، فشغّل أولاً `ospec plugins run stitch <change-path>` لإرسال preview
- يجب أن تفرض مراجعة تصميم Stitch تخطيطاً canonical واحداً لكل route، ويجب تصنيف الشاشات غير canonical على أنها `archive / old / exploration`
- في متغيرات الثيم `light/dark` حافظ على التخطيط canonical نفسه وحوّل الثيم البصري فقط من دون إعادة ترتيب الوحدات أو نقل CTA أو تغيير البنية
- إذا كانت الصفحة المطابقة موجودة بالفعل ففضّل `edit existing screen` أو `duplicate existing canonical screen and derive a theme variant`
- يجب أن يخرج كل تسليم Stitch `screen mapping` يتضمن route ومعرفات canonical dark/light وعلاقة الاشتقاق ومعرفات الشاشات المؤرشفة
- يجب ألا تبقى الشاشات القديمة أو الاستكشافية أو المستبدلة بجوار الشاشات canonical كصفحات رئيسية موازية
- إذا كانت `.skillrc.plugins.stitch.project.project_id` موجودة، فأعد استخدام معرف مشروع Stitch نفسه ولا تنشئ مشروعاً آخر لهذا التغيير
- إذا كان مشروع Stitch canonical ما زال فارغاً، فإن أول إرسال ناجح لـ Stitch يصبح المشروع canonical للمستودع
- قبل تشغيل Stitch افترض أن الإضافة الداخلية `stitch` تستخدم provider المضبوط افتراضياً؛ ولا تعتبر `.skillrc.plugins.stitch.runner` مرجعاً إلا إذا كان هناك override صريح
- إذا كان المشروع يستخدم runner مخصصاً وكان `token_env` مضبوطاً، فتأكد من ضبط متغير البيئة الموافق
- إذا كانت جاهزية Stitch bridge أو Gemini CLI أو Codex CLI أو stitch MCP أو المصادقة غير واضحة، فشغّل أولاً `ospec plugins doctor stitch <project-path>`
- إذا كشف `plugins doctor stitch` عن مشكلات في provider أو MCP أو المصادقة، فارجع أولاً إلى مواصفة Stitch المحلية في المستودع ولا تبتكر إعدادات بديلة خارجها
- إذا كان provider الداخلي `codex` يستطيع تنفيذ الاستدعاءات للقراءة فقط لكن `create_project` أو `generate_screen` أو `edit_screens` يتوقف محلياً، فتحقق أولاً من أن التشغيل يستخدم `codex exec --dangerously-bypass-approvals-and-sandbox`
- إذا كان المشروع يبدّل `.skillrc.plugins.stitch.runner` صراحةً وما زال يستخدم Codex في كتابات Stitch، فيجب على runner / wrapper المخصص تمرير `--dangerously-bypass-approvals-and-sandbox`
- إذا كان `stitch_design_review` مفعلاً وكان `approval.json.status != approved` فلا تعتبر التغيير جاهزاً للاستمرار أو الاكتمال أو الأرشفة
- إذا كان اختيار canonical أو pairing للثيمات أو screen mapping أو تنظيف التكرارات ناقصاً فلا تعتبر مراجعة التصميم ناجحة
- لا تعتبر العمل مكتملاً عندما تكون ملفات `SKILL.md` والفهرس غير متزامنة
