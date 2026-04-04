"use strict";
/**
 * 验证服务
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validationService = exports.ValidationService = void 0;
const errors_1 = require("../core/errors");
class ValidationService {
    /**
     * 验证变更名称格式
     */
    validateFeatureName(name) {
        const regex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
        if (!regex.test(name)) {
            throw new errors_1.ValidationError(`Invalid change name: ${name}`);
        }
        return true;
    }
    /**
     * 验证JSON格式
     */
    validateJSON(content) {
        try {
            JSON.parse(content);
            return true;
        }
        catch (error) {
            throw new errors_1.ValidationError('Invalid JSON format');
        }
    }
    /**
     * 验证必填字段
     */
    validateRequiredFields(data, fields) {
        const missing = fields.filter(field => !data[field]);
        if (missing.length > 0) {
            throw new errors_1.ValidationError(`Missing required fields: ${missing.join(', ')}`);
        }
        return true;
    }
}
exports.ValidationService = ValidationService;
exports.validationService = new ValidationService();