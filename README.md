# LocalWP Hetzner Sync

A LocalWP addon for syncing WordPress sites between your local development environment and a Hetzner VPS.

## Features

- **Pull** — Download your remote WordPress site (database + wp-content) to LocalWP
- **Push** — Upload your local WordPress site to the remote Hetzner server
- Configurable SSH settings, remote paths, and rsync exclusions

## Installation (macOS)

1. Download `localwp-hetzner-sync.tar.gz` from the [latest release](../../releases/latest)
2. Extract it into LocalWP's addons directory:
   ```bash
   tar -xzf localwp-hetzner-sync.tar.gz -C ~/Library/Application\ Support/Local/addons/
   ```
3. Restart LocalWP
4. If needed, enable the addon in **LocalWP → Preferences → Addons**

## Installation (Linux)

1. Download `localwp-hetzner-sync.tar.gz` from the [latest release](../../releases/latest)
2. Extract it into LocalWP's addons directory:
   ```bash
   tar -xzf localwp-hetzner-sync.tar.gz -C ~/.config/Local/addons/
   ```
3. Restart LocalWP

## Prerequisites

- SSH key-based access to your Hetzner VPS
- `rsync` installed on your local machine
