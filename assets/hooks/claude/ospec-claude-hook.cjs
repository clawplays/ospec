#!/usr/bin/env node
/**
 * OSpec Claude Code hook — managed by OSpec (`ospec session hook`).
 *
 * Hard-enforces the OSpec harness contract inside Claude Code:
 *   - SessionStart on startup / clear / compact: injects the static
 *     Announce-Before-Act and Brainstorm-First contract once.
 *   - UserPromptSubmit: injects only pending required decisions, when present.
 *   - PreToolUse(Task): announces every subagent dispatch, and BLOCKS dispatch
 *     while a required decision is still pending.
 *   - PreToolUse(Bash) for `ospec ...`: shell-tokenizes the command and only
 *     auto-allows a single plain `ospec` invocation built from constructs the
 *     tokenizer positively recognizes. Anything else escalates to a user
 *     prompt: a shell-executing fallback (`execute orchestrate`, or a `--run`
 *     flag on a subcommand where `--run` is not a run-id selector), a chained /
 *     redirected / substituted command, or a command that cannot be tokenized
 *     unambiguously. See `classifyBashCommand` for the exact policy.
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

// Layered on purpose. The first block is true of every OSpec session; the
// goal block is not. A classic change must not touch the `ospec execute`
// controller layer at all, and `ospec-change` explicitly forbids opening a
// decision gate for routine unambiguous work — so injecting the goal
// controller's obligations unconditionally used to contradict the very skill
// the session was running.
const CONTRACT = [
  'OSpec is active. Every session:',
  '- `Announce-Before-Act`: one line — the OSpec skill and stage, the `ospec` command you are about to run and the artifact it writes, and before each Task how many subagents and why.',
  '- Decisions belong to the user: never auto-select a `recommended` option or resolve a gate yourself. On a genuine fork (mutually exclusive designs/APIs, destructive or hard-to-reverse work, scope conflict) ask with AskUserQuestion, then record it: `ospec execute decision ... --select <option-id> --answered-by user`. Routine unambiguous work takes the reasonable default and records the assumption — no gate.',
  'Goal sessions only (`ospec-goal`): `Brainstorm-First` — before locking design, surface the open decisions (direction, architecture, API, data, UI, risk, scope) and ask one at a time — and announce the selected runtime adapter with each `ospec execute ...` / `ospec loop ...` step. A classic change never uses the `ospec execute` controller layer.',
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
  const pending = pendingRequiredDecisions(cwd);
  const context =
    event === 'SessionStart'
      ? CONTRACT + decisionReminder(pending)
      : decisionReminder(pending).trim();
  if (!context) {
    process.exit(0);
  }
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

// ---------------------------------------------------------------------------
// Shell word scanner — ONE decoding pipeline for every word in the command.
//
// The decision below must be made on the argv a POSIX shell actually delivers,
// not on the raw command string. A regex over the raw string is defeated by any
// quoting or escaping *inside* a flag name — `--r'u'n`, `--ru\n`, `--"run"=x`
// and `--ru""n=x` all reach the CLI as `--run` / `--run=x` after the shell's
// quote removal, while a literal `--run` regex never fires. Exactly the same is
// true of the BINARY word: `"ospec"`, `$'osp\145c'`, `OSPEC`, `./ospec` and
// `env ospec` all execve the same program.
//
// F33: those two problems used to be solved by two different pieces of code —
// `tokenizeShellCommand` for the arguments and a hand-rolled, strictly weaker
// walker for the binary word. Every verification round found another spelling
// the weaker walker could not decode (quotes, then backslashes, then ANSI-C
// escapes, then Windows case variants), and every round fixed exactly that one
// spelling. That is a losing game, so the two paths are now ONE: `scanShellWord`
// below decodes a single word — quote removal, backslash escapes, ANSI-C
// `$'...'` with its full escape set, locale `$"..."`, and the MSYS
// control-character deletion — and BOTH the tokenizer and the ownership gate
// call it.
//
// The scanner never guesses. It reports one of:
//   - a definite literal (the word the shell will hand to execve);
//   - `terminator`: the word ended at a metacharacter (`ospec<execute` is the
//     complete word `ospec` followed by a redirection);
//   - `indeterminate`: the word's value depends on runtime state the hook
//     cannot evaluate (command substitution, parameter expansion, a glob, a
//     brace expansion);
//   - `error`: the shell would run nothing at all (unterminated quote, comment)
//     or the construct is not modelled.
//
// The tokenizer treats everything except a definite literal as an error, and an
// error escalates to a user prompt. The ownership gate treats `indeterminate`
// as "escalate", never as "stay silent" — see `resolveCommandOwnership`.
// ---------------------------------------------------------------------------

// Unquoted characters that make the shell do something this scanner refuses to
// model. `& ; | < >` are the chaining/redirection guard and `( )` open a
// subshell (these two, plus the backslash handling below, are the F24 gap):
// bash ends the current word at all of them. `$` and a backtick are
// substitution; `* ? [ {` glob or brace-expand: those do not end the word, they
// make its value unknowable. `#` and `~` are only special at the start of a
// word and are handled separately, as bash does.
const WORD_TERMINATING_METACHARS = new Set([
  '&',
  ';',
  '|',
  '<',
  '>',
  '(',
  ')',
  '\n',
  '\r',
]);
// Constructs whose value the scanner cannot resolve to a definite literal. The
// string is the human-readable name used both as the tokenizer's error and as
// the ownership gate's escalation reason.
const INDETERMINATE_UNQUOTED = new Map([
  ['$', 'an unquoted `$`'],
  ['`', 'an unquoted `` ` ``'],
  ['*', 'an unquoted `*`'],
  ['?', 'an unquoted `?`'],
  ['[', 'an unquoted `[`'],
  ['{', 'an unquoted `{`'],
]);
// Inside double quotes bash still expands `$...` and backticks, and a backslash
// only escapes this set; before anything else it is a literal backslash.
const DOUBLE_QUOTE_ESCAPABLE = new Set(['$', '`', '"', '\\']);

// The escapes bash decodes inside `$'...'` (ANSI-C quoting) that map to a
// single fixed character. `\nnn`, `\xHH`, `\uHHHH`, `\UHHHHHHHH` and `\cX` are
// handled numerically below; an escape in none of those forms keeps its
// backslash, as bash does.
const ANSI_C_SIMPLE_ESCAPES = new Map([
  ['a', '\u0007'],
  ['b', '\b'],
  ['e', '\u001b'],
  ['E', '\u001b'],
  ['f', '\f'],
  ['n', '\n'],
  ['r', '\r'],
  ['t', '\t'],
  ['v', '\v'],
  ['\\', '\\'],
  ["'", "'"],
  ['"', '"'],
  ['?', '?'],
]);

// F28: characters MSYS/Git Bash DELETES from a word everywhere -- unquoted, in
// single quotes and in double quotes alike -- so the word this tokenizer
// reproduces faithfully is not the word the shell hands the CLI. `--ru<X>n`
// tokenizes here as a harmless `--ru<X>n` and reaches the CLI as `--run`.
// A differential sweep of U+0000-U+007F, the C1 range and 41 unicode
// whitespace/format codepoints against real Git Bash 5.2.26 argv found exactly
// these two, and no others: every remaining codepoint either survives into argv
// as an ordinary byte (so both readings agree) or already fails closed. POSIX
// bash disagrees about both -- there they are literal inside quotes -- and a
// byte two target shells read differently is exactly what the guard is not
// allowed to guess at, so the whole command fails closed. LF is deliberately
// NOT in this set: both shells agree a quoted LF is a literal newline, and an
// unquoted LF is already rejected as a chaining construct.
const SHELL_COLLAPSING_CHARS = [
  ['\r', 'a carriage return'],
  ['\u0000', 'a NUL byte'],
];

const SHELL_COLLAPSING_CHAR_SET = new Set(
  SHELL_COLLAPSING_CHARS.map(([char]) => char),
);

/** Removes the characters MSYS/Git Bash deletes before the shell ever parses. */
function stripCollapsingChars(raw) {
  let stripped = raw;
  for (const char of SHELL_COLLAPSING_CHAR_SET) {
    stripped = stripped.split(char).join('');
  }
  return stripped;
}

