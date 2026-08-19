import { BaseCommand } from './BaseCommand';
export declare class IndexCommand extends BaseCommand {
    execute(action?: string, projectPath?: string, rawArgs?: string[]): Promise<void>;
    /**
     * 7.10c: `ospec index gc`. List archived-change entries whose archive
     * directory no longer exists, and remove them on confirmation.
     *
     * What this is NOT, because the plan's phrasing invites the wrong
     * expectation: a rebuild does not resurrect these. `archived_changes` is
     * built from `current.map(...)` over the directories actually on disk, and
     * the git-history merge only unions FIELDS onto entries that already exist.
     * So an entry with no archive directory got there another way -- a hand
     * edit, a branch merge of two committed indexes, an archive deleted while
     * the index was not rebuilt, or 7.9's migration -- and it stays until
     * something removes it. This is that something.
     *
     * What IS monotonic is the field union: `target_files`,
     * `verification_commands`, `project_documents`, `features`, `doc_updates`
     * and `documents` never shrink, by design, so an entry does not lose them
     * when its archive is briefly unreadable. gc reports that growth but does
     * not touch it -- discarding it is what the merge exists to prevent.
     */
    private gc;
    /**
     * Token-bounded index retrieval: return only the entries matching the
     * given keywords so AI sessions never need to read the whole
     * SKILL.index.json (which grows without bound as changes are archived).
     */
    private query;
}
