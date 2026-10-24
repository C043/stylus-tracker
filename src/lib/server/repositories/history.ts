import { desc, eq, isNotNull } from 'drizzle-orm';
import type { Db } from '../db/client';
import { stylus, turntable } from '../db/schema';
import { getStylusWear } from './plays';
import type { Stylus } from './styli';
import type { Turntable } from './turntables';

export interface HistoryRow {
	turntable: Turntable;
	stylus: Stylus;
	/** Backfilled records plus logged plays, in sides. */
	sidesPlayed: number;
	wearPercent: number;
}

/** Every retired stylus with its turntable and how much it played, most recently retired first. */
export function listHistory(db: Db): HistoryRow[] {
	return db
		.select({ turntable, stylus })
		.from(stylus)
		.innerJoin(turntable, eq(stylus.turntableId, turntable.id))
		.where(isNotNull(stylus.retiredOn))
		.orderBy(desc(stylus.retiredOn), desc(stylus.installedOn))
		.all()
		.map((row) => {
			const wear = getStylusWear(db, row.stylus.id);
			return { ...row, sidesPlayed: wear.usedSides, wearPercent: wear.wearPercent };
		});
}
