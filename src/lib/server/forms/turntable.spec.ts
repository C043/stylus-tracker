import { beforeEach, describe, expect, it } from 'vitest';
import { openDatabase, type Db } from '../db/client';
import { createTurntable, getTurntable, listTurntables } from '../repositories/turntables';
import { addTurntableFromForm, renameTurntableFromForm } from './turntable';

let db: Db;
beforeEach(() => {
	db = openDatabase(':memory:').db;
});

const form = (fields: Record<string, string>) => {
	const data = new FormData();
	for (const [k, v] of Object.entries(fields)) data.set(k, v);
	return data;
};

describe('addTurntableFromForm', () => {
	it('creates a catalog turntable with the given name', () => {
		const result = addTurntableFromForm(
			db,
			form({ catalogId: 'technics/sl-1500c', name: ' Living room ' })
		);

		expect(result.ok).toBe(true);
		expect(listTurntables(db)).toMatchObject([
			{ name: 'Living room', catalogId: 'technics/sl-1500c', brand: null, model: null }
		]);
	});

	it('names a catalog turntable after its brand and model when no name is given', () => {
		addTurntableFromForm(db, form({ catalogId: 'technics/sl-1500c', name: '' }));

		expect(listTurntables(db)[0].name).toBe('Technics SL-1500C');
	});

	it('ignores brand/model text for catalog turntables', () => {
		addTurntableFromForm(
			db,
			form({ catalogId: 'rega/planar-1', name: 'Den', brand: 'X', model: 'Y' })
		);

		expect(listTurntables(db)[0]).toMatchObject({ brand: null, model: null });
	});

	it('creates a custom turntable with free-text brand and model', () => {
		const result = addTurntableFromForm(
			db,
			form({ catalogId: 'custom', name: 'Attic', brand: ' Crosley ', model: 'Suitcase' })
		);

		expect(result.ok).toBe(true);
		expect(listTurntables(db)).toMatchObject([
			{ name: 'Attic', catalogId: null, brand: 'Crosley', model: 'Suitcase' }
		]);
	});

	it('names a custom turntable after its brand and model when no name is given', () => {
		addTurntableFromForm(db, form({ catalogId: 'custom', brand: 'Crosley', model: '' }));

		expect(listTurntables(db)[0]).toMatchObject({ name: 'Crosley', model: null });
	});

	it('requires a name, brand or model for a custom turntable', () => {
		const result = addTurntableFromForm(db, form({ catalogId: 'custom' }));

		expect(result).toMatchObject({ ok: false, errors: { name: expect.any(String) } });
		expect(listTurntables(db)).toEqual([]);
	});

	it.each([[{}], [{ catalogId: '' }], [{ catalogId: 'acme/nope' }]])(
		'rejects a missing or unknown turntable choice %j',
		(fields) => {
			const result = addTurntableFromForm(db, form(fields));

			expect(result).toMatchObject({ ok: false, errors: { catalogId: expect.any(String) } });
			expect(listTurntables(db)).toEqual([]);
		}
	);

	it('rejects over-long text and echoes the values back', () => {
		const long = 'x'.repeat(61);
		const result = addTurntableFromForm(
			db,
			form({ catalogId: 'custom', name: long, brand: long, model: long })
		);

		expect(result).toMatchObject({
			ok: false,
			errors: { name: expect.any(String), brand: expect.any(String), model: expect.any(String) },
			values: { catalogId: 'custom', name: long, brand: long, model: long }
		});
	});
});

describe('renameTurntableFromForm', () => {
	it('renames the turntable to the trimmed name', () => {
		const t = createTurntable(db, { name: 'Living room', catalogId: 'technics/sl-1500c' });

		const result = renameTurntableFromForm(db, t.id, form({ name: '  Den ' }));

		expect(result).toMatchObject({ ok: true, value: { name: 'Den' } });
		expect(getTurntable(db, t.id)?.name).toBe('Den');
	});

	it.each([
		[{ catalogId: 'technics/sl-1500c' }, 'Technics SL-1500C'],
		[{ catalogId: null, brand: 'Crosley', model: 'Suitcase' }, 'Crosley Suitcase']
	])('falls back to the model name when the name is cleared (%j)', (fields, expected) => {
		const t = createTurntable(db, { name: 'Living room', ...fields });

		renameTurntableFromForm(db, t.id, form({ name: '' }));

		expect(getTurntable(db, t.id)?.name).toBe(expected);
	});

	it('rejects an over-long name and keeps the old one', () => {
		const t = createTurntable(db, { name: 'Living room', catalogId: 'technics/sl-1500c' });
		const long = 'x'.repeat(61);

		const result = renameTurntableFromForm(db, t.id, form({ name: long }));

		expect(result).toMatchObject({
			ok: false,
			errors: { name: expect.any(String) },
			values: { name: long }
		});
		expect(getTurntable(db, t.id)?.name).toBe('Living room');
	});

	it('reports a turntable deleted since the form was opened', () => {
		const result = renameTurntableFromForm(db, 'nope', form({ name: 'Den' }));

		expect(result).toMatchObject({ ok: false, errors: { form: expect.any(String) } });
	});
});
