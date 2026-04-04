import { ProjectMode, SkillrcConfig } from '../core/types';
import { FileService } from './FileService';
export declare class ConfigManager {
    private fileService;
    constructor(fileService: FileService);
    loadConfig(rootDir: string): Promise<SkillrcConfig>;
    saveConfig(rootDir: string, config: SkillrcConfig): Promise<void>;
    getMode(rootDir: string): Promise<ProjectMode>;
    isInitialized(rootDir: string): Promise<boolean>;
    createDefaultConfig(mode?: ProjectMode): Promise<SkillrcConfig>;
    private normalizeConfig;
}
export declare function createConfigManager(fileService: FileService): ConfigManager;