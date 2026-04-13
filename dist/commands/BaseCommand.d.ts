/**
 * Base command class.
 */
import { Logger } from '../services/Logger';
export declare abstract class BaseCommand {
    protected logger: Logger;
    constructor();
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
