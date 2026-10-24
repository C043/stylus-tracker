import { describe, expect, it } from 'vitest';
import { computeBackfilledRecords, describeBackfill } from './backfill';

describe('computeBackfilledRecords', () => {
	it('is 0 for a stylus installed on the day it is added', () => {
		expect(computeBackfilledRecords('2026-10-24', '2026-10-24')).toBe(0);
	});

	it('assumes one record per day before the day it is added', () => {
		expect(computeBackfilledRecords('2026-10-21', '2026-10-24')).toBe(3);
	});

	it('counts across month and year boundaries', () => {
		expect(computeBackfilledRecords('2026-09-12', '2026-10-24')).toBe(42);
		expect(computeBackfilledRecords('2025-12-25', '2026-01-04')).toBe(10);
	});

	it('does not gain or lose a record across a DST change', () => {
		expect(computeBackfilledRecords('2026-03-28', '2026-03-30')).toBe(2);
	});

	it('is stable when an edited installedOn is recomputed against the original createdOn', () => {
		const createdOn = '2026-10-01';
		expect(computeBackfilledRecords('2026-09-21', createdOn)).toBe(10);
		expect(computeBackfilledRecords('2026-09-26', createdOn)).toBe(5);
	});

	it('rejects an installedOn in the future', () => {
		expect(() => computeBackfilledRecords('2026-10-25', '2026-10-24')).toThrow(RangeError);
	});

	it('rejects invalid dates', () => {
		expect(() => computeBackfilledRecords('2026-02-30', '2026-10-24')).toThrow(RangeError);
	});
});

describe('describeBackfill', () => {
	it('is empty when nothing was backfilled', () => {
		expect(describeBackfill(0, '2026-10-24', '2026-10-24')).toBe('');
	});

	it('describes the estimate with the install date', () => {
		expect(describeBackfill(42, '2026-09-12', '2026-10-24')).toBe(
			'~42 records estimated since 12 Sep'
		);
	});

	it('uses the singular for one record', () => {
		expect(describeBackfill(1, '2026-10-23', '2026-10-24')).toBe(
			'~1 record estimated since 23 Oct'
		);
	});

	it('shows the year when installed in an earlier year', () => {
		expect(describeBackfill(3, '2025-12-30', '2026-01-02')).toBe(
			'~3 records estimated since 30 Dec 2025'
		);
	});
});
