import { SyncConfig } from '../types';
import { sshExec, scpDownload, scpUpload, getRemoteDbPassword } from './ssh';
import { execFile } from 'child_process';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

function localExec(command: string, args: string[], cwd?: string): Promise<string> {
	return new Promise((resolve, reject) => {
		execFile(command, args, { cwd, maxBuffer: 50 * 1024 * 1024, timeout: 300_000 }, (err, stdout, stderr) => {
			if (err) {
				reject(new Error(`${command} failed: ${stderr || err.message}`));
				return;
			}
			resolve(stdout);
		});
	});
}

function shellQuote(s: string): string {
	return `'${s.replace(/'/g, "'\\''")}'`;
}

export async function createRemoteDump(config: SyncConfig): Promise<string> {
	const dbPass = await getRemoteDbPassword(config);
	const remoteDumpPath = '/tmp/morskysvet-pull.sql.gz';

	await sshExec(
		config,
		`docker exec ${config.remoteDbContainer} mariadb-dump -u root -p${shellQuote(dbPass)} --single-transaction --routines --triggers ${config.remoteDbName} | gzip > ${remoteDumpPath}`,
	);

	return remoteDumpPath;
}

export async function downloadDump(config: SyncConfig, remotePath: string): Promise<string> {
	const localPath = path.join(os.tmpdir(), 'morskysvet-pull.sql.gz');
	await scpDownload(config, remotePath, localPath);
	return localPath;
}

export async function importLocalDb(
	wpCliPath: string,
	sitePath: string,
	dumpPath: string,
): Promise<void> {
	const sqlPath = dumpPath.replace(/\.gz$/, '');

	if (dumpPath.endsWith('.gz')) {
		await localExec('gunzip', ['-f', dumpPath]);
	}

	await localExec(wpCliPath, ['db', 'import', sqlPath], sitePath);

	try { fs.unlinkSync(sqlPath); } catch {}
}

export async function searchReplaceLocal(
	wpCliPath: string,
	sitePath: string,
	from: string,
	to: string,
): Promise<string> {
	return localExec(wpCliPath, ['search-replace', from, to, '--all-tables', '--precise'], sitePath);
}

export async function flushLocalCache(wpCliPath: string, sitePath: string): Promise<void> {
	await localExec(wpCliPath, ['cache', 'flush'], sitePath);
}

export async function exportLocalDb(wpCliPath: string, sitePath: string): Promise<string> {
	const dumpPath = path.join(os.tmpdir(), 'morskysvet-push.sql');
	await localExec(wpCliPath, ['db', 'export', dumpPath], sitePath);
	return dumpPath;
}

export async function uploadAndImportRemoteDb(config: SyncConfig, localDumpPath: string): Promise<void> {
	const remoteDumpPath = '/tmp/morskysvet-push.sql';
	await scpUpload(config, localDumpPath, remoteDumpPath);

	const dbPass = await getRemoteDbPassword(config);
	await sshExec(
		config,
		`docker exec -i ${config.remoteDbContainer} mariadb -u root -p${shellQuote(dbPass)} ${config.remoteDbName} < ${remoteDumpPath}`,
	);

	await sshExec(config, `rm -f ${remoteDumpPath}`);
	try { fs.unlinkSync(localDumpPath); } catch {}
}

export async function searchReplaceRemote(config: SyncConfig, from: string, to: string): Promise<void> {
	await sshExec(
		config,
		`docker exec ${config.remoteWpContainer} wp --path=/var/www/html --allow-root search-replace ${shellQuote(from)} ${shellQuote(to)} --all-tables`,
	);
}

export async function flushRemoteCache(config: SyncConfig): Promise<void> {
	await sshExec(
		config,
		`docker exec ${config.remoteWpContainer} wp --path=/var/www/html --allow-root cache flush`,
	);
}

export async function restartRemoteContainers(config: SyncConfig): Promise<void> {
	await sshExec(config, `docker restart ${config.remoteWpContainer} ms-nginx`);
}

export async function cleanupRemoteDump(config: SyncConfig, remotePath: string): Promise<void> {
	await sshExec(config, `rm -f ${remotePath}`);
}
