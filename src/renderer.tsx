import React, { useState, useEffect, useCallback } from 'react';
import { ipcRenderer } from 'electron';
import { SyncConfig, SyncProgress, SyncResult, IPC_EVENTS, DEFAULT_CONFIG } from './types';

interface ProgressBarProps {
	progress: SyncProgress | null;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
	if (!progress) return null;
	const pct = Math.round((progress.step / progress.totalSteps) * 100);
	const barColor = progress.status === 'error' ? '#e74c3c' : '#51bb7b';

	return (
		<div style={{ marginTop: 16 }}>
			<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
				<span>{progress.label}</span>
				<span>{progress.step}/{progress.totalSteps}</span>
			</div>
			<div style={{ height: 8, background: '#e0e0e0', borderRadius: 4, overflow: 'hidden' }}>
				<div style={{
					width: `${pct}%`,
					height: '100%',
					background: barColor,
					borderRadius: 4,
					transition: 'width 0.3s ease',
				}} />
			</div>
		</div>
	);
};

interface SyncPanelProps {
	site: any;
}

const SyncPanel: React.FC<SyncPanelProps> = ({ site }) => {
	const [syncing, setSyncing] = useState(false);
	const [progress, setProgress] = useState<SyncProgress | null>(null);
	const [result, setResult] = useState<SyncResult | null>(null);
	const [confirmPush, setConfirmPush] = useState(false);

	useEffect(() => {
		const onProgress = (_e: any, p: SyncProgress) => setProgress(p);
		const onComplete = (_e: any, r: SyncResult) => {
			setResult(r);
			setSyncing(false);
		};

		ipcRenderer.on(IPC_EVENTS.SYNC_PROGRESS, onProgress);
		ipcRenderer.on(IPC_EVENTS.SYNC_COMPLETE, onComplete);
		return () => {
			ipcRenderer.removeListener(IPC_EVENTS.SYNC_PROGRESS, onProgress);
			ipcRenderer.removeListener(IPC_EVENTS.SYNC_COMPLETE, onComplete);
		};
	}, []);

	const handlePull = useCallback(() => {
		setSyncing(true);
		setResult(null);
		setProgress(null);
		ipcRenderer.send(IPC_EVENTS.PULL_START, site);
	}, [site]);

	const handlePush = useCallback(() => {
		if (!confirmPush) {
			setConfirmPush(true);
			return;
		}
		setConfirmPush(false);
		setSyncing(true);
		setResult(null);
		setProgress(null);
		ipcRenderer.send(IPC_EVENTS.PUSH_START, site);
	}, [site, confirmPush]);

	const cancelPush = useCallback(() => setConfirmPush(false), []);

	const formatDuration = (ms: number) => {
		const seconds = Math.floor(ms / 1000);
		if (seconds < 60) return `${seconds}s`;
		return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
	};

	const buttonStyle: React.CSSProperties = {
		padding: '10px 24px',
		border: 'none',
		borderRadius: 4,
		color: '#fff',
		fontSize: 14,
		fontWeight: 600,
		cursor: syncing ? 'not-allowed' : 'pointer',
		opacity: syncing ? 0.6 : 1,
		minWidth: 140,
	};

	return (
		<div style={{ padding: 20 }}>
			<h3 style={{ margin: '0 0 16px 0', fontSize: 16 }}>Hetzner Sync</h3>

			<div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
				<button
					style={{ ...buttonStyle, background: '#3498db' }}
					onClick={handlePull}
					disabled={syncing}
				>
					Pull (Hetzner → Local)
				</button>

				{confirmPush ? (
					<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
						<span style={{ color: '#e74c3c', fontWeight: 600, fontSize: 13 }}>
							This will overwrite production. Are you sure?
						</span>
						<button
							style={{ ...buttonStyle, background: '#e74c3c', minWidth: 80 }}
							onClick={handlePush}
							disabled={syncing}
						>
							Yes, Push
						</button>
						<button
							style={{ ...buttonStyle, background: '#95a5a6', minWidth: 80 }}
							onClick={cancelPush}
							disabled={syncing}
						>
							Cancel
						</button>
					</div>
				) : (
					<button
						style={{ ...buttonStyle, background: '#e67e22' }}
						onClick={handlePush}
						disabled={syncing}
					>
						Push (Local → Hetzner)
					</button>
				)}
			</div>

			<ProgressBar progress={syncing ? progress : null} />

			{result && (
				<div style={{
					marginTop: 16,
					padding: 12,
					borderRadius: 4,
					background: result.success ? '#d4edda' : '#f8d7da',
					color: result.success ? '#155724' : '#721c24',
					fontSize: 13,
				}}>
					{result.success
						? `Sync completed successfully in ${formatDuration(result.duration || 0)}.`
						: `Sync failed: ${result.error}`
					}
				</div>
			)}
		</div>
	);
};

interface SettingsPanelProps {}

