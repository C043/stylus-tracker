import { expect, test } from '@playwright/test';

/** Local `YYYY-MM-DD`, `daysAgo` days before today (browser and test share the machine's TZ). */
function localDate(daysAgo = 0) {
	const d = new Date();
	d.setDate(d.getDate() - daysAgo);
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

test('correct the install date and see the estimate and remaining count follow', async ({
	page
}) => {
	const name = `Fix date ${Date.now()}`;
	await page.goto('/turntables/new');
	await page.getByRole('radio', { name: 'Technics SL-1500C' }).check();
	await page.getByLabel('Nickname').fill(name);
	await page.getByRole('button', { name: 'Next: stylus' }).click();
	await page.getByRole('button', { name: 'Save stylus' }).click();
	await expect(page).toHaveURL('/');

	const card = page.getByRole('article', { name });
	await card.getByRole('button', { name: 'Full record' }).click();
	await expect(card.getByTestId('remaining-records')).toHaveText('449');

	await card.getByRole('link', { name: 'Edit stylus' }).click();
	await expect(page).toHaveURL(/stylus\/edit$/);
	await expect(page.getByLabel('Installed on')).toHaveValue(localDate());
	await expect(page.getByText(/^No records estimated/)).toBeVisible();

	await page.getByLabel('Installed on').fill(localDate(5));
	await expect(page.getByText(/^~5 records estimated since/)).toBeVisible();
	await page.getByRole('button', { name: 'Save stylus' }).click();

	// 450 records, minus 5 backfilled and the one logged play.
	await expect(page).toHaveURL('/');
	await expect(card.getByTestId('remaining-records')).toHaveText('444');
	await expect(card.getByText(/~5 records estimated since/)).toBeVisible();
});

test('change the cartridge of the stylus in use', async ({ page }) => {
	const name = `New pickup ${Date.now()}`;
	await page.goto('/turntables/new');
	await page.getByRole('radio', { name: 'Technics SL-1500C' }).check();
	await page.getByLabel('Nickname').fill(name);
	await page.getByRole('button', { name: 'Next: stylus' }).click();
	await page.getByRole('button', { name: 'Save stylus' }).click();
	await expect(page).toHaveURL('/');

	const card = page.getByRole('article', { name });
	await card.getByRole('button', { name: 'Full record' }).click();
	await expect(card.getByTestId('remaining-records')).toHaveText('449');

	await card.getByRole('link', { name: 'Edit stylus' }).click();
	await expect(page.getByLabel('Cartridge')).toHaveValue('Ortofon 2M Red');
	await page.getByLabel('Cartridge').fill('Ortofon 2M Blue');
	await page.getByRole('button', { name: 'Save stylus' }).click();

	// Same stylus, so the logged play still counts.
	await expect(page).toHaveURL('/');
	await expect(card.getByText(/Ortofon 2M Blue/)).toBeVisible();
	await expect(card.getByTestId('remaining-records')).toHaveText('449');
});