/**
 * Decodes the body of an ANSI-C quoted string (`$'...'`), starting just after
 * the opening quote, with the full escape set bash implements: the named
 * escapes in `ANSI_C_SIMPLE_ESCAPES`, `\nnn` octal, `\xHH`, `\uHHHH`,
 * `\UHHHHHHHH` and `\cX` control characters. An escape in none of those forms
 * keeps its backslash, which is what bash does.
 *
 * F33: this is the decoder the previous ownership gate did not have. `$'ospec'`
 * was handled by stripping the `$` and falling into ordinary quote removal,
 * which is correct only for an escape-free body — `$'osp\145c'` and
 * `$'\157spec'` both execve a plain `ospec` and both walked straight past it.
 *
 * Returns `{ value, next }`, or `{ error, runsNothing }` for an unterminated
 * body, or `{ indeterminate }` when an escape PRODUCES one of the characters
 * MSYS deletes: whether that deletion also applies to a character the shell
 * itself synthesized is exactly the kind of two-readings question this guard is
 * not allowed to answer by guessing.
 */
function decodeAnsiCQuoted(raw, start) {
  let value = '';
  let index = start;
  const append = (text) => {
    for (const char of text) {
      if (SHELL_COLLAPSING_CHAR_SET.has(char)) {
        return false;
      }
      value += char;
    }
    return true;
  };
  const indeterminate = {
    indeterminate: 'a control character produced by an ANSI-C escape',
  };
  while (index < raw.length) {
    const char = raw[index];
    if (char === "'") {
      return { value, next: index + 1 };
    }
    if (char !== '\\') {
      if (!append(char)) {
        return indeterminate;
      }
      index += 1;
      continue;
    }
    const next = raw[index + 1];
    if (next === undefined) {
      break;
    }
    if (ANSI_C_SIMPLE_ESCAPES.has(next)) {
      if (!append(ANSI_C_SIMPLE_ESCAPES.get(next))) {
        return indeterminate;
      }
      index += 2;
      continue;
    }
    if (next >= '0' && next <= '7') {
      let digits = '';
      let cursor = index + 1;
      while (
        cursor < raw.length &&
        digits.length < 3 &&
        raw[cursor] >= '0' &&
        raw[cursor] <= '7'
      ) {
        digits += raw[cursor];
        cursor += 1;
      }
      if (!append(String.fromCharCode(Number.parseInt(digits, 8) & 0xff))) {
        return indeterminate;
      }
      index = cursor;
      continue;
    }
    if (next === 'x' || next === 'u' || next === 'U') {
      const width = next === 'x' ? 2 : next === 'u' ? 4 : 8;
      let digits = '';
      let cursor = index + 2;
      while (
        cursor < raw.length &&
        digits.length < width &&
        /[0-9a-fA-F]/.test(raw[cursor])
      ) {
        digits += raw[cursor];
        cursor += 1;
      }
      if (digits.length === 0) {
        // Not an escape at all; bash keeps the backslash.
        if (!append(`\\${next}`)) {
          return indeterminate;
        }
        index += 2;
        continue;
      }
      const code = Number.parseInt(digits, 16);
      const decoded =
        code <= 0x10ffff ? String.fromCodePoint(code) : `\\${next}${digits}`;
      if (!append(decoded)) {
        return indeterminate;
      }
      index = cursor;
      continue;
    }
    if (next === 'c') {
      const target = raw[index + 2];
      if (target === undefined) {
        if (!append('\\c')) {
          return indeterminate;
        }
        index += 2;
        continue;
      }
      const control =
        target === '?'
          ? '\u007f'
          : String.fromCharCode(
              (target.toUpperCase().charCodeAt(0) ^ 0x40) & 0xff,
            );
      if (!append(control)) {
        return indeterminate;
      }
      index += 3;
      continue;
    }
    if (!append(`\\${next}`)) {
      return indeterminate;
    }
    index += 2;
  }
  // Bash reports a syntax error and runs nothing.
  return { error: 'an unterminated single quote', runsNothing: true };
}

