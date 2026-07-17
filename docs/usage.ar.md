# الاستخدام

إذا كنت تستخدم OSpec أساسا عبر AI فابدأ بمطالبة قصيرة مثل `/ospec` أو `/ospec-change`. استخدم `/ospec-change` للتغييرات الصغيرة والروتينية، واستخدم `/ospec-goal` للعمل المعقد ذي full workflow. استخدم أوامر CLI في هذه الصفحة عندما تحتاج إلى مسار بديل أو إلى تنفيذ صريح.

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
ospec goal <goal-name> [path]
ospec progress [changes/active/<change>]
ospec run status [path]
ospec loop status [changes/active/<change>] [--brief|--json]
ospec loop configure [changes/active/<change>] --max-parallel N --max-parallel-reason "..." --max-task-repair-rounds N --max-final-repair-rounds N --continue-while-progressing true|false
ospec loop allowlist derive [changes/active/<change>] --from-task-graph [--json]
ospec loop allowlist check [changes/active/<change>] --from-task-graph [--json]
ospec loop allowlist apply [changes/active/<change>] --from-task-graph --expected-current-hash H --expected-candidate-hash H [--expected-task-graph-hash H] [--approve-expansion]
ospec loop allowlist clear [changes/active/<change>] --confirm
ospec execute bootstrap [changes/active/<change>]
ospec execute handoff [changes/active/<change>] [--target codex|gpt|claude|gemini|opencode|cursor|copilot|shell|generic]
ospec execute doc-review [changes/active/<change>] [--stage design|plan]
ospec execute doc-review [changes/active/<change>] --stage design|plan --claim-executor <executor-id>
ospec execute doc-review [changes/active/<change>] --stage design|plan --complete-executor <executor-id>
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
ospec execute collect [changes/active/<change>] [--task task-id] [--run run-id] [--status DONE|DONE_WITH_CONCERNS|NEEDS_CONTEXT|BLOCKED] [--summary "..."]
ospec execute complete <task-id> [changes/active/<change>] --status DONE --summary "..."
ospec execute defer-blocker <task-id> [changes/active/<change>] --reason "..."
ospec execute review [changes/active/<change>] [--task task-id]
ospec execute feedback [changes/active/<change>] [--summary "..."]
ospec execute decision [changes/active/<change>] --id <id> --question "..." --option id:label:impact --option id:label:impact [--recommended id] [--required|--optional]
ospec execute decision [changes/active/<change>] --id <id> --select <option-id> --answered-by user [--summary "..."]
ospec execute debug [changes/active/<change>] --phase reproduce|isolate|hypothesize|fix|verify --symptom "..." --root-cause "..." --status FIXED --command "npm test -- focused" --summary "..."
ospec execute tdd [changes/active/<change>] --phase red|green|refactor --command "npm test -- focused" --status PASSED --exit-code 0 --summary "..."
ospec execute require-verification [changes/active/<change>] --id <id> --kind browser|e2e|test|lint|build|manual|other --description "..."
ospec execute verify [changes/active/<change>] --command "npm test" --status PASSED --satisfies <id> --exit-code 0 --summary "..."
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

تستبدل الخيارات `loop configure --allow-path` و`--allow-command` و`--allow-command-policy` مجموعة allowlist المحددة بالكامل وتعرض الفرق، ولا تضيف صلاحيات ضمنيا. في L3 استخدم مسار task graph: `derive -> check -> apply`. يستخدم apply قيم CAS، ويتطلب توسيع الصلاحيات الخيار الصريح `--approve-expansion`.

قدم الإصدار 1.8.3 قيما افتراضية محدودة لمراجعات design وplan المتخصصة. في continuous mode للإصدار 1.8.9 تصبح الجولتان المكتملتان و30 دقيقة لكل stage عتبات تقارب: يمكن لمجموعة structured finding-ID جديدة أن تستمر، بينما تتوقف المجموعات المتكررة أو الدورية. لا تستهلك cache hits أو pending reuse أو heartbeat أو استعادة dispatch نفسه جولة. لا يتجاوز `--force` الحواجز، ويحتفظ strict mode بنافذة extra round التي يصرح بها المستخدم بدقة.

