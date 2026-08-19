---
name: project-workflow-conventions
title: اتفاقيات تنفيذ workflow
tags: [conventions, workflow, change, ospec]
---

# اتفاقيات تنفيذ workflow

تثبت هذه الوثيقة مسار تنفيذ OSpec داخل المشروع حتى تنتقل المتطلبات عبر planning وimplementation وverification وarchive مع بوابات متسقة. وهي تسجل اتفاقيات المشروع فقط: لا تُعاد هنا قائمة أوامر `ospec execute ...` ولا خياراتها ولا الـ artifacts التي يكتبها كل أمر. شغّل `ospec help execute` أو `ospec help <subcommand>` عند الحاجة، واقرأ `for-ai/execution-protocol.md` عندما تحتاج حالة محددة في طبقة goal controller إلى التفصيل خلف قاعدة ما — لا كخطوة من خطوات الدخول إلى الطبقة.

## Workflow Profiles

- `workflow_profile_id: change` هو التدفق السريع للتغييرات الصغيرة والروتينية: `proposal.md` و`tasks.md` والتنفيذ و`verification.md` و`review.md` و`state.json`
- `workflow_profile_id: goal` هو التدفق الكامل للعمل المعقد: يضيف `design.md` و`implementation-plan.md` و`artifacts/agents/task-graph.json` وdocument review وworker/reviewer handoff وfinal review وworker status وevidence gates
- استخدم `ospec change` / `ospec-change` للـ classic changes، واستخدم `ospec goal` / `ospec-goal` للـ goals؛ و`ospec new` ليس إلا اسماً بديلاً متوافقاً لـ `ospec change`

## الترتيب القياسي

1. توضيح سياق المشروع ونطاق التأثير
2. إنشاء `proposal.md` أو تحديثه
3. في classic change أنشئ `tasks.md` أو حدّثه مباشرة من `proposal.md`
4. في goal أنشئ `design.md` أو حدّثه
5. في goal أنشئ `implementation-plan.md` أو حدّثه
6. في goal أنشئ `artifacts/agents/task-graph.json` أو حدّثه
7. أنشئ `tasks.md` أو حدّثه
8. ادفع التنفيذ وفق `state.json`
9. في goal أكمل بوابات document وtask-level وfinal review
10. في goal حدّث `artifacts/agents/worker-status.md`
11. تحديث `SKILL.md` ذي الصلة
12. إعادة بناء `SKILL.index.json`
13. إكمال `verification.md`
14. الأرشفة فقط بعد اجتياز بوابات workflow profile الحالي

يُشتق كل artifact من الذي يعلوه، والأعلى يُصلح أولاً: إذا كانت `tasks.md` موجودة بينما الوثائق السابقة ما زالت قوالب، فحدّث الوثائق السابقة أولاً ثم وائم المهام. وفي classic change لا تنشئ `design.md` أو `implementation-plan.md` أو task graph أو worker packets أو goal review artifacts ما لم يطلب المستخدم الترقية إلى goal صراحة. أما حقول مهام task graph وقواعد `serial_reason` / `maxParallelReason` / `scope_reason` وقواعد allowlist الاختيارية فتُعرَّف مرة واحدة في `for-ai/execution-protocol.md`.

- `Announce-Before-Act`: لا تُشغّل سير العمل بصمت — أعلن OSpec skill والمرحلة، والأمر والـ artifact، وأي بوابة تحجب التقدم. وفي طبقة goal controller أعلن أيضاً runtime adapter المختار وعدد workers والآلية الفعلية
- `Brainstorm-First`: قبل تثبيت تصميم goal اطرح ما هو مفتوح في الاتجاه والبنية وAPI والبيانات وUI والمخاطر والنطاق، وفضّل رفع decision gate دائمة على الافتراض الصامت. عقد بوابة القرار الكامل مكتوب في الوثيقة التي يقرأها profile الخاص بك أصلاً: `for-ai/change-protocol.md` في classic change و`for-ai/execution-protocol.md` في goal. وهو ملزم على كل harness؛ أما session hook المخصص لـ Claude وحده والاختياري فيعيد حقنه وقت التشغيل ولا يكون مصدره أبداً

## قيود الحالة

- `state.json` هو مصدر الحقيقة لحالة التنفيذ، ولا يستبدله `verification.md`؛ وإذا اختلفت ملفات الحالة وملفات التنفيذ فأصلح الحالة أولاً
- في goal يحفظ `artifacts/agents/task-graph.json` حالة المهام والاعتماديات والتعارضات والملفات المستهدفة وأوامر التحقق بصيغة قابلة للقراءة آلياً، ويحفظ `artifacts/agents/worker-status.md` حالات implementer وspec reviewer وquality reviewer وcontroller. وبعد أي تعديل يدوي على أيهما شغّل `ospec execute sync`
- تعكس قوائم التقدم الواقع: علّم معايير القبول في proposal.md فور نجاح دليل التحقق (بنود `[verify:<id>]` يعلّمها sync تلقائياً)، والبنود غير المعلّمة تحظر الأرشفة؛ و`review.md` في Goal مشتقة من final review عبر sync ولا تحرر يدوياً
- لا تعتبر change مكتملة ما دامت أي حالة worker هي `PENDING` أو `NEEDS_CONTEXT` أو `BLOCKED`؛ ويجب أن تكون `controller_status` هي `DONE` قبل الأرشفة

## حدود أوامر التنفيذ

