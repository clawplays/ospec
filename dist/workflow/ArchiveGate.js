"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.archiveGate = exports.ArchiveGate = void 0;
class ArchiveGate {
    /**
     * The message for one required-step check.
     *
     * M-cfg2: the false branch used to be the single string "<step> required but
     * not completed", printed regardless of whether the step was required. So a
     * project with `require_skill_update: false` -- which is EVERY classic
     * Change, because `ArchiveCommand` forces that flag off -- printed
     *
     *     PASS Skill Updated
     *       Skill update required but not completed
     *
     * a line that contradicts its own verdict on the line above it. Three
     * states, three messages.
     */
    describeRequirement(done, required, labels) {
        if (done)
            return labels.done;
        return required ? labels.pending : labels.waived;
    }
    async checkArchiveReadiness(featureState, config, protocolState) {
        const checks = [];
        const blockers = [];
        const warnings = [];
        const verificationPassed = featureState.completed.includes('verification_passed');
        checks.push({
            name: 'Verification Passed',
            passed: verificationPassed || !config.require_verification,
            message: this.describeRequirement(verificationPassed, config.require_verification, {
                done: 'Verification has been completed',
                pending: 'Verification required but not completed',
                waived: 'Verification not completed, and not required by workflow.archive_gate.require_verification',
            }),
        });
        if (config.require_verification && !verificationPassed) {
            blockers.push('Verification must be completed before archiving');
        }
        const skillUpdated = featureState.completed.includes('skill_updated');
        checks.push({
            name: 'Skill Updated',
            passed: skillUpdated || !config.require_skill_update,
            message: this.describeRequirement(skillUpdated, config.require_skill_update, {
                done: 'Skill documentation has been updated',
                pending: 'Skill update required but not completed',
                waived: 'Skill documentation not updated, and not required by workflow.archive_gate.require_skill_update',
            }),
        });
        if (config.require_skill_update && !skillUpdated) {
            blockers.push('Skill documentation must be updated before archiving');
        }
        const indexRegenerated = featureState.completed.includes('index_regenerated');
        checks.push({
            name: 'Index Regenerated',
            passed: indexRegenerated || !config.require_index_regenerated,
            message: this.describeRequirement(indexRegenerated, config.require_index_regenerated, {
                done: 'Index has been regenerated',
                pending: 'Index regeneration required but not completed',
                waived: 'Index not regenerated, and not required by workflow.archive_gate.require_index_regenerated',
            }),
        });
        if (config.require_index_regenerated && !indexRegenerated) {
            blockers.push('Index must be regenerated before archiving');
        }
        /*
         * M-cfg2: this is where `require_verification: false` was silently undone.
         *
         * The dedicated verification check above honoured the flag, but
         * `verification_passed` was ALSO an unconditional member of the core-step
         * list, so turning the requirement off moved the refusal from
         * "Verification must be completed before archiving" to "All core steps
         * must be completed before archiving" and changed nothing else. The flag
         * had exactly one observable effect: a worse error message.
         *
         * The step is now in the core list only while it is required, which is the
         * one reading under which the flag means what it says.
         */
        const coreSteps = [
            'proposal_complete',
            'tasks_complete',
            'implementation_complete',
            ...(config.require_verification ? ['verification_passed'] : []),
        ];
        const missingCoreSteps = coreSteps.filter(step => !featureState.completed.includes(step));
        const corePassed = missingCoreSteps.length === 0;
        checks.push({
            name: 'Core Steps Completed',
            passed: corePassed,
            message: corePassed
                ? 'All core steps have been completed'
                : `Some core steps are still pending: ${missingCoreSteps.join(', ')}`,
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
            /*
             * M-cfg2: the second place the flag was undone. `verification.md still
             * has unchecked items` is a verification requirement by any reading, and
             * leaving it unconditional meant `require_verification: false` still
             * could not archive a change whose verification checklist was open --
             * the exact state the flag exists to allow.
             */
            if (config.require_verification && !protocolState.verificationComplete) {
                blockers.push('verification.md still has unchecked items');
            }
            checks.push({
                name: 'Proposal Acceptance Checklist',
                passed: protocolState.proposalAcceptanceComplete,
                message: protocolState.proposalAcceptanceComplete
                    ? 'proposal.md acceptance checklist is complete'
                    : 'proposal.md acceptance checklist still has unchecked items',
            });
            if (!protocolState.proposalAcceptanceComplete) {
                blockers.push('proposal.md acceptance checklist still has unchecked items');
            }
            if (protocolState.goalReviewSummaryAligned !== null
                && protocolState.goalReviewSummaryAligned !== undefined) {
                checks.push({
                    name: 'Derived Review Summary',
                    passed: protocolState.goalReviewSummaryAligned,
                    message: protocolState.goalReviewSummaryMessage
                        || (protocolState.goalReviewSummaryAligned
                            ? 'review.md is synced to the final review decision'
                            : 'review.md is not synced to the final review; run ospec execute sync'),
                });
                if (!protocolState.goalReviewSummaryAligned) {
                    blockers.push(protocolState.goalReviewSummaryMessage
                        || 'review.md is not synced to the final review; run ospec execute sync before archiving');
                }
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
