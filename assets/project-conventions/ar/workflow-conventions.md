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

## Workflow Profiles

- `workflow_profile_id: change` هو تدفق 1.0 السريع للتغييرات الصغيرة والروتينية: `proposal.md` و`tasks.md` والتنفيذ و`verification.md` و`review.md` و`state.json`
- `workflow_profile_id: goal` هو التدفق الكامل للعمل المعقد: يضيف `design.md` و`implementation-plan.md` و`artifacts/agents/task-graph.json` وdocument review وworker/reviewer handoff وfinal review وworker status وevidence gates
- استخدم `ospec new` / `ospec-change` للـ classic changes، واستخدم `ospec goal` / `ospec-goal` للـ goals

## صياغة تصميم Goal

- عند تنفيذ goal بمساعدة AI، أنشئ `design.md` أو حدّثه من المتطلب و`proposal.md` وسياق المشروع قبل تعديل `implementation-plan.md` أو `tasks.md` أو الكود
- في classic change لا تنشئ `design.md` أو `implementation-plan.md` أو task graph أو worker packets أو goal review artifacts ما لم يطلب المستخدم الترقية إلى goal صراحة
- `Announce-Before-Act`: لا تُشغّل سير العمل بصمت — أعلن OSpec skill والمرحلة، والأمر والـ artifact، وruntime adapter المختار، وعدد workers، والآلية الفعلية، وأي بوابة تحجب التقدم
- `Brainstorm-First`: ابدأ كل goal بجولة عصف ذهني قصيرة قبل تثبيت التصميم، واسأل المستخدم عن الاتجاه والبنية وAPI والبيانات وUI والمخاطر والنطاق واحداً تلو الآخر؛ وفضّل رفع decision gate دائمة على الافتراض الصامت، ولا تسجّل افتراضاً ذاتياً في `design.md` إلا عند تفويض المستخدم صراحةً مع وسمه كافتراض بحاجة لتأكيد
- يجب اشتقاق `implementation-plan.md` من `design.md` المعتمد، مع الملفات المستهدفة والنتائج المتوقعة وأوامر التحقق والاعتماديات والعمل القابل للتوازي والتعارضات
- يجب اشتقاق `artifacts/agents/task-graph.json` من `implementation-plan.md`؛ ويجب أن تتضمن كل مهمة id والحالة والاعتماديات وسلامة التوازي والتعارضات والملفات المستهدفة وأوامر التحقق والنتيجة المتوقعة ودور worker. تتطلب المهام المتسلسلة المولدة `serial_reason`، وسجل `maxParallelReason` لحد worker واحد الصريح. قسّم task التي تتجاوز ستة targets أو سجّل `scope_reason` واضحاً لحد ذري واحد
- allowlist الاختيارية حد إضافي؛ اشتق وافحص وطبق الصلاحيات الدقيقة من task graph باستخدام CAS وموافقة صريحة على التوسيع، وخيارات configure المتكررة تستبدل ولا تضيف
- يجب اشتقاق `tasks.md` من `artifacts/agents/task-graph.json`؛ وإذا كانت `tasks.md` موجودة بينما الوثائق السابقة ما زالت قوالب، فحدّث الوثائق السابقة أولاً ثم وائم المهام
- في classic change تُشتق `tasks.md` مباشرة من `proposal.md` ونطاق التنفيذ

## قيود الحالة

