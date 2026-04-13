import { FileService } from './FileService';
import { DirectCopyProjectAssetDefinition } from './ProjectAssetRegistry';
import { ProjectLayout } from '../core/types';
interface AssetManifestOptions {
    projectLayout?: ProjectLayout;
    documentLanguage?: string;
    templateGeneratedPaths: string[];
    runtimeGeneratedPaths: string[];
}
export declare class ProjectAssetService {
    private readonly fileService;
    constructor(fileService: FileService);
    getDirectCopyAssets(): DirectCopyProjectAssetDefinition[];
    getDirectCopyTargetPaths(projectLayout?: ProjectLayout): string[];
    getAssetPlan(documentLanguage?: string, projectLayout?: ProjectLayout): {
        directCopyFiles: string[];
        templateGeneratedFiles: string[];
        runtimeGeneratedFiles: string[];
        localizedCopySources: Array<{
            targetRelativePath: string;
            sourceRelativePath: string;
        }>;
    };
    installDirectCopyAssets(rootDir: string, documentLanguage?: string, projectLayout?: ProjectLayout): Promise<{
        created: string[];
        skipped: string[];
    }>;
    syncDirectCopyAssets(rootDir: string, documentLanguage?: string, options?: {
        targetRelativePaths?: string[];
        projectLayout?: ProjectLayout;
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
