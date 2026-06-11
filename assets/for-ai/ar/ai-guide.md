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
7. إذا احتجت إلى تثبيت Stitch أو Checkpoint أو تبديل provider أو إصلاح doctor أو إعداد MCP أو المصادقة أو تفعيل الإضافة، فاقرأ أولاً مواصفة الإضافة المحلية في المستودع المطابقة للغة وثائق المشروع، ولا تنتقل إلى لغة أخرى إلا إذا كان الملف المطابق غير موجود

## السلوك المطلوب

- حافظ على `proposal.md` و`design.md` و`implementation-plan.md` و`artifacts/agents/task-graph.json` و`artifacts/agents/bootstrap.md` و`artifacts/agents/handoff.md` و`artifacts/agents/document-review-dispatches/` و`artifacts/agents/workspace-status.md` و`artifacts/agents/worktree-plan.md` و`artifacts/agents/finish-plan.md` و`artifacts/agents/launch-plan.md` و`artifacts/agents/worker-runs/` و`artifacts/agents/review-runs/` و`artifacts/agents/retries/` و`artifacts/agents/blockers/` و`artifacts/agents/review-feedback-plan.md` و`tasks.md` و`artifacts/reviews/design-review.md` و`artifacts/reviews/implementation-plan-review.md` و`artifacts/reviews/spec-compliance.md` و`artifacts/reviews/code-quality.md` و`artifacts/agents/worker-status.md` و`artifacts/agents/debug-evidence.json` و`artifacts/agents/tdd-evidence.json` و`artifacts/agents/verification-evidence.json` و`verification.md` و`review.md` باللغة المعتمدة للمشروع
- لا تستنتج لغة وثائق change من لغة واجهة المنتج أو locale الموقع أو من متطلب "الإنجليزية أولاً" فقط
- إذا كان البروتوكول المعتمد للمشروع بالصينية أو كانت وثائق change الحالية بالصينية بالفعل، فاستمر بالصينية ما لم تغيّر قواعد المشروع ذلك صراحةً
- استخدم الفهرس لتحديد موقع المعرفة قبل قراءة الملفات الهدف
- عند الدخول إلى مشروع OSpec موجود، شغّل `ospec session [path]` لكتابة `.ospec/session-brief.json` و`.ospec/session-brief.md` مع active change وqueued change وqueue run وcache fingerprint والأمر الآمن التالي؛ هذا project entry brief لا يستبدل `ospec execute bootstrap` للـ active change
- تعامل مع خطوات built-in quality policy المفعّلة مثل `tdd_cycle` و`root_cause_debug` و`verification_evidence` كـ `optional_steps` خاضعة لـ archive gate؛ غطّها في `tasks.md` و`verification.md` وملفات evidence المطابقة قبل closeout
- عند تنفيذ change بمساعدة AI، لا تطلب من المستخدم كتابة `design.md` أو `implementation-plan.md` يدوياً؛ أنشئهما أو حدّثهما من المتطلب و`proposal.md` وسياق المشروع قبل اشتقاق `artifacts/agents/task-graph.json` أو تعديل `tasks.md` أو الكود
- لا تطرح أكثر من سؤال تصميم موجز واحد إلا عندما يغيّر القرار الناقص البنية أو API أو البيانات أو UI أو المخاطر فعلياً؛ وإلا فسجل الافتراضات في `design.md`
- يجب أن يُشتق `implementation-plan.md` من `design.md`، وأن يُشتق `artifacts/agents/task-graph.json` من `implementation-plan.md`، وأن تُشتق `tasks.md` من task graph، وتُوائم المهام الموجودة بعد تحديث الوثائق السابقة
- عند بدء أو استئناف active change واحد، استخدم `ospec execute bootstrap [changes/active/<change>]` لكتابة `artifacts/agents/bootstrap.json` و`artifacts/agents/bootstrap.md` مع project session brief snapshot، ثم اتبع الإجراء الآمن التالي المسجل فيه؛ عند وجود active dispatch، يوصي bootstrap بأمر `ospec execute launch ... --task ...` المطابق
- عند نقل change بين agents أو tools أو worktrees أو shells أو operators بشريين، استخدم `ospec execute handoff [changes/active/<change>] [--target codex|gpt|claude|gemini|opencode|shell|generic]` لكتابة `artifacts/agents/handoff.json` و`artifacts/agents/handoff.md`؛ يسجل هذا الأمر project session brief snapshot وtool mapping وقواعد السلامة فقط ولا يشغّل workers أو يعدّل source files
- قبل اشتقاق implementation tasks أو dispatch لها، استخدم `ospec execute doc-review [changes/active/<change>] [--stage design|plan]` لإنشاء document reviewer packets تتضمن project session brief snapshot تحت `artifacts/agents/document-review-dispatches/` وتجهيز `artifacts/reviews/design-review.md` أو `artifacts/reviews/implementation-plan-review.md`؛ يجب اعتماد design review قبل dispatch لمراجعة implementation plan
- عندما تحتاج إلى عرض controller للمهام ready وblocked وrunning وcompleted والمرشحات التالية الآمنة، استخدم `ospec execute status [changes/active/<change>]` أو `ospec execute next [changes/active/<change>]`
- قبل handoff إلى worker استخدم `ospec execute workspace [changes/active/<change>]` لتسجيل سلامة git workspace؛ إذا كانت الحالة `needs_isolation`، نظّف workspace أو انقل العمل إلى git worktree معزول قبل parallel dispatch
- قبل إنشاء git worktree معزول، استخدم `ospec execute worktree [changes/active/<change>] [--branch name] [--path path] [--base ref]` لكتابة `artifacts/agents/worktree-plan.json` و`artifacts/agents/worktree-plan.md`؛ هذا الأمر يسجل خطة تحضير فقط ولا يشغّل `git worktree add`
- قبل الإغلاق النهائي، استخدم `ospec execute finish [changes/active/<change>] [--target main] [--remote origin]` لكتابة `artifacts/agents/finish-plan.json` و`artifacts/agents/finish-plan.md`؛ هذا الأمر يسجل الجاهزية ونص الأوامر فقط ولا يشغل finalize أو archive أو push أو merge أو حذف worktree
- عندما تحتاج إلى handoff artifacts دائمة على مستوى task، استخدم `ospec execute dispatch` لإنشاء batch آمن للتوازي من worker packets و`ospec execute complete` لتسجيل نتائج worker؛ يتضمن كل dispatch packet project session brief snapshot وworker profile يوضح capability tier وrecommended target وtarget tool mapping وrationale وrequired behavior؛ عندما تكون النتيجة `NEEDS_CONTEXT` أو `BLOCKED` يكتب `complete` ملفات `artifacts/agents/blockers/`؛ استخدم `--task` لمهمة واحدة صريحة و`--limit` لتحديد حجم dispatch batch؛ بعد اكتمال كل worker task استخدم `ospec execute review [changes/active/<change>] --task <task-id> --stage spec` ثم `--stage quality` لإجراء task-level review، وتبقى المهام التابعة محجوبة حتى اعتماد المراجعتين؛ وبعد اعتماد كل task-level reviews واكتمال task graph استخدم `ospec execute review` من دون `--task` لإنشاء final spec أو quality reviewer handoff packets؛ وبعد decision غير `PENDING` استخدم `ospec execute feedback` لكتابة `artifacts/agents/review-feedback-plan.md`؛ وبعد تعديل execution أو review artifacts يدويا استخدم `ospec execute sync` لإعادة بناء `worker-status.md`
- بعد dispatch، استخدم `ospec execute launch [changes/active/<change>] [--task task-id] [--target codex|gpt|claude|gemini|opencode|shell|generic] [--dry-run]` لكتابة native agent launch plan؛ يوجه controlling AI إلى آلية agent الأصلية في harness الحالي: Codex/GPT يستخدم `spawn_agent`/`wait_agent`/`close_agent`، وClaude Code يستخدم Task، وGemini يستخدم `@generalist`، وOpenCode يستخدم `@mention`. هذا الأمر لا يشغّل workers ولا أوامر shell بنفسه
- default multi-worker execution هو current-harness native subagents: أنشئ safe packets عبر `ospec execute dispatch`، اقرأ `launch-plan.md`، ثم dispatch native worker agent لكل packet آمن، وسجل النتيجة عبر `ospec execute complete`
- استخدم `ospec execute orchestrate [changes/active/<change>] --command "..."` فقط كـ final CLI fallback عندما لا يدعم harness الحالي native subagents؛ fallback mode يرندر explicit command template ويشغّل worker commands بالتوازي ويسجل `artifacts/agents/orchestration-runs/`
- استخدم `--run --command` مع `ospec execute launch ... --run --command "..."` فقط كـ single-worker CLI fallback عندما لا تتوفر native subagents أو يتم تجاوزها صراحة؛ ثم استخدم `ospec execute collect ...` لتسجيل fallback task result. بعد إصلاح blocked أو needs-context أو failed work استخدم `ospec execute retry` لإعادة dispatch
- لا يشغّل OSpec local reviewer command إلا عند استخدام `ospec execute review ... --run --command "..."` صراحة؛ يسجل ذلك `artifacts/agents/review-runs/` ويمكنه كتابة review decision عند تمرير `--decision`
- عندما يكون debugging جزءا من change، استخدم `ospec execute debug [changes/active/<change>] --symptom "..." --root-cause "..." --status FIXED` لتسجيل root-cause وfix evidence؛ هذا الأمر يسجل evidence فقط ولا يشغّل أوامر shell
- بعد تشغيل focused tests، استخدم `ospec execute tdd [changes/active/<change>] --phase red|green|refactor --command "..." --status ...` لتسجيل TDD cycle evidence؛ هذا الأمر يسجل evidence فقط ولا يشغّل أوامر shell
- بعد تشغيل project checks حديثة، استخدم `ospec execute verify [changes/active/<change>] --command "..." --status PASSED` لتسجيل verification evidence؛ هذا الأمر يسجل evidence فقط ولا يشغّل أوامر shell
- `ospec execute doc-review` يسجل artifacts فقط ولا يشغّل reviewers ولا أوامر shell ولا يزامن worker status ولا يعدّل source files
- لا تؤرشف عندما يحتوي `artifacts/agents/task-graph.json` على حالات مهام غير محسومة أو اعتماديات غير صالحة أو ملفات مستهدفة ناقصة أو أوامر تحقق ناقصة أو عندما لا يكون `status` العلوي `completed`
- بعد التنفيذ، أكمل كل task-level spec review قبل quality review الخاصة بها، ثم أكمل final `artifacts/reviews/spec-compliance.md` قبل final `artifacts/reviews/code-quality.md`؛ قرارات task-level أو final review غير المحسومة تمنع الأرشفة
- أثناء التنفيذ والمراجعة، حافظ على اتساق `artifacts/agents/worker-status.md` مع حالات implementer وspec reviewer وquality reviewer وcontroller
- لا تدّعِ الاكتمال ما دامت أي حالة worker هي `PENDING` أو `NEEDS_CONTEXT` أو `BLOCKED`؛ ويجب أن تكون `controller_status` هي `DONE` قبل الأرشفة
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
- عند تثبيت Stitch أو تبديل provider أو إصلاح doctor أو إعداد MCP أو المصادقة، اقرأ أولاً مواصفة Stitch المحلية المطابقة للغة وثائق المشروع، ثم انسخ شكل إعداد Gemini / Codex الموثق فيها بدلاً من ابتكار إعداد بديل
- إذا كان provider الداخلي `codex` ينجح في الاستدعاءات للقراءة فقط لكن `create_project` أو `generate_screen` أو `edit_screens` يتوقف محلياً، فتحقق أولاً من أن التشغيل يستخدم `codex exec --dangerously-bypass-approvals-and-sandbox`
- إذا كان المشروع يبدّل `.skillrc.plugins.stitch.runner` صراحةً ومع ذلك يبقى Codex مسؤولاً عن كتابات Stitch، فيجب على runner / wrapper المخصص تمرير `--dangerously-bypass-approvals-and-sandbox` أيضاً
- زامن `SKILL.md` بعد التغييرات البرمجية المهمة
- أعد بناء `SKILL.index.json` عند الحاجة

## أولوية قواعد المشروع

- اتفاقيات التسمية: `docs/project/naming-conventions.md`
- اتفاقيات SKILL: `docs/project/skill-conventions.md`
- اتفاقيات سير العمل: `docs/project/workflow-conventions.md`
- دليل التطوير: `docs/project/development-guide.md`
