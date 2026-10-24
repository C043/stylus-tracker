import { beforeEach, describe, expect, it } from 'vitest';
import { openDatabase, type Db } from '../db/client';
import { addStylus, getActiveStylus, getStylus, type Stylus } from '../repositories/styli';
import { createTurntable, type Turntable } from '../repositories/turntables';
import {
	addStylusFromForm,
	replacementDefaults,
	replaceStylusFromForm,
	stylusDefaults
} from './stylus';

const SERVER_TODAY = '2026-10-24';

let db: Db;
let turntable: Turntable;
beforeEach(() => {
	db = openDatabase(':memory:').db;
	turntable = createTurntable(db, { name: 'Living room', catalogId: 'technics/sl-1500c' });
});

const form = (fields: Record<string, string>) => {
	const data = new FormData();
	for (const [k, v] of Object.entries(fields)) data.set(k, v);
	return data;
};

const add = (fields: Record<string, string>) =>
	addStylusFromForm(db, turntable.id, form(fields), SERVER_TODAY);

describe('stylusDefaults', () => {
	it("pre-fills from the catalog model's suggested stylus", () => {
		expect(stylusDefaults(turntable, SERVER_TODAY)).toEqual({
			profile: 'elliptical',
			cartridge: 'Ortofon 2M Red',
			customLifespanHours: '',
			installedOn: SERVER_TODAY
		});
	});

	it('defaults to spherical when the model has no suggestion or is custom', () => {
		const custom = createTurntable(db, { name: 'Attic', brand: 'Crosley' });

		expect(stylusDefaults(custom, SERVER_TODAY)).toMatchObject({
			profile: 'spherical',
			cartridge: ''
		});
	});
});

describe('addStylusFromForm', () => {
	it('installs a stylus today with no backfill', () => {
		const result = add({
			profile: 'elliptical',
			cartridge: ' Ortofon 2M Red ',
			installedOn: SERVER_TODAY
		});

		expect(result.ok).toBe(true);
		expect(getActiveStylus(db, turntable.id)).toMatchObject({
			profile: 'elliptical',
			cartridge: 'Ortofon 2M Red',
			customLifespanHours: null,
			installedOn: SERVER_TODAY,
			createdOn: SERVER_TODAY,
			backfilledRecords: 0
		});
	});

	it('backfills one record per day for a backdated stylus', () => {
		add({ profile: 'spherical', installedOn: '2026-09-12' });

		expect(getActiveStylus(db, turntable.id)).toMatchObject({
			backfilledRecords: 42,
			cartridge: null
		});
	});

	it("uses the browser's local date as today when it is plausible", () => {
		add({ profile: 'spherical', installedOn: '2026-10-25', today: '2026-10-25' });

		expect(getActiveStylus(db, turntable.id)).toMatchObject({
			createdOn: '2026-10-25',
			backfilledRecords: 0
		});
	});

	it("takes an install date one day ahead as the user's today when JS didn't send theirs", () => {
		// Without JS the `today` field holds the server's date, which may be a day behind.
		const result = add({ profile: 'spherical', installedOn: '2026-10-25', today: SERVER_TODAY });

		expect(result.ok).toBe(true);
		expect(getActiveStylus(db, turntable.id)).toMatchObject({
			installedOn: '2026-10-25',
			createdOn: '2026-10-25',
			backfilledRecords: 0
		});
	});

	it.each([
		['two days ahead of the server', '2026-10-26', SERVER_TODAY],
		["a day ahead of the browser's own date", '2026-10-24', '2026-10-23']
	])('still rejects an install date %s', (_, installedOn, today) => {
		const result = add({ profile: 'spherical', installedOn, today });

		expect(result).toMatchObject({
			ok: false,
			errors: { installedOn: expect.stringMatching(/future/) }
		});
	});

	it('rejects an install date in the future', () => {
		const result = add({ profile: 'spherical', installedOn: '2026-10-25' });

		expect(result).toMatchObject({
			ok: false,
			errors: { installedOn: expect.stringMatching(/future/) }
		});
		expect(getActiveStylus(db, turntable.id)).toBeUndefined();
	});

	it.each(['', '2026-02-30', 'soon'])('rejects an invalid install date %j', (installedOn) => {
		const result = add({ profile: 'spherical', installedOn });

		expect(result).toMatchObject({ ok: false, errors: { installedOn: expect.any(String) } });
	});

	it('rejects an unknown profile', () => {
		const result = add({ profile: 'laser', installedOn: SERVER_TODAY });

		expect(result).toMatchObject({ ok: false, errors: { profile: expect.any(String) } });
	});

	it('stores the lifespan for a custom profile', () => {
		add({ profile: 'custom', customLifespanHours: '250', installedOn: SERVER_TODAY });

		expect(getActiveStylus(db, turntable.id)).toMatchObject({
			profile: 'custom',
			customLifespanHours: 250
		});
	});

	it.each(['', '0', '-5', 'lots', '100001'])(
		'requires a sensible lifespan for a custom profile (%j)',
		(customLifespanHours) => {
			const result = add({ profile: 'custom', customLifespanHours, installedOn: SERVER_TODAY });

			expect(result).toMatchObject({
				ok: false,
				errors: { customLifespanHours: expect.any(String) }
			});
		}
	);

	it('ignores a lifespan sent with a non-custom profile', () => {
		add({ profile: 'spherical', customLifespanHours: '9', installedOn: SERVER_TODAY });

		expect(getActiveStylus(db, turntable.id)).toMatchObject({ customLifespanHours: null });
	});

	it('rejects an over-long cartridge and echoes the values back', () => {
		const cartridge = 'x'.repeat(81);
		const result = add({ profile: 'spherical', cartridge, installedOn: SERVER_TODAY });

		expect(result).toMatchObject({
			ok: false,
			errors: { cartridge: expect.any(String) },
			values: { profile: 'spherical', cartridge, installedOn: SERVER_TODAY }
		});
	});

	it('refuses a second active stylus', () => {
		add({ profile: 'spherical', installedOn: SERVER_TODAY });
		const result = add({ profile: 'spherical', installedOn: SERVER_TODAY });

		expect(result).toMatchObject({ ok: false, errors: { form: expect.stringMatching(/already/) } });
	});
});

