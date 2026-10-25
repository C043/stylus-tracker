import { and, desc, eq, isNull } from 'drizzle-orm';
import { computeBackfilledRecords } from '../../domain/backfill';
import type { LocalDate } from '../../domain/dates';
import type { StylusProfileId } from '../../domain/stylus-profiles';
import type { Db, Executor } from '../db/client';
import { stylus } from '../db/schema';

export type Stylus = typeof stylus.$inferSelect;

export interface NewStylus {
	turntableId: string;
	profile: StylusProfileId;
	cartridge?: string | null;
	customLifespanHours?: number | null;
	installedOn: LocalDate;
	/** The user's local date; becomes `createdOn`. */
	today: LocalDate;
}

export function getStylus(db: Executor, id: string): Stylus | undefined {
	return db.select().from(stylus).where(eq(stylus.id, id)).get();
}

export function getActiveStylus(db: Executor, turntableId: string): Stylus | undefined {
	return db
		.select()
		.from(stylus)
		.where(and(eq(stylus.turntableId, turntableId), isNull(stylus.retiredOn)))
		.get();
}

/** Every stylus a turntable has had, newest install first. */
export function listStyli(db: Db, turntableId: string): Stylus[] {
	return db
		.select()
		.from(stylus)
		.where(eq(stylus.turntableId, turntableId))
		.orderBy(desc(stylus.installedOn), desc(stylus.createdOn))
		.all();
}

function insertStylus(db: Executor, { today, ...input }: NewStylus): Stylus {
	if (getActiveStylus(db, input.turntableId)) {
		throw new Error('Turntable already has an active stylus; replace it instead');
	}
	return db
		.insert(stylus)
		.values({
			...input,
			createdOn: today,
			// Frozen here; only logged plays count from now on (AGENTS.md §3.4).
			backfilledRecords: computeBackfilledRecords(input.installedOn, today)
		})
		.returning()
		.get();
}

/** Installs the first stylus on a turntable. Throws if one is already active. */
export function addStylus(db: Db, input: NewStylus): Stylus {
	return db.transaction((tx) => insertStylus(tx, input));
}

/** Retires the active stylus (if any) today and installs a new one, atomically. */
export function replaceStylus(db: Db, input: NewStylus): Stylus {
	return db.transaction((tx) => {
		tx.update(stylus)
			.set({ retiredOn: input.today })
			.where(and(eq(stylus.turntableId, input.turntableId), isNull(stylus.retiredOn)))
			.run();
		return insertStylus(tx, input);
	});
}

/**
 * Corrects the active stylus's details. A new install date recomputes the backfill against the
 * original `createdOn` (AGENTS.md §3.4).
 */
export function updateStylus(
	db: Db,
	id: string,
	changes: { installedOn?: LocalDate; cartridge?: string | null }
): Stylus {
	const existing = getStylus(db, id);
	if (!existing) throw new Error(`Stylus ${id} not found`);
	const { installedOn } = changes;
	return db
		.update(stylus)
		.set({
			...changes,
			...(installedOn && {
				backfilledRecords: computeBackfilledRecords(installedOn, existing.createdOn)
			})
		})
		.where(eq(stylus.id, id))
		.returning()
		.get();
}
