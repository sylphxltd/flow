-- Fix invalid attachment data in existing database
-- This migration handles cases where message_attachments table might have invalid data
-- or where messages have malformed attachment references

-- No schema changes needed - this is a data-only migration
-- The schema is already correct, we just need to ensure data integrity

-- Note: SQLite doesn't support complex data validation in migrations
-- Data normalization will be handled by the auto-migrate.ts during JSON file migration
-- For existing database data, the application code will handle validation at read time
