import { ProjectLayout, SkillrcConfig } from '../core/types';
export declare function normalizeProjectLayout(input: any): ProjectLayout | undefined;
export declare function getProjectLayout(input?: Pick<SkillrcConfig, 'projectLayout'> | ProjectLayout | null): ProjectLayout;
export declare function getProjectManagedRoot(rootDir: string, input?: Pick<SkillrcConfig, 'projectLayout'> | ProjectLayout | null): string;
export declare function toManagedRelativePath(relativePath: string, input?: Pick<SkillrcConfig, 'projectLayout'> | ProjectLayout | null): string;
export declare function resolveManagedPath(rootDir: string, relativePath: string, input?: Pick<SkillrcConfig, 'projectLayout'> | ProjectLayout | null): string;
export declare function getChangeDir(rootDir: string, bucket: string, featureName: string, input?: Pick<SkillrcConfig, 'projectLayout'> | ProjectLayout | null): string;
export declare function resolveManagedInputPath(rootDir: string, candidatePath: string, input?: Pick<SkillrcConfig, 'projectLayout'> | ProjectLayout | null): string;
