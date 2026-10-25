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

test('rename a turntable and keep its stylus and plays', async ({ page }) => {
	const { name } = await addTurntable(page);

	await page.getByRole('link', { name: 'Turntables', exact: true }).click();
	await page.getByRole('link', { name: `Edit turntable ${name}` }).click();
	await expect(page).toHaveURL(/\/turntables\/[^/]+\/edit$/);
	await expect(page.getByLabel('Nickname')).toHaveValue(name);
	await page.getByLabel('Nickname').fill(`${name} renamed`);
	await page.getByRole('button', { name: 'Save name' }).click();

	await expect(page).toHaveURL('/turntables');
	const renamed = page.getByRole('article', { name: `${name} renamed` });
	await expect(renamed.getByTestId('remaining-records')).toHaveText('449');
});
