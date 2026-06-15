# الاستخدام

إذا كنت تستخدم OSpec أساسا عبر AI فابدأ أولا ببرومبت قصير مثل `/ospec` أو `/ospec-change`، واستخدم أوامر CLI في هذه الصفحة عندما تحتاج إلى مسار بديل أو إلى تنفيذ صريح.

## الأوامر الشائعة

```bash
ospec status [path]
ospec session [path]
ospec session hook [path]
ospec init [path]
ospec docs status [path]
ospec docs generate [path]
ospec changes status [path]
ospec brainstorm [path] --topic "..." [--change name] [--output id] [--visual]
ospec plan [path] [--change changes/active/<change>] [--from-brainstorm file] [--output id] [--apply]
ospec new <change-name> [path]
ospec progress [changes/active/<change>]
ospec run status [path]
ospec execute bootstrap [changes/active/<change>]
ospec execute handoff [changes/active/<change>] [--target codex|gpt|claude|gemini|opencode|cursor|copilot|shell|generic]
ospec execute doc-review [changes/active/<change>] [--stage design|plan]
ospec execute status [changes/active/<change>]
ospec execute next [changes/active/<change>]
ospec execute route [changes/active/<change>]
ospec execute workspace [changes/active/<change>]
ospec execute worktree [changes/active/<change>] [--branch name] [--path path] [--base ref]
ospec execute worktree [changes/active/<change>] --create [--branch name] [--path path] [--base ref]
ospec execute worktree [changes/active/<change>] --cleanup [--path path]
ospec execute finish [changes/active/<change>] [--target main] [--remote origin]
ospec execute dispatch [changes/active/<change>] [--task task-id] [--limit N]
ospec execute launch [changes/active/<change>] [--task task-id] [--target codex|gpt|claude|gemini|opencode|cursor|copilot|shell|generic] [--dry-run]
ospec execute orchestrate [changes/active/<change>] --command "..." [--target codex|gpt|claude|gemini|opencode|cursor|copilot|shell|generic] [--limit N] [--max-rounds N] [--timeout-ms N] # fallback only
ospec execute launch [changes/active/<change>] [--task task-id] [--target codex|gpt|claude|gemini|opencode|cursor|copilot|shell|generic] --run --command "..." [--timeout-ms N] # fallback only
ospec execute collect [changes/active/<change>] [--task task-id] [--run run-id] [--status DONE|DONE_WITH_CONCERNS|NEEDS_CONTEXT|BLOCKED] [--summary "..."]
ospec execute complete <task-id> [changes/active/<change>] --status DONE --summary "..."
ospec execute review [changes/active/<change>] [--task task-id] [--stage spec|quality]
ospec execute review [changes/active/<change>] [--task task-id] [--stage spec|quality] --run --command "..." [--timeout-ms N] [--decision APPROVED|APPROVED_WITH_CONCERNS|NEEDS_CHANGES|BLOCKED|PENDING] [--summary "..."]
ospec execute feedback [changes/active/<change>] [--stage spec|quality] [--summary "..."]
ospec execute decision [changes/active/<change>] --id <id> --question "..." --option id:label:impact --option id:label:impact [--recommended id] [--required|--optional]
ospec execute decision [changes/active/<change>] --id <id> --select <option-id> [--summary "..."]
ospec execute debug [changes/active/<change>] --phase reproduce|isolate|hypothesize|fix|verify --symptom "..." --root-cause "..." --status FIXED --command "npm test -- focused" --summary "..."
ospec execute tdd [changes/active/<change>] --phase red|green|refactor --command "npm test -- focused" --status PASSED --exit-code 0 --summary "..."
ospec execute verify [changes/active/<change>] --command "npm test" --status PASSED --exit-code 0 --summary "..."
ospec execute sync [changes/active/<change>]
ospec verify [changes/active/<change>]
ospec archive [changes/active/<change>]
ospec finalize [changes/active/<change>]
ospec skill status
ospec skill install
ospec skill status-claude
ospec skill install-claude
ospec update [path]
ospec plugins list
ospec plugins install <plugin>
ospec plugins installed
ospec plugins update <plugin>
ospec plugins update --all
ospec plugins status [path]
ospec plugins enable stitch [path]
ospec plugins enable checkpoint [path] --base-url <url>
```

