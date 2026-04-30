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

function emitProgressLines(buffer: Buffer, onProgress?: (line: string) => void): void {
	const lines = buffer
		.toString()
		.split(/\r?\n|\r/)
		.map((line) => line.trim())
		.filter(Boolean);

	for (const line of lines) {
		onProgress?.(line);
	}
}

function summarizeRsyncLine(line: string): string | null {
	const checkMatch = line.match(/xfer#(\d+),\s*to-check=(\d+)\/(\d+)/);
	if (checkMatch) {
		const transferred = Number(checkMatch[1]);
		const remaining = Number(checkMatch[2]);
		const total = Number(checkMatch[3]);
		const checked = total - remaining;
		const percent = total > 0 ? Math.round((checked / total) * 100) : 0;
		return `rsync checked ${checked}/${total} items (${percent}%), transferred ${transferred}`;
	}

	if (/^\d[\d,.]*\s+100%\s+/.test(line)) {
		return null;
	}

	return line;
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
			'--force',
			'--progress',
			'-e', buildSshCommand(config),
			...buildExcludeArgs(config),
			remoteSource,
			localDest,
		];

		const proc = spawn('rsync', args, { stdio: ['ignore', 'pipe', 'pipe'] });
		let stderr = '';
		let settled = false;
		let lastOutputAt = Date.now();
		let lastProgressLine = 'rsync started';

		onProgress?.(`rsync started: ${remoteSource} -> ${localDest}`);

		const heartbeatTimer = setInterval(() => {
			const idleMs = Date.now() - lastOutputAt;
			if (idleMs > 30_000 && !settled) {
				onProgress?.(`rsync still running (${Math.round(idleMs / 1000)}s quiet). ${lastProgressLine}`);
			}
		}, 30_000);

		const handleOutput = (data: Buffer, isStderr = false) => {
			lastOutputAt = Date.now();
			const text = data.toString();
			if (isStderr) stderr += text;
			const lines = text
				.split(/\r?\n|\r/)
				.map((line) => line.trim())
				.filter(Boolean);

			for (const line of lines) {
				const summary = summarizeRsyncLine(line);
				if (!summary) continue;
				lastProgressLine = summary;
				onProgress?.(summary);
			}
		};

		proc.stdout.on('data', (data: Buffer) => {
			handleOutput(data);
		});

		proc.stderr.on('data', (data: Buffer) => {
			handleOutput(data, true);
		});

		proc.on('close', (code) => {
			settled = true;
			clearInterval(heartbeatTimer);
			if (code !== 0) {
				reject(new Error(`rsync pull failed (exit ${code}): ${stderr}`));
				return;
			}
			resolve();
		});

		proc.on('error', (err) => {
			settled = true;
			clearInterval(heartbeatTimer);
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
			'--force',
			'--progress',
			'-e', buildSshCommand(config),
			...buildExcludeArgs(config),
			localSource,
			remoteDest,
		];

		const proc = spawn('rsync', args, { stdio: ['ignore', 'pipe', 'pipe'] });
		let stderr = '';

		proc.stdout.on('data', (data: Buffer) => {
			emitProgressLines(data, onProgress);
		});

		proc.stderr.on('data', (data: Buffer) => {
			stderr += data.toString();
			emitProgressLines(data, onProgress);
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
