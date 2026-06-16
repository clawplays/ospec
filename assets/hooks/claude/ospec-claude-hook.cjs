#!/usr/bin/env node
/**
 * OSpec Claude Code hook — managed by OSpec (`ospec session hook`).
 *
 * Hard-enforces the OSpec harness contract inside Claude Code:
 *   - SessionStart / UserPromptSubmit: injects the Announce-Before-Act and
 *     Brainstorm-First contract (re-affirmed every turn, not just when a skill
 *     is read), plus any pending required decisions.
 *   - PreToolUse(Task): announces every subagent dispatch, and BLOCKS dispatch
 *     while a required decision is still pending.
 *   - PreToolUse(Bash) for `ospec ...`: announces the command. Shell-executing
 *     fallbacks (`--run`, `orchestrate`) escalate to a user prompt instead of
 *     auto-allowing arbitrary shell.
 *
 * Standalone: depends only on Node built-ins so it runs in any project.
 * Fails open: any error exits 0 so a hook problem never blocks a session.
 */
'use strict';

const fs = require('fs');
const path = require('path');

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch (_error) {
    return '';
  }
}

function emit(payload) {
  process.stdout.write(JSON.stringify(payload));
}

function findActiveChangeDirs(cwd) {
  const roots = [
    path.join(cwd, '.ospec', 'changes', 'active'),
    path.join(cwd, 'changes', 'active'),
  ];
  const dirs = [];
  for (const root of roots) {
    let entries = [];
    try {
      entries = fs.readdirSync(root, { withFileTypes: true });
    } catch (_error) {
      continue;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        dirs.push(path.join(root, entry.name));
      }
    }
  }
  return dirs;
}

function pendingRequiredDecisions(cwd) {
  const pending = [];
  for (const dir of findActiveChangeDirs(cwd)) {
    const decisionsDir = path.join(dir, 'artifacts', 'agents', 'decisions');
    let files = [];
    try {
      files = fs.readdirSync(decisionsDir);
    } catch (_error) {
      continue;
    }
    for (const file of files) {
      if (!file.endsWith('.json') || file === 'index.json') {
        continue;
      }
      try {
        const record = JSON.parse(
          fs.readFileSync(path.join(decisionsDir, file), 'utf8'),
        );
        if (record && record.status === 'PENDING' && record.required === true) {
          pending.push({
            id: String(record.id || file.replace(/\.json$/, '')),
            question: String(record.question || ''),
            change: path.basename(dir),
          });
        }
      } catch (_error) {
        // ignore malformed decision records
      }
    }
  }
  return pending;
}

const CONTRACT = [
  'OSpec is active in this project. Follow two contracts on every turn:',
  '- `Announce-Before-Act`: state in one line which OSpec skill and stage you are in, which `ospec execute ...` command you are about to run and the artifact it writes, and how many subagents you dispatch (and why) before each Task.',
  '- `Brainstorm-First`: before locking design, surface open decisions for direction, architecture, API, data, UI, risk, and scope and ask the user one at a time using the native question UI (AskUserQuestion), then record the answer with `ospec execute decision ... --select <option-id>`. Prefer a durable decision gate over a silent assumption.',
].join('\n');

function decisionReminder(pending) {
  if (pending.length === 0) {
    return '';
  }
  const lines = pending.map(
    (decision) =>
      `- [${decision.change}] ${decision.id}: ${decision.question} -> ask the user, then \`ospec execute decision --id ${decision.id} --select <option-id>\``,
  );
  return `\n\nPENDING REQUIRED DECISION(S) — resolve before dispatching workers:\n${lines.join('\n')}`;
}

function handleContextEvent(event, cwd) {
  const context = CONTRACT + decisionReminder(pendingRequiredDecisions(cwd));
  emit({
    hookSpecificOutput: {
      hookEventName: event,
      additionalContext: context,
    },
  });
}

function denyTask(pending) {
  const ids = pending.map((decision) => decision.id).join(', ');
  const reason = `🛑 OSpec: ${pending.length} required decision(s) pending — resolve before dispatching subagents: ${ids}. Ask the user, then record with \`ospec execute decision --id <id> --select <option-id>\`.`;
  emit({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  });
}

function allowWithReason(reason) {
  emit({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
      permissionDecisionReason: reason,
    },
  });
}

function askWithReason(reason) {
  emit({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'ask',
      permissionDecisionReason: reason,
    },
  });
}

function handlePreToolUse(input, cwd) {
  const toolName = input.tool_name;
  const toolInput = input.tool_input || {};

  if (toolName === 'Task') {
    const pending = pendingRequiredDecisions(cwd);
    if (pending.length > 0) {
      denyTask(pending);
      return;
    }
    const label = String(
      toolInput.description || toolInput.subagent_type || 'subagent',
    ).slice(0, 200);
    allowWithReason(`🤖 OSpec: dispatching subagent — ${label}`);
    return;
  }

  if (toolName === 'Bash') {
    const command = String(toolInput.command || '').trim();
    if (/^ospec(\.cmd|\.exe)?(\s|$)/.test(command)) {
      // Only a clean single `ospec` invocation is auto-announced. A command that
      // chains, pipes, or redirects (e.g. `ospec status && rm -rf x`) must fall
      // through to the normal permission flow so the rest is never auto-approved.
      if (/[&;|`<>]|\$\(|\n/.test(command)) {
        process.exit(0);
      }
      // Shell-executing fallbacks should still get an explicit user prompt
      // rather than auto-approving arbitrary shell.
      if (/\s--run(\s|$)|\sorchestrate(\s|$)/.test(command)) {
        askWithReason(
          `⚠️ OSpec: command runs a shell fallback — confirm: ${command.slice(0, 200)}`,
        );
        return;
      }
      allowWithReason(`⚙️ OSpec: running — ${command.slice(0, 200)}`);
      return;
    }
  }

  // No decision for any other tool/command.
  process.exit(0);
}

function main() {
  let input = {};
  try {
    input = JSON.parse(readStdin() || '{}');
  } catch (_error) {
    input = {};
  }
  const event = input.hook_event_name;
  const cwd = input.cwd || process.cwd();

  if (event === 'SessionStart' || event === 'UserPromptSubmit') {
    handleContextEvent(event, cwd);
    return;
  }
  if (event === 'PreToolUse') {
    handlePreToolUse(input, cwd);
    return;
  }
  process.exit(0);
}

try {
  main();
} catch (_error) {
  process.exit(0);
}
