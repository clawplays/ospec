import { FeatureState } from '../core/types';
export interface VerificationResult {
    name: string;
    status: 'pass' | 'fail' | 'warn';
    message: string;
    details?: unknown;
}
export declare class VerificationSystem {
    verifyProposal(featureState: FeatureState): Promise<VerificationResult[]>;
    verifyTasks(featureState: FeatureState): Promise<VerificationResult[]>;
    verifyImplementation(featureState: FeatureState): Promise<VerificationResult[]>;
    runFullVerification(featureState: FeatureState): Promise<{
        passed: boolean;
        results: VerificationResult[];
        summary: string;
    }>;
    getVerificationChecklist(): Array<{
        name: string;
        description: string;
        critical: boolean;
    }>;
}
export declare const verificationSystem: VerificationSystem;
