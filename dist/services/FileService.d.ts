/**
 * 文件操作服务
 */
import { Stats } from 'fs';
export declare class FileService {
    readFile(filePath: string): Promise<string>;
    writeFile(filePath: string, content: string): Promise<void>;
    readJSON<T = any>(filePath: string): Promise<T>;
    writeJSON(filePath: string, data: any): Promise<void>;
    readYAML<T = any>(filePath: string): Promise<T>;
    writeYAML(filePath: string, data: any): Promise<void>;
    ensureDir(dirPath: string): Promise<void>;
    exists(filePath: string): Promise<boolean>;
    remove(filePath: string): Promise<void>;
    copy(src: string, dest: string): Promise<void>;
    move(src: string, dest: string): Promise<void>;
    readDir(dirPath: string): Promise<string[]>;
    stat(filePath: string): Promise<Stats>;
}
export declare const fileService: FileService;