// Captures the README screenshots in docs/screenshots/ from a production build seeded with demo data.
// Usage: npm run screenshots   (honours CHROMIUM_PATH like the test configs)
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';

const port = 4179;
const base = `http://127.0.0.1:${port}`;
const outDir = 'docs/screenshots';
const dbDir = mkdtempSync(join(tmpdir(), 'stylus-tracker-shots-'));

/** Local `YYYY-MM-DD`, `daysAgo` days before today. */
function localDate(daysAgo = 0) {
	const d = new Date();
	d.setDate(d.getDate() - daysAgo);
	const pad = (n) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function waitForServer() {
	for (let i = 0; i < 100; i++) {
		try {
			if ((await fetch(base)).ok) return;
		} catch {
			// not up yet
		}
		await new Promise((r) => setTimeout(r, 200));
	}
	throw new Error(`server did not start on ${base}`);
}

// Fresh throwaway DB: no .env needed, and never touches the dev database.
const env = { ...process.env, DATABASE_URL: join(dbDir, 'shots.db') };
execSync('npm run build', { stdio: 'inherit', env });
const server = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'], {
	env,
	stdio: 'inherit'
});

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
try {
	await waitForServer();
	mkdirSync(outDir, { recursive: true });
	const page = await browser.newPage({
		baseURL: base,
		viewport: { width: 390, height: 844 },
		deviceScaleFactor: 2,
		isMobile: true,
		hasTouch: true,
		colorScheme: 'dark',
		reducedMotion: 'reduce'
	});
	const shot = async (name, fullPage = false) => {
		await page.waitForLoadState('networkidle');
		await page.screenshot({ path: `${outDir}/${name}.png`, fullPage });
		console.log(`wrote ${outDir}/${name}.png`);
	};

	/** Adds a catalog turntable with its suggested stylus, installed `daysAgo` days ago. */
	async function addTurntable({ model, name, daysAgo, profile, cartridge }) {
		await page.goto('/turntables/new');
		await page.getByRole('radio', { name: model }).check();
		await page.getByLabel('Nickname').fill(name);
		await page.getByRole('button', { name: 'Next: stylus' }).click();
		await page.waitForURL(/stylus\/new$/);
		if (profile) await page.getByLabel('Stylus type').selectOption(profile);
		if (cartridge) await page.getByLabel('Cartridge').fill(cartridge);
		await page.getByLabel('Installed on').fill(localDate(daysAgo));
		await page.getByRole('button', { name: 'Save stylus' }).click();
		await page.waitForURL(`${base}/`);
		return page.getByRole('article', { name });
	}

	// Cards show in the order added: the one with plays first, then one wearing out, then one
	// whose old stylus was replaced, so history has an entry.
	const living = await addTurntable({
		model: 'Technics SL-1500C',
		name: 'Living room',
		daysAgo: 96
	});
	await living.getByRole('button', { name: 'Full record' }).click();
	await living.getByRole('button', { name: 'One side' }).click();
	await page.waitForLoadState('networkidle');

	const kids = await addTurntable({ model: 'Crosley Cruiser', name: 'Kids room', daysAgo: 54 });

	const den = await addTurntable({ model: 'Rega Planar 1', name: 'Den', daysAgo: 420 });
	await den.getByRole('link', { name: 'Replace stylus' }).click();
	await page.waitForURL(/stylus\/replace$/);
	await page.getByRole('button', { name: 'Replace stylus' }).click();
	await page.waitForURL(`${base}/`);

	await page.reload();
	await page.evaluate(() => window.scrollTo(0, 0));
	await shot('dashboard');
	await kids.scrollIntoViewIfNeeded();
	await kids.evaluate((el) =>
		window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 16)
	);
	await shot('dashboard-replace-soon');

	await page.goto('/turntables/new');
	await page.getByRole('radio', { name: 'Technics SL-1500C' }).check();
	await page.getByLabel('Nickname').fill('Studio');
	await shot('add-turntable');

	await page.getByRole('button', { name: 'Next: stylus' }).click();
	await page.waitForURL(/stylus\/new$/);
	await page.getByLabel('Installed on').fill(localDate(42));
	await page.getByText(/records estimated since/).waitFor();
	await shot('add-stylus');

	await page.goto('/history');
	await shot('history');

	await page.goto('/settings');
	await shot('settings');
} finally {
	await browser.close();
	server.kill();
	rmSync(dbDir, { recursive: true, force: true });
}
