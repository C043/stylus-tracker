import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import { computeWear } from '../domain/wear';
import TurntableCard from './TurntableCard.svelte';

const turntable = {
	id: 't1',
	name: 'Living room',
	catalogId: 'technics/sl-1500c',
	brand: null,
	model: null
};
const stylus = {
	id: 's1',
	profile: 'elliptical',
	cartridge: 'Ortofon 2M Red',
	installedOn: '2026-12-30',
	createdOn: '2026-12-30',
	backfilledRecords: 0
};
const wear = computeWear({
	profile: 'elliptical',
	backfilledRecords: 0,
	plays: []
});

const installed = () => page.getByRole('definition').nth(1);

describe('TurntableCard', () => {
	it('shows the install date without the year in the same year', async () => {
		render(TurntableCard, { turntable, stylus, wear, today: '2026-12-31' });

		await expect.element(installed()).toHaveTextContent(/^30 Dec$/);
	});

	it('adds the year once today is in a later year than the install date', async () => {
		render(TurntableCard, { turntable, stylus, wear, today: '2027-01-02' });

		await expect.element(installed()).toHaveTextContent('30 Dec 2026');
	});

	it('keeps the backfill note relative to the day the stylus was added', async () => {
		render(TurntableCard, {
			turntable,
			stylus: { ...stylus, installedOn: '2026-12-20', backfilledRecords: 10 },
			wear,
			today: '2027-01-02'
		});

		await expect.element(page.getByText(/estimated since 20 Dec$/)).toBeInTheDocument();
	});
});
