import { describe, expect, it, vi } from 'vitest';
import {
	newPlayId,
	newQueuedPlay,
	PlayQueue,
	type QueuedPlay,
	type SendResult
} from './play-queue';

const play = (n: number, overrides: Partial<QueuedPlay> = {}): QueuedPlay => ({
	id: `play-${n}`,
	stylusId: 's1',
	kind: 'full',
	playedAt: `2026-10-24T18:0${n}:00.000Z`,
	...overrides
});

function memoryStorage(initial: Record<string, string> = {}) {
	const store = new Map(Object.entries(initial));
	return {
		store,
		getItem: (key: string) => store.get(key) ?? null,
		setItem: (key: string, value: string) => void store.set(key, value)
	};
}

const saved: SendResult = { status: 'saved' };
const unreachable: SendResult = { status: 'unreachable' };

function setup(send: (play: QueuedPlay) => Promise<SendResult> = async () => saved) {
	const storage = memoryStorage();
	const sendSpy = vi.fn(send);
	const refresh = vi.fn(async () => {});
	const onChange = vi.fn();
	const onRejected = vi.fn();
	const queue = new PlayQueue({ storage, send: sendSpy, refresh, onChange, onRejected });
	return { queue, storage, send: sendSpy, refresh, onChange, onRejected };
}

/** A send that waits until the test lets it through. */
function gate() {
	let open!: (result: SendResult) => void;
	const sent = vi.fn<(play: QueuedPlay) => void>();
	const send = (p: QueuedPlay) =>
		new Promise<SendResult>((resolve) => {
			sent(p);
			open = resolve;
		});
	return { send, sent, open: (result: SendResult = saved) => open(result) };
}

