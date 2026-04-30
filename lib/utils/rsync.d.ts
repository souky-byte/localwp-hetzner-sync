import { SyncConfig } from '../types';
export declare function rsyncPull(config: SyncConfig, localWpContentPath: string, onProgress?: (line: string) => void): Promise<void>;
export declare function rsyncPush(config: SyncConfig, localWpContentPath: string, onProgress?: (line: string) => void): Promise<void>;
//# sourceMappingURL=rsync.d.ts.map