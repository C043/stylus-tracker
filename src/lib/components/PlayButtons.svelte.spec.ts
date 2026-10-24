import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import PlayButtons from './PlayButtons.svelte';

// Swallow submits so clicking a key doesn't post or navigate the test page.
const block = (e: Event) => {
	e.preventDefault();
	e.stopImmediatePropagation();
};
let vibrate: ReturnType<typeof vi.fn>;
beforeEach(() => {
	window.addEventListener('submit', block, true);
	vibrate = vi.fn(() => true);
	Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
});
afterEach(() => {
	window.removeEventListener('submit', block, true);
});

const full = () => page.getByRole('button', { name: 'Full record' });
const side = () => page.getByRole('button', { name: 'One side' });
const undo = () => page.getByRole('button', { name: 'Undo last play' });

describe('PlayButtons', () => {
	it('offers a full record and one side for the stylus, as thumb-sized keys', async () => {
		render(PlayButtons, { stylusId: 's1', canUndo: false });

		for (const [key, kind] of [
			[full(), 'full'],
			[side(), 'side']
		] as const) {
			await expect.element(key).toHaveAttribute('name', 'kind');
			await expect.element(key).toHaveAttribute('value', kind);
			const box = key.element().getBoundingClientRect();
			expect(box.height).toBeGreaterThanOrEqual(44);
			expect(box.width).toBeGreaterThanOrEqual(44);
		}
		const form = full().element().closest('form')!;
		expect(form.getAttribute('action')).toBe('?/play');
		expect(new FormData(form).get('stylusId')).toBe('s1');
	});

	it('buzzes and spins the record on the pressed key', async () => {
		render(PlayButtons, { stylusId: 's1', canUndo: false });

		await side().click();

		expect(vibrate).toHaveBeenCalledOnce();
		await expect.element(side()).toHaveAttribute('data-spins', '1');
		await expect.element(full()).toHaveAttribute('data-spins', '0');

		await side().click();
		await expect.element(side()).toHaveAttribute('data-spins', '2');
	});

	it('still works where the phone cannot vibrate', async () => {
		Object.defineProperty(navigator, 'vibrate', { value: undefined, configurable: true });
		render(PlayButtons, { stylusId: 's1', canUndo: false });

		await full().click();

		await expect.element(full()).toHaveAttribute('data-spins', '1');
	});

	it('hides undo until there is a play to undo', async () => {
		render(PlayButtons, { stylusId: 's1', canUndo: false });

		await expect.element(undo()).not.toBeInTheDocument();
	});

	it('offers undo for the stylus once something was logged', async () => {
		render(PlayButtons, { stylusId: 's1', canUndo: true });

		const form = undo().element().closest('form')!;
		expect(form.getAttribute('action')).toBe('?/undo');
		expect(new FormData(form).get('stylusId')).toBe('s1');
		expect(undo().element().getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
	});

	it('announces an error from the server', async () => {
		render(PlayButtons, { stylusId: 's1', canUndo: false, error: 'Stylus not found' });

		await expect.element(page.getByRole('alert')).toHaveTextContent('Stylus not found');
	});
});
