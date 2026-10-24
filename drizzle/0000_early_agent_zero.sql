CREATE TABLE `play` (
	`id` text PRIMARY KEY NOT NULL,
	`stylus_id` text NOT NULL,
	`kind` text NOT NULL,
	`played_at` text NOT NULL,
	FOREIGN KEY (`stylus_id`) REFERENCES `stylus`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `play_stylus_idx` ON `play` (`stylus_id`);--> statement-breakpoint
CREATE TABLE `stylus` (
	`id` text PRIMARY KEY NOT NULL,
	`turntable_id` text NOT NULL,
	`profile` text NOT NULL,
	`cartridge` text,
	`custom_lifespan_hours` real,
	`installed_on` text NOT NULL,
	`created_on` text NOT NULL,
	`backfilled_records` integer DEFAULT 0 NOT NULL,
	`retired_on` text,
	FOREIGN KEY (`turntable_id`) REFERENCES `turntable`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `stylus_turntable_idx` ON `stylus` (`turntable_id`);--> statement-breakpoint
CREATE TABLE `turntable` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`catalog_id` text,
	`brand` text,
	`model` text,
	`created_at` text NOT NULL
);
