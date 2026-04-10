/**
 * 服务层导出
 */
export { FileService, fileService } from './FileService';
export { ConfigManager, createConfigManager } from './ConfigManager';
export { StateManager, createStateManager } from './StateManager';
export { SkillParser, skillParser } from './SkillParser';
export { TemplateEngine, templateEngine } from './TemplateEngine';
export { ValidationService, validationService } from './ValidationService';
export { Logger, LogLevel, logger } from './Logger';
export { IndexBuilder, createIndexBuilder } from './IndexBuilder';
export { ProjectAssetService, createProjectAssetService } from './ProjectAssetService';
export { ProjectScaffoldService, createProjectScaffoldService } from './ProjectScaffoldService';
export { ProjectScaffoldCommandService, createProjectScaffoldCommandService, } from './ProjectScaffoldCommandService';
export { ProjectService, createProjectService } from './ProjectService';
export { QueueService, createQueueService } from './QueueService';
export { RunService, createRunService } from './RunService';
import { FileService } from './FileService';
import { ConfigManager } from './ConfigManager';
import { StateManager } from './StateManager';
import { SkillParser } from './SkillParser';
import { TemplateEngine } from './TemplateEngine';
import { ValidationService } from './ValidationService';
import { Logger } from './Logger';
import { IndexBuilder } from './IndexBuilder';
import { ProjectAssetService } from './ProjectAssetService';
import { ProjectScaffoldService } from './ProjectScaffoldService';
import { ProjectScaffoldCommandService } from './ProjectScaffoldCommandService';
import { ProjectService } from './ProjectService';
import { QueueService } from './QueueService';
import { RunService } from './RunService';
export declare class ServiceContainer {
    private static instance;
    readonly fileService: FileService;
    readonly configManager: ConfigManager;
    readonly stateManager: StateManager;
    readonly skillParser: SkillParser;
    readonly templateEngine: TemplateEngine;
    readonly validationService: ValidationService;
    readonly logger: Logger;
    readonly indexBuilder: IndexBuilder;
    readonly projectAssetService: ProjectAssetService;
    readonly projectScaffoldService: ProjectScaffoldService;
    readonly projectScaffoldCommandService: ProjectScaffoldCommandService;
    readonly projectService: ProjectService;
    readonly queueService: QueueService;
    readonly runService: RunService;
    private constructor();
    static getInstance(): ServiceContainer;
}
export declare const services: ServiceContainer;