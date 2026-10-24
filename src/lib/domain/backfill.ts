import { calendarDaysBetween, formatShortDate, type LocalDate } from './dates';

/**
 * Records assumed played on a backdated stylus: one full record per day from `installedOn`
 * up to (not including) `createdOn`. Computed once at creation and stored (AGENTS.md §3.4).
 */
export function computeBackfilledRecords(installedOn: LocalDate, createdOn: LocalDate): number {
	const days = calendarDaysBetween(installedOn, createdOn);
	if (days < 0) throw new RangeError('installedOn cannot be in the future');
	return days;
}

/** "~42 records estimated since 12 Sep", shown so the user can sanity-check the estimate; '' for none. */
export function describeBackfill(
	records: number,
	installedOn: LocalDate,
	createdOn: LocalDate
): string {
	if (records <= 0) return '';
	const noun = records === 1 ? 'record' : 'records';
	return `~${records} ${noun} estimated since ${formatShortDate(installedOn, createdOn)}`;
}
