import { SkillIndex } from '../core/types';
import { SkillParser } from './SkillParser';
export declare class IndexBuilder {
    constructor(_skillParser?: SkillParser);
    build(rootDir: string): Promise<SkillIndex>;
    write(rootDir: string): Promise<SkillIndex>;
    createEmpty(rootDir: string): Promise<SkillIndex>;
}
export declare const createIndexBuilder: (skillParser?: SkillParser) => IndexBuilder;