قدم الإصدار 1.8.4 حارسا من جولتين لكل من task-review repair وgrouped final-review repair، ويعامله continuous mode كعتبة تقارب. يستمر التنفيذ تلقائيا عندما تتغير معرفات findings المنظمة. بدءا من 1.8.11 يمكن أن يستمر المعرف نفسه أيضا عندما يتغير كل من structured finding fingerprint وcode snapshot داخل repair scope المصرح به سابقا. أما تغيير الصياغة فقط أو الكود فقط أو التكرار الدقيق أو الدورة فيتوقف قبل repair غير مفيد. يحافظ `--continue-while-progressing false` على حدود العمر الصارمة السابقة. تبقى مراجعة upstream المعتمدة صالحة فقط عندما يمكن إسناد كل path متغير إلى task downstream متعدية ومكتملة، وتنتقل عقود upstream إلى حزمة reviewer اللاحقة كالتزامات regression. تتوقف final review بحالة `BLOCKED` لحل blocker بدلا من بدء grouped repair.

يضيف الإصدار 1.8.12 تأجيلا صريحا للقبول الخارجي لمهمة durable بحالة `BLOCKED`. يتطلب `ospec execute defer-blocker` external blocker مسجلا ودليل dispatch مكتمل وسبب تفويض غير فارغ من المستخدم. تبقى المهمة محظورة ولا تتغير checklist، ويستمر فقط التنفيذ الآمن من ناحية التبعيات؛ وتظل final review وverify وfinalize وarchive محظورة.

يمنع الإصدار 1.8.5 انتظار native child من تجميد Goal controller. يجب أن يعيد `wait_agent` في Codex/GPT وpolling لـ Claude Task وكل native adapter آخر التحكم خلال 60 ثانية، ويحدّث heartbeat قبل `heartbeatDueAt`، ويحفظ كل نتيجة مكتملة فوراً، ثم يعيد tick. لا تعيد حركة Git HEAD وحدها task review عندما تبقى target snapshot دون تغيير، بينما تظل final review مرتبطة بدقة بالـ snapshot وHEAD. عند غياب native capacity يقتصر implementation batch على مهمتين من دون تقليل توازي review الآمن. يجب تقسيم أي task جديدة تتجاوز ستة targets أو إضافة `scope_reason`.

