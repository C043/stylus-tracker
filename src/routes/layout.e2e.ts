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
