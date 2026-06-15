---
name: project-workflow-conventions
title: اتفاقيات تنفيذ workflow
tags: [conventions, workflow, change, ospec]
---

# اتفاقيات تنفيذ workflow

## الهدف

تثبت هذه الوثيقة مسار تنفيذ OSpec داخل المشروع حتى تنتقل المتطلبات عبر planning وimplementation وverification وarchive مع بوابات متسقة.

## الترتيب القياسي

1. توضيح سياق المشروع ونطاق التأثير
2. إنشاء `proposal.md` أو تحديثه
3. إنشاء `design.md` أو تحديثه
4. إنشاء `implementation-plan.md` أو تحديثه
5. إنشاء `artifacts/agents/task-graph.json` أو تحديثه
6. إنشاء `tasks.md` أو تحديثه
7. دفع التنفيذ وفق `state.json`
8. إكمال task-level spec review وquality review لكل worker task منتهية
9. توزيع وإكمال final `artifacts/reviews/spec-compliance.md` و`artifacts/reviews/code-quality.md`
10. تحديث `artifacts/agents/worker-status.md`
11. تحديث `SKILL.md` ذي الصلة
12. إعادة بناء `SKILL.index.json`
13. إكمال `verification.md`
14. الأرشفة فقط بعد اجتياز جميع البوابات

## صياغة التصميم

- عند تنفيذ change بمساعدة AI، أنشئ `design.md` أو حدّثه من المتطلب و`proposal.md` وسياق المشروع قبل تعديل `implementation-plan.md` أو `tasks.md` أو الكود
- لا تطرح إلا سؤال تصميم موجزاً واحداً عندما يغيّر القرار الناقص البنية أو API أو البيانات أو UI أو المخاطر فعلياً؛ وإلا فسجل الافتراضات في `design.md`
- يجب اشتقاق `implementation-plan.md` من `design.md` المعتمد، مع الملفات المستهدفة والنتائج المتوقعة وأوامر التحقق والاعتماديات والعمل القابل للتوازي والتعارضات
- يجب اشتقاق `artifacts/agents/task-graph.json` من `implementation-plan.md`؛ ويجب أن تتضمن كل مهمة id والحالة والاعتماديات وسلامة التوازي والتعارضات والملفات المستهدفة وأوامر التحقق والنتيجة المتوقعة ودور worker
- يجب اشتقاق `tasks.md` من `artifacts/agents/task-graph.json`؛ وإذا كانت `tasks.md` موجودة بينما الوثائق السابقة ما زالت قوالب، فحدّث الوثائق السابقة أولاً ثم وائم المهام

## قيود الحالة

