import { SkillIndex } from '../core/types';
import { SkillParser } from './SkillParser';
export interface IndexWriteResult {
    index: SkillIndex;
    managedPaths: string[];
    removedPaths: string[];
}
export declare class IndexBuilder {
    private skillParser;
    /**
     * One immutable-input cache per run: archived changes never mutate after
     * they are written and markdown documents change rarely, so fingerprinting
     * them turns every rebuild and status check into O(changed inputs).
     * Deleting SKILL.index.cache.json forces a full rescan.
     */
    private runCache;
    constructor(skillParser: SkillParser);
    build(rootDir: string): Promise<SkillIndex>;
    private loadRunCache;
    private saveRunCache;
    private buildSnapshot;
    write(rootDir: string): Promise<SkillIndex>;
    writeWithSummary(rootDir: string): Promise<IndexWriteResult>;
    createEmpty(rootDir: string): Promise<SkillIndex>;
    private stripVolatileFields;
    private readProjectConfig;
    private visitMarkdownDocuments;
    private readMetadataList;
    private inferDocumentKind;
    private scanArchivedChanges;
    private computeArchiveFingerprint;
    private readKnowledgeDocumentFallback;
    private scanArchivedChangesWithHistory;
    private mergeHistoricalStringLists;
    private mergeHistoricalOrderedLists;
    private readArchivedChangeHistory;
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
