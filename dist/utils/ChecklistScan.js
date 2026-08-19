"use strict";
/**
 * The one place OSpec decides what a markdown checklist item is.
 *
 * M-cfg3: this predicate had grown five spellings across four files, and they
 * disagreed on both of the things that matter:
 *
 *   ArchiveCommand          /- \[ \]/                    unanchored
 *   ArchiveCommand          /- \[(?: |x|X)\]/            unanchored
 *   ProjectService          /^\s*[-*+]\s+\[ \]\s+/m      anchored, `[-*+]`
 *   ProjectService, build-index
 *                           /^\s*-\s+\[ \]\s+.+$/gm      anchored, `-` only
 *   ReviewArtifacts         /^\s*[-*+]\s+\[ \]\s+/m      anchored, `[-*+]`
 *
 * The unanchored pair is the one that bites: `ospec archive` refused to
 * archive any change whose prose contained the four characters `- [ ]`
 * ANYWHERE on a line -- mid-sentence, inside a table cell, or in a
 * ``` fenced block documenting the checklist syntax itself. A change whose
 * proposal.md explains "write `- [ ]` for an open item" could not be archived
 * and the blocker said its acceptance checklist was incomplete.
 *
 * None of the five skipped fenced code blocks, so a fenced example was counted
 * as a real open item by all of them.
 *
 * Two further deliberate unifications, both widenings:
 *  - `*` and `+` bullets count everywhere. They are checklist items in every
 *    markdown renderer, and the `-`-only spellings simply missed them.
 *  - an item with no text after the box (`- [ ]` alone on its line) counts as
 *    unchecked. The `.+$` spellings treated it as absent, i.e. as satisfied,
 *    which is the wrong direction to be wrong in on a release gate.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.blankFencedCodeBlocks = blankFencedCodeBlocks;
exports.fencedLineFlags = fencedLineFlags;
exports.listUncheckedChecklistItems = listUncheckedChecklistItems;
exports.hasUncheckedChecklistItem = hasUncheckedChecklistItem;
exports.hasChecklistItem = hasChecklistItem;
exports.listChecklistItems = listChecklistItems;
exports.isChecklistItemLine = isChecklistItemLine;
/**
 * Blanks every line inside a fenced code block, keeping the line count and
 * every other line byte-identical so callers can still report what they
 * matched.
 *
 * A fence opens on a line whose first non-space run is three or more of
 * `` ` `` or `~` (CommonMark allows up to three leading spaces), and closes on
 * a later line made of at least as many of the SAME character and nothing
 * else. Tracking the opening character and length is what keeps a `~~~` block
 * containing ``` ``` ``` from closing early.
 *
 * Exported for `MarkdownLinks`, which needs the same "is this line inside a
 * fence" answer for the same reason (M-misc1) and must not grow a third copy
 * of it.
 */
function blankFencedCodeBlocks(content) {
    const lines = splitLines(content);
    const fenced = fencedLineFlags(content);
    return lines.map((line, index) => (fenced[index] ? '' : line));
}
/**
 * Split into lines, dropping the `\r` of a CRLF pair.
 *
 * Every pattern in this file is anchored with `$`, and in a non-`m` regex `$`
 * matches end-of-input only. `.` does not match `\r` either, because `\r` is a
 * LineTerminator. So on a CRLF document `- [ ] b\r` failed BOTH halves of
 * `(?:[ \t].*)?$` and the line was not recognised as a checklist item at all --
 * and `` ```\r `` was not recognised as a fence, so fenced blocks stopped being
 * skipped at the same time.
 *
 * That is not academic. M-cfg3 replaced spellings that used the `m` flag, where
 * `$` matches before any LineTerminator INCLUDING `\r`, so the old regexes
 * handled CRLF and the extracted module silently did not. The observable was a
 * release gate failing OPEN: a verification.md saved by a Windows editor made
 * `hasUncheckedChecklistItem` return false with open items still in it, so
 * `ospec archive` reported the change ready. `hasChecklistItem` returned false
 * on the same document, which fires the opposite complaint ("must contain at
 * least one checklist item") on a document that plainly does.
 *
 * Splitting here rather than normalising the whole string keeps the line
 * indexes aligned with a caller's own `split(/\r?\n/)`, which is what
 * `fencedLineFlags`' rewriter callers rely on.
 */
