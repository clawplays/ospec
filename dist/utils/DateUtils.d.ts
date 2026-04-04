/**
 * 日期工具函数
 */
export declare class DateUtils {
    /**
     * 获取 ISO 格式的当前时间
     */
    static now(): string;
    /**
     * 格式化日期
     */
    static format(date: Date, format?: string): string;
    /**
     * 解析 ISO 字符串
     */
    static parseISO(dateString: string): Date;
}