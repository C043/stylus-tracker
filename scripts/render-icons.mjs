// Renders the PNG app icons from static/icons/icon.svg with Playwright's Chromium.
// Usage: npm run icons   (honours CHROMIUM_PATH like the test configs)
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const svg = readFileSync('static/icons/icon.svg', 'utf8');

// Maskable/iOS: square full-bleed plinth, artwork shrunk into the 80% safe zone.
const fullBleed = svg
	.replace('rx="112"', 'rx="0"')
	.replace(
		'<g id="art">',
		'<g id="art" transform="translate(256 256) scale(0.78) translate(-256 -256)">'
	);

const icons = [
	{ out: 'static/icons/icon-192.png', size: 192, source: svg },
	{ out: 'static/icons/icon-512.png', size: 512, source: svg },
	{ out: 'static/icons/icon-maskable-512.png', size: 512, source: fullBleed },
	{ out: 'static/icons/apple-touch-icon.png', size: 180, source: fullBleed }
];

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage();
for (const { out, size, source } of icons) {
	await page.setViewportSize({ width: size, height: size });
	const src = `data:image/svg+xml;base64,${Buffer.from(source).toString('base64')}`;
	await page.setContent(
		`<body style="margin:0"><img src="${src}" width="${size}" height="${size}" style="display:block"></body>`
	);
	await page.locator('img').evaluate((img) => img.decode());
	await page.screenshot({ path: out, omitBackground: true });
	console.log(`wrote ${out}`);
}
await browser.close();
