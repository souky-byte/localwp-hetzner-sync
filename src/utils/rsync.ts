import { spawn } from 'child_process';
import { SyncConfig } from '../types';
import { resolveHome } from './config';

function buildExcludeArgs(config: SyncConfig): string[] {
	const args: string[] = [];
	for (const excluded of config.excludedPaths) {
		args.push('--exclude', excluded);
	}
	return args;
}

function buildSshCommand(config: SyncConfig): string {
	return `ssh -i ${resolveHome(config.sshKeyPath)} -p ${config.sshPort} -o StrictHostKeyChecking=accept-new -o BatchMode=yes`;
}

export function rsyncPull(
	config: SyncConfig,
	localWpContentPath: string,
	onProgress?: (line: string) => void,
): Promise<void> {
	return new Promise((resolve, reject) => {
		const remoteSource = `${config.sshUser}@${config.sshHost}:${config.remoteWpContentPath}/`;
		const localDest = localWpContentPath.endsWith('/') ? localWpContentPath : `${localWpContentPath}/`;

		const args = [
			'-avz',
			'--delete',
			'--progress',
			'-e', buildSshCommand(config),
			...buildExcludeArgs(config),
			remoteSource,
			localDest,
		];

		const proc = spawn('rsync', args, { stdio: ['ignore', 'pipe', 'pipe'] });
		let stderr = '';

		proc.stdout.on('data', (data: Buffer) => {
			const lines = data.toString().split('\n').filter(Boolean);
			for (const line of lines) {
				onProgress?.(line);
			}
		});

		proc.stderr.on('data', (data: Buffer) => {
			stderr += data.toString();
		});

		proc.on('close', (code) => {
			if (code !== 0) {
				reject(new Error(`rsync pull failed (exit ${code}): ${stderr}`));
				return;
			}
			resolve();
		});

		proc.on('error', (err) => {
			reject(new Error(`rsync pull failed to start: ${err.message}`));
		});
	});
}

export function rsyncPush(
	config: SyncConfig,
	localWpContentPath: string,
	onProgress?: (line: string) => void,
): Promise<void> {
	return new Promise((resolve, reject) => {
		const localSource = localWpContentPath.endsWith('/') ? localWpContentPath : `${localWpContentPath}/`;
		const remoteDest = `${config.sshUser}@${config.sshHost}:${config.remoteWpContentPath}/`;

		const args = [
			'-avz',
			'--delete',
			'--progress',
			'-e', buildSshCommand(config),
			...buildExcludeArgs(config),
			localSource,
			remoteDest,
		];

		const proc = spawn('rsync', args, { stdio: ['ignore', 'pipe', 'pipe'] });
		let stderr = '';

		proc.stdout.on('data', (data: Buffer) => {
			const lines = data.toString().split('\n').filter(Boolean);
			for (const line of lines) {
				onProgress?.(line);
			}
		});

		proc.stderr.on('data', (data: Buffer) => {
			stderr += data.toString();
		});

		proc.on('close', (code) => {
			if (code !== 0) {
				reject(new Error(`rsync push failed (exit ${code}): ${stderr}`));
				return;
			}
			resolve();
		});

		proc.on('error', (err) => {
			reject(new Error(`rsync push failed to start: ${err.message}`));
		});
	});
}
