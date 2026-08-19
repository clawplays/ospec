"use strict";
/**
 * Uniform output budget for everything an agent reads.
 *
 * Phase 5 / F3. Every CLI command output, and every long free-text field an
 * agent hands us as evidence, is capped at a head plus a tail; the complete
 * text is written to `artifacts/spill/<ts>-<cmd>.txt` and the visible output
 * carries the path plus an instruction to `read`/`grep` it.
 *
 * This module is the ONLY implementation. `BaseCommand.runWithOutputBudget`
 * installs it once around the whole CLI dispatch, so no command opts in and no
 * command can drift. Commands never call the pruner for their own console
 * output.
 *
 * Two modes, because a head-plus-tail cut is only meaningful for prose:
 *
 *  - PROSE (default). The head streams through untouched, so a slow command
 *    still shows progress; once the head budget is spent the rest is buffered.
 *    Under the cap the output is byte-identical to what it always was. Over the
 *    cap the reader gets head + an unmissable notice + tail.
 *
 *  - STRUCTURED (`--json`, `--compact-json`, `--format json`, `--brief`).
 *    Cutting a machine-read record in half produces something that parses as
 *    nothing at all -- or worse, as the wrong thing -- so structured stdout is
 *    NEVER truncated. It is buffered whole and either emitted verbatim (under
 *    the cap) or replaced, in full, by a valid one-line JSON envelope carrying
 *    the spill path. A machine consumer that parses stdout therefore always
 *    gets valid JSON; the single extra case it must handle is
 *    `ospecOutputSpill === true`, meaning "the payload is in spillPath".
 *
 * `--brief` is in the structured set even though it emits `key=value` lines
 * rather than JSON. It reads like prose, but `ExecuteCommand.ts` says of it:
 * "`--brief`, whose output is parsed by controller loops". A prose cut through
 * a `--brief` line would hand a controller a malformed record with nothing to
 * signal that anything was dropped -- silent misreading, which is precisely the
 * failure the structured path exists to prevent. Over the cap a `--brief` run
 * emits the envelope instead: a controller that expects `graph=... tasks=...`
 * and gets `{"ospecOutputSpill":true,...}` fails loudly and can recover from
 * `spillPath`.
 *
 * The two modes have SEPARATE caps on purpose. A machine payload is legitimately
 * larger than anything a human reads, and merging the two knobs would force one
 * of the two to be wrong; `--max-output-chars` never changes the structured cap
 * and `--max-structured-output-chars` never changes the prose cap.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutputBudgetInterceptor = exports.SPILL_DIR_RELATIVE_PATH = exports.DEFAULT_MAX_STRUCTURED_OUTPUT_CHARS = exports.OUTPUT_SPILL_ENVELOPE_VERSION = exports.OUTPUT_SPILL_ENVELOPE_KEY = exports.TRUNCATION_NOTICE_OVERHEAD_CHARS = exports.DEFAULT_MAX_OUTPUT_CHARS = exports.DEFAULT_TAIL_OUTPUT_CHARS = exports.DEFAULT_HEAD_OUTPUT_CHARS = void 0;
exports.resolveOutputBudget = resolveOutputBudget;
exports.resolveStructuredOutputBudget = resolveStructuredOutputBudget;
exports.parseMaxOutputCharsValue = parseMaxOutputCharsValue;
exports.extractOutputBudgetArgs = extractOutputBudgetArgs;
exports.deriveCommandLabel = deriveCommandLabel;
exports.spillTimestamp = spillTimestamp;
exports.writeSpillFile = writeSpillFile;
exports.resolveSpillRoot = resolveSpillRoot;
exports.renderTruncationNotice = renderTruncationNotice;
exports.renderSpillEnvelope = renderSpillEnvelope;
exports.isTruncationWorthwhile = isTruncationWorthwhile;
exports.pruneTextWithSpill = pruneTextWithSpill;
exports.setActiveOutputBudgetInterceptor = setActiveOutputBudgetInterceptor;
exports.declareSelfReducingStructuredOutput = declareSelfReducingStructuredOutput;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/** Head budget before any truncation notice, in characters. */
exports.DEFAULT_HEAD_OUTPUT_CHARS = 4096;
/** Tail budget kept after the truncation notice, in characters. */
exports.DEFAULT_TAIL_OUTPUT_CHARS = 1024;
/** Total default budget: head + tail. */
exports.DEFAULT_MAX_OUTPUT_CHARS = exports.DEFAULT_HEAD_OUTPUT_CHARS + exports.DEFAULT_TAIL_OUTPUT_CHARS;
/**
 * Share of the budget spent on the head when a custom total is supplied. The
 * defaults above are 4:1, and a custom `--max-output-chars` keeps that shape.
 */
