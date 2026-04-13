import { FileService } from './FileService';
import { Logger } from './Logger';
import { NormalizedProjectBootstrapInput } from './TemplateEngine';
import { ProjectScaffoldPlan } from './ProjectScaffoldService';
export interface ProjectScaffoldCommandStep {
    id: string;
    title: string;
    command: string;
    args: string[];
    shellCommand: string;
    description: string;
    phase: 'install';
}
export interface ProjectScaffoldCommandPlan {
    presetId: string;
    autoExecute: boolean;
    steps: ProjectScaffoldCommandStep[];
    deferredMessage: string;
}
export interface ProjectScaffoldCommandStepResult {
    id: string;
    title: string;
    shellCommand: string;
    status: 'completed' | 'failed' | 'skipped';
    exitCode: number | null;
    durationMs: number;
    stdoutSnippet: string;
    stderrSnippet: string;
}
export interface ProjectScaffoldCommandExecutionResult {
    status: 'skipped' | 'completed' | 'failed';
    steps: ProjectScaffoldCommandStepResult[];
    recoveryFilePath: string | null;
}
export interface ProjectBootstrapRecoveryRecord {
    generatedAt: string;
    projectPresetId: string | null;
    projectName: string;
    failedStep: {
        id: string;
        title: string;
        shellCommand: string;
    };
    createdArtifacts: {
        scaffoldFiles: string[];
        scaffoldDirectories: string[];
        directCopyFiles: string[];
        hooks: string[];
    };
    remediation: string[];
}
interface RecoveryInput {
    normalized: NormalizedProjectBootstrapInput;
    failedStep: ProjectScaffoldCommandStepResult;
    scaffoldCreatedFiles: string[];
    scaffoldCreatedDirectories: string[];
    directCopyCreatedFiles: string[];
    hookInstalledFiles: string[];
}
export declare class ProjectScaffoldCommandService {
    private readonly fileService;
    private readonly logger;
    constructor(fileService: FileService, logger: Logger);
    getPlan(normalized: NormalizedProjectBootstrapInput, scaffoldPlan: ProjectScaffoldPlan | null): ProjectScaffoldCommandPlan | null;
    executePlan(rootDir: string, plan: ProjectScaffoldCommandPlan | null): Promise<ProjectScaffoldCommandExecutionResult>;
    writeRecoveryRecord(rootDir: string, input: RecoveryInput): Promise<string>;
    private executeStep;
    private resolvePackageManagerRunner;
    private limitOutput;
}
export declare const createProjectScaffoldCommandService: (fileService: FileService, logger: Logger) => ProjectScaffoldCommandService;
export {};