/**
 * Scans exactly ONE shell word out of `raw`, starting at `start` (which must
 * already be at the first non-blank character of the word).
 *
 * Returns one of:
 *   `{ word, next, started, tildePrefixed }`
 *       the word is a definite literal; `next` is the index of its delimiter.
 *   `{ stop: 'terminator', char, word, next, started }`
 *       the word ended at an unquoted metacharacter that bash treats as a word
 *       terminator (`ospec<execute` -> the word `ospec`, then a redirection).
 *   `{ stop: 'indeterminate', construct }`
 *       the word contains a construct whose value depends on runtime state:
 *       command substitution, parameter expansion, a glob, a brace expansion.
 *   `{ stop: 'error', reason, runsNothing }`
 *       the construct is not modelled, or (`runsNothing`) bash would abort with
 *       a syntax error and execute nothing at all.
 *
 * The characters MSYS deletes from a word are NOT handled here: the tokenizer
 * rejects a command containing one outright, and the ownership gate strips them
 * before scanning, because MSYS deletes them at the read layer, before the
 * shell parses anything.
 */
function scanShellWord(raw, start) {
  let word = '';
  let started = false;
  let tildePrefixed = false;
  let index = start;
  while (index < raw.length) {
    const char = raw[index];
    if (char === ' ' || char === '\t') {
      break;
    }
    if (char === '\\') {
      const next = raw[index + 1];
      if (next === undefined) {
        return { stop: 'error', reason: 'a trailing backslash' };
      }
      if (next === '\n' || next === '\r') {
        return { stop: 'error', reason: 'a line continuation' };
      }
      word += next;
      started = true;
      index += 2;
      continue;
    }
    if (char === "'") {
      const end = raw.indexOf("'", index + 1);
      if (end === -1) {
        return {
          stop: 'error',
          reason: 'an unterminated single quote',
          runsNothing: true,
        };
      }
      word += raw.slice(index + 1, end);
      started = true;
      index = end + 1;
      continue;
    }
    if (char === '"') {
      let cursor = index + 1;
      let closed = false;
      while (cursor < raw.length) {
        const inner = raw[cursor];
        if (inner === '"') {
          closed = true;
          break;
        }
        if (inner === '$' || inner === '`') {
          return {
            stop: 'indeterminate',
            construct: `an expansion inside double quotes (${inner})`,
          };
        }
        if (inner === '\\') {
          const next = raw[cursor + 1];
          if (next === undefined) {
            return { stop: 'error', reason: 'a trailing backslash' };
          }
          if (next === '\n' || next === '\r') {
            return { stop: 'error', reason: 'a line continuation' };
          }
          // Inside double quotes a backslash is literal unless it escapes one
          // of the four characters bash treats as special there.
          word += DOUBLE_QUOTE_ESCAPABLE.has(next) ? next : `\\${next}`;
          cursor += 2;
          continue;
        }
        word += inner;
        cursor += 1;
      }
      if (!closed) {
        return {
          stop: 'error',
          reason: 'an unterminated double quote',
          runsNothing: true,
        };
      }
      started = true;
      index = cursor + 1;
      continue;
    }
    if (char === '$') {
      const next = raw[index + 1];
      if (next === "'") {
        const decoded = decodeAnsiCQuoted(raw, index + 2);
        if (decoded.indeterminate) {
          return { stop: 'indeterminate', construct: decoded.indeterminate };
        }
        if (decoded.error) {
          return {
            stop: 'error',
            reason: decoded.error,
            runsNothing: decoded.runsNothing,
          };
        }
        word += decoded.value;
        started = true;
        index = decoded.next;
        continue;
      }
      if (next === '"') {
        // Locale quoting: the `$` vanishes and the rest is an ordinary
        // double-quoted string.
        index += 1;
        continue;
      }
      return {
        stop: 'indeterminate',
        construct: INDETERMINATE_UNQUOTED.get('$'),
      };
    }
    if (!started && char === '#') {
      // A comment: bash executes nothing from here on.
      return { stop: 'error', reason: 'a comment', runsNothing: true };
    }
    if (!started && char === '~') {
      // Tilde expansion. Its value is unknown here, but it only ever replaces
      // the FIRST path segment, so the basename of the word -- which is all the
      // ownership gate needs -- stays definite. The tokenizer refuses the word
      // outright via `tildePrefixed`.
      tildePrefixed = true;
      word += char;
      started = true;
      index += 1;
      continue;
    }
    if (WORD_TERMINATING_METACHARS.has(char)) {
      return { stop: 'terminator', char, word, next: index, started };
    }
    if (INDETERMINATE_UNQUOTED.has(char)) {
      return {
        stop: 'indeterminate',
        construct: INDETERMINATE_UNQUOTED.get(char),
      };
    }
    word += char;
    started = true;
    index += 1;
  }
  return { word, next: index, started, tildePrefixed };
}

