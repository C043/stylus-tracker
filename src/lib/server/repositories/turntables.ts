import { asc, eq } from 'drizzle-orm';
import type { Db } from '../db/client';
import { turntable } from '../db/schema';

export type Turntable = typeof turntable.$inferSelect;
export type NewTurntable = Pick<
	typeof turntable.$inferInsert,
	'name' | 'catalogId' | 'brand' | 'model' | 'createdAt'
>;

export function createTurntable(db: Db, input: NewTurntable): Turntable {
	return db.insert(turntable).values(input).returning().get();
}

export function getTurntable(db: Db, id: string): Turntable | undefined {
	return db.select().from(turntable).where(eq(turntable.id, id)).get();
}

export function listTurntables(db: Db): Turntable[] {
	return db.select().from(turntable).orderBy(asc(turntable.createdAt)).all();
}

export function renameTurntable(db: Db, id: string, name: string): Turntable | undefined {
	return db.update(turntable).set({ name }).where(eq(turntable.id, id)).returning().get();
}

/** Deletes a turntable; its styli (history included) and their plays go with it (FK cascade). */
export function deleteTurntable(db: Db, id: string): boolean {
	return db.delete(turntable).where(eq(turntable.id, id)).run().changes > 0;
}
