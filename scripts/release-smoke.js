#!/usr/bin/env node



const fs = require('fs-extra');

const os = require('os');

const path = require('path');

const { spawnSync } = require('child_process');



const rootDir = path.resolve(__dirname, '..');

const cliPath = path.join(rootDir, 'dist', 'cli.js');

const packageJson = require(path.join(rootDir, 'package.json'));



function run(command, args, options = {}) {

  const result = spawnSync(command, args, {

    cwd: options.cwd || rootDir,

    encoding: 'utf8',

    shell: options.shell ?? false,

  });



  const output = `${result.stdout || ''}${result.stderr || ''}`.trim();



  if (result.status !== 0) {

    throw new Error(`Command failed: ${command} ${args.join(' ')}\n${output}`);

  }



  return output;

}



function runExpectFailure(command, args, options = {}) {

  const result = spawnSync(command, args, {

    cwd: options.cwd || rootDir,

    encoding: 'utf8',

    shell: options.shell ?? false,

  });



  const output = `${result.stdout || ''}${result.stderr || ''}`.trim();



  if (result.status === 0) {

    throw new Error(`Expected command to fail: ${command} ${args.join(' ')}\n${output}`);

  }



  return output;

}



function runNpm(args, options = {}) {

  if (process.platform === 'win32') {

    return run('cmd.exe', ['/d', '/s', '/c', 'npm', ...args], options);

  }



  return run('npm', args, options);

}



function assertContains(output, expected, label) {

  if (!output.includes(expected)) {

    throw new Error(`Expected ${label} to include "${expected}"\nActual output:\n${output}`);

  }

}



function assertNotContains(output, unexpected, label) {

  if (output.includes(unexpected)) {

    throw new Error(`Expected ${label} to exclude "${unexpected}"\nActual output:\n${output}`);

  }

}



function toPosixRelative(from, to) {

  return path.relative(from, to).replace(/\\/g, '/');

}



async function findArchivedChangeDir(archivedRoot, changeName) {

  if (!(await fs.pathExists(archivedRoot))) {

    return null;

  }



  const entries = await fs.readdir(archivedRoot, { withFileTypes: true });

  for (const entry of entries) {

    if (!entry.isDirectory()) {

      continue;

    }



    const entryPath = path.join(archivedRoot, entry.name);

    const statePath = path.join(entryPath, 'state.json');

    if (await fs.pathExists(statePath)) {

      const state = await fs.readJson(statePath);

      if (state.feature === changeName && state.status === 'archived') {

        return entryPath;

      }

    }



    const nestedMatch = await findArchivedChangeDir(entryPath, changeName);

    if (nestedMatch) {

      return nestedMatch;

    }

  }



  return null;

}



