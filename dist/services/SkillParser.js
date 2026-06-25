"use strict";
/**
 * SKILL parsing service.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.skillParser = exports.SkillParser = void 0;
const helpers_1 = require("../utils/helpers");
class SkillParser {
    normalizeLineEndings(content) {
        return String(content || '').replace(/\r\n?/g, '\n');
    }
    /**
     * Parse SKILL.md frontmatter and content.
     */
    parseFrontmatter(content) {
        const normalizedContent = this.normalizeLineEndings(content);
        const { data, content: body } = (0, helpers_1.parseFrontmatterDocument)(normalizedContent);
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
     * Extract heading structure from Markdown.
     */
    extractSections(content) {
        const sections = {};
        const headingRegex = /^(#{1,6})\s+(.+?)$/gm;
        let match;
        while ((match = headingRegex.exec(content)) !== null) {
            const title = match[2].trim();
            sections[title] = {
                level: match[1].length,
                title,
            };
        }
        return sections;
    }
    /**
     * Fully parse a SKILL.md file.
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
