"use strict";
/**
 * SKILL 解析服务
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.skillParser = exports.SkillParser = void 0;
const gray_matter_1 = __importDefault(require("gray-matter"));
class SkillParser {
    normalizeLineEndings(content) {
        return String(content || '').replace(/\r\n?/g, '\n');
    }
    /**
     * 解析 SKILL.md 的前置信息和内容
     */
    parseFrontmatter(content) {
        const normalizedContent = this.normalizeLineEndings(content);
        const { data, content: body } = (0, gray_matter_1.default)(normalizedContent);
        const tags = Array.isArray(data.tags)
            ? data.tags.map(tag => String(tag).trim()).filter(Boolean)
            : typeof data.tags === 'string'
                ? data.tags.split(',').map(tag => tag.trim()).filter(Boolean)
                : [];
        const title = typeof data.title === 'string' && data.title.trim().length > 0
            ? data.title.trim()
            : this.extractDocumentTitle(body);
        const name = typeof data.name === 'string' && data.name.trim().length > 0
            ? data.name.trim()
            : title || 'Unknown';
        return {
            data: {
                name,
                title: title || undefined,
                tags,
            },
            content: body,
        };
    }
    /**
     * 提取 Markdown 中的标题结构
     */
    extractSections(content) {
        const sections = {};
        const headingRegex = /^(#{1,6})\s+(.+?)$/gm;
        const matches = [];
        let match;
        while ((match = headingRegex.exec(content)) !== null) {
            matches.push({
                level: match[1].length,
                title: match[2].trim(),
                start: match.index,
                headerEnd: match.index + match[0].length,
            });
        }
        for (let index = 0; index < matches.length; index += 1) {
            const current = matches[index];
            const next = matches[index + 1];
            sections[current.title] = {
                level: current.level,
                title: current.title,
                start: current.start,
                end: next ? next.start : content.length,
            };
        }
        return sections;
    }
    /**
     * 完整解析 SKILL.md 文件
     */
    parseSkillFile(content) {
        const { data, content: body } = this.parseFrontmatter(this.normalizeLineEndings(content));
        const sections = this.extractSections(body);
        return {
            frontmatter: data,
            sections,
            content: body,
        };
    }
    extractDocumentTitle(content) {
        const titleMatch = content.match(/^#\s+(.+)$/m);
        return titleMatch?.[1]?.trim() || null;
    }
}
exports.SkillParser = SkillParser;
exports.skillParser = new SkillParser();
