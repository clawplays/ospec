import { describe, expect, it } from 'vitest';

import { TemplateGenerator } from '../dist/services/TemplateGenerator.js';
import { services } from '../dist/services/index.js';

const languages = ['zh-CN', 'en-US', 'ja-JP', 'ar'];

describe('tasks template checklist format', () => {
  for (const language of languages) {
    it(`uses a pure checklist structure for ${language}`, () => {
      const output = services.templateEngine.generateTasksTemplate({
        feature: 'demo-change',
        documentLanguage: language,
        projectRoot: 'C:/repo',
        documentPath: 'C:/repo/changes/active/demo-change/tasks.md',
        projectContext: {},
        optionalSteps: ['demo-step'],
      });

      expect(output).not.toMatch(/- \[ \] \d+\./);
      expect(output).toMatch(/- \[ \] /);
    });
  }

  it('keeps the legacy template generator aligned with pure checklist items', () => {
    const output = TemplateGenerator.generateTasksTemplate(
      'demo-change',
      ['Implement feature', 'Update docs'],
      ['Optional verification'],
    );

    expect(output).not.toMatch(/- \[ \] \d+\./);
    expect(output).toContain('- [ ] Implement feature');
    expect(output).toContain('- [ ] Update docs');
    expect(output).toContain('- [ ] Optional verification');
  });
});
