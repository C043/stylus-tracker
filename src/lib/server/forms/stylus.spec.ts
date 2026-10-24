import { beforeEach, describe, expect, it } from 'vitest';
import { openDatabase, type Db } from '../db/client';
import { getActiveStylus } from '../repositories/styli';
import { createTurntable, type Turntable } from '../repositories/turntables';
import { addStylusFromForm, stylusDefaults } from './stylus';

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
