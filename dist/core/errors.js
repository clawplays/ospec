"use strict";
/**
 * Error type definitions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerificationError = exports.WorkflowError = exports.ConfigError = exports.ConcurrentChangeStateError = exports.DamagedChangeStateError = exports.FileOperationError = exports.ValidationError = exports.InvalidStateTransitionError = exports.FeatureAlreadyExistsError = exports.FeatureNotFoundError = exports.ProjectNotInitializedError = exports.OSpecError = void 0;
class OSpecError extends Error {
    constructor(message, code = 'OSPEC_ERROR', details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'OSpecError';
    }
}
exports.OSpecError = OSpecError;
class ProjectNotInitializedError extends OSpecError {
    constructor(message = 'Project not initialized. Run `ospec project init` first.') {
        super(message, 'PROJECT_NOT_INITIALIZED');
    }
}
exports.ProjectNotInitializedError = ProjectNotInitializedError;
class FeatureNotFoundError extends OSpecError {
    constructor(featureName) {
        super(`Feature '${featureName}' not found.`, 'FEATURE_NOT_FOUND', { featureName });
    }
}
exports.FeatureNotFoundError = FeatureNotFoundError;
class FeatureAlreadyExistsError extends OSpecError {
    constructor(featureName) {
        super(`Feature '${featureName}' already exists.`, 'FEATURE_ALREADY_EXISTS', {
            featureName,
        });
    }
}
exports.FeatureAlreadyExistsError = FeatureAlreadyExistsError;
class InvalidStateTransitionError extends OSpecError {
    constructor(currentStatus, targetStatus) {
        super(`Cannot transition from '${currentStatus}' to '${targetStatus}'.`, 'INVALID_STATE_TRANSITION', { currentStatus, targetStatus });
    }
}
exports.InvalidStateTransitionError = InvalidStateTransitionError;
class ValidationError extends OSpecError {
    constructor(message, details) {
        super(message, 'VALIDATION_ERROR', details);
    }
}
exports.ValidationError = ValidationError;
class FileOperationError extends OSpecError {
    constructor(message, details) {
        super(message, 'FILE_OPERATION_ERROR', details);
    }
}
exports.FileOperationError = FileOperationError;
/**
 * M-race1: one change directory whose `state.json` cannot be parsed.
 *
 * Thrown rather than returned so a single-change query stays loud, and typed
 * rather than generic so an enumeration over many changes can catch exactly
 * this one failure -- degrading the damaged change while still listing the
 * healthy ones -- without also swallowing a bug in the item builder.
 */
class DamagedChangeStateError extends OSpecError {
    constructor(changeName, reason) {
        super(`Change '${changeName}' has an unreadable state.json: ${reason}`, 'DAMAGED_CHANGE_STATE', { changeName, reason });
        this.changeName = changeName;
        this.name = 'DamagedChangeStateError';
    }
}
exports.DamagedChangeStateError = DamagedChangeStateError;
/**
 * M-race2: `state.json` changed underneath a read-assess-write.
 *
 * Typed so `finalizeChange` can retry exactly this failure once and let every
 * other error through untouched -- a bare `catch` around a retry would also
 * swallow a genuine archive-readiness refusal and try it again.
 */
class ConcurrentChangeStateError extends OSpecError {
    constructor(changeName, reason) {
        super(`Change '${changeName}' was modified by another process while finalizing: ${reason}. `
            + 'Nothing was archived. Wait for the other operation to finish, then run finalize again.', 'CONCURRENT_CHANGE_STATE', { changeName, reason });
        this.changeName = changeName;
        this.name = 'ConcurrentChangeStateError';
    }
}
exports.ConcurrentChangeStateError = ConcurrentChangeStateError;
class ConfigError extends OSpecError {
    constructor(message, details) {
        super(message, 'CONFIG_ERROR', details);
    }
}
exports.ConfigError = ConfigError;
class WorkflowError extends OSpecError {
    constructor(message, details) {
        super(message, 'WORKFLOW_ERROR', details);
    }
}
exports.WorkflowError = WorkflowError;
class VerificationError extends OSpecError {
    constructor(message, details) {
        super(message, 'VERIFICATION_ERROR', details);
    }
}
exports.VerificationError = VerificationError;
