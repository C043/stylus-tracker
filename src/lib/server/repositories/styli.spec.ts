import { beforeEach, describe, expect, it } from 'vitest';
import { openDatabase, type Db } from '../db/client';
import { createTurntable } from './turntables';
import {
	addStylus,
	getActiveStylus,
	getStylus,
	listStyli,
	replaceStylus,
	updateStylus
} from './styli';

let db: Db;
let turntableId: string;
beforeEach(() => {
	db = openDatabase(':memory:').db;
	turntableId = createTurntable(db, { name: 'Living room' }).id;
});

const TODAY = '2026-10-24';

describe('addStylus', () => {
	it('stores a stylus installed today with no backfill', () => {
		const s = addStylus(db, {
			turntableId,
			profile: 'elliptical',
			cartridge: 'Ortofon 2M Red',
			installedOn: TODAY,
			today: TODAY
		});

		expect(s).toMatchObject({
			turntableId,
			profile: 'elliptical',
			cartridge: 'Ortofon 2M Red',
			customLifespanHours: null,
			installedOn: TODAY,
			createdOn: TODAY,
			backfilledRecords: 0,
			retiredOn: null
		});
		expect(getStylus(db, s.id)).toEqual(s);
	});

	it('backfills one record per day for a backdated stylus', () => {
		const s = addStylus(db, {
			turntableId,
			profile: 'spherical',
			installedOn: '2026-10-21',
			today: TODAY
		});

		expect(s.backfilledRecords).toBe(3);
	});

	it('rejects an install date in the future', () => {
		expect(() =>
			addStylus(db, { turntableId, profile: 'spherical', installedOn: '2026-10-25', today: TODAY })
		).toThrow(RangeError);
	});

	it('stores a custom lifespan', () => {
		const s = addStylus(db, {
			turntableId,
			profile: 'custom',
			customLifespanHours: 150,
			installedOn: TODAY,
			today: TODAY
		});

		expect(s.customLifespanHours).toBe(150);
	});

	it('refuses a second active stylus on the same turntable', () => {
		addStylus(db, { turntableId, profile: 'spherical', installedOn: TODAY, today: TODAY });

		expect(() =>
			addStylus(db, { turntableId, profile: 'spherical', installedOn: TODAY, today: TODAY })
		).toThrow(/already has an active stylus/);
	});
});

describe('getActiveStylus', () => {
	it('returns undefined when the turntable has no stylus', () => {
		expect(getActiveStylus(db, turntableId)).toBeUndefined();
	});

	it('returns the active stylus', () => {
		const s = addStylus(db, {
			turntableId,
			profile: 'spherical',
			installedOn: TODAY,
			today: TODAY
		});

		expect(getActiveStylus(db, turntableId)?.id).toBe(s.id);
	});
});

describe('updateStylus', () => {
	it('recomputes the backfill against the original createdOn, not today', () => {
		const s = addStylus(db, {
			turntableId,
			profile: 'spherical',
			installedOn: '2026-10-20',
			today: '2026-10-22'
		});

		const updated = updateStylus(db, s.id, { installedOn: '2026-10-12' });

		expect(updated).toMatchObject({
			installedOn: '2026-10-12',
			createdOn: '2026-10-22',
			backfilledRecords: 10
		});
		expect(getStylus(db, s.id)?.backfilledRecords).toBe(10);
	});

	it('rejects an install date after the stylus was added', () => {
		const s = addStylus(db, {
			turntableId,
			profile: 'spherical',
			installedOn: TODAY,
			today: TODAY
		});

		expect(() => updateStylus(db, s.id, { installedOn: '2026-10-25' })).toThrow(RangeError);
		expect(getStylus(db, s.id)?.installedOn).toBe(TODAY);
	});

	it('changes the cartridge and keeps the install date and backfill', () => {
		const s = addStylus(db, {
			turntableId,
			profile: 'spherical',
			cartridge: 'Ortofon 2M Red',
			installedOn: '2026-10-20',
			today: '2026-10-22'
		});

		expect(updateStylus(db, s.id, { cartridge: 'Ortofon 2M Blue' })).toEqual({
			...s,
			cartridge: 'Ortofon 2M Blue'
		});
		expect(updateStylus(db, s.id, { cartridge: null })?.cartridge).toBeNull();
	});

	it('throws for an unknown stylus', () => {
		expect(() => updateStylus(db, 'nope', { installedOn: TODAY })).toThrow(/not found/);
	});
});

describe('replaceStylus', () => {
	it('retires the active stylus today and installs a new active one', () => {
		const old = addStylus(db, {
			turntableId,
			profile: 'spherical',
			installedOn: '2026-01-01',
			today: '2026-01-01'
		});

		const fresh = replaceStylus(db, {
			turntableId,
			profile: 'elliptical',
			cartridge: 'AT-VM95E',
			installedOn: TODAY,
			today: TODAY
		});

		expect(getStylus(db, old.id)?.retiredOn).toBe(TODAY);
		expect(fresh).toMatchObject({ profile: 'elliptical', retiredOn: null, backfilledRecords: 0 });
		expect(getActiveStylus(db, turntableId)?.id).toBe(fresh.id);
	});

	it('works when there is no active stylus yet', () => {
		const fresh = replaceStylus(db, {
			turntableId,
			profile: 'spherical',
			installedOn: TODAY,
			today: TODAY
		});

		expect(getActiveStylus(db, turntableId)?.id).toBe(fresh.id);
	});

	it('leaves the old stylus active if the new one is invalid', () => {
		const old = addStylus(db, {
			turntableId,
			profile: 'spherical',
			installedOn: TODAY,
			today: TODAY
		});

		expect(() =>
			replaceStylus(db, {
				turntableId,
				profile: 'spherical',
				installedOn: '2026-10-25',
				today: TODAY
			})
		).toThrow(RangeError);
		expect(getActiveStylus(db, turntableId)?.id).toBe(old.id);
	});
});

describe('listStyli', () => {
	it('lists every stylus of a turntable, newest install first', () => {
		const first = addStylus(db, {
			turntableId,
			profile: 'spherical',
			installedOn: '2026-01-01',
			today: '2026-01-01'
		});
		const second = replaceStylus(db, {
			turntableId,
			profile: 'spherical',
			installedOn: '2026-06-01',
			today: '2026-06-01'
		});
		const other = createTurntable(db, { name: 'Other' }).id;
		addStylus(db, { turntableId: other, profile: 'spherical', installedOn: TODAY, today: TODAY });

		expect(listStyli(db, turntableId).map((s) => s.id)).toEqual([second.id, first.id]);
	});
});
