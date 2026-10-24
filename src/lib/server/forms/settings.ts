import type { Db } from '../db/client';
import { updateSettings, type Settings } from '../repositories/settings';
import { readValues, type FormResult } from './fields';

// From a 7" single (~4 min) to well past the longest LP side (~30 min).
export const MIN_MINUTES_PER_SIDE = 1;
export const MAX_MINUTES_PER_SIDE = 60;

const FIELDS = ['minutesPerSide'] as const;
type Field = (typeof FIELDS)[number];

export function updateSettingsFromForm(db: Db, form: FormData): FormResult<Settings, Field> {
	const values = readValues(form, FIELDS);
	const minutes = Number(values.minutesPerSide);
	let error: string | undefined;

	if (values.minutesPerSide === '') error = 'Enter the minutes per side';
	else if (!/^\d+$/.test(values.minutesPerSide)) error = 'Enter a whole number of minutes';
	else if (minutes < MIN_MINUTES_PER_SIDE || minutes > MAX_MINUTES_PER_SIDE) {
		error = `Pick between ${MIN_MINUTES_PER_SIDE} and ${MAX_MINUTES_PER_SIDE} minutes`;
	}

	if (error) return { ok: false, errors: { minutesPerSide: error }, values };
	return { ok: true, value: updateSettings(db, { minutesPerSide: minutes }) };
}
