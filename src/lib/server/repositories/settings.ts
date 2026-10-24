import { DEFAULT_MINUTES_PER_SIDE } from '../../domain/wear';
import type { Db } from '../db/client';
import { settings } from '../db/schema';

export interface Settings {
	/** Average length of one record side, used to turn plays into stylus hours. */
	minutesPerSide: number;
}

export const DEFAULT_SETTINGS: Settings = { minutesPerSide: DEFAULT_MINUTES_PER_SIDE };

export function getSettings(db: Db): Settings {
	const row = db.select({ minutesPerSide: settings.minutesPerSide }).from(settings).get();
	return row ?? DEFAULT_SETTINGS;
}

export function updateSettings(db: Db, input: Settings): Settings {
	return db
		.insert(settings)
		.values({ id: 1, ...input })
		.onConflictDoUpdate({ target: settings.id, set: input })
		.returning({ minutesPerSide: settings.minutesPerSide })
		.get();
}
