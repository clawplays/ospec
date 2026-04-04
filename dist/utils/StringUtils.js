"use strict";
/**
 * 字符串工具函数
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.StringUtils = void 0;
class StringUtils {
    /**
     * 转换为 kebab-case
     */
    static toKebabCase(str) {
        return str
            .replace(/([a-z])([A-Z])/g, '$1-$2')
            .replace(/[\s_]+/g, '-')
            .toLowerCase();
    }
    /**
     * 转换为 camelCase
     */
    static toCamelCase(str) {
        return str
            .replace(/[-_\s](.)/g, (_, c) => c.toUpperCase())
            .replace(/^(.)/, (_, c) => c.toLowerCase());
    }
    /**
     * 转换为 PascalCase
     */
    static toPascalCase(str) {
        return str
            .replace(/[-_\s](.)/g, (_, c) => c.toUpperCase())
            .replace(/^(.)/, (_, c) => c.toUpperCase());
    }
    /**
     * 截断字符串
     */
    static truncate(str, length, suffix = '...') {
        return str.length > length ? str.substring(0, length - suffix.length) + suffix : str;
    }
    /**
     * 去除空白
     */
    static trim(str) {
        return str.trim();
    }
}
exports.StringUtils = StringUtils;