import { beforeEach, describe, expect, it } from 'vitest';
import { openDatabase, type Db } from '../db/client';
import { listPlays, logPlay } from '../repositories/plays';
import { addStylus, replaceStylus, type Stylus } from '../repositories/styli';
import { createTurntable } from '../repositories/turntables';
import { logPlayFromForm, undoPlayFromForm } from './play';

const TODAY = '2026-10-24';

let db: Db;
let turntableId: string;
let stylus: Stylus;
beforeEach(() => {
	db = openDatabase(':memory:').db;
	turntableId = createTurntable(db, { name: 'Living room' }).id;
	stylus = addStylus(db, { turntableId, profile: 'spherical', installedOn: TODAY, today: TODAY });
});

const form = (fields: Record<string, string>) => {
	const data = new FormData();
	for (const [k, v] of Object.entries(fields)) data.set(k, v);
	return data;
};

const retire = () =>
	replaceStylus(db, { turntableId, profile: 'spherical', installedOn: TODAY, today: TODAY });

describe('logPlayFromForm', () => {
	it.each(['full', 'side'] as const)('logs a %s play on the active stylus', (kind) => {
		const result = logPlayFromForm(db, form({ stylusId: stylus.id, kind }));

		expect(result).toMatchObject({ ok: true, value: { stylusId: stylus.id, kind } });
		expect(listPlays(db, stylus.id).map((p) => p.kind)).toEqual([kind]);
	});

	it.each(['', 'double', 'FULL'])('rejects an unknown kind %j', (kind) => {
		const result = logPlayFromForm(db, form({ stylusId: stylus.id, kind }));

		expect(result).toMatchObject({ ok: false, errors: { kind: expect.any(String) } });
		expect(listPlays(db, stylus.id)).toEqual([]);
	});

	it('rejects an unknown stylus', () => {
		const result = logPlayFromForm(db, form({ stylusId: 'nope', kind: 'full' }));

		expect(result).toMatchObject({
			ok: false,
			errors: { form: expect.stringMatching(/not found/) },
			values: { stylusId: 'nope', kind: 'full' }
		});
	});

	describe('from the offline queue', () => {
		const NOW = new Date('2026-10-24T20:00:00.000Z');
		const ID = '0b7f3c1e-6a2d-4f7e-9c41-2d5e8a9b1c3f';
		const queued = (fields: Record<string, string> = {}) =>
			form({
				id: ID,
				stylusId: stylus.id,
				kind: 'full',
				playedAt: '2026-10-23T21:15:00.000Z',
				...fields
			});

		it('keeps the id and the time the play was logged on the phone', () => {
			const result = logPlayFromForm(db, queued(), NOW);

			expect(result).toMatchObject({
				ok: true,
				value: { id: ID, playedAt: '2026-10-23T21:15:00.000Z' }
			});
		});

		it('logs a play sent twice only once', () => {
			logPlayFromForm(db, queued(), NOW);
			const retry = logPlayFromForm(db, queued(), NOW);

			expect(retry).toMatchObject({ ok: true, value: { id: ID } });
			expect(listPlays(db, stylus.id)).toHaveLength(1);
		});

		it('accepts a retry of a play saved before the stylus was replaced', () => {
			logPlayFromForm(db, queued(), NOW);
			retire();

			expect(logPlayFromForm(db, queued(), NOW)).toMatchObject({ ok: true, value: { id: ID } });
		});

		it.each(['42', 'not-a-uuid', `${ID}x`])('rejects a malformed id %j', (id) => {
			const result = logPlayFromForm(db, queued({ id }), NOW);

			expect(result).toMatchObject({ ok: false, errors: { id: expect.any(String) } });
			expect(listPlays(db, stylus.id)).toEqual([]);
		});

		it.each(['yesterday', '2026-10-23', '2026-02-30T10:00:00.000Z'])(
			'rejects a malformed time %j',
			(playedAt) => {
				const result = logPlayFromForm(db, queued({ playedAt }), NOW);

				expect(result).toMatchObject({ ok: false, errors: { playedAt: expect.any(String) } });
			}
		);

		it('logs a play from a phone whose clock runs fast at the server time, not in the future', () => {
			const result = logPlayFromForm(db, queued({ playedAt: '2026-10-25T09:00:00.000Z' }), NOW);

			expect(result).toMatchObject({ ok: true, value: { playedAt: NOW.toISOString() } });
		});
	});

	it('rejects a retired stylus, e.g. from a stale tab', () => {
		retire();

		const result = logPlayFromForm(db, form({ stylusId: stylus.id, kind: 'full' }));

		expect(result).toMatchObject({
			ok: false,
			errors: { form: expect.stringMatching(/replaced/) }
		});
		expect(listPlays(db, stylus.id)).toEqual([]);
	});
});

describe('undoPlayFromForm', () => {
	it('removes the last play and returns it', () => {
		logPlay(db, { stylusId: stylus.id, kind: 'full', playedAt: '2026-10-24T18:00:00.000Z' });
		const last = logPlay(db, {
			stylusId: stylus.id,
			kind: 'side',
			playedAt: '2026-10-24T19:00:00.000Z'
		});

		const result = undoPlayFromForm(db, form({ stylusId: stylus.id }));

		expect(result).toEqual({ ok: true, value: last });
		expect(listPlays(db, stylus.id).map((p) => p.kind)).toEqual(['full']);
	});

	it('says so when there is nothing to undo', () => {
		const result = undoPlayFromForm(db, form({ stylusId: stylus.id }));

		expect(result).toMatchObject({
			ok: false,
			errors: { form: expect.stringMatching(/nothing/i) }
		});
	});

	it('rejects an unknown stylus', () => {
		const result = undoPlayFromForm(db, form({ stylusId: 'nope' }));

		expect(result).toMatchObject({
			ok: false,
			errors: { form: expect.stringMatching(/not found/) }
		});
	});

	it("won't change a retired stylus's history", () => {
		logPlay(db, { stylusId: stylus.id, kind: 'full' });
		retire();

		const result = undoPlayFromForm(db, form({ stylusId: stylus.id }));

		expect(result).toMatchObject({
			ok: false,
			errors: { form: expect.stringMatching(/replaced/) }
		});
		expect(listPlays(db, stylus.id)).toHaveLength(1);
	});
});
