import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
	await page.goto('/');
	await page.evaluate(() => navigator.serviceWorker.ready);
});

test('a page visited before still opens offline', async ({ page, context }) => {
	await page.goto('/history');
	await expect(page.getByRole('heading', { level: 1, name: 'History' })).toBeVisible();

	await context.setOffline(true);
	await page.reload();

	await expect(page.getByRole('heading', { level: 1, name: 'History' })).toBeVisible();
});

test('a page never visited shows the offline page', async ({ page, context }) => {
	await context.setOffline(true);
	await page.goto('/turntables/new');

	await expect(page.getByRole('heading', { level: 1, name: "You're offline" })).toBeVisible();
	await expect(page).toHaveURL('/turntables/new');

	await context.setOffline(false);
	await page.getByRole('button', { name: 'Try again' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Add a turntable' })).toBeVisible();
});
