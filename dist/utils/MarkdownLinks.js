"use strict";
/**
 * Replaces every fenced line with same-length NUL padding, so index arithmetic
 * against the original string still lines up while no link can be found there.
 *
 * A fenced line that happens to be empty is left alone; it has no link in it
 * either way, so the distinction cannot matter.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.rewriteMarkdownLinks = rewriteMarkdownLinks;
const ChecklistScan_1 = require("./ChecklistScan");
function maskFencedCodeBlocks(content) {
    const lines = content.split('\n');
    const blanked = (0, ChecklistScan_1.blankFencedCodeBlocks)(content);
    return lines
        .map((line, index) => (blanked[index] === line ? line : '\0'.repeat(line.length)))
        .join('\n');
}
/** Index of the `]` closing the `[` at `open`, or -1. Handles nesting. */
function findLabelEnd(text, open) {
    let depth = 0;
    for (let index = open; index < text.length; index += 1) {
        const char = text[index];
        if (char === '\\') {
            index += 1;
            continue;
        }
        if (char === '[')
            depth += 1;
        else if (char === ']') {
            depth -= 1;
            if (depth === 0)
                return index;
        }
    }
    return -1;
}
/**
 * Index of the `)` closing the `(` at `open`, or -1.
 *
 * This is the balanced-paren tolerance: `(v2)` inside a destination increments
 * and decrements the depth instead of terminating the scan.
 */
function findDestinationEnd(text, open) {
    let depth = 0;
    for (let index = open; index < text.length; index += 1) {
        const char = text[index];
        if (char === '\\') {
            index += 1;
            continue;
        }
        if (char === '(')
            depth += 1;
        else if (char === ')') {
            depth -= 1;
            if (depth === 0)
                return index;
        }
    }
    return -1;
}
/**
 * Splits a destination-and-title into its two halves.
 *
 * `<...>` destinations may contain spaces; bare ones may not, so the first
 * whitespace run ends them and everything after it -- a `"title"`, usually --
 * is carried through untouched.
 */
function splitDestination(raw) {
    const leading = /^\s*/.exec(raw)?.[0] ?? '';
    const rest = raw.slice(leading.length);
    if (rest.startsWith('<')) {
        const close = rest.indexOf('>');
        if (close >= 0) {
            return {
                href: rest.slice(1, close),
                angled: true,
                trailing: leading ? `${rest.slice(close + 1)}` : rest.slice(close + 1),
            };
        }
    }
    const match = /^(\S*)([\s\S]*)$/.exec(rest);
    return { href: match?.[1] ?? '', angled: false, trailing: match?.[2] ?? '' };
}
/** Every inline link outside a fenced block, in document order. */
function scanInlineLinks(content) {
    const masked = maskFencedCodeBlocks(content);
    const links = [];
    let cursor = 0;
    while (cursor < masked.length) {
        const open = masked.indexOf('[', cursor);
        if (open < 0)
            break;
        // `![alt](src)` is an image; the `!` is not consumed, so rewriting the
        // `[alt](src)` part leaves the image intact. Same as before.
        const labelEnd = findLabelEnd(masked, open);
        if (labelEnd < 0)
            break;
        if (masked[labelEnd + 1] !== '(') {
            cursor = open + 1;
            continue;
        }
        const destinationEnd = findDestinationEnd(masked, labelEnd + 1);
        if (destinationEnd < 0) {
            cursor = open + 1;
            continue;
        }
        const { href, angled, trailing } = splitDestination(content.slice(labelEnd + 2, destinationEnd));
        links.push({
            start: open,
            end: destinationEnd + 1,
            label: content.slice(open + 1, labelEnd),
            href,
            angled,
            trailing,
        });
        cursor = destinationEnd + 1;
    }
    return links;
}
/**
 * Rewrites every inline link's destination through `rewrite`.
 *
 * Returning `null` (or the same string) leaves that link byte-identical,
 * including any `<>` wrapper and title.
 */
function rewriteMarkdownLinks(content, rewrite) {
    const links = scanInlineLinks(content);
    if (links.length === 0)
        return content;
    let out = '';
    let cursor = 0;
    for (const link of links) {
        const replacement = rewrite(link.href, link.label);
        out += content.slice(cursor, link.start);
        if (replacement === null || replacement === link.href) {
            out += content.slice(link.start, link.end);
        }
        else {
            const destination = link.angled ? `<${replacement}>` : replacement;
            out += `[${link.label}](${destination}${link.trailing})`;
        }
        cursor = link.end;
    }
    return out + content.slice(cursor);
}