const HEAD_SHARE = exports.DEFAULT_HEAD_OUTPUT_CHARS / exports.DEFAULT_MAX_OUTPUT_CHARS;
/**
 * What the truncation notice itself costs, in characters.
 *
 * The notice is a banner, a character count, a spill path and an instruction --
 * around 640 characters in practice. That is a price worth paying to drop tens
 * of thousands of characters and worthless when dropping a handful: truncating
 * a 5,200-character output at a 5,120 cap would drop 80 characters and add 640,
 * so the "budgeted" output would be LARGER than the unbudgeted one. In a tool
 * whose entire purpose is spending fewer tokens, that is not a rounding error,
 * it is the feature working backwards.
 *
 * So truncation needs the drop to be worth the notice, and this is the
 * threshold: below `maxChars + this`, the output passes through whole. Set
 * slightly above the measured notice size so the exchange is never a loss.
 */
exports.TRUNCATION_NOTICE_OVERHEAD_CHARS = 700;
/** Sentinel key on the structured-output envelope. Part of the CLI contract. */
exports.OUTPUT_SPILL_ENVELOPE_KEY = 'ospecOutputSpill';
/**
 * Version of the SPILL ENVELOPE SHAPE below -- nothing else.
 *
 * It is not the CLI version, not the package version, and not the version of
 * the payload the envelope points at. It changes only when a field is added to,
 * removed from, or reinterpreted in the envelope itself, so a consumer can
 * branch on it without having to guess what it counts. Named in full for that
 * reason: a bare `schemaVersion` next to a `version` field elsewhere in this
 * CLI's JSON is exactly the ambiguity a reader should not have to resolve.
 */
exports.OUTPUT_SPILL_ENVELOPE_VERSION = 1;
/**
 * Cap for machine-read stdout. Deliberately a different number under a
 * different name from `DEFAULT_MAX_OUTPUT_CHARS`: a controller batch is
 * legitimately larger than anything a human reads, and spilling it costs the
 * consumer the extra file read that the batch protocol exists to remove. This
 * value is a backstop against an unbounded payload, not a routine path.
 */
exports.DEFAULT_MAX_STRUCTURED_OUTPUT_CHARS = 32768;
/** Directory, relative to the working directory, that spill files land in. */
exports.SPILL_DIR_RELATIVE_PATH = path.join('artifacts', 'spill');
/**
 * Resolve the budget from an explicit value, the environment, or the defaults.
 *
 * `0`, `off`, `none` and `unlimited` all disable the budget outright, which is
 * the escape hatch for a human who genuinely wants the whole thing on screen.
 */
function resolveOutputBudget(explicit) {
    const fromEnv = parseMaxOutputCharsValue(process.env.OSPEC_MAX_OUTPUT_CHARS);
    const maxChars = explicit !== undefined && explicit !== null
        ? explicit
        : fromEnv !== null
            ? fromEnv
            : exports.DEFAULT_MAX_OUTPUT_CHARS;
    if (!Number.isFinite(maxChars) || maxChars <= 0) {
        return { maxChars: 0, headChars: 0, tailChars: 0 };
    }
    if (maxChars === exports.DEFAULT_MAX_OUTPUT_CHARS) {
        return {
            maxChars,
            headChars: exports.DEFAULT_HEAD_OUTPUT_CHARS,
            tailChars: exports.DEFAULT_TAIL_OUTPUT_CHARS,
        };
    }
    // Keep at least one character on each side so "head and tail are both kept"
    // stays true for any budget a caller can express.
    const headChars = Math.max(1, Math.min(maxChars - 1, Math.floor(maxChars * HEAD_SHARE)));
    return { maxChars, headChars, tailChars: maxChars - headChars };
}
/**
 * Resolve the SEPARATE cap that applies to machine-read stdout.
 *
 * Never falls back to `--max-output-chars`: a human shrinking their own console
 * output must not silently start spilling a controller's batch payload.
 */
