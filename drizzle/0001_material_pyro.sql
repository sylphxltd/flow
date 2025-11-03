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
	`metadata` text,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_messages_session` ON `messages` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_messages_ordering` ON `messages` (`session_id`,`ordering`);--> statement-breakpoint
CREATE INDEX `idx_messages_timestamp` ON `messages` (`timestamp`);--> statement-breakpoint
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