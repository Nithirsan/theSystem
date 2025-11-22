-- Simple fix: Add missing columns to tasks table
-- Run this in your MySQL database
-- If you get errors that columns already exist, that's fine - just ignore them

USE habit_tracker;

-- Add missing columns
ALTER TABLE tasks ADD COLUMN parent_task_id INT NULL;
ALTER TABLE tasks ADD COLUMN is_recurring_template BOOLEAN DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN recurrence_interval_weeks INT NULL;
ALTER TABLE tasks ADD COLUMN recurrence_end_date TIMESTAMP NULL;

-- Add foreign key constraint
ALTER TABLE tasks ADD CONSTRAINT fk_parent_task FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE;

