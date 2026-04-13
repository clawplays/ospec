"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.templateEngine = exports.TemplateEngine = void 0;
const ExecutionTemplateBuilder_1 = require("./templates/ExecutionTemplateBuilder");
const ProjectTemplateBuilder_1 = require("./templates/ProjectTemplateBuilder");
const TemplateInputFactory_1 = require("./templates/TemplateInputFactory");
class TemplateEngine {
    constructor() {
        this.inputFactory = new TemplateInputFactory_1.TemplateInputFactory();
        this.executionBuilder = new ExecutionTemplateBuilder_1.ExecutionTemplateBuilder(this.inputFactory);
        this.projectBuilder = new ProjectTemplateBuilder_1.ProjectTemplateBuilder(this.inputFactory);
    }
    render(template, context) {
        return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return context[key] !== undefined ? String(context[key]) : match;
        });
    }
    parseSkillMetadata(content) {
        const titleMatch = content.match(/^#\s+(.+)$/m);
        const tagsMatch = content.match(/^tags:\s*\[(.*)\]\s*$/m);
        const tags = tagsMatch?.[1]
            ? tagsMatch[1]
                .split(',')
                .map(tag => tag.trim())
                .filter(Boolean)
            : [];
        return {
            title: titleMatch?.[1]?.trim() || null,
            tags,
        };
    }
    normalizeFeatureTemplateInput(input) {
        return this.inputFactory.normalizeFeatureTemplateInput(input);
    }
    normalizeProjectBootstrapInput(input, fallbackName, mode, inferredDefaults, presetDefaults) {
        return this.inputFactory.normalizeProjectBootstrapInput(input, fallbackName, mode, inferredDefaults, presetDefaults);
    }
    generateProposalTemplate(input) {
        return this.executionBuilder.generateProposalTemplate(input);
    }
    generateTasksTemplate(input) {
        return this.executionBuilder.generateTasksTemplate(input);
    }
    generateVerificationTemplate(input) {
        return this.executionBuilder.generateVerificationTemplate(input);
    }
    generateReviewTemplate(input) {
        return this.executionBuilder.generateReviewTemplate(input);
    }
    generateProjectReadmeTemplate(fallbackName, mode, input) {
        return this.projectBuilder.generateProjectReadmeTemplate(fallbackName, mode, input);
    }
    generateRootSkillTemplate(fallbackName, mode, input) {
        return this.projectBuilder.generateRootSkillTemplate(fallbackName, mode, input);
    }
    generateDocsSkillTemplate(fallbackName, input) {
        return this.projectBuilder.generateDocsSkillTemplate(fallbackName, input);
    }
    generateSrcSkillTemplate(fallbackName, input) {
        return this.projectBuilder.generateSrcSkillTemplate(fallbackName, input);
    }
    generateCoreSkillTemplate(fallbackName, input) {
        return this.projectBuilder.generateCoreSkillTemplate(fallbackName, input);
    }
    generateTestsSkillTemplate(fallbackName, input) {
        return this.projectBuilder.generateTestsSkillTemplate(fallbackName, input);
    }
    generateProjectOverviewTemplate(fallbackName, mode, input) {
        return this.projectBuilder.generateProjectOverviewTemplate(fallbackName, mode, input);
    }
    generateTechStackTemplate(fallbackName, input) {
        return this.projectBuilder.generateTechStackTemplate(fallbackName, input);
    }
    generateArchitectureTemplate(fallbackName, input) {
        return this.projectBuilder.generateArchitectureTemplate(fallbackName, input);
    }
    generateModuleMapTemplate(fallbackName, input) {
        return this.projectBuilder.generateModuleMapTemplate(fallbackName, input);
    }
    generateApiOverviewTemplate(fallbackName, input) {
        return this.projectBuilder.generateApiOverviewTemplate(fallbackName, input);
    }
    generateDesignDocsTemplate(fallbackName, input) {
        return this.projectBuilder.generateDesignDocsTemplate(fallbackName, input);
    }
    generatePlanningDocsTemplate(fallbackName, input) {
        return this.projectBuilder.generatePlanningDocsTemplate(fallbackName, input);
    }
    generateApiDocsTemplate(fallbackName, input) {
        return this.projectBuilder.generateApiDocsTemplate(fallbackName, input);
    }
    generateModuleSkillTemplate(fallbackName, moduleName, input, moduleSlug) {
        return this.projectBuilder.generateModuleSkillTemplate(fallbackName, moduleName, input, moduleSlug);
    }
    generateApiAreaDocTemplate(fallbackName, apiAreaName, input) {
        return this.projectBuilder.generateApiAreaDocTemplate(fallbackName, apiAreaName, input);
    }
    generateModuleApiDocTemplate(fallbackName, moduleName, input, moduleSlug) {
        return this.projectBuilder.generateModuleApiDocTemplate(fallbackName, moduleName, input, moduleSlug);
    }
    generateDesignDocTemplate(fallbackName, docName, input) {
        return this.projectBuilder.generateDesignDocTemplate(fallbackName, docName, input);
    }
    generatePlanningDocTemplate(fallbackName, docName, input) {
        return this.projectBuilder.generatePlanningDocTemplate(fallbackName, docName, input);
    }
    generateAiGuideTemplate(input) {
        return this.projectBuilder.generateAiGuideTemplate(input);
    }
    generateExecutionProtocolTemplate(input) {
        return this.projectBuilder.generateExecutionProtocolTemplate(input);
    }
    generateBuildIndexScriptTemplate() {
        return this.projectBuilder.generateBuildIndexScriptTemplate();
    }
}
exports.TemplateEngine = TemplateEngine;
exports.templateEngine = new TemplateEngine();
