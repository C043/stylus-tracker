import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import { computeWear } from '../domain/wear';
import WearGauge from './WearGauge.svelte';

// Sapphire: 40h = 120 sides = 60 records.
const wearAfter = (backfilledRecords: number, sides = 0) =>
	computeWear({
		profile: 'sapphire',
		backfilledRecords,
		plays: Array.from({ length: sides }, () => ({ kind: 'side' as const }))
	});

describe('WearGauge', () => {
	it('shows the remaining records big, with a text equivalent on the meter', async () => {
		render(WearGauge, { wear: wearAfter(15) });

		await expect.element(page.getByTestId('remaining-records')).toHaveTextContent('45');
		await expect.element(page.getByText('records left')).toBeInTheDocument();

		const meter = page.getByRole('meter', { name: 'Stylus wear' });
		await expect.element(meter).toHaveAttribute('aria-valuenow', '25');
		await expect.element(meter).toHaveAttribute('aria-valuemin', '0');
		await expect.element(meter).toHaveAttribute('aria-valuemax', '100');
		await expect
			.element(meter)
			.toHaveAttribute('aria-valuetext', '25% worn, 45 records left. Good.');
	});

	it('shows "+ 1 side" for an odd number of sides left', async () => {
		render(WearGauge, { wear: wearAfter(15, 1) });

		await expect.element(page.getByTestId('remaining-records')).toHaveTextContent('44');
		await expect.element(page.getByText('+ 1 side')).toBeInTheDocument();
		await expect
			.element(page.getByRole('meter'))
			.toHaveAttribute('aria-valuetext', expect.stringContaining('44 records and 1 side left'));
	});

	it('uses the singular for one record left', async () => {
		render(WearGauge, { wear: wearAfter(59) });

		await expect.element(page.getByText('record left', { exact: true })).toBeInTheDocument();
	});

	it('asks to order a replacement from 75% wear', async () => {
		render(WearGauge, { wear: wearAfter(45) });

		await expect.element(page.getByText('Order a replacement')).toBeInTheDocument();
		await expect.element(page.getByRole('meter')).toHaveAttribute('data-status', 'soon');
	});

	it('says to replace now at the limit, and never goes below zero', async () => {
		render(WearGauge, { wear: wearAfter(80) });

		await expect.element(page.getByTestId('remaining-records')).toHaveTextContent('0');
		await expect.element(page.getByRole('meter')).toHaveAttribute('aria-valuenow', '100');
		await expect
			.element(page.getByText("Replace now, you're damaging records"))
			.toBeInTheDocument();
	});

	it('rounds the meter value', async () => {
		render(WearGauge, { wear: wearAfter(0, 1) });

		await expect.element(page.getByRole('meter')).toHaveAttribute('aria-valuenow', '1');
	});
});
