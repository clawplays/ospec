export interface FinalizeCommandOptions {
    forceArchive?: boolean;
    confirmForceArchive?: string;
    reason?: string;
    reasonFile?: string;
}
export declare class FinalizeCommand {
    execute(featurePath?: string, options?: FinalizeCommandOptions): Promise<void>;
}