## البدء السريع مع الإضافات

البرومبت الموصى به:

```text
/ospec افتح إضافة Stitch لهذا المشروع.
/ospec افتح إضافة Checkpoint لهذا المشروع.
```

AI / `/ospec`:

- طلب "افتح Stitch" يعني: افحص أولا هل Stitch مثبت عالميا، وإن لم يكن مثبتا فثبته، ثم فعله داخل المشروع الحالي
- طلب "افتح Checkpoint" يعني: افحص أولا هل Checkpoint مثبت عالميا، وإن لم يكن مثبتا فثبته، ثم فعله داخل المشروع الحالي
- بعد التفعيل ستتم مزامنة وثائق الإضافة التفصيلية إلى `.ospec/plugins/<plugin>/docs/`
- قبل التثبيت افحص `ospec plugins info <plugin>` أو `ospec plugins installed`
- إذا كانت الإضافة مثبتة عالميا بالفعل، فتجاوز التثبيت واكتف بتفعيلها داخل المشروع الحالي
- لا تشغل `ospec plugins update --all` إلا إذا طلب المستخدم صراحة تحديث كل الإضافات المثبتة

سطر الأوامر:

```bash
ospec plugins list
ospec plugins info stitch
ospec plugins install stitch
ospec plugins enable stitch [path]
```

```bash
ospec plugins list
ospec plugins info checkpoint
ospec plugins install checkpoint
ospec plugins enable checkpoint [path] --base-url <url>
```

## المسار الموصى به

البرومبتات الموصى بها:

```text
/ospec هيّئ هذا المشروع.
/ospec-change أنشئ تغييرا لهذا المتطلب وادفعه إلى الأمام.
/ospec أرشف هذا التغيير المقبول.
```

لدليل جديد:

```bash
ospec init [path]
ospec new <change-name> [path]
ospec verify [changes/active/<change>]
ospec finalize [changes/active/<change>]
```

## وثيقة تصميم Change

ينشئ `ospec new <change-name> [path]` ملفات `design.md` و`implementation-plan.md` و`artifacts/agents/task-graph.json` و`artifacts/reviews/spec-compliance.md` و`artifacts/reviews/code-quality.md` و`artifacts/agents/worker-status.md` حول مسار `proposal.md` / `tasks.md` المعتاد.

