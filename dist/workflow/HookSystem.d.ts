/**
 * Hook system.
 * Executes callbacks before and after workflow steps.
 */
export type HookEvent = 'pre-init' | 'post-init' | 'pre-new' | 'post-new' | 'pre-verify' | 'post-verify' | 'pre-archive' | 'post-archive' | 'pre-commit' | 'post-merge';
export interface Hook {
    event: HookEvent;
    handler: (context: any) => Promise<void> | void;
    priority?: number;
}
export declare class HookSystem {
    private hooks;
    /**
     * Register a hook.
     */
    register(event: HookEvent, handler: (context: any) => Promise<void> | void, priority?: number): void;
    /**
     * Execute hooks.
     */
    execute(event: HookEvent, context?: any): Promise<void>;
    /**
     * Remove a hook.
     */
    unregister(event: HookEvent, handler: (context: any) => Promise<void> | void): void;
    /**
     * Clear all hooks.
     */
    clear(): void;
    /**
     * Get the list of registered hooks.
     */
    getHooks(event?: HookEvent): {
        event: HookEvent;
        count: number;
    }[];
}
export declare const hookSystem: HookSystem;