- استخدم `state.json` كمصدر الحقيقة لحالة التنفيذ
- لا يستبدل `verification.md` ملف `state.json`
- إذا اختلفت ملفات الحالة وملفات التنفيذ، أصلح الحالة أولاً
- في goal يسجل `artifacts/agents/task-graph.json` حالة المهام والاعتماديات وقيود التعارض والملفات المستهدفة وأوامر التحقق بصيغة قابلة للقراءة آلياً
- عند الدخول إلى مشروع موجود، استخدم `ospec session [path]` لكتابة `.ospec/session-brief.json` و`.ospec/session-brief.md`؛ يسجل active change وqueued change وqueue-run وcache fingerprint وسياق الأمر الآمن التالي فقط
- عند بدء أو استئناف active change واحد، استخدم `ospec execute bootstrap [changes/active/<change>]` لكتابة `bootstrap.json` و`bootstrap.md` مع project session brief snapshot، ثم اتبع الإجراء الآمن التالي المسجل فيه
- عند نقل change بين agents أو tools أو worktrees أو shells أو operators بشريين، استخدم `ospec execute handoff [changes/active/<change>] [--target codex|gpt|claude|gemini|opencode|cursor|copilot|shell|generic]` لكتابة `handoff.json` و`handoff.md`؛ يسجل هذا الأمر project session brief snapshot وtool mapping وقواعد السلامة فقط
- قبل اشتقاق task graph، شغّل `ospec execute preflight [changes/active/<change>] --stage design` ثم `--stage plan` لإنشاء deterministic inline preflight packets وapproval artifacts. اشتق أو حدّث task graph بعد نجاح المرحلتين فقط، ولا تشغّل أي مرحلة reviewer child. اجمع red test العادي وproduction implementation ودليل green/refactor في atomic task واحدة
- بعد اشتقاق task graph يجب أن يصدر Loop combined planning review مستقلة واحدة قبل workspace أو worker dispatch. يسمح بإصلاح تخطيط مجمّع واحد وfresh re-review واحدة فقط، ثم يتوقف بثبات عند تكرار الفشل
- قبل handoff إلى worker استخدم `ospec execute workspace [changes/active/<change>]` لتسجيل سلامة git workspace في `artifacts/agents/workspace-status.json` (`workspace-status.json`)؛ يسمح Goal قائم فقط بالمسارات التابعة لأهداف task غير `PENDING`، أو ملف `tsconfig.tsbuildinfo` الدقيق داخل حزمة task بدأ فعلا وصرح بأمر build/typecheck، أو لإثبات `ospec update` حالي متحقق من الهاش، وتظهر أي مسارات أخرى بالحالة `needs_isolation`
- Use `ospec execute route [changes/active/<change>]` to write `workflow-route.json` and `workflow-route.md` with the next recommended OSpec command; this records workflow routing artifacts only and does not edit source files
- عندما تحتاج direction أو architecture أو API أو UI أو risk أو scope إلى اختيار صريح من المستخدم، استخدم `ospec execute decision [changes/active/<change>] ...`؛ اعرض `artifacts/agents/decisions/index.md` أو `Chat Prompt` من decision report، ولا تتابع dispatch قبل اختيار أو تخطي required pending decisions
- قبل إنشاء git worktree معزول، استخدم `ospec execute worktree [changes/active/<change>] [--branch name] [--path path] [--base ref]` لكتابة `worktree-plan.json` و`worktree-plan.md`؛ هذا يسجل خطة فقط ولا يشغّل `git worktree add`
- قبل الإغلاق النهائي، استخدم `ospec execute finish [changes/active/<change>] [--target main] [--remote origin]` لكتابة `finish-plan.json` و`finish-plan.md`؛ هذا يسجل الجاهزية ونص الأوامر فقط ولا يشغّل finalize أو archive أو push أو merge أو حذف worktree. عندما تكون حالة finish plan هي ready ولا توجد required pending decision، شغّل `ospec finalize [changes/active/<change>]`؛ استخدم `ospec archive ... --check` كمعاينة dry-run اختيارية فقط ولا تتوقف بعد نجاحها
- عندما تحتاج إلى handoff artifact دائم على مستوى task، استخدم `ospec execute dispatch` لإنشاء batch آمن للتوازي من worker packets و`artifacts/agents/execution-session.json`؛ يتضمن كل packet project session brief snapshot وworker profile يوضح capability tier وrecommended target وtarget tool mapping وrationale وrequired behavior؛ واستخدم `--task` لمهمة واحدة صريحة و`--limit` لتحديد حجم dispatch batch، واستخدم `ospec execute complete` لتسجيل نتائج worker؛ وعندما يسجل `complete` النتيجة `NEEDS_CONTEXT` أو `BLOCKED` يتم إنشاء `artifacts/agents/blockers/`
- بعد dispatch، استخدم `ospec execute launch [changes/active/<change>] [--task task-id] [--target codex|gpt|claude|gemini|opencode|cursor|copilot] [--dry-run] [--json]` لكتابة `launch-plan.json` و`launch-plan.md`؛ لا يختار `runtimeAdapter.selected.nativeSubagent` إلا current session capability مطابقة للـ target وغير منتهية
- يتبع multi-worker execution القيمة `runtimeAdapter.selected.nativeSubagent`، ولا يعمل بالتوازي إلا عندما يدعم native adapter المختار ذلك. يجب block عند غياب capability أو انتهائها أو عدم مطابقة target، من دون fallback إلى Orca أو agent CLI أو current controller
- أزيلت `execute orchestrate` و`launch --run --command` و`review --run --command` و`loop watch`، وتفشل قبل إنشاء أي process أو run artifact. بعد إصلاح blocked أو needs-context أو failed work استخدم `ospec execute retry` لإعادة dispatch؛ المهام المكتملة تحتاج `--force`
- يزامن `ospec execute dispatch` و`complete` أيضا `artifacts/agents/worker-status.md`؛ وبعد تعديل task graph أو execution session أو review artifacts أو debug evidence أو verification checklist يدويا استخدم `ospec execute sync` لإعادة بناء حالة worker
- عندما تكون الـ Goal مملوكة لـ controller Loop، استخدم `ospec loop tick [changes/active/<change>]` بعد اكتمال كل worker task لإنشاء مراجعة موحدة مرتبطة ذرياً بـ executor provenance الحقيقي. استخدم `ospec execute review ... --task <task-id>` مباشرةً فقط في workflow بلا controller. يحفظ القرار داخل `artifacts/reviews/tasks/<task-id>/review.md` وتبقى المهام التابعة محجوبة حتى اعتماده
- بعد اعتماد task-level reviews واكتمال task graph، دع `ospec loop tick` التالي ينشئ final review في controller Loop. استخدم `ospec execute review` من دون `--task` فقط خارج controller Loop
- أرسل review packet إلى fresh model-native reviewer subagent؛ لا يشغّل OSpec local reviewer CLI. بعد اكتمال reviewer سجّل matching decision وevidence
- بعد أن يحتوي review artifact على قرار غير `PENDING`، استخدم `ospec execute feedback [changes/active/<change>] [--stage spec|quality]` لكتابة `artifacts/agents/review-feedback-plan.json` و`artifacts/agents/review-feedback-plan.md`؛ حدد accept أو revise أو clarify أو blocked قبل dispatch عمل إضافي، وأنشئ required user decision عندما يغير feedback scope أو direction أو API أو UI أو risk أو accepted tradeoffs
- عندما يكون debugging جزءا من change، استخدم `ospec execute debug [changes/active/<change>] --phase reproduce|isolate|hypothesize|fix|verify --symptom "..." --root-cause "..." --status FIXED` لتسجيل root-cause وfix evidence داخل `artifacts/agents/debug-evidence.json`
- بعد تشغيل focused tests، استخدم `ospec execute tdd [changes/active/<change>] --phase red|green|refactor --command "..." --status ...` لتسجيل TDD cycle evidence داخل `artifacts/agents/tdd-evidence.json`
- بعد تشغيل project checks حديثة، استخدم `ospec execute verify [changes/active/<change>] --command "..." --status PASSED --exit-code 0` لتسجيل verification evidence داخل `artifacts/agents/verification-evidence.json`
- `ospec session` و`ospec execute bootstrap` و`handoff` و`preflight` و`workspace` وplan-mode `worktree` و`finish` و`dispatch` و`launch` و`collect` و`retry` و`complete` و`review` و`debug` و`tdd` و`verify` و`sync` تحدّث OSpec artifacts فقط؛ وباستثناء قراءة `workspace` و`worktree` و`finish` لحالة git، لا تحرر ملفات source في المشروع مباشرة. يوزّع controller الـ workers فقط عبر model-native subagent adapter المختار
- في goal لا تؤرشف عندما يحتوي task graph على حالات غير محسومة أو اعتماديات غير صالحة أو تفاصيل تنفيذ ناقصة أو عندما لا يكون `status` العلوي `completed`
- في goal يسجل `artifacts/agents/worker-status.md` حالات implementer وspec reviewer وquality reviewer وcontroller
- يجب أن تنجح المراجعة الموحدة الواحدة لكل task (`artifacts/reviews/tasks/<task-id>/review.md`)، ويجب أن ينجح `artifacts/reviews/final-review.md` النهائية الموحدة
- قرارات task-level أو final review مثل `PENDING` أو `NEEDS_CHANGES` أو `BLOCKED` تمنع الأرشفة
- تمنع debug evidence المسجلة الأرشفة إذا كانت blocked أو تؤكد root cause فقط من دون سجل fixed لاحق
- إذا كانت verification evidence فاشلة أو محجوبة أو stale فلا تؤرشف
- لا تعتبر change مكتملة ما دامت أي حالة worker هي `PENDING` أو `NEEDS_CONTEXT` أو `BLOCKED`؛ ويجب أن تكون `controller_status` هي `DONE` قبل الأرشفة

