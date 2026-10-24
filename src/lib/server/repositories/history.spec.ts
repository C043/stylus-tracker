import { beforeEach, describe, expect, it } from 'vitest';
import { openDatabase, type Db } from '../db/client';
import { listHistory } from './history';
import { logPlay } from './plays';
import { addStylus, replaceStylus } from './styli';
import { createTurntable } from './turntables';

let db: Db;
beforeEach(() => {
	db = openDatabase(':memory:').db;
});

const fit = (turntableId: string, installedOn: string, today: string) =>
	({ turntableId, profile: 'elliptical', installedOn, today }) as const;

describe('listHistory', () => {
	it('is empty while no stylus has been retired', () => {
		const tt = createTurntable(db, { name: 'Living room' });
		addStylus(db, fit(tt.id, '2026-10-01', '2026-10-01'));

		expect(listHistory(db)).toEqual([]);
	});

	it('lists a retired stylus with its turntable and total sides played, backfill included', () => {
		const tt = createTurntable(db, { name: 'Living room', catalogId: 'technics/sl-1500c' });
		const old = addStylus(db, fit(tt.id, '2026-09-28', '2026-10-01'));
		logPlay(db, { stylusId: old.id, kind: 'full' });
		logPlay(db, { stylusId: old.id, kind: 'side' });
		const current = replaceStylus(db, fit(tt.id, '2026-10-24', '2026-10-24'));
		logPlay(db, { stylusId: current.id, kind: 'full' });

		expect(listHistory(db)).toEqual([
			{
				turntable: tt,
				stylus: { ...old, retiredOn: '2026-10-24' },
				// 3 backfilled records (6 sides) + full (2) + side (1)
				sidesPlayed: 9,
				wearPercent: 1
			}
		]);
	});

	it('lists the most recently retired first, across turntables', () => {
		const a = createTurntable(db, { name: 'A' });
		const b = createTurntable(db, { name: 'B' });
		addStylus(db, fit(a.id, '2026-01-01', '2026-01-01'));
		addStylus(db, fit(b.id, '2026-01-01', '2026-01-01'));
		replaceStylus(db, fit(a.id, '2026-03-01', '2026-03-01'));
		replaceStylus(db, fit(b.id, '2026-05-01', '2026-05-01'));
		replaceStylus(db, fit(a.id, '2026-04-01', '2026-04-01'));

		expect(listHistory(db).map((r) => [r.turntable.name, r.stylus.retiredOn])).toEqual([
			['B', '2026-05-01'],
			['A', '2026-04-01'],
			['A', '2026-03-01']
		]);
	});
});
