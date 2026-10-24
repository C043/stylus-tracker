import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';
import * as schema from './schema';

/** Opens (creating if needed) a SQLite database and applies pending migrations. */
export function openDatabase(url: string, migrationsFolder = 'drizzle') {
	if (url !== ':memory:') mkdirSync(dirname(url), { recursive: true });
	const client = new Database(url);
	client.pragma('journal_mode = WAL');
	client.pragma('foreign_keys = ON');

	const db = drizzle(client, { schema });
	migrate(db, { migrationsFolder });
	return { client, db };
}

export type Db = ReturnType<typeof openDatabase>['db'];