## لغة الوثائق

- حافظ على `proposal.md` و`design.md` و`implementation-plan.md` و`artifacts/agents/task-graph.json` و`artifacts/agents/bootstrap.md` و`artifacts/agents/handoff.md` و`artifacts/agents/planning-preflights/` و`artifacts/agents/launch-plan.md` و`artifacts/agents/worker-runs/` و`artifacts/agents/review-runs/` و`artifacts/agents/retries/` و`artifacts/agents/review-feedback-plan.md` و`tasks.md` و`artifacts/reviews/design-review.md` و`artifacts/reviews/implementation-plan-review.md` و`artifacts/reviews/final-review.md` و`artifacts/agents/worker-status.md` و`artifacts/agents/debug-evidence.json` و`verification.md` و`review.md` باللغة المعتمدة للمشروع
- قد تختلف لغة واجهة المنتج عن لغة وثائق OSpec الخاصة بالchange؛ لا تستنتج إحداهما من الأخرى
- إذا أُنشىء change بالصينية، فاستمر بالصينية ما لم تتطلب قواعد المشروع التحويل إلى الإنجليزية صراحةً

## توجيه السياق

- يجب على أي AI أو شخص يتابع change قراءة `.skillrc` و`SKILL.index.json` أولاً، ثم فتح ملفات change والملفات المستهدفة والوثائق المفهرسة التي يطلبها brief أو dispatch packet الحالي فقط
- استخدم `docs/project/feature-index.md` و`SKILL.index.json.archived_changes` لتحديد السلوك المكتمل بدلاً من فحص جميع archived changes
- يربط إدخال feature المكتملة كلا من دليل archive ووثائق المشروع الدائمة المعلنة في المهام. يمكن أن تضيف frontmatter لوثيقة المشروع `features` و`modules` و`aliases` حتى يصل الإنسان وAI مباشرة من اسم الميزة أو الوحدة.
- لا يكتمل تحديث الوثيقة المعلن إلا عندما يثبت دليل dispatch إلى complete تغيرا فعليا في المحتوى المطبّع؛ وجود الملف وحده ليس دليلا على تحديثه.
- يملك كل classic change وgoal مؤرشف وثيقة واحدة ينشئها OSpec ويفهرسها تحت `docs/project/changes/<archive-path>.md`. يمكن إعادة بناء أو تنظيف سجلات change التي أنشأها OSpec عند اختفاء archive، ولا يحذف التنظيف الملفات التي يملكها البشر ولا يكتب archive فوق وثيقة بشرية في المسار نفسه.
- تحدّث archive وfinalize دليل الميزات والفهرس المعرفي المولدين، ولا تستبدلان نصوص architecture أو module أو API التي يديرها البشر