/**
 * Quote-removes/unescapes `raw` into the token vector a POSIX shell would pass
 * as argv. Returns `{ tokens }` on success, or `{ error }` when the command
 * contains a construct that is not modelled — never a best-effort guess.
 */
function tokenizeShellCommand(raw) {
  // F27/F28: a collapsing character is unsupported EVERYWHERE, not only
  // unquoted. `\r` is a word terminator, which is enough for POSIX bash -- there
  // a quoted `\r` is a literal character and the tokenizer reproduces it
  // faithfully. It is not enough for the shell this repo actually targets:
  // MSYS/Git Bash deletes a bare CR, and a NUL, everywhere -- inside single and
  // double quotes included -- so `ospec execute launch "--ru<CR>n"` and
  // `"--ru<NUL>n"` both tokenized here as a harmless literal (no match,
  // auto-allowed) while Git Bash handed the CLI a clean `--run`. Same for
  // `orchestr"at<X>e"` and `"--run<X>=x"`. Two shells disagree about what these
  // bytes mean inside quotes, so neither reading can be trusted and the whole
  // command fails closed -- the same rule the unquoted case has always
  // followed. See SHELL_COLLAPSING_CHARS for why the set is exactly these two.
  for (const [char, label] of SHELL_COLLAPSING_CHARS) {
    if (raw.includes(char)) {
      return { error: label };
    }
  }
  const tokens = [];
  let index = 0;
  while (index < raw.length) {
    const char = raw[index];
    if (char === ' ' || char === '\t') {
      index += 1;
      continue;
    }
    const scanned = scanShellWord(raw, index);
    if (scanned.stop === 'error') {
      return { error: scanned.reason };
    }
    if (scanned.stop === 'indeterminate') {
      return { error: scanned.construct };
    }
    if (scanned.stop === 'terminator') {
      return { error: `an unquoted \`${scanned.char}\`` };
    }
    if (scanned.tildePrefixed) {
      return { error: 'a tilde expansion' };
    }
    if (scanned.started) {
      tokens.push(scanned.word);
    }
    index = scanned.next > index ? scanned.next : index + 1;
  }
  return { tokens };
}

