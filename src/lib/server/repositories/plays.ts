import { asc, desc, eq, sql } from 'drizzle-orm';
import type { StylusProfileId } from '../../domain/stylus-profiles';
import { computeWear, type PlayKind, type Wear } from '../../domain/wear';
import type { Db, Executor } from '../db/client';
import { play } from '../db/schema';
import { getStylus } from './styli';

export type Play = typeof play.$inferSelect;

export interface NewPlay {
	stylusId: string;
	kind: PlayKind;
	/** ISO timestamp; defaults to now. */
	playedAt?: string;
}

function requireStylus(db: Db, id: string) {
	const found = getStylus(db, id);
	if (!found) throw new Error(`Stylus ${id} not found`);
	return found;
}

export function logPlay(db: Db, input: NewPlay): Play {
	if (requireStylus(db, input.stylusId).retiredOn) {
		throw new Error('Cannot log a play on a retired stylus');
	}
	return db.insert(play).values(input).returning().get();
}

/** Plays of a stylus, oldest first. */
export function listPlays(db: Db, stylusId: string): Play[] {
	return db
		.select()
		.from(play)
		.where(eq(play.stylusId, stylusId))
		.orderBy(asc(play.playedAt), asc(sql`rowid`))
		.all();
}

const newestFirst = [desc(play.playedAt), desc(sql`rowid`)] as const;

/** The most recent play of a stylus, or undefined if none was logged. */
export function getLastPlay(db: Executor, stylusId: string): Play | undefined {
	return db
		.select()
		.from(play)
		.where(eq(play.stylusId, stylusId))
		.orderBy(...newestFirst)
		.get();
}

/** Deletes the most recent play of a stylus and returns it, or undefined if there was none. */
export function undoLastPlay(db: Db, stylusId: string): Play | undefined {
	return db.transaction((tx) => {
		const last = getLastPlay(tx, stylusId);
		if (last) tx.delete(play).where(eq(play.id, last.id)).run();
		return last;
	});
}

export function getStylusWear(db: Db, stylusId: string, minutesPerSide?: number): Wear {
	const s = requireStylus(db, stylusId);
	return computeWear({
		profile: s.profile as StylusProfileId,
		customLifespanHours: s.customLifespanHours ?? undefined,
		backfilledRecords: s.backfilledRecords,
		plays: listPlays(db, stylusId),
		minutesPerSide
	});
}
