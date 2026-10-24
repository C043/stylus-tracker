import { fail, redirect } from '@sveltejs/kit';
import { db } from '#lib/server/db/index.ts';
import { addTurntableFromForm } from '#lib/server/forms/turntable.ts';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request }) => {
		const result = addTurntableFromForm(db, await request.formData());
		if (!result.ok) return fail(400, { errors: result.errors, values: result.values });
		redirect(303, `/turntables/${result.value.id}/stylus/new`);
	}
};