// The binary name that makes this an OSpec invocation, and the executable
// suffixes Windows appends to it. Anything else is not ours to decide on.
const OSPEC_BINARY_NAME = 'ospec';
const OSPEC_BINARY_SUFFIXES = ['.exe', '.cmd'];

// `execute orchestrate` is the legacy shell-executing subcommand.
const SHELL_EXECUTING_SUBCOMMAND = 'orchestrate';

// Subcommands where `--run` / `--run=<value>` is a run-id SELECTOR and nothing
// is executed: `parseCollectArgs` and `parseRetryArgs` in ExecuteCommand.ts
// both read it into `runId`. Everywhere else `--run` is either the boolean
// shell-execution switch (`parseLaunchArgs`, `parseReviewArgs`) or unknown —
// both escalate, because this list is an allowlist, not a denylist.
const RUN_IS_RUN_ID_SELECTOR = new Set(['execute collect', 'execute retry']);

// Commands that execute ANOTHER command assembled from their own remaining
// words, so the binary that actually runs is not word 1 of the line. Each is
// resolved through, and the word that comes out is what the ownership gate
// decides on: `env ospec ...` IS an ospec invocation, `env node x.js` is not.
const TRANSPARENT_WRAPPERS = new Set([
  'env',
  'command',
  'exec',
  'builtin',
  'nohup',
  'time',
  'xargs',
  'sudo',
  'doas',
  'nice',
  'stdbuf',
  'setsid',
]);
// `eval` re-parses its argument as a command line, and a shell run with `-c`
// does the same. Both are resolved by decoding the argument and re-entering the
// resolver on its contents.
const EVAL_WRAPPER = 'eval';
const SHELL_WRAPPERS = new Set(['bash', 'sh', 'dash', 'zsh', 'ksh', 'busybox']);

// A leading `NAME=value` (or `NAME[key]=value`, `NAME+=value`) word is an
// assignment prefix, not the command: `FOO=1 ospec ...` runs ospec.
const ASSIGNMENT_PREFIX = /^[A-Za-z_][A-Za-z0-9_]*(\[[^\]]*\])?\+?=/;

/** True on platforms whose command lookup ignores the case of the binary. */
function commandLookupIsCaseInsensitive() {
  return process.platform === 'win32';
}

/** The last path segment of `word`, for both separators Windows shells accept. */
function binaryBaseName(word) {
  const segments = String(word).split(/[\\/]+/);
  return segments[segments.length - 1];
}

