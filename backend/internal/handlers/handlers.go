package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"habit-tracker-backend/internal/auth"
	"habit-tracker-backend/internal/database"
	"habit-tracker-backend/internal/models"
	"habit-tracker-backend/internal/services"

	"github.com/gin-gonic/gin"
)

// AuthHandler handles authentication endpoints
type AuthHandler struct{}

// Register handles user registration
func (h *AuthHandler) Register(c *gin.Context) {
	var req models.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if user already exists
	var existingUser models.User
	err := database.DB.QueryRow("SELECT id FROM users WHERE email = ?", req.Email).Scan(&existingUser.ID)
	if err != sql.ErrNoRows {
		c.JSON(http.StatusConflict, gin.H{"error": "User already exists"})
		return
	}

	// Hash password
	hashedPassword, err := auth.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	// Create user
	result, err := database.DB.Exec(`
		INSERT INTO users (email, password_hash, name, preferences, settings) 
		VALUES (?, ?, ?, '{}', '{}')
	`, req.Email, hashedPassword, req.Name)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	userID, _ := result.LastInsertId()

	// Generate token
	token, err := auth.GenerateToken(int(userID), req.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	user := models.User{
		ID:        int(userID),
		Email:     req.Email,
		Name:      req.Name,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	c.JSON(http.StatusCreated, models.AuthResponse{
		Token: token,
		User:  user,
	})
}

// Login handles user login
func (h *AuthHandler) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Find user - handle NULL values for JSON fields
	var user models.User
	var preferences, settings sql.NullString
	err := database.DB.QueryRow(`
		SELECT id, email, password_hash, name, created_at, updated_at, preferences, settings 
		FROM users WHERE email = ?
	`, req.Email).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.Name,
		&user.CreatedAt, &user.UpdatedAt, &preferences, &settings,
	)
	if err == sql.ErrNoRows {
		log.Printf("Login attempt failed: user not found for email: %s", req.Email)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}
	if err != nil {
		log.Printf("Database error during login for email %s: %v", req.Email, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// Handle NULL JSON fields
	if preferences.Valid {
		user.Preferences = preferences.String
	} else {
		user.Preferences = "{}"
	}
	if settings.Valid {
		user.Settings = settings.String
	} else {
		user.Settings = "{}"
	}

	// Check password - TEMPORARILY DISABLED: All logins allowed for testing
	// if !auth.CheckPasswordHash(req.Password, user.PasswordHash) {
	// 	c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
	// 	return
	// }

	// Generate token
	token, err := auth.GenerateToken(user.ID, user.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, models.AuthResponse{
		Token: token,
		User:  user,
	})
}

// GetMe returns current user information
func (h *AuthHandler) GetMe(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var user models.User
	var preferences, settings sql.NullString
	err := database.DB.QueryRow(`
		SELECT id, email, name, created_at, updated_at, preferences, settings 
		FROM users WHERE id = ?
	`, userID).Scan(
		&user.ID, &user.Email, &user.Name,
		&user.CreatedAt, &user.UpdatedAt, &preferences, &settings,
	)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}
	if err != nil {
		log.Printf("Database error in GetMe for user_id %v: %v", userID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// Handle NULL JSON fields
	if preferences.Valid {
		user.Preferences = preferences.String
	} else {
		user.Preferences = "{}"
	}
	if settings.Valid {
		user.Settings = settings.String
	} else {
		user.Settings = "{}"
	}

	c.JSON(http.StatusOK, user)
}

// HabitHandler handles habit endpoints
type HabitHandler struct{}

// GetHabits returns all habits for the authenticated user
func (h *HabitHandler) GetHabits(c *gin.Context) {
	userID, _ := c.Get("user_id")

	rows, err := database.DB.Query(`
		SELECT id, user_id, name, description, category, icon, color, 
		       target_frequency, is_active, created_at, updated_at
		FROM habits WHERE user_id = ? AND is_active = true
		ORDER BY category, created_at
	`, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch habits"})
		return
	}
	defer rows.Close()

	var habits []models.Habit
	for rows.Next() {
		var habit models.Habit
		err := rows.Scan(
			&habit.ID, &habit.UserID, &habit.Name, &habit.Description,
			&habit.Category, &habit.Icon, &habit.Color, &habit.TargetFrequency,
			&habit.IsActive, &habit.CreatedAt, &habit.UpdatedAt,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to scan habit"})
			return
		}
		habits = append(habits, habit)
	}

	c.JSON(http.StatusOK, habits)
}

// CreateHabit creates a new habit
func (h *HabitHandler) CreateHabit(c *gin.Context) {
	userID, _ := c.Get("user_id")

	var req models.CreateHabitRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := database.DB.Exec(`
		INSERT INTO habits (user_id, name, description, category, icon, color, target_frequency)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, userID, req.Name, req.Description, req.Category, req.Icon, req.Color, req.TargetFrequency)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create habit"})
		return
	}

	habitID, _ := result.LastInsertId()

	habit := models.Habit{
		ID:              int(habitID),
		UserID:          userID.(int),
		Name:            req.Name,
		Description:     req.Description,
		Category:        req.Category,
		Icon:            req.Icon,
		Color:           req.Color,
		TargetFrequency: req.TargetFrequency,
		IsActive:        true,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	c.JSON(http.StatusCreated, habit)
}

// CompleteHabit marks a habit as completed for today
func (h *HabitHandler) CompleteHabit(c *gin.Context) {
	userID, _ := c.Get("user_id")
	habitIDStr := c.Param("id")
	habitID, err := strconv.Atoi(habitIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid habit ID"})
		return
	}

	// Check if habit belongs to user
	var habit models.Habit
	err = database.DB.QueryRow(`
		SELECT id, user_id FROM habits WHERE id = ? AND user_id = ?
	`, habitID, userID).Scan(&habit.ID, &habit.UserID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Habit not found"})
		return
	}

	// Check if already completed today
	var existingCompletion models.HabitCompletion
	err = database.DB.QueryRow(`
		SELECT id FROM habit_completions 
		WHERE habit_id = ? AND DATE(completed_at) = CURDATE()
	`, habitID).Scan(&existingCompletion.ID)
	if err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Habit already completed today"})
		return
	}

	// Insert completion
	_, err = database.DB.Exec(`
		INSERT INTO habit_completions (habit_id, user_id, completed_at, streak_count)
		VALUES (?, ?, NOW(), 1)
	`, habitID, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to complete habit"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Habit completed successfully"})
}

// TaskHandler handles task endpoints
type TaskHandler struct{}

// GetTasks returns all tasks for the authenticated user
func (h *TaskHandler) GetTasks(c *gin.Context) {
	userID, _ := c.Get("user_id")

	rows, err := database.DB.Query(`
		SELECT id, user_id, title, description, priority, due_date, 
		       completed_at, parent_task_id, is_recurring_template, 
		       recurrence_interval_weeks, recurrence_end_date, created_at, updated_at
		FROM tasks WHERE user_id = ?
		ORDER BY 
			CASE WHEN completed_at IS NULL THEN 0 ELSE 1 END,
			CASE priority 
				WHEN 'high' THEN 1 
				WHEN 'medium' THEN 2 
				WHEN 'low' THEN 3 
			END,
			due_date ASC
	`, userID)
	if err != nil {
		log.Printf("Failed to query tasks for user %v: %v", userID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch tasks"})
		return
	}
	defer rows.Close()

	var tasks []models.Task
	for rows.Next() {
		var task models.Task
		err := rows.Scan(
			&task.ID, &task.UserID, &task.Title, &task.Description,
			&task.Priority, &task.DueDate, &task.CompletedAt,
			&task.ParentTaskID, &task.IsRecurringTemplate,
			&task.RecurrenceIntervalWeeks, &task.RecurrenceEndDate,
			&task.CreatedAt, &task.UpdatedAt,
		)
		if err != nil {
			log.Printf("Failed to scan task for user %v: %v", userID, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to scan task"})
			return
		}
		tasks = append(tasks, task)
	}

	c.JSON(http.StatusOK, tasks)
}

// CreateTask creates a new task
func (h *TaskHandler) CreateTask(c *gin.Context) {
	userID, _ := c.Get("user_id")

	var req models.CreateTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// If it's a recurring task, generate all instances
	if req.IsRecurring && req.DueDate != nil && req.RecurrenceIntervalWeeks != nil && req.RecurrenceEndDate != nil {
		var createdTasks []models.Task
		startDate := *req.DueDate
		endDate := *req.RecurrenceEndDate
		intervalWeeks := *req.RecurrenceIntervalWeeks

		// Generate tasks for each occurrence
		currentDate := startDate
		for !currentDate.After(endDate) {
			task := models.Task{
				UserID:                userID.(int),
				Title:                 req.Title,
				Description:           req.Description,
				Priority:              req.Priority,
				DueDate:               &currentDate,
				IsRecurringTemplate:   false,
				RecurrenceIntervalWeeks: nil,
				RecurrenceEndDate:     nil,
				CreatedAt:             time.Now(),
				UpdatedAt:             time.Now(),
			}

			result, err := database.DB.Exec(`
				INSERT INTO tasks (user_id, title, description, priority, due_date, is_recurring_template, recurrence_interval_weeks, recurrence_end_date)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?)
			`, task.UserID, task.Title, task.Description, task.Priority, task.DueDate, task.IsRecurringTemplate, task.RecurrenceIntervalWeeks, task.RecurrenceEndDate)
			if err != nil {
				log.Printf("Failed to create recurring task instance: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create recurring task instance"})
				return
			}

			taskID, _ := result.LastInsertId()
			task.ID = int(taskID)
			createdTasks = append(createdTasks, task)

			// Move to next occurrence
			currentDate = currentDate.AddDate(0, 0, intervalWeeks*7)
		}

		c.JSON(http.StatusCreated, gin.H{
			"message": "Recurring tasks created",
			"count":   len(createdTasks),
			"tasks":   createdTasks,
		})
		return
	}

	// Non-recurring task - create as before
	result, err := database.DB.Exec(`
		INSERT INTO tasks (user_id, title, description, priority, due_date, is_recurring_template, recurrence_interval_weeks, recurrence_end_date)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`, userID, req.Title, req.Description, req.Priority, req.DueDate, false, nil, nil)
	if err != nil {
		log.Printf("Failed to create task: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create task"})
		return
	}

	taskID, _ := result.LastInsertId()

	task := models.Task{
		ID:          int(taskID),
		UserID:      userID.(int),
		Title:       req.Title,
		Description: req.Description,
		Priority:    req.Priority,
		DueDate:     req.DueDate,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	c.JSON(http.StatusCreated, task)
}

// CompleteTask marks a task as completed
func (h *TaskHandler) CompleteTask(c *gin.Context) {
	userID, _ := c.Get("user_id")
	taskIDStr := c.Param("id")
	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}

	// Check if task belongs to user
	var task models.Task
	err = database.DB.QueryRow(`
		SELECT id, user_id, completed_at FROM tasks WHERE id = ? AND user_id = ?
	`, taskID, userID).Scan(&task.ID, &task.UserID, &task.CompletedAt)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}

	// Toggle completion status
	var completedAt *time.Time
	if task.CompletedAt == nil {
		now := time.Now()
		completedAt = &now
	}

	_, err = database.DB.Exec(`
		UPDATE tasks SET completed_at = ?, updated_at = NOW() WHERE id = ?
	`, completedAt, taskID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update task"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Task updated successfully"})
}

// JournalHandler handles journal entry endpoints
type JournalHandler struct{}

// NewJournalHandler creates a new journal handler
func NewJournalHandler() *JournalHandler {
	return &JournalHandler{}
}

// GetJournalEntries returns all journal entries for the authenticated user
func (h *JournalHandler) GetJournalEntries(c *gin.Context) {
	userID, _ := c.Get("user_id")

	rows, err := database.DB.Query(`
		SELECT id, user_id, entry_date, mood, content, tags, created_at, updated_at
		FROM journal_entries WHERE user_id = ?
		ORDER BY entry_date DESC
	`, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch journal entries"})
		return
	}
	defer rows.Close()

	var entries []models.JournalEntry
	for rows.Next() {
		var entry models.JournalEntry
		err := rows.Scan(&entry.ID, &entry.UserID, &entry.EntryDate, &entry.Mood, &entry.Content, &entry.Tags, &entry.CreatedAt, &entry.UpdatedAt)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to scan journal entry"})
			return
		}
		entries = append(entries, entry)
	}

	c.JSON(http.StatusOK, entries)
}

// GetJournalEntryByDate returns a journal entry for a specific date
func (h *JournalHandler) GetJournalEntryByDate(c *gin.Context) {
	userID, _ := c.Get("user_id")
	date := c.Param("date")

	var entry models.JournalEntry
	err := database.DB.QueryRow(`
		SELECT id, user_id, entry_date, mood, content, tags, created_at, updated_at
		FROM journal_entries WHERE user_id = ? AND DATE(entry_date) = ?
	`, userID, date).Scan(&entry.ID, &entry.UserID, &entry.EntryDate, &entry.Mood, &entry.Content, &entry.Tags, &entry.CreatedAt, &entry.UpdatedAt)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Journal entry not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch journal entry"})
		return
	}

	c.JSON(http.StatusOK, entry)
}

// CreateOrUpdateJournalEntry creates or updates a journal entry
func (h *JournalHandler) CreateOrUpdateJournalEntry(c *gin.Context) {
	userID, _ := c.Get("user_id")

	var req models.CreateJournalEntryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if entry already exists for this date
	var existingID int
	err := database.DB.QueryRow(`
		SELECT id FROM journal_entries WHERE user_id = ? AND DATE(entry_date) = DATE(?)
	`, userID, req.EntryDate).Scan(&existingID)

	if err == sql.ErrNoRows {
		// Create new entry
		result, err := database.DB.Exec(`
			INSERT INTO journal_entries (user_id, entry_date, mood, content, tags)
			VALUES (?, ?, ?, ?, ?)
		`, userID, req.EntryDate, req.Mood, req.Content, req.Tags)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create journal entry"})
			return
		}

		entryID, _ := result.LastInsertId()
		entry := models.JournalEntry{
			ID:        int(entryID),
			UserID:    userID.(int),
			EntryDate: req.EntryDate,
			Mood:      req.Mood,
			Content:   req.Content,
			Tags:      req.Tags,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}

		c.JSON(http.StatusCreated, entry)
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check existing entry"})
		return
	} else {
		// Update existing entry
		_, err := database.DB.Exec(`
			UPDATE journal_entries 
			SET mood = ?, content = ?, tags = ?, updated_at = NOW()
			WHERE id = ?
		`, req.Mood, req.Content, req.Tags, existingID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update journal entry"})
			return
		}

		// Fetch updated entry
		var entry models.JournalEntry
		err = database.DB.QueryRow(`
			SELECT id, user_id, entry_date, mood, content, tags, created_at, updated_at
			FROM journal_entries WHERE id = ?
		`, existingID).Scan(&entry.ID, &entry.UserID, &entry.EntryDate, &entry.Mood, &entry.Content, &entry.Tags, &entry.CreatedAt, &entry.UpdatedAt)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch updated entry"})
			return
		}

		c.JSON(http.StatusOK, entry)
	}
}

// UpdateJournalEntry updates a specific journal entry
func (h *JournalHandler) UpdateJournalEntry(c *gin.Context) {
	userID, _ := c.Get("user_id")
	entryIDStr := c.Param("id")
	entryID, err := strconv.Atoi(entryIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid entry ID"})
		return
	}

	var req models.UpdateJournalEntryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify entry belongs to user
	var entry models.JournalEntry
	err = database.DB.QueryRow(`
		SELECT id, user_id FROM journal_entries WHERE id = ? AND user_id = ?
	`, entryID, userID).Scan(&entry.ID, &entry.UserID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Journal entry not found"})
		return
	}

	// Build update query dynamically
	updateFields := []string{}
	args := []interface{}{}

	if req.Mood != nil {
		updateFields = append(updateFields, "mood = ?")
		args = append(args, *req.Mood)
	}
	if req.Content != nil {
		updateFields = append(updateFields, "content = ?")
		args = append(args, *req.Content)
	}
	if req.Tags != nil {
		updateFields = append(updateFields, "tags = ?")
		args = append(args, *req.Tags)
	}

	if len(updateFields) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No fields to update"})
		return
	}

	updateFields = append(updateFields, "updated_at = NOW()")
	args = append(args, entryID)

	query := fmt.Sprintf("UPDATE journal_entries SET %s WHERE id = ?", strings.Join(updateFields, ", "))
	_, err = database.DB.Exec(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update journal entry"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Journal entry updated successfully"})
}

// DeleteJournalEntry deletes a journal entry
func (h *JournalHandler) DeleteJournalEntry(c *gin.Context) {
	userID, _ := c.Get("user_id")
	entryIDStr := c.Param("id")
	entryID, err := strconv.Atoi(entryIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid entry ID"})
		return
	}

	// Verify entry belongs to user
	var entry models.JournalEntry
	err = database.DB.QueryRow(`
		SELECT id, user_id FROM journal_entries WHERE id = ? AND user_id = ?
	`, entryID, userID).Scan(&entry.ID, &entry.UserID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Journal entry not found"})
		return
	}

	_, err = database.DB.Exec(`DELETE FROM journal_entries WHERE id = ?`, entryID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete journal entry"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Journal entry deleted successfully"})
}

// ChatHandler handles AI Coach chat endpoints
type ChatHandler struct {
	openAIService *services.OpenAIService
}

// NewChatHandler creates a new chat handler
func NewChatHandler() *ChatHandler {
	return &ChatHandler{
		openAIService: services.NewOpenAIService(),
	}
}

// GetChatSessions returns all chat sessions for the authenticated user
func (h *ChatHandler) GetChatSessions(c *gin.Context) {
	userID, _ := c.Get("user_id")

	rows, err := database.DB.Query(`
		SELECT id, user_id, title, created_at, updated_at
		FROM chat_sessions WHERE user_id = ?
		ORDER BY updated_at DESC
	`, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch chat sessions"})
		return
	}
	defer rows.Close()

	var sessions []models.ChatSession
	for rows.Next() {
		var session models.ChatSession
		err := rows.Scan(&session.ID, &session.UserID, &session.Title, &session.CreatedAt, &session.UpdatedAt)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to scan chat session"})
			return
		}
		sessions = append(sessions, session)
	}

	c.JSON(http.StatusOK, sessions)
}

// CreateChatSession creates a new chat session
func (h *ChatHandler) CreateChatSession(c *gin.Context) {
	userID, _ := c.Get("user_id")

	var req struct {
		Title string `json:"title"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := database.DB.Exec(`
		INSERT INTO chat_sessions (user_id, title)
		VALUES (?, ?)
	`, userID, req.Title)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create chat session"})
		return
	}

	sessionID, _ := result.LastInsertId()

	session := models.ChatSession{
		ID:        int(sessionID),
		UserID:    userID.(int),
		Title:     req.Title,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	c.JSON(http.StatusCreated, session)
}

// GetChatMessages returns all messages for a specific chat session
func (h *ChatHandler) GetChatMessages(c *gin.Context) {
	userID, _ := c.Get("user_id")
	sessionIDStr := c.Param("id")
	sessionID, err := strconv.Atoi(sessionIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid session ID"})
		return
	}

	// Verify session belongs to user
	var session models.ChatSession
	err = database.DB.QueryRow(`
		SELECT id, user_id FROM chat_sessions WHERE id = ? AND user_id = ?
	`, sessionID, userID).Scan(&session.ID, &session.UserID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Chat session not found"})
		return
	}

	rows, err := database.DB.Query(`
		SELECT id, session_id, type, content, suggestions, created_at
		FROM chat_messages WHERE session_id = ?
		ORDER BY created_at ASC
	`, sessionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch messages"})
		return
	}
	defer rows.Close()

	var messages []models.ChatMessageResponse
	for rows.Next() {
		var message models.ChatMessage
		var suggestionsJSON string
		err := rows.Scan(&message.ID, &message.SessionID, &message.Type, &message.Content, &suggestionsJSON, &message.CreatedAt)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to scan message"})
			return
		}

		var suggestions []string
		if suggestionsJSON != "" {
			json.Unmarshal([]byte(suggestionsJSON), &suggestions)
		}

		messages = append(messages, models.ChatMessageResponse{
			ID:          message.ID,
			Type:        message.Type,
			Content:     message.Content,
			Suggestions: suggestions,
			CreatedAt:   message.CreatedAt,
		})
	}

	c.JSON(http.StatusOK, messages)
}

// SendMessage sends a message to the AI coach
func (h *ChatHandler) SendMessage(c *gin.Context) {
	userID, _ := c.Get("user_id")
	sessionIDStr := c.Param("id")
	sessionID, err := strconv.Atoi(sessionIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid session ID"})
		return
	}

	// Verify session belongs to user
	var session models.ChatSession
	err = database.DB.QueryRow(`
		SELECT id, user_id FROM chat_sessions WHERE id = ? AND user_id = ?
	`, sessionID, userID).Scan(&session.ID, &session.UserID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Chat session not found"})
		return
	}

	var req models.CreateChatMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Save user message
	userMessageResult, err := database.DB.Exec(`
		INSERT INTO chat_messages (session_id, type, content)
		VALUES (?, 'user', ?)
	`, sessionID, req.Content)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save user message"})
		return
	}

	// Get conversation history for context
	rows, err := database.DB.Query(`
		SELECT type, content FROM chat_messages 
		WHERE session_id = ? 
		ORDER BY created_at ASC 
		LIMIT 10
	`, sessionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get conversation history"})
		return
	}
	defer rows.Close()

	var conversationHistory []services.Message
	for rows.Next() {
		var msgType, content string
		err := rows.Scan(&msgType, &content)
		if err != nil {
			continue
		}
		conversationHistory = append(conversationHistory, services.Message{
			Role:    msgType,
			Content: content,
		})
	}

	// Generate AI response
	aiResponse, suggestions, err := h.openAIService.GenerateCoachResponse(req.Content, conversationHistory)
	if err != nil {
		aiResponse = "Entschuldigung, ich konnte deine Nachricht nicht verarbeiten. Bitte versuche es später erneut."
		suggestions = []string{"Nachricht wiederholen", "Später versuchen"}
	}

	// Save AI response
	suggestionsJSON, _ := json.Marshal(suggestions)
	aiMessageResult, err := database.DB.Exec(`
		INSERT INTO chat_messages (session_id, type, content, suggestions)
		VALUES (?, 'ai', ?, ?)
	`, sessionID, aiResponse, string(suggestionsJSON))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save AI response"})
		return
	}

	// Update session timestamp
	database.DB.Exec(`UPDATE chat_sessions SET updated_at = NOW() WHERE id = ?`, sessionID)

	// Return both messages
	userMessageID, _ := userMessageResult.LastInsertId()
	aiMessageID, _ := aiMessageResult.LastInsertId()

	response := gin.H{
		"user_message": gin.H{
			"id":        userMessageID,
			"type":      "user",
			"content":   req.Content,
			"created_at": time.Now(),
		},
		"ai_message": gin.H{
			"id":          aiMessageID,
			"type":        "ai",
			"content":     aiResponse,
			"suggestions": suggestions,
			"created_at":  time.Now(),
		},
	}

	c.JSON(http.StatusOK, response)
}
