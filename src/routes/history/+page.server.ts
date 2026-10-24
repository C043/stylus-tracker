import { toLocalDate } from '#lib/domain/dates.ts';
import { db } from '#lib/server/db/index.ts';
import { listHistory } from '#lib/server/repositories/history.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({
	rows: listHistory(db),
	today: toLocalDate(new Date())
});