function resolveStructuredOutputBudget(explicit) {
    const fromEnv = parseMaxOutputCharsValue(process.env.OSPEC_MAX_STRUCTURED_OUTPUT_CHARS);
    const maxChars = explicit !== undefined && explicit !== null
        ? explicit
        : fromEnv !== null
            ? fromEnv
            : exports.DEFAULT_MAX_STRUCTURED_OUTPUT_CHARS;
    if (!Number.isFinite(maxChars) || maxChars <= 0) {
        return { maxChars: 0, headChars: 0, tailChars: 0 };
    }
    // Structured output is never cut, so the head/tail split is unused. It is
    // reported as the whole budget so any diagnostic reads sensibly.
    return { maxChars, headChars: maxChars, tailChars: 0 };
}
/**
 * Parse one `--max-output-chars` value. Returns null when the value is absent
 * or unparseable, so the caller can fall back instead of guessing a budget.
 */
function parseMaxOutputCharsValue(raw) {
    if (raw === undefined || raw === null)
        return null;
    const value = String(raw).trim().toLowerCase();
    if (!value)
        return null;
    if (value === 'off' || value === 'none' || value === 'unlimited')
        return 0;
    if (!/^\d+$/.test(value))
        return null;
    return Number.parseInt(value, 10);
}
/**
 * Pull the two budget flags out of argv before dispatch.
 *
 * They are global output-only flags, so they are stripped here rather than
 * taught to twenty-six argument parsers that would each reject them as unknown.
 */
function extractOutputBudgetArgs(args) {
    const kept = [];
    let maxOutputChars = null;
    let maxStructuredOutputChars = null;
    const require = (flag, raw) => {
        const parsed = parseMaxOutputCharsValue(raw);
        if (parsed === null) {
            throw new Error(`Flag ${flag} requires a non-negative integer, or off/none/unlimited to disable the cap.`);
        }
        return parsed;
    };
    for (let index = 0; index < args.length; index += 1) {
        const arg = args[index];
        // Checked before the prose flag: `--max-output-chars` is a prefix of
        // nothing here, but the long form must never be swallowed by a looser
        // startsWith on the short one if either name is ever changed.
        if (arg === '--max-structured-output-chars') {
            maxStructuredOutputChars = require(arg, args[index + 1]);
            index += 1;
            continue;
        }
        if (arg.startsWith('--max-structured-output-chars=')) {
            maxStructuredOutputChars = require('--max-structured-output-chars', arg.slice('--max-structured-output-chars='.length));
            continue;
        }
        if (arg === '--max-output-chars') {
            maxOutputChars = require(arg, args[index + 1]);
            index += 1;
            continue;
        }
        if (arg.startsWith('--max-output-chars=')) {
            maxOutputChars = require('--max-output-chars', arg.slice('--max-output-chars='.length));
            continue;
        }
        kept.push(arg);
    }
    return { args: kept, maxOutputChars, maxStructuredOutputChars };
}
/**
 * Label a spill file by what produced it: `ospec loop run` -> `loop-run`.
 * Only the command and its action word are used, so a spill name never leaks a
 * path, a secret, or a free-text summary from the rest of argv.
 */
