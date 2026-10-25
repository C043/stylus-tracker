import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: {
		command: 'npm run build && npm run preview',
		port: 4173,
		// Fresh throwaway DB per run: no .env needed, and never touches the dev database.
		env: { DATABASE_URL: join(tmpdir(), `stylus-tracker-e2e-${process.pid}`, 'e2e.db') }
	},
	testMatch: '**/*.e2e.{ts,js}',
	projects: [
		{ name: 'app', testIgnore: ['**/settings.e2e.ts', '**/delete-turntable.e2e.ts'] },
		// App-wide settings would change the numbers other tests expect, so they run last.
		{ name: 'settings', testMatch: '**/settings.e2e.ts', dependencies: ['app'] },
		// Deleting a turntable moves the cards other tests are looking at.
		{ name: 'delete', testMatch: '**/delete-turntable.e2e.ts', dependencies: ['app'] }
	],
	// See vite.config.ts: optional system Chromium for distros like NixOS.
	use: { launchOptions: { executablePath: process.env.CHROMIUM_PATH || undefined } }
});
