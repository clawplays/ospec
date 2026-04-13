export interface ParsedFrontmatterDocument<T = Record<string, any>> {
    data: T;
    content: string;
}
export declare function quoteCliArg(value: string): string;
export declare function formatCliCommand(...args: Array<string | null | undefined>): string;
export declare function parseFrontmatterDocument<T = Record<string, any>>(content: string): ParsedFrontmatterDocument<T>;
export declare function stringifyFrontmatter(content: string, data: Record<string, any> | null | undefined): string;
