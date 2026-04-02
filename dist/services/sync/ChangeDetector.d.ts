import { FileService } from '../FileService';
export interface DetectedFileChange {
    path: string;
    type: 'added' | 'modified' | 'deleted';
}
export interface ChangeDetectionOptions {
    staged?: boolean;
    filePatterns?: string[] | string;
    excludePatterns?: string[] | string;
}
export declare class ChangeDetector {
    private fileService;
    constructor(fileService?: FileService);
    detectChanges(rootDir: string, options?: ChangeDetectionOptions): Promise<DetectedFileChange[]>;
    private execGit;
    private parseStatusLine;
    private normalizePatterns;
    private matchesAnyPattern;
    private matchesPattern;
    private globToRegExp;
}
export declare function createChangeDetector(fileService: FileService): ChangeDetector;
