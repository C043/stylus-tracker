// Renders the PNG app icons from the three.js scene in scripts/icon-scene.js with Playwright's Chromium.
// Usage: npm run icons   (honours CHROMIUM_PATH like the test configs)
import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const types = { '.html': 'text/html', '.js': 'text/javascript' };
const served = ['scripts/', 'node_modules/three/'];

// The scene loads three.js as ES modules, which Chromium won't do from file://, so serve them.
const server = createServer(async (req, res) => {
	const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).slice(1);
	if (!served.some((dir) => path.startsWith(dir))) return res.writeHead(404).end();
	try {
		res.writeHead(200, { 'content-type': types[extname(path)] ?? 'application/octet-stream' });
		res.end(await readFile(join(root, path)));
	} catch {
		res.writeHead(404).end();
	}
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

// Maskable/iOS: square and full-bleed, scene zoomed out into the 80% safe zone.
const icons = [
	{ out: 'static/icons/icon-192.png', size: 192, fullBleed: false },
	{ out: 'static/icons/icon-512.png', size: 512, fullBleed: false },
	{ out: 'static/icons/icon-maskable-512.png', size: 512, fullBleed: true },
	{ out: 'static/icons/apple-touch-icon.png', size: 180, fullBleed: true },
	{ out: 'static/icons/favicon-32.png', size: 32, fullBleed: false }
];

const browser = await chromium.launch({
	executablePath: process.env.CHROMIUM_PATH || undefined,
	args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
});
try {
	const page = await browser.newPage();
	page.on('pageerror', (error) => console.error(error));
	await page.goto(`http://127.0.0.1:${server.address().port}/scripts/icon-scene.html`);
	await page.waitForFunction(() => window.iconSceneReady, null, { timeout: 60_000 });
	for (const { out, size, fullBleed } of icons) {
		const png = await page.evaluate((options) => window.renderIcon(options), { size, fullBleed });
		await writeFile(out, Buffer.from(png, 'base64'));
		console.log(`wrote ${out}`);
	}
} finally {
	await browser.close();
	server.close();
}