## optional steps

- يتم التحكم في تفعيل optional steps عبر `.skillrc.workflow`
- يجب أن تبقى proposal flags متوافقة مع إعدادات workflow
- يجب أن تظهر optional steps المفعلة في `tasks.md` و`verification.md`؛ وفي goal يجب أن تظهر أيضاً في `artifacts/agents/task-graph.json`

## Plugin Gates

- يتم التحكم في قدرات الإضافات عبر `.skillrc.plugins`
- عند التعامل مع تثبيت Stitch أو Checkpoint أو تبديل provider أو إصلاح doctor أو إعداد MCP أو المصادقة أو تفعيل الإضافة، يجب قراءة مواصفة الإضافة المحلية المطابقة للغة الوثائق المعتمدة للمشروع أولاً
- لا يتم الرجوع إلى ملف مواصفة بلغة أخرى إلا إذا كان الملف المحلي لتلك اللغة غير موجود
- في التغييرات التي تفعل Checkpoint، اضبط route/flow assertions وتوقعات accessibility و visual baselines و screenshots/traces و console/network evidence لأسطح التشغيل المتغيرة قبل اعتبار البوابة الآلية جاهزة للمراجعة
- جاهزية Checkpoint gate تتطلب أن يحتوي `artifacts/checkpoint/gate.json` على `status: passed` و `evidence.status: complete` وأن تكون evidence لكل active checkpoint step كاملة؛ إذا أعاد runner نتيجة passing لكن screenshots أو traces أو visual diff evidence أو route/flow coverage أو assertions ناقصة، فالتغيير ليس archive-ready
