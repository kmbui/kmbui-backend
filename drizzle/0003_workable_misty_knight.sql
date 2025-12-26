DROP INDEX "api_keys_key_string_unique";--> statement-breakpoint
ALTER TABLE `admin_users` ALTER COLUMN "created_at" TO "created_at" integer NOT NULL DEFAULT '"2025-12-25T02:51:03.753Z"';--> statement-breakpoint
CREATE UNIQUE INDEX `api_keys_key_string_unique` ON `api_keys` (`key_string`);--> statement-breakpoint
ALTER TABLE `api_keys` ALTER COLUMN "created_at" TO "created_at" integer NOT NULL DEFAULT '"2025-12-25T02:51:03.753Z"';--> statement-breakpoint
ALTER TABLE `key_usage_logs` ALTER COLUMN "timestamp" TO "timestamp" integer NOT NULL DEFAULT '"2025-12-25T02:51:03.754Z"';--> statement-breakpoint
ALTER TABLE `key_requests` ALTER COLUMN "created_at" TO "created_at" integer NOT NULL DEFAULT '"2025-12-25T02:51:03.753Z"';--> statement-breakpoint
ALTER TABLE `magazines` ALTER COLUMN "content_url" TO "content_url" text;--> statement-breakpoint
ALTER TABLE `magazines` ALTER COLUMN "created_at" TO "created_at" integer NOT NULL DEFAULT (unixepoch());