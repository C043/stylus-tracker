import { self } from '$app/service-worker';
import { version } from '$app/environment';
import { assets, immutable } from '$app/manifest';

const CACHE = `stylus-cache-${version}`;
const ASSETS = [...immutable, ...assets].map(({ path }) => '/' + path.replace(/^\//, ''));

self.addEventListener('install', (event) => {
	event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
	);
});

self.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;
	const url = new URL(event.request.url);
	if (url.origin !== self.location.origin) return;

	// Static/build assets: cache first. Everything else: network first, cache fallback.
	if (ASSETS.includes(url.pathname)) {
		event.respondWith(caches.match(url.pathname).then((r) => r ?? fetch(event.request)));
		return;
	}

	event.respondWith(
		(async () => {
			const cache = await caches.open(CACHE);
			try {
				const response = await fetch(event.request);
				if (response.ok) cache.put(event.request, response.clone());
				return response;
			} catch (err) {
				const cached = await cache.match(event.request);
				if (cached) return cached;
				throw err;
			}
		})()
	);
});
