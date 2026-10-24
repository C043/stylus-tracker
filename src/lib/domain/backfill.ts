import { calendarDaysBetween, type LocalDate } from './dates';

/**
 * Records assumed played on a backdated stylus: one full record per day from `installedOn`
 * up to (not including) `createdOn`. Computed once at creation and stored (AGENTS.md §3.4).
 */
export function computeBackfilledRecords(installedOn: LocalDate, createdOn: LocalDate): number {
	const days = calendarDaysBetween(installedOn, createdOn);
	if (days < 0) throw new RangeError('installedOn cannot be in the future');
	return days;
}
