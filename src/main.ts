import * as path from 'path';
import { ipcMain, BrowserWindow } from 'electron';
import { SyncConfig, SyncProgress, IPC_EVENTS } from './types';
import { loadConfig, saveConfig } from './utils/config';
import { testConnection } from './utils/ssh';
import { rsyncPull, rsyncPush } from './utils/rsync';
import {
	createRemoteDump,
	downloadDump,
	importLocalDb,
	searchReplaceLocal,
	flushLocalCache,
	exportLocalDb,
	uploadAndImportRemoteDb,
	searchReplaceRemote,
	flushRemoteCache,
	restartRemoteContainers,
	cleanupRemoteDump,
} from './utils/database';

function sendProgress(window: BrowserWindow, progress: SyncProgress): void {
	window.webContents.send(IPC_EVENTS.SYNC_PROGRESS, progress);
}

function getLocalDomain(site: any): string {
	return site.domain || `${site.name}.local`;
}

function getWpContentPath(site: any): string {
	return path.join(site.path, 'app', 'public', 'wp-content');
}

function getSitePath(site: any): string {
	return path.join(site.path, 'app', 'public');
}

function getWpCliPath(site: any): string {
	if (site.shell?.wpCliPath) return site.shell.wpCliPath;
	if (site.paths?.wpCli) return site.paths.wpCli;
	return 'wp';
}

async function runPull(window: BrowserWindow, site: any, config: SyncConfig): Promise<void> {
	const totalSteps = 7;
	const localDomain = getLocalDomain(site);
	const wpCliPath = getWpCliPath(site);
	const sitePath = getSitePath(site);
	const wpContentPath = getWpContentPath(site);

	sendProgress(window, { step: 1, totalSteps, label: 'Creating remote database dump...', status: 'running' });
	const remoteDumpPath = await createRemoteDump(config);
	sendProgress(window, { step: 1, totalSteps, label: 'Remote dump created', status: 'done' });

	sendProgress(window, { step: 2, totalSteps, label: 'Downloading database dump...', status: 'running' });
	const localDumpPath = await downloadDump(config, remoteDumpPath);
	await cleanupRemoteDump(config, remoteDumpPath);
	sendProgress(window, { step: 2, totalSteps, label: 'Database dump downloaded', status: 'done' });

	sendProgress(window, { step: 3, totalSteps, label: 'Syncing wp-content files...', status: 'running' });
	await rsyncPull(config, wpContentPath, (line) => {
		sendProgress(window, { step: 3, totalSteps, label: `Syncing: ${line.slice(0, 80)}`, status: 'running' });
	});
	sendProgress(window, { step: 3, totalSteps, label: 'Files synced', status: 'done' });

	sendProgress(window, { step: 4, totalSteps, label: 'Importing database...', status: 'running' });
	await importLocalDb(wpCliPath, sitePath, localDumpPath);
	sendProgress(window, { step: 4, totalSteps, label: 'Database imported', status: 'done' });

	sendProgress(window, { step: 5, totalSteps, label: 'Replacing domain...', status: 'running' });
	await searchReplaceLocal(wpCliPath, sitePath, config.productionDomain, localDomain);
	sendProgress(window, { step: 5, totalSteps, label: 'Domain replaced', status: 'done' });

	sendProgress(window, { step: 6, totalSteps, label: 'Replacing protocol (https → http)...', status: 'running' });
	await searchReplaceLocal(wpCliPath, sitePath, `https://${localDomain}`, `http://${localDomain}`);
	sendProgress(window, { step: 6, totalSteps, label: 'Protocol replaced', status: 'done' });

	sendProgress(window, { step: 7, totalSteps, label: 'Flushing cache...', status: 'running' });
	await flushLocalCache(wpCliPath, sitePath);
	sendProgress(window, { step: 7, totalSteps, label: 'Cache flushed', status: 'done' });
}

