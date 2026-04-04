"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.workflowEngine = exports.WorkflowEngine = void 0;
const constants_1 = require("../core/constants");
const errors_1 = require("../core/errors");
class WorkflowEngine {
    async canExecuteStep(featureState, step) {
        const dependencies = this.getStepDependencies(step);
        const completed = new Set(featureState.completed);
        return dependencies.every(dep => completed.has(dep));
    }
    async executeStep(featureState, step) {
        if (!(await this.canExecuteStep(featureState, step))) {
            throw new errors_1.WorkflowError(`Cannot execute step ${step}. Dependencies not met.`);
        }
        featureState.current_step = step;
        if (!featureState.completed.includes(step)) {
            featureState.completed.push(step);
        }
        featureState.pending = featureState.pending.filter(pendingStep => pendingStep !== step);
        featureState.last_updated = new Date().toISOString();
        return featureState;
    }
    getStepDependencies(step) {
        const dependencies = {
            proposal_complete: [],
            tasks_complete: ['proposal_complete'],
            implementation_complete: ['tasks_complete'],
            skill_updated: ['implementation_complete'],
            index_regenerated: ['skill_updated'],
            tests_passed: ['implementation_complete'],
            verification_passed: ['tests_passed', 'index_regenerated'],
            archived: ['verification_passed'],
        };
        return dependencies[step] || [];
    }
    async transitionStatus(currentStatus, targetStatus) {
        if (!constants_1.STATE_TRANSITIONS[currentStatus]?.includes(targetStatus)) {
            throw new errors_1.InvalidStateTransitionError(currentStatus, targetStatus);
        }
    }
    getNextSteps(featureState) {
        return (featureState.pending || []);
    }
    getProgress(featureState) {
        const total = featureState.completed.length + featureState.pending.length;
        const completed = featureState.completed.length;
        return {
            completed,
            total,
            percentage: total === 0 ? 0 : Math.round((completed / total) * 100),
        };
    }
}
exports.WorkflowEngine = WorkflowEngine;
exports.workflowEngine = new WorkflowEngine();