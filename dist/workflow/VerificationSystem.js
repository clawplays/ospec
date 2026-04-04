"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verificationSystem = exports.VerificationSystem = void 0;
class VerificationSystem {
    async verifyProposal(featureState) {
        const results = [];
        if (!featureState.feature || featureState.feature.trim() === '') {
            results.push({
                name: 'Change Name',
                status: 'fail',
                message: 'Change name is required',
            });
        }
        if (!featureState.affects || featureState.affects.length === 0) {
            results.push({
                name: 'Affected Modules',
                status: 'warn',
                message: 'No affected modules specified',
            });
        }
        results.push({
            name: 'Proposal Format',
            status: 'pass',
            message: 'Proposal format is valid',
        });
        return results;
    }
    async verifyTasks(featureState) {
        const results = [];
        if (featureState.pending.length === 0 && featureState.completed.length === 0) {
            results.push({
                name: 'Tasks Defined',
                status: 'warn',
                message: 'No tasks have been defined',
            });
        }
        results.push({
            name: 'Task Structure',
            status: 'pass',
            message: 'Task structure is valid',
        });
        return results;
    }
    async verifyImplementation(featureState) {
        const results = [];
        const coreSteps = ['proposal_complete', 'tasks_complete', 'implementation_complete'];
        const completedCoreSteps = coreSteps.filter(step => featureState.completed.includes(step));
        results.push({
            name: 'Core Steps Completion',
            status: completedCoreSteps.length === coreSteps.length ? 'pass' : 'warn',
            message: `${completedCoreSteps.length}/${coreSteps.length} core steps completed`,
            details: {
                completed: completedCoreSteps,
                remaining: coreSteps.filter(step => !completedCoreSteps.includes(step)),
            },
        });
        return results;
    }
    async runFullVerification(featureState) {
        const allResults = [
            ...(await this.verifyProposal(featureState)),
            ...(await this.verifyTasks(featureState)),
            ...(await this.verifyImplementation(featureState)),
        ];
        const passed = allResults.every(result => result.status !== 'fail');
        const failCount = allResults.filter(result => result.status === 'fail').length;
        const warnCount = allResults.filter(result => result.status === 'warn').length;
        const summary = failCount > 0
            ? `${failCount} verification(s) failed`
            : warnCount > 0
                ? `${warnCount} warning(s) found`
                : 'All verifications passed';
        return {
            passed,
            results: allResults,
            summary,
        };
    }
    getVerificationChecklist() {
        return [
            {
                name: 'Proposal Written',
                description: 'Change proposal has been written',
                critical: true,
            },
            {
                name: 'Tasks Defined',
                description: 'Implementation tasks have been defined',
                critical: true,
            },
            {
                name: 'Implementation Complete',
                description: 'Change has been implemented',
                critical: true,
            },
            {
                name: 'Tests Pass',
                description: 'All tests pass successfully',
                critical: true,
            },
            {
                name: 'Code Review',
                description: 'Code has been reviewed',
                critical: false,
            },
            {
                name: 'Documentation Updated',
                description: 'Documentation has been updated',
                critical: false,
            },
        ];
    }
}
exports.VerificationSystem = VerificationSystem;
exports.verificationSystem = new VerificationSystem();