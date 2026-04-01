# 安装说明

## 环境要求

- Node.js `>= 18`
- npm `>= 8`

## 从当前仓库安装

在 OSpec 发布仓库根目录执行：

```bash
npm install
npm install -g .
```

## 安装后验证

```bash
ospec --version
ospec --help
```

## 可选验证

如果你想先验证发布产物是否可用，可以执行：

```bash
npm run release:smoke
```

## 说明

- `npm install` 用于安装当前发布仓所需运行依赖
- `npm install -g .` 会把当前版本注册为全局 `ospec` 命令，并自动同步 Codex / Claude Code 的托管 skills：`ospec` 与 `ospec-change`
- `ospec init [path]` 与 `ospec update [path]` 也会为 Codex 同步同一组托管 skills；如果检测到 `CLAUDE_HOME` 或已有 `~/.claude` 目录，也会同步到 Claude Code
- 如果本机已经安装过对应的托管 skill，自动同步会直接覆盖到最新版本
- 如果你还需要别的 OSpec skill，请显式指定名字安装，例如 `ospec skill install ospec-init`
- 这个仓库承载的是发布产物和对外文档，不是源码开发流程仓库