- استخدم `state.json` كمصدر الحقيقة لحالة التنفيذ
- لا يستبدل `verification.md` ملف `state.json`
- إذا اختلفت ملفات الحالة وملفات التنفيذ، أصلح الحالة أولاً
- يسجل `artifacts/agents/task-graph.json` حالة المهام والاعتماديات وقيود التعارض والملفات المستهدفة وأوامر التحقق بصيغة قابلة للقراءة آلياً
- عند الدخول إلى مشروع موجود، استخدم `ospec session [path]` لكتابة `.ospec/session-brief.json` و`.ospec/session-brief.md`؛ يسجل active change وqueued change وqueue-run وcache fingerprint وسياق الأمر الآمن التالي فقط
- عند بدء أو استئناف active change واحد، استخدم `ospec execute bootstrap [changes/active/<change>]` لكتابة `bootstrap.json` و`bootstrap.md` مع project session brief snapshot، ثم اتبع الإجراء الآمن التالي المسجل فيه
- عند نقل change بين agents أو tools أو worktrees أو shells أو operators بشريين، استخدم `ospec execute handoff [changes/active/<change>] [--target codex|gpt|claude|gemini|opencode|cursor|copilot|shell|generic]` لكتابة `handoff.json` و`handoff.md`؛ يسجل هذا الأمر project session brief snapshot وtool mapping وقواعد السلامة فقط
- قبل اشتقاق implementation tasks أو dispatch لها، استخدم `ospec execute doc-review [changes/active/<change>] [--stage design|plan]` لإنشاء packets تتضمن project session brief snapshot داخل `artifacts/agents/document-review-dispatches/` وتجهيز `artifacts/reviews/design-review.md` أو `artifacts/reviews/implementation-plan-review.md`؛ يجب اعتماد design review قبل dispatch لمراجعة implementation plan
- قبل handoff إلى worker استخدم `ospec execute workspace [changes/active/<change>]` لتسجيل سلامة git workspace؛ أوقف parallel dispatch عندما يعرض `workspace-status.json` الحالة `needs_isolation`
- Use `ospec execute route [changes/active/<change>]` to write `workflow-route.json` and `workflow-route.md` with the next recommended OSpec command; this records workflow routing artifacts only and does not edit source files
- عندما تحتاج direction أو architecture أو API أو UI أو risk أو scope إلى اختيار صريح من المستخدم، استخدم `ospec execute decision [changes/active/<change>] ...`؛ اعرض `artifacts/agents/decisions/index.md` أو `Chat Prompt` من decision report، ولا تتابع dispatch قبل اختيار أو تخطي required pending decisions
- قبل إنشاء git worktree معزول، استخدم `ospec execute worktree [changes/active/<change>] [--branch name] [--path path] [--base ref]` لكتابة `worktree-plan.json` و`worktree-plan.md`؛ هذا يسجل خطة فقط ولا يشغّل `git worktree add`
- قبل الإغلاق النهائي، استخدم `ospec execute finish [changes/active/<change>] [--target main] [--remote origin]` لكتابة `finish-plan.json` و`finish-plan.md`؛ هذا يسجل الجاهزية ونص الأوامر فقط ولا يشغّل finalize أو archive أو push أو merge أو حذف worktree. عندما تكون حالة finish plan هي ready ولا توجد required pending decision، شغّل `ospec finalize [changes/active/<change>]`؛ استخدم `ospec archive ... --check` كمعاينة dry-run اختيارية فقط ولا تتوقف بعد نجاحها
- عندما تحتاج إلى handoff artifact دائم على مستوى task، استخدم `ospec execute dispatch` لإنشاء batch آمن للتوازي من worker packets و`artifacts/agents/execution-session.json`؛ يتضمن كل packet project session brief snapshot وworker profile يوضح capability tier وrecommended target وtarget tool mapping وrationale وrequired behavior؛ واستخدم `--task` لمهمة واحدة صريحة و`--limit` لتحديد حجم dispatch batch، واستخدم `ospec execute complete` لتسجيل نتائج worker؛ وعندما يسجل `complete` النتيجة `NEEDS_CONTEXT` أو `BLOCKED` يتم إنشاء `artifacts/agents/blockers/`
- بعد dispatch، استخدم `ospec execute launch [changes/active/<change>] [--task task-id] [--target codex|gpt|claude|gemini|opencode|cursor|copilot|shell|generic] [--dry-run] [--json]` لكتابة `launch-plan.json` و`launch-plan.md`؛ هذا هو native agent launch artifact للـ current harness ويتضمن إرشادات Codex/GPT `spawn_agent` وClaude Code Task وGemini `@generalist` وOpenCode `@mention` وCursor Agent/task chat وCopilot CLI/coding-agent task. استخدم `--json` عندما يحتاج adapter إلى machine-readable launch artifact على stdout
- مسار multi-worker الافتراضي هو native subagents في current harness: أنشئ safe packets، وافحص `launch-plan.md`، ثم شغّل native agent واحدا لكل packet آمن، وسجل كل نتيجة عبر `ospec execute complete`
- استخدم `ospec execute orchestrate [changes/active/<change>] --command "..." [--limit N] [--max-rounds N] [--timeout-ms N]` فقط كآخر CLI fallback عندما لا تتوفر native subagents؛ يرندر fallback explicit command template ويشغّل worker commands بالتوازي، يجمع النتائج إلى task graph، ويعرض failed-worker retry commands
- استخدم `--run --command` مع `ospec execute launch ... --run --command "..."` فقط كـ single-worker CLI fallback عندما لا تتوفر native subagents أو يتم تجاوزها صراحة. بعدها استخدم `ospec execute collect [changes/active/<change>] [--task task-id] [--run run-id]` لتسجيل fallback task result. بعد إصلاح blocked أو needs-context أو failed work استخدم `ospec execute retry` لكتابة `artifacts/agents/retries/` وإعادة dispatch؛ المهام المكتملة تحتاج `--force`
- يزامن `ospec execute dispatch` و`complete` أيضا `artifacts/agents/worker-status.md`؛ وبعد تعديل task graph أو execution session أو review artifacts أو debug evidence أو verification checklist يدويا استخدم `ospec execute sync` لإعادة بناء حالة worker
- بعد اكتمال كل worker task، استخدم `ospec execute review [changes/active/<change>] --task <task-id> --stage spec` ثم `--stage quality` لإنشاء task-level reviewer handoff packets. تحفظ قرارات task-level review داخل `artifacts/reviews/tasks/<task-id>/` وتبقى المهام التابعة محجوبة حتى اعتماد المراجعتين
- بعد اعتماد كل task-level reviews واكتمال task graph، استخدم `ospec execute review [changes/active/<change>] [--stage spec|quality]` من دون `--task` لإنشاء final whole-change reviewer handoff packets تتضمن project session brief snapshot داخل `artifacts/agents/review-dispatches/`؛ لا توزّع final quality review قبل اعتماد final spec review
- لا يشغّل OSpec local reviewer command إلا عند استخدام `ospec execute review ... --run --command "..."` صراحة؛ يسجل ذلك `artifacts/agents/review-runs/` ويمكنه تحديث review artifact عند تمرير `--decision`
- بعد أن يحتوي review artifact على قرار غير `PENDING`، استخدم `ospec execute feedback [changes/active/<change>] [--stage spec|quality]` لكتابة `artifacts/agents/review-feedback-plan.json` و`artifacts/agents/review-feedback-plan.md`؛ حدد accept أو revise أو clarify أو blocked قبل dispatch عمل إضافي، وأنشئ required user decision عندما يغير feedback scope أو direction أو API أو UI أو risk أو accepted tradeoffs
- عندما يكون debugging جزءا من change، استخدم `ospec execute debug [changes/active/<change>] --phase reproduce|isolate|hypothesize|fix|verify --symptom "..." --root-cause "..." --status FIXED` لتسجيل root-cause وfix evidence داخل `artifacts/agents/debug-evidence.json`
- بعد تشغيل focused tests، استخدم `ospec execute tdd [changes/active/<change>] --phase red|green|refactor --command "..." --status ...` لتسجيل TDD cycle evidence داخل `artifacts/agents/tdd-evidence.json`
- بعد تشغيل project checks حديثة، استخدم `ospec execute verify [changes/active/<change>] --command "..." --status PASSED` لتسجيل verification evidence داخل `artifacts/agents/verification-evidence.json`
- `ospec session` و`ospec execute bootstrap` و`handoff` و`doc-review` و`workspace` وplan-mode `worktree` و`finish` و`dispatch` و`launch` و`collect` و`retry` و`complete` و`review` و`debug` و`tdd` و`verify` و`sync` تحدّث OSpec artifacts فقط؛ وباستثناء قراءة `workspace` و`worktree` و`finish` لحالة git، لا تحرر ملفات source في المشروع مباشرة. يتم تشغيل native subagents بواسطة current AI harness؛ ولا تعمل أوامر shell إلا مع explicit `worktree --create` أو `worktree --cleanup` أو fallback `launch --run --command` أو `review --run --command` أو fallback `orchestrate`
- لا تؤرشف عندما يحتوي task graph على حالات غير محسومة أو اعتماديات غير صالحة أو تفاصيل تنفيذ ناقصة أو عندما لا يكون `status` العلوي `completed`
- يسجل `artifacts/agents/worker-status.md` حالات implementer وspec reviewer وquality reviewer وcontroller
- يجب أن ينجح task-level spec review لكل task قبل quality review الخاصة بها، ويجب أن ينجح final `artifacts/reviews/spec-compliance.md` قبل final `artifacts/reviews/code-quality.md`
- قرارات task-level أو final review مثل `PENDING` أو `NEEDS_CHANGES` أو `BLOCKED` تمنع الأرشفة
- تمنع debug evidence المسجلة الأرشفة إذا كانت blocked أو تؤكد root cause فقط من دون سجل fixed لاحق
- إذا كانت verification evidence فاشلة أو محجوبة أو stale فلا تؤرشف
- لا تعتبر change مكتملة ما دامت أي حالة worker هي `PENDING` أو `NEEDS_CONTEXT` أو `BLOCKED`؛ ويجب أن تكون `controller_status` هي `DONE` قبل الأرشفة

