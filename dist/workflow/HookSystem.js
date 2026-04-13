"use strict";
/**
 * Hook system.
 * Executes callbacks before and after workflow steps.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.hookSystem = exports.HookSystem = void 0;
class HookSystem {
    constructor() {
        this.hooks = new Map();
    }
    /**
     * Register a hook.
     */
    register(event, handler, priority = 0) {
        if (!this.hooks.has(event)) {
            this.hooks.set(event, []);
        }
        const hookList = this.hooks.get(event);
        hookList.push({ event, handler, priority });
        // Sort by priority in descending order.
        hookList.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    }
    /**
     * Execute hooks.
     */
    async execute(event, context = {}) {
        const hookList = this.hooks.get(event) || [];
        for (const hook of hookList) {
            await Promise.resolve(hook.handler(context));
        }
    }
    /**
     * Remove a hook.
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
     * Clear all hooks.
     */
    clear() {
        this.hooks.clear();
    }
    /**
     * Get the list of registered hooks.
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
