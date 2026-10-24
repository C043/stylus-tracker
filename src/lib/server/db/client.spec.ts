import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { openDatabase } from './client';

describe('openDatabase', () => {
	it('applies all migrations so a fresh database is ready to use', () => {
		const { client } = openDatabase(':memory:');
		const tables = client
			.prepare(
				"SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE '\\_%' ESCAPE '\\' AND name NOT LIKE 'sqlite_%'"
			)
			.pluck()
			.all();
		expect(tables).toEqual(expect.arrayContaining(['turntable', 'stylus', 'play']));
	});

	it('creates the parent directory and can reopen a migrated file (container restart)', () => {
		const dir = mkdtempSync(join(tmpdir(), 'stylus-db-'));
		try {
			const path = join(dir, 'nested', 'stylus-tracker.db');
			openDatabase(path).client.close();
			const { client } = openDatabase(path);
			expect(client.pragma('journal_mode', { simple: true })).toBe('wal');
			client.close();
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	it('enforces foreign keys', () => {
		const { client } = openDatabase(':memory:');
		expect(client.pragma('foreign_keys', { simple: true })).toBe(1);
		expect(() =>
			client
				.prepare(
					"INSERT INTO stylus (id, turntable_id, profile, installed_on, created_on) VALUES ('s', 'missing', 'spherical', '2026-10-24', '2026-10-24')"
				)
				.run()
		).toThrow(/FOREIGN KEY/);
	});
});