- يمكن أن تفعّل workflow flags خطوات quality policy المدمجة للـ agent: `tdd_cycle` و`root_cause_debug` و`verification_evidence`. تكتب الخطوات المفعّلة في frontmatter الخاص بالـ change ضمن `optional_steps` ويجب تغطيتها في `tasks.md` و`verification.md` وarchive readiness.
- استخدم `proposal.md` لتسجيل سبب التغيير والنطاق ومعايير القبول.
- عند الدخول إلى مشروع OSpec موجود، استخدم `ospec session [path]` لكتابة `.ospec/session-brief.json` و`.ospec/session-brief.md` مع active change وqueue وcache fingerprint والأمر الآمن التالي. هذا project entry brief ولا يستبدل `ospec execute bootstrap` للـ active change.
- استخدم `ospec session hook [path]` لكتابة `.ospec/hooks/session-start.json` و`.ospec/hooks/session-start.md` لتكامل harness session-start الاختياري. هذا hook يحدّث session brief فقط ولا يشغّل workers ولا tests ولا يفحص git ولا يؤرشف ولا يحرر source files.
- استخدم `ospec brainstorm [path] --topic "..."` فقط عندما تريد artifact لاستكشاف ما قبل إنشاء change داخل `.ospec/brainstorms/`. يضيف `--visual` ملف HTML محلياً وثابتاً، ولا ينشئ هذا command أي change.
- استخدم `ospec plan [path] --change changes/active/<change>` لإنشاء plan draft داخل `.ospec/plans/<id>/plan-draft.md`. مرّر `--apply` فقط عندما تريد تحديث `implementation-plan.md` لذلك change.
- استخدم `design.md` قبل التنفيذ لتسجيل النهج المختار والمفاضلات الرئيسية والحدود المتأثرة والمخاطر والأسئلة المفتوحة.
- استخدم `implementation-plan.md` لتحويل التصميم إلى خطوات قابلة للتنفيذ بواسطة agent مع الملفات والنتائج المتوقعة وأوامر التحقق والاعتماديات والتعارضات.
- استخدم `artifacts/agents/task-graph.json` لحفظ مخطط التنفيذ بصيغة قابلة للقراءة آلياً: معرفات المهام والاعتماديات وسلامة التوازي والتعارضات والملفات المستهدفة وأوامر التحقق والنتيجة المتوقعة ودور worker وحالة المهمة.
- عند استخدام explicit queue runner، استخدم `ospec run status [path]` لعرض queue run الحالي مع active change task graph snapshot، بما في ذلك أعداد completed وrunning وdispatchable وblocked وinvalid والخطوة التالية.
- تستخدم تعليمات الخطوة التالية في `ospec run start` و`run resume` و`run step` و`run status` active task graph عند توفره. عند وجود dispatchable work ستقترح `ospec execute dispatch ...`، لكن runner لا يوزع workers ولا يحرر ملفات source.
- عند بدء أو استئناف active change واحد، استخدم `ospec execute bootstrap [changes/active/<change>]` لكتابة `artifacts/agents/bootstrap.json` و`artifacts/agents/bootstrap.md` مع project session brief snapshot، ثم اتبع الإجراء الآمن التالي الذي يعرضه. عند وجود active dispatch، يوصي bootstrap بأمر `ospec execute launch ... --task ...` المطابق.
- عند نقل change بين agents أو tools أو worktrees أو shells أو operators بشريين، استخدم `ospec execute handoff [changes/active/<change>] [--target codex|gpt|claude|gemini|opencode|cursor|copilot|shell|generic]` لكتابة `artifacts/agents/handoff.json` و`artifacts/agents/handoff.md`. يسجل project session brief snapshot وtarget tool mapping وcommand sequence وقواعد السلامة وتحذيرات missing context.
- قبل implementation dispatch، استخدم `ospec execute doc-review [changes/active/<change>] [--stage design|plan]` لإنشاء packets تتضمن project session brief snapshot داخل `artifacts/agents/document-review-dispatches/*` و`artifacts/reviews/design-review.md` أو `artifacts/reviews/implementation-plan-review.md`. يجب اعتماد design review قبل dispatch لـ plan review.
- استخدم `ospec execute status [changes/active/<change>]` أو `ospec execute next [changes/active/<change>]` لفحص حالة controller والمهام التالية الآمنة للتوزيع. عندما تريد حفظ أمر OSpec التالي الموصى به للتسليم، استخدم `ospec execute route [changes/active/<change>]` لكتابة `artifacts/agents/workflow-route.json` و`workflow-route.md`.
- عندما يحتاج direction أو architecture أو API أو UI أو risk أو scope إلى user choice صريح، استخدم `ospec execute decision [changes/active/<change>] ...`. تظهر required pending decision في `bootstrap` و`status` و`finish`، وتمنع worker dispatch حتى تسجل `--select <option-id>` أو `--skip` مقصودا.
- قبل handoff إلى worker استخدم `ospec execute workspace [changes/active/<change>]` لتسجيل `artifacts/agents/workspace-status.json` و`artifacts/agents/workspace-status.md`. إذا كانت الحالة `needs_isolation`، نظّف workspace أو انقل العمل إلى git worktree معزول قبل parallel dispatch.
- قبل إنشاء git worktree معزول، استخدم `ospec execute worktree [changes/active/<change>] [--branch name] [--path path] [--base ref]` لتسجيل `artifacts/agents/worktree-plan.json` و`artifacts/agents/worktree-plan.md`. يسجل plan mode branch وpath وbase ref ونص الأوامر المقترحة فقط ولا يشغّل git.
- استخدم `ospec execute worktree [changes/active/<change>] --create ...` فقط عندما تريد صراحة أن يشغّل OSpec `git worktree add`. تسجل النتيجة تحت `artifacts/agents/worktree-runs/`.
- استخدم `ospec execute worktree [changes/active/<change>] --cleanup [--path path]` فقط عندما تريد صراحة أن يشغّل OSpec `git worktree remove`. لا يحذف cleanup الفروع ولا يعمل push أو merge أو archive أو tests.
- قبل الإغلاق النهائي، استخدم `ospec execute finish [changes/active/<change>] [--target main] [--remote origin]` لتسجيل `artifacts/agents/finish-plan.json` و`artifacts/agents/finish-plan.md`. يفحص task graph وreviews وverification evidence وworker status ونظافة git، ثم يسجل الأوامر المقترحة فقط ولا ينفذها.
- استخدم `ospec execute dispatch [changes/active/<change>] [--task task-id] [--limit N]` لإنشاء batch آمن للتوازي من worker packets داخل `artifacts/agents/dispatches/*` و`artifacts/agents/execution-session.json`. يتضمن كل packet project session brief snapshot وworker profile يوضح capability tier وrecommended target وtarget tool mapping وrationale وrequired behavior لتوجيه المهام المعقدة إلى worker أقوى والمهام البسيطة إلى worker أخف. ثم استخدم `ospec execute complete <task-id> ...` لتسجيل نتيجة worker. استخدم `--task` لمهمة واحدة صريحة و`--limit` لتحديد حجم batch. يقوم الأمران أيضا بمزامنة `artifacts/agents/worker-status.md`؛ وعندما تسجل completion الحالة `NEEDS_CONTEXT` أو `BLOCKED` يكتب OSpec ملفات escalation تحت `artifacts/agents/blockers/` لمتابعة controller.
- بعد dispatch، استخدم `ospec execute launch [changes/active/<change>] [--task task-id] [--target codex|gpt|claude|gemini|opencode|cursor|copilot|shell|generic] [--dry-run]` لكتابة native agent launch plan. يوجه controlling AI إلى آلية agent الأصلية في harness الحالي: Codex/GPT يستخدم `spawn_agent`/`wait_agent`/`close_agent`، وClaude Code يستخدم Task، وGemini يستخدم `@generalist`، وOpenCode يستخدم `@mention`، وCursor يستخدم Agent/task chat، وCopilot يستخدم CLI/coding-agent task. هذا الأمر لا يشغّل workers ولا أوامر shell بنفسه.
- default multi-worker execution هو current-harness native subagents: أنشئ safe packets عبر `ospec execute dispatch`، اقرأ `launch-plan.md`، ثم dispatch native worker agent لكل packet آمن، وسجل النتيجة عبر `ospec execute complete`.
- استخدم `ospec execute orchestrate [changes/active/<change>] --command "..."` فقط كـ final CLI fallback عندما لا يدعم harness الحالي native subagents. يرندر fallback explicit command template ويشغّل worker commands بالتوازي ويسجل `artifacts/agents/orchestration-runs/` ثم يجمع النتائج إلى task graph.
- استخدم `ospec execute launch ... --run --command "..."` فقط كـ single-worker CLI fallback عندما لا تتوفر native subagents أو يتم تجاوزها صراحة. يسجل OSpec stdout/stderr وexit code وtimeout metadata تحت `artifacts/agents/worker-runs/`؛ ثم استخدم `ospec execute collect ...` لتحويل ذلك run إلى task completion state.
- استخدم `ospec execute retry [changes/active/<change>] --task task-id` بعد إصلاح worker run كان blocked أو needs-context أو failed. يكتب `artifacts/agents/retries/`، ويعيد فتح task، وينشئ dispatch packet جديدا. تحتاج المهام المكتملة إلى `--force` صراحة.
- بعد اكتمال كل worker task، استخدم `ospec execute review [changes/active/<change>] --task <task-id> --stage spec` ثم `--stage quality`. تحفظ قرارات task-level review تحت `artifacts/reviews/tasks/<task-id>/` وتبقى المهام التابعة محجوبة حتى اعتماد المراجعتين.
- بعد اعتماد كل task-level reviews واكتمال task graph، استخدم `ospec execute review [changes/active/<change>] [--stage spec|quality]` من دون `--task` لإنشاء final whole-change reviewer handoff packets داخل `artifacts/agents/review-dispatches/*`. عند حذف `--stage` يرسل OSpec final spec review أولاً، ثم final quality review بعد اعتماد spec.
- استخدم `ospec execute review ... --run --command "..."` فقط عندما تريد صراحة أن يشغّل OSpec local reviewer command. يسجل OSpec run تحت `artifacts/agents/review-runs/` ويمكنه تحديث task-level أو final review artifact المطابق عند تمرير `--decision`.
- بعد أن يحتوي review artifact على قرار غير `PENDING`، استخدم `ospec execute feedback [changes/active/<change>] [--stage spec|quality] [--summary "..."]` لكتابة `artifacts/agents/review-feedback-plan.json` و`artifacts/agents/review-feedback-plan.md`. يسجل هل سيتم قبول feedback أو تعديله أو توضيحه أو إزالة blocker قبل dispatch عمل إضافي، وينشئ required user decision gate عندما يؤثر feedback في scope أو direction أو API أو UI أو risk أو accepted tradeoffs.
- عندما يكون debugging جزءا من change، استخدم `ospec execute debug [changes/active/<change>] --phase reproduce|isolate|hypothesize|fix|verify --symptom "..." --root-cause "..." --status FIXED` لتسجيل `artifacts/agents/debug-evidence.json` وdebug evidence report. تعني `CONFIRMED` عزل root cause، وتعني `FIXED` إصلاحا متحققا، وتؤدي `BLOCKED` إلى فشل verify.
- بعد تشغيل focused tests، استخدم `ospec execute tdd [changes/active/<change>] --phase red|green|refactor --command "..." --status ...` لتسجيل `artifacts/agents/tdd-evidence.json` وevidence report لكل دورة. يجب أن يسجل red اختبارا focused غير ناجح قبل implementation، ويتطلب green سجلا سابقا red `FAILED`، ويتطلب refactor دليلا سابقا green/refactor ناجحا، ويتطلب `SKIPPED` ملخصا محددا.
- بعد تشغيل project checks حديثة، استخدم `ospec execute verify [changes/active/<change>] --command "..." --status PASSED` لتسجيل `artifacts/agents/verification-evidence.json` وevidence report لكل تشغيل.
- استخدم `ospec execute sync [changes/active/<change>]` لإعادة بناء `artifacts/agents/worker-status.md` من task graph وexecution session وreview artifacts وحالة verification checklist بعد التعديل اليدوي.
- استخدم `tasks.md` لتقسيم خطة التنفيذ المقبولة إلى عمل قابل للتنفيذ.
- استخدم task-level spec review قبل quality review للمهمة نفسها، ثم استخدم final `artifacts/reviews/spec-compliance.md` قبل final `artifacts/reviews/code-quality.md` للفصل بين صحة الاتجاه وجودة التنفيذ.
- استخدم `artifacts/agents/worker-status.md` لتسجيل حالات implementer وspec reviewer وquality reviewer وcontroller.
- في مسارات AI / `/ospec-change` ينشئ AI ملفات `design.md` و`implementation-plan.md` و`artifacts/agents/task-graph.json` أو يحدّثها من المتطلب و`proposal.md` وسياق المشروع؛ ولا تحتاج إلا إلى مراجعة الافتراضات أو تصحيح القرارات المهمة.
- في مسارات CLI فقط يمكنك تعديل `design.md` و`implementation-plan.md` و`artifacts/agents/task-graph.json` يدوياً قبل `tasks.md`، ثم تشغيل `ospec verify [changes/active/<change>]`.
- قيم حالة task graph هي `DONE` و`DONE_WITH_CONCERNS` و`IN_PROGRESS` و`NEEDS_CONTEXT` و`BLOCKED` و`PENDING`؛ وتتطلب جاهزية الأرشفة أن يكون `status` العلوي `"completed"` وأن تكون كل المهام `DONE` أو `DONE_WITH_CONCERNS`.
- `ospec execute bootstrap` و`handoff` و`doc-review` و`status` و`next` للقراءة فقط باستثناء أن `bootstrap` و`handoff` و`doc-review` تكتب artifacts الخاصة بها؛ أما `workspace` و`worktree` في plan mode و`finish` فتفحص حالة git/artifact وتكتب workspace/worktree/finish artifacts فقط. `dispatch` و`launch` و`collect` و`retry` و`complete` و`review` و`feedback` و`debug` و`tdd` و`verify` و`sync` تحدّث OSpec artifacts وحالة task graph أو launch-plan أو worker-runs أو review-runs أو retries أو review-dispatch أو review-feedback-plan أو debug-evidence أو tdd-evidence أو verification-evidence أو worker-status فقط، ولا تحرر ملفات source في المشروع مباشرة. يتم تشغيل native subagents بواسطة current AI harness. تعمل أوامر shell فقط عند تمرير `execute worktree --create` أو `execute worktree --cleanup` أو fallback `execute orchestrate --command "..."` أو fallback `execute launch --run --command "..."` أو `execute review --run --command "..."` صراحة.
- قيم حالة worker هي `DONE` و`DONE_WITH_CONCERNS` و`NEEDS_CONTEXT` و`BLOCKED` و`PENDING`؛ ويتطلب الاكتمال حل حالات worker وأن تكون `controller_status` مساوية لـ `DONE`.
- يفشل `ospec verify [changes/active/<change>]` عندما يكون `design.md` أو `implementation-plan.md` أو `artifacts/agents/task-graph.json` أو review artifacts أو `artifacts/agents/worker-status.md` مفقودا أو تالف البنية، ويعرض تحذيرا عندما تبقى عناصر checklist غير محددة في الوثائق.
- اجعل `design.md` موجزا؛ دوره رفع دقة تقسيم المهام، وليس استبدال وثائق المشروع طويلة الأمد.

