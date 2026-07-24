import { BaseCommand } from './BaseCommand';
export declare class IndexCommand extends BaseCommand {
    execute(action?: string, projectPath?: string, rawArgs?: string[]): Promise<void>;
    /**
     * Token-bounded index retrieval: return only the entries matching the
     * given keywords so AI sessions never need to read the whole
     * SKILL.index.json (which grows without bound as changes are archived).
     */
    private query;
}
