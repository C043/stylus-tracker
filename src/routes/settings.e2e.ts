import { expect, test, type Page } from '@playwright/test';

// Minutes per side is app-wide, so this file runs in its own Playwright project after every
// other e2e test (see playwright.config.ts) and puts the default back when it's done.
test.afterEach(async ({ page }) => {
	await page.goto('/settings');
	await page.getByLabel('Minutes per side').fill('20');
	await page.getByRole('button', { name: 'Save settings' }).click();
	await expect(page.getByRole('status')).toHaveText('Saved');
});

async function addTurntable(page: Page) {
	const name = `Settings ${Date.now()}`;
	await page.goto('/turntables/new');
	await page.getByRole('radio', { name: 'Technics SL-1500C' }).check();
	await page.getByLabel('Nickname').fill(name);
	await page.getByRole('button', { name: 'Next: stylus' }).click();
	await page.getByRole('button', { name: 'Save stylus' }).click();
	await expect(page).toHaveURL('/');
	return page.getByRole('article', { name });
}

test('changing minutes per side changes the records left', async ({ page }) => {
	const card = await addTurntable(page);
	await expect(card.getByTestId('remaining-records')).toHaveText('450');

	await page
		.getByRole('navigation', { name: 'Main' })
		.getByRole('link', { name: 'Settings' })
		.click();
	await expect(page).toHaveURL('/settings');
	await expect(page.getByLabel('Minutes per side')).toHaveValue('20');
	await expect(page.getByText('A full record counts as 40 minutes of stylus time.')).toBeVisible();

	await page.getByLabel('Minutes per side').fill('25');
	await expect(page.getByText('A full record counts as 50 minutes of stylus time.')).toBeVisible();
	await page.getByRole('button', { name: 'Save settings' }).click();
	await expect(page.getByRole('status')).toHaveText('Saved');

	await page.reload();
	await expect(page.getByLabel('Minutes per side')).toHaveValue('25');

	// 300h of spherical stylus = 720 sides of 25 min = 360 records.
	await page.goto('/');
	await expect(card.getByTestId('remaining-records')).toHaveText('360');
});

test('rejects minutes per side out of range and keeps the saved value', async ({ page }) => {
	await page.goto('/settings');
	const input = page.getByLabel('Minutes per side');
	// Skip the browser's own min/max check to reach the server validation.
	await input.evaluate((el: HTMLInputElement) => el.removeAttribute('max'));
	await input.fill('90');
	await page.getByRole('button', { name: 'Save settings' }).click();

	await expect(page.getByText('Pick between 1 and 60 minutes')).toBeVisible();
	await expect(input).toHaveAttribute('aria-invalid', 'true');
	await page.reload();
	await expect(input).toHaveValue('20');
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('saves minutes per side', async ({ page }) => {
		await page.goto('/settings');
		await page.getByLabel('Minutes per side').fill('22');
		await page.getByRole('button', { name: 'Save settings' }).click();

		await expect(page.getByRole('status')).toHaveText('Saved');
		await expect(page.getByLabel('Minutes per side')).toHaveValue('22');
	});
});
