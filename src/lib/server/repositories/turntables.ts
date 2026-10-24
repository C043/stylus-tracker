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
