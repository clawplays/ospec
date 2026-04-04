/**
 * 钩子系统
 * 执行工作流前后的回调
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
     * 注册钩子
     */
    register(event: HookEvent, handler: (context: any) => Promise<void> | void, priority?: number): void;
    /**
     * 执行钩子
     */
    execute(event: HookEvent, context?: any): Promise<void>;
    /**
     * 移除钩子
     */
    unregister(event: HookEvent, handler: (context: any) => Promise<void> | void): void;
    /**
     * 清空所有钩子
     */
    clear(): void;
    /**
     * 获取已注册的钩子列表
     */
    getHooks(event?: HookEvent): {
        event: HookEvent;
        count: number;
    }[];
}
export declare const hookSystem: HookSystem;