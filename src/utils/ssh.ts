import { execFile, ExecFileOptions } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { SyncConfig } from '../types';
import { resolveHome } from './config';

function shellQuote(s: string): string {
	return `'${s.replace(/'/g, "'\\''")}'`;
}

function sshArgs(config: SyncConfig): string[] {
	return [
		'-i', resolveHome(config.sshKeyPath),
		'-p', String(config.sshPort),
		'-o', 'StrictHostKeyChecking=accept-new',
		'-o', 'BatchMode=yes',
		'-o', 'ConnectTimeout=10',
	];
}

function sshTarget(config: SyncConfig): string {
	return `${config.sshUser}@${config.sshHost}`;
}

export function sshExec(config: SyncConfig, command: string): Promise<string> {
	return new Promise((resolve, reject) => {
		const args = [...sshArgs(config), sshTarget(config), `bash -c ${shellQuote(command)}`];
		const opts: ExecFileOptions = { maxBuffer: 50 * 1024 * 1024, timeout: 300_000 };
		execFile('ssh', args, opts, (err, stdout, stderr) => {
			if (err) {
				reject(new Error(`SSH command failed: ${stderr || err.message}`));
				return;
			}
			resolve(stdout.toString());
		});
	});
}

export function scpDownload(config: SyncConfig, remotePath: string, localPath: string): Promise<void> {
	return new Promise((resolve, reject) => {
		fs.mkdirSync(path.dirname(localPath), { recursive: true });
		const args = [
			...sshArgs(config),
			`${sshTarget(config)}:${remotePath}`,
			localPath,
		];
		execFile('scp', args, { timeout: 600_000 }, (err, _stdout, stderr) => {
			if (err) {
				reject(new Error(`SCP download failed: ${stderr || err.message}`));
				return;
			}
			resolve();
		});
	});
}

export function scpUpload(config: SyncConfig, localPath: string, remotePath: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const args = [
			...sshArgs(config),
			localPath,
			`${sshTarget(config)}:${remotePath}`,
		];
		execFile('scp', args, { timeout: 600_000 }, (err, _stdout, stderr) => {
			if (err) {
				reject(new Error(`SCP upload failed: ${stderr || err.message}`));
				return;
			}
			resolve();
		});
	});
}

export async function testConnection(config: SyncConfig): Promise<{ success: boolean; message: string }> {
	try {
		const result = await sshExec(config, 'echo "Connection successful" && docker ps --format "{{.Names}}" 2>/dev/null');
		const lines = result.trim().split('\n');
		const hasWpContainer = lines.some(l => l.trim() === config.remoteWpContainer);
		const hasDbContainer = lines.some(l => l.trim() === config.remoteDbContainer);

		if (!hasWpContainer || !hasDbContainer) {
			return {
				success: true,
				message: `SSH connected, but missing containers: ${[
					!hasWpContainer && config.remoteWpContainer,
					!hasDbContainer && config.remoteDbContainer,
				].filter(Boolean).join(', ')}`,
			};
		}
		return { success: true, message: 'Connection successful. All containers found.' };
	} catch (err: any) {
		return { success: false, message: err.message };
	}
}

export async function getRemoteDbPassword(config: SyncConfig): Promise<string> {
	const output = await sshExec(
		config,
		"grep '^MYSQL_ROOT_PASSWORD=' /opt/morskysvet-stack/.env | cut -d'=' -f2-",
	);
	const password = output.trim();
	if (!password) {
		throw new Error('Could not read MYSQL_ROOT_PASSWORD from remote .env file');
	}
	return password;
}
