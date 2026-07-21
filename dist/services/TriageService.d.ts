import { FileService } from './FileService';
import { resolveManagedPath } from '../utils/ProjectLayout';
export type LayoutConfigInput = Parameters<typeof resolveManagedPath>[2];
export interface TriageItem {
    id: string;
    source: string;
    severity: 'info' | 'low' | 'medium' | 'high';
    title: string;
    suggestedAction: string;
    claimed: boolean;
    claimedBy: string | null;
    createdAt: string;
    changePath: string | null;
}
/**
 * Manages the cross-change triage inbox (`<managed>/triage/inbox.jsonl`). Workflow controllers
 * append findings here; `ospec triage` lists, claims, and promotes them.
 * Paths always go through `resolveManagedPath` so classic and nested layouts both work (Contract 4).
 */
export declare class TriageService {
    private readonly fileService;
    constructor(fileService: FileService);
    inboxPath(projectRoot: string, config: LayoutConfigInput): string;
    append(projectRoot: string, config: LayoutConfigInput, item: Omit<TriageItem, 'id' | 'claimed' | 'claimedBy' | 'createdAt'> & Partial<Pick<TriageItem, 'id' | 'createdAt'>>): Promise<TriageItem>;
    list(projectRoot: string, config: LayoutConfigInput): Promise<TriageItem[]>;
    private writeAll;
    claim(projectRoot: string, config: LayoutConfigInput, id: string, claimedBy: string): Promise<TriageItem>;
}
export declare function createTriageService(fileService: FileService): TriageService;
