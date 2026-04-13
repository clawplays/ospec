"use strict";
/**
 * Date utilities.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DateUtils = void 0;
class DateUtils {
    /**
     * Get the current time in ISO format.
     */
    static now() {
        return new Date().toISOString();
    }
    /**
     * Format a date.
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
     * Parse an ISO string.
     */
    static parseISO(dateString) {
        return new Date(dateString);
    }
}
exports.DateUtils = DateUtils;
