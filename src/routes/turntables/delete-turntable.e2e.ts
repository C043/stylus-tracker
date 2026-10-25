import { expect, test, type Page } from '@playwright/test';

/** Adds a Technics SL-1500C with a stylus installed today and one full record logged. */
async function addTurntable(page: Page) {
	const name = `Edit ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
	await page.goto('/turntables/new');
	await page.getByRole('radio', { name: 'Technics SL-1500C' }).check();
	await page.getByLabel('Nickname').fill(name);
	await page.getByRole('button', { name: 'Next: stylus' }).click();
	await page.getByRole('button', { name: 'Save stylus' }).click();
	await expect(page).toHaveURL('/');
	const card = page.getByRole('article', { name });
	await card.getByRole('button', { name: 'Full record' }).click();
	await expect(card.getByTestId('remaining-records')).toHaveText('449');
	return { name };
}

// Removing a card shifts the shared dashboard under other tests, so this runs after them
// (see playwright.config.ts).
test('delete a turntable after confirming', async ({ page }) => {
	const { name } = await addTurntable(page);

	await page.getByRole('link', { name: 'Turntables', exact: true }).click();
	await page.getByRole('link', { name: `Edit turntable ${name}` }).click();
	await page.getByText('Delete turntable').click();
	await page.getByRole('button', { name: `Delete ${name} for good` }).click();

	await expect(page).toHaveURL('/turntables');
	await expect(page.getByRole('article', { name })).toHaveCount(0);
	await page.goto('/');
	await expect(page.getByRole('article', { name })).toHaveCount(0);
});
