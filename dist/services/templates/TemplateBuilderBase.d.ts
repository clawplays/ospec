import { FeatureProjectReference, TemplateDocumentLanguage } from './templateTypes';
type FrontmatterValue = string | number | boolean | string[];
export declare abstract class TemplateBuilderBase {
    private referenceProjectRoot?;
    private referenceDocumentPath?;
    protected setReferenceDocumentContext(projectRoot: string | undefined, documentPath: string | undefined): void;
    protected clearReferenceDocumentContext(): void;
    protected getCurrentDate(): string;
    protected isEnglish(language: TemplateDocumentLanguage): boolean;
    protected copy(language: TemplateDocumentLanguage, zh: string, en: string, ja?: string, ar?: string): string;
    protected formatList(items: string[], emptyFallback: string): string;
    protected formatChecklist(items: string[], emptyFallback: string): string;
    protected formatLinkedList(items: Array<{
        displayName: string;
        path: string;
    }>, emptyFallback: string): string;
    protected formatReferenceList(items: FeatureProjectReference[], emptyFallback: string): string;
    protected formatReferenceChecklist(items: FeatureProjectReference[], emptyFallback: string): string;
    protected withFrontmatter(fields: Record<string, FrontmatterValue | undefined>, body: string): string;
    private resolveReferenceHref;
    private toYamlValue;
}
export {};