import { SkillrcConfig } from '../core/types';
export declare const DEFAULT_STITCH_PLUGIN_CONFIG: {
    enabled: boolean;
    blocking: boolean;
    project: {
        project_id: string;
        project_url: string;
        save_on_first_run: boolean;
        enforce_single_project: boolean;
    };
    gemini: {
        model: string;
        auto_switch_on_limit: boolean;
        save_on_fallback: boolean;
    };
    codex: {
        model: string;
        mcp_server: string;
    };
    runner: {
        mode: string;
        command: string;
        args: string[];
        cwd: string;
        timeout_ms: number;
        token_env: string;
        extra_env: {};
    };
    provider: string;
    capabilities: {
        page_design_review: {
            enabled: boolean;
            step: string;
            activate_when_flags: string[];
        };
    };
};
export declare const DEFAULT_CHECKPOINT_PLUGIN_CONFIG: {
    enabled: boolean;
    blocking: boolean;
    runtime: {
        base_url: string;
        startup: {
            command: string;
            args: never[];
            cwd: string;
            timeout_ms: number;
        };
        readiness: {
            type: string;
            url: string;
            timeout_ms: number;
        };
        shutdown: {
            command: string;
            args: never[];
            cwd: string;
            timeout_ms: number;
        };
        storage_state: string;
    };
    runner: {
        mode: string;
        command: string;
        args: string[];
        cwd: string;
        timeout_ms: number;
        token_env: string;
        extra_env: {};
    };
    capabilities: {
        ui_review: {
            enabled: boolean;
            step: string;
            activate_when_flags: string[];
        };
        flow_check: {
            enabled: boolean;
            step: string;
            activate_when_flags: string[];
        };
    };
    stitch_integration: {
        enabled: boolean;
        auto_pass_stitch_review: boolean;
    };
};
export interface EnabledPluginSummary {
    name: string;
    blocking: boolean;
}
export interface PluginCapabilitySummary {
    plugin: string;
    capability: string;
    step: string;
    activateWhenFlags: string[];
    blocking: boolean;
}
export declare class PluginWorkflowComposer {
    private config;
    constructor(config: SkillrcConfig);
    private getBaseConfig;
    getCoreSteps(): string[];
    getBaseOptionalSteps(): Record<string, {
        enabled: boolean;
        when: string[];
    }>;
    getActivatedBaseSteps(featureFlags: string[]): string[];
    getEnabledPlugins(): EnabledPluginSummary[];
    getStitchCapabilities(): PluginCapabilitySummary[];
    getCheckpointCapabilities(): PluginCapabilitySummary[];
    getPluginCapabilities(): PluginCapabilitySummary[];
    getPluginContributedSteps(): string[];
    getActivatedPluginSteps(featureFlags: string[]): string[];
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
        pluginSteps: string[];
        totalSteps: number;
        enabledPlugins: string[];
        flags: string[];
        unsupportedFlags: string[];
    };
}