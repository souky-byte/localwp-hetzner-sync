import * as fs from 'fs';
import * as path from 'path';
import { SyncConfig, DEFAULT_CONFIG } from '../types';

function getConfigPath(): string {
	const configDir = path.join(
		process.env.HOME || process.env.USERPROFILE || '',
		'.config',
		'Local',
		'addons',
		'localwp-hetzner-sync',
	);
	if (!fs.existsSync(configDir)) {
		fs.mkdirSync(configDir, { recursive: true });
	}
	return path.join(configDir, 'config.json');
}

export function loadConfig(): SyncConfig {
	const configPath = getConfigPath();
	if (!fs.existsSync(configPath)) {
		return { ...DEFAULT_CONFIG };
	}
	try {
		const raw = fs.readFileSync(configPath, 'utf-8');
		const saved = JSON.parse(raw) as Partial<SyncConfig>;
		return { ...DEFAULT_CONFIG, ...saved };
	} catch {
		return { ...DEFAULT_CONFIG };
	}
}

export function saveConfig(config: SyncConfig): void {
	const configPath = getConfigPath();
	fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

export function resolveHome(filepath: string): string {
	if (filepath.startsWith('~/') || filepath === '~') {
		const home = process.env.HOME || process.env.USERPROFILE || '';
		return path.join(home, filepath.slice(2));
	}
	return filepath;
}
