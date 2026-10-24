/** Outcome of a form action: the created record, or per-field errors plus the raw values to re-fill the form. */
export type FormResult<T, F extends string> =
	| { ok: true; value: T }
	| { ok: false; errors: Partial<Record<F | 'form', string>>; values: Record<F, string> };

/** A trimmed text field; '' when missing or not text. */
export function text(form: FormData, key: string): string {
	const value = form.get(key);
	return typeof value === 'string' ? value.trim() : '';
}

/** Reads `keys` as trimmed strings, for echoing back on error. */
export function readValues<F extends string>(
	form: FormData,
	keys: readonly F[]
): Record<F, string> {
	return Object.fromEntries(keys.map((k) => [k, text(form, k)])) as Record<F, string>;
}
