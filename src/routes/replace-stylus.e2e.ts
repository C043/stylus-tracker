import { expect, test, type Page } from '@playwright/test';

/** Adds a Technics SL-1500C with an elliptical Ortofon 2M Red installed today. */
async function addTurntable(page: Page) {
	const name = `Swap ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
	await page.goto('/turntables/new');
	await page.getByRole('radio', { name: 'Technics SL-1500C' }).check();
	await page.getByLabel('Nickname').fill(name);
	await page.getByRole('button', { name: 'Next: stylus' }).click();
	await expect(page).toHaveURL(/stylus\/new$/);
	await page.getByRole('button', { name: 'Save stylus' }).click();
	await expect(page).toHaveURL('/');
	return { name, card: page.getByRole('article', { name }) };
}

test('replace a stylus, start again from full life, and find the old one in history', async ({
	page
}) => {
	const { name, card } = await addTurntable(page);
	await card.getByRole('button', { name: 'Full record' }).click();
	await card.getByRole('button', { name: 'One side' }).click();
	await expect(card.getByTestId('remaining-records')).toHaveText('448');

	await card.getByRole('link', { name: 'Replace stylus' }).click();
	await expect(page).toHaveURL(/stylus\/replace$/);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText(name);
	// Pre-filled from the stylus being replaced.
	await expect(page.getByLabel('Stylus type')).toHaveValue('elliptical');
	await expect(page.getByLabel('Cartridge')).toHaveValue('Ortofon 2M Red');

	await page.getByLabel('Stylus type').selectOption('shibata');
	await page.getByLabel('Cartridge').fill('Ortofon 2M Bronze');
	await page.getByRole('button', { name: 'Replace stylus' }).click();

	// Shibata: 500 h = 750 records, and no plays carried over.
	await expect(page).toHaveURL('/');
	await expect(card.getByTestId('remaining-records')).toHaveText('750');
	await expect(card.getByText(/Ortofon 2M Bronze/)).toBeVisible();
	await expect(card.getByRole('button', { name: 'Undo last play' })).not.toBeVisible();

	await page.getByRole('navigation').getByRole('link', { name: 'History' }).click();
	const retired = page.getByRole('listitem').filter({ hasText: name });
	await expect(retired).toHaveCount(1);
	await expect(retired.getByText('Ortofon 2M Red')).toBeVisible();
	await expect(retired.getByText('3 sides played')).toBeVisible();
});

test('a stale replace form does not retire the new stylus', async ({ page, context }) => {
	const { card } = await addTurntable(page);
	await card.getByRole('link', { name: 'Replace stylus' }).click();
	await expect(page).toHaveURL(/stylus\/replace$/);

	// The stylus gets replaced from another tab first.
	const other = await context.newPage();
	await other.goto(page.url());
	await other.getByRole('button', { name: 'Replace stylus' }).click();
	await expect(other).toHaveURL('/');

	await page.getByRole('button', { name: 'Replace stylus' }).click();
	await expect(page.getByRole('alert')).toHaveText(/already been replaced/);
});
