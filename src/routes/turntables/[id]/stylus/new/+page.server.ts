import { error, fail, redirect } from '@sveltejs/kit';
import { turntableModelName } from '#lib/catalog/turntables.ts';
import { toLocalDate } from '#lib/domain/dates.ts';
import { db } from '#lib/server/db/index.ts';
import { addStylusFromForm, stylusDefaults } from '#lib/server/forms/stylus.ts';
import { getActiveStylus } from '#lib/server/repositories/styli.ts';
import { getTurntable } from '#lib/server/repositories/turntables.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const turntable = getTurntable(db, params.id);
	if (!turntable) error(404, 'Turntable not found');
	// Replacing an active stylus is its own flow (roadmap step 6).
	if (getActiveStylus(db, turntable.id)) redirect(303, '/');

	const serverToday = toLocalDate(new Date());
	return {
		turntable,
		modelName: turntableModelName(turntable),
		defaults: stylusDefaults(turntable, serverToday),
		serverToday
	};
};

export const actions: Actions = {
	default: async ({ params, request }) => {
		if (!getTurntable(db, params.id)) error(404, 'Turntable not found');
		const result = addStylusFromForm(
			db,
			params.id,
			await request.formData(),
			toLocalDate(new Date())
		);
		if (!result.ok) return fail(400, { errors: result.errors, values: result.values });
		redirect(303, '/');
	}
};
