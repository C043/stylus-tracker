CREATE TABLE `settings` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`minutes_per_side` integer NOT NULL,
	CONSTRAINT "settings_single_row" CHECK("settings"."id" = 1)
);
