import { BaseCommand } from './BaseCommand';
export declare class DocsCommand extends BaseCommand {
    execute(action?: string, projectPath?: string, options?: string[]): Promise<void>;
    /**
     * 7.3 `ospec docs locate`. Answers "which section describes this?" with a
     * `path#heading`, a line range to read, and nothing else.
     *
     * The output budget is HARD: <= 200 tokens, measured, for every branch
     * including a multi-hit. A locator that costs more than the section it
     * saves is worse than no locator, so every line here earns its place --
     * `--json` is emitted unindented for the same reason (indentation was ~86%
     * of a previously measured payload in this repository).
     */
    private locate;
    /**
     * Line ranges come from the document, not the index: the index stores
     * character offsets into a normalised body (contract 4) and no reader
     * tool takes those. An unreadable document degrades to the character
     * range rather than to a guess.
     */
    private attachReadRanges;
    /**
     * `ospec docs obligations [change-path] [--apply] [--json]`
     *
     * Read-only unless `--apply`. Generating and showing without writing is the
     * default because the obligation list changes what the archive gate checks,
     * and an operator should be able to see it before it takes effect.
     */
    private runObligations;
    /**
     * `ospec docs confirm [change-path] --id <obligation-id> [--note "..."]`
     *
     * The `verified_unchanged` path: a refactor that genuinely changed no
     * documented behaviour records that fact instead of making a cosmetic edit.
     */
    private runConfirm;
    /**
     * `ospec docs audit [path] [--json]` -- 7.8 drift detection. Read-only.
     *
     * Exit status stays 0 even when drift is found: this is a report people and
     * AIs are meant to run periodically, not a gate. Making it non-zero would
     * put it in CI, where a slowly-drifting document would block unrelated work.
     */
    private runAudit;
    /**
     * Resolve `[change-path]` the same way `ospec execute` and `ospec loop` do:
     * an explicit path, else the single active change. Refusing to guess
     * between several active changes is deliberate.
     */
    private resolveChange;
    private findProjectRoot;
    /**
     * 7.9. Four phases, and the flags are the phase selector rather than a
     * mode: `--plan`, `--verify`, `--finalize`. Nothing writes without
     * `--apply`, and `--finalize --apply` is the only thing that deletes.
     */
    private migrate;
}
