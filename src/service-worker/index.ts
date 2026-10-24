import { self } from '$app/service-worker';
import { version } from '$app/environment';
import { assets, immutable, prerendered } from '$app/manifest';
import { respond } from './strategy';

const CACHE = `stylus-cache-${version}`;
const OFFLINE_PAGE = '/offline';
const ASSETS = [...immutable, ...assets, ...prerendered].map(
	({ path }) => '/' + path.replace(/^\//, '')
);

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

	event.respondWith(
		caches
			.open(CACHE)
			.then((cache) =>
				respond(event.request, { cache, fetch, assets: ASSETS, offlinePage: OFFLINE_PAGE })
			)
	);
});
