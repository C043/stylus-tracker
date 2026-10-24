import type { Wear } from '../../domain/wear';
import type { Db } from '../db/client';
import { getLastPlay, getStylusWear, type Play } from './plays';
import { getActiveStylus, type Stylus } from './styli';
import { listTurntables, type Turntable } from './turntables';

export interface DashboardRow {
	turntable: Turntable;
	/** The active stylus, or null until one is added. */
	stylus: Stylus | null;
	wear: Wear | null;
	/** The active stylus's most recent logged play, for undo; null if there is none. */
	lastPlay: Play | null;
}

/** Every turntable with its active stylus and how worn it is, oldest turntable first. */
export function listDashboard(db: Db): DashboardRow[] {
	return listTurntables(db).map((turntable) => {
		const stylus = getActiveStylus(db, turntable.id) ?? null;
		if (!stylus) return { turntable, stylus, wear: null, lastPlay: null };
		return {
			turntable,
			stylus,
			wear: getStylusWear(db, stylus.id),
			lastPlay: getLastPlay(db, stylus.id) ?? null
		};
	});
}
