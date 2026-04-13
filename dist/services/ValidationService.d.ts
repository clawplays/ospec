/**
 * Validation service.
 */
export declare class ValidationService {
    /**
     * Validate change-name format.
     */
    validateFeatureName(name: string): boolean;
    /**
     * Validate JSON format.
     */
    validateJSON(content: string): boolean;
    /**
     * Validate required fields.
     */
    validateRequiredFields(data: Record<string, any>, fields: string[]): boolean;
}
export declare const validationService: ValidationService;
