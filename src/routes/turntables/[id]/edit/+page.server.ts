import { error, fail, redirect } from '@sveltejs/kit';
import { turntableModelName } from '#lib/catalog/turntables.ts';
import { db } from '#lib/server/db/index.ts';
import { renameTurntableFromForm } from '#lib/server/forms/turntable.ts';
import { deleteTurntable, getTurntable } from '#lib/server/repositories/turntables.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const turntable = getTurntable(db, params.id);
	if (!turntable) error(404, 'Turntable not found');
	return { turntable, modelName: turntableModelName(turntable) };
};

export const actions: Actions = {
	rename: async ({ params, request }) => {
		const result = renameTurntableFromForm(db, params.id, await request.formData());
		if (!result.ok) return fail(400, { errors: result.errors, values: result.values });
		redirect(303, '/turntables');
	},
	// Already gone (resubmitted form, second tab) ends up in the same place.
	delete: ({ params }) => {
		deleteTurntable(db, params.id);
		redirect(303, '/turntables');
	}
};