function deriveCommandLabel(args) {
    const words = [];
    for (const arg of args) {
        if (arg.startsWith('-'))
            break;
        words.push(arg);
        if (words.length === 2)
            break;
    }
    const label = words
        .join('-')
        .replace(/[^a-zA-Z0-9._-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60);
    return label || 'ospec';
}
/** A filesystem-safe, sortable timestamp: 20260817T101112123Z. */
function spillTimestamp(now = new Date()) {
    return now.toISOString().replace(/[-:]/g, '').replace(/\.(\d{3})Z$/, '$1Z');
}
/**
 * Write the complete text to `artifacts/spill/<ts>-<cmd>.txt`.
 *
 * Throws on failure. Callers treat a failed spill as "do not truncate": losing
 * output is worse than spending tokens, so the budget yields rather than the
 * text disappearing.
 */
function writeSpillFile(options) {
    const rootDir = options.rootDir || resolveSpillRoot();
    const dir = path.join(rootDir, exports.SPILL_DIR_RELATIVE_PATH);
    fs.mkdirSync(dir, { recursive: true });
    const base = `${spillTimestamp(options.now)}-${options.commandLabel}${options.suffix ? `-${options.suffix}` : ''}`;
    let absolutePath = path.join(dir, `${base}.txt`);
    // Two spills inside the same millisecond must not overwrite each other; the
    // whole promise of this file is that it is byte-complete.
    for (let attempt = 1; fs.existsSync(absolutePath); attempt += 1) {
        absolutePath = path.join(dir, `${base}-${attempt}.txt`);
    }
    fs.writeFileSync(absolutePath, options.text, 'utf8');
    const relative = path.relative(process.cwd(), absolutePath);
    // Forward slashes either way: the path is meant to be pasted into a `read`
    // or `grep`, and a backslash in a quoted shell argument is an escape.
    const displayPath = (relative && !relative.startsWith('..') && !path.isAbsolute(relative)
        ? relative
        : absolutePath).replace(/\\/g, '/');
    return { displayPath, absolutePath };
}
/** Where spill files go. `OSPEC_SPILL_ROOT` exists so tests never write to cwd. */
function resolveSpillRoot() {
    const override = String(process.env.OSPEC_SPILL_ROOT || '').trim();
    return override || process.cwd();
}
/**
 * The truncation notice.
 *
 * It has to survive being skimmed by a model that is looking for the answer and
 * not for our bookkeeping, so it is banner-delimited, states the exact number of
 * characters dropped, and ends with the action to take.
 */
function renderTruncationNotice(options) {
    const dropped = options.originalChars - options.headChars - options.tailChars;
    const bar = '='.repeat(72);
    return [
        '',
        bar,
        '!! OSPEC OUTPUT TRUNCATED -- THE MIDDLE OF THIS OUTPUT IS NOT SHOWN !!',
        `Dropped ${dropped} of ${options.originalChars} characters.`,
        `Kept the first ${options.headChars} characters (above) and the last ${options.tailChars} characters (below).`,
        `Complete output: ${options.spillPath}`,
        `Read or grep that file for anything not shown here; it is byte-complete.`,
        `Raise or remove the cap with --max-output-chars <n|off>.`,
        bar,
        '',
    ].join('\n');
}
/**
 * The structured-output envelope.
 *
 * Emitted INSTEAD of an over-long machine-readable payload, never alongside it,
 * so stdout stays exactly one parseable JSON document.
 */
function renderSpillEnvelope(options) {
    return `${JSON.stringify({
        [exports.OUTPUT_SPILL_ENVELOPE_KEY]: true,
        spillEnvelopeVersion: exports.OUTPUT_SPILL_ENVELOPE_VERSION,
        command: options.commandLabel,
        originalChars: options.originalChars,
        maxStructuredOutputChars: options.maxChars,
        spillPath: options.spillPath,
        instruction: 'This command produced machine-read output larger than --max-structured-output-chars. Nothing was truncated: the complete, byte-identical payload is the whole content of spillPath. Read that file, or re-run with a larger --max-structured-output-chars.',
    })}\n`;
}
/**
 * Is cutting this text actually cheaper than printing it?
 *
 * Only true when the text exceeds the cap by more than the notice costs. Both
 * the CLI pipeline and the evidence pruner ask this, so the answer cannot
 * differ between them. Structured output never asks: it is not cut at all.
 */
function isTruncationWorthwhile(originalChars, budget) {
    if (budget.maxChars <= 0)
        return false;
    return originalChars > budget.maxChars + exports.TRUNCATION_NOTICE_OVERHEAD_CHARS;
}
/**
 * Prune one free-text field: evidence summaries, worker report bodies, captured
 * command output. Same budget and same notice as CLI stdout, so an agent sees
 * one truncation contract everywhere.
 *
 * The return value is always a string, so this never changes the shape of the
 * record it is stored in.
 */
function pruneTextWithSpill(text, options) {
    const budget = options.budget || resolveOutputBudget();
    const originalChars = text.length;
    if (budget.maxChars <= 0 || !isTruncationWorthwhile(originalChars, budget)) {
        return { text, spilled: false, spillPath: null, originalChars };
    }
    let spill;
    try {
        spill = writeSpillFile({
            text,
            commandLabel: options.commandLabel,
            rootDir: options.rootDir,
            suffix: options.suffix,
        });
    }
    catch {
        // Losing the text is worse than spending the tokens.
        return { text, spilled: false, spillPath: null, originalChars };
    }
    const head = text.slice(0, budget.headChars);
    const tail = text.slice(originalChars - budget.tailChars);
    const notice = renderTruncationNotice({
        originalChars,
        headChars: budget.headChars,
        tailChars: budget.tailChars,
        spillPath: spill.displayPath,
    });
    return {
        text: `${head}${notice}${tail}`,
        spilled: true,
        spillPath: spill.displayPath,
        originalChars,
    };
}
/** The stdout/stderr stream as the narrow view above. */
function streamView(name) {
    return process[name];
}
/**
 * Installs the budget around a whole CLI run. One instance per process.
 */
class OutputBudgetInterceptor {
    constructor(options) {
        this.state = {
            stdout: { chunks: [], total: 0, passedThrough: 0 },
            stderr: { chunks: [], total: 0, passedThrough: 0 },
        };
        this.originals = new Map();
        this.installed = false;
        this.finished = false;
        this.exitHandler = null;
        this.proseBudget = options.proseBudget;
        this.structuredBudget = options.structuredBudget;
        this.commandLabel = options.commandLabel;
        this.structured = options.structured;
        this.selfReducing = Boolean(options.selfReducing);
    }
    /** The budget that governs one stream on this invocation. */
    budgetFor(name) {
        return this.structured && name === 'stdout' ? this.structuredBudget : this.proseBudget;
    }
    /**
     * Declare, at run time, that this command reduces its own over-cap payload.
     *
     * A self-reducing command is exempt from the cap ENTIRELY -- not raised,
     * bypassed. That is deliberate: a numeric race between this cap and the
     * command's own, larger reduction threshold would let the generic envelope
     * fire first and the semantic reduction never run. Bypassing cannot race.
     */
    declareSelfReducing() {
        this.selfReducing = true;
    }
    install() {
        if (this.installed)
            return;
        if (this.proseBudget.maxChars <= 0 && this.structuredBudget.maxChars <= 0)
            return;
        this.installed = true;
        for (const name of ['stdout', 'stderr']) {
            const stream = streamView(name);
            const original = stream.write.bind(stream);
            this.originals.set(name, original);
            const intercept = (chunk, encoding, callback) => {
                // Node's two-arity overload puts the callback where the encoding
                // goes; both arities have to keep working, because the caller
                // here is every console.log in the codebase.
                if (typeof encoding === 'function') {
                    callback = encoding;
                    encoding = undefined;
                }
                const text = typeof chunk === 'string'
                    ? chunk
                    : Buffer.isBuffer(chunk)
                        ? chunk.toString(typeof encoding === 'string' ? encoding : 'utf8')
                        : String(chunk);
                this.record(name, text, original);
                if (typeof callback === 'function')
                    callback();
                return true;
            };
            stream.write = intercept;
        }
        // A command that calls process.exit() must not take the tail with it.
        this.exitHandler = () => { this.finishSync(); };
        process.on('exit', this.exitHandler);
    }
    /**
     * Restore the real streams and emit whatever the budget still owes the
     * reader. Safe to call twice; the second call is a no-op.
     */
    finish() {
        this.finishSync();
    }
    record(name, text, original) {
        const state = this.state[name];
        state.chunks.push(text);
        state.total += text.length;
        // Structured stdout is a single document: nothing may be emitted until
        // we know whether the whole of it fits.
        if (this.structured && name === 'stdout')
            return;
        const room = this.budgetFor(name).headChars - state.passedThrough;
        if (room <= 0)
            return;
        const slice = text.length <= room ? text : text.slice(0, room);
        state.passedThrough += slice.length;
        original(slice);
    }
    finishSync() {
        if (!this.installed || this.finished)
            return;
        this.finished = true;
        for (const name of ['stdout', 'stderr']) {
            const original = this.originals.get(name);
            if (original)
                streamView(name).write = original;
        }
        if (this.exitHandler) {
            process.removeListener('exit', this.exitHandler);
            this.exitHandler = null;
        }
        for (const name of ['stdout', 'stderr']) {
            this.flush(name);
        }
    }
    flush(name) {
        const state = this.state[name];
        if (state.total === 0)
            return;
        const original = this.originals.get(name);
        if (!original)
            return;
        const full = state.chunks.join('');
        const structured = this.structured && name === 'stdout';
        const budget = this.budgetFor(name);
        // A self-reducing command has already bounded its own payload by
        // dropping fields and paginating. Capping it again here would either
        // fire before its reduction runs or spill a payload it deliberately
        // kept inline, so the budget steps aside completely.
        if (structured && this.selfReducing) {
            original(full.slice(state.passedThrough));
            return;
        }
        // Under the cap the output is byte-identical to the unbudgeted run.
        //
        // Structured output spills the moment it crosses its cap: it is never
        // cut, so it never pays for a notice, and the envelope it is replaced
        // with is far smaller than the payload. Prose has to clear the higher
        // bar of `isTruncationWorthwhile` -- a cut that drops less than the
        // notice costs would make the output longer, not shorter.
        const overCap = structured
            ? budget.maxChars > 0 && state.total > budget.maxChars
            : isTruncationWorthwhile(state.total, budget);
        if (!overCap) {
            original(full.slice(state.passedThrough));
            return;
        }
        let spill = null;
        try {
            spill = writeSpillFile({
                text: full,
                commandLabel: this.commandLabel,
                suffix: name === 'stderr' ? 'stderr' : undefined,
            });
        }
        catch {
            // No spill file means the notice would point at nothing, and a
            // pointer to nothing is worse than a long output.
            original(full.slice(state.passedThrough));
            return;
        }
        if (structured) {
            original(renderSpillEnvelope({
                commandLabel: this.commandLabel,
                originalChars: state.total,
                maxChars: budget.maxChars,
                spillPath: spill.displayPath,
            }));
            return;
        }
        const notice = renderTruncationNotice({
            originalChars: state.total,
            headChars: state.passedThrough,
            tailChars: budget.tailChars,
            spillPath: spill.displayPath,
        });
        original(`${notice}${full.slice(state.total - budget.tailChars)}`);
    }
}
exports.OutputBudgetInterceptor = OutputBudgetInterceptor;
/**
 * The interceptor installed around the current CLI dispatch, if any.
 * There is at most one per process; `BaseCommand.runWithOutputBudget` owns it.
 */
let activeInterceptor = null;
/** @internal Set by BaseCommand.runWithOutputBudget. */
function setActiveOutputBudgetInterceptor(interceptor) {
    activeInterceptor = interceptor;
}
/**
 * Opt this invocation out of the generic spill fallback, from inside a command.
 *
 * The registry declaration in `subcommandHelp.ts` is the answer of record --
 * it cannot rot, because adding a command means answering the question. This
 * function exists for the case the registry cannot express: a command that only
 * discovers at run time that it is emitting a self-reduced payload. Calling it
 * is a promise that the command has bounded its own output; the budget will not
 * cap, envelope or spill that stdout at any size.
 *
 * A no-op when no budget is installed, so a command may call it unconditionally.
 */
function declareSelfReducingStructuredOutput() {
    activeInterceptor?.declareSelfReducing();
}