يوضح الإصدار 1.8.6 أن 60 ثانية هي حد دورة polling واحدة للـ controller وليست حد تشغيل child. الحد المطلق الافتراضي هو 120 دقيقة للـ implementation و60 دقيقة للـ review والـ verification، مع heartbeat lease قابلة للتجديد ومدة grace افتراضية قدرها خمس دقائق بين اكتمال evidence ووصول result. يتحقق `ospec loop finalize` من durable evidence قبل تسجيل النجاح. تمنع directory snapshots المتكررة وapproval cache المرتبطة بالسياق وتحسين conflict-safe selection المراجعات القديمة أو المكررة من دون إضعاف provenance. تتطلب serial tasks الجديدة في 1.8.6 قيمة `serial_reason`، وتظل الرسوم القديمة قابلة للقراءة.

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
/ospec-goal أنشئ goal كاملا لهذا المتطلب وادفعه إلى الأمام.
/ospec أرشف هذا التغيير المقبول.
```

لدليل جديد:

```bash
ospec init [path]
ospec new <change-name> [path]
# فقط عند الحاجة إلى full workflow:
ospec goal <goal-name> [path]
ospec verify [changes/active/<change>]
ospec finalize [changes/active/<change>]
```

## Change و Goal

ينشئ `ospec new <change-name> [path]` ملفات classic fast-flow فقط: `proposal.md` و`tasks.md` و`state.json` و`verification.md` و`review.md`. أما `ospec goal <goal-name> [path]` فينشئ full workflow ويستخدم `design.md` و`implementation-plan.md` و`artifacts/agents/task-graph.json` وreview artifacts و`artifacts/agents/worker-status.md` وevidence artifacts.

يعمل goal كـ **حلقة task graph مرتبطة بالجلسة**. يراقب `ospec loop run --once` الـ evidence ثم يصدر bounded batch يحمل لكل action قيمة `runtimeAdapter.selected.nativeSubagent` مرتبطة بالـ target. يعمل بالتوازي فقط عندما يسمح model-native adapter المختار، ويجب block عند غياب capability أو انتهائها أو عدم مطابقة target. لا يوجد fallback إلى agent CLI أو current controller. راجع [loop-engineering.md](loop-engineering.md).

- يعمل كل goal بثلاثة عقود تجربة: `Announce-Before-Act` (يعلن الذكاء الاصطناعي skill والمرحلة، وكل أمر `ospec execute …` وأثره، وكل توزيع subagent)، و`Brainstorm-First` (قبل تثبيت التصميم يسأل عن القرارات المفتوحة للاتجاه والبنية وAPI والبيانات وUI والمخاطر والنطاق واحداً تلو الآخر عبر واجهة الأسئلة الأصلية — في Claude Code: AskUserQuestion)، و`Zero-Setup` (ينفّذ الذكاء الاصطناعي كل أمر `ospec` بنفسه، فأنت فقط تبدأ goal وتصف المتطلب).
- يمكن أن تفعّل workflow flags خطوات quality policy المدمجة للـ agent: `tdd_cycle` و`root_cause_debug` و`verification_evidence`. تكتب الخطوات المفعّلة في frontmatter الخاص بالـ change ضمن `optional_steps` ويجب تغطيتها في `tasks.md` و`verification.md` وarchive readiness.
- استخدم `proposal.md` لتسجيل سبب التغيير والنطاق ومعايير القبول.
- عند الدخول إلى مشروع OSpec موجود، استخدم `ospec session [path]` لكتابة `.ospec/session-brief.json` و`.ospec/session-brief.md` مع active change وqueue وcache fingerprint والأمر الآمن التالي. هذا project entry brief ولا يستبدل `ospec execute bootstrap` للـ active change.
- استخدم `ospec session hook [path]` لكتابة `.ospec/hooks/session-start.json` و`.ospec/hooks/session-start.md` لتكامل harness session-start الاختياري. هذا hook يحدّث session brief فقط ولا يشغّل workers ولا tests ولا يفحص git ولا يؤرشف ولا يحرر source files. أضف `--target claude --apply` لكتابة حزمة hook لـ Claude Code تحت `.ospec/hooks/claude/` ودمجها بشكل idempotent في `.claude/settings.json`؛ تعلن هذه الـ hooks كل توزيع subagent وكل أمر `ospec` على مستوى الأداة، وتحجب توزيع الـ subagents بشكل صارم طالما هناك قرار required معلّق، وتعيد تأكيد عقد `Announce-Before-Act` / `Brainstorm-First` في كل دور (تسري من جلسة Claude Code التالية).
- استخدم `ospec brainstorm [path] --topic "..."` فقط عندما تريد artifact لاستكشاف ما قبل إنشاء change داخل `.ospec/brainstorms/`. يضيف `--visual` ملف HTML محلياً وثابتاً، ولا ينشئ هذا command أي change.
- استخدم `ospec plan [path] --change changes/active/<change>` لإنشاء plan draft داخل `.ospec/plans/<id>/plan-draft.md`. مرّر `--apply` فقط عندما تريد تحديث `implementation-plan.md` لذلك goal.
- في goal استخدم `design.md` قبل التنفيذ لتسجيل النهج المختار والمفاضلات الرئيسية والحدود المتأثرة والمخاطر والأسئلة المفتوحة.
- في goal استخدم `implementation-plan.md` لتحويل التصميم إلى خطوات قابلة للتنفيذ بواسطة agent مع الملفات والنتائج المتوقعة وأوامر التحقق والاعتماديات والتعارضات.
- في goal استخدم `artifacts/agents/task-graph.json` لحفظ مخطط التنفيذ بصيغة قابلة للقراءة آلياً: معرفات المهام والاعتماديات وسلامة التوازي والتعارضات والملفات المستهدفة وأوامر التحقق والنتيجة المتوقعة ودور worker وحالة المهمة.
- اعتبر مسار dispatch/review/verification packet الذي يشير إليه كل loop action هو authoritative context، ولا تضع goal كاملا داخل سياق كل worker. تقود task status وreview/verification evidence المحفوظة fresh retry وgrouped final-review repair wave واحدة والـ tick التالية.
- عند استخدام explicit queue runner، استخدم `ospec run status [path]` لعرض queue run الحالي مع active change task graph snapshot، بما في ذلك أعداد completed وrunning وdispatchable وblocked وinvalid والخطوة التالية.
- تستخدم تعليمات الخطوة التالية في `ospec run start` و`run resume` و`run step` و`run status` active task graph عند توفره. عند وجود dispatchable work ستقترح `ospec execute dispatch ...`، لكن runner لا يوزع workers ولا يحرر ملفات source.
- عند بدء أو استئناف active change واحد، استخدم `ospec execute bootstrap [changes/active/<change>]` لكتابة `artifacts/agents/bootstrap.json` و`artifacts/agents/bootstrap.md` مع project session brief snapshot، ثم اتبع الإجراء الآمن التالي الذي يعرضه. عند وجود active dispatch، يوصي bootstrap بأمر `ospec execute launch ... --task ...` المطابق.
- عند نقل change بين agents أو tools أو worktrees أو shells أو operators بشريين، استخدم `ospec execute handoff [changes/active/<change>] [--target codex|gpt|claude|gemini|opencode|cursor|copilot|shell|generic]` لكتابة `artifacts/agents/handoff.json` و`artifacts/agents/handoff.md`. يسجل project session brief snapshot وtarget tool mapping وcommand sequence وقواعد السلامة وتحذيرات missing context.
- قبل implementation dispatch، استخدم `ospec execute doc-review [changes/active/<change>] [--stage design|plan]` لإنشاء packets تتضمن project session brief snapshot داخل `artifacts/agents/document-review-dispatches/*` و`artifacts/reviews/design-review.md` أو `artifacts/reviews/implementation-plan-review.md`. يجب اعتماد design review قبل dispatch لـ plan review.
- استخدم `ospec execute status [changes/active/<change>]` أو `ospec execute next [changes/active/<change>]` لفحص حالة controller والمهام التالية الآمنة للتوزيع. عندما تريد حفظ أمر OSpec التالي الموصى به للتسليم، استخدم `ospec execute route [changes/active/<change>]` لكتابة `artifacts/agents/workflow-route.json` و`workflow-route.md`.
- عندما يحتاج direction أو architecture أو API أو UI أو risk أو scope إلى user choice صريح، استخدم `ospec execute decision [changes/active/<change>] ...`. تظهر required pending decision في `bootstrap` و`status` و`finish`، وتمنع worker dispatch حتى تسجل `--select <option-id> --answered-by user` أو `--skip` مقصودا مع provenance نفسها.
- قبل handoff إلى worker استخدم `ospec execute workspace [changes/active/<change>]` لتسجيل `artifacts/agents/workspace-status.json` و`artifacts/agents/workspace-status.md`. إذا كانت الحالة `needs_isolation`، نظّف workspace أو انقل العمل إلى git worktree معزول قبل parallel dispatch.
- قبل إنشاء git worktree معزول، استخدم `ospec execute worktree [changes/active/<change>] [--branch name] [--path path] [--base ref]` لتسجيل `artifacts/agents/worktree-plan.json` و`artifacts/agents/worktree-plan.md`. يسجل plan mode branch وpath وbase ref ونص الأوامر المقترحة فقط ولا يشغّل git.
- استخدم `ospec execute worktree [changes/active/<change>] --create ...` فقط عندما تريد صراحة أن يشغّل OSpec `git worktree add`. تسجل النتيجة تحت `artifacts/agents/worktree-runs/`.
- استخدم `ospec execute worktree [changes/active/<change>] --cleanup [--path path]` فقط عندما تريد صراحة أن يشغّل OSpec `git worktree remove`. لا يحذف cleanup الفروع ولا يعمل push أو merge أو archive أو tests.
- قبل الإغلاق النهائي، استخدم `ospec execute finish [changes/active/<change>] [--target main] [--remote origin]` لتسجيل `artifacts/agents/finish-plan.json` و`artifacts/agents/finish-plan.md`. يفحص task graph وreviews وverification evidence وworker status ونظافة git، ثم يسجل الأوامر المقترحة فقط ولا ينفذها. عندما تكون finish plan جاهزة ولا توجد required pending decision، تابع بتنفيذ `ospec finalize [changes/active/<change>]`؛ `ospec archive ... --check` هو معاينة dry-run اختيارية فقط.
- استخدم `ospec execute dispatch [changes/active/<change>] [--task task-id] [--limit N]` لإنشاء batch آمن للتوازي من worker packets داخل `artifacts/agents/dispatches/*` و`artifacts/agents/execution-session.json`. يتضمن كل packet project session brief snapshot وworker profile يوضح capability tier وrecommended target وtarget tool mapping وrationale وrequired behavior لتوجيه المهام المعقدة إلى worker أقوى والمهام البسيطة إلى worker أخف. ثم استخدم `ospec execute complete <task-id> ...` لتسجيل نتيجة worker. استخدم `--task` لمهمة واحدة صريحة و`--limit` لتحديد حجم batch. يقوم الأمران أيضا بمزامنة `artifacts/agents/worker-status.md`؛ وعندما تسجل completion الحالة `NEEDS_CONTEXT` أو `BLOCKED` يكتب OSpec ملفات escalation تحت `artifacts/agents/blockers/` لمتابعة controller.
- بعد dispatch، استخدم `ospec execute launch [changes/active/<change>] [--task task-id] [--target codex|gpt|claude|gemini|opencode|cursor|copilot] [--dry-run]` لكتابة agent launch plan. يقبل `runtimeAdapter` فقط model-native subagent capability حالية ومرتبطة بالـ target ويعرض native primitive. لا يشغّل OSpec worker process بنفسه.
- نفّذ `runtimeAdapter.selected.nativeSubagent` وشغّل safe batch فقط بالتوازي. عند غياب capability أو انتهاء صلاحيتها يجب block من دون agent CLI أو current-controller fallback.
- أزيل agent CLI execution. تعيد `execute orchestrate` و`launch --run --command` و`review --run --command` و`loop watch` migration error قبل تشغيل process أو إنشاء run artifact.
- استخدم `ospec execute retry [changes/active/<change>] --task task-id` بعد إصلاح worker run كان blocked أو needs-context أو failed. يكتب `artifacts/agents/retries/`، ويعيد فتح task، وينشئ dispatch packet جديدا. تحتاج المهام المكتملة إلى `--force` صراحة.
- استخدم `ospec execute defer-blocker <task-id> [changes/active/<change>] --reason "..."` فقط بعد تفويض المستخدم الصريح لتأجيل قبول خارجي مسجل إلى البوابة النهائية. لا يجعل الأمر المهمة مكتملة ولا ينشئ evidence مفقودا؛ بل يجعل المهام التي تنتظر ذلك blocker وحده قابلة للإرسال.
- في Goal مملوكة لـ controller، استخدم `ospec loop tick [changes/active/<change>]` بعد مهام worker وبعد اكتمال task graph لإصدار task/final reviews مرتبطة بـ executor provenance الحقيقي. استخدم `ospec execute review` مباشرةً فقط خارج controller Loop.
- بعد أن يحتوي review artifact على قرار غير `PENDING`، استخدم `ospec execute feedback [changes/active/<change>] [--summary "..."]` لكتابة `artifacts/agents/review-feedback-plan.json` و`artifacts/agents/review-feedback-plan.md`. يسجل هل سيتم قبول feedback أو تعديله أو توضيحه أو إزالة blocker قبل dispatch عمل إضافي، وينشئ required user decision gate عندما يؤثر feedback في scope أو direction أو API أو UI أو risk أو accepted tradeoffs.
- عندما يكون debugging جزءا من change، استخدم `ospec execute debug [changes/active/<change>] --phase reproduce|isolate|hypothesize|fix|verify --symptom "..." --root-cause "..." --status FIXED` لتسجيل `artifacts/agents/debug-evidence.json` وdebug evidence report. تعني `CONFIRMED` عزل root cause، وتعني `FIXED` إصلاحا متحققا، وتؤدي `BLOCKED` إلى فشل verify.
- بعد تشغيل focused tests، استخدم `ospec execute tdd [changes/active/<change>] --phase red|green|refactor --command "..." --status ...` لتسجيل `artifacts/agents/tdd-evidence.json` وevidence report لكل دورة. يجب أن يسجل red اختبارا focused غير ناجح قبل implementation، ويتطلب green سجلا سابقا red `FAILED`، ويتطلب refactor دليلا سابقا green/refactor ناجحا، ويتطلب `SKIPPED` ملخصا محددا.
- استخدم `ospec execute require-verification` لحفظ browser أو E2E أو manual verification surface التي طلبها المستخدم. يظل final verification وarchive محجوبين حتى يرتبط fresh PASSED evidence عبر `--satisfies <id>`.
- بعد تشغيل project checks حديثة، استخدم `ospec execute verify [changes/active/<change>] --command "..." --status PASSED --exit-code 0` لتسجيل `artifacts/agents/verification-evidence.json` وevidence report لكل تشغيل؛ يرفض PASSED من دون رمز خروج 0 صريح.
- استخدم `ospec execute sync [changes/active/<change>]` لمزامنة worker status و`state.json` المشتق من bootstrap وproject session brief.
- استخدم `tasks.md` لتقسيم خطة التنفيذ المقبولة إلى عمل قابل للتنفيذ.
- كل task يخضع لمراجعة موحدة واحدة تغطي spec compliance وcode quality معا؛ وتسجل المراجعة النهائية قرارا واحدا في `artifacts/reviews/final-review.md`.
- استخدم `artifacts/agents/worker-status.md` لتسجيل حالات implementer وspec reviewer وquality reviewer وcontroller.
- في مسارات AI / `/ospec-change` يبقي AI التدفق الصغير مركزا على `proposal.md` و`tasks.md` والتنفيذ و`verification.md` و`review.md`.
- في مسارات AI / `/ospec-goal` ينشئ AI ملفات `design.md` و`implementation-plan.md` و`artifacts/agents/task-graph.json` أو يحدّثها من المتطلب و`proposal.md` وسياق المشروع؛ ولا تحتاج إلا إلى مراجعة الافتراضات أو تصحيح القرارات المهمة.
- قيم حالة task graph هي `DONE` و`DONE_WITH_CONCERNS` و`IN_PROGRESS` و`NEEDS_CONTEXT` و`BLOCKED` و`PENDING`؛ وتتطلب جاهزية الأرشفة أن يكون `status` العلوي `"completed"` وأن تكون كل المهام `DONE` أو `DONE_WITH_CONCERNS`.
- لا تعدّل أوامر artifact في `ospec execute` ملفات source مباشرة. يوزّع current model controller الـ workers فقط عبر `runtimeAdapter.selected.nativeSubagent`، وتستخدم specialist reviews الـ executor id الحقيقي في claim/complete. لا يشغّل OSpec agent CLI.
- قيم حالة worker هي `DONE` و`DONE_WITH_CONCERNS` و`NEEDS_CONTEXT` و`BLOCKED` و`PENDING`؛ ويتطلب الاكتمال حل حالات worker وأن تكون `controller_status` مساوية لـ `DONE`.
- في profile `change` يتطلب `ospec verify [changes/active/<change>]` ملفات classic فقط. وفي profile `goal` يتطلب أيضا `design.md` و`implementation-plan.md` و`artifacts/agents/task-graph.json` وdocument review artifacts وfinal review artifacts وverification evidence و`artifacts/agents/worker-status.md`.
- اجعل `design.md` موجزا؛ دوره رفع دقة تقسيم المهام، وليس استبدال وثائق المشروع طويلة الأمد.

تستخدم المشاريع الجديدة التي تُهيَّأ عبر `ospec init [path]` تخطيط nested افتراضيا. يبقى في جذر المستودع فقط `.skillrc` و `README.md`، بينما تنتقل بقية ملفات OSpec المُدارة إلى `.ospec/`.
ولا ينشئ `init` العادي خرائط معرفة اختيارية مثل `.ospec/knowledge/src/` أو `.ospec/knowledge/tests/` بشكل افتراضي.
وما زال سطر الأوامر يقبل الاختصارات مثل `changes/active/<change>`، لكن المسار الفعلي داخل المشاريع nested هو `.ospec/changes/active/<change>`.
ولترحيل مشروع classic قديم إلى التخطيط الجديد، شغّل صراحة `ospec layout migrate --to nested`.

## من Session Hook إلى Finish

استخدم هذا المسار عندما يقود AI harness تغييرا نشطا واحدا مع قرارات مستخدم محفوظة وruntime evidence:

1. شغّل `ospec session hook [path]` بعد تحديث المشروع، ثم اجعل harness يحقن `.ospec/hooks/using-ospec.md` عند session start.
2. عند استئناف change شغّل `ospec execute bootstrap [changes/active/<change>]` واتبع next instruction قبل dispatch العمل.
3. إذا أظهر bootstrap أو status وجود pending decision، افتح `artifacts/agents/decisions/index.md`، واعرض `Chat Prompt` من decision report على المستخدم، ثم سجّل الإجابة عبر `ospec execute decision [changes/active/<change>] --id <id> --select <option-id> --answered-by user`.
4. شغّل `ospec execute workspace [changes/active/<change>]` ثم `ospec execute dispatch [changes/active/<change>]`. استخدم `ospec execute launch ... --json` لقراءة native subagent contract، ثم dispatch عبر current model harness وسجّل real child result.
5. في changes التي تفعّل Checkpoint، شغّل `ospec plugins doctor checkpoint [path]` وأصلح `routes.yaml` و`flows.yaml` وbaseline وscreenshots وtraces وconsole/network evidence وaccessibility evidence وassertions قبل closeout.
6. استخدم `ospec execute status` و`ospec execute next` و`ospec execute finish` لتأكيد Checkpoint evidence readiness. يتم حجب finish وverify وarchive حتى تكتمل required decisions وactive Checkpoint evidence.

## تحديث مشروع موجود

البرومبت الموصى به:

```text
/ospec حدّث أو أصلح طبقة معرفة المشروع لهذا الدليل. لا تنشئ change بعد.
```

```bash
npm install -g @clawplays/ospec-cli@1.8.12
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
