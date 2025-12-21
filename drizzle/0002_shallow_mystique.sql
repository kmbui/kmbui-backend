CREATE TABLE `magazines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`thumbnail_url` text NOT NULL,
	`content_url` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`updated_at` integer,
	`created_at` integer DEFAULT '"2025-12-17T03:11:53.039Z"' NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
DROP INDEX "api_keys_key_string_unique";--> statement-breakpoint
ALTER TABLE `admin_users` ALTER COLUMN "created_at" TO "created_at" integer NOT NULL DEFAULT '"2025-12-17T03:11:53.032Z"';--> statement-breakpoint
CREATE UNIQUE INDEX `api_keys_key_string_unique` ON `api_keys` (`key_string`);--> statement-breakpoint
ALTER TABLE `api_keys` ALTER COLUMN "created_at" TO "created_at" integer NOT NULL DEFAULT '"2025-12-17T03:11:53.032Z"';--> statement-breakpoint
ALTER TABLE `api_keys` ADD `revoked` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `key_usage_logs` ALTER COLUMN "timestamp" TO "timestamp" integer NOT NULL DEFAULT '"2025-12-17T03:11:53.033Z"';--> statement-breakpoint
ALTER TABLE `key_requests` ALTER COLUMN "created_at" TO "created_at" integer NOT NULL DEFAULT '"2025-12-17T03:11:53.032Z"';