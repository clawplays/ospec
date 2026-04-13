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
exports.skillUpdateEngine = exports.SkillUpdateEngine = void 0;
const path = __importStar(require("path"));
const services_1 = require("../services");
class SkillUpdateEngine {
    async generateSkillIndex(featureDir) {
        const skillsDir = path.join(featureDir, 'skills');
        try {
            const files = await services_1.services.fileService.readDir(skillsDir);
            const skillFiles = files.filter(file => file.endsWith('.md'));
            const index = {};
            for (const file of skillFiles) {
                const filePath = path.join(skillsDir, file);
                const content = await services_1.services.fileService.readFile(filePath);
                const parsed = services_1.services.skillParser.parseSkillFile(content);
                index[file] = {
                    name: parsed.frontmatter.name,
                    version: '1.0.0',
                    description: parsed.frontmatter.name,
                    tags: parsed.frontmatter.tags,
                    lastUpdated: new Date().toISOString(),
                };
            }
            return index;
        }
        catch {
            return {};
        }
    }
    async updateSkill(featureDir, skillName, content, metadata) {
        const skillPath = path.join(featureDir, 'skills', `${skillName}.md`);
        const frontmatter = {
            name: metadata?.name || skillName,
            tags: metadata?.tags || [],
            version: metadata?.version || '1.0.0',
        };
        const fmContent = `---
name: ${frontmatter.name}
version: ${frontmatter.version}
tags: ${JSON.stringify(frontmatter.tags)}
---

${content}`;
        await services_1.services.fileService.writeFile(skillPath, fmContent);
    }
    async getSkillHistory(featureDir, skillName) {
        void featureDir;
        void skillName;
        return [
            {
                version: '1.0.0',
                date: new Date().toISOString(),
                changes: ['Initial version'],
            },
        ];
    }
    async validateSkillUpdate(featureState) {
        const errors = [];
        const warnings = [];
        if (!featureState.completed.includes('skill_updated')) {
            warnings.push('Skill documentation has not been marked as updated yet');
        }
        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }
    async exportSkillPackage(featureDir) {
        const content = {
            timestamp: new Date().toISOString(),
            skills: await this.generateSkillIndex(featureDir),
        };
        return Buffer.from(JSON.stringify(content, null, 2));
    }
}
exports.SkillUpdateEngine = SkillUpdateEngine;
exports.skillUpdateEngine = new SkillUpdateEngine();
