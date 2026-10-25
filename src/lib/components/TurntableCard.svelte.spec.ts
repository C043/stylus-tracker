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

	it.each(['gauge', 'compact'] as const)('links to replacing the stylus (%s)', async (variant) => {
		render(TurntableCard, { turntable, stylus, wear, today: '2026-12-31', variant });

		await expect
			.element(page.getByRole('link', { name: 'Replace stylus' }))
			.toHaveAttribute('href', '/turntables/t1/stylus/replace');
	});

	it('offers no replacement before a stylus is added', async () => {
		render(TurntableCard, { turntable, stylus: null, wear: null, today: '2026-12-31' });

		await expect
			.element(page.getByRole('link', { name: 'Replace stylus' }))
			.not.toBeInTheDocument();
	});

	describe('with plays waiting to sync', () => {
		const pending = [{ kind: 'full' }, { kind: 'side' }] as const;

		it.each(['gauge', 'compact'] as const)('counts them already (%s)', async (variant) => {
			render(TurntableCard, { turntable, stylus, wear, pending, today: '2026-12-31', variant });

			await expect.element(page.getByTestId('remaining-records')).toHaveTextContent('448');
		});

		it('says they are saved on the phone when the server could not be reached', async () => {
			render(TurntableCard, {
				turntable,
				stylus,
				wear,
				pending,
				unreachable: true,
				today: '2026-12-31'
			});

			await expect
				.element(page.getByRole('status'))
				.toHaveTextContent(/2 plays saved on this device, waiting for the server/);
		});

		it('says "play" for one', async () => {
			render(TurntableCard, {
				turntable,
				stylus,
				wear,
				pending: [{ kind: 'side' }],
				unreachable: true,
				today: '2026-12-31'
			});

			await expect.element(page.getByRole('status')).toHaveTextContent(/^1 play saved/);
		});

		it('offers to undo them even before anything reached the server', async () => {
			render(TurntableCard, {
				turntable,
				stylus,
				wear,
				pending,
				lastPlay: null,
				today: '2026-12-31'
			});

			await expect.element(page.getByRole('button', { name: 'Undo last play' })).toBeVisible();
		});

		it('shows no note while they are simply being sent, so the page does not jump', async () => {
			render(TurntableCard, { turntable, stylus, wear, pending, today: '2026-12-31' });

			await expect.element(page.getByRole('status')).not.toBeInTheDocument();
		});

		it('shows no note when nothing is waiting', async () => {
			render(TurntableCard, {
				turntable,
				stylus,
				wear,
				pending: [],
				unreachable: true,
				today: '2026-12-31'
			});

			await expect.element(page.getByRole('status')).not.toBeInTheDocument();
		});
	});

	it('links to correcting the install date', async () => {
		render(TurntableCard, { turntable, stylus, wear, today: '2026-12-31' });

		await expect
			.element(page.getByRole('link', { name: 'Edit install date' }))
			.toHaveAttribute('href', '/turntables/t1/stylus/edit');
	});
});
