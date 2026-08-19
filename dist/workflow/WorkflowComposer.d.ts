import { SkillrcConfig } from '../core/types';
export declare class WorkflowComposer {
    private config;
    constructor(config: SkillrcConfig);
    private getBaseConfig;
    getCoreSteps(): string[];
    getBaseOptionalSteps(): Record<string, {
        enabled: boolean;
        when: string[];
    }>;
    getActivatedBaseSteps(featureFlags: string[]): string[];
    getActivatedSteps(featureFlags: string[]): string[];
    getSupportedFlags(): string[];
    getArchiveGate(): {
        require_verification: boolean;
        require_skill_update: boolean;
        require_index_regenerated: boolean;
        require_optional_steps_passed: boolean;
    };
    validateFlags(flags: string[]): {
        valid: boolean;
        unsupported: string[];
    };
    getSummary(featureFlags: string[]): {
        mode: string;
        coreSteps: number;
        optionalSteps: string[];
        totalSteps: number;
        flags: string[];
        unsupportedFlags: string[];
    };
}
