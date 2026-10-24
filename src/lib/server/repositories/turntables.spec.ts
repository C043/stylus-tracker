import { beforeEach, describe, expect, it } from 'vitest';
import { openDatabase, type Db } from '../db/client';
import { createTurntable, getTurntable, listTurntables } from './turntables';

let db: Db;
beforeEach(() => {
	db = openDatabase(':memory:').db;
});

describe('turntable repository', () => {
	it('creates a catalog turntable and reads it back', () => {
		const created = createTurntable(db, { name: 'Living room', catalogId: 'technics/sl-1500c' });

		expect(created).toMatchObject({
			name: 'Living room',
			catalogId: 'technics/sl-1500c',
			brand: null,
			model: null
		});
		expect(getTurntable(db, created.id)).toEqual(created);
	});

	it('creates a custom turntable with free-text brand and model', () => {
		const created = createTurntable(db, { name: 'Attic', brand: 'Crosley', model: 'Suitcase' });

		expect(created).toMatchObject({ catalogId: null, brand: 'Crosley', model: 'Suitcase' });
	});

	it('returns undefined for an unknown id', () => {
		expect(getTurntable(db, 'nope')).toBeUndefined();
	});

	it('lists turntables oldest first', () => {
		const a = createTurntable(db, { name: 'A', createdAt: '2026-10-02T10:00:00.000Z' });
		const b = createTurntable(db, { name: 'B', createdAt: '2026-10-01T10:00:00.000Z' });

		expect(listTurntables(db).map((t) => t.id)).toEqual([b.id, a.id]);
	});
});
