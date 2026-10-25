import { expect, test } from '@playwright/test';

test('bottom nav switches between the main sections', async ({ page }) => {
	await page.goto('/');
	const nav = page.getByRole('navigation', { name: 'Main' });

	await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
	await expect(nav.getByRole('link', { name: 'Dashboard' })).toHaveAttribute(
		'aria-current',
		'page'
	);

	await nav.getByRole('link', { name: 'Turntables' }).click();
	await expect(page).toHaveURL('/turntables');
	await expect(page.getByRole('heading', { level: 1, name: 'Turntables' })).toBeVisible();
	await expect(nav.getByRole('link', { name: 'Turntables' })).toHaveAttribute(
		'aria-current',
		'page'
	);

	await nav.getByRole('link', { name: 'History' }).click();
	await expect(page).toHaveURL('/history');
	await expect(page.getByRole('heading', { level: 1, name: 'History' })).toBeVisible();
	await expect(page).toHaveTitle(/History/);
});

test('page content is not hidden behind the bottom nav', async ({ page }) => {
	await page.setViewportSize({ width: 375, height: 667 });
	await page.goto('/');

	const navBox = await page.getByRole('navigation', { name: 'Main' }).boundingBox();
	const reserved = await page
		.getByRole('main')
		.evaluate((el) => parseFloat(getComputedStyle(el).paddingBottom));

	expect(navBox).not.toBeNull();
	expect(reserved).toBeGreaterThanOrEqual(navBox!.height);
});

for (const path of ['/', '/turntables', '/turntables/new', '/history', '/settings']) {
	test(`${path} has no horizontal scroll at phone width`, async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 667 });
		await page.goto(path);

		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth - document.documentElement.clientWidth
		);
		expect(overflow).toBe(0);
	});
}

// iOS Safari zooms in on any field under 16px when it's tapped, and a home-screen app tends to
// stay zoomed, so the form spills off the screen and taps land on whatever is drawn below.
test('form fields are at least 16px so iOS does not zoom in on tap', async ({ page }) => {
	const fontSizes = () =>
		page
			.locator('main')
			.locator('input:not([type="hidden"]):not([type="radio"]), select, textarea')
			.evaluateAll((fields) =>
				fields.map((f) => `${f.id}: ${parseFloat(getComputedStyle(f).fontSize)}`)
			);
	const tooSmall = (sizes: string[]) => sizes.filter((s) => parseFloat(s.split(': ')[1]) < 16);

	await page.goto('/turntables/new');
	await page.getByRole('radio', { name: /Custom/ }).check();
	expect(tooSmall(await fontSizes())).toEqual([]);

	await page.getByLabel('Brand', { exact: true }).fill('Crosley');
	await page.getByLabel('Model', { exact: true }).fill('Font size');
	await page.getByRole('button', { name: 'Next: stylus' }).click();
	await expect(page.getByLabel('Stylus type')).toBeVisible();
	await page.getByLabel('Stylus type').selectOption('custom');
	await expect(page.getByLabel('Lifespan (hours)')).toBeVisible();
	expect(tooSmall(await fontSizes())).toEqual([]);

	await page.goto('/settings');
	expect(tooSmall(await fontSizes())).toEqual([]);
});
