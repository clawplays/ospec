# تثبيت المهارات (Skills Installation)

المهارات المدارة:

- `ospec`
- `ospec-change`

يتم مزامنة هاتين المهارتين تلقائياً بواسطة:

- `npm install -g .`
- `ospec init [path]`
- `ospec update [path]`

## Codex

التحقق من مهارة مدارة واحدة:

```bash
ospec skill status ospec
ospec skill status ospec-change
```

تثبيت أو مزامنة مهارة مدارة واحدة صراحة:

```bash
ospec skill install ospec
ospec skill install ospec-change
```

الموقع الافتراضي:

```text
~/.codex/skills/
```

## Claude Code

التحقق من مهارة مدارة واحدة:

```bash
ospec skill status-claude ospec
ospec skill status-claude ospec-change
```

تثبيت أو مزامنة مهارة مدارة واحدة صراحة:

```bash
ospec skill install-claude ospec
ospec skill install-claude ospec-change
```

الموقع الافتراضي:

```text
~/.claude/skills/
```

## تسمية الأوامر

يفضل استخدام `$ospec` في الأوامر الجديدة.

استخدم `$ospec-change` عندما تكون نية المستخدم تحديداً هي "إنشاء أو تطوير تغيير".
