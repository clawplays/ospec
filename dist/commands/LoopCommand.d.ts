import { BaseCommand } from './BaseCommand';
export declare class LoopCommand extends BaseCommand {
    execute(action?: string, ...args: string[]): Promise<void>;
    private run;
    /**
     * One controller round in one process.
     *
     * Replaces `heartbeat x N` + `finalize x N` + `run --once` with a single
     * call: claims, then results, then the tick that observes them. Every step
     * delegates to the same public LoopService method the standalone command
     * uses, so the lease, the ownership checks and the durable-evidence gate are
     * byte-for-byte the ones that were already there.
     *
     * Application is strictly ordered and stops at the first failure. Loop state
     * is shared, so continuing past a failed finalize would make the emitted
     * tick describe a state the controller never asked for; instead the command
     * reports exactly which items are already durable so the retry can drop
     * them.
     */
    private step;
    /**
     * Applies claims then results, in envelope order, stopping at the first
     * service-level rejection. Returns the failure descriptor, or null.
     */
    private applyBatch;
    private describeStepFailure;
    /**
     * Builds the output envelope and keeps it inside the structured cap by
     * dropping payload semantically, then paginating. It never truncates bytes:
     * a half-JSON document would force the consumer into a spill-file read.
     */
    private renderStepEnvelope;
    private parseMaxBatchChars;
    private readStdin;
    private poll;
    /** Reads a token-lean task graph summary so the controller does not need a separate `ospec execute status` call per tick. */
    private readGraphSummary;
    private compactTickResult;
    private tickPlan;
    private parseOptionalPath;
    /**
     * The value of `--flag value` or `--flag=value`, or undefined if absent.
     *
     * M-misc6: the space-separated form returned `args[index + 1]` with no
     * check on what that was. Two ways it lied:
     *
     *  - `ospec loop result --action-item --executor codex-1` returned
     *    `'--executor'` as the action item id. The command then looked up an
     *    item by that name, failed, and reported a missing action item -- with
     *    no hint that the real problem was a forgotten value one flag earlier.
     *  - `ospec loop result --summary` with nothing after it returned
     *    `undefined`, indistinguishable from not passing `--summary` at all,
     *    so a typo'd trailing flag was silently dropped.
     *
     * Both now fail loud. A value that genuinely starts with `--` is still
     * reachable through `--flag=--value`, and the error says so.
     */
    private parseFlagValue;
    private resolveProjectRoot;
    private status;
    private pause;
    private resume;
    private configure;
    private allowlist;
    private printAllowlistDiff;
    private heartbeat;
    private recordResult;
    private recover;
    private resolveChangePath;
}
