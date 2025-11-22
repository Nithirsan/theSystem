-- Migration 004: Add plan data table for "Gemeinsam Planen" feature
-- This table stores the planning information and AI-generated plan for each note

CREATE TABLE IF NOT EXISTS plan_data (
    id INT PRIMARY KEY AUTO_INCREMENT,
    note_id INT NOT NULL,
    goal TEXT,
    time_and_milestones TEXT,
    additional_info TEXT,
    generated_plan TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
    UNIQUE KEY unique_note_plan (note_id)
);

