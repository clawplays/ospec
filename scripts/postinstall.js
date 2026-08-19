#!/usr/bin/env node

/*
 * M-misc3: these three `require`s were at module scope, above `main`, outside
 * its try, and evaluated before `shouldSkip()` ran.
 *
 * npm runs this file for EVERY install of the package. A top-level require
 * that throws is an uncaught exception, and npm reports a failed postinstall
 * as a failed install -- so anything that makes `dist/` unloadable takes the
 * user's `npm install` down with it, even though this script's own contract
 * is "best effort, skip quietly on any problem". `main` already knows that:
 * its catch prints "managed skill sync skipped" and returns 0.
 *
 * Ways `dist/` is unloadable at this point that are not hypothetical: a
 * partially-extracted tarball, an install from a git checkout where `dist/`
 * has not been built, a Node version the emitted syntax does not parse on, and
 * a local `npm install <folder>` against a tree mid-rebuild.
 *
 * The guard now runs FIRST -- for a non-global or CI install nothing is loaded
 * at all, which is the overwhelming majority of installs -- and the require
 * happens inside `main`'s try, where a failure lands in the same handler as
 * every other failure.
 */

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
  return ['ospec', 'ospec-change', 'ospec-goal'];
}

/** Loads the built CLI. Only ever called from inside `main`'s try. */
function loadDist() {
  const { SkillCommand } = require('../dist/commands/SkillCommand');
  const { FileService } = require('../dist/services/FileService');
  const {
    PostSyncMaintenanceService,
  } = require('../dist/services/PostSyncMaintenanceService');
  return { SkillCommand, FileService, PostSyncMaintenanceService };
}

async function installManagedSkill(dist, provider, skillName) {
  const skillCommand = new dist.SkillCommand();
  const result = await skillCommand.installSkill(provider, skillName);
  console.log(
    `[ospec] installed ${provider} skill ${skillName}: ${result.targetDir}`,
  );
}

async function runPostSyncMaintenance(dist) {
  const maintenanceService = new dist.PostSyncMaintenanceService(
    new dist.FileService(),
  );
  const result = await maintenanceService.runManagedSkillPostprocessing();
  if (result.removedPaths.length > 0) {
    console.log(
      `[ospec] removed ${result.removedPaths.length} stale plugin skill entr${result.removedPaths.length === 1 ? 'y' : 'ies'}`,
    );
  }
}

async function main() {
  try {
    // Guard first: a non-global or CI install loads nothing at all.
    if (shouldSkip()) {
      return;
    }

    const dist = loadDist();

    for (const skillName of getManagedSkillNames()) {
      await installManagedSkill(dist, 'codex', skillName);
      await installManagedSkill(dist, 'claude', skillName);
    }

    await runPostSyncMaintenance(dist);
  } catch (error) {
    console.log(`[ospec] managed skill sync skipped: ${error.message}`);
    console.log(
      'Tip: rerun `npm install -g .` to retry the automatic ospec / ospec-change / ospec-goal skill sync.',
    );
  }
}

/*
 * `main` cannot reject -- everything inside is in the try above -- but the
 * `.catch` is here anyway. An unhandled rejection is a non-zero exit under
 * Node 15+, and this file's entire contract is that it never fails an install.
 */
main().catch((error) => {
  console.log(`[ospec] managed skill sync skipped: ${error.message}`);
});
