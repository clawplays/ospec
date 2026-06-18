"use strict";
/**
 * Manages the cross-change triage inbox (`<managed>/triage/inbox.jsonl`). Loop ticks (L1, or
 * out-of-allowlist findings at higher levels) append here; `ospec triage` lists/claims/promotes.
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
        return content
            .split('\n')
            .map(line => line.trim())
            .filter(Boolean)
            .map(line => JSON.parse(line));
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
