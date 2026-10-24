import { toLocalDate } from '#lib/domain/dates.ts';
import { db } from '#lib/server/db/index.ts';
import { listDashboard } from '#lib/server/repositories/dashboard.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({
	rows: listDashboard(db),
	today: toLocalDate(new Date())
});
