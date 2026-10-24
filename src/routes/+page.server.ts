import { fail, redirect } from '@sveltejs/kit';
import { toLocalDate } from '#lib/domain/dates.ts';
import { db } from '#lib/server/db/index.ts';
import { logPlayFromForm, undoPlayFromForm } from '#lib/server/forms/play.ts';
import { listDashboard } from '#lib/server/repositories/dashboard.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({
	rows: listDashboard(db),
	today: toLocalDate(new Date())
});

// Both redirect on success so refreshing after a no-JS post can't repeat it.
export const actions: Actions = {
	play: async ({ request }) => {
		const result = logPlayFromForm(db, await request.formData());
		if (!result.ok) {
			const error = result.errors.form ?? result.errors.kind;
			return fail(400, { stylusId: result.values.stylusId, error });
		}
		redirect(303, '/');
	},
	undo: async ({ request }) => {
		const result = undoPlayFromForm(db, await request.formData());
		if (!result.ok) {
			return fail(400, { stylusId: result.values.stylusId, error: result.errors.form });
		}
		redirect(303, '/');
	}
};
