import type { ServerInit } from '@sveltejs/kit/hooks';

// Open the DB (and run pending migrations) at boot, before the first request,
// so a fresh `docker compose up -d` needs no manual setup.
export const init: ServerInit = async () => {
	await import('#lib/server/db/index.ts');
};