describe('PlayQueue', () => {
	it('starts empty', () => {
		expect(setup().queue.list()).toEqual([]);
	});

	it('keeps added plays in order, per stylus, and announces each change', () => {
		const { queue, onChange } = setup();

		queue.add(play(1));
		queue.add(play(2, { stylusId: 's2' }));
		queue.add(play(3, { kind: 'side' }));

		expect(queue.list()).toEqual([play(1), play(2, { stylusId: 's2' }), play(3, { kind: 'side' })]);
		expect(queue.pendingFor('s1')).toEqual([play(1), play(3, { kind: 'side' })]);
		expect(onChange).toHaveBeenCalledTimes(3);
	});

	it('survives a reload: plays live in storage', () => {
		const { queue, storage } = setup();
		queue.add(play(1));

		const reloaded = new PlayQueue({ storage, send: vi.fn(), refresh: vi.fn() });

		expect(reloaded.list()).toEqual([play(1)]);
	});

	it('sees plays another tab queued in the same storage', () => {
		const { queue, storage } = setup();
		const otherTab = new PlayQueue({ storage, send: vi.fn(), refresh: vi.fn() });

		otherTab.add(play(1));
		queue.add(play(2));

		expect(otherTab.list()).toEqual([play(1), play(2)]);
	});

	it('ignores storage it cannot read', () => {
		const storage = memoryStorage({ 'stylus-tracker.play-queue': '{oops' });

		expect(new PlayQueue({ storage, send: vi.fn(), refresh: vi.fn() }).list()).toEqual([]);
	});

	it('works in memory when storage is blocked (private mode)', () => {
		const blocked = {
			getItem: () => {
				throw new DOMException('denied', 'SecurityError');
			},
			setItem: () => {
				throw new DOMException('denied', 'SecurityError');
			}
		};
		const queue = new PlayQueue({ storage: blocked, send: vi.fn(), refresh: vi.fn() });

		queue.add(play(1));

		expect(queue.list()).toEqual([play(1)]);
	});

	describe('flush', () => {
		it('sends queued plays oldest first, then refreshes before they leave the queue', async () => {
			const { queue, send, refresh } = setup();
			queue.add(play(1));
			queue.add(play(2));
			let queuedDuringRefresh: QueuedPlay[] = [];
			refresh.mockImplementation(async () => void (queuedDuringRefresh = queue.list()));

			await queue.flush();

			expect(send.mock.calls.map(([p]) => p.id)).toEqual(['play-1', 'play-2']);
			expect(refresh).toHaveBeenCalledOnce();
			// Still counted while fresh data loads, so the remaining count never jumps back.
			expect(queuedDuringRefresh).toHaveLength(2);
			expect(queue.list()).toEqual([]);
		});

		it('does nothing with an empty queue', async () => {
			const { queue, send, refresh } = setup();

			await queue.flush();

			expect(send).not.toHaveBeenCalled();
			expect(refresh).not.toHaveBeenCalled();
		});

		it('keeps plays the server could not be reached for, and stops trying', async () => {
			const { queue, send, refresh } = setup(async () => unreachable);
			queue.add(play(1));
			queue.add(play(2));

			expect(await queue.flush()).toEqual({ unreachable: true });

			expect(send).toHaveBeenCalledOnce();
			expect(refresh).not.toHaveBeenCalled();
			expect(queue.list()).toEqual([play(1), play(2)]);
		});

		it('treats a send that throws as unreachable', async () => {
			const { queue } = setup(async () => {
				throw new TypeError('Failed to fetch');
			});
			queue.add(play(1));

			expect(await queue.flush()).toEqual({ unreachable: true });
			expect(queue.list()).toEqual([play(1)]);
		});

		it('drops only the plays that were sent when the connection drops halfway', async () => {
			const { queue } = setup(async (p) => (p.id === 'play-1' ? saved : unreachable));
			queue.add(play(1));
			queue.add(play(2));

			await queue.flush();

			expect(queue.list()).toEqual([play(2)]);
		});

		it('drops and reports a play the server rejects, and sends the rest', async () => {
			const { queue, send, onRejected } = setup(async (p) =>
				p.id === 'play-1' ? { status: 'rejected', reason: 'This stylus was replaced' } : saved
			);
			queue.add(play(1));
			queue.add(play(2));

			await queue.flush();

			expect(onRejected).toHaveBeenCalledExactlyOnceWith(play(1), 'This stylus was replaced');
			expect(send).toHaveBeenCalledTimes(2);
			expect(queue.list()).toEqual([]);
		});

		it('still empties the queue if refreshing fails', async () => {
			const { queue, refresh } = setup();
			refresh.mockRejectedValue(new Error('offline again'));
			queue.add(play(1));

			await queue.flush();

			expect(queue.list()).toEqual([]);
		});

		it('also sends plays added while it was sending', async () => {
			const { send, sent, open } = gate();
			const { queue } = setup(send);
			queue.add(play(1));

			const flushing = queue.flush();
			await vi.waitFor(() => expect(sent).toHaveBeenCalledOnce());
			queue.add(play(2));
			open();
			await vi.waitFor(() => expect(sent).toHaveBeenCalledTimes(2));
			open();
			await flushing;

			expect(sent.mock.calls.map(([p]) => p.id)).toEqual(['play-1', 'play-2']);
			expect(queue.list()).toEqual([]);
		});

		it('tries again after a failed flush when asked during it, e.g. back online mid-send', async () => {
			const { send, sent, open } = gate();
			const { queue } = setup(send);
			queue.add(play(1));

			const first = queue.flush();
			await vi.waitFor(() => expect(sent).toHaveBeenCalledOnce());
			const second = queue.flush();
			open(unreachable);
			await vi.waitFor(() => expect(sent).toHaveBeenCalledTimes(2));
			open(saved);

			expect(await second).toEqual({ unreachable: false });
			await first;
			expect(queue.list()).toEqual([]);
		});

		it('runs one flush at a time, so nothing is sent twice', async () => {
			const { send, sent, open } = gate();
			const { queue } = setup(send);
			queue.add(play(1));

			const first = queue.flush();
			const second = queue.flush();
			await vi.waitFor(() => expect(sent).toHaveBeenCalledOnce());
			open();
			await Promise.all([first, second]);

			expect(sent).toHaveBeenCalledOnce();
		});
	});

	describe('undo', () => {
		it('takes back the newest queued play of the stylus without the server', async () => {
			const { queue, send } = setup();
			queue.add(play(1));
			queue.add(play(2, { stylusId: 's2' }));
			queue.add(play(3, { kind: 'side' }));

			expect(await queue.undo('s1')).toEqual(play(3, { kind: 'side' }));
			expect(queue.list()).toEqual([play(1), play(2, { stylusId: 's2' })]);
			expect(send).not.toHaveBeenCalled();
		});

		it('returns undefined when nothing is queued for the stylus', async () => {
			const { queue } = setup();
			queue.add(play(1, { stylusId: 's2' }));

			expect(await queue.undo('s1')).toBeUndefined();
			expect(queue.list()).toHaveLength(1);
		});

		it('waits for a play being sent, then leaves undoing it to the server', async () => {
			const { send, sent, open } = gate();
			const { queue } = setup(send);
			queue.add(play(1));
			const flushing = queue.flush();
			await vi.waitFor(() => expect(sent).toHaveBeenCalledOnce());

			const undoing = queue.undo('s1');
			open();

			expect(await undoing).toBeUndefined();
			await flushing;
		});

		it('takes back a play whose send failed', async () => {
			const { send, sent, open } = gate();
			const { queue } = setup(send);
			queue.add(play(1));
			const flushing = queue.flush();
			await vi.waitFor(() => expect(sent).toHaveBeenCalledOnce());

			const undoing = queue.undo('s1');
			open(unreachable);

			expect(await undoing).toEqual(play(1));
			await flushing;
			expect(queue.list()).toEqual([]);
		});
	});
});

describe('newPlayId', () => {
	const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

	it('uses randomUUID when the browser has it', () => {
		const id = newPlayId({
			randomUUID: () => 'from-browser',
			getRandomValues: crypto.getRandomValues.bind(crypto)
		});

		expect(id).toBe('from-browser');
	});

	it('makes a v4 UUID without randomUUID (plain http on a LAN address)', () => {
		const insecure = { getRandomValues: crypto.getRandomValues.bind(crypto) };
		const ids = new Set(Array.from({ length: 50 }, () => newPlayId(insecure)));

		expect(ids.size).toBe(50);
		for (const id of ids) expect(id).toMatch(UUID_V4);
	});
});

describe('newQueuedPlay', () => {
	it('stamps a play with a fresh id and the time it was logged', () => {
		const now = new Date('2026-10-24T21:15:00.000Z');

		const created = newQueuedPlay('s1', 'side', now);

		expect(created).toEqual({
			id: expect.stringMatching(/^[0-9a-f-]{36}$/),
			stylusId: 's1',
			kind: 'side',
			playedAt: '2026-10-24T21:15:00.000Z'
		});
		expect(newQueuedPlay('s1', 'side', now).id).not.toBe(created.id);
	});
});
