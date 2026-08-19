# الاستخدام

إذا كنت تستخدم OSpec أساسا عبر AI / `/ospec` فابدأ بمطالبة قصيرة مثل `/ospec` أو `/ospec-change`. استخدم `/ospec-change` للتغييرات الصغيرة والروتينية، واستخدم `/ospec-goal` للعمل المعقد ذي full workflow. استخدم أوامر CLI في هذه الصفحة عندما تحتاج إلى مسار بديل أو إلى تنفيذ صريح.

## الأوامر الشائعة

```bash
ospec status [path]
ospec session [path]
ospec session hook [path]
ospec init [path]
ospec docs status [path]
ospec docs generate [path]
ospec changes status [path]
ospec docs locate --feature <slug> | --affects <path> [--json]
ospec docs obligations [changes/active/<change>] [--apply] [--json]
ospec docs confirm [changes/active/<change>] --id <obligation-id> [--note "..."]
ospec docs audit [path] [--json]
ospec docs migrate [path] --plan|--verify|--finalize [--apply]
ospec changes show <archive> [--md|--json]
ospec index gc [path]ospec brainstorm [path] --topic "..." [--change name] [--output id] [--visual]
ospec plan [path] [--change changes/active/<change>] [--from-brainstorm file] [--output id] [--apply]
ospec change <change-name> [path]
ospec goal <goal-name> [path]
ospec progress [changes/active/<change>]
ospec run status [path]
ospec loop status [changes/active/<change>] [--brief|--json]
ospec loop run [changes/active/<change>] --once --json
ospec loop tick [changes/active/<change>] --json
ospec loop heartbeat [changes/active/<change>] --action-item <id> --executor <child-id>
ospec loop finalize [changes/active/<change>] --action-item <id> --executor <child-id> --exit-code 0 --summary "..."
ospec loop recover [changes/active/<change>] --force
ospec loop configure [changes/active/<change>] --max-parallel N --max-parallel-reason "..." --max-task-repair-rounds N --max-final-repair-rounds N --continue-while-progressing true|false
ospec loop allowlist derive [changes/active/<change>] --from-task-graph [--json]
ospec loop allowlist check [changes/active/<change>] --from-task-graph [--json]
ospec loop allowlist apply [changes/active/<change>] --from-task-graph --expected-current-hash H --expected-candidate-hash H [--expected-task-graph-hash H] [--approve-expansion]
ospec loop allowlist clear [changes/active/<change>] --confirm
ospec execute bootstrap [changes/active/<goal>]
ospec execute handoff [changes/active/<change>] [--target codex|gpt|claude|gemini|grok|opencode|cursor|copilot|shell|generic]
ospec execute preflight [changes/active/<change>] [--stage design|plan]
ospec execute status [changes/active/<change>]
ospec execute next [changes/active/<change>]
ospec execute route [changes/active/<change>]
ospec execute workspace [changes/active/<change>]
ospec execute worktree [changes/active/<change>] [--branch name] [--path path] [--base ref]
ospec execute worktree [changes/active/<change>] --create [--branch name] [--path path] [--base ref]
ospec execute worktree [changes/active/<change>] --cleanup [--path path]
ospec execute finish [changes/active/<change>] [--target main] [--remote origin]
ospec execute dispatch [changes/active/<change>] [--task task-id] [--limit N]
ospec execute launch [changes/active/<change>] [--task task-id] [--target codex|gpt|claude|gemini|grok|opencode|cursor|copilot|shell|generic] [--dry-run]
ospec execute collect [changes/active/<change>] [--task task-id] [--run run-id] [--status DONE|DONE_WITH_CONCERNS|NEEDS_CONTEXT|BLOCKED] [--summary "..."]
ospec execute complete <task-id> [changes/active/<change>] --status DONE --summary "..."
ospec execute defer-blocker <task-id> [changes/active/<change>] --reason "..."
ospec execute review [changes/active/<change>] [--task task-id]
ospec execute feedback [changes/active/<change>] [--summary "..."]
ospec execute repair [changes/active/<change>]
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
ospec finalize [changes/active/<change>] --force-archive --confirm-force-archive <exact-change-name> (--reason "..." | --reason-file <path>)
ospec skill status
ospec skill install
ospec skill status-claude
ospec skill install-claude
ospec update [path]
```

