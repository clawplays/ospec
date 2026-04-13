/**
 * SKILL parsing service.
 */
import { SkillFrontmatter, SkillSection } from '../core/types';
interface ParsedSkillFrontmatter {
    data: SkillFrontmatter;
    content: string;
}
export declare class SkillParser {
    /**
     * Parse SKILL.md frontmatter and content.
     */
    parseFrontmatter(content: string): ParsedSkillFrontmatter;
    /**
     * Extract heading structure from Markdown.
     */
    extractSections(content: string): Record<string, SkillSection>;
    /**
     * Fully parse a SKILL.md file.
     */
    parseSkillFile(content: string): {
        frontmatter: SkillFrontmatter;
        sections: Record<string, SkillSection>;
        content: string;
    };
    private extractDocumentTitle;
}
export declare const skillParser: SkillParser;
export {};
