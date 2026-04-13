"use strict";
/**
 * Base command class.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseCommand = void 0;
const services_1 = require("../services");
class BaseCommand {
    constructor() {
        this.logger = services_1.services.logger;
    }
    /**
     * Validate command arguments.
     */
    validateArgs(args, requiredCount) {
        if (args.length < requiredCount) {
            throw new Error(`Invalid arguments. Expected at least ${requiredCount} arguments.`);
        }
    }
    /**
     * Print a success message.
     */
    success(message) {
        console.log(`✓ ${message}`);
    }
    /**
     * Print an informational message.
     */
    info(message) {
        console.log(message);
    }
    /**
     * Print an error message.
     */
    error(message) {
        console.error(`✗ ${message}`);
    }
    /**
     * Print a warning message.
     */
    warn(message) {
        console.warn(`⚠ ${message}`);
    }
}
exports.BaseCommand = BaseCommand;