تستخدم المشاريع الجديدة التي تُهيَّأ عبر `ospec init [path]` تخطيط nested افتراضيا. يبقى في جذر المستودع فقط `.skillrc` و `README.md`، بينما تنتقل بقية ملفات OSpec المُدارة إلى `.ospec/`.
ولا ينشئ `init` العادي خرائط معرفة اختيارية مثل `.ospec/knowledge/src/` أو `.ospec/knowledge/tests/` بشكل افتراضي.
وما زال سطر الأوامر يقبل الاختصارات مثل `changes/active/<change>`، لكن المسار الفعلي داخل المشاريع nested هو `.ospec/changes/active/<change>`.
ولترحيل مشروع classic قديم إلى التخطيط الجديد، شغّل صراحة `ospec layout migrate --to nested`.

## من Session Hook إلى Finish

استخدم هذا المسار عندما يقود AI harness تغييرا نشطا واحدا مع قرارات مستخدم محفوظة وruntime evidence:

1. شغّل `ospec session hook [path]` بعد تحديث المشروع، ثم اجعل harness يحقن `.ospec/hooks/using-ospec.md` عند session start.
2. عند استئناف change شغّل `ospec execute bootstrap [changes/active/<change>]` واتبع next instruction قبل dispatch العمل.
3. إذا أظهر bootstrap أو status وجود pending decision، افتح `artifacts/agents/decisions/index.md`، واعرض `Chat Prompt` من decision report على المستخدم، ثم سجّل الإجابة عبر `ospec execute decision [changes/active/<change>] --id <id> --select <option-id>`.
4. شغّل `ospec execute workspace [changes/active/<change>]` ثم `ospec execute dispatch [changes/active/<change>]`. استخدم `ospec execute launch ... --json` عندما يحتاج adapter إلى بيانات تشغيل machine-readable، واجعل `--run --command` fallback للـ CLI فقط.
5. في changes التي تفعّل Checkpoint، شغّل `ospec plugins doctor checkpoint [path]` وأصلح `routes.yaml` و`flows.yaml` وbaseline وscreenshots وtraces وconsole/network evidence وaccessibility evidence وassertions قبل closeout.
6. استخدم `ospec execute status` و`ospec execute next` و`ospec execute finish` لتأكيد Checkpoint evidence readiness. يتم حجب finish وverify وarchive حتى تكتمل required decisions وactive Checkpoint evidence.

