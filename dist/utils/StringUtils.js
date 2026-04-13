"use strict";
/**
 * String utilities.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.StringUtils = void 0;
class StringUtils {
    /**
     * Convert to kebab-case.
     */
    static toKebabCase(str) {
        return str
            .replace(/([a-z])([A-Z])/g, '$1-$2')
            .replace(/[\s_]+/g, '-')
            .toLowerCase();
    }
    /**
     * Convert to camelCase.
     */
    static toCamelCase(str) {
        return str
            .replace(/[-_\s](.)/g, (_, c) => c.toUpperCase())
            .replace(/^(.)/, (_, c) => c.toLowerCase());
    }
    /**
     * Convert to PascalCase.
     */
    static toPascalCase(str) {
        return str
            .replace(/[-_\s](.)/g, (_, c) => c.toUpperCase())
            .replace(/^(.)/, (_, c) => c.toUpperCase());
    }
    /**
     * Truncate a string.
     */
    static truncate(str, length, suffix = '...') {
        return str.length > length ? str.substring(0, length - suffix.length) + suffix : str;
    }
    /**
     * Trim whitespace.
     */
    static trim(str) {
        return str.trim();
    }
}
exports.StringUtils = StringUtils;
