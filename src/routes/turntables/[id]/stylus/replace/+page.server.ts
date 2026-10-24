import { error, fail, redirect } from '@sveltejs/kit';
import { turntableModelName } from '#lib/catalog/turntables.ts';
import { toLocalDate } from '#lib/domain/dates.ts';
import { db } from '#lib/server/db/index.ts';
import { replacementDefaults, replaceStylusFromForm } from '#lib/server/forms/stylus.ts';
import { getActiveStylus } from '#lib/server/repositories/styli.ts';
import { getTurntable } from '#lib/server/repositories/turntables.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const turntable = getTurntable(db, params.id);
	if (!turntable) error(404, 'Turntable not found');
	const previous = getActiveStylus(db, turntable.id);
	// Nothing to replace yet: the first stylus is added, not swapped in.
	if (!previous) redirect(303, `/turntables/${turntable.id}/stylus/new`);

	const serverToday = toLocalDate(new Date());
	return {
		turntable,
		modelName: turntableModelName(turntable),
		previous,
		defaults: replacementDefaults(previous, serverToday),
		serverToday
	};
};

export const actions: Actions = {
	default: async ({ params, request }) => {
		if (!getTurntable(db, params.id)) error(404, 'Turntable not found');
		const result = replaceStylusFromForm(
			db,
			params.id,
			await request.formData(),
			toLocalDate(new Date())
		);
		if (!result.ok) return fail(400, { errors: result.errors, values: result.values });
		redirect(303, '/');
	}
};
