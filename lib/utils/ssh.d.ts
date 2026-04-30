import { SyncConfig } from '../types';
export declare function sshExec(config: SyncConfig, command: string): Promise<string>;
export declare function scpDownload(config: SyncConfig, remotePath: string, localPath: string): Promise<void>;
export declare function scpUpload(config: SyncConfig, localPath: string, remotePath: string): Promise<void>;
export declare function testConnection(config: SyncConfig): Promise<{
    success: boolean;
    message: string;
}>;
export declare function getRemoteDbPassword(config: SyncConfig): Promise<string>;
//# sourceMappingURL=ssh.d.ts.map