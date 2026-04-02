# التثبيت

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

- يقوم `ospec init [path]` و `ospec update [path]` بمزامنة المهارتين المُدارتين `ospec` و `ospec-change` لـ Codex
- تتم مزامنة Claude Code أيضًا عند وجود `CLAUDE_HOME` أو مجلد `~/.claude` مسبقًا
- إذا كانت المهارة المُدارة نفسها مثبتة محليًا بالفعل، فسيتم استبدالها بالنسخة المعبأة

إذا كنت تحتاج إلى مهارة OSpec أخرى، فثبّتها صراحةً، مثل:

```bash
ospec skill install ospec-init
```
