import { error, fail, redirect } from '@sveltejs/kit';
import { turntableModelName } from '#lib/catalog/turntables.ts';
import { db } from '#lib/server/db/index.ts';
import { editInstalledOnFromForm } from '#lib/server/forms/stylus.ts';
import { getActiveStylus } from '#lib/server/repositories/styli.ts';
import { getTurntable } from '#lib/server/repositories/turntables.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const turntable = getTurntable(db, params.id);
	if (!turntable) error(404, 'Turntable not found');
	const stylus = getActiveStylus(db, turntable.id);
	if (!stylus) redirect(303, `/turntables/${turntable.id}/stylus/new`);

	return { turntable, modelName: turntableModelName(turntable), stylus };
};

export const actions: Actions = {
	default: async ({ params, request }) => {
		if (!getTurntable(db, params.id)) error(404, 'Turntable not found');
		const result = editInstalledOnFromForm(db, params.id, await request.formData());
		if (!result.ok) return fail(400, { errors: result.errors, values: result.values });
		redirect(303, '/');
	}
};
