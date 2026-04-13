import { QueuedChangeStatusItem } from '../core/types';
import { FileService } from './FileService';
import { ProjectService } from './ProjectService';
export declare class QueueService {
    private fileService;
    private projectService;
    constructor(fileService: FileService, projectService: ProjectService);
    listQueuedChangeNames(rootDir: string): Promise<string[]>;
    getQueuedChanges(rootDir: string): Promise<QueuedChangeStatusItem[]>;
    activateQueuedChange(rootDir: string, changeName: string, activationSource?: string): Promise<QueuedChangeStatusItem>;
    activateNextQueuedChange(rootDir: string, activationSource?: string): Promise<QueuedChangeStatusItem | null>;
    private buildQueuedChangeStatusItem;
    private extractDescription;
    private toRelativePath;
    private getProjectConfig;
}
export declare function createQueueService(fileService: FileService, projectService: ProjectService): QueueService;
