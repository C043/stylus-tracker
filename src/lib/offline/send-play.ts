import { deserialize } from '$app/forms';
import type { QueuedPlay, SendResult } from './play-queue';

interface Options {
	fetch: typeof fetch;
	/** The dashboard's `play` form action. */
	action: string;
	timeoutMs?: number;
}

/** Posts a queued play to the `play` form action, the way `use:enhance` would. */
export async function sendPlay(
	play: QueuedPlay,
	{ fetch, action, timeoutMs = 10_000 }: Options
): Promise<SendResult> {
	const body = new FormData();
	for (const [key, value] of Object.entries(play)) body.set(key, value);

	try {
		const response = await fetch(action, {
			method: 'POST',
			body,
			headers: { accept: 'application/json', 'x-sveltekit-action': 'true' },
			// A hung request would hold up undo, which waits for sends in progress.
			signal: AbortSignal.timeout(timeoutMs)
		});
		const result = deserialize<undefined, { error?: string }>(await response.text());
		if (result.type === 'redirect' || result.type === 'success') return { status: 'saved' };
		if (result.type === 'failure') {
			return { status: 'rejected', reason: result.data?.error ?? 'The server refused this play' };
		}
	} catch {
		// Offline, timed out, or not an action reply (a proxy error page, a Wi-Fi login page…).
	}
	return { status: 'unreachable' };
}
