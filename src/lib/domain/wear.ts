import { safeLimitHours, type StylusProfileId } from './stylus-profiles';

export const DEFAULT_MINUTES_PER_SIDE = 20;
/** Wear % at which the user should order a replacement. */
export const SOON_THRESHOLD_PERCENT = 75;

export type PlayKind = 'full' | 'side';
export type WearStatus = 'good' | 'soon' | 'replace';

const SIDES_PER_PLAY: Record<PlayKind, number> = { full: 2, side: 1 };

export interface WearInput {
	profile: StylusProfileId;
	customLifespanHours?: number;
	backfilledRecords: number;
	plays: readonly { kind: PlayKind }[];
	minutesPerSide?: number;
}

export interface Wear {
	usedSides: number;
	usedMinutes: number;
	limitMinutes: number;
	remainingSides: number;
	/** Shown big. */
	remainingRecords: number;
	/** Shown as "+ 1 side". */
	extraSide: boolean;
	/** 0–100. */
	wearPercent: number;
	status: WearStatus;
}

/** How much life a stylus has left (AGENTS.md §3.3). */
export function computeWear({
	profile,
	customLifespanHours,
	backfilledRecords,
	plays,
	minutesPerSide = DEFAULT_MINUTES_PER_SIDE
}: WearInput): Wear {
	if (!Number.isInteger(backfilledRecords) || backfilledRecords < 0) {
		throw new RangeError('backfilledRecords must be a non-negative integer');
	}
	if (!(minutesPerSide > 0)) throw new RangeError('minutesPerSide must be positive');

	const usedSides =
		backfilledRecords * 2 + plays.reduce((sum, p) => sum + SIDES_PER_PLAY[p.kind], 0);
	const usedMinutes = usedSides * minutesPerSide;
	const limitMinutes = safeLimitHours(profile, customLifespanHours) * 60;
	const remainingSides = Math.max(0, Math.floor((limitMinutes - usedMinutes) / minutesPerSide));
	const wearPercent = Math.min(100, (usedMinutes / limitMinutes) * 100);

	return {
		usedSides,
		usedMinutes,
		limitMinutes,
		remainingSides,
		remainingRecords: Math.floor(remainingSides / 2),
		extraSide: remainingSides % 2 === 1,
		wearPercent,
		status: wearPercent >= 100 ? 'replace' : wearPercent >= SOON_THRESHOLD_PERCENT ? 'soon' : 'good'
	};
}
