/**
 * 验证服务
 */
export declare class ValidationService {
    /**
     * 验证变更名称格式
     */
    validateFeatureName(name: string): boolean;
    /**
     * 验证JSON格式
     */
    validateJSON(content: string): boolean;
    /**
     * 验证必填字段
     */
    validateRequiredFields(data: Record<string, any>, fields: string[]): boolean;
}
export declare const validationService: ValidationService;