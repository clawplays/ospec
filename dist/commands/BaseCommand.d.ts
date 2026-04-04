/**
 * 命令基类
 */
import { Logger } from '../services/Logger';
export declare abstract class BaseCommand {
    protected logger: Logger;
    constructor();
    /**
     * 执行命令
     */
    abstract execute(...args: any[]): Promise<void>;
    /**
     * 验证命令参数
     */
    protected validateArgs(args: any[], requiredCount: number): void;
    /**
     * 打印成功信息
     */
    protected success(message: string): void;
    /**
     * 打印信息
     */
    protected info(message: string): void;
    /**
     * 打印错误信息
     */
    protected error(message: string): void;
    /**
     * 打印警告信息
     */
    protected warn(message: string): void;
}