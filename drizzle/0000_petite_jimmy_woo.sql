CREATE TABLE `api_keys` (
	`user_id` text PRIMARY KEY NOT NULL,
	`key_string` text NOT NULL,
	`request_id` integer NOT NULL,
	`updated_at` integer,
	`created_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`request_id`) REFERENCES `key_requests`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_keys_key_string_unique` ON `api_keys` (`key_string`);--> statement-breakpoint
CREATE TABLE `key_requests` (
	`id` integer PRIMARY KEY NOT NULL,
	`requester_name` text NOT NULL,
	`request_description` text NOT NULL,
	`receipt` text NOT NULL,
	`hashed_password` text NOT NULL,
	`approved` integer DEFAULT false NOT NULL,
	`updated_at` integer,
	`created_at` integer NOT NULL,
	`deleted_at` integer
);
