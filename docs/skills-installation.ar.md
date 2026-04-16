# تثبيت المهارات

إذا كنت تستخدم OSpec أساسا عبر AI فابدأ أولا بالمطالبتين القصيرتين `/ospec` و `/ospec-change`، واستخدم أوامر المهارات الصريحة في هذه الصفحة فقط عندما تحتاج إلى تثبيت مباشر أو مزامنة أو استكشاف.

المطالبات الموصى بها:

```text
/ospec هيّئ هذا المشروع.
/ospec حدّث أو أصلح طبقة معرفة المشروع لهذا الدليل. لا تنشئ change بعد.
/ospec-change أنشئ تغييرا لهذا المتطلب وادفعه إلى الأمام.
```

المهارات المُدارة:

- `ospec`
- `ospec-change`

تتم مزامنة هاتين المهارتين تلقائيا بواسطة:

- `npm install -g .`
- `ospec init [path]`
- `ospec update [path]`

يقوم `ospec init` و `ospec update` دائما بمزامنة Codex. كما تتم مزامنة Claude Code أيضا عند وجود `CLAUDE_HOME` أو مجلد `~/.claude`.

بالنسبة إلى المشاريع الموجودة، يقوم `ospec update [path]` أيضا بإصلاح آثار OSpec القديمة، وإعادة تثبيت الحزم المفقودة للإضافات المفعلة في المشروع الحالي، وترقية تلك الحزم تلقائيا عندما يتوفر إصدار متوافق أحدث.
ولا يقوم بتحديث الإضافات العالمية غير المفعلة في المشروع الحالي.
أما إذا أردت تحديث كل الإضافات المثبتة على الجهاز، فاستخدم `ospec plugins update --all` صراحة.

## Codex

التحقق من مهارة مُدارة واحدة:

```bash
ospec skill status ospec
ospec skill status ospec-change
```

تثبيت أو مزامنة مهارة مُدارة واحدة صراحة:

```bash
ospec skill install ospec
ospec skill install ospec-change
```

الموقع الافتراضي:

```text
~/.codex/skills/
```

تثبيت مهارة أخرى صراحة:

```bash
ospec skill install ospec-init
```

## Claude Code

التحقق من مهارة مُدارة واحدة:

```bash
ospec skill status-claude ospec
ospec skill status-claude ospec-change
```

تثبيت أو مزامنة مهارة مُدارة واحدة صراحة:

```bash
ospec skill install-claude ospec
ospec skill install-claude ospec-change
```

الموقع الافتراضي:

```text
~/.claude/skills/
```

تثبيت مهارة أخرى صراحة:

```bash
ospec skill install-claude ospec-init
```

## تسمية المطالبات

استخدم `/ospec` في المطالبات الجديدة.

استخدم `/ospec-change` عندما يكون قصد المستخدم تحديدا هو "إنشاء change أو دفعه للأمام".

استخدم `/ospec-cli` فقط عندما تكون هناك عادات أو أتمتة قديمة ما زالت تشير إلى الاسم القديم.
