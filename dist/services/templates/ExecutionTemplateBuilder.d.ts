import { TemplateBuilderBase } from './TemplateBuilderBase';
import { TemplateInputFactory } from './TemplateInputFactory';
import { FeatureTemplateInput } from './templateTypes';
export declare class ExecutionTemplateBuilder extends TemplateBuilderBase {
    private readonly inputs;
    constructor(inputs: TemplateInputFactory);
    generateProposalTemplate(input: string | FeatureTemplateInput): string;
    generateTasksTemplate(input: string | FeatureTemplateInput): string;
    generateVerificationTemplate(input: string | FeatureTemplateInput): string;
    generateReviewTemplate(input: string | FeatureTemplateInput): string;
}
