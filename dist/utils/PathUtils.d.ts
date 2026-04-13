import { ProjectLayout, SkillrcConfig } from '../core/types';
export declare class PathUtils {
    static getChangeDir(rootDir: string, bucket: string, featureName: string, layout?: ProjectLayout | Pick<SkillrcConfig, 'projectLayout'> | null): string;
    static getFeatureDir(rootDir: string, featureName: string, layout?: ProjectLayout | Pick<SkillrcConfig, 'projectLayout'> | null): string;
    static getFeatureFile(featureDir: string, type: 'proposal' | 'tasks' | 'state' | 'verification'): string;
    static normalize(filePath: string): string;
    static isAbsolute(filePath: string): boolean;
    static getRelative(from: string, to: string): string;
    static getProjectLayout(config?: Pick<SkillrcConfig, 'projectLayout'> | ProjectLayout | null): ProjectLayout;
    static toManagedRelativePath(relativePath: string, layout?: Pick<SkillrcConfig, 'projectLayout'> | ProjectLayout | null): string;
    static resolveManagedInputPath(rootDir: string, candidatePath: string, layout?: Pick<SkillrcConfig, 'projectLayout'> | ProjectLayout | null): string;
}
