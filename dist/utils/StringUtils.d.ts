/**
 * 字符串工具函数
 */
export declare class StringUtils {
    /**
     * 转换为 kebab-case
     */
    static toKebabCase(str: string): string;
    /**
     * 转换为 camelCase
     */
    static toCamelCase(str: string): string;
    /**
     * 转换为 PascalCase
     */
    static toPascalCase(str: string): string;
    /**
     * 截断字符串
     */
    static truncate(str: string, length: number, suffix?: string): string;
    /**
     * 去除空白
     */
    static trim(str: string): string;
}