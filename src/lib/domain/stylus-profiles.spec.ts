import { describe, expect, it } from 'vitest';
import { STYLUS_PROFILES, safeLimitHours } from './stylus-profiles';

describe('safeLimitHours', () => {
	it.each([
		['sapphire', 40],
		['spherical', 300],
		['elliptical', 300],
		['nude-elliptical', 400],
		['shibata', 500],
		['line-contact', 600],
		['microline', 800]
	] as const)('uses the conservative low bound for %s', (profile, hours) => {
		expect(safeLimitHours(profile)).toBe(hours);
	});

	it('uses the user value for a custom profile', () => {
		expect(safeLimitHours('custom', 250)).toBe(250);
	});

	it('lets a custom lifespan override any profile', () => {
		expect(safeLimitHours('spherical', 450)).toBe(450);
	});

	it('throws for a custom profile without a valid lifespan', () => {
		expect(() => safeLimitHours('custom')).toThrow();
		expect(() => safeLimitHours('custom', 0)).toThrow();
	});
});

describe('STYLUS_PROFILES', () => {
	it('has a low bound <= high bound for every ranged profile', () => {
		for (const p of Object.values(STYLUS_PROFILES)) {
			if (p.range) expect(p.range[0]).toBeLessThanOrEqual(p.range[1]);
		}
	});
});
