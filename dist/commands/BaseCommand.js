"use strict";
/**
 * Base command class.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseCommand = void 0;
const services_1 = require("../services");
const outputBudget_1 = require("../utils/outputBudget");
const subcommandHelp_1 = require("../utils/subcommandHelp");
class BaseCommand {
    constructor() {
        this.logger = services_1.services.logger;
    }
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
    static async runWithOutputBudget(args, budgetFlags, run) {
        // Help is exempt, and the reason is a contract older than this budget:
        // `ospec <command> --help` "prints only help, and never acts on it", and
        // `cli-help-contract` asserts that a help run leaves the project tree
        // byte-identical. Spilling turns reading the manual into three new files
        // under artifacts/, which is acting on it. The budget exists to bound
        // what an agent reads from a command whose output size is unknown; help
        // is a fixed document of a few kilobytes that the reader asked for in
        // full, so there is nothing here for the budget to protect against.
        //
        // Asked BOTH ways round on purpose. `cli.ts` decides help from the
        // arguments AFTER the command word, so `isHelpRequest(args)` alone
        // misses `ospec execute help` -- the bare-word form, where `help` sits
        // at index 1 rather than 0. Getting that wrong is not cosmetic: it is
        // exactly the case that spilled three files into the project.
        if ((0, subcommandHelp_1.isHelpRequest)(args) || (0, subcommandHelp_1.isHelpRequest)(args.slice(1))) {
            return run();
        }
        const contract = (0, subcommandHelp_1.resolveStdoutContract)(args);
        const interceptor = new outputBudget_1.OutputBudgetInterceptor({
            proseBudget: (0, outputBudget_1.resolveOutputBudget)(budgetFlags.maxOutputChars),
            structuredBudget: (0, outputBudget_1.resolveStructuredOutputBudget)(budgetFlags.maxStructuredOutputChars),
            commandLabel: (0, outputBudget_1.deriveCommandLabel)(args),
            structured: contract.machineParsed,
            selfReducing: contract.selfReducing,
        });
        (0, outputBudget_1.setActiveOutputBudgetInterceptor)(interceptor);
        interceptor.install();
        try {
            return await run();
        }
        finally {
            interceptor.finish();
            (0, outputBudget_1.setActiveOutputBudgetInterceptor)(null);
        }
    }
    /**
     * Validate command arguments.
     */
    validateArgs(args, requiredCount) {
        if (args.length < requiredCount) {
            throw new Error(`Invalid arguments. Expected at least ${requiredCount} arguments.`);
        }
    }
    /**
     * Print a success message.
     */
    success(message) {
        console.log(`✓ ${message}`);
    }
    /**
     * Print an informational message.
     */
    info(message) {
        console.log(message);
    }
    /**
     * Print an error message.
     */
    error(message) {
        console.error(`✗ ${message}`);
    }
    /**
     * Print a warning message.
     */
    warn(message) {
        console.warn(`⚠ ${message}`);
    }
}
exports.BaseCommand = BaseCommand;
