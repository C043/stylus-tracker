import { beforeEach, describe, expect, it } from 'vitest';
import { openDatabase, type Db } from '../db/client';
import { getSettings } from '../repositories/settings';
import { MAX_MINUTES_PER_SIDE, MIN_MINUTES_PER_SIDE, updateSettingsFromForm } from './settings';

let db: Db;
beforeEach(() => {
	db = openDatabase(':memory:').db;
});

const form = (fields: Record<string, string>) => {
	const data = new FormData();
	for (const [k, v] of Object.entries(fields)) data.set(k, v);
	return data;
};

describe('updateSettingsFromForm', () => {
	it('saves minutes per side', () => {
		const result = updateSettingsFromForm(db, form({ minutesPerSide: ' 22 ' }));

		expect(result).toEqual({ ok: true, value: { minutesPerSide: 22 } });
		expect(getSettings(db)).toEqual({ minutesPerSide: 22 });
	});

	it.each([MIN_MINUTES_PER_SIDE, MAX_MINUTES_PER_SIDE])('accepts the bound %i', (minutes) => {
		expect(updateSettingsFromForm(db, form({ minutesPerSide: String(minutes) })).ok).toBe(true);
	});

	it.each([
		['', 'Enter the minutes per side'],
		['abc', 'Enter a whole number of minutes'],
		['20.5', 'Enter a whole number of minutes'],
		['1e1', 'Enter a whole number of minutes'],
		[String(MIN_MINUTES_PER_SIDE - 1), 'Pick between 1 and 60 minutes'],
		[String(MAX_MINUTES_PER_SIDE + 1), 'Pick between 1 and 60 minutes']
	])('rejects %j and keeps the saved value', (minutesPerSide, error) => {
		const result = updateSettingsFromForm(db, form({ minutesPerSide }));

		expect(result).toEqual({
			ok: false,
			errors: { minutesPerSide: error },
			values: { minutesPerSide }
		});
		expect(getSettings(db)).toEqual({ minutesPerSide: 20 });
	});
});
