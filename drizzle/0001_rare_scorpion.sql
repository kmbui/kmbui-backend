CREATE TABLE `admin_users` (
	`user_id` text PRIMARY KEY NOT NULL,
	`hashed_password` text NOT NULL,
	`updated_at` integer,
	`created_at` integer DEFAULT '"2025-09-05T03:36:56.624Z"' NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE TABLE `key_usage_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`timestamp` integer DEFAULT '"2025-09-05T03:36:56.625Z"' NOT NULL,
	`api_user_id` text,
	`admin_user_id` text,
	`endpoint` text NOT NULL,
	`status` integer NOT NULL,
	FOREIGN KEY (`api_user_id`) REFERENCES `api_keys`(`user_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`admin_user_id`) REFERENCES `admin_users`(`user_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "id_check" CHECK(("key_usage_logs"."admin_user_id" IS NOT NULL) + ("key_usage_logs"."api_user_id" IS NOT NULL) = 1)
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_api_keys` (
	`user_id` text PRIMARY KEY NOT NULL,
	`key_string` text NOT NULL,
	`request_id` integer NOT NULL,
	`updated_at` integer,
	`created_at` integer DEFAULT '"2025-09-05T03:36:56.624Z"' NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`request_id`) REFERENCES `key_requests`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_api_keys`("user_id", "key_string", "request_id", "updated_at", "created_at", "deleted_at") SELECT "user_id", "key_string", "request_id", "updated_at", "created_at", "deleted_at" FROM `api_keys`;--> statement-breakpoint
DROP TABLE `api_keys`;--> statement-breakpoint
ALTER TABLE `__new_api_keys` RENAME TO `api_keys`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `api_keys_key_string_unique` ON `api_keys` (`key_string`);--> statement-breakpoint
CREATE TABLE `__new_key_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`requester_name` text NOT NULL,
	`request_description` text NOT NULL,
	`receipt` text NOT NULL,
	`hashed_password` text NOT NULL,
	`approved` integer DEFAULT false NOT NULL,
	`updated_at` integer,
	`created_at` integer DEFAULT '"2025-09-05T03:36:56.624Z"' NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
INSERT INTO `__new_key_requests`("id", "requester_name", "request_description", "receipt", "hashed_password", "approved", "updated_at", "created_at", "deleted_at") SELECT "id", "requester_name", "request_description", "receipt", "hashed_password", "approved", "updated_at", "created_at", "deleted_at" FROM `key_requests`;--> statement-breakpoint
DROP TABLE `key_requests`;--> statement-breakpoint
ALTER TABLE `__new_key_requests` RENAME TO `key_requests`;