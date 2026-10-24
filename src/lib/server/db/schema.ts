import { sql } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

const id = () =>
	text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID());

export const turntable = sqliteTable('turntable', {
	id: id(),
	name: text('name').notNull(),
	// Set when picked from src/lib/catalog; null for custom turntables.
	catalogId: text('catalog_id'),
	brand: text('brand'),
	model: text('model'),
	createdAt: text('created_at')
		.notNull()
		.$defaultFn(() => new Date().toISOString())
});

export const stylus = sqliteTable(
	'stylus',
	{
		id: id(),
		turntableId: text('turntable_id')
			.notNull()
			.references(() => turntable.id, { onDelete: 'cascade' }),
		// One of the ids in src/lib/domain/stylus-profiles.ts
		profile: text('profile').notNull(),
		cartridge: text('cartridge'),
		customLifespanHours: real('custom_lifespan_hours'),
		// Local calendar dates, YYYY-MM-DD (see AGENTS.md §3.4)
		installedOn: text('installed_on').notNull(),
		createdOn: text('created_on').notNull(),
		backfilledRecords: integer('backfilled_records').notNull().default(0),
		retiredOn: text('retired_on')
	},
	(t) => [
		index('stylus_turntable_idx').on(t.turntableId),
		// Exactly one active stylus per turntable; retired ones are history.
		uniqueIndex('stylus_one_active_idx')
			.on(t.turntableId)
			.where(sql`${t.retiredOn} IS NULL`)
	]
);

export const play = sqliteTable(
	'play',
	{
		id: id(),
		stylusId: text('stylus_id')
			.notNull()
			.references(() => stylus.id, { onDelete: 'cascade' }),
		kind: text('kind', { enum: ['full', 'side'] }).notNull(),
		playedAt: text('played_at')
			.notNull()
			.$defaultFn(() => new Date().toISOString())
	},
	(t) => [index('play_stylus_idx').on(t.stylusId)]
);
