"use strict";
/**
 * Error type definitions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerificationError = exports.WorkflowError = exports.ConfigError = exports.FileOperationError = exports.ValidationError = exports.InvalidStateTransitionError = exports.FeatureAlreadyExistsError = exports.FeatureNotFoundError = exports.ProjectNotInitializedError = exports.OSpecError = void 0;
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
