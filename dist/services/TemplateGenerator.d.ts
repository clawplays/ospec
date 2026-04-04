/**
 * 模板生成服务
 * 负责生成 proposal.md、tasks.md、verification.md 等模板文件
 */
import { FeatureState } from '../core/types';
export declare class TemplateGenerator {
    /**
     * 生成 proposal.md 模板
     */
    static generateProposalTemplate(featureName: string, affects?: string[]): string;
    /**
     * 生成 tasks.md 模板
     */
    static generateTasksTemplate(featureName: string, coreRequiredSteps?: string[], optionalSteps?: string[]): string;
    /**
     * 生成 verification.md 模板
     */
    static generateVerificationTemplate(featureName: string, optionalSteps?: string[]): string;
    /**
     * 生成 state.json 内容
     */
    static generateStateJson(featureName: string, affects?: string[], mode?: 'lite' | 'standard' | 'full'): FeatureState;
    /**
     * 创建 feature 目录和文件
     */
    static createFeatureDirectory(projectRoot: string, featureName: string, affects?: string[], coreRequiredSteps?: string[], optionalSteps?: string[]): Promise<void>;
    /**
     * 生成项目初始化文件
     */
    static initializeProject(projectRoot: string, mode?: 'lite' | 'standard' | 'full'): Promise<void>;
    /**
     * 生成 AI 指南
     */
    private static generateAiGuide;
    /**
     * 生成执行协议
     */
    private static generateExecutionProtocol;
}