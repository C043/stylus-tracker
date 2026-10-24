import { expect, test, type Page } from '@playwright/test';

/** Local `YYYY-MM-DD`, `daysAgo` days before today (browser and test share the machine's TZ). */
function localDate(daysAgo = 0) {
	const d = new Date();
	d.setDate(d.getDate() - daysAgo);
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const card = (page: Page, name: string) => page.getByRole('article', { name });

test('add a catalog turntable with a backdated stylus and see records left', async ({ page }) => {
	const name = `Living room ${Date.now()}`;

	await page.goto('/');
	await page.getByRole('link', { name: 'Add a turntable' }).first().click();
	await expect(page).toHaveURL('/turntables/new');

	await page.getByRole('radio', { name: 'Technics SL-1500C' }).check();
	await page.getByLabel('Nickname').fill(name);
	await page.getByRole('button', { name: 'Next: stylus' }).click();

	await expect(page).toHaveURL(/\/turntables\/[^/]+\/stylus\/new$/);
	await expect(page.getByRole('heading', { level: 1 })).toContainText(name);
	// Pre-filled from the catalog model.
	await expect(page.getByLabel('Stylus type')).toHaveValue('elliptical');
	await expect(page.getByLabel('Cartridge')).toHaveValue('Ortofon 2M Red');

	await page.getByLabel('Installed on').fill(localDate(3));
	await expect(page.getByText(/^~3 records estimated since/)).toBeVisible();
	await page.getByRole('button', { name: 'Save stylus' }).click();

	await expect(page).toHaveURL('/');
	const tt = card(page, name);
	// Elliptical: 300 h = 450 records, minus 3 backfilled.
	await expect(tt.getByTestId('remaining-records')).toHaveText('447');
	await expect(tt.getByRole('meter', { name: 'Stylus wear' })).toHaveAttribute(
		'data-status',
		'good'
	);
	await expect(tt.getByText(/~3 records estimated since/)).toBeVisible();
	await expect(tt.getByText('Technics SL-1500C')).toBeVisible();
});

test('add a custom turntable with a custom lifespan', async ({ page }) => {
	const model = `Suitcase ${Date.now()}`;

	await page.goto('/turntables/new');
	await page.getByRole('radio', { name: /Custom/ }).check();
	await page.getByLabel('Brand', { exact: true }).fill('Crosley');
	await page.getByLabel('Model', { exact: true }).fill(model);
	await page.getByRole('button', { name: 'Next: stylus' }).click();

	await expect(page.getByLabel('Stylus type')).toHaveValue('spherical');
	await page.getByLabel('Stylus type').selectOption('custom');
	await page.getByLabel('Lifespan (hours)').fill('40');
	await page.getByRole('button', { name: 'Save stylus' }).click();

	await expect(page).toHaveURL('/');
	// Named after brand and model when no nickname is given. 40 h = 60 records.
	await expect(card(page, `Crosley ${model}`).getByTestId('remaining-records')).toHaveText('60');
});

test('shows a server error when a custom turntable has nothing to name it by', async ({ page }) => {
	await page.goto('/turntables/new');
	await page.getByRole('radio', { name: /Custom/ }).check();
	await page.getByRole('button', { name: 'Next: stylus' }).click();

	await expect(page).toHaveURL('/turntables/new');
	await expect(page.getByText('Give it a name, brand or model')).toBeVisible();
	await expect(page.getByRole('radio', { name: /Custom/ })).toBeChecked();
});

test('the turntables page lists turntables and offers to add a stylus', async ({ page }) => {
	const name = `Den ${Date.now()}`;

	await page.goto('/turntables/new');
	await page.getByRole('radio', { name: 'Rega Planar 1' }).check();
	await page.getByLabel('Nickname').fill(name);
	await page.getByRole('button', { name: 'Next: stylus' }).click();
	await expect(page).toHaveURL(/stylus\/new$/);

	await page.goto('/turntables');
	const tt = card(page, name);
	await expect(tt.getByText('Rega Planar 1')).toBeVisible();
	await tt.getByRole('link', { name: 'Add stylus' }).click();
	await expect(page.getByLabel('Cartridge')).toHaveValue('Rega Carbon');
});

test.describe('with the phone on a different date than the server', () => {
	// UTC+14 and UTC-12 are 26 h apart, so one of them is always on another date than the server.
	const dateIn = (timeZone: string) =>
		new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());
	const timezoneId = ['Pacific/Kiritimati', 'Etc/GMT+12'].find((tz) => dateIn(tz) !== localDate());
	test.use({ timezoneId });

	test("defaults the install date to the phone's today and saves it as is", async ({ page }) => {
		const name = `Abroad ${Date.now()}`;

		await page.goto('/turntables/new');
		await page.getByRole('radio', { name: 'Rega Planar 1' }).check();
		await page.getByLabel('Nickname').fill(name);
		await page.getByRole('button', { name: 'Next: stylus' }).click();

		await expect(page.getByLabel('Installed on')).toHaveValue(dateIn(timezoneId!));
		await page.getByRole('button', { name: 'Save stylus' }).click();

		await expect(page).toHaveURL('/');
		await expect(card(page, name).getByText(/estimated since/)).not.toBeVisible();
	});
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test("accepts tomorrow by the server's clock as the user's today", async ({ page }) => {
		const name = `No JS ${Date.now()}`;

		await page.goto('/turntables/new');
		await page.getByRole('radio', { name: 'Rega Planar 1' }).check();
		await page.getByLabel('Nickname').fill(name);
		await page.getByRole('button', { name: 'Next: stylus' }).click();

		// The page can't know the phone's date, so it allows one day past the server's.
		const installed = page.getByLabel('Installed on');
		await expect(installed).toHaveAttribute('max', localDate(-1));
		await installed.fill(localDate(-1));
		await page.getByRole('button', { name: 'Save stylus' }).click();

		await expect(page).toHaveURL('/');
		await expect(card(page, name).getByTestId('remaining-records')).toBeVisible();
	});
});
