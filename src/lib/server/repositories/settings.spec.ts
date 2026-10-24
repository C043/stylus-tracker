import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_MINUTES_PER_SIDE } from '../../domain/wear';
import { openDatabase, type Db } from '../db/client';
import { settings } from '../db/schema';
import { getSettings, updateSettings } from './settings';

let db: Db;
beforeEach(() => {
	db = openDatabase(':memory:').db;
});

describe('settings', () => {
	it('defaults to the average LP side before anything is saved', () => {
		expect(getSettings(db)).toEqual({ minutesPerSide: DEFAULT_MINUTES_PER_SIDE });
	});

	it('saves and reads back minutes per side', () => {
		expect(updateSettings(db, { minutesPerSide: 22 })).toEqual({ minutesPerSide: 22 });
		expect(getSettings(db)).toEqual({ minutesPerSide: 22 });
	});

	it('keeps a single row however often it is saved', () => {
		updateSettings(db, { minutesPerSide: 22 });
		updateSettings(db, { minutesPerSide: 18 });

		expect(db.select().from(settings).all()).toHaveLength(1);
		expect(getSettings(db)).toEqual({ minutesPerSide: 18 });
	});

	it('rejects a second settings row at the database level', () => {
		updateSettings(db, { minutesPerSide: 22 });

		expect(() => db.insert(settings).values({ id: 2, minutesPerSide: 30 }).run()).toThrow();
	});
});
