import { CUSTOM_CHOICE, findCatalogModel } from '../../catalog/turntables';
import type { Db } from '../db/client';
import { createTurntable, type Turntable } from '../repositories/turntables';
import { readValues, type FormResult } from './fields';

export const MAX_TEXT = 60;

const FIELDS = ['catalogId', 'name', 'brand', 'model'] as const;
type Field = (typeof FIELDS)[number];

export function addTurntableFromForm(db: Db, form: FormData): FormResult<Turntable, Field> {
	const values = readValues(form, FIELDS);
	const errors: Partial<Record<Field, string>> = {};
	const tooLong = `Keep it under ${MAX_TEXT} characters`;
	for (const key of ['name', 'brand', 'model'] as const) {
		if (values[key].length > MAX_TEXT) errors[key] = tooLong;
	}

	const custom = values.catalogId === CUSTOM_CHOICE;
	const entry = custom ? undefined : findCatalogModel(values.catalogId);
	if (!custom && !entry) errors.catalogId = 'Pick a turntable, or choose Custom';

	const brand = custom ? values.brand || null : null;
	const model = custom ? values.model || null : null;
	const name =
		values.name ||
		(entry ? `${entry.brand} ${entry.model}` : [brand, model].filter(Boolean).join(' '));
	if (custom && !name) errors.name = 'Give it a name, brand or model';

	if (Object.keys(errors).length > 0) return { ok: false, errors, values };
	return {
		ok: true,
		value: createTurntable(db, { name, catalogId: entry?.catalogId ?? null, brand, model })
	};
}
