"use strict";
/**
 * Validation service.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validationService = exports.ValidationService = void 0;
const errors_1 = require("../core/errors");
class ValidationService {
    /**
     * Validate change-name format.
     */
    validateFeatureName(name) {
        const regex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
        if (!regex.test(name)) {
            throw new errors_1.ValidationError(`Invalid change name: ${name}`);
        }
        return true;
    }
    /**
     * Validate JSON format.
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
     * Validate required fields.
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
