/**
 * SKILL 解析服务
 */
import { SkillFrontmatter, SkillSection } from '../core/types';
interface ParsedSkillFrontmatter {
    data: SkillFrontmatter;
    content: string;
}
export declare class SkillParser {
    /**
     * 解析 SKILL.md 的前置信息和内容
     */
    parseFrontmatter(content: string): ParsedSkillFrontmatter;
    /**
     * 提取 Markdown 中的标题结构
     */
    extractSections(content: string): Record<string, SkillSection>;
    /**
     * 完整解析 SKILL.md 文件
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