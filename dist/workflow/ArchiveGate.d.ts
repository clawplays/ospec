import { FeatureState } from '../core/types';
export interface ArchiveGateConfig {
    require_verification: boolean;
    require_skill_update: boolean;
    require_index_regenerated: boolean;
    require_optional_steps_passed: boolean;
}
export interface ArchiveCheckResult {
    canArchive: boolean;
    checks: {
        name: string;
        passed: boolean;
        message: string;
    }[];
    blockers: string[];
    warnings: string[];
}
export interface ArchiveProtocolState {
    activatedSteps: string[];
    tasksOptionalSteps: string[];
    verificationOptionalSteps: string[];
    passedOptionalSteps: string[];
    tasksComplete: boolean;
    verificationComplete: boolean;
}
export declare class ArchiveGate {
    checkArchiveReadiness(featureState: FeatureState, config: ArchiveGateConfig, protocolState?: ArchiveProtocolState): Promise<ArchiveCheckResult>;
}
export declare const archiveGate: ArchiveGate;