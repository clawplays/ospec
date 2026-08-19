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
export declare function blankFencedCodeBlocks(content: string): string[];
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
export declare function fencedLineFlags(content: string): boolean[];
/** Every unchecked checklist line, in document order, fenced blocks excluded. */
export declare function listUncheckedChecklistItems(content: string): string[];
/** Whether any unchecked checklist item survives outside a fenced block. */
export declare function hasUncheckedChecklistItem(content: string): boolean;
/** Whether the document has any checklist item at all, checked or not. */
export declare function hasChecklistItem(content: string): boolean;
/** Every checklist line, checked or unchecked, fenced blocks excluded. */
export declare function listChecklistItems(content: string): string[];
/**
 * Whether a single LINE is a checklist item.
 *
 * Fence-blind by construction: one line carries no information about whether a
 * fence is open around it. A caller that holds the whole document must use the
 * document-level helpers above, or pair this with `fencedLineFlags`. It is
 * exported so that line-at-a-time REWRITERS share this file's answer to "what
 * is a checklist item" instead of carrying a fifth spelling of the regex.
 */
export declare function isChecklistItemLine(line: string): boolean;
