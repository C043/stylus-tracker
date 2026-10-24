export type StylusProfileId =
	| 'sapphire'
	| 'spherical'
	| 'elliptical'
	| 'nude-elliptical'
	| 'shibata'
	| 'line-contact'
	| 'microline'
	| 'custom';

export interface StylusProfile {
	id: StylusProfileId;
	label: string;
	/** Lifespan range in playing hours; null for custom. */
	range: readonly [number, number] | null;
}

export const STYLUS_PROFILES: Record<StylusProfileId, StylusProfile> = {
	sapphire: { id: 'sapphire', label: 'Ceramic / sapphire', range: [40, 60] },
	spherical: { id: 'spherical', label: 'Spherical / conical', range: [300, 500] },
	elliptical: { id: 'elliptical', label: 'Elliptical (bonded)', range: [300, 500] },
	'nude-elliptical': { id: 'nude-elliptical', label: 'Elliptical (nude)', range: [400, 600] },
	shibata: { id: 'shibata', label: 'Shibata', range: [500, 1000] },
	'line-contact': { id: 'line-contact', label: 'Line contact / Fine line', range: [600, 1000] },
	microline: { id: 'microline', label: 'MicroLine / Micro-Ridge', range: [800, 1200] },
	custom: { id: 'custom', label: 'Custom', range: null }
};

/** Conservative lifespan used for "safe to play" maths. A custom lifespan always wins. */
export function safeLimitHours(profile: StylusProfileId, customLifespanHours?: number): number {
	if (customLifespanHours !== undefined) {
		if (!(customLifespanHours > 0)) throw new Error('Custom lifespan must be a positive number');
		return customLifespanHours;
	}
	const range = STYLUS_PROFILES[profile].range;
	if (!range) throw new Error('Custom profile requires a lifespan in hours');
	return range[0];
}