async function runPush(window: BrowserWindow, site: any, config: SyncConfig): Promise<void> {
	const totalSteps = 7;
	const localDomain = getLocalDomain(site);
	const wpCliPath = getWpCliPath(site);
	const sitePath = getSitePath(site);
	const wpContentPath = getWpContentPath(site);

	sendProgress(window, { step: 1, totalSteps, label: 'Exporting local database...', status: 'running' });
	const localDumpPath = await exportLocalDb(wpCliPath, sitePath);
	sendProgress(window, { step: 1, totalSteps, label: 'Local database exported', status: 'done' });

	sendProgress(window, { step: 2, totalSteps, label: 'Uploading wp-content files...', status: 'running' });
	await rsyncPush(config, wpContentPath, (line) => {
		sendProgress(window, { step: 2, totalSteps, label: `Uploading: ${line.slice(0, 80)}`, status: 'running' });
	});
	sendProgress(window, { step: 2, totalSteps, label: 'Files uploaded', status: 'done' });

	sendProgress(window, { step: 3, totalSteps, label: 'Uploading and importing database...', status: 'running' });
	await uploadAndImportRemoteDb(config, localDumpPath);
	sendProgress(window, { step: 3, totalSteps, label: 'Database imported on remote', status: 'done' });

	sendProgress(window, { step: 4, totalSteps, label: 'Replacing domain on remote...', status: 'running' });
	await searchReplaceRemote(config, localDomain, config.productionDomain);
	sendProgress(window, { step: 4, totalSteps, label: 'Domain replaced', status: 'done' });

	sendProgress(window, { step: 5, totalSteps, label: 'Replacing protocol on remote...', status: 'running' });
	await searchReplaceRemote(config, `http://${config.productionDomain}`, `https://${config.productionDomain}`);
	sendProgress(window, { step: 5, totalSteps, label: 'Protocol replaced', status: 'done' });

	sendProgress(window, { step: 6, totalSteps, label: 'Flushing remote cache...', status: 'running' });
	await flushRemoteCache(config);
	sendProgress(window, { step: 6, totalSteps, label: 'Remote cache flushed', status: 'done' });

	sendProgress(window, { step: 7, totalSteps, label: 'Restarting remote containers...', status: 'running' });
	await restartRemoteContainers(config);
	sendProgress(window, { step: 7, totalSteps, label: 'Containers restarted', status: 'done' });
}

export default function (context: any): void {
	ipcMain.on(IPC_EVENTS.GET_CONFIG, (event) => {
		event.reply(IPC_EVENTS.CONFIG_DATA, loadConfig());
	});

	ipcMain.on(IPC_EVENTS.SAVE_CONFIG, (_event, config: SyncConfig) => {
		saveConfig(config);
	});

	ipcMain.on(IPC_EVENTS.TEST_CONNECTION, async (event, config: SyncConfig) => {
		const result = await testConnection(config);
		event.reply(IPC_EVENTS.TEST_CONNECTION_RESULT, result);
	});

	ipcMain.on(IPC_EVENTS.PULL_START, async (event, site: any) => {
		const window = BrowserWindow.fromWebContents(event.sender);
		if (!window) return;
		const config = loadConfig();
		const startTime = Date.now();
		try {
			await runPull(window, site, config);
			window.webContents.send(IPC_EVENTS.SYNC_COMPLETE, {
				success: true,
				duration: Date.now() - startTime,
			});
		} catch (err: any) {
			window.webContents.send(IPC_EVENTS.SYNC_COMPLETE, {
				success: false,
				error: err.message,
			});
		}
	});

	ipcMain.on(IPC_EVENTS.PUSH_START, async (event, site: any) => {
		const window = BrowserWindow.fromWebContents(event.sender);
		if (!window) return;
		const config = loadConfig();
		const startTime = Date.now();
		try {
			await runPush(window, site, config);
			window.webContents.send(IPC_EVENTS.SYNC_COMPLETE, {
				success: true,
				duration: Date.now() - startTime,
			});
		} catch (err: any) {
			window.webContents.send(IPC_EVENTS.SYNC_COMPLETE, {
				success: false,
				error: err.message,
			});
		}
	});
}
