"use strict";
/**
 * File system service.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileService = exports.FileService = void 0;
const fs_1 = require("fs");
const path = __importStar(require("path"));
const yaml = __importStar(require("js-yaml"));
const errors_1 = require("../core/errors");
async function pathExists(targetPath) {
    try {
        await fs_1.promises.access(targetPath, fs_1.constants.F_OK);
        return true;
    }
    catch {
        return false;
    }
}
class FileService {
    async readFile(filePath) {
        try {
            return await fs_1.promises.readFile(filePath, 'utf-8');
        }
        catch (error) {
            throw new errors_1.FileOperationError(`Failed to read file: ${filePath}`, { error });
        }
    }
    async writeFile(filePath, content) {
        try {
            await fs_1.promises.mkdir(path.dirname(filePath), { recursive: true });
            await fs_1.promises.writeFile(filePath, content, 'utf-8');
        }
        catch (error) {
            throw new errors_1.FileOperationError(`Failed to write file: ${filePath}`, { error });
        }
    }
    async readJSON(filePath) {
        try {
            const content = await this.readFile(filePath);
            return JSON.parse(content.replace(/^\uFEFF/, ''));
        }
        catch (error) {
            throw new errors_1.FileOperationError(`Failed to parse JSON: ${filePath}`, { error });
        }
    }
    async writeJSON(filePath, data) {
        try {
            const content = JSON.stringify(data, null, 2);
            await this.writeFile(filePath, content);
        }
        catch (error) {
            throw new errors_1.FileOperationError(`Failed to write JSON: ${filePath}`, { error });
        }
    }
    async readYAML(filePath) {
        try {
            const content = await this.readFile(filePath);
            return yaml.load(content);
        }
        catch (error) {
            throw new errors_1.FileOperationError(`Failed to parse YAML: ${filePath}`, { error });
        }
    }
    async writeYAML(filePath, data) {
        try {
            const content = yaml.dump(data);
            await this.writeFile(filePath, content);
        }
        catch (error) {
            throw new errors_1.FileOperationError(`Failed to write YAML: ${filePath}`, { error });
        }
    }
    async ensureDir(dirPath) {
        try {
            await fs_1.promises.mkdir(dirPath, { recursive: true });
        }
        catch (error) {
            throw new errors_1.FileOperationError(`Failed to ensure directory: ${dirPath}`, { error });
        }
    }
    async exists(filePath) {
        return pathExists(filePath);
    }
    async remove(filePath) {
        try {
            await fs_1.promises.rm(filePath, { recursive: true, force: true });
        }
        catch (error) {
            throw new errors_1.FileOperationError(`Failed to remove: ${filePath}`, { error });
        }
    }
    async copy(src, dest) {
        try {
            await fs_1.promises.mkdir(path.dirname(dest), { recursive: true });
            await fs_1.promises.cp(src, dest, { recursive: true, force: true });
        }
        catch (error) {
            throw new errors_1.FileOperationError(`Failed to copy from ${src} to ${dest}`, { error });
        }
    }
    async move(src, dest) {
        try {
            await fs_1.promises.mkdir(path.dirname(dest), { recursive: true });
            await fs_1.promises.rename(src, dest);
        }
        catch (error) {
            if (error?.code === 'EXDEV') {
                try {
                    await this.copy(src, dest);
                    await this.remove(src);
                    return;
                }
                catch (fallbackError) {
                    throw new errors_1.FileOperationError(`Failed to move from ${src} to ${dest}`, { error: fallbackError });
                }
            }
            throw new errors_1.FileOperationError(`Failed to move from ${src} to ${dest}`, { error });
        }
    }
    async readDir(dirPath) {
        try {
            return await fs_1.promises.readdir(dirPath);
        }
        catch (error) {
            throw new errors_1.FileOperationError(`Failed to read directory: ${dirPath}`, { error });
        }
    }
    async stat(filePath) {
        try {
            return await fs_1.promises.stat(filePath);
        }
        catch (error) {
            throw new errors_1.FileOperationError(`Failed to stat: ${filePath}`, { error });
        }
    }
}
exports.FileService = FileService;
exports.fileService = new FileService();