async function main() {

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ospec-release-smoke-'));
  const projectDir = path.join(tempDir, 'project with spaces');

  const tempSkillDir = path.join(tempDir, 'codex-skill');

  const tempClaudeSkillDir = path.join(tempDir, 'claude-skill');



  try {

    console.log(`[release:smoke] using temp dir: ${tempDir}`);



    let output = run('node', [cliPath, '--help']);

    assertContains(output, `OSpec CLI v${packageJson.version}`, 'root help');



    output = runNpm(['pack', '--dry-run']);

    assertContains(output, 'SKILL.md', 'npm pack contents');

    assertContains(output, 'skill.yaml', 'npm pack contents');

    assertContains(output, 'agents/openai.yaml', 'npm pack contents');



    output = run('node', [cliPath, 'docs', '--help']);

    assertContains(output, 'ospec docs status', 'docs help');



    output = run('node', [cliPath, 'skills', '--help']);

    assertContains(output, 'ospec skills status', 'skills help');



    output = run('node', [cliPath, 'index', '--help']);

    assertContains(output, 'ospec index build', 'index help');



    output = run('node', [cliPath, 'workflow', '--help']);

    assertContains(output, 'ospec workflow show', 'workflow help');



    output = run('node', [cliPath, 'batch', '--help']);

    assertContains(output, 'ospec batch stats', 'batch help');



    output = run('node', [cliPath, 'queue', '--help']);

    assertContains(output, 'ospec queue add', 'queue help');



    output = run('node', [cliPath, 'run', '--help']);

    assertContains(output, 'ospec run start', 'run help');



    output = run('node', [cliPath, 'skill', 'install', tempSkillDir]);

    assertContains(output, 'Installed ospec Codex skill: ospec-change', 'skill install output');



    output = run('node', [cliPath, 'skill', 'status', tempSkillDir]);

    assertContains(output, 'Codex Skill Status', 'skill status output');

    assertContains(output, 'Skill: ospec-change', 'skill name output');

    assertContains(output, 'agents/openai.yaml: present', 'skill metadata output');

    assertContains(output, 'In sync: yes', 'skill sync output');



    const installedSkillMd = await fs.readFile(path.join(tempSkillDir, 'SKILL.md'), 'utf8');

    assertContains(installedSkillMd, 'name: ospec-change', 'installed SKILL.md');

    assertContains(installedSkillMd, 'Use this skill when the user says things like "use ospec change to do a requirement".', 'installed SKILL.md');



    output = run('node', [cliPath, 'skill', 'install', 'ospec-init', path.join(tempDir, 'codex-ospec-init')]);

    assertContains(output, 'Installed ospec Codex skill: ospec-init', 'explicit skill install output');

    assertContains(

      await fs.readFile(path.join(tempDir, 'codex-ospec-init', 'skill.yaml'), 'utf8'),

      'name: ospec-init',

      'installed init skill.yaml'

    );



    output = run('node', [cliPath, 'skill', 'install-claude', tempClaudeSkillDir]);

    assertContains(output, 'Installed ospec Claude Code skill: ospec-change', 'claude skill install output');



    output = run('node', [cliPath, 'skill', 'status-claude', tempClaudeSkillDir]);

    assertContains(output, 'Claude Code Skill Status', 'claude skill status output');

    assertContains(output, 'Skill: ospec-change', 'claude skill name output');

    assertContains(output, 'SKILL.md: present', 'claude skill file output');

    assertContains(output, 'In sync: yes', 'claude skill sync output');



    const installedClaudeSkillMd = await fs.readFile(

      path.join(tempClaudeSkillDir, 'SKILL.md'),

      'utf8'

    );

    assertContains(installedClaudeSkillMd, 'name: ospec-change', 'installed Claude SKILL.md');

    if (await fs.pathExists(path.join(tempClaudeSkillDir, 'skill.yaml'))) {

      throw new Error('Claude skill package should not include skill.yaml');

    }

    output = run('node', [cliPath, 'skill', 'install-claude', 'ospec-init', path.join(tempDir, 'claude-ospec-init')]);

    assertContains(output, 'Installed ospec Claude Code skill: ospec-init', 'explicit claude skill install output');

    if (!(await fs.pathExists(path.join(tempDir, 'claude-ospec-init', 'SKILL.md')))) {

      throw new Error('Claude explicit skill install should include SKILL.md');

    }



    output = run('node', [cliPath, 'init', projectDir]);

    assertContains(output, 'Project initialized to change-ready state', 'init output');
    assertContains(output, 'Protocol shell: created', 'init protocol shell output');
    assertContains(output, `Next: ospec new <change-name> "${projectDir}"`, 'init next command output');



    output = run('node', [cliPath, 'queue', 'add', 'queued-smoke', projectDir]);

    assertContains(output, 'Queued change queued-smoke created', 'queue add output');



    output = run('node', [cliPath, 'queue', 'status', projectDir]);

    assertContains(output, 'queued-smoke', 'queue status output');



    output = run('node', [cliPath, 'status', projectDir]);

    assertContains(output, 'Project Status', 'status output');



    output = run('node', [cliPath, 'docs', 'status', projectDir]);

    assertContains(output, 'Docs Status', 'docs status output');



    output = run('node', [cliPath, 'skills', 'status', projectDir]);

    assertContains(output, 'Skills Status', 'skills status output');



    output = run('node', [cliPath, 'index', 'check', projectDir]);

    assertContains(output, 'Index Status', 'index status output');



    output = run('node', [cliPath, 'new', 'release-smoke', projectDir]);

    assertContains(output, 'Change release-smoke created', 'new change output');
    output = runExpectFailure('node', [cliPath, 'new', 'second-active', projectDir]);
    assertContains(output, `ospec progress "${path.join(projectDir, 'changes', 'active', 'release-smoke')}"`, 'quoted progress suggestion');
    assertContains(output, `ospec queue add second-active "${projectDir}"`, 'quoted queue suggestion');



    const featureDir = path.join(projectDir, 'changes', 'active', 'release-smoke');

    const statePath = path.join(featureDir, 'state.json');

    const proposalPath = path.join(featureDir, 'proposal.md');

    const tasksPath = path.join(featureDir, 'tasks.md');

    const verificationPath = path.join(featureDir, 'verification.md');

    const reviewPath = path.join(featureDir, 'review.md');

    const projectOverviewPath = path.join(projectDir, 'docs', 'project', 'overview.md');

    const activeOverviewLink = `[docs/project/overview.md](${toPosixRelative(featureDir, projectOverviewPath)})`;

    assertContains(await fs.readFile(proposalPath, 'utf8'), activeOverviewLink, 'proposal link');

    const tasksContent = await fs.readFile(tasksPath, 'utf8');

    assertContains(tasksContent, activeOverviewLink, 'tasks link');

    assertContains(tasksContent, '- [ ] Implement the change', 'tasks checklist format');

    assertNotContains(tasksContent, '- [ ] 1.', 'tasks hybrid checklist numbering');

    assertContains(await fs.readFile(verificationPath, 'utf8'), activeOverviewLink, 'verification link');

    assertContains(await fs.readFile(reviewPath, 'utf8'), activeOverviewLink, 'review link');

    const state = await fs.readJson(statePath);

    state.status = 'ready_to_archive';

    state.current_step = 'ready_to_archive';

    state.completed = [
      'proposal_complete',
      'tasks_complete',
      'implementation_complete',
      'skill_updated',
      'index_regenerated',
      'verification_passed',
    ];

    state.pending = ['tests_passed', 'archived'];

    state.blocked_by = [];

    await fs.writeJson(statePath, state, { spaces: 2 });

    await fs.writeFile(tasksPath, (await fs.readFile(tasksPath, 'utf8')).replace(/- \[ \]/g, '- [x]'), 'utf8');

    await fs.writeFile(verificationPath, (await fs.readFile(verificationPath, 'utf8')).replace(/- \[ \]/g, '- [x]'), 'utf8');



    output = run('node', [cliPath, 'finalize', featureDir]);

    assertContains(output, 'Change finalized:', 'finalize output');

    const archivedFeatureDir = await findArchivedChangeDir(path.join(projectDir, 'changes', 'archived'), 'release-smoke');

    if (!archivedFeatureDir) {

      throw new Error('Expected release-smoke to be archived');

    }



    const archivedOverviewLink = `[docs/project/overview.md](${toPosixRelative(archivedFeatureDir, projectOverviewPath)})`;

    assertContains(await fs.readFile(path.join(archivedFeatureDir, 'proposal.md'), 'utf8'), archivedOverviewLink, 'archived proposal link');

    assertContains(await fs.readFile(path.join(archivedFeatureDir, 'tasks.md'), 'utf8'), archivedOverviewLink, 'archived tasks link');

    assertContains(await fs.readFile(path.join(archivedFeatureDir, 'verification.md'), 'utf8'), archivedOverviewLink, 'archived verification link');

    assertContains(await fs.readFile(path.join(archivedFeatureDir, 'review.md'), 'utf8'), archivedOverviewLink, 'archived review link');

    output = run('node', [cliPath, 'queue', 'next', projectDir]);

    assertContains(output, 'Activated next queued change: queued-smoke', 'queue next output');

    const activatedQueuedDir = path.join(projectDir, 'changes', 'active', 'queued-smoke');

    const queuedOverviewLink = `[docs/project/overview.md](${toPosixRelative(activatedQueuedDir, projectOverviewPath)})`;

    assertContains(await fs.readFile(path.join(activatedQueuedDir, 'tasks.md'), 'utf8'), queuedOverviewLink, 'activated queued change link');



    console.log('[release:smoke] all checks passed');

  } finally {

    await fs.remove(tempDir);

  }

}



main().catch(error => {

  console.error(`[release:smoke] ${error.message}`);

  process.exit(1);

});
