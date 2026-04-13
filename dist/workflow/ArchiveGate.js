"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.archiveGate = exports.ArchiveGate = void 0;
class ArchiveGate {
    async checkArchiveReadiness(featureState, config, protocolState) {
        const checks = [];
        const blockers = [];
        const warnings = [];
        const verificationPassed = featureState.completed.includes('verification_passed');
        checks.push({
            name: 'Verification Passed',
            passed: verificationPassed || !config.require_verification,
            message: verificationPassed
                ? 'Verification has been completed'
                : 'Verification required but not completed',
        });
        if (config.require_verification && !verificationPassed) {
            blockers.push('Verification must be completed before archiving');
        }
        const skillUpdated = featureState.completed.includes('skill_updated');
        checks.push({
            name: 'Skill Updated',
            passed: skillUpdated || !config.require_skill_update,
            message: skillUpdated
                ? 'Skill documentation has been updated'
                : 'Skill update required but not completed',
        });
        if (config.require_skill_update && !skillUpdated) {
            blockers.push('Skill documentation must be updated before archiving');
        }
        const indexRegenerated = featureState.completed.includes('index_regenerated');
        checks.push({
            name: 'Index Regenerated',
            passed: indexRegenerated || !config.require_index_regenerated,
            message: indexRegenerated
                ? 'Index has been regenerated'
                : 'Index regeneration required but not completed',
        });
        if (config.require_index_regenerated && !indexRegenerated) {
            blockers.push('Index must be regenerated before archiving');
        }
        const coreSteps = [
            'proposal_complete',
            'tasks_complete',
            'implementation_complete',
            'verification_passed',
        ];
        const corePassed = coreSteps.every(step => featureState.completed.includes(step));
        checks.push({
            name: 'Core Steps Completed',
            passed: corePassed,
            message: corePassed
                ? 'All core steps have been completed'
                : 'Some core steps are still pending',
        });
        if (!corePassed) {
            blockers.push('All core steps must be completed before archiving');
        }
        if (featureState.status !== 'ready_to_archive') {
            blockers.push('state.json.status must be ready_to_archive before archiving');
        }
        if (protocolState) {
            const missingTaskCoverage = protocolState.activatedSteps.filter(step => !protocolState.tasksOptionalSteps.includes(step));
            if (missingTaskCoverage.length > 0) {
                blockers.push(`Activated optional steps missing from tasks.md: ${missingTaskCoverage.join(', ')}`);
            }
            const missingVerificationCoverage = protocolState.activatedSteps.filter(step => !protocolState.verificationOptionalSteps.includes(step));
            if (missingVerificationCoverage.length > 0) {
                blockers.push(`Activated optional steps missing from verification.md: ${missingVerificationCoverage.join(', ')}`);
            }
            const missingPassedSteps = protocolState.activatedSteps.filter(step => !protocolState.passedOptionalSteps.includes(step));
            if (config.require_optional_steps_passed && missingPassedSteps.length > 0) {
                blockers.push('All activated optional steps must be passed before archiving');
                warnings.push(`Optional steps not yet passed: ${missingPassedSteps.join(', ')}`);
            }
            if (!protocolState.tasksComplete) {
                blockers.push('tasks.md still has unchecked items');
            }
            if (!protocolState.verificationComplete) {
                blockers.push('verification.md still has unchecked items');
            }
        }
        return {
            canArchive: blockers.length === 0,
            checks,
            blockers,
            warnings,
        };
    }
}
exports.ArchiveGate = ArchiveGate;
exports.archiveGate = new ArchiveGate();
