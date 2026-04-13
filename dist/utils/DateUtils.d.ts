/**
 * Date utilities.
 */
export declare class DateUtils {
    /**
     * Get the current time in ISO format.
     */
    static now(): string;
    /**
     * Format a date.
     */
    static format(date: Date, format?: string): string;
    /**
     * Parse an ISO string.
     */
    static parseISO(dateString: string): Date;
}
