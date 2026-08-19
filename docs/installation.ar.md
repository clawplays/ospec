# التثبيت

إذا كنت تستخدم OSpec أساسا عبر AI / `/ospec` فابدأ أولا ببرومبت قصير مثل `/ospec`، واستخدم أوامر CLI في هذه الصفحة عندما تحتاج إلى تثبيت محلي صريح أو إلى الاستكشاف.

يتم تثبيت OSpec عبر حزمة CLI الرسمية `@clawplays/ospec-cli` ويعمل من خلال الأمر `ospec`.

## المتطلبات

- Node.js `>= 18`
- npm `>= 8`

## التثبيت من npm

```bash
npm install -g @clawplays/ospec-cli
```

## التحقق

```bash
ospec --version
ospec --help
```

## المهارات المُدارة

- يقوم `ospec init [path]` و `ospec update [path]` بمزامنة المهارات المُدارة `ospec` و `ospec-change` و `ospec-goal` لـ Codex
- إذا وُجد `CLAUDE_HOME` أو مجلد `~/.claude` فستتم المزامنة أيضا إلى Claude Code
