#!/usr/bin/env node

const { SkillCommand } = require('../dist/commands/SkillCommand');

function isGlobalInstall() {
  const globalFlag = String(process.env.npm_config_global || '').toLowerCase();
  const location = String(process.env.npm_config_location || '').toLowerCase();
  return globalFlag === 'true' || location === 'global';
}

function shouldSkip() {
  if (process.env.CI === 'true' || process.env.CI === '1') {
    return true;
  }

  if (!isGlobalInstall()) {
    return true;
  }

  return false;
}

function getManagedSkillNames() {
  return ['ospec', 'ospec-change'];
}

async function installManagedSkill(provider, skillName) {
  const skillCommand = new SkillCommand();
  const result = await skillCommand.installSkill(provider, skillName);
  console.log(
    `[ospec] installed ${provider} skill ${skillName}: ${result.targetDir}`,
  );
}

async function main() {
  try {
    if (shouldSkip()) {
      return;
    }

    for (const skillName of getManagedSkillNames()) {
      await installManagedSkill('codex', skillName);
      await installManagedSkill('claude', skillName);
    }
  } catch (error) {
    console.log(`[ospec] managed skill sync skipped: ${error.message}`);
    console.log(
      'Tip: rerun `npm install -g .` to retry the automatic ospec / ospec-change skill sync.',
    );
  }
}

main();
