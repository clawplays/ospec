export type ProjectAssetStrategy = 'direct_copy' | 'template_generated' | 'runtime_generated';
export interface DirectCopyProjectAssetDefinition {
    id: string;
    category: 'tooling' | 'conventions' | 'ai_guidance' | 'hooks';
    description: string;
    targetRelativePath: string;
    overwritePolicy: 'if_missing';
    localizedSources?: Partial<Record<'zh-CN' | 'en-US' | 'ja-JP' | 'ar', string>>;
    sourceRelativePaths?: string[];
}
export declare const DIRECT_COPY_PROJECT_ASSETS: DirectCopyProjectAssetDefinition[];