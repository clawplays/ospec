"use strict";
/**
 * Service layer entrypoints.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createVerificationService = exports.VerificationService = exports.createTriageService = exports.TriageService = exports.createLoopService = exports.LoopService = exports.createClaudeHookService = exports.ClaudeHookService = exports.createTaskGraphExecutionService = exports.TaskGraphExecutionService = exports.createRunService = exports.RunService = exports.createQueueService = exports.QueueService = exports.createProjectService = exports.ProjectService = exports.createProjectScaffoldCommandService = exports.ProjectScaffoldCommandService = exports.createProjectScaffoldService = exports.ProjectScaffoldService = exports.createProjectAssetService = exports.ProjectAssetService = exports.updateFeatureCatalogRows = exports.FEATURE_CATALOG_RELATIVE_PATH = exports.createIndexBuilder = exports.IndexBuilder = exports.logger = exports.LogLevel = exports.Logger = exports.validationService = exports.ValidationService = exports.templateEngine = exports.TemplateEngine = exports.createFeatureCaptureService = exports.FeatureCaptureService = exports.DOCS_OBLIGATION_CHANGE_TYPES = exports.createDocsObligationService = exports.DocsObligationService = exports.createDocsObligationPlanner = exports.DocsObligationPlanner = exports.createDocsAuditService = exports.DocsAuditService = exports.skillParser = exports.SkillParser = exports.createStateManager = exports.StateManager = exports.createConfigManager = exports.ConfigManager = exports.fileService = exports.FileService = void 0;
exports.services = exports.ServiceContainer = exports.PLUGIN_MIGRATION_PROVENANCE_RELATIVE_PATH = exports.createLegacyPluginMigrationService = exports.LegacyPluginMigrationService = exports.createRuntimeExecutionAdapterService = exports.RuntimeExecutionAdapterService = exports.createCapabilityProbeService = exports.CapabilityProbeService = void 0;
var FileService_1 = require("./FileService");
Object.defineProperty(exports, "FileService", { enumerable: true, get: function () { return FileService_1.FileService; } });
Object.defineProperty(exports, "fileService", { enumerable: true, get: function () { return FileService_1.fileService; } });
var ConfigManager_1 = require("./ConfigManager");
Object.defineProperty(exports, "ConfigManager", { enumerable: true, get: function () { return ConfigManager_1.ConfigManager; } });
Object.defineProperty(exports, "createConfigManager", { enumerable: true, get: function () { return ConfigManager_1.createConfigManager; } });
var StateManager_1 = require("./StateManager");
Object.defineProperty(exports, "StateManager", { enumerable: true, get: function () { return StateManager_1.StateManager; } });
Object.defineProperty(exports, "createStateManager", { enumerable: true, get: function () { return StateManager_1.createStateManager; } });
var SkillParser_1 = require("./SkillParser");
Object.defineProperty(exports, "SkillParser", { enumerable: true, get: function () { return SkillParser_1.SkillParser; } });
Object.defineProperty(exports, "skillParser", { enumerable: true, get: function () { return SkillParser_1.skillParser; } });
var DocsAuditService_1 = require("./DocsAuditService");
Object.defineProperty(exports, "DocsAuditService", { enumerable: true, get: function () { return DocsAuditService_1.DocsAuditService; } });
Object.defineProperty(exports, "createDocsAuditService", { enumerable: true, get: function () { return DocsAuditService_1.createDocsAuditService; } });
var DocsObligationPlanner_1 = require("./DocsObligationPlanner");
Object.defineProperty(exports, "DocsObligationPlanner", { enumerable: true, get: function () { return DocsObligationPlanner_1.DocsObligationPlanner; } });
Object.defineProperty(exports, "createDocsObligationPlanner", { enumerable: true, get: function () { return DocsObligationPlanner_1.createDocsObligationPlanner; } });
var DocsObligationService_1 = require("./DocsObligationService");
Object.defineProperty(exports, "DocsObligationService", { enumerable: true, get: function () { return DocsObligationService_1.DocsObligationService; } });
Object.defineProperty(exports, "createDocsObligationService", { enumerable: true, get: function () { return DocsObligationService_1.createDocsObligationService; } });
Object.defineProperty(exports, "DOCS_OBLIGATION_CHANGE_TYPES", { enumerable: true, get: function () { return DocsObligationService_1.DOCS_OBLIGATION_CHANGE_TYPES; } });
var FeatureCaptureService_1 = require("./FeatureCaptureService");
Object.defineProperty(exports, "FeatureCaptureService", { enumerable: true, get: function () { return FeatureCaptureService_1.FeatureCaptureService; } });
Object.defineProperty(exports, "createFeatureCaptureService", { enumerable: true, get: function () { return FeatureCaptureService_1.createFeatureCaptureService; } });
var TemplateEngine_1 = require("./TemplateEngine");
Object.defineProperty(exports, "TemplateEngine", { enumerable: true, get: function () { return TemplateEngine_1.TemplateEngine; } });
Object.defineProperty(exports, "templateEngine", { enumerable: true, get: function () { return TemplateEngine_1.templateEngine; } });
var ValidationService_1 = require("./ValidationService");
Object.defineProperty(exports, "ValidationService", { enumerable: true, get: function () { return ValidationService_1.ValidationService; } });
Object.defineProperty(exports, "validationService", { enumerable: true, get: function () { return ValidationService_1.validationService; } });
var Logger_1 = require("./Logger");
Object.defineProperty(exports, "Logger", { enumerable: true, get: function () { return Logger_1.Logger; } });
Object.defineProperty(exports, "LogLevel", { enumerable: true, get: function () { return Logger_1.LogLevel; } });
Object.defineProperty(exports, "logger", { enumerable: true, get: function () { return Logger_1.logger; } });
var IndexBuilder_1 = require("./IndexBuilder");
Object.defineProperty(exports, "IndexBuilder", { enumerable: true, get: function () { return IndexBuilder_1.IndexBuilder; } });
Object.defineProperty(exports, "createIndexBuilder", { enumerable: true, get: function () { return IndexBuilder_1.createIndexBuilder; } });
// 7.4: the catalogue row format and the archive-time update primitive that
// track C's 7.7 calls instead of reimplementing it.
var FeatureCatalog_1 = require("./FeatureCatalog");
Object.defineProperty(exports, "FEATURE_CATALOG_RELATIVE_PATH", { enumerable: true, get: function () { return FeatureCatalog_1.FEATURE_CATALOG_RELATIVE_PATH; } });
Object.defineProperty(exports, "updateFeatureCatalogRows", { enumerable: true, get: function () { return FeatureCatalog_1.updateFeatureCatalogRows; } });
var ProjectAssetService_1 = require("./ProjectAssetService");
Object.defineProperty(exports, "ProjectAssetService", { enumerable: true, get: function () { return ProjectAssetService_1.ProjectAssetService; } });
Object.defineProperty(exports, "createProjectAssetService", { enumerable: true, get: function () { return ProjectAssetService_1.createProjectAssetService; } });
var ProjectScaffoldService_1 = require("./ProjectScaffoldService");
Object.defineProperty(exports, "ProjectScaffoldService", { enumerable: true, get: function () { return ProjectScaffoldService_1.ProjectScaffoldService; } });
Object.defineProperty(exports, "createProjectScaffoldService", { enumerable: true, get: function () { return ProjectScaffoldService_1.createProjectScaffoldService; } });
var ProjectScaffoldCommandService_1 = require("./ProjectScaffoldCommandService");
Object.defineProperty(exports, "ProjectScaffoldCommandService", { enumerable: true, get: function () { return ProjectScaffoldCommandService_1.ProjectScaffoldCommandService; } });
Object.defineProperty(exports, "createProjectScaffoldCommandService", { enumerable: true, get: function () { return ProjectScaffoldCommandService_1.createProjectScaffoldCommandService; } });
var ProjectService_1 = require("./ProjectService");
Object.defineProperty(exports, "ProjectService", { enumerable: true, get: function () { return ProjectService_1.ProjectService; } });
Object.defineProperty(exports, "createProjectService", { enumerable: true, get: function () { return ProjectService_1.createProjectService; } });
var QueueService_1 = require("./QueueService");
Object.defineProperty(exports, "QueueService", { enumerable: true, get: function () { return QueueService_1.QueueService; } });
Object.defineProperty(exports, "createQueueService", { enumerable: true, get: function () { return QueueService_1.createQueueService; } });
var RunService_1 = require("./RunService");
Object.defineProperty(exports, "RunService", { enumerable: true, get: function () { return RunService_1.RunService; } });
Object.defineProperty(exports, "createRunService", { enumerable: true, get: function () { return RunService_1.createRunService; } });
var TaskGraphExecutionService_1 = require("./TaskGraphExecutionService");
Object.defineProperty(exports, "TaskGraphExecutionService", { enumerable: true, get: function () { return TaskGraphExecutionService_1.TaskGraphExecutionService; } });
Object.defineProperty(exports, "createTaskGraphExecutionService", { enumerable: true, get: function () { return TaskGraphExecutionService_1.createTaskGraphExecutionService; } });
var ClaudeHookService_1 = require("./ClaudeHookService");
Object.defineProperty(exports, "ClaudeHookService", { enumerable: true, get: function () { return ClaudeHookService_1.ClaudeHookService; } });
Object.defineProperty(exports, "createClaudeHookService", { enumerable: true, get: function () { return ClaudeHookService_1.createClaudeHookService; } });
var LoopService_1 = require("./LoopService");
Object.defineProperty(exports, "LoopService", { enumerable: true, get: function () { return LoopService_1.LoopService; } });
Object.defineProperty(exports, "createLoopService", { enumerable: true, get: function () { return LoopService_1.createLoopService; } });
var TriageService_1 = require("./TriageService");
Object.defineProperty(exports, "TriageService", { enumerable: true, get: function () { return TriageService_1.TriageService; } });
Object.defineProperty(exports, "createTriageService", { enumerable: true, get: function () { return TriageService_1.createTriageService; } });
var VerificationService_1 = require("./VerificationService");
Object.defineProperty(exports, "VerificationService", { enumerable: true, get: function () { return VerificationService_1.VerificationService; } });
Object.defineProperty(exports, "createVerificationService", { enumerable: true, get: function () { return VerificationService_1.createVerificationService; } });
var CapabilityProbeService_1 = require("./CapabilityProbeService");
Object.defineProperty(exports, "CapabilityProbeService", { enumerable: true, get: function () { return CapabilityProbeService_1.CapabilityProbeService; } });
Object.defineProperty(exports, "createCapabilityProbeService", { enumerable: true, get: function () { return CapabilityProbeService_1.createCapabilityProbeService; } });
var RuntimeExecutionAdapterService_1 = require("./RuntimeExecutionAdapterService");
Object.defineProperty(exports, "RuntimeExecutionAdapterService", { enumerable: true, get: function () { return RuntimeExecutionAdapterService_1.RuntimeExecutionAdapterService; } });
Object.defineProperty(exports, "createRuntimeExecutionAdapterService", { enumerable: true, get: function () { return RuntimeExecutionAdapterService_1.createRuntimeExecutionAdapterService; } });
var LegacyPluginMigrationService_1 = require("./LegacyPluginMigrationService");
Object.defineProperty(exports, "LegacyPluginMigrationService", { enumerable: true, get: function () { return LegacyPluginMigrationService_1.LegacyPluginMigrationService; } });
Object.defineProperty(exports, "createLegacyPluginMigrationService", { enumerable: true, get: function () { return LegacyPluginMigrationService_1.createLegacyPluginMigrationService; } });
Object.defineProperty(exports, "PLUGIN_MIGRATION_PROVENANCE_RELATIVE_PATH", { enumerable: true, get: function () { return LegacyPluginMigrationService_1.PLUGIN_MIGRATION_PROVENANCE_RELATIVE_PATH; } });
// Service container
const FileService_2 = require("./FileService");
const ConfigManager_2 = require("./ConfigManager");
const StateManager_2 = require("./StateManager");
const SkillParser_2 = require("./SkillParser");
const FeatureCaptureService_2 = require("./FeatureCaptureService");
const DocsObligationService_2 = require("./DocsObligationService");
const DocsObligationPlanner_2 = require("./DocsObligationPlanner");
const DocsAuditService_2 = require("./DocsAuditService");
const TemplateEngine_2 = require("./TemplateEngine");
const ValidationService_2 = require("./ValidationService");
const Logger_2 = require("./Logger");
const IndexBuilder_2 = require("./IndexBuilder");
const ProjectAssetService_2 = require("./ProjectAssetService");
const ProjectScaffoldService_2 = require("./ProjectScaffoldService");
const ProjectScaffoldCommandService_2 = require("./ProjectScaffoldCommandService");
const ProjectService_2 = require("./ProjectService");
const QueueService_2 = require("./QueueService");
const RunService_2 = require("./RunService");
const TaskGraphExecutionService_2 = require("./TaskGraphExecutionService");
const ClaudeHookService_2 = require("./ClaudeHookService");
const LoopService_2 = require("./LoopService");
const TriageService_2 = require("./TriageService");
const LegacyPluginMigrationService_2 = require("./LegacyPluginMigrationService");
class ServiceContainer {
    constructor() {
        this.fileService = FileService_2.fileService;
        this.configManager = (0, ConfigManager_2.createConfigManager)(FileService_2.fileService);
        this.stateManager = (0, StateManager_2.createStateManager)(FileService_2.fileService);
        this.skillParser = SkillParser_2.skillParser;
        this.featureCaptureService = (0, FeatureCaptureService_2.createFeatureCaptureService)(FileService_2.fileService);
        this.docsObligationService = (0, DocsObligationService_2.createDocsObligationService)(FileService_2.fileService);
        this.docsAuditService = (0, DocsAuditService_2.createDocsAuditService)(FileService_2.fileService);
        this.docsObligationPlanner = (0, DocsObligationPlanner_2.createDocsObligationPlanner)(FileService_2.fileService, this.docsObligationService, this.featureCaptureService);
        this.templateEngine = TemplateEngine_2.templateEngine;
        this.validationService = ValidationService_2.validationService;
        this.logger = Logger_2.logger;
        this.indexBuilder = (0, IndexBuilder_2.createIndexBuilder)(SkillParser_2.skillParser);
        this.projectAssetService = (0, ProjectAssetService_2.createProjectAssetService)(FileService_2.fileService);
        this.projectScaffoldService = (0, ProjectScaffoldService_2.createProjectScaffoldService)(FileService_2.fileService);
        this.projectScaffoldCommandService = (0, ProjectScaffoldCommandService_2.createProjectScaffoldCommandService)(FileService_2.fileService, Logger_2.logger);
        this.legacyPluginMigrationService = (0, LegacyPluginMigrationService_2.createLegacyPluginMigrationService)(FileService_2.fileService);
        this.projectService = (0, ProjectService_2.createProjectService)(FileService_2.fileService, this.configManager, TemplateEngine_2.templateEngine, this.indexBuilder, this.skillParser, this.projectAssetService, this.projectScaffoldService, this.projectScaffoldCommandService);
        this.queueService = (0, QueueService_2.createQueueService)(FileService_2.fileService, this.projectService);
        this.runService = (0, RunService_2.createRunService)(FileService_2.fileService, this.projectService, this.queueService);
        this.taskGraphExecutionService = (0, TaskGraphExecutionService_2.createTaskGraphExecutionService)(FileService_2.fileService);
        this.claudeHookService = (0, ClaudeHookService_2.createClaudeHookService)(FileService_2.fileService);
        this.loopService = (0, LoopService_2.createLoopService)(FileService_2.fileService, {
            taskGraphExecutionService: this.taskGraphExecutionService,
        });
        this.triageService = (0, TriageService_2.createTriageService)(FileService_2.fileService);
    }
    static getInstance() {
        if (!ServiceContainer.instance) {
            ServiceContainer.instance = new ServiceContainer();
        }
        return ServiceContainer.instance;
    }
}
exports.ServiceContainer = ServiceContainer;
exports.services = ServiceContainer.getInstance();
