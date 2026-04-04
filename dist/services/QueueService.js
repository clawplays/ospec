"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueService = void 0;
exports.createQueueService = createQueueService;
const fs_extra_1 = __importDefault(require("fs-extra"));
const gray_matter_1 = __importDefault(require("gray-matter"));
const path_1 = __importDefault(require("path"));
const constants_1 = require("../core/constants");
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
        const queuedDir = path_1.default.join(rootDir, constants_1.DIR_NAMES.CHANGES, constants_1.DIR_NAMES.QUEUED);
        if (!(await this.fileService.exists(queuedDir))) {
            return [];
        }
        const entries = await fs_extra_1.default.readdir(queuedDir, { withFileTypes: true });
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
        const queuedPath = path_1.default.join(rootDir, constants_1.DIR_NAMES.CHANGES, constants_1.DIR_NAMES.QUEUED, changeName);
        if (!(await this.fileService.exists(queuedPath))) {
            throw new Error(`Queued change not found: ${changeName}`);
        }
        const activeRoot = path_1.default.join(rootDir, constants_1.DIR_NAMES.CHANGES, constants_1.DIR_NAMES.ACTIVE);
        const activePath = path_1.default.join(activeRoot, changeName);
        if (await this.fileService.exists(activePath)) {
            throw new Error(`Active change already exists: ${changeName}`);
        }
        await this.fileService.ensureDir(activeRoot);
        await this.fileService.move(queuedPath, activePath);
        const statePath = path_1.default.join(activePath, constants_1.FILE_NAMES.STATE);
        const state = await this.fileService.readJSON(statePath);
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
        const state = await this.fileService.readJSON(statePath);
        const proposalPath = path_1.default.join(changeDir, constants_1.FILE_NAMES.PROPOSAL);
        let flags = [];
        let description = 'No description yet';
        if (await this.fileService.exists(proposalPath)) {
            const proposal = (0, gray_matter_1.default)(await this.fileService.readFile(proposalPath));
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
        const document = (0, gray_matter_1.default)(await this.fileService.readFile(filePath));
        document.data.status = status;
        await this.fileService.writeFile(filePath, gray_matter_1.default.stringify(document.content, document.data));
    }
    toRelativePath(rootDir, targetPath) {
        return path_1.default.relative(rootDir, targetPath).replace(/\\/g, '/');
    }
}
exports.QueueService = QueueService;
function createQueueService(fileService, projectService) {
    return new QueueService(fileService, projectService);
}
//# sourceMappingURL=QueueService.js.map
