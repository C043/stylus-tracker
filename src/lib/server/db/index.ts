import { openDatabase } from './client';
import { DATABASE_URL } from '$app/env/private';

if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');

// Migrations run here; src/hooks.server.ts imports this at boot so `docker compose up`
// is the only setup step.
export const { db } = openDatabase(DATABASE_URL);
