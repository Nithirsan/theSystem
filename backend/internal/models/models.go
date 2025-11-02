package models

import (
	"time"
)

// User represents a user in the system
type User struct {
	ID           int       `json:"id" db:"id"`
	Email        string    `json:"email" db:"email"`
	PasswordHash string    `json:"-" db:"password_hash"`
	Name         string    `json:"name" db:"name"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time `json:"updated_at" db:"updated_at"`
	Preferences  string    `json:"preferences" db:"preferences"`
	Settings     string    `json:"settings" db:"settings"`
}

// UserSession represents a user session
type UserSession struct {
	ID        int       `json:"id" db:"id"`
	UserID    int       `json:"user_id" db:"user_id"`
	Token     string    `json:"token" db:"token"`
	ExpiresAt time.Time `json:"expires_at" db:"expires_at"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

// Habit represents a habit
type Habit struct {
	ID              int       `json:"id" db:"id"`
	UserID          int       `json:"user_id" db:"user_id"`
	Name            string    `json:"name" db:"name"`
	Description     string    `json:"description" db:"description"`
	Category        string    `json:"category" db:"category"`
	Icon            string    `json:"icon" db:"icon"`
	Color           string    `json:"color" db:"color"`
	TargetFrequency int       `json:"target_frequency" db:"target_frequency"`
	IsActive        bool      `json:"is_active" db:"is_active"`
	CreatedAt       time.Time `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time `json:"updated_at" db:"updated_at"`
}

// HabitCompletion represents a habit completion
type HabitCompletion struct {
	ID           int       `json:"id" db:"id"`
	HabitID      int       `json:"habit_id" db:"habit_id"`
	UserID       int       `json:"user_id" db:"user_id"`
	CompletedAt  time.Time `json:"completed_at" db:"completed_at"`
	StreakCount  int       `json:"streak_count" db:"streak_count"`
}

// Task represents a task
type Task struct {
	ID                      int        `json:"id" db:"id"`
	UserID                  int        `json:"user_id" db:"user_id"`
	Title                   string     `json:"title" db:"title"`
	Description             string     `json:"description" db:"description"`
	Priority                string     `json:"priority" db:"priority"`
	DueDate                 *time.Time `json:"due_date" db:"due_date"`
	CompletedAt             *time.Time `json:"completed_at" db:"completed_at"`
	ParentTaskID            *int       `json:"parent_task_id" db:"parent_task_id"`
	IsRecurringTemplate     bool       `json:"is_recurring_template" db:"is_recurring_template"`
	RecurrenceIntervalWeeks *int       `json:"recurrence_interval_weeks" db:"recurrence_interval_weeks"`
	RecurrenceEndDate       *time.Time `json:"recurrence_end_date" db:"recurrence_end_date"`
	CreatedAt               time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt               time.Time  `json:"updated_at" db:"updated_at"`
}

// JournalEntry represents a journal entry
type JournalEntry struct {
	ID        int       `json:"id" db:"id"`
	UserID    int       `json:"user_id" db:"user_id"`
	EntryDate time.Time `json:"entry_date" db:"entry_date"`
	Mood      string    `json:"mood" db:"mood"`
	Content   string    `json:"content" db:"content"`
	Tags      string    `json:"tags" db:"tags"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// ChatSession represents a chat session
type ChatSession struct {
	ID        int       `json:"id" db:"id"`
	UserID    int       `json:"user_id" db:"user_id"`
	Title     string    `json:"title" db:"title"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// ChatMessage represents a chat message
type ChatMessage struct {
	ID          int       `json:"id" db:"id"`
	SessionID   int       `json:"session_id" db:"session_id"`
	Type        string    `json:"type" db:"type"`
	Content     string    `json:"content" db:"content"`
	Suggestions string    `json:"suggestions" db:"suggestions"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
}

// Request/Response DTOs

// LoginRequest represents login request
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// RegisterRequest represents registration request
type RegisterRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
	Name     string `json:"name" binding:"required"`
}

// AuthResponse represents authentication response
type AuthResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

// CreateHabitRequest represents create habit request
type CreateHabitRequest struct {
	Name            string `json:"name" binding:"required"`
	Description     string `json:"description"`
	Category        string `json:"category" binding:"required,oneof=morning afternoon evening"`
	Icon            string `json:"icon"`
	Color           string `json:"color"`
	TargetFrequency int    `json:"target_frequency"`
}

// UpdateHabitRequest represents update habit request
type UpdateHabitRequest struct {
	Name            *string `json:"name"`
	Description     *string `json:"description"`
	Category        *string `json:"category"`
	Icon            *string `json:"icon"`
	Color           *string `json:"color"`
	TargetFrequency *int    `json:"target_frequency"`
	IsActive        *bool   `json:"is_active"`
}

// CreateTaskRequest represents create task request
type CreateTaskRequest struct {
	Title                string     `json:"title" binding:"required"`
	Description          string     `json:"description"`
	Priority             string     `json:"priority" binding:"oneof=high medium low"`
	DueDate              *time.Time  `json:"due_date"`
	IsRecurring          bool       `json:"is_recurring"`
	RecurrenceIntervalWeeks *int     `json:"recurrence_interval_weeks,omitempty"`
	RecurrenceEndDate    *time.Time `json:"recurrence_end_date,omitempty"`
}

// UpdateTaskRequest represents update task request
type UpdateTaskRequest struct {
	Title       *string    `json:"title"`
	Description *string    `json:"description"`
	Priority    *string    `json:"priority"`
	DueDate     *time.Time `json:"due_date"`
}

// CreateJournalEntryRequest represents create journal entry request
type CreateJournalEntryRequest struct {
	EntryDate time.Time `json:"entry_date" binding:"required"`
	Mood      string    `json:"mood"`
	Content   string    `json:"content"`
	Tags      string    `json:"tags"`
}

// UpdateJournalEntryRequest represents update journal entry request
type UpdateJournalEntryRequest struct {
	Mood    *string `json:"mood"`
	Content *string `json:"content"`
	Tags    *string `json:"tags"`
}

// CreateChatMessageRequest represents create chat message request
type CreateChatMessageRequest struct {
	Content string `json:"content" binding:"required"`
}

// ChatMessageResponse represents chat message response
type ChatMessageResponse struct {
	ID          int       `json:"id"`
	Type        string    `json:"type"`
	Content     string    `json:"content"`
	Suggestions []string  `json:"suggestions"`
	CreatedAt   time.Time `json:"created_at"`
}
