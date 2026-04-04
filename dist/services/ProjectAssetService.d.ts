import { FileService } from './FileService';
import { DirectCopyProjectAssetDefinition } from './ProjectAssetRegistry';
interface AssetManifestOptions {
    documentLanguage?: string;
    templateGeneratedPaths: string[];
    runtimeGeneratedPaths: string[];
}
export declare class ProjectAssetService {
    private readonly fileService;
    constructor(fileService: FileService);
    getDirectCopyAssets(): DirectCopyProjectAssetDefinition[];
    getDirectCopyTargetPaths(): string[];
    getAssetPlan(documentLanguage?: string): {
        directCopyFiles: string[];
        templateGeneratedFiles: string[];
        runtimeGeneratedFiles: string[];
        localizedCopySources: Array<{
            targetRelativePath: string;
            sourceRelativePath: string;
        }>;
    };
    installDirectCopyAssets(rootDir: string, documentLanguage?: string): Promise<{
        created: string[];
        skipped: string[];
    }>;
    syncDirectCopyAssets(rootDir: string, documentLanguage?: string, options?: {
        targetRelativePaths?: string[];
    }): Promise<{
        created: string[];
        refreshed: string[];
        skipped: string[];
    }>;
    installGitHooks(rootDir: string, hookConfig?: {
        'pre-commit': boolean;
        'post-merge': boolean;
    }): Promise<{
        installed: string[];
        skipped: string[];
    }>;
    writeAssetManifest(rootDir: string, options: AssetManifestOptions): Promise<void>;
    private resolveSourceRelativePath;
    private resolveStaticSourceHint;
    private normalizePaths;
    private getPackageRoot;
    private isOSpecManagedHook;
}
export declare const createProjectAssetService: (fileService: FileService) => ProjectAssetService;
export {};
