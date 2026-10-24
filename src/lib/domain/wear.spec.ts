import { describe, expect, it } from 'vitest';
import { computeWear, DEFAULT_MINUTES_PER_SIDE, type PlayKind } from './wear';

const plays = (...kinds: PlayKind[]) => kinds.map((kind) => ({ kind }));

// Spherical: 300 h safe limit = 18 000 min = 900 sides = 450 records at 20 min/side.
const spherical = { profile: 'spherical', backfilledRecords: 0, plays: [] } as const;

describe('computeWear', () => {
	it('defaults to 20 minutes per side', () => {
		expect(DEFAULT_MINUTES_PER_SIDE).toBe(20);
	});

	it('reports the full lifespan for a new stylus with zero plays', () => {
		expect(computeWear(spherical)).toEqual({
			usedSides: 0,
			usedMinutes: 0,
			limitMinutes: 18_000,
			remainingSides: 900,
			remainingRecords: 450,
			extraSide: false,
			wearPercent: 0,
			status: 'good'
		});
	});

	it('counts a full record as 2 sides and a half record as 1', () => {
		const wear = computeWear({ ...spherical, plays: plays('full', 'side', 'full') });
		expect(wear.usedSides).toBe(5);
		expect(wear.usedMinutes).toBe(100);
	});

	it('shows an extra side when an odd number of sides remains', () => {
		const wear = computeWear({ ...spherical, plays: plays('side') });
		expect(wear.remainingSides).toBe(899);
		expect(wear.remainingRecords).toBe(449);
		expect(wear.extraSide).toBe(true);
	});

	it('adds backfilled records as full records', () => {
		const wear = computeWear({ ...spherical, backfilledRecords: 10, plays: plays('full', 'side') });
		expect(wear.usedSides).toBe(23);
		expect(wear.remainingRecords).toBe(438);
		expect(wear.extraSide).toBe(true);
		expect(wear.wearPercent).toBeCloseTo((23 / 900) * 100);
	});

	it('hits zero and "replace" exactly at the limit', () => {
		// Sapphire: 40 h = 120 sides = 60 records.
		const wear = computeWear({ profile: 'sapphire', backfilledRecords: 60, plays: [] });
		expect(wear.remainingSides).toBe(0);
		expect(wear.remainingRecords).toBe(0);
		expect(wear.extraSide).toBe(false);
		expect(wear.wearPercent).toBe(100);
		expect(wear.status).toBe('replace');
	});

	it('never goes negative or above 100 % past the limit', () => {
		const wear = computeWear({ profile: 'sapphire', backfilledRecords: 70, plays: plays('side') });
		expect(wear.remainingSides).toBe(0);
		expect(wear.remainingRecords).toBe(0);
		expect(wear.extraSide).toBe(false);
		expect(wear.wearPercent).toBe(100);
		expect(wear.status).toBe('replace');
	});

	it('switches from "good" to "soon" at 75 % wear', () => {
		// 75 % of 900 sides = 675 sides.
		expect(computeWear({ ...spherical, backfilledRecords: 337 }).status).toBe('good');
		expect(computeWear({ ...spherical, backfilledRecords: 337, plays: plays('side') }).status).toBe(
			'soon'
		);
	});

	it('stays "soon" just below 100 %', () => {
		const wear = computeWear({ ...spherical, backfilledRecords: 449, plays: plays('side') });
		expect(wear.remainingSides).toBe(1);
		expect(wear.remainingRecords).toBe(0);
		expect(wear.extraSide).toBe(true);
		expect(wear.status).toBe('soon');
	});

	it('uses a custom lifespan for the custom profile', () => {
		// 10 h = 600 min = 30 sides.
		const wear = computeWear({
			profile: 'custom',
			customLifespanHours: 10,
			backfilledRecords: 0,
			plays: plays('full')
		});
		expect(wear.limitMinutes).toBe(600);
		expect(wear.remainingRecords).toBe(14);
	});

	it('rounds a partial remaining side down', () => {
		// 10.5 h = 630 min = 31.5 sides → 31 safe sides.
		const wear = computeWear({
			profile: 'custom',
			customLifespanHours: 10.5,
			backfilledRecords: 0,
			plays: []
		});
		expect(wear.remainingSides).toBe(31);
		expect(wear.remainingRecords).toBe(15);
		expect(wear.extraSide).toBe(true);
	});

	it('honours a different minutes-per-side setting', () => {
		const wear = computeWear({ ...spherical, minutesPerSide: 25, plays: plays('full') });
		expect(wear.usedMinutes).toBe(50);
		expect(wear.remainingSides).toBe(718);
	});

	it('computes final wear for a retired stylus from its own plays', () => {
		// Retirement doesn't change the maths; history shows the wear at retirement.
		const wear = computeWear({
			profile: 'elliptical',
			backfilledRecords: 400,
			plays: plays('full')
		});
		expect(wear.usedSides).toBe(802);
		expect(wear.status).toBe('soon');
	});

	it('rejects invalid inputs', () => {
		expect(() => computeWear({ ...spherical, backfilledRecords: -1 })).toThrow(RangeError);
		expect(() => computeWear({ ...spherical, backfilledRecords: 1.5 })).toThrow(RangeError);
		expect(() => computeWear({ ...spherical, minutesPerSide: 0 })).toThrow(RangeError);
		expect(() => computeWear({ profile: 'custom', backfilledRecords: 0, plays: [] })).toThrow();
	});
});