/**
 * True when the decoded word `word` names the OSpec CLI.
 *
 * Deliberately tolerant in three directions, each of which is the same program:
 *   - a path prefix (`/usr/bin/ospec`, `./ospec`, `node_modules/.bin/ospec`,
 *     `~/bin/ospec`, `C:\tools\ospec.exe`) — a different copy of ospec is still
 *     ospec, and claiming it can only ever cost a prompt;
 *   - a Windows executable suffix (`ospec.exe`, `ospec.cmd`);
 *   - any casing, but ONLY where command lookup really is case-insensitive. On
 *     Windows `OSPEC`, `Ospec` and `OsPeC` all resolve to the same file and
 *     deliver identical argv (verified against real Git Bash); on a
 *     case-sensitive filesystem they are different names and are left alone.
 *
 * Deliberately intolerant of everything else, and that is the rule (not a side
 * effect) that keeps the guard out of programs which are not ospec:
 * `ospec-other-tool`, `ospec2`, `ospecx`, `nospec`, `ospec.bat`,
 * `ospec.exe.bak` and every unrelated binary are NOT the OSpec CLI. Exactly one
 * suffix is stripped, and only from the end, so `ospec.exe.bak` stays
 * `ospec.exe.bak`.
 */
function isOspecBinaryWord(word) {
  if (typeof word !== 'string' || word.length === 0) {
    return false;
  }
  let name = binaryBaseName(word);
  if (commandLookupIsCaseInsensitive()) {
    name = name.toLowerCase();
  }
  for (const suffix of OSPEC_BINARY_SUFFIXES) {
    if (name.length > suffix.length && name.endsWith(suffix)) {
      name = name.slice(0, -suffix.length);
      break;
    }
  }
  return name === OSPEC_BINARY_NAME;
}

/**
 * `bash -c "<line>"` / `sh -c '<line>'`: find the `-c` and re-enter the
 * resolver on the command string that follows it. Any other form (a script
 * file, a `-s` stdin script) executes something this resolver cannot see, so it
 * resolves to nothing and the gate defers.
 */
function resolveShellWrapper(command, start, level) {
  let index = start;
  let sawDashC = false;
  for (;;) {
    while (
      index < command.length &&
      (command[index] === ' ' || command[index] === '\t')
    ) {
      index += 1;
    }
    if (index >= command.length) {
      return { kind: 'none' };
    }
    const scanned = scanShellWord(command, index);
    if (scanned.stop === 'indeterminate') {
      return { kind: 'indeterminate', construct: scanned.construct };
    }
    if (scanned.stop || !scanned.started) {
      return { kind: 'none' };
    }
    if (sawDashC) {
      return resolveCommandWord(scanned.word, level + 1);
    }
    if (!scanned.word.startsWith('-')) {
      // A script file, not a command string.
      return { kind: 'none' };
    }
    // `-c`, and the bundled forms (`-lc`, `-ec`) a wrapper script may use.
    sawDashC = scanned.word.endsWith('c');
    index = scanned.next;
  }
}

/**
 * Resolves the word a shell would actually execve for `command`, looking
 * through assignment prefixes and command wrappers.
 *
 * Returns `{ kind: 'literal', word }`, `{ kind: 'indeterminate', construct }`
 * or `{ kind: 'none' }` (the line executes nothing this resolver can see:
 * empty, a comment, a syntax error, or a wrapper form it does not model).
 */
function resolveCommandWord(command, depth) {
  const level = depth || 0;
  if (level > 4) {
    return { kind: 'indeterminate', construct: 'a wrapper nested too deep' };
  }
  let index = 0;
  let sawWrapper = false;
  for (;;) {
    while (
      index < command.length &&
      (command[index] === ' ' || command[index] === '\t')
    ) {
      index += 1;
    }
    if (index >= command.length) {
      return { kind: 'none' };
    }
    const scanned = scanShellWord(command, index);
    if (scanned.stop === 'indeterminate') {
      return { kind: 'indeterminate', construct: scanned.construct };
    }
    if (scanned.stop === 'error') {
      return { kind: 'none' };
    }
    if (!scanned.started) {
      // `; ospec ...` and friends: the command word at this position is empty,
      // so bash runs nothing here.
      return { kind: 'none' };
    }
    if (scanned.stop === 'terminator') {
      // `ospec<execute`: the word is complete and a redirection follows it.
      return { kind: 'literal', word: scanned.word };
    }
    const word = scanned.word;
    if (ASSIGNMENT_PREFIX.test(word)) {
      index = scanned.next;
      continue;
    }
    if (sawWrapper && word.startsWith('-')) {
      // A wrapper's own option (`env -i`, `command -p`, `nice -n`).
      index = scanned.next;
      continue;
    }
    const base = commandLookupIsCaseInsensitive()
      ? binaryBaseName(word).toLowerCase()
      : binaryBaseName(word);
    if (TRANSPARENT_WRAPPERS.has(base)) {
      sawWrapper = true;
      index = scanned.next;
      continue;
    }
    if (base === EVAL_WRAPPER) {
      const argument = resolveCommandWord(
        command.slice(scanned.next),
        level + 1,
      );
      if (argument.kind !== 'literal') {
        return argument;
      }
      return resolveCommandWord(argument.word, level + 1);
    }
    if (SHELL_WRAPPERS.has(base)) {
      return resolveShellWrapper(command, scanned.next, level);
    }
    return { kind: 'literal', word };
  }
}

