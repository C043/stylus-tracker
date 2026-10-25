import type { PlayKind } from '../../domain/wear';
import type { Db } from '../db/client';
import { getPlay, logPlay, undoLastPlay, type Play } from '../repositories/plays';
import { getStylus } from '../repositories/styli';
import { readValues, text, type FormResult } from './fields';

// `id` and `playedAt` come from the offline play queue; a plain form post leaves them out.
const FIELDS = ['stylusId', 'kind', 'id', 'playedAt'] as const;
type Field = (typeof FIELDS)[number];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isKind = (value: string): value is PlayKind => value === 'full' || value === 'side';

/** Only the exact format `Date#toISOString` produces, so impossible dates can't roll over. */
function isIsoTimestamp(value: string): boolean {
	const ms = Date.parse(value);
	return !Number.isNaN(ms) && new Date(ms).toISOString() === value;
}

/** Why plays of this stylus can't change, or undefined if it is the active one. */
function inactiveReason(db: Db, stylusId: string): string | undefined {
	const found = getStylus(db, stylusId);
	if (!found) return 'Stylus not found';
	if (found.retiredOn) return 'This stylus was replaced, reload to see the new one';
}

/**
 * Logs a full record or one side on the active stylus named by the form. A queued play sent
 * again (same `id`) is logged once, even if the stylus was replaced since it was first saved.
 */
export function logPlayFromForm(db: Db, form: FormData, now = new Date()): FormResult<Play, Field> {
	const values = readValues(form, FIELDS);
	const errors: Partial<Record<Field | 'form', string>> = {};

	if (!isKind(values.kind)) errors.kind = 'Pick a full record or one side';
	if (values.id && !UUID.test(values.id)) errors.id = 'Invalid play id';
	if (values.playedAt && !isIsoTimestamp(values.playedAt)) errors.playedAt = 'Invalid play time';
	const saved = !errors.id && values.id ? getPlay(db, values.id) : undefined;
	const reason = saved ? undefined : inactiveReason(db, values.stylusId);
	if (reason) errors.form = reason;

	if (Object.keys(errors).length > 0) return { ok: false, errors, values };
	return {
		ok: true,
		value: logPlay(db, {
			id: values.id || undefined,
			stylusId: values.stylusId,
			kind: values.kind as PlayKind,
			// A phone clock running fast mustn't put plays in the future.
			playedAt:
				values.playedAt && Date.parse(values.playedAt) < now.getTime()
					? values.playedAt
					: now.toISOString()
		})
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
