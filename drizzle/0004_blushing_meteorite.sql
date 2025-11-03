ALTER TABLE `messages` ADD `status` text DEFAULT 'completed' NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_messages_status` ON `messages` (`status`);--> statement-breakpoint
ALTER TABLE `sessions` DROP COLUMN `streaming_parts`;--> statement-breakpoint
ALTER TABLE `sessions` DROP COLUMN `is_streaming`;