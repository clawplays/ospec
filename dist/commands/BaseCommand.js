"use strict";
/**
 * 命令基类
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseCommand = void 0;
const services_1 = require("../services");
class BaseCommand {
    constructor() {
        this.logger = services_1.services.logger;
    }
    /**
     * 验证命令参数
     */
    validateArgs(args, requiredCount) {
        if (args.length < requiredCount) {
            throw new Error(`Invalid arguments. Expected at least ${requiredCount} arguments.`);
        }
    }
    /**
     * 打印成功信息
     */
    success(message) {
        console.log(`✓ ${message}`);
    }
    /**
     * 打印信息
     */
    info(message) {
        console.log(message);
    }
    /**
     * 打印错误信息
     */
    error(message) {
        console.error(`✗ ${message}`);
    }
    /**
     * 打印警告信息
     */
    warn(message) {
        console.warn(`⚠ ${message}`);
    }
}
exports.BaseCommand = BaseCommand;