import { describe, expect, it } from 'vitest';
import {
	calendarDaysBetween,
	formatShortDate,
	isLocalDate,
	resolveToday,
	toLocalDate
} from './dates';

describe('isLocalDate', () => {
	it.each(['2026-10-24', '2024-02-29', '2000-01-01'])('accepts %s', (value) => {
		expect(isLocalDate(value)).toBe(true);
	});

	it.each([
		'2026-1-24',
		'2026-13-01',
		'2026-02-30',
		'2025-02-29',
		'2026-10-24T00:00:00Z',
		'',
		'not a date'
	])('rejects %s', (value) => {
		expect(isLocalDate(value)).toBe(false);
	});
});

describe('calendarDaysBetween', () => {
	it('is 0 for the same day', () => {
		expect(calendarDaysBetween('2026-10-24', '2026-10-24')).toBe(0);
	});

	it('counts whole calendar days forward', () => {
		expect(calendarDaysBetween('2026-10-21', '2026-10-24')).toBe(3);
	});

	it('is negative when the first date is later', () => {
		expect(calendarDaysBetween('2026-10-24', '2026-10-21')).toBe(-3);
	});

	it('crosses a month boundary', () => {
		expect(calendarDaysBetween('2026-01-30', '2026-02-02')).toBe(3);
	});

	it('crosses a year boundary', () => {
		expect(calendarDaysBetween('2025-12-30', '2026-01-02')).toBe(3);
	});

	it('handles a leap day', () => {
		expect(calendarDaysBetween('2024-02-28', '2024-03-01')).toBe(2);
	});

	it('does not gain or lose a day across DST changes', () => {
		// EU spring forward (29 Mar 2026) and fall back (25 Oct 2026)
		expect(calendarDaysBetween('2026-03-28', '2026-03-30')).toBe(2);
		expect(calendarDaysBetween('2026-10-24', '2026-10-26')).toBe(2);
		// US spring forward (8 Mar 2026)
		expect(calendarDaysBetween('2026-03-07', '2026-03-09')).toBe(2);
	});

	it('throws on an invalid date', () => {
		expect(() => calendarDaysBetween('2026-02-30', '2026-03-01')).toThrow(RangeError);
		expect(() => calendarDaysBetween('2026-03-01', 'yesterday')).toThrow(RangeError);
	});
});

describe('toLocalDate', () => {
	it('formats a Date as its local calendar date', () => {
		expect(toLocalDate(new Date(2026, 9, 24, 23, 59))).toBe('2026-10-24');
		expect(toLocalDate(new Date(2026, 0, 5, 0, 0))).toBe('2026-01-05');
	});

	it('uses the local day during a DST transition hour', () => {
		expect(toLocalDate(new Date(2026, 2, 29, 2, 30))).toBe('2026-03-29');
	});
});

describe('formatShortDate', () => {
	it('shows day and short month', () => {
		expect(formatShortDate('2026-09-12', '2026-10-24')).toBe('12 Sep');
	});

	it('does not zero-pad the day', () => {
		expect(formatShortDate('2026-01-05', '2026-10-24')).toBe('5 Jan');
	});

	it('adds the year when it differs from the reference date', () => {
		expect(formatShortDate('2025-12-30', '2026-01-02')).toBe('30 Dec 2025');
	});

	it('rejects an invalid date', () => {
		expect(() => formatShortDate('2026-02-30', '2026-10-24')).toThrow(RangeError);
	});
});

describe('resolveToday', () => {
	const SERVER = '2026-10-24';

	it.each(['2026-10-23', '2026-10-24', '2026-10-25'])(
		"trusts the client's date within a day of the server (%s)",
		(client) => {
			expect(resolveToday(client, SERVER)).toBe(client);
		}
	);

	it.each([['2026-10-21'], ['2026-10-27'], ['2026-02-30'], ['yesterday'], [''], [null], [42]])(
		'falls back to the server date for %j',
		(client) => {
			expect(resolveToday(client, SERVER)).toBe(SERVER);
		}
	);
});
