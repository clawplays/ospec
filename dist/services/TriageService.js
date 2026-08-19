"use strict";
/**
 * Manages the cross-change triage inbox (`<managed>/triage/inbox.jsonl`). Workflow controllers
 * append findings here; `ospec triage` lists, claims, and promotes them.
 * Paths always go through `resolveManagedPath` so classic and nested layouts both work (Contract 4).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TriageService = void 0;
exports.createTriageService = createTriageService;
const ProjectLayout_1 = require("../utils/ProjectLayout");
class TriageService {
    constructor(fileService) {
        this.fileService = fileService;
    }
    inboxPath(projectRoot, config) {
        return (0, ProjectLayout_1.resolveManagedPath)(projectRoot, 'triage/inbox.jsonl', config);
    }
    async append(projectRoot, config, item) {
        const inbox = this.inboxPath(projectRoot, config);
        const record = {
            id: item.id || `triage-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            source: item.source,
            severity: item.severity,
            title: item.title,
            suggestedAction: item.suggestedAction,
            claimed: false,
            claimedBy: null,
            createdAt: item.createdAt || new Date().toISOString(),
            changePath: item.changePath ?? null,
        };
        const current = (await this.fileService.exists(inbox)) ? await this.fileService.readFile(inbox) : '';
        const next = `${current}${current && !current.endsWith('\n') ? '\n' : ''}${JSON.stringify(record)}\n`;
        await this.fileService.writeFile(inbox, next);
        return record;
    }
    async list(projectRoot, config) {
        const inbox = this.inboxPath(projectRoot, config);
        if (!(await this.fileService.exists(inbox))) {
            return [];
        }
        const content = await this.fileService.readFile(inbox);
        /*
         * M-race1: the inbox is JSONL, so one torn line is one unreadable item
         * rather than an unreadable file -- but skipping it is the one
         * degradation that must not happen here. `claim` calls `writeAll`,
         * which rewrites the inbox from exactly this array; anything this
         * parser drops is deleted from disk the next time a user claims
         * anything. Lenient reads and a full-file rewrite cannot coexist.
         *
         * So it refuses, and it names the line, because `Unexpected token } in
         * JSON at position 41` does not tell anyone which of forty triage items
         * to go and repair.
         */
        const items = [];
        const lines = content.split('\n');
        for (let index = 0; index < lines.length; index += 1) {
            const line = lines[index].trim();
            if (!line)
                continue;
            try {
                items.push(JSON.parse(line));
            }
            catch (error) {
                throw new Error(`Triage inbox ${inbox} is damaged at line ${index + 1}: ${error?.message || 'invalid JSON'}. `
                    + 'Repair or delete that line; the inbox is not read leniently because claiming an item rewrites the whole file.');
            }
        }
        return items;
    }
    async writeAll(projectRoot, config, items) {
        const inbox = this.inboxPath(projectRoot, config);
        await this.fileService.writeFile(inbox, items.map(item => JSON.stringify(item)).join('\n') + (items.length > 0 ? '\n' : ''));
    }
    async claim(projectRoot, config, id, claimedBy) {
        const items = await this.list(projectRoot, config);
        const target = items.find(item => item.id === id);
        if (!target) {
            throw new Error(`Triage item ${id} not found.`);
        }
        target.claimed = true;
        target.claimedBy = claimedBy;
        await this.writeAll(projectRoot, config, items);
        return target;
    }
}
exports.TriageService = TriageService;
function createTriageService(fileService) {
    return new TriageService(fileService);
}