- أوامر `ospec execute ...` تسجل OSpec artifacts فقط؛ وباستثناء قراءة `workspace` و`worktree` و`finish` لحالة git، لا تحرر ملفات source في المشروع مباشرة
- الترتيب ثابت: `preflight --stage design` ثم `--stage plan` ثم اشتقاق task graph ثم combined planning review واحدة ثم فحص workspace وdispatch الـ workers
- اجمع red test العادي وproduction implementation ودليل green/refactor في atomic task واحدة
- تبقى المهام التابعة محجوبة حتى تنجح المراجعة الموحدة الواحدة لتلك المهمة في `artifacts/reviews/tasks/<task-id>/review.md`، ولا تتم الأرشفة قبل نجاح `artifacts/reviews/final-review.md` الموحدة. أرسل كل review packet إلى fresh model-native reviewer subagent — لا يشغّل OSpec أي local reviewer CLI — وسجّل القرار والدليل المطابقين
- يتبع multi-worker execution القيمة `runtimeAdapter.selected.nativeSubagent`، ولا يعمل بالتوازي إلا عندما يدعم native adapter المختار ذلك. ويجب block عند غياب capability أو انتهائها أو عدم مطابقة target، من دون fallback إلى Orca أو agent CLI أو current controller
- لا تتابع dispatch ما دامت هناك required pending decisions
- عندما تكون حالة finish plan هي ready ولا توجد required pending decision، شغّل `ospec finalize`؛ و`ospec archive ... --check` معاينة dry-run اختيارية فقط، فلا تتوقف بعد نجاحها

## لغة الوثائق

- اكتب كل artifact خاص بالـ change باللغة المعتمدة لوثائق المشروع
- قد تختلف لغة واجهة المنتج عن لغة وثائق OSpec الخاصة بالـ change؛ لا تستنتج إحداهما من الأخرى
- متى أُنشئ change بلغة ما فاستمر بها ما لم تتطلب قواعد المشروع التحويل صراحةً

## optional steps

- يتم التحكم في تفعيل optional steps عبر `.skillrc.workflow`، ويجب أن تبقى proposal flags متوافقة معه
- يجب أن تظهر optional steps المفعلة في `tasks.md` و`verification.md`؛ وفي goal يجب أن تظهر أيضاً في `artifacts/agents/task-graph.json`

## بوابات الأرشفة

لا تؤرشف في الحالات التالية:

- الوثائق قديمة، أو الفهرس قديم، أو optional steps لم تنجح
- `verification.md` غير مكتملة، أو verification evidence فاشلة أو محجوبة أو stale
- توجد قرارات غير محسومة في review artifacts؛ أو قرار task-level أو final review هو `PENDING` أو `NEEDS_CHANGES` أو `BLOCKED`
- debug evidence المسجلة blocked، أو تؤكد root cause فقط من دون سجل fixed لاحق
- في goal يحتوي `artifacts/agents/task-graph.json` على حالات غير محسومة أو اعتماديات غير صالحة أو تفاصيل تنفيذ ناقصة، أو لا يكون `status` العلوي `completed`
- في goal يحتوي `artifacts/agents/worker-status.md` على حالات worker غير محسومة

تتطلب الأرشفة القسرية قبولاً صريحاً من المستخدم، ويفرض CLI أعلام التأكيد الخاصة به. والعقد الكامل مكتوب في الوثيقة التي يقرأها profile الخاص بك أصلاً: `for-ai/change-protocol.md` في classic change و`for-ai/execution-protocol.md` في goal.

## متطلبات التنفيذ

- اقرأ `.skillrc` أولاً، ثم افتح ملفات change والملفات المستهدفة والوثائق المفهرسة التي يطلبها brief أو dispatch packet الحالي فقط
- لا تقرأ `SKILL.index.json` كاملاً أبداً — فهو ينمو بلا حد مع كل أرشفة. استخدم `ospec docs locate --feature <slug>` أو `ospec docs locate --affects <path>` للانتقال مباشرة إلى القسم الذي يصف السلوك، واستخدم `ospec index query <keyword...>` عندما لا تملك سوى كلمة مفتاحية. يسرد `docs/project/feature-catalog.md` كل ميزة معلنة في سطر واحد؛ لا تفحص جميع archived changes
- يربط إدخال feature المكتملة كلا من دليل archive ووثائق المشروع الدائمة المعلنة في المهام. ويمكن أن تضيف frontmatter لوثيقة المشروع `features` و`modules` و`aliases` حتى يصل الإنسان وAI مباشرة من اسم الميزة أو الوحدة
- لا يكتمل تحديث الوثيقة المعلن إلا عندما يثبت دليل dispatch إلى complete تغيرا فعليا في المحتوى المطبّع؛ ووجود الملف وحده ليس دليلاً
- يُقدَّم كل classic change وgoal مؤرشف من إدخال الفهرس الخاص به مع دليل الأرشيف مباشرة: يعرض `ospec changes show <archive>` الملخص وaffects وقائمة الملفات وأوامر التحقق عند الطلب، ولا يُنشأ أي شيء تحت `docs/project/changes/`. وتعيد archive وfinalize بناء فهرس الميزات والفهرس المعرفي، ولا تحذفان ولا تكتبان فوق نصوص architecture أو module أو API التي يديرها البشر — الكتابة الوحيدة للمحرك في وثيقة يملكها البشر هي تعليق التتبع `ospec:last-change`
- يجب أن يطابق أي ادعاء بالاكتمال حالة الملفات الفعلية بدل تخطي البوابات بالسرد
