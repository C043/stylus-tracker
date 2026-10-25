import { beforeEach, describe, expect, it } from 'vitest';
import { openDatabase, type Db } from '../db/client';
import { addStylus, replaceStylus, type Stylus } from './styli';
import { createTurntable } from './turntables';
import { getLastPlay, getStylusWear, listPlays, logPlay, undoLastPlay } from './plays';

const TODAY = '2026-10-24';

let db: Db;
let turntableId: string;
let stylus: Stylus;
beforeEach(() => {
	db = openDatabase(':memory:').db;
	turntableId = createTurntable(db, { name: 'Living room' }).id;
	stylus = addStylus(db, { turntableId, profile: 'spherical', installedOn: TODAY, today: TODAY });
});

describe('logPlay', () => {
	it('records full and one-side plays, oldest first', () => {
		logPlay(db, { stylusId: stylus.id, kind: 'full', playedAt: '2026-10-24T18:00:00.000Z' });
		logPlay(db, { stylusId: stylus.id, kind: 'side', playedAt: '2026-10-24T19:00:00.000Z' });

		expect(listPlays(db, stylus.id).map((p) => p.kind)).toEqual(['full', 'side']);
	});

	it('refuses to log a play on a retired stylus', () => {
		replaceStylus(db, { turntableId, profile: 'spherical', installedOn: TODAY, today: TODAY });

		expect(() => logPlay(db, { stylusId: stylus.id, kind: 'full' })).toThrow(/retired/);
	});

	it('throws for an unknown stylus', () => {
		expect(() => logPlay(db, { stylusId: 'nope', kind: 'full' })).toThrow(/not found/);
	});

	it('keeps an id and time chosen by the client (offline queue)', () => {
		const id = '0b7f3c1e-6a2d-4f7e-9c41-2d5e8a9b1c3f';
		const playedAt = '2026-10-23T21:15:00.000Z';

		expect(logPlay(db, { id, stylusId: stylus.id, kind: 'side', playedAt })).toEqual({
			id,
			stylusId: stylus.id,
			kind: 'side',
			playedAt
		});
	});

	it('logs a play sent twice only once, e.g. a retry after a lost response', () => {
		const sent = { id: 'retry-1', stylusId: stylus.id, kind: 'full' as const };
		const first = logPlay(db, sent);

		expect(logPlay(db, sent)).toEqual(first);
		expect(listPlays(db, stylus.id)).toHaveLength(1);
	});

	it('accepts a retry of a saved play after the stylus was retired', () => {
		const first = logPlay(db, { id: 'retry-1', stylusId: stylus.id, kind: 'full' });
		replaceStylus(db, { turntableId, profile: 'spherical', installedOn: TODAY, today: TODAY });

		expect(logPlay(db, { id: 'retry-1', stylusId: stylus.id, kind: 'full' })).toEqual(first);
	});
});

describe('undoLastPlay', () => {
	it('removes only the most recent play and returns it', () => {
		const first = logPlay(db, {
			stylusId: stylus.id,
			kind: 'full',
			playedAt: '2026-10-24T18:00:00.000Z'
		});
		const last = logPlay(db, {
			stylusId: stylus.id,
			kind: 'side',
			playedAt: '2026-10-24T19:00:00.000Z'
		});

		expect(undoLastPlay(db, stylus.id)).toEqual(last);
		expect(listPlays(db, stylus.id)).toEqual([first]);
	});

	it('removes the later-logged play when two share a timestamp', () => {
		const at = '2026-10-24T18:00:00.000Z';
		logPlay(db, { stylusId: stylus.id, kind: 'full', playedAt: at });
		const second = logPlay(db, { stylusId: stylus.id, kind: 'side', playedAt: at });

		expect(undoLastPlay(db, stylus.id)?.id).toBe(second.id);
	});

	it('returns undefined when there is nothing to undo', () => {
		expect(undoLastPlay(db, stylus.id)).toBeUndefined();
	});

	it('only touches the given stylus', () => {
		const other = createTurntable(db, { name: 'Other' }).id;
		const otherStylus = addStylus(db, {
			turntableId: other,
			profile: 'spherical',
			installedOn: TODAY,
			today: TODAY
		});
		logPlay(db, { stylusId: otherStylus.id, kind: 'full' });

		expect(undoLastPlay(db, stylus.id)).toBeUndefined();
		expect(listPlays(db, otherStylus.id)).toHaveLength(1);
	});
});

describe('getLastPlay', () => {
	it('returns the most recent play without removing it', () => {
		logPlay(db, { stylusId: stylus.id, kind: 'full', playedAt: '2026-10-24T18:00:00.000Z' });
		const last = logPlay(db, {
			stylusId: stylus.id,
			kind: 'side',
			playedAt: '2026-10-24T19:00:00.000Z'
		});

		expect(getLastPlay(db, stylus.id)).toEqual(last);
		expect(listPlays(db, stylus.id)).toHaveLength(2);
	});

	it('returns undefined when nothing was logged', () => {
		expect(getLastPlay(db, stylus.id)).toBeUndefined();
	});
});

describe('getStylusWear', () => {
	it('combines backfill and logged plays', () => {
		const backdated = addStylus(db, {
			turntableId: createTurntable(db, { name: 'Den' }).id,
			profile: 'sapphire',
			installedOn: '2026-10-22',
			today: TODAY
		});
		logPlay(db, { stylusId: backdated.id, kind: 'full' });
		logPlay(db, { stylusId: backdated.id, kind: 'side' });

		// 2 backfilled records (4 sides) + 3 logged sides = 7 sides = 140 min of 40 h
		expect(getStylusWear(db, backdated.id)).toMatchObject({ usedSides: 7, remainingSides: 113 });
	});

	it('uses the custom lifespan and minutes per side', () => {
		const custom = addStylus(db, {
			turntableId: createTurntable(db, { name: 'Den' }).id,
			profile: 'custom',
			customLifespanHours: 10,
			installedOn: TODAY,
			today: TODAY
		});

		expect(getStylusWear(db, custom.id, 30)).toMatchObject({
			limitMinutes: 600,
			remainingSides: 20
		});
	});

	it('still reports wear for a retired stylus (history)', () => {
		logPlay(db, { stylusId: stylus.id, kind: 'full' });
		replaceStylus(db, { turntableId, profile: 'spherical', installedOn: TODAY, today: TODAY });

		expect(getStylusWear(db, stylus.id).usedSides).toBe(2);
	});

	it('throws for an unknown stylus', () => {
		expect(() => getStylusWear(db, 'nope')).toThrow(/not found/);
	});
});
