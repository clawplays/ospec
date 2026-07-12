import { SkillIndex } from '../core/types';
import { SkillParser } from './SkillParser';
export declare class IndexBuilder {
    private skillParser;
    constructor(skillParser: SkillParser);
    build(rootDir: string): Promise<SkillIndex>;
    private buildSnapshot;
    write(rootDir: string): Promise<SkillIndex>;
    createEmpty(rootDir: string): Promise<SkillIndex>;
    private stripVolatileFields;
    private readProjectConfig;
    private visitMarkdownDocuments;
    private readMetadataList;
    private inferDocumentKind;
    private scanArchivedChanges;
    private readArchivedChange;
    private writeArchivedChangeKnowledgeDocuments;
    private getKnowledgeDocumentRelativePath;
    private assertGeneratedKnowledgeDocumentReplaceable;
    private renderKnowledgeList;
    private renderKnowledgeCodeList;
    private removeStaleArchivedKnowledgeDocuments;
    private getArchivedKnowledgeCopy;
    private writeFeatureIndex;
    private getFeatureIndexCopy;
}
export declare const createIndexBuilder: (skillParser: SkillParser) => IndexBuilder;
