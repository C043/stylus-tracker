// The app's play queue: plays logged with JS wait here (in localStorage) until the server has
// them, so the count drops at once and logging works offline or away from the home network.

import { browser } from '$app/env';
import { invalidateAll } from '$app/navigation';
import { resolve } from '$app/paths';
import type { PlayKind } from '../domain/wear';
import {
	newQueuedPlay,
	PlayQueue,
	QUEUE_KEY,
	type KeyValueStorage,
	type QueuedPlay
} from './play-queue';
import { sendPlay } from './send-play';

/** How often to retry while plays are waiting and nothing else prompts a retry. */
const RETRY_MS = 30_000;

function storage(): KeyValueStorage | undefined {
	try {
		return browser ? localStorage : undefined;
	} catch {
		return undefined; // Blocked site data: the queue lives in memory.
	}
}

let version = $state(0);
// Queued plays only show once started, so the first render matches the server's HTML.
let started = $state(false);
// Why the server refused a queued play. Shown app-wide: the play's stylus usually isn't on
// screen any more (replaced or deleted meanwhile).
let rejection = $state<string>();
let unreachable = $state(false);

const queue = new PlayQueue({
	storage: storage(),
	send: (play) => sendPlay(play, { fetch, action: `${resolve('/')}?/play` }),
	refresh: invalidateAll,
	onChange: () => version++,
	onRejected: (_, reason) => (rejection = reason)
});

function flush() {
	void queue.flush().then((result) => (unreachable = result.unreachable));
}

export const outbox = {
	/** Plays of a stylus the server hasn't counted yet, oldest first. */
	pendingFor(stylusId: string, serverLastPlayId?: string | null): QueuedPlay[] {
		void version;
		return started ? queue.pendingFor(stylusId, serverLastPlayId) : [];
	},

	/** Whether the last attempt to send plays couldn't reach the server. */
	get unreachable(): boolean {
		return unreachable;
	},

	/** Why the server refused the last queued play it refused, until dismissed. */
	get rejection(): string | undefined {
		return rejection;
	},

	dismissRejection(): void {
		rejection = undefined;
	},

	log(stylusId: string, kind: PlayKind): void {
		queue.add(newQueuedPlay(stylusId, kind));
		flush();
	},

	/** Takes back the newest queued play of a stylus; false if none was queued. */
	async undo(stylusId: string): Promise<boolean> {
		return (await queue.undo(stylusId)) !== undefined;
	},

	/** Sends waiting plays now and whenever the server may be back. Returns a cleanup. */
	start(): () => void {
		started = true;
		const onVisible = () => document.visibilityState === 'visible' && flush();
		// Another tab changed the queue.
		const onStorage = (e: StorageEvent) => (e.key === null || e.key === QUEUE_KEY) && version++;

		addEventListener('online', flush);
		addEventListener('storage', onStorage);
		document.addEventListener('visibilitychange', onVisible);
		const timer = setInterval(flush, RETRY_MS);
		flush();

		return () => {
			started = false;
			removeEventListener('online', flush);
			removeEventListener('storage', onStorage);
			document.removeEventListener('visibilitychange', onVisible);
			clearInterval(timer);
		};
	}
};
