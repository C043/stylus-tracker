import { fail } from '@sveltejs/kit';
import { db } from '#lib/server/db/index.ts';
import { updateSettingsFromForm } from '#lib/server/forms/settings.ts';
import { getSettings } from '#lib/server/repositories/settings.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({ settings: getSettings(db) });

export const actions: Actions = {
	default: async ({ request }) => {
		const result = updateSettingsFromForm(db, await request.formData());
		if (!result.ok) return fail(400, { errors: result.errors, values: result.values });
		return { saved: true };
	}
};
