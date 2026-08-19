/**
 * Rewrites every inline link's destination through `rewrite`.
 *
 * Returning `null` (or the same string) leaves that link byte-identical,
 * including any `<>` wrapper and title.
 */
export declare function rewriteMarkdownLinks(content: string, rewrite: (href: string, label: string) => string | null): string;
