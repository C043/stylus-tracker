import { beforeEach, describe, expect, it } from 'vitest';
import { openDatabase, type Db } from '../db/client';
import { addStylus, getStylus } from './styli';
import { getPlay, logPlay } from './plays';
import {
	createTurntable,
	deleteTurntable,
	getTurntable,
	listTurntables,
	renameTurntable
} from './turntables';

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

	it('renames a turntable and leaves the rest as it was', () => {
		const created = createTurntable(db, { name: 'Living room', catalogId: 'technics/sl-1500c' });

		const renamed = renameTurntable(db, created.id, 'Den');

		expect(renamed).toEqual({ ...created, name: 'Den' });
		expect(getTurntable(db, created.id)?.name).toBe('Den');
	});

	it('returns undefined when renaming an unknown turntable', () => {
		expect(renameTurntable(db, 'nope', 'Den')).toBeUndefined();
	});

	it('deletes a turntable with its styli and their plays', () => {
		const keep = createTurntable(db, { name: 'Keep' });
		const gone = createTurntable(db, { name: 'Gone' });
		const stylus = addStylus(db, {
			turntableId: gone.id,
			profile: 'spherical',
			installedOn: '2026-10-24',
			today: '2026-10-24'
		});
		const play = logPlay(db, { stylusId: stylus.id, kind: 'full' });

		expect(deleteTurntable(db, gone.id)).toBe(true);

		expect(getTurntable(db, gone.id)).toBeUndefined();
		expect(getStylus(db, stylus.id)).toBeUndefined();
		expect(getPlay(db, play.id)).toBeUndefined();
		expect(listTurntables(db).map((t) => t.id)).toEqual([keep.id]);
	});

	it('reports false when deleting an unknown turntable', () => {
		expect(deleteTurntable(db, 'nope')).toBe(false);
	});
});
