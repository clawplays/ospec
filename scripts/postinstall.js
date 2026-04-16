#!/usr/bin/env node

const { SkillCommand } = require('../dist/commands/SkillCommand');
const { FileService } = require('../dist/services/FileService');
const { PostSyncMaintenanceService } = require('../dist/services/PostSyncMaintenanceService');

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

async function runPostSyncMaintenance() {
  const maintenanceService = new PostSyncMaintenanceService(new FileService());
  const result = await maintenanceService.runManagedSkillPostprocessing();
  if (result.removedPaths.length > 0) {
    console.log(
      `[ospec] removed ${result.removedPaths.length} stale plugin skill entr${result.removedPaths.length === 1 ? 'y' : 'ies'}`,
    );
  }
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

    await runPostSyncMaintenance();
  } catch (error) {
    console.log(`[ospec] managed skill sync skipped: ${error.message}`);
    console.log(
      'Tip: rerun `npm install -g .` to retry the automatic ospec / ospec-change skill sync.',
    );
  }
}

main();
