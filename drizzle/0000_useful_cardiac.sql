CREATE TABLE `admin_users` (
	`username` text PRIMARY KEY NOT NULL,
	`hashed_password` text NOT NULL,
	`updated_at` integer,
	`created_at` integer DEFAULT '"2025-09-06T08:36:12.636Z"' NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE TABLE `api_keys` (
	`username` text PRIMARY KEY NOT NULL,
	`key_string` text NOT NULL,
	`request_id` integer NOT NULL,
	`updated_at` integer,
	`created_at` integer DEFAULT '"2025-09-06T08:36:12.636Z"' NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`request_id`) REFERENCES `key_requests`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_keys_key_string_unique` ON `api_keys` (`key_string`);--> statement-breakpoint
CREATE TABLE `key_usage_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`timestamp` integer DEFAULT '"2025-09-06T08:36:12.637Z"' NOT NULL,
	`api_user_id` text,
	`admin_user_id` text,
	`endpoint` text NOT NULL,
	`status` integer NOT NULL,
	FOREIGN KEY (`api_user_id`) REFERENCES `api_keys`(`username`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`admin_user_id`) REFERENCES `admin_users`(`username`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "id_check" CHECK(("key_usage_logs"."admin_user_id" IS NOT NULL) + ("key_usage_logs"."api_user_id" IS NOT NULL) = 1)
);
--> statement-breakpoint
CREATE TABLE `key_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`requester_name` text NOT NULL,
	`request_description` text NOT NULL,
	`receipt` text NOT NULL,
	`hashed_password` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`updated_at` integer,
	`created_at` integer DEFAULT '"2025-09-06T08:36:12.636Z"' NOT NULL,
	`deleted_at` integer
);