/**
 * Decides whether this guard owns `command` at all. This is the F33 inversion
 * of the old default.
 *
 * The gate used to be a RAW-STRING regex anchored at `^ospec`, which is the very
 * mistake the tokenizer exists to undo one word later. A shell performs quote
 * removal on the binary word too, so `"ospec"`, `o'spec'`, `\ospec`, `os\pec`,
 * `''ospec`, `osp"e<CR>c"`, `$'osp\145c'`, `OSPEC` and `env ospec` all reach
 * execve as the same program -- and the anchor, which only ever inspected the
 * character AFTER a literal `ospec` prefix, never fired on any of them. The
 * command was then DEFERRED: the hook emitted nothing at all and handed the
 * decision back to whatever permission config sits behind it.
 *
 * Three rounds of fixes each taught the gate one more spelling (quotes, then
 * backslashes, then ANSI-C escapes, then case variants) and each round a
 * verifier found the next one. So this one changes the DEFAULT instead:
 *
 *   1. The first word goes through `resolveCommandWord`, i.e. through the SAME
 *      `scanShellWord` pipeline every argument uses -- quote removal, backslash
 *      escapes, ANSI-C `$'...'` with its full escape set, locale `$"..."`, and
 *      the MSYS control-character deletion stripped up front -- plus assignment
 *      prefixes and command wrappers, which move the executed binary off word 1
 *      entirely.
 *   2. If that resolves to a definite literal, `isOspecBinaryWord` decides:
 *      path prefix and `.exe`/`.cmd` stripped, case-folded where the platform's
 *      command lookup is case-insensitive. A definite non-ospec literal is the
 *      ONLY way to reach `defer`.
 *   3. If it does NOT resolve to a definite literal -- command substitution,
 *      parameter expansion, a glob, a brace expansion -- the gate ESCALATES. It
 *      does not go silent. `defer` is not a decision: the hook writes nothing
 *      and the host's own rules decide unaided, so "I could not tell what this
 *      runs" must never take that branch.
 *
 * Everything the gate claims still goes through `tokenizeShellCommand`, which
 * refuses every construct it does not model, so an over-claim can only ever
 * cost a prompt. The cost of rule 3 is therefore bounded and explicit: a line
 * whose command NAME is computed at runtime (`$(which foo) ...`, `$TOOL ...`,
 * `./build-*.sh`) prompts even when it has nothing to do with ospec. That is
 * the trade this gate makes deliberately — one prompt on an unrelated line, in
 * exchange for never staying silent on a line that might be
 * `ospec execute launch --run`.
 *
 * Deliberately still deferred, because the word the shell runs is genuinely a
 * different program: `ospec-other-tool`, `ospec2`, `ospecx`, `nospec`,
 * `ospec.bat`, `ospec.exe.bak`, and every unrelated binary — including one
 * reached through a wrapper (`env node x.js`, `bash -c "npm test"`). A line
 * that executes nothing at all is deferred too: an unterminated quote (bash
 * aborts with a syntax error), a comment, an empty command word.
 */
function resolveCommandOwnership(command) {
  // MSYS deletes these at the read layer, before the shell parses anything, so
  // the line the shell sees is the stripped one.
  const resolved = resolveCommandWord(stripCollapsingChars(command), 0);
  if (resolved.kind === 'indeterminate') {
    return {
      decision: 'ask',
      reason: `the command name cannot be resolved to a definite binary — it contains ${resolved.construct}`,
    };
  }
  if (resolved.kind !== 'literal') {
    return { decision: 'defer', reason: '' };
  }
  return isOspecBinaryWord(resolved.word)
    ? { decision: 'own', reason: '' }
    : { decision: 'defer', reason: '' };
}

