import { FileService } from './FileService';
import { DirectCopyProjectAssetDefinition } from './ProjectAssetRegistry';
import { ProjectLayout } from '../core/types';
/**
 * Put the stamp on line 2, under the shebang. Exported so the test that proves
 * the stamped copy still runs does not have to reconstruct the layout.
 */
export declare function stampBuildIndexScript(sourceContent: string, stamp: string): string;
interface AssetManifestOptions {
    projectLayout?: ProjectLayout;
    documentLanguage?: string;
    ospecCliVersion?: string;
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
        repaired: string[];
    }>;
    writeAssetManifest(rootDir: string, options: AssetManifestOptions): Promise<void>;
    private resolveSourceRelativePath;
    private resolveStaticSourceHint;
    private normalizePaths;
    /**
     * 7.10a: write the packaged build-index script into a project with a version
     * stamp, and do nothing at all when the stamp already matches.
     *
     * The stamp goes on line 2, after the shebang, because the copied file is
     * still an executable script and a comment above `#!` would silently stop
     * being a shebang. It is a plain comment, so the file it stamps runs
     * unchanged under `node`.
     *
     * The point is the READ, not the write: the generic sync already compared
     * content and skipped identical files, but it had to read ~104 KB twice to
     * find that out, on every finalize and every archive. This reads 256 bytes.
     */
    private syncStampedBuildIndexScript;
    /**
     * Read only the head of the file. A stale copy from before 7.10a has no
     * stamp and returns null, which routes into a rewrite exactly once.
     */
    private readBuildIndexStamp;
    /**
     * 7.10a: absolute path to the build-index tool inside the INSTALLED package.
     * The git hooks prefer this over `.ospec/tools/build-index-auto.cjs`, so a
     * machine with the CLI installed always runs current code and the project
     * copy is only the fallback for a machine without it.
     */
    getPackagedBuildIndexToolPath(): string;
    private getPackageRoot;
    private getPackageVersion;
    private isOSpecManagedHook;
}
export declare const createProjectAssetService: (fileService: FileService) => ProjectAssetService;
export {};
