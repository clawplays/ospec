import { FileService } from './FileService';
interface PluginRegistryEntry {
    id: string;
    packageName: string;
    displayName: string;
    description: string;
    official: boolean;
    kinds: string[];
    installRange?: string;
    docs?: {
        locales?: Record<string, string>;
    };
}
interface PluginHookCommand {
    command: string;
    args?: string[];
    cwd?: string;
    timeout_ms?: number;
    manages_own_artifacts?: boolean;
    passthrough_stdio?: boolean;
}
interface InstalledPluginRecord {
    id: string;
    package_name: string;
    version: string;
    resolved_version?: string;
    display_name: string;
    description: string;
    official: boolean;
    kinds: string[];
    installed_at: string;
    installed_by?: string;
    manifest: NormalizedPluginManifest;
}
interface PluginConfigDefaults {
    enabled?: boolean;
    blocking?: boolean;
    source?: string;
    workspace_root?: string;
    settings?: Record<string, unknown>;
    capabilities?: Record<string, {
        enabled?: boolean;
        blocking?: boolean;
        step?: string;
        activate_when_flags?: string[];
        execution?: string;
    }>;
}
interface NormalizedPluginManifest {
    id: string;
    displayName: string;
    official: boolean;
    description: string;
    kinds: string[];
    installRange: string;
    compatibility: {
        ospec: string;
    };
    capabilities: Array<{
        name: string;
        step: string;
        activateWhenFlags: string[];
        blocking: boolean;
        execution: string;
    }>;
    projectConfigDefaults: PluginConfigDefaults;
    docs: {
        locales: Record<string, string>;
    };
    scaffold: {
        projectFiles: Array<string | {
            from: string;
            to: string;
        }>;
    };
    skills: {
        providers: Record<string, string>;
    };
    knowledge: {
        bundle: string;
    };
    hooks: {
        enable?: PluginHookCommand;
        doctor?: PluginHookCommand;
        run?: PluginHookCommand;
        approve?: PluginHookCommand;
        reject?: PluginHookCommand;
    };
    statusFields: Array<{
        key: string;
        label: string;
        source: string;
    }>;
}
export declare class PluginRegistryService {
    private readonly fileService;
    constructor(fileService: FileService);
    getBundledRegistryPath(): string;
    getPluginsHome(): string;
    getInstalledStatePath(): string;
    getKnowledgeCacheDir(pluginId: string): string;
    getAvailablePlugins(): Promise<PluginRegistryEntry[]>;
    getPluginInfo(identifier: string): Promise<{
        id: string;
        packageName: string;
        displayName: string;
        description: string;
        official: boolean;
        kinds: string[];
        distTags: Record<string, string>;
        latestVersion: string;
        installed: InstalledPluginRecord | null;
        manifest: NormalizedPluginManifest | null;
        installRange: string;
    }>;
    installPlugin(identifier: string): Promise<InstalledPluginRecord>;
    inspectInstalledPluginUpgrade(pluginId: string): Promise<{
        pluginId: string;
        packageName: string;
        installedVersion: string;
        targetVersion: string;
        official: boolean;
        status: 'upgrade' | 'current' | 'missing' | 'skip';
        reason: string;
    }>;
    upgradeInstalledPlugin(pluginId: string, reason?: string): Promise<{
        pluginId: string;
        packageName: string;
        previousVersion: string;
        current: InstalledPluginRecord;
        official: boolean;
    }>;
    reinstallPluginPackage(pluginId: string, packageSpecifier: string, options?: {
        reason?: string;
        resolvedVersion?: string;
        packageName?: string;
    }): Promise<InstalledPluginRecord>;
    resolveCompatibleOfficialVersion(pluginId: string): Promise<string>;
    installOfficialPlugin(pluginId: string, reason: string): Promise<InstalledPluginRecord>;
    private installPackage;
    private resolvePackageNameFromSpecifier;
    private extractPublishedPackageName;
    getInstalledPlugins(): Promise<InstalledPluginRecord[]>;
    getInstalledPluginRecord(pluginId: string): Promise<InstalledPluginRecord | null>;
    getInstalledPluginManifest(pluginId: string): Promise<{
        record: InstalledPluginRecord;
        packagePath: string;
        manifest: NormalizedPluginManifest;
    } | null>;
    private findGlobalInstalledPluginRecord;
    syncProjectPluginAssets(pluginId: string, projectPath: string, workspaceRoot: string): Promise<string[]>;
    createExternalPluginProjectConfig(packageName: string, version: string, manifest: NormalizedPluginManifest): Record<string, unknown>;
    private getOfficialRegistryEntries;
    private getInstalledRegistryEntries;
    private normalizeRegistryEntries;
    private resolvePluginReference;
    private runNpm;
    private tryRunNpmJson;
    private resolveInstalledPackagePath;
    private tryResolveInstalledPackagePath;
    private readInstalledPackageVersion;
    private readPluginManifestFromPackage;
    private normalizePluginManifest;
    private readInstalledState;
    private writeInstalledState;
    private cacheKnowledgeBundle;
    private getCurrentCliVersion;
    private readNpmPackageMetadata;
    private fetchJson;
}
export declare function createPluginRegistryService(fileService: FileService): PluginRegistryService;
export {};
