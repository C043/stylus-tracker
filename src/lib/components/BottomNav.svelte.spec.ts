import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import BottomNav from './BottomNav.svelte';

describe('BottomNav', () => {
	it('renders a labelled nav with the four tabs', async () => {
		render(BottomNav, { pathname: '/' });

		const nav = page.getByRole('navigation', { name: 'Main' });
		await expect.element(nav).toBeInTheDocument();
		await expect.element(nav.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/');
		await expect
			.element(nav.getByRole('link', { name: 'Turntables' }))
			.toHaveAttribute('href', '/turntables');
		await expect
			.element(nav.getByRole('link', { name: 'History' }))
			.toHaveAttribute('href', '/history');
		await expect
			.element(nav.getByRole('link', { name: 'Settings' }))
			.toHaveAttribute('href', '/settings');
	});

	it('marks Settings as current on /settings', async () => {
		render(BottomNav, { pathname: '/settings' });

		await expect
			.element(page.getByRole('link', { name: 'Settings' }))
			.toHaveAttribute('aria-current', 'page');
	});

	it('marks only the dashboard as current on /', async () => {
		render(BottomNav, { pathname: '/' });

		await expect
			.element(page.getByRole('link', { name: 'Dashboard' }))
			.toHaveAttribute('aria-current', 'page');
		await expect
			.element(page.getByRole('link', { name: 'Turntables' }))
			.not.toHaveAttribute('aria-current');
		await expect
			.element(page.getByRole('link', { name: 'History' }))
			.not.toHaveAttribute('aria-current');
	});

	it('marks a tab as current on its nested routes, not the dashboard', async () => {
		render(BottomNav, { pathname: '/turntables/abc/stylus' });

		await expect
			.element(page.getByRole('link', { name: 'Turntables' }))
			.toHaveAttribute('aria-current', 'page');
		await expect
			.element(page.getByRole('link', { name: 'Dashboard' }))
			.not.toHaveAttribute('aria-current');
	});

	it('does not treat a shared prefix as the same section', async () => {
		render(BottomNav, { pathname: '/historyx' });

		await expect
			.element(page.getByRole('link', { name: 'History' }))
			.not.toHaveAttribute('aria-current');
	});

	it('gives every tab at least a 44px tap target', async () => {
		render(BottomNav, { pathname: '/' });

		for (const name of ['Dashboard', 'Turntables', 'History', 'Settings']) {
			const rect = page.getByRole('link', { name }).element().getBoundingClientRect();
			expect(rect.height).toBeGreaterThanOrEqual(44);
			expect(rect.width).toBeGreaterThanOrEqual(44);
		}
	});
});
