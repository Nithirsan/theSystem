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

// Note represents a note/plan
type Note struct {
	ID        int       `json:"id" db:"id"`
	UserID    int       `json:"user_id" db:"user_id"`
	Title     string    `json:"title" db:"title"`
	Content   string    `json:"content" db:"content"`
	Color     string    `json:"color" db:"color"`
	IsPinned  bool      `json:"is_pinned" db:"is_pinned"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// ChecklistItem represents a checklist item in a note
type ChecklistItem struct {
	ID        int       `json:"id" db:"id"`
	NoteID    int       `json:"note_id" db:"note_id"`
	Text      string    `json:"text" db:"text"`
	IsChecked bool      `json:"is_checked" db:"is_checked"`
	Position  int       `json:"position" db:"position"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// NoteWithChecklist represents a note with its checklist items
type NoteWithChecklist struct {
	Note
	ChecklistItems []ChecklistItem `json:"checklist_items"`
	MediaAttachments []MediaAttachment `json:"media_attachments"`
	PlanPreview     string          `json:"plan_preview"` // First line of generated plan for preview
}

// CreateNoteRequest represents create note request
type CreateNoteRequest struct {
	Title   string `json:"title" binding:"required"`
	Content string `json:"content"`
	Color   string `json:"color"`
}

// UpdateNoteRequest represents update note request
type UpdateNoteRequest struct {
	Title    *string `json:"title"`
	Content  *string `json:"content"`
	Color    *string `json:"color"`
	IsPinned *bool   `json:"is_pinned"`
}

// CreateChecklistItemRequest represents create checklist item request
type CreateChecklistItemRequest struct {
	Text     string `json:"text" binding:"required"`
	Position int    `json:"position"`
}

// UpdateChecklistItemRequest represents update checklist item request
type UpdateChecklistItemRequest struct {
	Text      *string `json:"text"`
	IsChecked *bool   `json:"is_checked"`
	Position  *int    `json:"position"`
}

// PlanData represents planning data for a note
type PlanData struct {
	ID              int       `json:"id" db:"id"`
	NoteID          int       `json:"note_id" db:"note_id"`
	Goal            string    `json:"goal" db:"goal"`
	TimeAndMilestones string  `json:"time_and_milestones" db:"time_and_milestones"`
	AdditionalInfo  string    `json:"additional_info" db:"additional_info"`
	GeneratedPlan   string    `json:"generated_plan" db:"generated_plan"`
	CreatedAt       time.Time `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time `json:"updated_at" db:"updated_at"`
}

// SavePlanAnswersRequest represents the request to save planning answers
type SavePlanAnswersRequest struct {
	Goal              string `json:"goal" binding:"required"`
	TimeAndMilestones string `json:"time_and_milestones" binding:"required"`
	AdditionalInfo    string `json:"additional_info" binding:"required"`
}

// UpdatePlanChatRequest represents the request to update plan via chat
type UpdatePlanChatRequest struct {
	Message string `json:"message" binding:"required"`
}

// MediaAttachment represents a media file attached to a note
type MediaAttachment struct {
	ID              int       `json:"id" db:"id"`
	NoteID          int       `json:"note_id" db:"note_id"`
	UserID          int       `json:"user_id" db:"user_id"`
	FileName        string    `json:"file_name" db:"file_name"`
	FileType        string    `json:"file_type" db:"file_type"` // 'audio', 'pdf', 'image'
	FilePath        string    `json:"file_path" db:"file_path"`
	FileSize        int64     `json:"file_size" db:"file_size"`
	MimeType        string    `json:"mime_type" db:"mime_type"`
	ConvertedText   string    `json:"converted_text" db:"converted_text"`
	ConversionStatus string   `json:"conversion_status" db:"conversion_status"` // 'pending', 'processing', 'completed', 'failed'
	CreatedAt       time.Time `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time `json:"updated_at" db:"updated_at"`
}

// MeditationSession represents a meditation session
type MeditationSession struct {
	ID              int       `json:"id" db:"id"`
	UserID          int       `json:"user_id" db:"user_id"`
	Goal            string    `json:"goal" db:"goal"`
	Status          string    `json:"status" db:"status"` // 'active', 'completed', 'cancelled'
	StartedAt       time.Time `json:"started_at" db:"started_at"`
	EndedAt         *time.Time `json:"ended_at" db:"ended_at"`
	DurationSeconds int       `json:"duration_seconds" db:"duration_seconds"`
	Report          string    `json:"report" db:"report"`
	CreatedAt       time.Time `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time `json:"updated_at" db:"updated_at"`
}

// MeditationMessage represents a message in a meditation session
type MeditationMessage struct {
	ID        int       `json:"id" db:"id"`
	SessionID int       `json:"session_id" db:"session_id"`
	Type      string    `json:"type" db:"type"` // 'user' or 'ai'
	Content   string    `json:"content" db:"content"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

// MeditationSessionWithMessages represents a meditation session with its messages
type MeditationSessionWithMessages struct {
	MeditationSession
	Messages []MeditationMessage `json:"messages"`
}

// StartMeditationRequest represents the request to start a meditation
type StartMeditationRequest struct {
	Goal string `json:"goal" binding:"required"`
}

// SendMeditationMessageRequest represents the request to send a message in meditation
type SendMeditationMessageRequest struct {
	Content string `json:"content" binding:"required"`
}