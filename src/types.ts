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

export const DEFAULT_CONFIG: SyncConfig = {
	sshHost: '178.105.29.243',
	sshPort: 22,
	sshUser: 'root',
	sshKeyPath: '~/.ssh/id_ed25519',
	remoteWpPath: '/var/lib/docker/volumes/morskysvet-stack_wordpress_data/_data',
	remoteWpContentPath: '/var/lib/docker/volumes/morskysvet-stack_wordpress_data/_data/wp-content',
	remoteDbContainer: 'ms-mariadb',
	remoteWpContainer: 'ms-wordpress',
	remoteDbName: 'morskysvet',
	productionDomain: 'morskysvet.xyz',
	excludedPaths: ['cache/', 'object-cache.php', 'advanced-cache.php'],
};

export const IPC_EVENTS = {
	PULL_START: 'hetzner-sync:pull-start',
	PUSH_START: 'hetzner-sync:push-start',
	SYNC_PROGRESS: 'hetzner-sync:sync-progress',
	SYNC_COMPLETE: 'hetzner-sync:sync-complete',
	TEST_CONNECTION: 'hetzner-sync:test-connection',
	TEST_CONNECTION_RESULT: 'hetzner-sync:test-connection-result',
	GET_CONFIG: 'hetzner-sync:get-config',
	SAVE_CONFIG: 'hetzner-sync:save-config',
	CONFIG_DATA: 'hetzner-sync:config-data',
} as const;
