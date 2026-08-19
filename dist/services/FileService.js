"use strict";
/**
 * File system service.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileService = exports.FileService = exports.EXECUTABLE_FILE_MODE = void 0;
const fs_1 = require("fs");
const async_hooks_1 = require("async_hooks");
const crypto_1 = require("crypto");
const path = __importStar(require("path"));
const yaml = __importStar(require("js-yaml"));
const errors_1 = require("../core/errors");
const safeRemove_1 = require("../utils/safeRemove");
async function pathExists(targetPath) {
    try {
        await fs_1.promises.access(targetPath, fs_1.constants.F_OK);
        return true;
    }
    catch {
        return false;
    }
}
/*
 * FIX-5 / MJ-2+M2: a read-through overlay, so a dry run can model a repair it
 * is not allowed to perform.
 *
 * `ospec archive` reconciles goal progress -- rewriting the task graph, the
 * tasks.md checklist and the progress projection -- and then runs every
 * readiness gate against the REPAIRED tree. `archive --check` may not write, so
 * before this it ran the same gates against the UNrepaired tree and reported
 * blockers for states the real command silently repairs on its way through.
 *
 * Patching the two gates the reviewers happened to build fixtures for would
 * leave the next reader of those artifacts wrong in the same way, so the fix is
 * at the layer every reader goes through: for the duration of the check, the
 * three artifacts read as the bytes `ospec archive` would have written. The
 * enumeration is then over the reconciliation's THREE writes, not over the
 * open-ended set of gates that read them.
 *
 * Scoped with `AsyncLocalStorage`, so it cannot leak past the callback, cannot
 * be seen by an unrelated concurrent operation in the same process, and needs
 * no install/uninstall bookkeeping. Nested calls inherit the outer map.
 *
 * Deliberately covers content reads (`readFile`, and therefore `readJSON` and
 * `readYAML`) and existence (`exists`), which is what a gate uses; `stat` and
 * `readDir` are NOT overlaid, because faking a size or an mtime would be a
 * claim about a different thing. Writing to an overlaid path THROWS: a dry run
 * that reaches a write has stopped being a dry run, and that should be loud.
 */
const readOverlay = new async_hooks_1.AsyncLocalStorage();
function overlayKey(filePath) {
    const resolved = path.resolve(filePath);
    return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}
