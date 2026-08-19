"use strict";
/**
 * The one place OSpec quotes a value into a shell command string it PRINTS FOR
 * A HUMAN OR AN AGENT TO PASTE.
 *
 * These strings are never executed by OSpec. Every command OSpec runs itself
 * goes through `spawn`/`runGit` with an argument ARRAY, which needs no quoting
 * at all. What is quoted here is instructional text -- `nextInstruction`,
 * closeout command lists, `git worktree add ...` -- that a person copies into
 * an interactive shell. Getting it wrong does not compromise OSpec's own
 * process; it hands the user a command that is not the command OSpec meant.
 *
 * ## Why this module exists
 *
 * M-misc6 fixed the copy in `SessionCommand` and left the copy in
 * `TaskGraphExecutionService` untouched, so the product shipped two quoting
 * rules -- one correct, one not -- and ~15 emitted command strings used the
 * unsafe one:
 *
 *     return `"${value.replace(/"/g, '\\"')}"`;   // only `"` was escaped
 *
 * Double quotes do not stop `$VAR`, `` `cmd` `` or `$(cmd)` in any POSIX
 * shell, so `a$(id)b` was emitted as `"a$(id)b"` and ran `id` on paste. A value
 * ending in a backslash was worse: `x\` became `"x\"`, whose backslash escapes
 * the closing quote, so the quote never closes and the rest of the command line
 * is swallowed into the argument.
 *
 * This is the same shape as M-cfg3's checklist predicate -- one rule, several
 * spellings, disagreeing -- so it is fixed the same way: extracted once and
 * imported by both call sites, rather than patched twice.
 *
 * ## The guarantee, and on which platform
 *
 * `quoteShellArg` emits **POSIX sh** syntax, on every platform, and does not
 * branch on `process.platform`. Two consequences, both deliberate:
 *
 *  - **Output is byte-identical everywhere.** These strings are persisted into
 *    plan and dispatch artifacts that are committed and read back on other
 *    machines. A value that quoted one way on Windows and another way on Linux
 *    would make those artifacts platform-dependent.
 *
 *  - **Inside single quotes POSIX sh performs no expansion whatsoever.** Not
 *    parameter (`$VAR`, `${VAR}`), not command (`` `cmd` ``, `$(cmd)`), not
 *    arithmetic, not history (`!`), not globbing, not word splitting. A newline
 *    is literal. A backslash is literal -- which is exactly what the old
 *    double-quoted form got wrong. The single character that cannot appear
 *    between single quotes is `'` itself, closed and re-opened as `'\''`.
 *    That is a total rule with no exceptions to enumerate, which is why it is
 *    preferred over escaping a blocklist of metacharacters inside `"`.
 *
 * **cmd.exe and PowerShell are out of scope, and cannot be brought into it.**
 * `'` is not a quoting character in cmd.exe, and `%VAR%` expands there whether
 * it is inside quotes or not -- so no single emitted string can be simultaneously
 * correct for sh and for cmd. On Windows these commands are for Git Bash, WSL or
 * MSYS, which is where OSpec's own git tooling already lives. `SessionCommand`
 * makes the same split explicitly: its `integration.shell` field is POSIX and is
 * quoted here, while `integration.powershell` is built separately with
 * `JSON.stringify`, which is the correct rule for that shell.
 *
 * `%VAR%` is therefore preserved verbatim, and is pinned in the test table as
 * such: sh treats it as five ordinary characters, and it must survive the round
 * trip unaltered rather than being mangled in a doomed attempt to serve cmd.
 *
 * ## The raw fast path
 *
 * A value made only of characters that are inert unquoted in POSIX sh is
 * returned as-is, so the common case (`changes/0001-thing`, `--task`, `main`)
 * stays readable. The set is deliberately identical to the one M-misc6 settled
 * on in `SessionCommand`; every member is a literal to sh in an unquoted word:
 *
 *   A-Z a-z 0-9  _ . / : @ % + = , -
 *
 * `-` is last in the class so it is a literal and not a range. The empty string
 * fails the `+` quantifier and so takes the quoted path, correctly yielding
 * `''` -- an empty argument, rather than no argument at all.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.quoteShellArg = quoteShellArg;
/** Characters that need no quoting in an unquoted POSIX sh word. */
const SHELL_SAFE_RAW = /^[A-Za-z0-9_./:@%+=,-]+$/;
/**
 * Quote `value` for literal use as a single POSIX sh word.
 *
 * See the module header for the guarantee and its platform scope.
 */
function quoteShellArg(value) {
    const text = String(value ?? '');
    if (SHELL_SAFE_RAW.test(text)) {
        return text;
    }
    return `'${text.replace(/'/g, `'\\''`)}'`;
}
