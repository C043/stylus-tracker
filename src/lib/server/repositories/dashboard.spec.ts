import { beforeEach, describe, expect, it } from 'vitest';
import { openDatabase, type Db } from '../db/client';
import { listDashboard } from './dashboard';
import { logPlay } from './plays';
import { addStylus, replaceStylus } from './styli';
import { createTurntable } from './turntables';

const TODAY = '2026-10-24';

let db: Db;
beforeEach(() => {
	db = openDatabase(':memory:').db;
});

describe('listDashboard', () => {
	it('is empty with no turntables', () => {
		expect(listDashboard(db)).toEqual([]);
	});

	it('lists a turntable without a stylus with no wear', () => {
		const tt = createTurntable(db, { name: 'Attic', brand: 'Crosley' });

		expect(listDashboard(db)).toEqual([
			{ turntable: tt, stylus: null, wear: null, lastPlay: null }
		]);
	});

	it("shows the active stylus's wear, including backfill and plays", () => {
		const tt = createTurntable(db, { name: 'Living room', catalogId: 'technics/sl-1500c' });
		const stylus = addStylus(db, {
			turntableId: tt.id,
			profile: 'spherical',
			installedOn: '2026-10-21',
			today: TODAY
		});
		const played = logPlay(db, { stylusId: stylus.id, kind: 'side' });

		const [row] = listDashboard(db);

		expect(row.stylus).toEqual(stylus);
		expect(row.lastPlay).toEqual(played);
		// 3 backfilled records (6 sides) + 1 side; 300h = 900 sides.
		expect(row.wear).toMatchObject({ usedSides: 7, remainingSides: 893, remainingRecords: 446 });
	});

	it('ignores retired styli', () => {
		const tt = createTurntable(db, { name: 'Den' });
		const old = addStylus(db, {
			turntableId: tt.id,
			profile: 'sapphire',
			installedOn: '2026-09-01',
			today: TODAY
		});
		logPlay(db, { stylusId: old.id, kind: 'full' });
		const fresh = replaceStylus(db, {
			turntableId: tt.id,
			profile: 'sapphire',
			installedOn: TODAY,
			today: TODAY
		});

		const [row] = listDashboard(db);

		expect(row.stylus?.id).toBe(fresh.id);
		expect(row.wear?.usedSides).toBe(0);
		// Undo must not reach back into the retired stylus.
		expect(row.lastPlay).toBeNull();
	});

	it('keeps turntables in the order they were added', () => {
		createTurntable(db, { name: 'First', createdAt: '2026-01-01T00:00:00.000Z' });
		createTurntable(db, { name: 'Second', createdAt: '2026-02-01T00:00:00.000Z' });

		expect(listDashboard(db).map((r) => r.turntable.name)).toEqual(['First', 'Second']);
	});
});
