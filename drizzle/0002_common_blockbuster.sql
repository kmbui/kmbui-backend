CREATE TABLE `articles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`subtitle` text NOT NULL,
	`theme` text NOT NULL,
	`writer` text NOT NULL,
	`content` text NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s','now')) NOT NULL,
	`created_at` integer DEFAULT (strftime('%s','now')) NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
DROP INDEX "api_keys_key_string_unique";--> statement-breakpoint
ALTER TABLE `admin_users` ALTER COLUMN "created_at" TO "created_at" integer NOT NULL DEFAULT '"2025-09-13T09:14:19.864Z"';--> statement-breakpoint
CREATE UNIQUE INDEX `api_keys_key_string_unique` ON `api_keys` (`key_string`);--> statement-breakpoint
ALTER TABLE `api_keys` ALTER COLUMN "created_at" TO "created_at" integer NOT NULL DEFAULT '"2025-09-13T09:14:19.864Z"';--> statement-breakpoint
ALTER TABLE `key_usage_logs` ALTER COLUMN "timestamp" TO "timestamp" integer NOT NULL DEFAULT '"2025-09-13T09:14:19.865Z"';--> statement-breakpoint
ALTER TABLE `key_requests` ALTER COLUMN "created_at" TO "created_at" integer NOT NULL DEFAULT '"2025-09-13T09:14:19.864Z"';