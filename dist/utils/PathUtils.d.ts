export declare class PathUtils {
    static getChangeDir(rootDir: string, bucket: string, featureName: string): string;
    static getFeatureDir(rootDir: string, featureName: string): string;
    static getFeatureFile(featureDir: string, type: 'proposal' | 'tasks' | 'state' | 'verification'): string;
    static normalize(filePath: string): string;
    static isAbsolute(filePath: string): boolean;
    static getRelative(from: string, to: string): string;
}