import { expect, test, type Page } from '@playwright/test';

/** Adds a Technics SL-1500C with an elliptical stylus installed today: 450 records to go. */
async function addTurntable(page: Page) {
	const name = `Play ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
	await page.goto('/turntables/new');
	await page.getByRole('radio', { name: 'Technics SL-1500C' }).check();
	await page.getByLabel('Nickname').fill(name);
	await page.getByRole('button', { name: 'Next: stylus' }).click();
	await expect(page).toHaveURL(/stylus\/new$/);
	await page.getByRole('button', { name: 'Save stylus' }).click();
	await expect(page).toHaveURL('/');
	return page.getByRole('article', { name });
}

test('log full and half plays, see the count drop, and undo them', async ({ page }) => {
	const tt = await addTurntable(page);
	const remaining = tt.getByTestId('remaining-records');
	const undo = tt.getByRole('button', { name: 'Undo last play' });

	await expect(remaining).toHaveText('450');
	await expect(undo).not.toBeVisible();

	await tt.getByRole('button', { name: 'Full record' }).click();
	await expect(remaining).toHaveText('449');

	await tt.getByRole('button', { name: 'One side' }).click();
	await expect(remaining).toHaveText('448');
	await expect(tt.getByText('+ 1 side')).toBeVisible();

	await undo.click();
	await expect(remaining).toHaveText('449');
	await expect(tt.getByText('+ 1 side')).not.toBeVisible();

	await undo.click();
	await expect(remaining).toHaveText('450');
	await expect(undo).not.toBeVisible();

	// The plays were saved, not just shown.
	await page.reload();
	await expect(remaining).toHaveText('450');
});

test('logging a play keeps the page where it was', async ({ page }) => {
	await addTurntable(page);
	const tt = await addTurntable(page);
	await tt.getByRole('button', { name: 'Full record' }).scrollIntoViewIfNeeded();
	const before = await page.evaluate(() => window.scrollY);
	expect(before).toBeGreaterThan(0);

	await tt.getByRole('button', { name: 'Full record' }).click();
	await expect(tt.getByTestId('remaining-records')).toHaveText('449');

	expect(await page.evaluate(() => window.scrollY)).toBe(before);
});

test('shows why an undo from a stale tab did nothing', async ({ page, context }) => {
	const tt = await addTurntable(page);
	await tt.getByRole('button', { name: 'Full record' }).click();
	await expect(tt.getByTestId('remaining-records')).toHaveText('449');

	// Another tab takes the play back first.
	const other = await context.newPage();
	await other.goto('/');
	const otherCard = other.getByRole('article', { name: await tt.getByRole('heading').innerText() });
	await otherCard.getByRole('button', { name: 'Undo last play' }).click();
	await expect(otherCard.getByTestId('remaining-records')).toHaveText('450');

	await tt.getByRole('button', { name: 'Undo last play' }).click();
	await expect(tt.getByRole('alert')).toHaveText(/Nothing to undo/);

	// The next successful play clears it.
	await tt.getByRole('button', { name: 'One side' }).click();
	await expect(tt.getByTestId('remaining-records')).toHaveText('449');
	await expect(tt.getByRole('alert')).not.toBeVisible();
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('logs a play and lands back on the dashboard', async ({ page }) => {
		const tt = await addTurntable(page);

		await tt.getByRole('button', { name: 'One side' }).click();

		// Redirected, so a refresh can't post the play again.
		await expect(page).toHaveURL('/');
		await expect(tt.getByTestId('remaining-records')).toHaveText('449');
		await expect(tt.getByText('+ 1 side')).toBeVisible();

		await tt.getByRole('button', { name: 'Undo last play' }).click();
		await expect(page).toHaveURL('/');
		await expect(tt.getByTestId('remaining-records')).toHaveText('450');
	});
});
