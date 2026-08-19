/**
 * Base command class.
 */
import { Logger } from '../services/Logger';
export declare abstract class BaseCommand {
    protected logger: Logger;
    constructor();
    /**
     * Run a whole CLI dispatch under the Phase 5 / F3 output budget.
     *
     * This is the single place the budget is installed. It sits here, above
     * every command, rather than inside the commands, because output does not
     * arrive through one method: `ExecuteCommand` alone reaches `console.log`
     * 456 times, and there are over 900 such calls across the command layer.
     * Anything that asked each call site to opt in would be wrong the day
     * someone added the 901st. Wrapping the dispatch instead means the budget
     * applies to `console.log`, `console.error`, `this.info`, the logger, and
     * anything a future command writes to stdout, without any of them knowing.
     *
     * `cli.ts` calls this once around its command switch.
     *
     * Whether stdout is prose or a machine-read record comes from the command
     * registry, NOT from sniffing argv for `--json`. A command whose machine
     * output is its default emits a document on every invocation with no flag
     * to notice, so argv cannot answer the question; flags only escalate.
     */
    static runWithOutputBudget<T>(args: string[], budgetFlags: {
        maxOutputChars: number | null;
        maxStructuredOutputChars: number | null;
    }, run: () => Promise<T>): Promise<T>;
    /**
     * Execute the command.
     */
    abstract execute(...args: any[]): Promise<void>;
    /**
     * Validate command arguments.
     */
    protected validateArgs(args: any[], requiredCount: number): void;
    /**
     * Print a success message.
     */
    protected success(message: string): void;
    /**
     * Print an informational message.
     */
    protected info(message: string): void;
    /**
     * Print an error message.
     */
    protected error(message: string): void;
    /**
     * Print a warning message.
     */
    protected warn(message: string): void;
}
