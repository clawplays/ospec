"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateBuilderBase = void 0;
const path_1 = __importDefault(require("path"));
class TemplateBuilderBase {
    setReferenceDocumentContext(projectRoot, documentPath) {
        this.referenceProjectRoot = typeof projectRoot === 'string' && projectRoot.trim().length > 0 ? projectRoot : undefined;
        this.referenceDocumentPath = typeof documentPath === 'string' && documentPath.trim().length > 0 ? documentPath : undefined;
    }
    clearReferenceDocumentContext() {
        this.referenceProjectRoot = undefined;
        this.referenceDocumentPath = undefined;
    }
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
        return items
            .map(item => `- ${item.title}: [${item.path}](${this.resolveReferenceHref(item.path)})`)
            .join('\n');
    }
    formatReferenceChecklist(items, emptyFallback) {
        if (items.length === 0) {
            return `- [ ] ${emptyFallback}`;
        }
        return items
            .map(item => `- [ ] ${item.title}: [${item.path}](${this.resolveReferenceHref(item.path)})`)
            .join('\n');
    }
    withFrontmatter(fields, body) {
        const frontmatter = Object.entries(fields)
            .filter(([, value]) => value !== undefined)
            .map(([key, value]) => `${key}: ${this.toYamlValue(value)}`)
            .join('\n');
        return `---\n${frontmatter}\n---\n\n${body.trim()}\n`;
    }
    resolveReferenceHref(referencePath) {
        const normalizedReferencePath = String(referencePath || '').replace(/\\/g, '/');
        if (!normalizedReferencePath) {
            return normalizedReferencePath;
        }
        if (!this.referenceProjectRoot || !this.referenceDocumentPath) {
            return normalizedReferencePath;
        }
        const targetPath = path_1.default.resolve(this.referenceProjectRoot, normalizedReferencePath);
        const documentDir = path_1.default.dirname(this.referenceDocumentPath);
        const relativePath = path_1.default.relative(documentDir, targetPath).replace(/\\/g, '/');
        return relativePath || '.';
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
