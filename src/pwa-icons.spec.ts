import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Installability (AGENTS.md §6): 192/512 PNG icons, a maskable one, and an apple-touch-icon.
type ManifestIcon = { src: string; sizes: string; type: string; purpose?: string };

const manifest = JSON.parse(readFileSync('static/manifest.webmanifest', 'utf8')) as {
	name: string;
	short_name: string;
	icons: ManifestIcon[];
};
const appHtml = readFileSync('src/app.html', 'utf8');

const staticPath = (src: string) => join('static', src.replace(/^\//, ''));

function pngSize(path: string) {
	const bytes = readFileSync(path);
	expect(bytes.subarray(0, 8)).toEqual(
		Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
	);
	return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

const pngIcon = (sizes: string, purpose: string) =>
	manifest.icons.find(
		(icon) => icon.type === 'image/png' && icon.sizes === sizes && icon.purpose === purpose
	);

describe('PWA icons', () => {
	it.each([
		['192x192', 'any'],
		['512x512', 'any'],
		['512x512', 'maskable']
	])('manifest has a %s %s PNG icon', (sizes, purpose) => {
		expect(pngIcon(sizes, purpose)).toBeDefined();
	});

	it.each(manifest.icons.map((icon) => [icon.src, icon] as const))(
		'%s exists with the declared size',
		(src, icon) => {
			const path = staticPath(src);
			expect(existsSync(path)).toBe(true);
			if (icon.type !== 'image/png') return;
			const [width, height] = icon.sizes.split('x').map(Number);
			expect(pngSize(path)).toEqual({ width, height });
		}
	);

	it('links a 32px PNG favicon', () => {
		const href = readFileSync('src/routes/+layout.svelte', 'utf8').match(
			/<link rel="icon" type="image\/png" href="(\/[^"]+)"/
		)?.[1];
		expect(href).toBeDefined();
		expect(pngSize(staticPath(href!))).toEqual({ width: 32, height: 32 });
	});

	it('links a 180px apple-touch-icon', () => {
		const href = appHtml.match(
			/<link rel="apple-touch-icon" href="%sveltekit\.assets%(\/[^"]+)"/
		)?.[1];
		expect(href).toBeDefined();
		expect(pngSize(staticPath(href!))).toEqual({ width: 180, height: 180 });
	});
});

// The label under the home-screen icon: Android reads short_name, iOS the apple title meta.
describe('PWA name', () => {
	it('is "Stylus Tracker" in the manifest, short name included', () => {
		expect(manifest.name).toBe('Stylus Tracker');
		expect(manifest.short_name).toBe('Stylus Tracker');
	});

	it('is "Stylus Tracker" on the iOS home screen', () => {
		expect(appHtml).toContain(
			'<meta name="apple-mobile-web-app-title" content="Stylus Tracker" />'
		);
	});
});
