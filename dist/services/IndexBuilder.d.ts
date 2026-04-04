import { SkillIndex } from '../core/types';
import { SkillParser } from './SkillParser';
export declare class IndexBuilder {
    private skillParser;
    constructor(skillParser: SkillParser);
    build(rootDir: string): Promise<SkillIndex>;
    write(rootDir: string): Promise<SkillIndex>;
    createEmpty(rootDir: string): Promise<SkillIndex>;
    private stripVolatileFields;
}
export declare const createIndexBuilder: (skillParser: SkillParser) => IndexBuilder;