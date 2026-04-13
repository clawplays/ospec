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
export declare class ConfigError extends OSpecError {
    constructor(message: string, details?: any);
}
export declare class WorkflowError extends OSpecError {
    constructor(message: string, details?: any);
}
export declare class VerificationError extends OSpecError {
    constructor(message: string, details?: any);
}
