"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stringifyFrontmatter = exports.parseFrontmatterDocument = exports.formatCliCommand = exports.quoteCliArg = void 0;
const yaml = require("js-yaml");
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
function ensureTrailingNewline(value) {
    return value.endsWith('\n') ? value : `${value}\n`;
}
function normalizeFrontmatterData(value) {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? value
        : {};
}
function parseFrontmatterDocument(content) {
    const normalizedContent = String(content ?? '').replace(/^\uFEFF/, '');
    const frontmatterMatch = normalizedContent.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
    if (!frontmatterMatch) {
        return {
            data: {},
            content: normalizedContent,
        };
    }
    return {
        data: normalizeFrontmatterData(yaml.load(frontmatterMatch[1])),
        content: normalizedContent.slice(frontmatterMatch[0].length),
    };
}
exports.parseFrontmatterDocument = parseFrontmatterDocument;
function stringifyFrontmatter(content, data) {
    const body = ensureTrailingNewline(String(content ?? ''));
    const normalizedData = normalizeFrontmatterData(data);
    if (Object.keys(normalizedData).length === 0) {
        return body;
    }
    const frontmatterBlock = yaml.dump(normalizedData, {
        lineWidth: -1,
        noRefs: true,
        sortKeys: false,
    });
    return `---\n${frontmatterBlock}---\n${body}`;
}
exports.stringifyFrontmatter = stringifyFrontmatter;