كل أوامر `ospec execute` الخاصة بـ task graph/controller أعلاه مخصصة للـ Goal باستثناء `ospec execute decision` المشترك لتسجيل اختيارات المستخدم الدائمة. يستخدم Change الكلاسيكي `ospec progress` والتنفيذ المباشر و`ospec verify` على المستوى الأعلى و`review.md` الخفيف و`ospec finalize`، ولا ينشئ bootstrap أو task graph أو worker dispatch أو Loop artifacts الخاصة بالـ Goal.

تضبط الخيارات `loop configure --allow-path` و`--allow-command` و`--allow-command-policy` حدا إضافيا اختياريا، وتستبدل مجموعة allowlist المحددة بالكامل وتعرض الفرق. استخدم مسار task graph: `derive -> check -> apply`، ويتطلب توسيع الصلاحيات الخيار الصريح `--approve-expansion`.

## سلوك سير العمل الحالي

- **الأرشفة القسرية:** استخدمها فقط بعد قبول المستخدم صراحة للمخاطر غير المحلولة. يلزم `--force-archive` و`--confirm-force-archive` مطابق تماما لاسم change وسبب غير فارغ. لا تتغير evidence الفاشلة أو `NOT_VERIFIED`. يكون Controller pointer المحتفظ به آمنا فقط عندما يحتوي item واحدة على الأقل وتكون كل items مسجلة نهائيا كـ `completed` أو `failed` أو `expired`. الحالات المفقودة و`issued` و`running` وأي حالة غير نهائية تظل مانعة، ويبقى archive موسوما `forced` و`incomplete` و`accepted-risk`.
- **تقارب المراجعة:** تستخدم planning documents deterministic inline preflight بدون reviewer child أو token reservation. وتبقى task/final repair على عتبات تقارب محدودة؛ لا يستمر finding ثابت إلا عندما يتغير fingerprint وrepair-scope snapshot المصرح بهما معا.
- **القبول الخارجي:** يتطلب `ospec execute defer-blocker` external blocker دائم موجودا ودليل dispatch مكتمل وتفويضا صريحا من المستخدم. يسمح باستمرار implementation الآمن من ناحية dependencies، لكنه يبقي task محظورة ويحافظ على بوابات final review وverify وfinalize وarchive.
- **ملكية الإصلاح:** تنفذ prerequisite review قبل dependent retry. يجب أن تنتمي paths في cross-task repair إلى owners معلنين ومكتملين، وأن تستخدم frozen scope، وأن تطلق fresh owner review عندما تصبح الموافقة قديمة. تلتقط task review نسخة من canonical worker report لنفس task؛ يسمح بالإصلاح الدقيق لذلك report، أما evidence القديمة فتنتقل إلى fresh review بدلا من تعديل التاريخ.
- **إغلاق الوثائق:** الإنشاء والحذف اللذان تمت مراجعتهما انتقالان فعليان للحالة. تجمع evidence من أول baseline حتى آخر completed dispatch، ويجب أن تطابق workspace أحدث declared-owner evidence. يمكن لمراجعة authoritative بحالة APPROVED ربط final snapshot الدقيق من دون استبدال meaningful-change chain. يحدث `ospec execute sync` worker status متعدد اللغات وCombined review checklist.
- **Classic Change:** الأمر `ospec change` هو fast path المفضل ويبقى `ospec new` alias. لا تتم ترقية Change الذي اختاره المستخدم تلقائيا إلى Goal. يستخدم إرشادا مختصرا حسب المرحلة، ومراجعة خفيفة واحدة بواسطة AI الحالي، وقواعد توثيق عملية، وcloseout مشتقا، وإعادة بناء index مرة واحدة في finalize، وqueue متسلسلة. عندما تمر كل البوابات الأخرى يمكن أرشفة `APPROVED` و`APPROVED_WITH_CONCERNS` تلقائيا.
- **Controller والتوازي:** تعود native wait الواحدة خلال 60 ثانية، لكن child الحي يمكنه العمل حتى absolute deadline مع تجديد heartbeat. fallback لتوازي implementation عند غياب native capacity هو 3 وليس 2. يمكن لـ session-bound capacity موجبة وأكبر دعم إعدادات مثل 5-10 عندما تسمح dependencies وfile conflicts وshared resources وtoken و`maxParallel`. تحتاج serial task الجديدة إلى `serial_reason`، ويجب تقسيم task التي تتجاوز ستة targets أو إعلان `scope_reason`.

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
ospec change <change-name> [path]
# فقط عند الحاجة إلى full workflow:
ospec goal <goal-name> [path]
ospec verify [changes/active/<change>]
ospec finalize [changes/active/<change>]
```

## Change و Goal

ينشئ `ospec change <change-name> [path]` ملفات classic fast-flow فقط: `proposal.md` و`tasks.md` و`state.json` و`verification.md` و`review.md`، ويبقى `ospec new` alias متوافقا. أما `ospec goal <goal-name> [path]` فينشئ full workflow ويستخدم `design.md` و`implementation-plan.md` و`artifacts/agents/task-graph.json` وreview artifacts و`artifacts/agents/worker-status.md` وevidence artifacts.

يعمل goal كـ **حلقة task graph مرتبطة بالجلسة**. يراقب `ospec loop run --once` الـ evidence ثم يصدر bounded batch يحمل لكل action قيمة `runtimeAdapter.selected.nativeSubagent` مرتبطة بالـ target. يعمل بالتوازي فقط عندما يسمح model-native adapter المختار، ويجب block عند غياب capability أو انتهائها أو عدم مطابقة target. لا يوجد fallback إلى agent CLI أو current controller. راجع [loop-engineering.md](loop-engineering.md).

- يعمل كل goal بثلاثة عقود تجربة: `Announce-Before-Act` (يعلن الذكاء الاصطناعي skill والمرحلة، وكل أمر `ospec execute …` وأثره، وكل توزيع subagent)، و`Brainstorm-First` (قبل تثبيت التصميم يسأل عن القرارات المفتوحة للاتجاه والبنية وAPI والبيانات وUI والمخاطر والنطاق واحداً تلو الآخر عبر واجهة الأسئلة الأصلية — في Claude Code: AskUserQuestion)، و`Zero-Setup` (ينفّذ الذكاء الاصطناعي كل أمر `ospec` بنفسه، فأنت فقط تبدأ goal وتصف المتطلب).
- يمكن أن تفعّل workflow flags خطوات quality policy المدمجة للـ agent: `tdd_cycle` و`root_cause_debug` و`verification_evidence`. تكتب الخطوات المفعّلة في frontmatter الخاص بالـ change ضمن `optional_steps` ويجب تغطيتها في `tasks.md` و`verification.md` وarchive readiness.
- استخدم `proposal.md` لتسجيل سبب التغيير والنطاق ومعايير القبول.
- عند الدخول إلى مشروع OSpec موجود، استخدم `ospec session [path]` لكتابة `.ospec/session-brief.json` و`.ospec/session-brief.md` مع profile ‏`change` أو `goal` للعمل النشط وqueue وcache fingerprint والأوامر التالية الموافقة للـ profile. يقرأ Change الكلاسيكي ملفاته الخمسة مباشرة، ويستخدم Goal فقط `ospec execute bootstrap`.
- استخدم `ospec session hook [path]` لكتابة `.ospec/hooks/session-start.json` و`.ospec/hooks/session-start.md` لتكامل harness session-start الاختياري. هذا hook يحدّث session brief فقط ولا يشغّل workers ولا tests ولا يفحص git ولا يؤرشف ولا يحرر source files. أضف `--target claude --apply` لكتابة حزمة hook لـ Claude Code تحت `.ospec/hooks/claude/` ودمجها بشكل idempotent في `.claude/settings.json`؛ تعلن هذه الـ hooks كل توزيع subagent وكل أمر `ospec` على مستوى الأداة، وتحجب توزيع الـ subagents بشكل صارم طالما هناك قرار required معلّق، وتعيد تأكيد عقد `Announce-Before-Act` / `Brainstorm-First` في كل دور (تسري من جلسة Claude Code التالية).
- استخدم `ospec brainstorm [path] --topic "..."` فقط عندما تريد artifact لاستكشاف ما قبل إنشاء change داخل `.ospec/brainstorms/`. يضيف `--visual` ملف HTML محلياً وثابتاً، ولا ينشئ هذا command أي change.
- استخدم `ospec plan [path] --change changes/active/<change>` لإنشاء plan draft داخل `.ospec/plans/<id>/plan-draft.md`. مرّر `--apply` فقط عندما تريد تحديث `implementation-plan.md` لذلك goal.
- في goal استخدم `design.md` قبل التنفيذ لتسجيل النهج المختار والمفاضلات الرئيسية والحدود المتأثرة والمخاطر والأسئلة المفتوحة.
- في goal استخدم `implementation-plan.md` لتحويل التصميم إلى خطوات قابلة للتنفيذ بواسطة agent مع الملفات والنتائج المتوقعة وأوامر التحقق والاعتماديات والتعارضات.
- في goal استخدم `artifacts/agents/task-graph.json` لحفظ مخطط التنفيذ بصيغة قابلة للقراءة آلياً: معرفات المهام والاعتماديات وسلامة التوازي والتعارضات والملفات المستهدفة وأوامر التحقق والنتيجة المتوقعة ودور worker وحالة المهمة.
- اعتبر مسار dispatch/review/verification packet الذي يشير إليه كل loop action هو authoritative context، ولا تضع goal كاملا داخل سياق كل worker. تقود task status وreview/verification evidence المحفوظة fresh retry وgrouped final-review repair والـ tick التالية. في continuous mode تحصل مجموعة findings المتوقفة على root-cause strategy escalation دائمة واحدة قبل أن يوقف Loop العمل المتكرر.
- عند استخدام explicit queue runner، استخدم `ospec run status [path]` لعرض queue run الحالي مع active change task graph snapshot، بما في ذلك أعداد completed وrunning وdispatchable وblocked وinvalid والخطوة التالية.
- تستخدم تعليمات الخطوة التالية في `ospec run start` و`run resume` و`run step` و`run status` active task graph عند توفره. عند وجود dispatchable work ستقترح `ospec execute dispatch ...`، لكن runner لا يوزع workers ولا يحرر ملفات source.
- عند بدء أو استئناف active Goal واحد، استخدم `ospec execute bootstrap [changes/active/<goal>]` لكتابة `artifacts/agents/bootstrap.json` و`artifacts/agents/bootstrap.md` مع project session brief snapshot، ثم اتبع الإجراء الآمن التالي الذي يعرضه. عند وجود active dispatch، يوصي bootstrap بأمر `ospec execute launch ... --task ...` المطابق.
- عند نقل change بين agents أو tools أو worktrees أو shells أو operators بشريين، استخدم `ospec execute handoff [changes/active/<change>] [--target codex|gpt|claude|gemini|grok|opencode|cursor|copilot|shell|generic]` لكتابة `artifacts/agents/handoff.json` و`artifacts/agents/handoff.md`. يسجل project session brief snapshot وtarget tool mapping وcommand sequence وقواعد السلامة وتحذيرات missing context.
- قبل اشتقاق task graph شغّل `ospec execute preflight [changes/active/<change>] --stage design` ثم `--stage plan`. ينفذ الأمران deterministic inline readiness check ويسجلان approval evidence بدون reviewer child؛ وبعد نجاحهما اشتق أو حدّث graph ثم دع Loop يصدر combined planning review واحدا.
- استخدم `ospec execute status [changes/active/<goal>]` أو `ospec execute next [changes/active/<goal>]` لفحص حالة Goal controller والمهام التالية الآمنة للتوزيع. عندما تريد حفظ أمر OSpec التالي الموصى به للتسليم، استخدم `ospec execute route [changes/active/<goal>]` لكتابة `artifacts/agents/workflow-route.json` و`workflow-route.md`.
- عندما يحتاج direction أو architecture أو API أو UI أو risk أو scope إلى user choice صريح، استخدم `ospec execute decision [changes/active/<change>] ...`. تظهر required pending decision في `bootstrap` و`status` و`finish`، وتمنع worker dispatch حتى تسجل `--select <option-id> --answered-by user` أو `--skip` مقصودا مع provenance نفسها.
- قبل handoff إلى worker استخدم `ospec execute workspace [changes/active/<change>]` لتسجيل `artifacts/agents/workspace-status.json` و`artifacts/agents/workspace-status.md`. إذا كانت الحالة `needs_isolation`، نظّف workspace أو انقل العمل إلى git worktree معزول قبل parallel dispatch.
- قبل إنشاء git worktree معزول، استخدم `ospec execute worktree [changes/active/<change>] [--branch name] [--path path] [--base ref]` لتسجيل `artifacts/agents/worktree-plan.json` و`artifacts/agents/worktree-plan.md`. يسجل plan mode branch وpath وbase ref ونص الأوامر المقترحة فقط ولا يشغّل git.
- استخدم `ospec execute worktree [changes/active/<change>] --create ...` فقط عندما تريد صراحة أن يشغّل OSpec `git worktree add`. تسجل النتيجة تحت `artifacts/agents/worktree-runs/`.
- استخدم `ospec execute worktree [changes/active/<change>] --cleanup [--path path]` فقط عندما تريد صراحة أن يشغّل OSpec `git worktree remove`. لا يحذف cleanup الفروع ولا يعمل push أو merge أو archive أو tests.
- قبل الإغلاق النهائي، استخدم `ospec execute finish [changes/active/<change>] [--target main] [--remote origin]` لتسجيل `artifacts/agents/finish-plan.json` و`artifacts/agents/finish-plan.md`. يفحص task graph وreviews وverification evidence وworker status ونظافة git، ثم يسجل الأوامر المقترحة فقط ولا ينفذها. عندما تكون finish plan جاهزة ولا توجد required pending decision، تابع بتنفيذ `ospec finalize [changes/active/<change>]`؛ `ospec archive ... --check` هو معاينة dry-run اختيارية فقط.
- استخدم `ospec execute dispatch [changes/active/<change>] [--task task-id] [--limit N]` لإنشاء batch آمن للتوازي من worker packets داخل `artifacts/agents/dispatches/*` و`artifacts/agents/execution-session.json`. يتضمن كل packet project session brief snapshot وworker profile يوضح capability tier وrecommended target وtarget tool mapping وrationale وrequired behavior لتوجيه المهام المعقدة إلى worker أقوى والمهام البسيطة إلى worker أخف. ثم استخدم `ospec execute complete <task-id> ...` لتسجيل نتيجة worker. استخدم `--task` لمهمة واحدة صريحة و`--limit` لتحديد حجم batch. يقوم الأمران أيضا بمزامنة `artifacts/agents/worker-status.md`؛ وعندما تسجل completion الحالة `NEEDS_CONTEXT` أو `BLOCKED` يكتب OSpec ملفات escalation تحت `artifacts/agents/blockers/` لمتابعة controller.
- بعد dispatch، استخدم `ospec execute launch [changes/active/<change>] [--task task-id] [--target codex|gpt|claude|gemini|grok|opencode|cursor|copilot] [--dry-run]` لكتابة agent launch plan. يقبل `runtimeAdapter` فقط model-native subagent capability حالية ومرتبطة بالـ target ويعرض native primitive. لا يشغّل OSpec worker process بنفسه.
- نفّذ `runtimeAdapter.selected.nativeSubagent` وشغّل safe batch فقط بالتوازي. عند غياب capability أو انتهاء صلاحيتها يجب block من دون agent CLI أو current-controller fallback.
- لا يوجد مسار agent CLI execution. لم يعد الأمران `execute orchestrate` و`loop watch` موجودين أصلاً، بينما يرفض `launch --run --command` / `review --run --command` هذه الـ flags قبل تشغيل process أو إنشاء run artifact.
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
- لا تعدّل أوامر artifact في `ospec execute` ملفات source مباشرة. يوزّع current model controller implementation/task/final review workers فقط عبر `runtimeAdapter.selected.nativeSubagent`. لا يشغّل OSpec agent CLI.
- قيم حالة worker هي `DONE` و`DONE_WITH_CONCERNS` و`NEEDS_CONTEXT` و`BLOCKED` و`PENDING`؛ ويتطلب الاكتمال حل حالات worker وأن تكون `controller_status` مساوية لـ `DONE`.
- في profile `change` يتطلب `ospec verify [changes/active/<change>]` ملفات classic فقط. وفي profile `goal` يتطلب أيضا `design.md` و`implementation-plan.md` و`artifacts/agents/task-graph.json` وdocument review artifacts وfinal review artifacts وverification evidence و`artifacts/agents/worker-status.md`.
- اجعل `design.md` موجزا؛ دوره رفع دقة تقسيم المهام، وليس استبدال وثائق المشروع طويلة الأمد.

تستخدم المشاريع الجديدة التي تُهيَّأ عبر `ospec init [path]` تخطيط nested افتراضيا. يبقى في جذر المستودع فقط `.skillrc` و `README.md`، بينما تنتقل بقية ملفات OSpec المُدارة إلى `.ospec/`.
ولا ينشئ `init` العادي خرائط معرفة اختيارية مثل `.ospec/knowledge/src/` أو `.ospec/knowledge/tests/` بشكل افتراضي.
وما زال سطر الأوامر يقبل الاختصارات مثل `changes/active/<change>`، لكن المسار الفعلي داخل المشاريع nested هو `.ospec/changes/active/<change>`.
ولترحيل مشروع classic قديم إلى التخطيط الجديد، شغّل صراحة `ospec layout migrate --to nested`.

## من Session Hook إلى Finish للـ Goal

استخدم هذا المسار عندما يقود AI harness ‏Goal نشطا واحدا مع قرارات مستخدم محفوظة وruntime evidence؛ لا يدخل Change الكلاسيكي في controller flow:

1. شغّل `ospec session hook [path]` بعد تحديث المشروع، ثم اجعل harness يحقن `.ospec/hooks/using-ospec.md` عند session start.
2. عند استئناف Goal شغّل `ospec execute bootstrap [changes/active/<goal>]` واتبع next instruction قبل dispatch العمل.
3. إذا أظهر bootstrap أو status وجود pending decision، افتح `artifacts/agents/decisions/index.md`، واعرض `Chat Prompt` من decision report على المستخدم، ثم سجّل الإجابة عبر `ospec execute decision [changes/active/<change>] --id <id> --select <option-id> --answered-by user`.
4. شغّل `ospec execute workspace [changes/active/<change>]` ثم `ospec execute dispatch [changes/active/<change>]`. استخدم `ospec execute launch ... --json` لقراءة native subagent contract، ثم dispatch عبر current model harness وسجّل real child result.
5. استخدم `ospec execute status` و`ospec execute next` و`ospec execute finish` لتأكيد جاهزية closeout. يتم حجب finish وverify وarchive حتى تُحل required decisions.

## تحديث مشروع موجود

البرومبت الموصى به:

```text
/ospec حدّث أو أصلح طبقة معرفة المشروع لهذا الدليل. لا تنشئ change بعد.
```

```bash
npm install -g @clawplays/ospec-cli@2.0.0
ospec update [path]
```

إذا كنت قد ثبت الأداة محليا من هذا المستودع:

```bash
npm install -g .
ospec update [path]
```

يقوم `ospec update [path]` بتحديث وثائق البروتوكول والأدوات والمهارات المُدارة وبيانات تخطيط الأرشفة.
كما يمكنه إصلاح مشاريع OSpec القديمة التي ما زالت تحتفظ ببصمة OSpec ولكنها تفتقد بعض المجلدات الأساسية الأحدث، كما ينقل `build-index-auto.*` من الجذر إلى `.ospec/tools/`.
وإذا ظل مشروع nested يحتوي على أدلة معرفة قديمة تحت `.ospec/src/` أو `.ospec/tests/` فإن `ospec update [path]` ينقلها إلى `.ospec/knowledge/src/` و `.ospec/knowledge/tests/`.
ولا يرقّي CLI نفسه.
ولا يرحّل active / queued changes تلقائيا.

يقوم `ospec update [path]` فقط بإصلاح المشروع الحالي وتحديثه، لكنه لا يحول تخطيط classic إلى nested تلقائيا. وعندما تريد تغيير التخطيط استخدم `ospec layout migrate --to nested`.
