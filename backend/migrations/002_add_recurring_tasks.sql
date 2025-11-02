-- Migration: Add support for recurring tasks
-- This migration adds columns to track recurring task templates
-- Note: Recurring tasks will generate all instances at creation time

-- Add columns to tasks table for recurring task metadata
-- Note: Run this migration manually if columns already exist, or use a migration tool that handles errors gracefully

ALTER TABLE tasks 
ADD COLUMN parent_task_id INT NULL,
ADD COLUMN is_recurring_template BOOLEAN DEFAULT FALSE,
ADD COLUMN recurrence_interval_weeks INT NULL,
ADD COLUMN recurrence_end_date TIMESTAMP NULL;

-- Add foreign key constraint
ALTER TABLE tasks 
ADD CONSTRAINT fk_parent_task FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE;

