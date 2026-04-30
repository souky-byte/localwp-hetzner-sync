export interface SyncConfig {
    sshHost: string;
    sshPort: number;
    sshUser: string;
    sshKeyPath: string;
    remoteWpPath: string;
    remoteWpContentPath: string;
    remoteDbContainer: string;
    remoteWpContainer: string;
    remoteDbName: string;
    productionDomain: string;
    excludedPaths: string[];
}
export interface SyncProgress {
    step: number;
    totalSteps: number;
    label: string;
    status: 'pending' | 'running' | 'done' | 'error';
    error?: string;
}
export interface SyncResult {
    success: boolean;
    error?: string;
    duration?: number;
}
export declare const DEFAULT_CONFIG: SyncConfig;
export declare const IPC_EVENTS: {
    readonly PULL_START: "hetzner-sync:pull-start";
    readonly PUSH_START: "hetzner-sync:push-start";
    readonly SYNC_PROGRESS: "hetzner-sync:sync-progress";
    readonly SYNC_COMPLETE: "hetzner-sync:sync-complete";
    readonly TEST_CONNECTION: "hetzner-sync:test-connection";
    readonly TEST_CONNECTION_RESULT: "hetzner-sync:test-connection-result";
    readonly GET_CONFIG: "hetzner-sync:get-config";
    readonly SAVE_CONFIG: "hetzner-sync:save-config";
    readonly CONFIG_DATA: "hetzner-sync:config-data";
};
//# sourceMappingURL=types.d.ts.map