exports.EXECUTABLE_FILE_MODE = 0o755;
const ATOMIC_REPLACE_RETRY_CODES = new Set(['EACCES', 'EBUSY', 'EPERM']);
const ATOMIC_REPLACE_MAX_RETRIES = 50;
const atomicReplaceQueues = new Map();
async function atomicReplace(sourcePath, targetPath) {
    for (let attempt = 0;; attempt += 1) {
        try {
            await fs_1.promises.rename(sourcePath, targetPath);
            return;
        }
        catch (error) {
            const code = error?.code;
            if (!code || !ATOMIC_REPLACE_RETRY_CODES.has(code) || attempt >= ATOMIC_REPLACE_MAX_RETRIES) {
                throw error;
            }
            const delayMs = Math.min(10 * (attempt + 1), 100);
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }
}
async function queuedAtomicReplace(sourcePath, targetPath) {
    const queueKey = process.platform === 'win32' ? path.resolve(targetPath).toLowerCase() : path.resolve(targetPath);
    const previous = atomicReplaceQueues.get(queueKey) ?? Promise.resolve();
    let release = () => undefined;
    const turn = new Promise(resolve => {
        release = resolve;
    });
    const queueTail = previous.catch(() => undefined).then(() => turn);
    atomicReplaceQueues.set(queueKey, queueTail);
    await previous.catch(() => undefined);
    try {
        await atomicReplace(sourcePath, targetPath);
    }
    finally {
        release();
        if (atomicReplaceQueues.get(queueKey) === queueTail) {
            atomicReplaceQueues.delete(queueKey);
        }
    }
}
class FileService {
    /**
     * Runs `run` with `entries` served in place of the bytes on disk.
     *
     * See the overlay comment above. The overlay is visible only inside `run`
     * and only on this async call chain.
     */
    async withReadOverlay(entries, run) {
        if (entries.length === 0)
            return run();
        const merged = new Map(readOverlay.getStore() ?? []);
        for (const entry of entries)
            merged.set(overlayKey(entry.path), entry.content);
        return readOverlay.run(merged, run);
    }
    /** The overlaid content for `filePath`, or undefined when it is not overlaid. */
    overlaidContent(filePath) {
        const store = readOverlay.getStore();
        return store === undefined ? undefined : store.get(overlayKey(filePath));
    }
    /** Refuses a write to an overlaid path: a dry run that writes is not one. */
    assertNotOverlaid(filePath) {
        if (this.overlaidContent(filePath) === undefined)
            return;
        throw new errors_1.FileOperationError(`Refusing to write ${filePath}: it is served from a read-only overlay, so this operation is running inside a dry run that must not write.`);
    }
    async readFile(filePath) {
        const overlaid = this.overlaidContent(filePath);
        if (overlaid !== undefined)
            return overlaid;
        try {
            return await fs_1.promises.readFile(filePath, 'utf-8');
        }
        catch (error) {
            throw new errors_1.FileOperationError(`Failed to read file: ${filePath}`, { error });
        }
    }
    async writeFile(filePath, content, options) {
        this.assertNotOverlaid(filePath);
        try {
            await fs_1.promises.mkdir(path.dirname(filePath), { recursive: true });
            await fs_1.promises.writeFile(filePath, content, 'utf-8');
        }
        catch (error) {
            throw new errors_1.FileOperationError(`Failed to write file: ${filePath}`, { error });
        }
        if (options?.mode !== undefined) {
            await this.setFileMode(filePath, options.mode);
        }
    }
    /**
     * Apply a POSIX file mode. Windows has no execute bit and fs.chmod there
     * only toggles the read-only flag, so the call is skipped on win32.
     */
    async setFileMode(filePath, mode) {
        if (process.platform === 'win32') {
            return;
        }
        try {
            await fs_1.promises.chmod(filePath, mode);
        }
        catch (error) {
            throw new errors_1.FileOperationError(`Failed to set file mode: ${filePath}`, { error });
        }
    }
    /**
     * Write a file that has to be runnable by another process (git hooks and
     * friends). Returns without chmod on Windows, where the bit does not exist.
     */
    async writeExecutableFile(filePath, content) {
        await this.writeFile(filePath, content, { mode: exports.EXECUTABLE_FILE_MODE });
    }
    /**
     * Repair the execute bit on an already-written file. Resolves to true when
     * the mode was actually changed, so callers can report the repair.
     */
    async ensureExecutable(filePath) {
        if (process.platform === 'win32') {
            return false;
        }
        let stats;
        try {
            stats = await fs_1.promises.stat(filePath);
        }
        catch (error) {
            throw new errors_1.FileOperationError(`Failed to stat file: ${filePath}`, { error });
        }
        if ((stats.mode & 0o111) !== 0) {
            return false;
        }
        await this.setFileMode(filePath, exports.EXECUTABLE_FILE_MODE);
        return true;
    }
    async writeFileAtomic(filePath, content) {
        this.assertNotOverlaid(filePath);
        let tempPath;
        try {
            const directory = path.dirname(filePath);
            await fs_1.promises.mkdir(directory, { recursive: true });
            tempPath = path.join(directory, `.${path.basename(filePath)}.${process.pid}.${(0, crypto_1.randomUUID)()}.tmp`);
            await fs_1.promises.writeFile(tempPath, content, { encoding: 'utf-8', flag: 'wx' });
            await queuedAtomicReplace(tempPath, filePath);
        }
        catch (error) {
            throw new errors_1.FileOperationError(`Failed to write file atomically: ${filePath}`, { error });
        }
        finally {
            if (tempPath) {
                await fs_1.promises.rm(tempPath, { force: true }).catch(() => undefined);
            }
        }
    }
    async appendFile(filePath, content) {
        this.assertNotOverlaid(filePath);
        try {
            await fs_1.promises.mkdir(path.dirname(filePath), { recursive: true });
            await fs_1.promises.appendFile(filePath, content, 'utf-8');
        }
        catch (error) {
            throw new errors_1.FileOperationError(`Failed to append file: ${filePath}`, { error });
        }
    }
    async readJSON(filePath) {
        try {
            const content = await this.readFile(filePath);
            return JSON.parse(content.replace(/^\uFEFF/, ''));
        }
        catch (error) {
            throw new errors_1.FileOperationError(`Failed to parse JSON: ${filePath}`, { error });
        }
    }
    /*
     * M-race1: the non-throwing read, for the call sites that enumerate.
     *
     * `readJSON` reports one outcome -- it threw -- so an enumeration over N
     * changes cannot tell "this directory has no state file" from "this one
     * state file is half-written" from "the disk is gone", and the only
     * behaviour available to it is to abort all N. That is what took down
     * `ospec status` and `ospec queue list` for every change whenever one was
     * damaged.
     *
     * Three outcomes, not two, and the split is the point. Phase 1 spent its
     * effort removing "error means absent"; collapsing damage back into
     * `{ ok: false }` and letting each caller shrug would reintroduce it under a
     * new name. `absent` is a fact about the tree a caller may act on silently;
     * `damaged` is a fact about a file that a caller must either report or
     * refuse on, and never treat as emptiness.
     *
     * `src/services/IndexBuilder.ts` reached the same three outcomes
     * independently for `ospec index build` (P0-10) and keeps its own copy: it
     * is shared with the standalone `src/tools/build-index.ts`, which cannot
     * import a service. The vocabulary is deliberately identical.
     *
     * Reads through the overlay, so a dry run sees the same bytes every other
     * reader does.
     */
    async readJsonSafe(filePath) {
        let raw;
        const overlaid = this.overlaidContent(filePath);
        if (overlaid !== undefined) {
            raw = overlaid;
        }
        else {
            try {
                raw = await fs_1.promises.readFile(filePath, 'utf-8');
            }
            catch (error) {
                const code = error?.code;
                if (code === 'ENOENT' || code === 'ENOTDIR') {
                    return { status: 'absent', message: `${filePath} does not exist`, error };
                }
                // A directory where a JSON file belongs is damage, not absence:
                // reading it as absence resumes exactly the guessing this exists
                // to stop. It is not "invalid JSON" either, and telling someone
                // to fix the syntax of a directory helps nobody.
                if (code === 'EISDIR') {
                    return { status: 'damaged', message: `${filePath} is a directory, not a file`, error };
                }
                return {
                    status: 'damaged',
                    message: `${filePath} is unreadable (${code || error?.message || 'unknown error'})`,
                    error,
                };
            }
        }
        try {
            return { status: 'ok', value: JSON.parse(raw.replace(/^\uFEFF/, '')) };
        }
        catch (error) {
            return {
                status: 'damaged',
                message: `${filePath} contains invalid JSON (${error?.message || 'parse failed'})`,
                error,
            };
        }
    }
    async writeJSON(filePath, data) {
        this.assertNotOverlaid(filePath);
        let tempPath;
        try {
            const content = JSON.stringify(data, null, 2);
            const directory = path.dirname(filePath);
            await fs_1.promises.mkdir(directory, { recursive: true });
            tempPath = path.join(directory, `.${path.basename(filePath)}.${process.pid}.${(0, crypto_1.randomUUID)()}.tmp`);
            await fs_1.promises.writeFile(tempPath, content, { encoding: 'utf-8', flag: 'wx' });
            await queuedAtomicReplace(tempPath, filePath);
        }
        catch (error) {
            throw new errors_1.FileOperationError(`Failed to write JSON: ${filePath}`, { error });
        }
        finally {
            if (tempPath) {
                await fs_1.promises.rm(tempPath, { force: true }).catch(() => undefined);
            }
        }
    }
    async readYAML(filePath) {
        try {
            const content = await this.readFile(filePath);
            return yaml.load(content);
        }
        catch (error) {
            throw new errors_1.FileOperationError(`Failed to parse YAML: ${filePath}`, { error });
        }
    }
    async writeYAML(filePath, data) {
        try {
            const content = yaml.dump(data);
            await this.writeFile(filePath, content);
        }
        catch (error) {
            throw new errors_1.FileOperationError(`Failed to write YAML: ${filePath}`, { error });
        }
    }
    async ensureDir(dirPath) {
        try {
            await fs_1.promises.mkdir(dirPath, { recursive: true });
        }
        catch (error) {
            throw new errors_1.FileOperationError(`Failed to ensure directory: ${dirPath}`, { error });
        }
    }
    async exists(filePath) {
        if (this.overlaidContent(filePath) !== undefined)
            return true;
        return pathExists(filePath);
    }
    /**
     * F7: the single delete funnel for `src/`. Routed through the lstat guard so
     * a symlinked target is unlinked rather than recursed into.
     */
    async remove(filePath) {
        try {
            await (0, safeRemove_1.removePathSafely)(filePath);
        }
        catch (error) {
            throw new errors_1.FileOperationError(`Failed to remove: ${filePath}`, { error });
        }
    }
    async copy(src, dest) {
        try {
            await fs_1.promises.mkdir(path.dirname(dest), { recursive: true });
            await fs_1.promises.cp(src, dest, { recursive: true, force: true });
        }
        catch (error) {
            throw new errors_1.FileOperationError(`Failed to copy from ${src} to ${dest}`, { error });
        }
    }
    async move(src, dest) {
        try {
            await fs_1.promises.mkdir(path.dirname(dest), { recursive: true });
            await fs_1.promises.rename(src, dest);
        }
        catch (error) {
            if (error?.code === 'EXDEV') {
                try {
                    await this.copy(src, dest);
                    await this.remove(src);
                    return;
                }
                catch (fallbackError) {
                    throw new errors_1.FileOperationError(`Failed to move from ${src} to ${dest}`, { error: fallbackError });
                }
            }
            throw new errors_1.FileOperationError(`Failed to move from ${src} to ${dest}`, { error });
        }
    }
    async readDir(dirPath) {
        try {
            return await fs_1.promises.readdir(dirPath);
        }
        catch (error) {
            throw new errors_1.FileOperationError(`Failed to read directory: ${dirPath}`, { error });
        }
    }
    async stat(filePath) {
        try {
            return await fs_1.promises.stat(filePath);
        }
        catch (error) {
            throw new errors_1.FileOperationError(`Failed to stat: ${filePath}`, { error });
        }
    }
}
exports.FileService = FileService;
exports.fileService = new FileService();