## لغة الوثائق

- حافظ على `proposal.md` و`design.md` و`implementation-plan.md` و`artifacts/agents/task-graph.json` و`artifacts/agents/bootstrap.md` و`artifacts/agents/handoff.md` و`artifacts/agents/document-review-dispatches/` و`artifacts/agents/launch-plan.md` و`artifacts/agents/worker-runs/` و`artifacts/agents/review-runs/` و`artifacts/agents/retries/` و`artifacts/agents/review-feedback-plan.md` و`tasks.md` و`artifacts/reviews/design-review.md` و`artifacts/reviews/implementation-plan-review.md` و`artifacts/reviews/spec-compliance.md` و`artifacts/reviews/code-quality.md` و`artifacts/agents/worker-status.md` و`artifacts/agents/debug-evidence.json` و`verification.md` و`review.md` باللغة المعتمدة للمشروع
- قد تختلف لغة واجهة المنتج عن لغة وثائق OSpec الخاصة بالchange؛ لا تستنتج إحداهما من الأخرى
- إذا أُنشىء change بالصينية، فاستمر بالصينية ما لم تتطلب قواعد المشروع التحويل إلى الإنجليزية صراحةً

## optional steps

- يتم التحكم في تفعيل optional steps عبر `.skillrc.workflow`
- يجب أن تبقى proposal flags متوافقة مع إعدادات workflow
- يجب أن تظهر optional steps المفعلة في `artifacts/agents/task-graph.json` و`tasks.md` و`verification.md`

## Plugin Gates

- يتم التحكم في قدرات الإضافات عبر `.skillrc.plugins`
- عند التعامل مع تثبيت Stitch أو Checkpoint أو تبديل provider أو إصلاح doctor أو إعداد MCP أو المصادقة أو تفعيل الإضافة، يجب قراءة مواصفة الإضافة المحلية المطابقة للغة الوثائق المعتمدة للمشروع أولاً
- لا يتم الرجوع إلى ملف مواصفة بلغة أخرى إلا إذا كان الملف المحلي لتلك اللغة غير موجود
- في التغييرات التي تفعل Checkpoint، اضبط route/flow assertions وتوقعات accessibility و visual baselines و screenshots/traces و console/network evidence لأسطح التشغيل المتغيرة قبل اعتبار البوابة الآلية جاهزة للمراجعة
- جاهزية Checkpoint gate تتطلب أن يحتوي `artifacts/checkpoint/gate.json` على `status: passed` و `evidence.status: complete` وأن تكون evidence لكل active checkpoint step كاملة؛ إذا أعاد runner نتيجة passing لكن screenshots أو traces أو visual diff evidence أو route/flow coverage أو assertions ناقصة، فالتغيير ليس archive-ready
