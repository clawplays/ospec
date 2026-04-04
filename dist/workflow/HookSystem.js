"use strict";
/**
 * 钩子系统
 * 执行工作流前后的回调
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.hookSystem = exports.HookSystem = void 0;
class HookSystem {
    constructor() {
        this.hooks = new Map();
    }
    /**
     * 注册钩子
     */
    register(event, handler, priority = 0) {
        if (!this.hooks.has(event)) {
            this.hooks.set(event, []);
        }
        const hookList = this.hooks.get(event);
        hookList.push({ event, handler, priority });
        // 按优先级排序（降序）
        hookList.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    }
    /**
     * 执行钩子
     */
    async execute(event, context = {}) {
        const hookList = this.hooks.get(event) || [];
        for (const hook of hookList) {
            await Promise.resolve(hook.handler(context));
        }
    }
    /**
     * 移除钩子
     */
    unregister(event, handler) {
        if (!this.hooks.has(event))
            return;
        const hookList = this.hooks.get(event);
        const index = hookList.findIndex(h => h.handler === handler);
        if (index >= 0) {
            hookList.splice(index, 1);
        }
    }
    /**
     * 清空所有钩子
     */
    clear() {
        this.hooks.clear();
    }
    /**
     * 获取已注册的钩子列表
     */
    getHooks(event) {
        if (event) {
            const count = this.hooks.get(event)?.length || 0;
            return [{ event, count }];
        }
        return Array.from(this.hooks.entries())
            .map(([event, hooks]) => ({ event, count: hooks.length }))
            .filter(h => h.count > 0);
    }
}
exports.HookSystem = HookSystem;
exports.hookSystem = new HookSystem();