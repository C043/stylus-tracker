// Fetch strategy, kept free of service-worker globals so it can be unit-tested in Node.

export type ResponseCache = {
	match(request: Request | string): Promise<Response | undefined>;
	put(request: Request, response: Response): Promise<void>;
};

type Options = {
	cache: ResponseCache;
	fetch: typeof fetch;
	/** Precached build + static paths: served cache-first. */
	assets: string[];
	/** Precached page shown for navigations that fail with nothing cached. */
	offlinePage: string;
};

const isPage = (request: Request) =>
	request.mode === 'navigate' || (request.headers.get('accept') ?? '').includes('text/html');

export async function respond(request: Request, options: Options): Promise<Response> {
	const { cache, fetch, assets, offlinePage } = options;

	if (assets.includes(new URL(request.url).pathname)) {
		return (await cache.match(request)) ?? fetch(request);
	}

	// Everything else: network first, cache fallback.
	try {
		const response = await fetch(request);
		if (response.ok) await cache.put(request, response.clone());
		return response;
	} catch (err) {
		const cached = await cache.match(request);
		if (cached) return cached;
		if (isPage(request)) {
			const fallback = await cache.match(offlinePage);
			if (fallback) return fallback;
		}
		throw err;
	}
}
