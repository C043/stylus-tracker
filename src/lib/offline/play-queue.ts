// Plays logged in the browser wait here until the server has them, so logging works offline
// (or away from home, when the self-hosted server can't be reached). Free of browser globals
// so it can be unit-tested in Node; see outbox.svelte.ts for the app's instance.

import type { PlayKind } from '../domain/wear';

export interface QueuedPlay {
	/** Chosen in the browser, so a play sent twice is logged once. */
	id: string;
	stylusId: string;
	kind: PlayKind;
	/** When the play was logged on the phone, not when it reached the server. */
	playedAt: string;
}

export type SendResult =
	| { status: 'saved' }
	/** The server answered and won't take it, e.g. the stylus was replaced. Don't retry. */
	| { status: 'rejected'; reason: string }
	/** No answer, or a server error. Retry later. */
	| { status: 'unreachable' };

export interface KeyValueStorage {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
}

interface Options {
	/** Usually localStorage. Falls back to memory when missing or blocked. */
	storage?: KeyValueStorage;
	send(play: QueuedPlay): Promise<SendResult>;
	/** Reloads the server's numbers. Sent plays leave the queue only after it, so they aren't counted twice or not at all. */
	refresh(): Promise<void>;
	onChange?(): void;
	onRejected?(play: QueuedPlay, reason: string): void;
}

export const QUEUE_KEY = 'stylus-tracker.play-queue';

/**
 * A v4 UUID for a new play. `randomUUID` only exists in secure contexts, and the app is often
 * opened over plain http on a LAN address, so fall back to `getRandomValues`.
 */
export function newPlayId(
	source: Pick<Crypto, 'getRandomValues'> & { randomUUID?: () => string } = crypto
): string {
	if (source.randomUUID) return source.randomUUID();
	const bytes = source.getRandomValues(new Uint8Array(16));
	bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
	bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
	const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const isQueuedPlay = (value: unknown): value is QueuedPlay =>
	typeof value === 'object' &&
	value !== null &&
	['id', 'stylusId', 'playedAt'].every(
		(k) => typeof (value as Record<string, unknown>)[k] === 'string'
	) &&
	((value as QueuedPlay).kind === 'full' || (value as QueuedPlay).kind === 'side');

/** A play logged on this device just now, ready to queue. */
export function newQueuedPlay(stylusId: string, kind: PlayKind, now = new Date()): QueuedPlay {
	return { id: newPlayId(), stylusId, kind, playedAt: now.toISOString() };
}

export class PlayQueue {
	#options: Options;
	/** Last known queue, used when storage can't be read. */
	#memory: QueuedPlay[] = [];
	#flushing: Promise<{ unreachable: boolean }> | undefined;
	#again = false;

	constructor(options: Options) {
		this.#options = options;
	}

	/** Every queued play, oldest first. Read from storage each time, so other tabs' plays show. */
	list(): QueuedPlay[] {
		try {
			const raw = this.#options.storage?.getItem(QUEUE_KEY);
			if (raw == null) return [...this.#memory];
			const parsed: unknown = JSON.parse(raw);
			return Array.isArray(parsed) ? parsed.filter(isQueuedPlay) : [];
		} catch {
			return [...this.#memory];
		}
	}

	/**
	 * Queued plays of a stylus the server hasn't counted. Plays are sent oldest first, so if the
	 * server's last play is still queued (fresh data arrives just before sent plays leave the
	 * queue), it and the plays before it are already in the server's numbers.
	 */
	pendingFor(stylusId: string, serverLastPlayId?: string | null): QueuedPlay[] {
		const plays = this.list().filter((p) => p.stylusId === stylusId);
		return plays.slice(plays.findIndex((p) => p.id === serverLastPlayId) + 1);
	}

	add(play: QueuedPlay): void {
		this.#write([...this.list(), play]);
	}

	/**
	 * Takes back the newest queued play of a stylus, or returns undefined if none is queued
	 * (undo it on the server then). Waits for a send in progress, which may save that play.
	 */
	async undo(stylusId: string): Promise<QueuedPlay | undefined> {
		await this.idle();
		const plays = this.list();
		const index = plays.findLastIndex((p) => p.stylusId === stylusId);
		if (index === -1) return undefined;
		const [undone] = plays.splice(index, 1);
		this.#write(plays);
		return undone;
	}

	/**
	 * Sends queued plays until the queue is empty or the server can't be reached. Asked again
	 * while a flush runs (say, back online mid-send), it tries once more if that one failed.
	 */
	flush(): Promise<{ unreachable: boolean }> {
		if (this.#flushing) {
			this.#again = true;
			return this.#flushing;
		}
		this.#flushing = (async () => {
			let result;
			do {
				this.#again = false;
				result = await this.#sendAll();
			} while (result.unreachable && this.#again);
			return result;
		})().finally(() => (this.#flushing = undefined));
		return this.#flushing;
	}

	/** Resolves once no flush is running. */
	async idle(): Promise<void> {
		await this.#flushing;
	}

	async #sendAll(): Promise<{ unreachable: boolean }> {
		for (;;) {
			const done = new Set<string>();
			let unreachable = false;
			for (const play of this.list()) {
				const result = await this.#options
					.send(play)
					.catch((): SendResult => ({ status: 'unreachable' }));
				if (result.status === 'unreachable') {
					unreachable = true;
					break;
				}
				if (result.status === 'rejected') this.#options.onRejected?.(play, result.reason);
				done.add(play.id);
			}
			if (done.size > 0) {
				await this.#options.refresh().catch(() => {});
				this.#write(this.list().filter((p) => !done.has(p.id)));
			}
			// Loop again for plays added while sending.
			if (unreachable || done.size === 0) return { unreachable };
		}
	}

	#write(plays: QueuedPlay[]): void {
		this.#memory = plays;
		try {
			this.#options.storage?.setItem(QUEUE_KEY, JSON.stringify(plays));
		} catch {
			// Blocked storage: the queue lives in memory for this page.
		}
		this.#options.onChange?.();
	}
}
