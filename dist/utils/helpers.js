"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatCliCommand = exports.quoteCliArg = void 0;
function quoteCliArg(value) {
    const text = String(value ?? '');
    if (text.length === 0) {
        return '""';
    }
    return /\s/.test(text) ? `"${text.replace(/"/g, '\\"')}"` : text;
}
exports.quoteCliArg = quoteCliArg;
function formatCliCommand(...args) {
    return args
        .filter((arg) => arg !== undefined && arg !== null && arg !== '')
        .map((arg, index) => {
        const text = String(arg);
        return index === 0 ? text : quoteCliArg(text);
    })
        .join(' ');
}
exports.formatCliCommand = formatCliCommand;
//# sourceMappingURL=helpers.js.map
