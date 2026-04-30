import { SyncConfig } from '../types';
export declare function createRemoteDump(config: SyncConfig): Promise<string>;
export declare function downloadDump(config: SyncConfig, remotePath: string): Promise<string>;
export declare function importLocalDb(wpCliPath: string, sitePath: string, dumpPath: string): Promise<void>;
export declare function searchReplaceLocal(wpCliPath: string, sitePath: string, from: string, to: string): Promise<string>;
export declare function flushLocalCache(wpCliPath: string, sitePath: string): Promise<void>;
export declare function exportLocalDb(wpCliPath: string, sitePath: string): Promise<string>;
export declare function uploadAndImportRemoteDb(config: SyncConfig, localDumpPath: string): Promise<void>;
export declare function searchReplaceRemote(config: SyncConfig, from: string, to: string): Promise<void>;
export declare function flushRemoteCache(config: SyncConfig): Promise<void>;
export declare function restartRemoteContainers(config: SyncConfig): Promise<void>;
export declare function cleanupRemoteDump(config: SyncConfig, remotePath: string): Promise<void>;
//# sourceMappingURL=database.d.ts.map