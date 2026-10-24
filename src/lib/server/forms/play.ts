import type { PlayKind } from '../../domain/wear';
import type { Db } from '../db/client';
import { logPlay, undoLastPlay, type Play } from '../repositories/plays';
import { getStylus } from '../repositories/styli';
import { readValues, text, type FormResult } from './fields';

const FIELDS = ['stylusId', 'kind'] as const;
type Field = (typeof FIELDS)[number];

const isKind = (value: string): value is PlayKind => value === 'full' || value === 'side';

/** Why plays of this stylus can't change, or undefined if it is the active one. */
function inactiveReason(db: Db, stylusId: string): string | undefined {
	const found = getStylus(db, stylusId);
	if (!found) return 'Stylus not found';
	if (found.retiredOn) return 'This stylus was replaced, reload to see the new one';
}

/** Logs a full record or one side on the active stylus named by the form. */
export function logPlayFromForm(db: Db, form: FormData): FormResult<Play, Field> {
	const values = readValues(form, FIELDS);
	const errors: Partial<Record<Field | 'form', string>> = {};

	if (!isKind(values.kind)) errors.kind = 'Pick a full record or one side';
	const reason = inactiveReason(db, values.stylusId);
	if (reason) errors.form = reason;

	if (Object.keys(errors).length > 0) return { ok: false, errors, values };
	return {
		ok: true,
		value: logPlay(db, { stylusId: values.stylusId, kind: values.kind as PlayKind })
	};
}

/** Removes the most recent play of the active stylus named by the form. */
export function undoPlayFromForm(db: Db, form: FormData): FormResult<Play, 'stylusId'> {
	const values = { stylusId: text(form, 'stylusId') };
	const reason = inactiveReason(db, values.stylusId);
	if (reason) return { ok: false, errors: { form: reason }, values };

	const undone = undoLastPlay(db, values.stylusId);
	if (!undone) return { ok: false, errors: { form: 'Nothing to undo' }, values };
	return { ok: true, value: undone };
}
