/**
 * Error type definitions.
 */
export declare class OSpecError extends Error {
    code: string;
    details?: any | undefined;
    constructor(message: string, code?: string, details?: any | undefined);
}
export declare class ProjectNotInitializedError extends OSpecError {
    constructor(message?: string);
}
export declare class FeatureNotFoundError extends OSpecError {
    constructor(featureName: string);
}
export declare class FeatureAlreadyExistsError extends OSpecError {
    constructor(featureName: string);
}
export declare class InvalidStateTransitionError extends OSpecError {
    constructor(currentStatus: string, targetStatus: string);
}
export declare class ValidationError extends OSpecError {
    constructor(message: string, details?: any);
}
export declare class FileOperationError extends OSpecError {
    constructor(message: string, details?: any);
}
/**
 * M-race1: one change directory whose `state.json` cannot be parsed.
 *
 * Thrown rather than returned so a single-change query stays loud, and typed
 * rather than generic so an enumeration over many changes can catch exactly
 * this one failure -- degrading the damaged change while still listing the
 * healthy ones -- without also swallowing a bug in the item builder.
 */
export declare class DamagedChangeStateError extends OSpecError {
    changeName: string;
    constructor(changeName: string, reason: string);
}
/**
 * M-race2: `state.json` changed underneath a read-assess-write.
 *
 * Typed so `finalizeChange` can retry exactly this failure once and let every
 * other error through untouched -- a bare `catch` around a retry would also
 * swallow a genuine archive-readiness refusal and try it again.
 */
export declare class ConcurrentChangeStateError extends OSpecError {
    changeName: string;
    constructor(changeName: string, reason: string);
}
export declare class ConfigError extends OSpecError {
    constructor(message: string, details?: any);
}
export declare class WorkflowError extends OSpecError {
    constructor(message: string, details?: any);
}
export declare class VerificationError extends OSpecError {
    constructor(message: string, details?: any);
}