function splitLines(content) {
    return content.split('\n').map(line => (line.endsWith('\r') ? line.slice(0, -1) : line));
}
/**
 * Per-line "is this line part of a fenced code block" flags, indexed the same
 * way as `content.split('\n')`. The fence delimiter lines themselves count as
 * fenced.
 *
 * `blankFencedCodeBlocks` is the right tool when a caller only needs to READ
 * past fences. This one exists for callers that need to REWRITE a document
 * line by line and must put the original bytes back for every line they are not
 * changing -- blanking would destroy the very content they are preserving.
 */
function fencedLineFlags(content) {
    let fence = null;
    return splitLines(content).map(line => {
        const opening = /^ {0,3}(`{3,}|~{3,})([^\n]*)$/.exec(line);
        if (!fence) {
            // An opening ``` fence's info string may not itself contain a
            // backtick; a ~~~ fence's may.
            if (opening && !(opening[1][0] === '`' && opening[2].includes('`'))) {
                fence = { char: opening[1][0], length: opening[1].length };
                return true;
            }
            return false;
        }
        if (opening
            && opening[1][0] === fence.char
            && opening[1].length >= fence.length
            && opening[2].trim().length === 0) {
            fence = null;
        }
        return true;
    });
}
/*
 * `[^\n]` rather than `.` for the trailing text, in both patterns and in the
 * fence opener above. `.` excludes every LineTerminator, so a line carrying a
 * lone `\r` -- or `
` / `
`, which are legal inside a markdown line --
 * failed to match and the item stopped being counted. `splitLines` already
 * removes the `\r` of a CRLF pair; this closes the same hole for the stray
 * control characters it cannot know about, so a gate cannot be defeated by one.
 */
/** `- [ ]`, `* [ ]` or `+ [ ]` at the start of a line. */
const UNCHECKED_ITEM = /^[ \t]*[-*+][ \t]+\[ \](?:[ \t][^\n]*)?$/;
/** The same, checked or unchecked. */
const ANY_ITEM = /^[ \t]*[-*+][ \t]+\[(?: |x|X)\](?:[ \t][^\n]*)?$/;
/** Every unchecked checklist line, in document order, fenced blocks excluded. */
function listUncheckedChecklistItems(content) {
    return blankFencedCodeBlocks(String(content ?? ''))
        .filter(line => UNCHECKED_ITEM.test(line));
}
/** Whether any unchecked checklist item survives outside a fenced block. */
function hasUncheckedChecklistItem(content) {
    return blankFencedCodeBlocks(String(content ?? ''))
        .some(line => UNCHECKED_ITEM.test(line));
}
/** Whether the document has any checklist item at all, checked or not. */
function hasChecklistItem(content) {
    return blankFencedCodeBlocks(String(content ?? ''))
        .some(line => ANY_ITEM.test(line));
}
/** Every checklist line, checked or unchecked, fenced blocks excluded. */
function listChecklistItems(content) {
    return blankFencedCodeBlocks(String(content ?? ''))
        .filter(line => ANY_ITEM.test(line));
}
/**
 * Whether a single LINE is a checklist item.
 *
 * Fence-blind by construction: one line carries no information about whether a
 * fence is open around it. A caller that holds the whole document must use the
 * document-level helpers above, or pair this with `fencedLineFlags`. It is
 * exported so that line-at-a-time REWRITERS share this file's answer to "what
 * is a checklist item" instead of carrying a fifth spelling of the regex.
 */
function isChecklistItemLine(line) {
    return ANY_ITEM.test(String(line ?? ''));
}
