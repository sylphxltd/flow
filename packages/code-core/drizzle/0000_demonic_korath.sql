CREATE TABLE `codebase_files` (
	`path` text PRIMARY KEY NOT NULL,
	`mtime` integer NOT NULL,
	`hash` text NOT NULL,
	`content` text,
	`language` text,
	`size` integer,
	`indexed_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_codebase_files_mtime` ON `codebase_files` (`mtime`);--> statement-breakpoint
CREATE INDEX `idx_codebase_files_hash` ON `codebase_files` (`hash`);--> statement-breakpoint
CREATE TABLE `codebase_metadata` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `memory` (
	`key` text NOT NULL,
	`namespace` text DEFAULT 'default' NOT NULL,
	`value` text NOT NULL,
	`timestamp` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`key`, `namespace`)
);
--> statement-breakpoint
CREATE INDEX `idx_memory_namespace` ON `memory` (`namespace`);--> statement-breakpoint
CREATE INDEX `idx_memory_timestamp` ON `memory` (`timestamp`);--> statement-breakpoint
CREATE INDEX `idx_memory_key` ON `memory` (`key`);--> statement-breakpoint
CREATE TABLE `message_attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`message_id` text NOT NULL,
	`path` text NOT NULL,
	`relative_path` text NOT NULL,
	`size` integer,
	FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_message_attachments_message` ON `message_attachments` (`message_id`);--> statement-breakpoint
CREATE INDEX `idx_message_attachments_path` ON `message_attachments` (`path`);--> statement-breakpoint
CREATE TABLE `message_parts` (
	`id` text PRIMARY KEY NOT NULL,
	`message_id` text NOT NULL,
	`ordering` integer NOT NULL,
	`type` text NOT NULL,
	`content` text NOT NULL,
	FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_message_parts_message` ON `message_parts` (`message_id`);--> statement-breakpoint
CREATE INDEX `idx_message_parts_ordering` ON `message_parts` (`message_id`,`ordering`);--> statement-breakpoint
CREATE INDEX `idx_message_parts_type` ON `message_parts` (`type`);--> statement-breakpoint
CREATE TABLE `message_todo_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`message_id` text NOT NULL,
	`todo_id` integer NOT NULL,
	`content` text NOT NULL,
	`active_form` text NOT NULL,
	`status` text NOT NULL,
	`ordering` integer NOT NULL,
	FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_message_todo_snapshots_message` ON `message_todo_snapshots` (`message_id`);--> statement-breakpoint
CREATE TABLE `message_usage` (
	`message_id` text PRIMARY KEY NOT NULL,
	`prompt_tokens` integer NOT NULL,
	`completion_tokens` integer NOT NULL,
	`total_tokens` integer NOT NULL,
	FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`role` text NOT NULL,
	`timestamp` integer NOT NULL,
	`ordering` integer NOT NULL,
	`finish_reason` text,
	`status` text DEFAULT 'completed' NOT NULL,
	`metadata` text,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_messages_session` ON `messages` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_messages_ordering` ON `messages` (`session_id`,`ordering`);--> statement-breakpoint
CREATE INDEX `idx_messages_timestamp` ON `messages` (`timestamp`);--> statement-breakpoint
CREATE INDEX `idx_messages_status` ON `messages` (`status`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`next_todo_id` integer DEFAULT 1 NOT NULL,
	`created` integer NOT NULL,
	`updated` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_sessions_updated` ON `sessions` (`updated`);--> statement-breakpoint
CREATE INDEX `idx_sessions_created` ON `sessions` (`created`);--> statement-breakpoint
CREATE INDEX `idx_sessions_provider` ON `sessions` (`provider`);--> statement-breakpoint
CREATE INDEX `idx_sessions_title` ON `sessions` (`title`);--> statement-breakpoint
CREATE TABLE `tfidf_documents` (
	`file_path` text PRIMARY KEY NOT NULL,
	`magnitude` real NOT NULL,
	`term_count` integer NOT NULL,
	`raw_terms` text NOT NULL,
	FOREIGN KEY (`file_path`) REFERENCES `codebase_files`(`path`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tfidf_idf` (
	`term` text PRIMARY KEY NOT NULL,
	`idf_value` real NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tfidf_terms` (
	`file_path` text NOT NULL,
	`term` text NOT NULL,
	`frequency` real NOT NULL,
	FOREIGN KEY (`file_path`) REFERENCES `codebase_files`(`path`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_tfidf_terms_term` ON `tfidf_terms` (`term`);--> statement-breakpoint
CREATE INDEX `idx_tfidf_terms_file` ON `tfidf_terms` (`file_path`);--> statement-breakpoint
CREATE TABLE `todos` (
	`id` integer NOT NULL,
	`session_id` text NOT NULL,
	`content` text NOT NULL,
	`active_form` text NOT NULL,
	`status` text NOT NULL,
	`ordering` integer NOT NULL,
	PRIMARY KEY(`session_id`, `id`),
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_todos_session` ON `todos` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_todos_status` ON `todos` (`status`);--> statement-breakpoint
CREATE INDEX `idx_todos_ordering` ON `todos` (`session_id`,`ordering`);