describe('replacementDefaults', () => {
	it("pre-fills the previous stylus's profile, cartridge and lifespan, installed today", () => {
		const old = addStylus(db, {
			turntableId: turntable.id,
			profile: 'custom',
			cartridge: 'Audio-Technica VM95C',
			customLifespanHours: 450,
			installedOn: '2026-01-10',
			today: '2026-01-10'
		});

		expect(replacementDefaults(old, SERVER_TODAY)).toEqual({
			profile: 'custom',
			cartridge: 'Audio-Technica VM95C',
			customLifespanHours: '450',
			installedOn: SERVER_TODAY
		});
	});

	it('leaves the cartridge and lifespan blank when the previous stylus had none', () => {
		const old = addStylus(db, {
			turntableId: turntable.id,
			profile: 'spherical',
			installedOn: SERVER_TODAY,
			today: SERVER_TODAY
		});

		expect(replacementDefaults(old, SERVER_TODAY)).toMatchObject({
			cartridge: '',
			customLifespanHours: ''
		});
	});
});

describe('replaceStylusFromForm', () => {
	let old: Stylus;
	beforeEach(() => {
		old = addStylus(db, {
			turntableId: turntable.id,
			profile: 'elliptical',
			installedOn: '2026-01-10',
			today: '2026-01-10'
		});
	});

	const replace = (fields: Record<string, string>) =>
		replaceStylusFromForm(db, turntable.id, form({ replacing: old.id, ...fields }), SERVER_TODAY);

	it('retires the active stylus today and installs the new one', () => {
		const result = replace({
			profile: 'shibata',
			cartridge: 'Ortofon 2M Bronze',
			installedOn: SERVER_TODAY
		});

		expect(result.ok).toBe(true);
		expect(getStylus(db, old.id)?.retiredOn).toBe(SERVER_TODAY);
		expect(getActiveStylus(db, turntable.id)).toMatchObject({
			profile: 'shibata',
			cartridge: 'Ortofon 2M Bronze',
			installedOn: SERVER_TODAY,
			createdOn: SERVER_TODAY,
			backfilledRecords: 0
		});
	});

	it("retires it on the browser's local date when that is plausible", () => {
		replace({ profile: 'elliptical', installedOn: '2026-10-25', today: '2026-10-25' });

		expect(getStylus(db, old.id)?.retiredOn).toBe('2026-10-25');
	});

	it('backfills a new stylus that was fitted a few days ago', () => {
		replace({ profile: 'elliptical', installedOn: '2026-10-21' });

		expect(getActiveStylus(db, turntable.id)?.backfilledRecords).toBe(3);
	});

	it('validates the new stylus like adding one and keeps the old one active', () => {
		const result = replace({ profile: 'laser', installedOn: '2026-10-25' });

		expect(result).toMatchObject({
			ok: false,
			errors: { profile: expect.any(String), installedOn: expect.stringMatching(/future/) },
			values: { profile: 'laser', installedOn: '2026-10-25' }
		});
		expect(getActiveStylus(db, turntable.id)?.id).toBe(old.id);
	});

	it('rejects an install date before the old stylus was installed', () => {
		const result = replace({ profile: 'elliptical', installedOn: '2026-01-09' });

		expect(result).toMatchObject({
			ok: false,
			errors: { installedOn: expect.stringMatching(/before/) }
		});
		expect(getActiveStylus(db, turntable.id)?.id).toBe(old.id);
	});

	it('refuses to replace a stylus that was already replaced, e.g. from a stale tab', () => {
		replace({ profile: 'elliptical', installedOn: SERVER_TODAY });
		const current = getActiveStylus(db, turntable.id);

		const result = replace({ profile: 'shibata', installedOn: SERVER_TODAY });

		expect(result).toMatchObject({
			ok: false,
			errors: { form: expect.stringMatching(/already been replaced/) }
		});
		expect(getActiveStylus(db, turntable.id)).toEqual(current);
	});

	it('refuses when the turntable has no stylus to replace', () => {
		const empty = createTurntable(db, { name: 'Attic', brand: 'Crosley' });

		const result = replaceStylusFromForm(
			db,
			empty.id,
			form({ replacing: old.id, profile: 'spherical', installedOn: SERVER_TODAY }),
			SERVER_TODAY
		);

		expect(result).toMatchObject({ ok: false, errors: { form: expect.any(String) } });
		expect(getActiveStylus(db, empty.id)).toBeUndefined();
	});
});
