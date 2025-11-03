ALTER TABLE `messages` ADD `is_streaming` integer;--> statement-breakpoint
CREATE INDEX `idx_messages_is_streaming` ON `messages` (`is_streaming`);--> statement-breakpoint
ALTER TABLE `sessions` DROP COLUMN `streaming_parts`;--> statement-breakpoint
ALTER TABLE `sessions` DROP COLUMN `is_streaming`;