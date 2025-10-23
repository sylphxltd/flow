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
CREATE INDEX `idx_tfidf_terms_file` ON `tfidf_terms` (`file_path`);