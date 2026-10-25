import { expect, test, type Page } from '@playwright/test';

/** Adds a Technics SL-1500C with an elliptical stylus installed today: 450 records to go. */
async function addTurntable(page: Page) {
	const name = `Queue ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
	await page.goto('/turntables/new');
	await page.getByRole('radio', { name: 'Technics SL-1500C' }).check();
	await page.getByLabel('Nickname').fill(name);
	await page.getByRole('button', { name: 'Next: stylus' }).click();
	await expect(page).toHaveURL(/stylus\/new$/);
	await page.getByRole('button', { name: 'Save stylus' }).click();
	await expect(page).toHaveURL('/');
	// Load the dashboard through the service worker so it opens offline too. Wait for the JS:
	// a tap before it loads is a plain form post, which skips the queue.
	await page.reload({ waitUntil: 'networkidle' });
	return { name, card: page.getByRole('article', { name }) };
}

/** Waits until no play logged in this browser is still waiting for the server. */
const synced = (page: Page) =>
	expect
		.poll(() =>
			page.evaluate(() => JSON.parse(localStorage.getItem('stylus-tracker.play-queue') ?? '[]'))
		)
		.toEqual([]);

/** Requests to the play action, which the server can't be reached for while routed. */
const playAction = (url: URL) => url.search === '?/play';

test.describe('offline, with the service worker', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
		await page.evaluate(() => navigator.serviceWorker.ready);
	});

	test('plays logged offline count at once, survive a reload, and sync once back online', async ({
		page,
		context
	}) => {
		const { card } = await addTurntable(page);
		const remaining = card.getByTestId('remaining-records');
		const waiting = card.getByRole('status');

		await context.setOffline(true);
		await card.getByRole('button', { name: 'Full record' }).click();
		await card.getByRole('button', { name: 'One side' }).click();
		await expect(remaining).toHaveText('448');
		await expect(card.getByText('+ 1 side')).toBeVisible();
		await expect(waiting).toHaveText(/2 plays saved on this device/);

		await page.reload();
		await expect(remaining).toHaveText('448');
		await expect(waiting).toHaveText(/2 plays saved on this device/);

		await context.setOffline(false);
		await synced(page);
		await expect(waiting).not.toBeVisible();
		await expect(remaining).toHaveText('448');

		// Nothing left on the phone, so this count comes from the server.
		await page.reload();
		await expect(remaining).toHaveText('448');
		await expect(waiting).not.toBeVisible();
	});

	test('undo offline takes back a queued play, but needs the server for a saved one', async ({
		page,
		context
	}) => {
		const { card } = await addTurntable(page);
		const remaining = card.getByTestId('remaining-records');
		const undo = card.getByRole('button', { name: 'Undo last play' });

		await card.getByRole('button', { name: 'Full record' }).click();
		await expect(remaining).toHaveText('449');
		await synced(page);

		await context.setOffline(true);
		await card.getByRole('button', { name: 'One side' }).click();
		await expect(remaining).toHaveText('448');

		await undo.click();
		await expect(remaining).toHaveText('449');
		await expect(card.getByRole('status')).not.toBeVisible();

		await undo.click();
		await expect(card.getByRole('alert')).toHaveText(/Couldn't reach the server/);
		await expect(remaining).toHaveText('449');

		await context.setOffline(false);
		await undo.click();
		await expect(remaining).toHaveText('450');
		await expect(card.getByRole('alert')).not.toBeVisible();
	});
});

// Phone online, home server out of reach. Routing can miss requests from a page a service
// worker controls, so block it here; the tests above cover it.
test.describe('server out of reach', () => {
	test.use({ serviceWorkers: 'block' });

	test('a play queued away from home syncs when the server is reachable again', async ({
		page
	}) => {
		const { card } = await addTurntable(page);
		const remaining = card.getByTestId('remaining-records');
		await page.route(playAction, (route) => route.abort('addressunreachable'));

		await card.getByRole('button', { name: 'Full record' }).click();
		await expect(remaining).toHaveText('449');
		await expect(card.getByRole('status')).toHaveText(/1 play saved on this device/);

		await page.unroute(playAction);
		await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
		await synced(page);
		await expect(card.getByRole('status')).not.toBeVisible();
		await page.reload();
		await expect(remaining).toHaveText('449');
	});

	test('a play queued for a stylus replaced meanwhile is dropped, with a notice', async ({
		page,
		browser
	}) => {
		const { name, card } = await addTurntable(page);
		const remaining = card.getByTestId('remaining-records');
		await page.route(playAction, (route) => route.abort('addressunreachable'));
		await card.getByRole('button', { name: 'Full record' }).click();
		await expect(remaining).toHaveText('449');

		// Another device replaces the stylus while the play waits.
		const other = await browser.newPage();
		await other.goto('/');
		await other
			.getByRole('article', { name })
			.getByRole('link', { name: 'Replace stylus' })
			.click();
		await other.getByRole('button', { name: 'Replace stylus' }).click();
		await expect(other).toHaveURL('/');
		await other.close();

		await page.unroute(playAction);
		await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));

		const notice = page.getByRole('alert').filter({ hasText: "wasn't saved" });
		await expect(notice).toHaveText(/A play logged offline wasn't saved: .*replaced/);
		await expect(remaining).toHaveText('450');
		await expect(card.getByRole('status')).not.toBeVisible();

		await notice.getByRole('button', { name: 'Dismiss' }).click();
		await expect(notice).not.toBeVisible();
	});
});
