import { QueueRunProfileId, QueueRunStatusReport } from '../core/types';
import { FileService } from './FileService';
import { ProjectService } from './ProjectService';
import { QueueService } from './QueueService';
export declare class RunService {
    private fileService;
    private projectService;
    private queueService;
    constructor(fileService: FileService, projectService: ProjectService, queueService: QueueService);
    start(rootDir: string, options?: {
        profileId?: QueueRunProfileId;
    }): Promise<QueueRunStatusReport>;
    resume(rootDir: string): Promise<QueueRunStatusReport>;
    step(rootDir: string): Promise<QueueRunStatusReport>;
    stop(rootDir: string): Promise<QueueRunStatusReport>;
    getStatusReport(rootDir: string): Promise<QueueRunStatusReport>;
    getLogTail(rootDir: string, lineCount?: number): Promise<string[]>;
    private buildStatusReport;
    private synchronizeRun;
    private recordCompletedChange;
    private createRun;
    private touchRun;
    private normalizeProfileId;
    private requireCurrentRun;
    private getCurrentRun;
    private saveRun;
    private appendLogEvents;
    private readLogTail;
    private assertRunnableRepository;
    private findArchivedChangePath;
    private ensureRunDirectories;
    private getCurrentRunPath;
    private getHistoryRunPath;
    private resolveRunFilePath;
    private buildActiveInstruction;
    private describeRunStage;
    private getIdleInstruction;
}
export declare function createRunService(fileService: FileService, projectService: ProjectService, queueService: QueueService): RunService;
