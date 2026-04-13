"use strict";
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
exports.PathUtils = void 0;
const path = __importStar(require("path"));
const constants_1 = require("../core/constants");
const ProjectLayout_1 = require("./ProjectLayout");
class PathUtils {
    static getChangeDir(rootDir, bucket, featureName, layout) {
        return (0, ProjectLayout_1.getChangeDir)(rootDir, bucket, featureName, layout);
    }
    static getFeatureDir(rootDir, featureName, layout) {
        return this.getChangeDir(rootDir, constants_1.DIR_NAMES.ACTIVE, featureName, layout);
    }
    static getFeatureFile(featureDir, type) {
        const fileNames = {
            proposal: constants_1.FILE_NAMES.PROPOSAL,
            tasks: constants_1.FILE_NAMES.TASKS,
            state: constants_1.FILE_NAMES.STATE,
            verification: constants_1.FILE_NAMES.VERIFICATION,
        };
        return path.join(featureDir, fileNames[type]);
    }
    static normalize(filePath) {
        return path.normalize(filePath).replace(/\\/g, '/');
    }
    static isAbsolute(filePath) {
        return path.isAbsolute(filePath);
    }
    static getRelative(from, to) {
        return path.relative(from, to).replace(/\\/g, '/');
    }
    static getProjectLayout(config) {
        return (0, ProjectLayout_1.getProjectLayout)(config);
    }
    static toManagedRelativePath(relativePath, layout) {
        return (0, ProjectLayout_1.toManagedRelativePath)(relativePath, layout);
    }
    static resolveManagedInputPath(rootDir, candidatePath, layout) {
        return (0, ProjectLayout_1.resolveManagedInputPath)(rootDir, candidatePath, layout);
    }
}
exports.PathUtils = PathUtils;