## تحديث مشروع موجود

البرومبت الموصى به:

```text
/ospec حدّث أو أصلح طبقة معرفة المشروع لهذا الدليل. لا تنشئ change بعد.
```

```bash
npm install -g @clawplays/ospec-cli@1.2.0
ospec update [path]
```

إذا كنت قد ثبت الأداة محليا من هذا المستودع:

```bash
npm install -g .
ospec update [path]
```

يقوم `ospec update [path]` بتحديث وثائق البروتوكول والأدوات والمهارات المُدارة وبيانات تخطيط الأرشفة وملفات الإضافات المفعلة.
كما يمكنه إصلاح مشاريع OSpec القديمة التي ما زالت تحتفظ ببصمة OSpec ولكنها تفتقد بعض المجلدات الأساسية الأحدث، كما ينقل `build-index-auto.*` من الجذر إلى `.ospec/tools/` ويطبع مفاتيح Stitch القديمة داخل `.skillrc` إلى البنية الجديدة.
وإذا ظل مشروع nested يحتوي على أدلة معرفة قديمة تحت `.ospec/src/` أو `.ospec/tests/` فإن `ospec update [path]` ينقلها إلى `.ospec/knowledge/src/` و `.ospec/knowledge/tests/`.
إذا كانت حزمة إضافة مفعلة قد حُذفت يدويا من التثبيت العالمي، فإن `ospec update [path]` يحاول أولا استعادتها قبل متابعة مزامنة أصول المشروع.
إذا كانت هناك نسخة npm متوافقة أحدث لإضافة مفعلة بالفعل، فإن `ospec update [path]` يرقّي هذه الحزمة العالمية تلقائيا ويعرض الانتقال من النسخة القديمة إلى النسخة الجديدة.
لكنه لا يرقّي الإضافات العالمية غير المفعلة في المشروع الحالي.
ولا يرقّي CLI نفسه.
ولا يثبت إضافات جديدة تلقائيا، ولا يفعّل الإضافات تلقائيا، ولا يرحّل active / queued changes تلقائيا.

## تحديث كل الإضافات المثبتة

البرومبت الموصى به:

```text
/ospec حدّث كل الإضافات المثبتة على هذا الجهاز.
```

إذا أردت تحديث كل الإضافات المثبتة على الجهاز، وليس فقط إضافات المشروع الحالي، فاستخدم الأمر الصريح:

يقوم `ospec update [path]` فقط بإصلاح المشروع الحالي وتحديثه، لكنه لا يحول تخطيط classic إلى nested تلقائيا. وعندما تريد تغيير التخطيط استخدم `ospec layout migrate --to nested`.

```bash
ospec plugins update --all
```

صيغ مفيدة:

```bash
ospec plugins update stitch
ospec plugins update --all --check
```

يقوم `ospec plugins update --all` بفحص كل الإضافات المثبتة عالميا والمسجلة لدى OSpec، ويرقّي كل إضافة عندما يتوفر إصدار متوافق أحدث.
وإذا كانت حزمة إضافة مثبتة قد حُذفت يدويا، فإنه يحاول أولا استعادتها قبل الترقية.
وفي مسارات AI / `/ospec` يجب تشغيل `ospec plugins update --all` فقط عندما يطلب المستخدم صراحة تحديث جميع الإضافات المثبتة.
