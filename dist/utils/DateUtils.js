"use strict";
/**
 * 日期工具函数
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DateUtils = void 0;
class DateUtils {
    /**
     * 获取 ISO 格式的当前时间
     */
    static now() {
        return new Date().toISOString();
    }
    /**
     * 格式化日期
     */
    static format(date, format = 'YYYY-MM-DD HH:mm:ss') {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return format
            .replace('YYYY', String(year))
            .replace('MM', month)
            .replace('DD', day)
            .replace('HH', hours)
            .replace('mm', minutes)
            .replace('ss', seconds);
    }
    /**
     * 解析 ISO 字符串
     */
    static parseISO(dateString) {
        return new Date(dateString);
    }
}
exports.DateUtils = DateUtils;