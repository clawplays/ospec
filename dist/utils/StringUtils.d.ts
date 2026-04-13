/**
 * String utilities.
 */
export declare class StringUtils {
    /**
     * Convert to kebab-case.
     */
    static toKebabCase(str: string): string;
    /**
     * Convert to camelCase.
     */
    static toCamelCase(str: string): string;
    /**
     * Convert to PascalCase.
     */
    static toPascalCase(str: string): string;
    /**
     * Truncate a string.
     */
    static truncate(str: string, length: number, suffix?: string): string;
    /**
     * Trim whitespace.
     */
    static trim(str: string): string;
}
