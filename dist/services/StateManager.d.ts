import { FeatureState, FeatureStatus, ProjectMode } from '../core/types';
import { FileService } from './FileService';
export declare class StateManager {
    private fileService;
    constructor(fileService: FileService);
    readState(featurePath: string): Promise<FeatureState>;
    writeState(featurePath: string, state: FeatureState): Promise<void>;
    validateTransition(currentStatus: FeatureStatus, targetStatus: FeatureStatus): boolean;
    transitionStatus(featurePath: string, targetStatus: FeatureStatus): Promise<void>;
    createInitialState(feature: string, affects: string[], mode?: ProjectMode, options?: {
        queued?: boolean;
        source?: string;
    }): FeatureState;
}
export declare function createStateManager(fileService: FileService): StateManager;
