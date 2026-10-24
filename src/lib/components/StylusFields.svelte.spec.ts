import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import StylusFields from './StylusFields.svelte';

const TODAY = '2026-10-24';
const values = {
	profile: 'elliptical',
	cartridge: 'Ortofon 2M Red',
	customLifespanHours: '',
	installedOn: TODAY
};

describe('StylusFields', () => {
	it('pre-fills the given values', async () => {
		render(StylusFields, { values, today: TODAY });

		await expect.element(page.getByLabelText('Stylus type')).toHaveValue('elliptical');
		await expect.element(page.getByLabelText('Cartridge')).toHaveValue('Ortofon 2M Red');
		await expect.element(page.getByLabelText('Installed on')).toHaveValue(TODAY);
	});

	it("can't pick an install date after today, and sends today along", async () => {
		const { container } = render(StylusFields, { values, today: TODAY });

		await expect.element(page.getByLabelText('Installed on')).toHaveAttribute('max', TODAY);
		expect(container.querySelector<HTMLInputElement>('input[name="today"]')?.value).toBe(TODAY);
	});

	// The page renders with the server's date, then passes the phone's once hydrated.
	const serverRendered = { values: { ...values, installedOn: '2026-10-23' }, today: '2026-10-23' };
	const hydrated = { values, today: TODAY };

	it('follows a new default install date while the user has not picked one', async () => {
		const { rerender } = render(StylusFields, serverRendered);
		await expect.element(page.getByLabelText('Installed on')).toHaveValue('2026-10-23');

		await rerender(hydrated);

		await expect.element(page.getByLabelText('Installed on')).toHaveValue(TODAY);
		await expect.element(page.getByLabelText('Installed on')).toHaveAttribute('max', TODAY);
	});

	it('keeps an install date the user picked when the default changes', async () => {
		const { rerender } = render(StylusFields, serverRendered);
		await page.getByLabelText('Installed on').fill('2026-09-12');

		await rerender(hydrated);

		await expect.element(page.getByLabelText('Installed on')).toHaveValue('2026-09-12');
		await expect.element(page.getByText(/^~42 records estimated/)).toBeInTheDocument();
	});

	it('can allow a later latest install date than today', async () => {
		// Before hydration, the server's today may be a day behind the user's.
		render(StylusFields, { values, today: TODAY, latestInstalledOn: '2026-10-25' });

		await expect.element(page.getByLabelText('Installed on')).toHaveAttribute('max', '2026-10-25');
	});

	it('shows the lifespan field only for a custom stylus', async () => {
		render(StylusFields, { values, today: TODAY });
		await expect.element(page.getByLabelText('Lifespan (hours)')).not.toBeInTheDocument();

		await userEvent.selectOptions(page.getByLabelText('Stylus type').element(), 'custom');

		await expect.element(page.getByLabelText('Lifespan (hours)')).toBeRequired();
	});

	it('estimates records played on a backdated stylus as you pick the date', async () => {
		render(StylusFields, { values, today: TODAY });
		await expect.element(page.getByText(/estimated since/)).not.toBeInTheDocument();

		await page.getByLabelText('Installed on').fill('2026-09-12');

		await expect
			.element(page.getByText('~42 records estimated since 12 Sep (one a day).'))
			.toBeInTheDocument();
	});

	it('uses the singular for one backfilled record', async () => {
		render(StylusFields, { values: { ...values, installedOn: '2026-10-23' }, today: TODAY });

		await expect.element(page.getByText(/^~1 record estimated/)).toBeInTheDocument();
	});

	it('shows no estimate for a date in the future', async () => {
		render(StylusFields, { values: { ...values, installedOn: '2026-10-30' }, today: TODAY });

		await expect.element(page.getByText(/estimated since/)).not.toBeInTheDocument();
	});

	it('shows field errors next to their inputs', async () => {
		render(StylusFields, {
			values: { ...values, profile: 'custom' },
			errors: { installedOn: "Can't be in the future", customLifespanHours: 'Enter hours' },
			today: TODAY
		});

		await expect
			.element(page.getByLabelText('Installed on'))
			.toHaveAccessibleDescription("Can't be in the future");
		await expect
			.element(page.getByLabelText('Lifespan (hours)'))
			.toHaveAccessibleDescription('Enter hours');
		await expect
			.element(page.getByLabelText('Installed on'))
			.toHaveAttribute('aria-invalid', 'true');
	});
});
