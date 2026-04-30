# LocalWP Hetzner Sync Addon

## Project Overview
A LocalWP (Local by Flywheel) addon that enables on-demand Pull/Push synchronization of WordPress sites between a remote Hetzner VPS (Docker-based WordPress) and LocalWP local development environment.

## Architecture

### Target Server (Hetzner)
- **IP:** 178.105.29.243
- **SSH:** Key-based auth, user `root`
- **WordPress:** Docker container `ms-wordpress`
- **MariaDB:** Docker container `ms-mariadb`
- **DB name:** `morskysvet`
- **DB root password:** Read from `/opt/morskysvet-stack/.env` → `MYSQL_ROOT_PASSWORD`
- **WP path (inside container):** `/var/www/html`
- **WP path (host volume):** `/var/lib/docker/volumes/morskysvet-stack_wordpress_data/_data`
- **wp-content path (host):** `/var/lib/docker/volumes/morskysvet-stack_wordpress_data/_data/wp-content`
- **Production URL:** `https://morskysvet.xyz`
- **WP-CLI:** Installed inside container at `/usr/local/bin/wp`
- **WP-CLI usage:** `docker exec ms-wordpress wp --path=/var/www/html --allow-root <cmd>`

### LocalWP Environment
- **Local URL pattern:** `http://sitename.local` (HTTP, not HTTPS)
- **Local site path:** Defined by LocalWP (usually `~/Local Sites/sitename/`)
- **DB access:** Via LocalWP's MySQL (usually `root` / `root`, port varies)
- **WP-CLI:** Available via LocalWP's "Open Site Shell" feature

### SSH Config
The addon should store SSH connection settings:
- Host (default: `178.105.29.243`)
- Port (default: `22`)
- User (default: `root`)
- SSH key path (default: `~/.ssh/id_ed25519`)

## Features

### 1. Pull (Hetzner → LocalWP)
Downloads the remote site to local development:
1. SSH: Create DB dump on Hetzner: `docker exec ms-mariadb mariadb-dump -u root -p"$DB_PASS" --single-transaction --routines --triggers morskysvet | gzip > /tmp/morskysvet-pull.sql.gz`
2. SCP/rsync: Download the gzipped SQL dump to local temp dir
3. rsync: Sync `wp-content/` from Hetzner host path to LocalWP's `wp-content/` (exclude `cache/`, `object-cache.php`, `advanced-cache.php`)
4. Local: Import DB: `wp db import /tmp/morskysvet-pull.sql` (via LocalWP's WP-CLI)
5. Local: Search-replace domain: `wp search-replace 'morskysvet.xyz' 'sitename.local' --all-tables`
6. Local: Search-replace protocol: `wp search-replace 'https://sitename.local' 'http://sitename.local' --all-tables`
7. Local: Flush cache: `wp cache flush`

### 2. Push (LocalWP → Hetzner)
Uploads the local site to production:
1. Local: Export DB: `wp db export /tmp/morskysvet-push.sql`
2. rsync: Upload `wp-content/` from LocalWP to Hetzner (exclude `cache/`, `object-cache.php`, `advanced-cache.php`)
3. SCP: Upload SQL dump to Hetzner `/tmp/`
4. SSH: Import DB: `docker exec -i ms-mariadb mariadb -u root -p"$DB_PASS" morskysvet < /tmp/morskysvet-push.sql`
5. SSH: Search-replace domain: `docker exec ms-wordpress wp --path=/var/www/html --allow-root search-replace 'sitename.local' 'morskysvet.xyz' --all-tables`
6. SSH: Flush cache: `docker exec ms-wordpress wp --path=/var/www/html --allow-root cache flush`
7. SSH: Restart containers: `docker restart ms-wordpress ms-nginx`

### 3. Settings Panel
Add-on settings accessible from LocalWP UI:
- SSH Host, Port, User, Key path
- Remote WP path (host volume path)
- Remote DB container name
- Remote WP container name
- Production domain
- Excluded paths (for rsync --exclude)
- Connection test button ("Test SSH Connection")

## Tech Stack
- **Language:** TypeScript
- **UI:** React (using `@getflywheel/local-components`)
- **Platform:** Electron (LocalWP is an Electron app)
- **Addon API:** `@getflywheel/local` (types), `@getflywheel/local-components` (UI)
- **File transfer:** rsync via child_process (shell out to local rsync binary)
- **SSH:** ssh2 node module OR shell out to local ssh/scp
- **DB operations:** Shell out to local mysql/mysqldump or use WP-CLI

## Project Structure
```
localwp-hetzner-sync/
├── CLAUDE.md                    # This file
├── package.json                 # Node dependencies
├── tsconfig.json                # TypeScript config
├── webpack.config.js            # Webpack config (LocalWP addon bundling)
├── src/
│   ├── index.ts                 # Addon entry point (register hooks)
│   ├── renderer.tsx             # React UI (settings panel, sync buttons)
│   ├── main.ts                  # Main process (SSH, rsync, DB operations)
│   ├── types.ts                 # TypeScript interfaces
│   └── utils/
│       ├── ssh.ts               # SSH connection utilities
│       ├── rsync.ts             # rsync wrapper
│       ├── database.ts          # DB dump/import/search-replace
│       └── config.ts            # Settings management
├── lib/                         # Compiled output (auto-generated)
└── package.json
```

## LocalWP Addon API Reference

### Hooks to use
- `SiteInfoOverview` — Add sync status display to site overview
- `SiteInfoUtilities` — Add Pull/Push buttons to site utilities section
- `SiteInfo_TabNav_Items` — Add a "Sync" tab to site info
- `routes[site-info]` — Add a route for the sync settings page

### Content Hook Pattern
```typescript
import * as Local from '@getflywheel/local';

// Add UI to site info
hooks.addContent('SiteInfoUtilities', (site: Local.Site) => {
    return <SyncPanel key="hetzner-sync" site={site} />;
});
```

### Addon Entry Point Pattern
```typescript
// src/index.ts
import * as Local from '@getflywheel/local';

export default function (context: Local.AddonContext) {
    const { hooks } = context;
    
    hooks.addContent('SiteInfoUtilities', (site) => {
        return <SyncPanel key="hetzner-sync" site={site} />;
    });
}
```

## Build & Install

### Development Setup
```bash
# Clone into LocalWP addons directory
# macOS: ~/Library/Application Support/Local/addons
# Linux: ~/.config/Local/addons
cd ~/Library/Application\ Support/Local/addons
git clone <this-repo> localwp-hetzner-sync

# Install dependencies
cd localwp-hetzner-sync
yarn install

# Build
yarn build

# Enable in LocalWP (or edit enabled-addons.json)
```

### Scripts
```json
{
  "scripts": {
    "build": "webpack --config webpack.config.js",
    "watch": "webpack --config webpack.config.js --watch",
    "lint": "eslint src/"
  }
}
```

## Important Notes

1. **rsync must be available** on the host system (macOS has it, Linux usually too)
2. **SSH key must be set up** for passwordless access to Hetzner
3. **LocalWP's WP-CLI** is accessed via the site's shell environment, not system wp-cli
4. **Search-replace order matters** — always replace domain BEFORE protocol
5. **Exclude cache files** during rsync to avoid conflicts
6. **Push is destructive** — always confirm before pushing to production
7. **DB password** is read from remote `.env` file, never stored locally
8. **Progress reporting** should use IPC between main process and renderer

## Testing
- Test SSH connection first before any sync operation
- Verify rsync exclusions work correctly
- Test search-replace with --dry-run flag first
- Test with a staging environment before production