const SettingsPanel: React.FC<SettingsPanelProps> = () => {
	const [config, setConfig] = useState<SyncConfig>(DEFAULT_CONFIG);
	const [saved, setSaved] = useState(false);
	const [testing, setTesting] = useState(false);
	const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

	useEffect(() => {
		ipcRenderer.send(IPC_EVENTS.GET_CONFIG);

		const onConfig = (_e: any, c: SyncConfig) => setConfig(c);
		const onTestResult = (_e: any, r: { success: boolean; message: string }) => {
			setTesting(false);
			setTestResult(r);
		};

		ipcRenderer.on(IPC_EVENTS.CONFIG_DATA, onConfig);
		ipcRenderer.on(IPC_EVENTS.TEST_CONNECTION_RESULT, onTestResult);
		return () => {
			ipcRenderer.removeListener(IPC_EVENTS.CONFIG_DATA, onConfig);
			ipcRenderer.removeListener(IPC_EVENTS.TEST_CONNECTION_RESULT, onTestResult);
		};
	}, []);

	const updateField = <K extends keyof SyncConfig>(field: K, value: SyncConfig[K]) => {
		setConfig(prev => ({ ...prev, [field]: value }));
		setSaved(false);
	};

	const handleSave = () => {
		ipcRenderer.send(IPC_EVENTS.SAVE_CONFIG, config);
		setSaved(true);
		setTimeout(() => setSaved(false), 3000);
	};

	const handleTest = () => {
		setTesting(true);
		setTestResult(null);
		ipcRenderer.send(IPC_EVENTS.TEST_CONNECTION, config);
	};

	const labelStyle: React.CSSProperties = {
		display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 600,
	};
	const inputStyle: React.CSSProperties = {
		width: '100%', padding: '8px 10px', border: '1px solid #ccc',
		borderRadius: 4, fontSize: 13, boxSizing: 'border-box',
	};
	const groupStyle: React.CSSProperties = { marginBottom: 16 };

	return (
		<div style={{ padding: 20, maxWidth: 600 }}>
			<h3 style={{ margin: '0 0 20px 0', fontSize: 16 }}>Hetzner Sync Settings</h3>

			<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
				<div style={groupStyle}>
					<label style={labelStyle}>SSH Host</label>
					<input
						style={inputStyle}
						value={config.sshHost}
						onChange={e => updateField('sshHost', e.target.value)}
					/>
				</div>
				<div style={groupStyle}>
					<label style={labelStyle}>SSH Port</label>
					<input
						style={inputStyle}
						type="number"
						value={config.sshPort}
						onChange={e => updateField('sshPort', parseInt(e.target.value, 10) || 22)}
					/>
				</div>
				<div style={groupStyle}>
					<label style={labelStyle}>SSH User</label>
					<input
						style={inputStyle}
						value={config.sshUser}
						onChange={e => updateField('sshUser', e.target.value)}
					/>
				</div>
				<div style={groupStyle}>
					<label style={labelStyle}>SSH Key Path</label>
					<input
						style={inputStyle}
						value={config.sshKeyPath}
						onChange={e => updateField('sshKeyPath', e.target.value)}
					/>
				</div>
			</div>

			<div style={groupStyle}>
				<label style={labelStyle}>Remote WP Content Path (host volume)</label>
				<input
					style={inputStyle}
					value={config.remoteWpContentPath}
					onChange={e => updateField('remoteWpContentPath', e.target.value)}
				/>
			</div>

			<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
				<div style={groupStyle}>
					<label style={labelStyle}>Remote DB Container</label>
					<input
						style={inputStyle}
						value={config.remoteDbContainer}
						onChange={e => updateField('remoteDbContainer', e.target.value)}
					/>
				</div>
				<div style={groupStyle}>
					<label style={labelStyle}>Remote WP Container</label>
					<input
						style={inputStyle}
						value={config.remoteWpContainer}
						onChange={e => updateField('remoteWpContainer', e.target.value)}
					/>
				</div>
			</div>

			<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
				<div style={groupStyle}>
					<label style={labelStyle}>Remote DB Name</label>
					<input
						style={inputStyle}
						value={config.remoteDbName}
						onChange={e => updateField('remoteDbName', e.target.value)}
					/>
				</div>
				<div style={groupStyle}>
					<label style={labelStyle}>Production Domain</label>
					<input
						style={inputStyle}
						value={config.productionDomain}
						onChange={e => updateField('productionDomain', e.target.value)}
					/>
				</div>
			</div>

			<div style={groupStyle}>
				<label style={labelStyle}>Excluded Paths (comma-separated)</label>
				<input
					style={inputStyle}
					value={config.excludedPaths.join(', ')}
					onChange={e => updateField('excludedPaths', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
				/>
			</div>

			<div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8 }}>
				<button
					style={{
						padding: '10px 24px', border: 'none', borderRadius: 4,
						background: '#51bb7b', color: '#fff', fontSize: 14,
						fontWeight: 600, cursor: 'pointer',
					}}
					onClick={handleSave}
				>
					{saved ? 'Saved!' : 'Save Settings'}
				</button>
				<button
					style={{
						padding: '10px 24px', border: '1px solid #ccc', borderRadius: 4,
						background: '#fff', color: '#333', fontSize: 14,
						fontWeight: 600, cursor: testing ? 'not-allowed' : 'pointer',
						opacity: testing ? 0.6 : 1,
					}}
					onClick={handleTest}
					disabled={testing}
				>
					{testing ? 'Testing...' : 'Test SSH Connection'}
				</button>
			</div>

			{testResult && (
				<div style={{
					marginTop: 12, padding: 12, borderRadius: 4,
					background: testResult.success ? '#d4edda' : '#f8d7da',
					color: testResult.success ? '#155724' : '#721c24',
					fontSize: 13,
				}}>
					{testResult.message}
				</div>
			)}
		</div>
	);
};

export default function (context: any): void {
	const { hooks } = context;

	hooks.addFilter('siteInfoToolsItem', (items: any[]) => {
		const hetznerSyncItems = [
			{
				path: '/hetznerSync',
				menuItem: 'Hetzner Sync',
				render: ({ site }: { site: any }) => (
					<div>
						<SyncPanel site={site} />
						<SettingsPanel />
					</div>
				),
			},
		];

		items.forEach((item: any) => hetznerSyncItems.push(item));
		return hetznerSyncItems;
	});
}
