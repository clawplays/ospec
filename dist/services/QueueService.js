"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueService = void 0;
exports.createQueueService = createQueueService;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const constants_1 = require("../core/constants");
const helpers_1 = require("../utils/helpers");
const ProjectLayout_1 = require("../utils/ProjectLayout");
class QueueService {
    constructor(fileService, projectService) {
        this.fileService = fileService;
        this.projectService = projectService;
    }
    async listQueuedChangeNames(rootDir) {
        const queuedChanges = await this.getQueuedChanges(rootDir);
        return queuedChanges.map(change => change.name);
    }
    async getQueuedChanges(rootDir) {
        const config = await this.getProjectConfig(rootDir);
        const queuedDir = (0, ProjectLayout_1.resolveManagedPath)(rootDir, `${constants_1.DIR_NAMES.CHANGES}/${constants_1.DIR_NAMES.QUEUED}`, config);
        if (!(await this.fileService.exists(queuedDir))) {
            return [];
        }
        const entries = await fs_1.promises.readdir(queuedDir, { withFileTypes: true });
        const queuedChanges = [];
        for (const entry of entries) {
            if (!entry.isDirectory()) {
                continue;
            }
            const item = await this.buildQueuedChangeStatusItem(rootDir, path_1.default.join(queuedDir, entry.name));
            if (item) {
                queuedChanges.push(item);
            }
        }
        queuedChanges.sort((left, right) => {
            const leftQueuedAt = left.queuedAt ?? '';
            const rightQueuedAt = right.queuedAt ?? '';
            if (leftQueuedAt && rightQueuedAt && leftQueuedAt !== rightQueuedAt) {
                return leftQueuedAt.localeCompare(rightQueuedAt);
            }
            if (leftQueuedAt && !rightQueuedAt) {
                return -1;
            }
            if (!leftQueuedAt && rightQueuedAt) {
                return 1;
            }
            return left.name.localeCompare(right.name);
        });
        return queuedChanges;
    }
    async activateQueuedChange(rootDir, changeName, activationSource = 'queue') {
        const activeNames = await this.projectService.listActiveChangeNames(rootDir);
        if (activeNames.length > 0) {
            throw new Error(`Cannot activate queued change while active changes exist: ${activeNames.join(', ')}`);
        }
        const config = await this.getProjectConfig(rootDir);
        const queuedPath = (0, ProjectLayout_1.resolveManagedPath)(rootDir, `${constants_1.DIR_NAMES.CHANGES}/${constants_1.DIR_NAMES.QUEUED}/${changeName}`, config);
        if (!(await this.fileService.exists(queuedPath))) {
            throw new Error(`Queued change not found: ${changeName}`);
        }
        const activeRoot = (0, ProjectLayout_1.resolveManagedPath)(rootDir, `${constants_1.DIR_NAMES.CHANGES}/${constants_1.DIR_NAMES.ACTIVE}`, config);
        const activePath = path_1.default.join(activeRoot, changeName);
        if (await this.fileService.exists(activePath)) {
            throw new Error(`Active change already exists: ${changeName}`);
        }
        await this.fileService.ensureDir(activeRoot);
        await this.fileService.move(queuedPath, activePath);
        const statePath = path_1.default.join(activePath, constants_1.FILE_NAMES.STATE);
        /*
         * M-race1: activation REWRITES `status`, `current_step` and
         * `blocked_by` on top of whatever it reads, so it must not proceed on a
         * state it could not read. Degrading to an empty object would not
         * "recover" the change; it would mint a brand-new draft state and
         * discard `queued_at`, `queue_source` and `feature`, turning a
         * recoverable parse error into silent data loss. Both failures refuse,
         * and the message names the change rather than just the path.
         */
        const stateResult = await this.fileService.readJsonSafe(statePath);
        if (stateResult.status !== 'ok') {
            throw new Error(`Cannot activate queued change '${changeName}': its state.json is ${stateResult.status} (${stateResult.message}).`);
        }
        const state = stateResult.value;
        state.status = 'draft';
        state.current_step = 'write_proposal';
        state.blocked_by = ['missing_proposal'];
        state.activated_at = new Date().toISOString();
        state.activation_source = activationSource;
        state.last_updated = new Date().toISOString();
        await this.fileService.writeJSON(statePath, state);
        await this.updateFrontmatterStatus(path_1.default.join(activePath, constants_1.FILE_NAMES.PROPOSAL), 'active');
        await this.updateFrontmatterStatus(path_1.default.join(activePath, constants_1.FILE_NAMES.VERIFICATION), 'verifying');
        await this.projectService.rebaseMovedChangeMarkdownLinks(queuedPath, activePath);
        const item = await this.buildQueuedChangeStatusItem(rootDir, activePath);
        if (!item) {
            throw new Error(`Activated change state could not be read: ${changeName}`);
        }
        return item;
    }
    async activateNextQueuedChange(rootDir, activationSource = 'runner') {
        const queuedChanges = await this.getQueuedChanges(rootDir);
        if (queuedChanges.length === 0) {
            return null;
        }
        return this.activateQueuedChange(rootDir, queuedChanges[0].name, activationSource);
    }
    async buildQueuedChangeStatusItem(rootDir, changeDir) {
        const statePath = path_1.default.join(changeDir, constants_1.FILE_NAMES.STATE);
        if (!(await this.fileService.exists(statePath))) {
            return null;
        }
        /*
         * M-race1: absent stays absent, damaged stays loud -- the same split
         * `getProjectConfig` below already enforces for `.skillrc`.
         *
         * The tempting degradation here is to return `null` and drop the change
         * from the listing, the way a directory with no `state.json` is
         * dropped. It is wrong, and specifically wrong here rather than merely
         * imprecise: this list is an ORDER. `activateNextQueuedChange` takes
         * `queuedChanges[0]`, so silently omitting an unreadable entry promotes
         * whatever was behind it and activates a change the user never put at
         * the front of the queue. Refusing is the only answer that cannot
         * silently reorder the queue.
         */
        const stateResult = await this.fileService.readJsonSafe(statePath);
        if (stateResult.status === 'absent')
            return null;
        if (stateResult.status === 'damaged') {
            throw new Error(`Queued change '${path_1.default.basename(changeDir)}' has an unreadable state.json, so the queue order cannot be trusted: ${stateResult.message}`);
        }
        const state = stateResult.value;
        const proposalPath = path_1.default.join(changeDir, constants_1.FILE_NAMES.PROPOSAL);
        let flags = [];
        let description = 'No description yet';
        if (await this.fileService.exists(proposalPath)) {
            const proposal = (0, helpers_1.parseFrontmatterDocument)(await this.fileService.readFile(proposalPath));
            flags = Array.isArray(proposal.data.flags) ? proposal.data.flags : [];
            description = this.extractDescription(proposal.content);
        }
        return {
            name: state.feature || path_1.default.basename(changeDir),
            path: this.toRelativePath(rootDir, changeDir),
            status: state.status,
            currentStep: state.current_step,
            flags,
            description,
            queuedAt: typeof state.queued_at === 'string' ? state.queued_at : null,
            source: typeof state.queue_source === 'string' ? state.queue_source : null,
        };
    }
    extractDescription(content) {
        const lines = String(content || '')
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(Boolean)
            .filter(line => !line.startsWith('#'));
        return lines[0] || 'No description yet';
    }
    async updateFrontmatterStatus(filePath, status) {
        if (!(await this.fileService.exists(filePath))) {
            return;
        }
        const document = (0, helpers_1.parseFrontmatterDocument)(await this.fileService.readFile(filePath));
        document.data.status = status;
        /*
         * M-race6: atomic, because this is a whole-file rewrite of a document
         * whose BODY is the user's work and whose frontmatter is the only part
         * being changed.
         *
         * `writeFile` truncates and then streams; a crash, a full disk or an
         * antivirus lock partway through leaves `proposal.md` or
         * `verification.md` truncated -- the frontmatter status updated and the
         * proposal text gone. Worse, it is silent: activation continues, and
         * the loss surfaces later as a change whose proposal "was never
         * written". `writeFileAtomic` writes a sibling temp file and renames,
         * so a reader sees either the old document or the new one.
         *
         * Where the plan was wrong: it asked for `writeFileAtomic` to be added
         * to FileService. It is already there and already used by `writeJSON`,
         * complete with the Windows EBUSY/EPERM rename retry and the
         * per-target queue. Only the call site needed changing.
         */
        await this.fileService.writeFileAtomic(filePath, (0, helpers_1.stringifyFrontmatter)(document.content, document.data));
    }
    /*
     * PRECONDITION, recorded because a review raised the lost-update question
     * about the read-modify-write above and the answer depends on it.
     *
     * `writeFileAtomic` prevents CORRUPTION; it does not prevent a lost update.
     * This is a read, a mutate and a write with no compare-and-swap, so if two
     * concurrent callers wrote DIFFERENT statuses to the SAME file, whichever
     * renamed last would win and the other transition would vanish silently.
     *
     * That interleaving is not reachable today, and it is worth being precise
     * about why rather than describing the method as unsafe. There are exactly
     * two call sites, both above, and each writes a CONSTANT status to a
     * DISTINCT file: `proposal.md` only ever receives 'active' and
     * `verification.md` only ever receives 'verifying'. Two concurrent
     * activations of one change therefore write the same value to the same
     * file, which is idempotent -- and they cannot both get that far anyway,
     * because activation begins with a directory move and refuses when the
     * active path already exists.
     *
     * So the guarantee is a property of the CALLERS, not of this method. A
     * future caller that passes a status computed from the file it just read --
     * a state machine advancing 'active' -> 'verifying', say -- makes the lost
     * update live, and would need a compare-and-swap like the one
     * `ProjectService.finalizeChange` carries.
     */
    toRelativePath(rootDir, targetPath) {
        return path_1.default.relative(rootDir, targetPath).replace(/\\/g, '/');
    }
    // FIX-G1: this config decides where every queued change is read and
    // written (`resolveManagedPath(..., config)` below), so it takes the same
    // gate as the index builders. It used to degrade a damaged `.skillrc` to
    // `null`, which `getProjectLayout` reads as `'classic'` -- the queue then
    // operated on `changes/queued` in the project root of a project whose
    // changes live in `.ospec/changes/queued`. Absent stays absent: a directory
    // with no `.skillrc` is not a project, which is a different fact.
    async getProjectConfig(rootDir) {
        const configPath = path_1.default.join(rootDir, constants_1.FILE_NAMES.SKILLRC);
        if (!(await this.fileService.exists(configPath))) {
            return null;
        }
        let raw;
        try {
            raw = await this.fileService.readJSON(configPath);
        }
        catch (error) {
            throw (0, ProjectLayout_1.createDamagedConfigError)(configPath, `invalid JSON (${error?.message || 'parse failed'})`);
        }
        return (0, ProjectLayout_1.assertProjectConfigUsable)(rootDir, configPath, raw);
    }
}
exports.QueueService = QueueService;
function createQueueService(fileService, projectService) {
    return new QueueService(fileService, projectService);
}
