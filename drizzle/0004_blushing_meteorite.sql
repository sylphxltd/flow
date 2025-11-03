-- Remove is_streaming column added in 0003 (replaced by status)
DROP INDEX `idx_messages_is_streaming`;--> statement-breakpoint
ALTER TABLE `messages` DROP COLUMN `is_streaming`;--> statement-breakpoint
-- Add status column to replace is_streaming
ALTER TABLE `messages` ADD `status` text DEFAULT 'completed' NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_messages_status` ON `messages` (`status`);