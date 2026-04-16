import { FileService } from './FileService';
export type PostSyncMaintenanceTaskResult = {
    taskId: string;
    removedPaths: string[];
};
export type PostSyncMaintenanceResult = {
    removedPaths: string[];
    tasks: PostSyncMaintenanceTaskResult[];
};
export declare class PostSyncMaintenanceService {
    private readonly fileService;
    constructor(fileService: FileService);
    runManagedSkillPostprocessing(): Promise<PostSyncMaintenanceResult>;
    private removeLegacyPluginSkills;
    private getLegacyPluginSkillPaths;
    private resolveProviderHome;
}
export declare function createPostSyncMaintenanceService(fileService: FileService): PostSyncMaintenanceService;
