import { describe, expect, it, vi } from 'vitest';
import { respond, type ResponseCache } from './strategy';

const ORIGIN = 'http://stylus.test';

function memoryCache(entries: Record<string, string> = {}) {
	const store = new Map(Object.entries(entries).map(([path, body]) => [path, new Response(body)]));
	const key = (request: Request | string) =>
		typeof request === 'string' ? request : new URL(request.url).pathname;
	const cache: ResponseCache & { store: typeof store } = {
		store,
		match: async (request) => store.get(key(request))?.clone(),
		put: async (request, response) => void store.set(key(request), response)
	};
	return cache;
}

const page = (path: string) =>
	new Request(ORIGIN + path, { headers: { accept: 'text/html,application/xhtml+xml' } });
const data = (path: string) => new Request(ORIGIN + path, { headers: { accept: '*/*' } });
const offline = () => vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch'));
const online = (body: string, status = 200) =>
	vi.fn<typeof fetch>().mockResolvedValue(new Response(body, { status }));

const options = (cache: ResponseCache, fetch: typeof globalThis.fetch) => ({
	cache,
	fetch,
	assets: ['/_app/immutable/app.js', '/offline'],
	offlinePage: '/offline'
});

describe('service worker strategy', () => {
	it('serves precached assets from the cache without the network', async () => {
		const cache = memoryCache({ '/_app/immutable/app.js': 'cached js' });
		const fetch = online('network js');

		const response = await respond(data('/_app/immutable/app.js'), options(cache, fetch));

		expect(await response.text()).toBe('cached js');
		expect(fetch).not.toHaveBeenCalled();
	});

	it('fetches a precached asset that has gone missing from the cache', async () => {
		const response = await respond(
			data('/_app/immutable/app.js'),
			options(memoryCache(), online('network js'))
		);

		expect(await response.text()).toBe('network js');
	});

	it('serves pages from the network first and caches them', async () => {
		const cache = memoryCache({ '/history': 'stale history' });

		const response = await respond(page('/history'), options(cache, online('fresh history')));

		expect(await response.text()).toBe('fresh history');
		expect(await (await cache.match('/history'))!.text()).toBe('fresh history');
	});

	it('does not cache error responses', async () => {
		const cache = memoryCache({ '/history': 'good history' });

		const response = await respond(page('/history'), options(cache, online('boom', 500)));

		expect(response.status).toBe(500);
		expect(await (await cache.match('/history'))!.text()).toBe('good history');
	});

	it('falls back to the cached copy of a page when offline', async () => {
		const cache = memoryCache({ '/history': 'cached history', '/offline': 'offline page' });

		const response = await respond(page('/history'), options(cache, offline()));

		expect(await response.text()).toBe('cached history');
	});

	it('shows the offline page for a page never visited when offline', async () => {
		const cache = memoryCache({ '/offline': 'offline page' });

		const response = await respond(page('/turntables/new'), options(cache, offline()));

		expect(await response.text()).toBe('offline page');
	});

	it('lets non-page requests fail when offline and uncached', async () => {
		const cache = memoryCache({ '/offline': 'offline page' });

		await expect(respond(data('/history/__data.json'), options(cache, offline()))).rejects.toThrow(
			'Failed to fetch'
		);
	});

	it('falls back to cached data when offline', async () => {
		const cache = memoryCache({ '/history/__data.json': '{"cached":true}' });

		const response = await respond(data('/history/__data.json'), options(cache, offline()));

		expect(await response.json()).toEqual({ cached: true });
	});
});
