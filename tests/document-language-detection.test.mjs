import fs from './helpers/fs-compat.mjs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';

import { NewCommand } from '../dist/commands/NewCommand.js';
import { services } from '../dist/services/index.js';

const tempDirs = [];

function trackTempDir(dirPath) {
  tempDirs.push(dirPath);
  return dirPath;
}

async function writeText(filePath, content) {
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, 'utf8');
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dirPath = tempDirs.pop();
    await fs.remove(dirPath);
  }
});

describe('document language detection', () => {
  it('classifies Chinese text with shared kanji terms as zh-CN', () => {
    const content = [
      '# 项目概览',
      '',
      '最近更新记录',
      '这里说明功能范围和后续实现计划。',
    ].join('\n');

    expect(
      services.projectService.detectDocumentLanguageFromText(content),
    ).toBe('zh-CN');
    expect(new NewCommand().detectDocumentLanguageFromText(content)).toBe(
      'zh-CN',
    );
  });

  it('classifies Japanese text with kana as ja-JP', () => {
    const content = [
      '# プロジェクト概要',
      '',
      '最新の更新について説明します。',
      'この機能を追加しました。',
    ].join('\n');

    expect(
      services.projectService.detectDocumentLanguageFromText(content),
    ).toBe('ja-JP');
    expect(new NewCommand().detectDocumentLanguageFromText(content)).toBe(
      'ja-JP',
    );
  });

  it('votes across multiple documents instead of returning the first detected language', () => {
    const language = services.projectService.detectDocumentLanguageFromTexts([
      '# README\n\nProject overview in English.',
      '# 项目概览\n\n最近更新记录。',
      '# 技术栈\n\n- Node.js\n- Vitest',
      '# 実行ガイド\n\nテストを実行します。',
    ]);

    expect(language).toBe('zh-CN');
  });

  it('backfills missing documentLanguage as zh-CN during protocol sync for Chinese projects', {
    timeout: 20000,
  }, async () => {
    const projectRoot = trackTempDir(
      await fs.mkdtemp(path.join(os.tmpdir(), 'ospec-language-sync-')),
    );
    const configPath = path.join(projectRoot, '.skillrc');

    await services.projectService.initializeProtocolShellProject(
      projectRoot,
      'full',
    );

    const config = await fs.readJson(configPath);
    delete config.documentLanguage;
    await fs.writeJson(configPath, config, { spaces: 2 });

    await writeText(
      path.join(projectRoot, 'docs', 'project', 'overview.md'),
      ['# 项目概览', '', '最近更新记录。', '这里说明功能边界和实施计划。'].join(
        '\n',
      ),
    );
    await writeText(
      path.join(projectRoot, 'docs', 'project', 'tech-stack.md'),
      ['# 技术栈', '', '- Node.js', '- Vitest', '- 文档自动化脚本'].join('\n'),
    );
    await writeText(
      path.join(projectRoot, 'docs', 'project', 'architecture.md'),
      [
        '# 架构说明',
        '',
        '文档生成、变更管理与校验流程集中在 CLI 服务层。',
      ].join('\n'),
    );
    await writeText(
      path.join(projectRoot, 'README.md'),
      [
        '# 示例项目',
        '',
        '这是一个中文项目，用来验证 update 不会误判为日文。',
      ].join('\n'),
    );
    await writeText(
      path.join(projectRoot, 'for-ai', 'ai-guide.md'),
      ['# AI 协作指南', '', '请先阅读项目概览，再处理更新任务。'].join('\n'),
    );
    await writeText(
      path.join(projectRoot, 'for-ai', 'execution-protocol.md'),
      ['# 执行协议', '', '执行前先确认影响范围，并记录验证结果。'].join('\n'),
    );

    const result =
      await services.projectService.syncProtocolGuidance(projectRoot);
    const nextConfig = await fs.readJson(configPath);

    expect(result.documentLanguage).toBe('zh-CN');
    expect(nextConfig.documentLanguage).toBe('zh-CN');
  });
});