function shellFallbackReason(tokens) {
  const leadingWords = [];
  for (const token of tokens.slice(1)) {
    if (token.startsWith('-')) {
      break;
    }
    leadingWords.push(token);
  }
  if (leadingWords.includes(SHELL_EXECUTING_SUBCOMMAND)) {
    return `\`${SHELL_EXECUTING_SUBCOMMAND}\` runs a shell fallback`;
  }
  const subcommand = leadingWords.slice(0, 2).join(' ');
  if (RUN_IS_RUN_ID_SELECTOR.has(subcommand)) {
    return null;
  }
  for (const token of tokens.slice(1)) {
    if (token === '--run' || token.startsWith('--run=')) {
      return `\`${token}\` is not a run-id selector for \`${subcommand || 'ospec'}\``;
    }
  }
  return null;
}

// `--command` is deliberately NOT escalated. Its value never reaches a shell:
// ExecuteCommand has no spawn/exec call and TaskGraphExecutionService has no
// arbitrary-command execution path at all — `runShellCommand` used to be a
// throw-only stub and was deleted outright in 2.0, so
// `ospec execute verify --command ...` records evidence and executes nothing.
// Escalating it prompted the user once per task of every goal.
// `tests/services/p0-8-claude-hook-run-flag.test.mjs` pins the absence, so
// re-enabling shell execution forces this decision to be revisited.

/**
 * Decides what to do with a Bash `tool_input.command`.
 *   - `defer`: the line runs a program that is definitely not ospec, or runs
 *     nothing at all; the hook stays out of it. NOTE this is not a decision:
 *     `handlePreToolUse` writes NOTHING to stdout and exits 0, so the host's own
 *     permission rules decide unaided. `defer` is therefore neither fail-closed
 *     nor fail-open — which is exactly why `resolveCommandOwnership` only ever
 *     takes this branch on a DEFINITE non-ospec resolution.
 *   - `allow`: a single plain ospec invocation with no shell-executing flag.
 *   - `ask`: everything else, including anything unparseable and anything whose
 *     command name cannot be resolved.
 */
function classifyBashCommand(command) {
  const ownership = resolveCommandOwnership(command);
  if (ownership.decision === 'defer') {
    return { decision: 'defer', reason: '' };
  }
  if (ownership.decision === 'ask') {
    return { decision: 'ask', reason: ownership.reason };
  }
  const tokenized = tokenizeShellCommand(command);
  if (tokenized.error) {
    return {
      decision: 'ask',
      reason: `not a single plain ospec invocation — it contains ${tokenized.error}`,
    };
  }
  const tokens = tokenized.tokens;
  if (tokens.length === 0 || !isOspecBinaryWord(tokens[0])) {
    return {
      decision: 'ask',
      reason: 'the first word does not resolve to a plain `ospec` invocation',
    };
  }
  const fallback = shellFallbackReason(tokens);
  if (fallback) {
    return {
      decision: 'ask',
      reason: `command runs a shell fallback — ${fallback}`,
    };
  }
  return { decision: 'allow', reason: '' };
}

/**
 * True when an `ospec` command must be escalated to the user instead of being
 * auto-allowed. Kept as a named export because it is the guard's contract.
 */
function isShellFallback(command) {
  return classifyBashCommand(String(command).trim()).decision === 'ask';
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
    const classified = classifyBashCommand(command);
    if (classified.decision === 'ask') {
      // Fail closed: a chained/redirected/substituted command, an unparseable
      // one, and a shell-executing fallback all get an explicit user prompt
      // rather than auto-approving on a guess about what the shell will do.
      askWithReason(
        `⚠️ OSpec: ${classified.reason} — confirm: ${command.slice(0, 200)}`,
      );
      return;
    }
    if (classified.decision === 'allow') {
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

  if (event === 'SessionStart') {
    const source = String(
      input.source || input.session_start_source || '',
    ).toLowerCase();
    if (source === 'resume') {
      process.exit(0);
    }
    handleContextEvent(event, cwd);
    return;
  }
  if (event === 'UserPromptSubmit') {
    handleContextEvent(event, cwd);
    return;
  }
  if (event === 'PreToolUse') {
    handlePreToolUse(input, cwd);
    return;
  }
  process.exit(0);
}

if (require.main === module) {
  try {
    main();
  } catch (_error) {
    process.exit(0);
  }
} else {
  // Requiring the hook (tests) must never read stdin or emit a decision.
  module.exports = {
    isShellFallback,
    tokenizeShellCommand,
    classifyBashCommand,
    // The ownership rule, exported so it can be asserted directly rather than
    // only through the decision it feeds.
    resolveCommandOwnership,
    resolveCommandWord,
    isOspecBinaryWord,
    commandLookupIsCaseInsensitive,
  };
}
