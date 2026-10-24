/** A local calendar date, `YYYY-MM-DD`. No time, no timezone. */
export type LocalDate = string;

const LOCAL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

/** Days since the Unix epoch, or null if `value` isn't a real calendar date. */
function epochDay(value: string): number | null {
	const match = LOCAL_DATE.exec(value);
	if (!match) return null;
	const [y, m, d] = match.slice(1).map(Number);
	// UTC has no DST, so every calendar day is exactly 24h long here.
	const ms = Date.UTC(y, m - 1, d);
	const back = new Date(ms);
	if (back.getUTCFullYear() !== y || back.getUTCMonth() !== m - 1 || back.getUTCDate() !== d) {
		return null;
	}
	return ms / MS_PER_DAY;
}

export function isLocalDate(value: string): value is LocalDate {
	return epochDay(value) !== null;
}

/** Whole calendar days from `from` to `to` (negative if `to` is earlier). */
export function calendarDaysBetween(from: LocalDate, to: LocalDate): number {
	const a = epochDay(from);
	const b = epochDay(to);
	if (a === null) throw new RangeError(`Invalid local date: ${from}`);
	if (b === null) throw new RangeError(`Invalid local date: ${to}`);
	return b - a;
}

/** The date `days` calendar days after `date` (before it, if negative). */
export function addDays(date: LocalDate, days: number): LocalDate {
	const day = epochDay(date);
	if (day === null) throw new RangeError(`Invalid local date: ${date}`);
	return new Date((day + days) * MS_PER_DAY).toISOString().slice(0, 10);
}

/** The calendar date of `date` in the runtime's local timezone. */
export function toLocalDate(date: Date): LocalDate {
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "12 Sep", or "12 Sep 2025" when the year differs from `reference`. */
export function formatShortDate(date: LocalDate, reference: LocalDate): string {
	if (!isLocalDate(date)) throw new RangeError(`Invalid local date: ${date}`);
	const [y, m, d] = date.split('-').map(Number);
	const short = `${d} ${MONTHS[m - 1]}`;
	return reference.startsWith(`${y}-`) ? short : `${short} ${y}`;
}

/**
 * The user's "today". The browser sends its local date (the server can't know the phone's
 * timezone); trust it only if it's a real date within a day of the server's own date.
 */
export function resolveToday(submitted: unknown, serverToday: LocalDate): LocalDate {
	if (typeof submitted !== 'string' || !isLocalDate(submitted)) return serverToday;
	return Math.abs(calendarDaysBetween(serverToday, submitted)) <= 1 ? submitted : serverToday;
}
