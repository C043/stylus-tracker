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
