/**
 * File system service.
 */
import { Stats } from 'fs';
/** One file the overlay serves instead of the bytes on disk. */
export interface ReadOverlayEntry {
    path: string;
    content: string;
}
export declare const EXECUTABLE_FILE_MODE = 493;
export interface WriteFileOptions {
    /** POSIX file mode applied after the write. Ignored on Windows. */
    mode?: number;
}
/**
 * The outcome of `FileService.readJsonSafe`. See the note on that method for
 * why `absent` and `damaged` are separate failures rather than one `!ok`.
 *
 * Discriminated on a string rather than on an `ok` boolean because this project
 * compiles with `strict: false`: without `strictNullChecks`, TypeScript widens
 * `true`/`false` and stops narrowing the union, so an `ok`-shaped result would
 * have compiled to something no call site could destructure safely. The string
 * also matches the vocabulary `IndexBuilder.readJsonOutcome` already uses.
 */
export type JsonReadResult<T> = {
    status: 'ok';
    value: T;
} | {
    status: 'absent';
    message: string;
    error: unknown;
} | {
    status: 'damaged';
    message: string;
    error: unknown;
};
export declare class FileService {
    /**
     * Runs `run` with `entries` served in place of the bytes on disk.
     *
     * See the overlay comment above. The overlay is visible only inside `run`
     * and only on this async call chain.
     */
    withReadOverlay<TResult>(entries: readonly ReadOverlayEntry[], run: () => Promise<TResult>): Promise<TResult>;
    /** The overlaid content for `filePath`, or undefined when it is not overlaid. */
    private overlaidContent;
    /** Refuses a write to an overlaid path: a dry run that writes is not one. */
    private assertNotOverlaid;
    readFile(filePath: string): Promise<string>;
    writeFile(filePath: string, content: string, options?: WriteFileOptions): Promise<void>;
    /**
     * Apply a POSIX file mode. Windows has no execute bit and fs.chmod there
     * only toggles the read-only flag, so the call is skipped on win32.
     */
    setFileMode(filePath: string, mode: number): Promise<void>;
    /**
     * Write a file that has to be runnable by another process (git hooks and
     * friends). Returns without chmod on Windows, where the bit does not exist.
     */
    writeExecutableFile(filePath: string, content: string): Promise<void>;
    /**
     * Repair the execute bit on an already-written file. Resolves to true when
     * the mode was actually changed, so callers can report the repair.
     */
    ensureExecutable(filePath: string): Promise<boolean>;
    writeFileAtomic(filePath: string, content: string): Promise<void>;
    appendFile(filePath: string, content: string): Promise<void>;
    readJSON<T = any>(filePath: string): Promise<T>;
    readJsonSafe<T = any>(filePath: string): Promise<JsonReadResult<T>>;
    writeJSON(filePath: string, data: any): Promise<void>;
    readYAML<T = any>(filePath: string): Promise<T>;
    writeYAML(filePath: string, data: any): Promise<void>;
    ensureDir(dirPath: string): Promise<void>;
    exists(filePath: string): Promise<boolean>;
    /**
     * F7: the single delete funnel for `src/`. Routed through the lstat guard so
     * a symlinked target is unlinked rather than recursed into.
     */
    remove(filePath: string): Promise<void>;
    copy(src: string, dest: string): Promise<void>;
    move(src: string, dest: string): Promise<void>;
    readDir(dirPath: string): Promise<string[]>;
    stat(filePath: string): Promise<Stats>;
}
export declare const fileService: FileService;
