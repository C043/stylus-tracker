import { expect, test } from '@playwright/test';

// Lighthouse dropped its PWA audit and Chrome's CDP installability check no longer flags
// missing icons, so check the install requirements (AGENTS.md §6) directly.
test('the manifest the browser loads is installable', async ({ page, request, context }) => {
	await page.goto('/');
	const href = await page.locator('link[rel="manifest"]').getAttribute('href');
	const manifest = await (await request.get(href!)).json();

	expect(manifest).toMatchObject({ name: expect.any(String), start_url: '/' });
	expect(manifest.display).toBe('standalone');
	const sizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes);
	expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']));
	for (const icon of manifest.icons) {
		const response = await request.get(icon.src);
		expect(response.headers()['content-type'], icon.src).toBe(icon.type);
	}

	await page.evaluate(() => navigator.serviceWorker.ready);
	await page.reload();
	expect(await page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
	expect(context.serviceWorkers()).toHaveLength(1);
});

test('iOS gets a home-screen icon and standalone mode', async ({ page, request }) => {
	await page.goto('/');

	const touchIcon = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
	expect((await request.get(touchIcon!)).headers()['content-type']).toBe('image/png');
	await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute(
		'content',
		'yes'
	);
});
