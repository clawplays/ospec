"use strict";
/**
 * Logging service.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.Logger = exports.LogLevel = void 0;
var LogLevel;
(function (LogLevel) {
    LogLevel["DEBUG"] = "DEBUG";
    LogLevel["INFO"] = "INFO";
    LogLevel["WARN"] = "WARN";
    LogLevel["ERROR"] = "ERROR";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
class Logger {
    constructor() {
        this.level = LogLevel.INFO;
    }
    setLevel(level) {
        this.level = level;
    }
    debug(message, data) {
        if (this.shouldLog(LogLevel.DEBUG)) {
            console.log(`[DEBUG] ${message}`, data || '');
        }
    }
    info(message, data) {
        if (this.shouldLog(LogLevel.INFO)) {
            console.log(`[INFO] ${message}`, data || '');
        }
    }
    warn(message, data) {
        if (this.shouldLog(LogLevel.WARN)) {
            console.warn(`[WARN] ${message}`, data || '');
        }
    }
    error(message, error) {
        if (this.shouldLog(LogLevel.ERROR)) {
            console.error(`[ERROR] ${message}`, error || '');
        }
    }
    shouldLog(level) {
        const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
        return levels.indexOf(level) >= levels.indexOf(this.level);
    }
}
exports.Logger = Logger;
exports.logger = new Logger();
