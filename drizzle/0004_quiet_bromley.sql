ALTER TABLE `magazines` RENAME COLUMN "content_url" TO "resource_uri";--> statement-breakpoint
DROP INDEX "api_keys_key_string_unique";--> statement-breakpoint
ALTER TABLE `admin_users` ALTER COLUMN "created_at" TO "created_at" integer NOT NULL DEFAULT '"2025-12-26T06:21:54.288Z"';--> statement-breakpoint
CREATE UNIQUE INDEX `api_keys_key_string_unique` ON `api_keys` (`key_string`);--> statement-breakpoint
ALTER TABLE `api_keys` ALTER COLUMN "created_at" TO "created_at" integer NOT NULL DEFAULT '"2025-12-26T06:21:54.288Z"';--> statement-breakpoint
ALTER TABLE `key_usage_logs` ALTER COLUMN "timestamp" TO "timestamp" integer NOT NULL DEFAULT '"2025-12-26T06:21:54.289Z"';--> statement-breakpoint
ALTER TABLE `key_requests` ALTER COLUMN "created_at" TO "created_at" integer NOT NULL DEFAULT '"2025-12-26T06:21:54.288Z"';