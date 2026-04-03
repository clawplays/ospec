"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateBuilderBase = void 0;
class TemplateBuilderBase {
    getCurrentDate() {
        return new Date().toISOString().slice(0, 10);
    }
    isEnglish(language) {
        return language === 'en-US';
    }
    copy(language, zh, en, ja = en, ar = en) {
        if (language === 'zh-CN') {
            return zh;
        }
        if (language === 'ja-JP') {
            return ja;
        }
        if (language === 'ar') {
            return ar;
        }
        return en;
    }
    formatList(items, emptyFallback) {
        const normalized = items.map(item => item.trim()).filter(Boolean);
        const source = normalized.length > 0 ? normalized : [emptyFallback];
        return source.map(item => `- ${item}`).join('\n');
    }
    formatChecklist(items, emptyFallback) {
        const normalized = items.map(item => item.trim()).filter(Boolean);
        const source = normalized.length > 0 ? normalized : [emptyFallback];
        return source.map(item => `- [ ] ${item}`).join('\n');
    }
    formatLinkedList(items, emptyFallback) {
        if (items.length === 0) {
            return `- ${emptyFallback}`;
        }
        return items.map(item => `- ${item.displayName}: \`${item.path}\``).join('\n');
    }
    formatReferenceList(items, emptyFallback) {
        if (items.length === 0) {
            return `- ${emptyFallback}`;
        }
        return items.map(item => `- ${item.title}: \`${item.path}\``).join('\n');
    }
    formatReferenceChecklist(items, emptyFallback) {
        if (items.length === 0) {
            return `- [ ] ${emptyFallback}`;
        }
        return items.map(item => `- [ ] ${item.path}`).join('\n');
    }
    withFrontmatter(fields, body) {
        const frontmatter = Object.entries(fields)
            .filter(([, value]) => value !== undefined)
            .map(([key, value]) => `${key}: ${this.toYamlValue(value)}`)
            .join('\n');
        return `---\n${frontmatter}\n---\n\n${body.trim()}\n`;
    }
    toYamlValue(value) {
        if (Array.isArray(value)) {
            return `[${value.map(item => JSON.stringify(item)).join(', ')}]`;
        }
        if (typeof value === 'string') {
            return /^[a-z0-9_.-]+$/i.test(value) ? value : JSON.stringify(value);
        }
        return String(value);
    }
}
exports.TemplateBuilderBase = TemplateBuilderBase;
//# sourceMappingURL=TemplateBuilderBase.js.map
