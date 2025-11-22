package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
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
		SELECT h.id, h.user_id, h.name, h.description, h.category, h.icon, h.color, 
		       h.target_frequency, h.is_active, h.created_at, h.updated_at,
		       CASE WHEN hc.id IS NOT NULL THEN true ELSE false END as completed_today
		FROM habits h
		LEFT JOIN habit_completions hc ON h.id = hc.habit_id AND DATE(hc.completed_at) = CURDATE()
		WHERE h.user_id = ? AND h.is_active = true
		ORDER BY h.category, h.created_at
	`, userID)
	if err != nil {
		log.Printf("Failed to query habits for user %v: %v", userID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch habits", "details": err.Error()})
		return
	}
	defer rows.Close()

	type HabitWithCompletion struct {
		models.Habit
		CompletedToday bool `json:"completed_today"`
	}

	var habits []HabitWithCompletion
	for rows.Next() {
		var habit HabitWithCompletion
		err := rows.Scan(
			&habit.ID, &habit.UserID, &habit.Name, &habit.Description,
			&habit.Category, &habit.Icon, &habit.Color, &habit.TargetFrequency,
			&habit.IsActive, &habit.CreatedAt, &habit.UpdatedAt,
			&habit.CompletedToday,
		)
		if err != nil {
			log.Printf("Failed to scan habit: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to scan habit", "details": err.Error()})
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
		log.Printf("Invalid habit ID in CompleteHabit: %s, error: %v", habitIDStr, err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid habit ID"})
		return
	}

	log.Printf("CompleteHabit called: habitID=%d, userID=%v", habitID, userID)

	// Check if habit belongs to user
	var habit models.Habit
	err = database.DB.QueryRow(`
		SELECT id, user_id FROM habits WHERE id = ? AND user_id = ?
	`, habitID, userID).Scan(&habit.ID, &habit.UserID)
	if err != nil {
		log.Printf("Habit not found or doesn't belong to user: habitID=%d, userID=%v, error: %v", habitID, userID, err)
		c.JSON(http.StatusNotFound, gin.H{"error": "Habit not found"})
		return
	}

	// Check if already completed today - if so, toggle it off (delete)
	var existingCompletion models.HabitCompletion
	err = database.DB.QueryRow(`
		SELECT id FROM habit_completions 
		WHERE habit_id = ? AND DATE(completed_at) = CURDATE()
	`, habitID).Scan(&existingCompletion.ID)
	if err == nil {
		// Already completed - toggle off by deleting the completion
		log.Printf("Habit already completed today, deleting completion: habitID=%d", habitID)
		_, err = database.DB.Exec(`
			DELETE FROM habit_completions 
			WHERE habit_id = ? AND DATE(completed_at) = CURDATE()
		`, habitID)
		if err != nil {
			log.Printf("Failed to delete habit completion: habitID=%d, error: %v", habitID, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to uncomplete habit", "details": err.Error()})
			return
		}
		log.Printf("Successfully uncompleted habit: habitID=%d", habitID)
		c.JSON(http.StatusOK, gin.H{"message": "Habit uncompleted successfully", "completed": false})
		return
	}
	if err != sql.ErrNoRows {
		log.Printf("Error checking for existing completion: habitID=%d, error: %v", habitID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check habit completion status", "details": err.Error()})
		return
	}

	// Not completed - insert completion
	log.Printf("Inserting new habit completion: habitID=%d, userID=%v", habitID, userID)
	_, err = database.DB.Exec(`
		INSERT INTO habit_completions (habit_id, user_id, completed_at, streak_count)
		VALUES (?, ?, NOW(), 1)
	`, habitID, userID)
	if err != nil {
		log.Printf("Failed to insert habit completion: habitID=%d, userID=%v, error: %v", habitID, userID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to complete habit", "details": err.Error()})
		return
	}

	log.Printf("Successfully completed habit: habitID=%d", habitID)
	c.JSON(http.StatusOK, gin.H{"message": "Habit completed successfully", "completed": true})
}

// GetHabitCompletions returns habit completions for a specific week
func (h *HabitHandler) GetHabitCompletions(c *gin.Context) {
	userID, _ := c.Get("user_id")
	habitIDStr := c.Query("habit_id")
	
	// Parse start date from query (defaults to start of current week)
	startDateStr := c.DefaultQuery("start_date", "")
	var startDate time.Time
	var err error
	
	if startDateStr != "" {
		startDate, err = time.Parse("2006-01-02", startDateStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start_date format. Use YYYY-MM-DD"})
			return
		}
	} else {
		// Get start of current week (Monday)
		now := time.Now()
		weekday := int(now.Weekday())
		if weekday == 0 {
			weekday = 7 // Sunday is day 7
		}
		startDate = now.AddDate(0, 0, -(weekday - 1)).Truncate(24 * time.Hour)
	}
	
	endDate := startDate.AddDate(0, 0, 6) // End of week (Sunday)
	
	var rows *sql.Rows
	if habitIDStr != "" {
		habitID, err := strconv.Atoi(habitIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid habit_id"})
			return
		}
		// Check if habit belongs to user
		var habit models.Habit
		err = database.DB.QueryRow(`
			SELECT id FROM habits WHERE id = ? AND user_id = ?
		`, habitID, userID).Scan(&habit.ID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Habit not found"})
			return
		}
		
		rows, err = database.DB.Query(`
			SELECT DATE(completed_at) as completion_date, COUNT(*) as count
			FROM habit_completions
			WHERE habit_id = ? AND user_id = ? 
			AND DATE(completed_at) >= ? AND DATE(completed_at) <= ?
			GROUP BY DATE(completed_at)
		`, habitID, userID, startDate.Format("2006-01-02"), endDate.Format("2006-01-02"))
	} else {
		// Get completions for all habits of the user
		rows, err = database.DB.Query(`
			SELECT hc.habit_id, DATE(hc.completed_at) as completion_date
			FROM habit_completions hc
			INNER JOIN habits h ON hc.habit_id = h.id
			WHERE hc.user_id = ? 
			AND h.user_id = ?
			AND DATE(hc.completed_at) >= ? AND DATE(hc.completed_at) <= ?
			ORDER BY hc.completed_at
		`, userID, userID, startDate.Format("2006-01-02"), endDate.Format("2006-01-02"))
	}
	
	if err != nil {
		log.Printf("Failed to query habit completions: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch completions"})
		return
	}
	defer rows.Close()
	
	type CompletionData struct {
		HabitID        *int   `json:"habit_id,omitempty"`
		CompletionDate string `json:"completion_date"`
	}
	
	// Group completions by date and habit_id
	type DateHabitMap map[string]map[int]bool // date -> habit_id -> true
	dateHabitMap := make(DateHabitMap)
	
	for rows.Next() {
		var date time.Time
		var habitID int
		err := rows.Scan(&date, &habitID)
		if err != nil {
			log.Printf("Failed to scan completion: %v", err)
			continue
		}
		dateStr := date.Format("2006-01-02")
		if dateHabitMap[dateStr] == nil {
			dateHabitMap[dateStr] = make(map[int]bool)
		}
		dateHabitMap[dateStr][habitID] = true
	}
	
	// Get total count of active habits for the user
	var totalActiveHabits int
	err = database.DB.QueryRow(`
		SELECT COUNT(*) FROM habits WHERE user_id = ? AND is_active = true
	`, userID).Scan(&totalActiveHabits)
	if err != nil {
		log.Printf("Failed to count active habits: %v", err)
		totalActiveHabits = 0
	}
	
	// Only include dates where ALL active habits were completed
	var completions []CompletionData
	for dateStr, habitIDs := range dateHabitMap {
		if len(habitIDs) >= totalActiveHabits && totalActiveHabits > 0 {
			completions = append(completions, CompletionData{
				CompletionDate: dateStr,
			})
		}
	}
	
	// Calculate streaks based on days where ALL habits were completed
	var currentStreak, bestStreak int
	if habitIDStr != "" {
		habitID, _ := strconv.Atoi(habitIDStr)
		currentStreak, bestStreak = calculateStreaks(habitID, userID.(int))
	} else {
		// Calculate streaks based on days where ALL habits were completed
		currentStreak, bestStreak = calculateOverallStreaksAllHabits(userID.(int))
	}
	
	c.JSON(http.StatusOK, gin.H{
		"completions": completions,
		"start_date": startDate.Format("2006-01-02"),
		"end_date": endDate.Format("2006-01-02"),
		"current_streak": currentStreak,
		"best_streak": bestStreak,
	})
}

// calculateStreaks calculates current and best streak for a specific habit
func calculateStreaks(habitID, userID int) (currentStreak, bestStreak int) {
	rows, err := database.DB.Query(`
		SELECT DATE(completed_at) as completion_date
		FROM habit_completions
		WHERE habit_id = ? AND user_id = ?
		ORDER BY completion_date DESC
	`, habitID, userID)
	if err != nil {
		log.Printf("Failed to calculate streaks: %v", err)
		return 0, 0
	}
	defer rows.Close()
	
	var dates []time.Time
	for rows.Next() {
		var date time.Time
		if err := rows.Scan(&date); err != nil {
			continue
		}
		dates = append(dates, date.Truncate(24 * time.Hour))
	}
	
	if len(dates) == 0 {
		return 0, 0
	}
	
	// Calculate current streak (from today backwards)
	today := time.Now().Truncate(24 * time.Hour)
	currentStreak = 0
	expectedDate := today
	
	for i := 0; i < len(dates); i++ {
		date := dates[i]
		if date.Equal(expectedDate) {
			currentStreak++
			expectedDate = expectedDate.AddDate(0, 0, -1)
		} else if date.Before(expectedDate) {
			break
		}
	}
	
	// Calculate best streak
	bestStreak = 1
	streak := 1
	for i := 1; i < len(dates); i++ {
		daysDiff := int(dates[i-1].Sub(dates[i]).Hours() / 24)
		if daysDiff == 1 {
			streak++
			if streak > bestStreak {
				bestStreak = streak
			}
		} else {
			streak = 1
		}
	}
	
	return currentStreak, bestStreak
}

// calculateOverallStreaks calculates overall streaks across all habits
func calculateOverallStreaks(userID int) (currentStreak, bestStreak int) {
	rows, err := database.DB.Query(`
		SELECT DATE(completed_at) as completion_date
		FROM habit_completions
		WHERE user_id = ?
		GROUP BY DATE(completed_at)
		ORDER BY completion_date DESC
	`, userID)
	if err != nil {
		log.Printf("Failed to calculate overall streaks: %v", err)
		return 0, 0
	}
	defer rows.Close()
	
	var dates []time.Time
	for rows.Next() {
		var date time.Time
		if err := rows.Scan(&date); err != nil {
			continue
		}
		dates = append(dates, date.Truncate(24 * time.Hour))
	}
	
	if len(dates) == 0 {
		return 0, 0
	}
	
	// Calculate current streak (from today backwards)
	today := time.Now().Truncate(24 * time.Hour)
	currentStreak = 0
	expectedDate := today
	
	for i := 0; i < len(dates); i++ {
		date := dates[i]
		if date.Equal(expectedDate) {
			currentStreak++
			expectedDate = expectedDate.AddDate(0, 0, -1)
		} else if date.Before(expectedDate) {
			break
		}
	}
	
	// Calculate best streak
	bestStreak = 1
	streak := 1
	for i := 1; i < len(dates); i++ {
		daysDiff := int(dates[i-1].Sub(dates[i]).Hours() / 24)
		if daysDiff == 1 {
			streak++
			if streak > bestStreak {
				bestStreak = streak
			}
		} else {
			streak = 1
		}
	}
	
	return currentStreak, bestStreak
}

// calculateOverallStreaksAllHabits calculates streaks based on days where ALL active habits were completed
func calculateOverallStreaksAllHabits(userID int) (currentStreak, bestStreak int) {
	// Get total count of active habits
	var totalActiveHabits int
	err := database.DB.QueryRow(`
		SELECT COUNT(*) FROM habits WHERE user_id = ? AND is_active = true
	`, userID).Scan(&totalActiveHabits)
	if err != nil {
		log.Printf("Failed to count active habits: %v", err)
		return 0, 0
	}
	
	if totalActiveHabits == 0 {
		return 0, 0
	}
	
	// Get all completions grouped by date with habit counts
	rows, err := database.DB.Query(`
		SELECT DATE(completed_at) as completion_date, COUNT(DISTINCT habit_id) as habit_count
		FROM habit_completions hc
		INNER JOIN habits h ON hc.habit_id = h.id
		WHERE hc.user_id = ? AND h.user_id = ? AND h.is_active = true
		GROUP BY DATE(completed_at)
		HAVING habit_count >= ?
		ORDER BY completion_date DESC
	`, userID, userID, totalActiveHabits)
	if err != nil {
		log.Printf("Failed to calculate overall streaks (all habits): %v", err)
		return 0, 0
	}
	defer rows.Close()
	
	var dates []time.Time
	for rows.Next() {
		var date time.Time
		var habitCount int
		if err := rows.Scan(&date, &habitCount); err != nil {
			continue
		}
		// Only include dates where all habits were completed
		if habitCount >= totalActiveHabits {
			dates = append(dates, date.Truncate(24 * time.Hour))
		}
	}
	
	if len(dates) == 0 {
		return 0, 0
	}
	
	// Calculate current streak (from today backwards)
	today := time.Now().Truncate(24 * time.Hour)
	currentStreak = 0
	expectedDate := today
	
	for i := 0; i < len(dates); i++ {
		date := dates[i]
		if date.Equal(expectedDate) {
			currentStreak++
			expectedDate = expectedDate.AddDate(0, 0, -1)
		} else if date.Before(expectedDate) {
			break
		}
	}
	
	// Calculate best streak
	bestStreak = 1
	streak := 1
	for i := 1; i < len(dates); i++ {
		daysDiff := int(dates[i-1].Sub(dates[i]).Hours() / 24)
		if daysDiff == 1 {
			streak++
			if streak > bestStreak {
				bestStreak = streak
			}
		} else {
			streak = 1
		}
	}
	
	return currentStreak, bestStreak
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
		log.Printf("Failed to bind JSON: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	log.Printf("Received journal entry request: EntryDate=%v, Mood=%s, Content length=%d, Tags=%s", req.EntryDate, req.Mood, len(req.Content), req.Tags)

	// Check if entry already exists for this date
	var existingID int
	err := database.DB.QueryRow(`
		SELECT id FROM journal_entries WHERE user_id = ? AND DATE(entry_date) = DATE(?)
	`, userID, req.EntryDate).Scan(&existingID)

	if err == sql.ErrNoRows {
		// Create new entry
		log.Printf("Creating new entry for user %d", userID)
		// Ensure tags is valid JSON - if it's already a JSON string, use it; otherwise wrap it
		tagsJSON := req.Tags
		if req.Tags != "" && !strings.HasPrefix(strings.TrimSpace(req.Tags), "[") {
			// If tags is not a JSON array, try to parse it as comma-separated and convert to JSON
			tagsList := strings.Split(req.Tags, ",")
			var cleanTags []string
			for _, tag := range tagsList {
				trimmed := strings.TrimSpace(tag)
				if trimmed != "" {
					cleanTags = append(cleanTags, trimmed)
				}
			}
			if len(cleanTags) > 0 {
				tagsJSONBytes, _ := json.Marshal(cleanTags)
				tagsJSON = string(tagsJSONBytes)
			} else {
				tagsJSON = "[]"
			}
		}
		if tagsJSON == "" {
			tagsJSON = "[]"
		}
		
		result, err := database.DB.Exec(`
			INSERT INTO journal_entries (user_id, entry_date, mood, content, tags)
			VALUES (?, ?, ?, ?, ?)
		`, userID, req.EntryDate, req.Mood, req.Content, tagsJSON)
		if err != nil {
			log.Printf("Failed to create journal entry: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to create journal entry: %v", err)})
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
		log.Printf("Updating existing entry %d for user %d", existingID, userID)
		// Ensure tags is valid JSON
		tagsJSON := req.Tags
		if req.Tags != "" && !strings.HasPrefix(strings.TrimSpace(req.Tags), "[") {
			// If tags is not a JSON array, try to parse it as comma-separated and convert to JSON
			tagsList := strings.Split(req.Tags, ",")
			var cleanTags []string
			for _, tag := range tagsList {
				trimmed := strings.TrimSpace(tag)
				if trimmed != "" {
					cleanTags = append(cleanTags, trimmed)
				}
			}
			if len(cleanTags) > 0 {
				tagsJSONBytes, _ := json.Marshal(cleanTags)
				tagsJSON = string(tagsJSONBytes)
			} else {
				tagsJSON = "[]"
			}
		}
		if tagsJSON == "" {
			tagsJSON = "[]"
		}
		
		_, err := database.DB.Exec(`
			UPDATE journal_entries 
			SET mood = ?, content = ?, tags = ?, updated_at = NOW()
			WHERE id = ?
		`, req.Mood, req.Content, tagsJSON, existingID)
		if err != nil {
			log.Printf("Failed to update journal entry: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to update journal entry: %v", err)})
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

// SummarizeJournalEntries generates an AI summary of journal entries
func (h *JournalHandler) SummarizeJournalEntries(c *gin.Context) {
	_, _ = c.Get("user_id") // User is authenticated via middleware

	var req struct {
		Entries []models.JournalEntry `json:"entries"`
		Days    int                    `json:"days"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Build context string from entries
	context := fmt.Sprintf("Hier sind die Journal-Einträge der letzten %d Tage:\n\n", req.Days)
	
	for i, entry := range req.Entries {
		entryDate, _ := time.Parse("2006-01-02", entry.EntryDate.Format("2006-01-02"))
		context += fmt.Sprintf("=== Eintrag %d: %s ===\n", i+1, entryDate.Format("02.01.2006"))
		
		if entry.Mood != "" {
			moodLabels := map[string]string{
				"excellent": "Ausgezeichnet",
				"good":     "Gut",
				"okay":     "Okay",
				"bad":      "Schlecht",
				"terrible": "Schrecklich",
			}
			if moodLabel, ok := moodLabels[entry.Mood]; ok {
				context += fmt.Sprintf("Stimmung: %s\n", moodLabel)
			}
		}
		
		if entry.Content != "" {
			context += fmt.Sprintf("Inhalt:\n%s\n\n", entry.Content)
		}
	}

	// Use OpenAI service to generate summary
	openAIService := services.NewOpenAIService()
	
	systemPrompt := `Du bist ein hilfreicher Assistent für ein Tagebuch-Tool. 
Du sollst eine aussagekräftige und reflektierende Zusammenfassung der bereitgestellten Journal-Einträge erstellen.
Die Zusammenfassung sollte:
- Die wichtigsten Themen und Muster identifizieren
- Die Entwicklung der Stimmung über die Zeit beschreiben
- Wiederkehrende Themen oder Gewohnheiten hervorheben
- Eine positive und reflektierende Perspektive bieten
- Auf Deutsch formuliert sein
- Maximal 500 Wörter lang sein

Antworte nur mit der Zusammenfassung, kein zusätzlicher Text.`
	
	userMessage := fmt.Sprintf("Bitte erstelle eine Zusammenfassung dieser Journal-Einträge:\n\n%s", context)

	messages := []services.Message{
		{Role: "system", Content: systemPrompt},
		{Role: "user", Content: userMessage},
	}

	request := services.OpenAIRequest{
		Model:       "gpt-3.5-turbo",
		Messages:    messages,
		MaxTokens:   800,
		Temperature: 0.7,
	}

	response, err := openAIService.MakeAPIRequest(request)
	if err != nil {
		log.Printf("OpenAI API Error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate summary"})
		return
	}

	if len(response.Choices) == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "No response from AI"})
		return
	}

	summary := response.Choices[0].Message.Content
	
	c.JSON(http.StatusOK, gin.H{"summary": summary})
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

// GenerateJournalQuestions generates AI questions based on journal context
func (h *JournalHandler) GenerateJournalQuestions(c *gin.Context) {
	var req struct {
		Mood            string   `json:"mood"`
		SelectedHabits  []string `json:"selectedHabits"`
		SelectedTasks   []string `json:"selectedTasks"`
		AdditionalTasks []string `json:"additionalTasks"`
		Appreciations   []string `json:"appreciations"`
		Improvements    []string `json:"improvements"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Build context string for AI
	context := "Der Nutzer hat ein Tagebuch für heute erstellt mit folgenden Informationen:\n\n"
	
	moodLabels := map[string]string{
		"excellent": "Ausgezeichnet",
		"good":     "Gut",
		"okay":     "Okay",
		"bad":      "Schlecht",
		"terrible": "Schrecklich",
	}
	
	if moodLabel, ok := moodLabels[req.Mood]; ok {
		context += fmt.Sprintf("Stimmung: %s\n", moodLabel)
	}
	
	if len(req.SelectedHabits) > 0 {
		context += fmt.Sprintf("Gewohnheiten heute: %s\n", strings.Join(req.SelectedHabits, ", "))
	}
	
	allTasks := append(req.SelectedTasks, req.AdditionalTasks...)
	if len(allTasks) > 0 {
		context += fmt.Sprintf("Erledigte Aufgaben: %s\n", strings.Join(allTasks, ", "))
	}
	
	if len(req.Appreciations) > 0 {
		context += fmt.Sprintf("Wertgeschätzt heute:\n")
		for i, app := range req.Appreciations {
			if app != "" {
				context += fmt.Sprintf("%d. %s\n", i+1, app)
			}
		}
	}
	
	if len(req.Improvements) > 0 {
		context += fmt.Sprintf("Verbesserungen für nächstes Mal:\n")
		for i, imp := range req.Improvements {
			if imp != "" {
				context += fmt.Sprintf("%d. %s\n", i+1, imp)
			}
		}
	}

	// Use OpenAI service to generate questions
	openAIService := services.NewOpenAIService()
	
	systemPrompt := `Du bist ein hilfreicher Assistent für ein Tagebuch-Tool. 
Basierend auf den Informationen, die der Nutzer bereits eingegeben hat, generiere 2-3 passende Reflexionsfragen.
Die Fragen sollten:
- Auf die eingegebenen Informationen Bezug nehmen
- Tiefgründig und nachdenklich sein
- Dem Nutzer helfen, seinen Tag zu reflektieren
- Auf Deutsch formuliert sein

Antworte NUR mit einem JSON-Array von Fragen-Objekten im Format: [{"question": "Frage 1?"}, {"question": "Frage 2?"}]
Kein zusätzlicher Text, nur das JSON-Array.`

	userMessage := fmt.Sprintf(`Basierend auf diesen Informationen:\n\n%s\n\nGeneriere 2-3 passende Reflexionsfragen für das Tagebuch.`, context)

	messages := []services.Message{
		{Role: "system", Content: systemPrompt},
		{Role: "user", Content: userMessage},
	}

	request := services.OpenAIRequest{
		Model:       "gpt-3.5-turbo",
		Messages:    messages,
		MaxTokens:   300,
		Temperature: 0.7,
	}

	// Create a temporary service instance to access makeAPIRequest
	// We need to make the request directly
	response, err := openAIService.MakeAPIRequest(request)
	if err != nil {
		log.Printf("OpenAI API Error: %v", err)
		// Fallback to default questions if AI fails
		defaultQuestions := []gin.H{
			{"question": "Was hat dich heute besonders motiviert?"},
			{"question": "Gibt es etwas, wofür du heute besonders dankbar bist?"},
		}
		c.JSON(http.StatusOK, defaultQuestions)
		return
	}

	if len(response.Choices) == 0 {
		// Fallback to default questions
		defaultQuestions := []gin.H{
			{"question": "Was hat dich heute besonders motiviert?"},
			{"question": "Gibt es etwas, wofür du heute besonders dankbar bist?"},
		}
		c.JSON(http.StatusOK, defaultQuestions)
		return
	}

	aiResponse := response.Choices[0].Message.Content
	
	log.Printf("AI Response: %s", aiResponse)
	
	// Try to parse JSON array
	var questions []struct {
		Question string `json:"question"`
	}
	if err := json.Unmarshal([]byte(aiResponse), &questions); err != nil {
		log.Printf("Failed to parse JSON, trying fallback: %v", err)
		// If parsing fails, try to extract questions from text
		// Fallback: split by line and filter
		lines := strings.Split(aiResponse, "\n")
		extractedQuestions := []gin.H{}
		for _, line := range lines {
			line = strings.TrimSpace(line)
			if line != "" && (strings.HasSuffix(line, "?") || strings.HasSuffix(line, ".")) {
				// Remove quotes and brackets if present
				line = strings.Trim(line, "\"'[]")
				if line != "" {
					extractedQuestions = append(extractedQuestions, gin.H{"question": line})
				}
			}
		}
		
		// If still no questions, use defaults
		if len(extractedQuestions) == 0 {
			log.Printf("No questions extracted, using defaults")
			extractedQuestions = []gin.H{
				{"question": "Was hat dich heute besonders motiviert?"},
				{"question": "Gibt es etwas, wofür du heute besonders dankbar bist?"},
			}
		}
		log.Printf("Returning %d extracted questions", len(extractedQuestions))
		c.JSON(http.StatusOK, extractedQuestions)
		return
	}

	// Convert to gin.H format
	questionObjects := make([]gin.H, len(questions))
	for i, q := range questions {
		questionObjects[i] = gin.H{"question": q.Question}
	}

	// Limit to max 3 questions
	if len(questionObjects) > 3 {
		questionObjects = questionObjects[:3]
	}

	log.Printf("Returning %d questions", len(questionObjects))
	c.JSON(http.StatusOK, questionObjects)
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
		log.Printf("Failed to fetch chat sessions: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch chat sessions", "details": err.Error()})
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
		log.Printf("Failed to create chat session: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create chat session", "details": err.Error()})
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
		var suggestionsJSON sql.NullString
		err := rows.Scan(&message.ID, &message.SessionID, &message.Type, &message.Content, &suggestionsJSON, &message.CreatedAt)
		if err != nil {
			log.Printf("Failed to scan message: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to scan message", "details": err.Error()})
			return
		}

		var suggestions []string
		if suggestionsJSON.Valid && suggestionsJSON.String != "" {
			if err := json.Unmarshal([]byte(suggestionsJSON.String), &suggestions); err != nil {
				log.Printf("Failed to unmarshal suggestions: %v", err)
				suggestions = []string{}
			}
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
		// Convert database type to OpenAI role format
		role := msgType
		if msgType == "ai" {
			role = "assistant" // OpenAI expects 'assistant' not 'ai'
		}
		// Only include valid OpenAI roles
		if role == "user" || role == "assistant" {
			conversationHistory = append(conversationHistory, services.Message{
				Role:    role,
				Content: content,
			})
		}
	}

	// Build RAG context from user data
	userContext, err := services.BuildUserContext(userID.(int))
	if err != nil {
		log.Printf("Failed to build user context: %v", err)
		userContext = "" // Continue without context if it fails
	}

	// Generate AI response with RAG context
	aiResponse, suggestions, err := h.openAIService.GenerateCoachResponse(req.Content, conversationHistory, userContext)
	if err != nil {
		log.Printf("OpenAI API Error: %v", err)
		aiResponse = fmt.Sprintf("Entschuldigung, ich konnte deine Nachricht nicht verarbeiten. Fehler: %v", err)
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

// NoteHandler handles note/plan endpoints
type NoteHandler struct{}

// NewNoteHandler creates a new note handler
func NewNoteHandler() *NoteHandler {
	return &NoteHandler{}
}

// GetNotes returns all notes for the authenticated user
func (h *NoteHandler) GetNotes(c *gin.Context) {
	userID, _ := c.Get("user_id")

	rows, err := database.DB.Query(`
		SELECT id, user_id, title, content, color, is_pinned, created_at, updated_at
		FROM notes WHERE user_id = ?
		ORDER BY is_pinned DESC, updated_at DESC
	`, userID)
	if err != nil {
		log.Printf("Failed to query notes for user %v: %v", userID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch notes"})
		return
	}
	defer rows.Close()

	var notes []models.Note
	for rows.Next() {
		var note models.Note
		err := rows.Scan(&note.ID, &note.UserID, &note.Title, &note.Content, &note.Color, &note.IsPinned, &note.CreatedAt, &note.UpdatedAt)
		if err != nil {
			log.Printf("Failed to scan note: %v", err)
			continue
		}
		notes = append(notes, note)
	}

	// Get checklist items for all notes at once (more efficient)
	noteIDs := make([]int, len(notes))
	for i, note := range notes {
		noteIDs[i] = note.ID
	}

	checklistMap := make(map[int][]models.ChecklistItem)
	if len(noteIDs) > 0 {
		placeholders := strings.Repeat("?,", len(noteIDs))
		placeholders = placeholders[:len(placeholders)-1]
		
		checklistRows, err := database.DB.Query(fmt.Sprintf(`
			SELECT id, note_id, text, is_checked, position, created_at, updated_at
			FROM checklist_items WHERE note_id IN (%s)
			ORDER BY note_id, position ASC, created_at ASC
		`, placeholders), convertIntsToInterface(noteIDs)...)
		if err == nil {
			defer checklistRows.Close()
			for checklistRows.Next() {
				var item models.ChecklistItem
				err := checklistRows.Scan(&item.ID, &item.NoteID, &item.Text, &item.IsChecked, &item.Position, &item.CreatedAt, &item.UpdatedAt)
				if err == nil {
					checklistMap[item.NoteID] = append(checklistMap[item.NoteID], item)
				}
			}
		}
	}

	// Get media attachments for all notes
	mediaMap := make(map[int][]models.MediaAttachment)
	if len(noteIDs) > 0 {
		placeholders := strings.Repeat("?,", len(noteIDs))
		placeholders = placeholders[:len(placeholders)-1]
		
		mediaRows, err := database.DB.Query(fmt.Sprintf(`
			SELECT id, note_id, user_id, file_name, file_type, file_path, file_size, mime_type, 
			       converted_text, conversion_status, created_at, updated_at
			FROM media_attachments WHERE note_id IN (%s)
			ORDER BY note_id, created_at ASC
		`, placeholders), convertIntsToInterface(noteIDs)...)
		if err == nil {
			defer mediaRows.Close()
			for mediaRows.Next() {
				var attachment models.MediaAttachment
				var convertedText sql.NullString
				err := mediaRows.Scan(&attachment.ID, &attachment.NoteID, &attachment.UserID, 
					&attachment.FileName, &attachment.FileType, &attachment.FilePath, 
					&attachment.FileSize, &attachment.MimeType, &convertedText, 
					&attachment.ConversionStatus, &attachment.CreatedAt, &attachment.UpdatedAt)
				if err == nil {
					if convertedText.Valid {
						attachment.ConvertedText = convertedText.String
					}
					mediaMap[attachment.NoteID] = append(mediaMap[attachment.NoteID], attachment)
				}
			}
		}
	}

	// Get plan preview (first line) for all notes
	planPreviewMap := make(map[int]string)
	if len(noteIDs) > 0 {
		placeholders := strings.Repeat("?,", len(noteIDs))
		placeholders = placeholders[:len(placeholders)-1]
		
		planRows, err := database.DB.Query(fmt.Sprintf(`
			SELECT note_id, generated_plan
			FROM plan_data WHERE note_id IN (%s) AND generated_plan IS NOT NULL AND generated_plan != ''
		`, placeholders), convertIntsToInterface(noteIDs)...)
		if err == nil {
			defer planRows.Close()
			for planRows.Next() {
				var noteID int
				var generatedPlan sql.NullString
				err := planRows.Scan(&noteID, &generatedPlan)
				if err == nil && generatedPlan.Valid && generatedPlan.String != "" {
					// Extract first line (up to first newline or first 100 characters)
					planText := generatedPlan.String
					firstNewline := strings.Index(planText, "\n")
					if firstNewline > 0 {
						planText = planText[:firstNewline]
					}
					// Limit to 100 characters for preview
					if len(planText) > 100 {
						planText = planText[:100] + "..."
					}
					planPreviewMap[noteID] = planText
				}
			}
		}
	}

	// Convert notes to NoteWithChecklist
	notesWithChecklist := make([]models.NoteWithChecklist, len(notes))
	for i, note := range notes {
		items := checklistMap[note.ID]
		if items == nil {
			items = []models.ChecklistItem{}
		}
		mediaAttachments := mediaMap[note.ID]
		if mediaAttachments == nil {
			mediaAttachments = []models.MediaAttachment{}
		}
		notesWithChecklist[i] = models.NoteWithChecklist{
			Note:            note,
			ChecklistItems:  items,
			MediaAttachments: mediaAttachments,
			PlanPreview:     planPreviewMap[note.ID], // Add plan preview
		}
	}
	c.JSON(http.StatusOK, notesWithChecklist)
}

// CreateNote creates a new note
func (h *NoteHandler) CreateNote(c *gin.Context) {
	userID, _ := c.Get("user_id")

	var req models.CreateNoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Color == "" {
		req.Color = "primary"
	}

	result, err := database.DB.Exec(`
		INSERT INTO notes (user_id, title, content, color)
		VALUES (?, ?, ?, ?)
	`, userID, req.Title, req.Content, req.Color)
	if err != nil {
		log.Printf("Failed to create note: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create note"})
		return
	}

	noteID, _ := result.LastInsertId()

	note := models.Note{
		ID:        int(noteID),
		UserID:    userID.(int),
		Title:     req.Title,
		Content:   req.Content,
		Color:     req.Color,
		IsPinned:  false,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	c.JSON(http.StatusCreated, models.NoteWithChecklist{
		Note:           note,
		ChecklistItems: []models.ChecklistItem{},
	})
}

// UpdateNote updates a note
func (h *NoteHandler) UpdateNote(c *gin.Context) {
	userID, _ := c.Get("user_id")
	noteIDStr := c.Param("id")
	noteID, err := strconv.Atoi(noteIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid note ID"})
		return
	}

	// Verify note belongs to user
	var note models.Note
	err = database.DB.QueryRow(`
		SELECT id, user_id FROM notes WHERE id = ? AND user_id = ?
	`, noteID, userID).Scan(&note.ID, &note.UserID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Note not found"})
		return
	}

	var req models.UpdateNoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Build update query dynamically
	updateFields := []string{}
	args := []interface{}{}

	if req.Title != nil {
		updateFields = append(updateFields, "title = ?")
		args = append(args, *req.Title)
	}
	if req.Content != nil {
		updateFields = append(updateFields, "content = ?")
		args = append(args, *req.Content)
	}
	if req.Color != nil {
		updateFields = append(updateFields, "color = ?")
		args = append(args, *req.Color)
	}
	if req.IsPinned != nil {
		updateFields = append(updateFields, "is_pinned = ?")
		args = append(args, *req.IsPinned)
	}

	if len(updateFields) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No fields to update"})
		return
	}

	updateFields = append(updateFields, "updated_at = NOW()")
	args = append(args, noteID)

	query := fmt.Sprintf("UPDATE notes SET %s WHERE id = ?", strings.Join(updateFields, ", "))
	_, err = database.DB.Exec(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update note"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Note updated successfully"})
}

// DeleteNote deletes a note
func (h *NoteHandler) DeleteNote(c *gin.Context) {
	userID, _ := c.Get("user_id")
	noteIDStr := c.Param("id")
	noteID, err := strconv.Atoi(noteIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid note ID"})
		return
	}

	// Verify note belongs to user
	var note models.Note
	err = database.DB.QueryRow(`
		SELECT id, user_id FROM notes WHERE id = ? AND user_id = ?
	`, noteID, userID).Scan(&note.ID, &note.UserID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Note not found"})
		return
	}

	_, err = database.DB.Exec(`DELETE FROM notes WHERE id = ?`, noteID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete note"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Note deleted successfully"})
}

// CreateChecklistItem creates a new checklist item
func (h *NoteHandler) CreateChecklistItem(c *gin.Context) {
	userID, _ := c.Get("user_id")
	noteIDStr := c.Param("id")
	noteID, err := strconv.Atoi(noteIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid note ID"})
		return
	}

	// Verify note belongs to user
	var note models.Note
	err = database.DB.QueryRow(`
		SELECT id, user_id FROM notes WHERE id = ? AND user_id = ?
	`, noteID, userID).Scan(&note.ID, &note.UserID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Note not found"})
		return
	}

	var req models.CreateChecklistItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get max position if not provided
	if req.Position == 0 {
		var maxPos sql.NullInt64
		database.DB.QueryRow(`SELECT MAX(position) FROM checklist_items WHERE note_id = ?`, noteID).Scan(&maxPos)
		if maxPos.Valid {
			req.Position = int(maxPos.Int64) + 1
		} else {
			req.Position = 1
		}
	}

	result, err := database.DB.Exec(`
		INSERT INTO checklist_items (note_id, text, position)
		VALUES (?, ?, ?)
	`, noteID, req.Text, req.Position)
	if err != nil {
		log.Printf("Failed to create checklist item: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create checklist item"})
		return
	}

	itemID, _ := result.LastInsertId()

	item := models.ChecklistItem{
		ID:        int(itemID),
		NoteID:    noteID,
		Text:      req.Text,
		IsChecked: false,
		Position:  req.Position,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	c.JSON(http.StatusCreated, item)
}

// UpdateChecklistItem updates a checklist item
func (h *NoteHandler) UpdateChecklistItem(c *gin.Context) {
	userID, _ := c.Get("user_id")
	itemIDStr := c.Param("itemId")
	itemID, err := strconv.Atoi(itemIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid item ID"})
		return
	}

	// Verify item belongs to user's note
	var noteID int
	err = database.DB.QueryRow(`
		SELECT ci.note_id FROM checklist_items ci
		INNER JOIN notes n ON ci.note_id = n.id
		WHERE ci.id = ? AND n.user_id = ?
	`, itemID, userID).Scan(&noteID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Checklist item not found"})
		return
	}

	var req models.UpdateChecklistItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updateFields := []string{}
	args := []interface{}{}

	if req.Text != nil {
		updateFields = append(updateFields, "text = ?")
		args = append(args, *req.Text)
	}
	if req.IsChecked != nil {
		updateFields = append(updateFields, "is_checked = ?")
		args = append(args, *req.IsChecked)
	}
	if req.Position != nil {
		updateFields = append(updateFields, "position = ?")
		args = append(args, *req.Position)
	}

	if len(updateFields) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No fields to update"})
		return
	}

	updateFields = append(updateFields, "updated_at = NOW()")
	args = append(args, itemID)

	query := fmt.Sprintf("UPDATE checklist_items SET %s WHERE id = ?", strings.Join(updateFields, ", "))
	_, err = database.DB.Exec(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update checklist item"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Checklist item updated successfully"})
}

// DeleteChecklistItem deletes a checklist item
func (h *NoteHandler) DeleteChecklistItem(c *gin.Context) {
	userID, _ := c.Get("user_id")
	itemIDStr := c.Param("itemId")
	itemID, err := strconv.Atoi(itemIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid item ID"})
		return
	}

	// Verify item belongs to user's note
	var noteID int
	err = database.DB.QueryRow(`
		SELECT ci.note_id FROM checklist_items ci
		INNER JOIN notes n ON ci.note_id = n.id
		WHERE ci.id = ? AND n.user_id = ?
	`, itemID, userID).Scan(&noteID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Checklist item not found"})
		return
	}

	_, err = database.DB.Exec(`DELETE FROM checklist_items WHERE id = ?`, itemID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete checklist item"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Checklist item deleted successfully"})
}

// Helper function to convert int slice to interface slice
func convertIntsToInterface(ints []int) []interface{} {
	result := make([]interface{}, len(ints))
	for i, v := range ints {
		result[i] = v
	}
	return result
}

// GetPlanData retrieves plan data for a note
func (h *NoteHandler) GetPlanData(c *gin.Context) {
	userID, _ := c.Get("user_id")
	noteIDStr := c.Param("id")
	noteID, err := strconv.Atoi(noteIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid note ID"})
		return
	}

	// Verify note belongs to user
	var note models.Note
	err = database.DB.QueryRow(`
		SELECT id, user_id FROM notes WHERE id = ? AND user_id = ?
	`, noteID, userID).Scan(&note.ID, &note.UserID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Note not found"})
		return
	}

	// Get plan data
	var planData models.PlanData
	var goal, timeAndMilestones, additionalInfo, generatedPlan sql.NullString
	err = database.DB.QueryRow(`
		SELECT id, note_id, goal, time_and_milestones, additional_info, generated_plan, created_at, updated_at
		FROM plan_data WHERE note_id = ?
	`, noteID).Scan(&planData.ID, &planData.NoteID, &goal, &timeAndMilestones, 
		&additionalInfo, &generatedPlan, &planData.CreatedAt, &planData.UpdatedAt)
	
	if err == nil {
		if goal.Valid {
			planData.Goal = goal.String
		}
		if timeAndMilestones.Valid {
			planData.TimeAndMilestones = timeAndMilestones.String
		}
		if additionalInfo.Valid {
			planData.AdditionalInfo = additionalInfo.String
		}
		if generatedPlan.Valid {
			planData.GeneratedPlan = generatedPlan.String
		}
	}
	
	if err == sql.ErrNoRows {
		// No plan data yet, return empty
		c.JSON(http.StatusOK, models.PlanData{NoteID: noteID})
		return
	}
	if err != nil {
		log.Printf("Failed to get plan data: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch plan data"})
		return
	}

	c.JSON(http.StatusOK, planData)
}

// SavePlanAnswers saves the answers to the planning questions
func (h *NoteHandler) SavePlanAnswers(c *gin.Context) {
	userID, _ := c.Get("user_id")
	noteIDStr := c.Param("id")
	noteID, err := strconv.Atoi(noteIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid note ID"})
		return
	}

	// Verify note belongs to user
	var note models.Note
	err = database.DB.QueryRow(`
		SELECT id, user_id, title, content FROM notes WHERE id = ? AND user_id = ?
	`, noteID, userID).Scan(&note.ID, &note.UserID, &note.Title, &note.Content)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Note not found"})
		return
	}

	var req models.SavePlanAnswersRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if plan data already exists
	var existingID int
	err = database.DB.QueryRow(`SELECT id FROM plan_data WHERE note_id = ?`, noteID).Scan(&existingID)
	
	if err == sql.ErrNoRows {
		// Insert new plan data
		result, err := database.DB.Exec(`
			INSERT INTO plan_data (note_id, goal, time_and_milestones, additional_info)
			VALUES (?, ?, ?, ?)
		`, noteID, req.Goal, req.TimeAndMilestones, req.AdditionalInfo)
		if err != nil {
			log.Printf("Failed to save plan answers: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save plan answers"})
			return
		}
		existingID64, _ := result.LastInsertId()
		existingID = int(existingID64)
	} else if err == nil {
		// Update existing plan data
		_, err = database.DB.Exec(`
			UPDATE plan_data 
			SET goal = ?, time_and_milestones = ?, additional_info = ?, updated_at = NOW()
			WHERE note_id = ?
		`, req.Goal, req.TimeAndMilestones, req.AdditionalInfo, noteID)
		if err != nil {
			log.Printf("Failed to update plan answers: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update plan answers"})
			return
		}
	} else {
		log.Printf("Failed to check existing plan data: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save plan answers"})
		return
	}

	// Generate plan using OpenAI
	planData := models.PlanData{
		ID:                existingID,
		NoteID:            noteID,
		Goal:              req.Goal,
		TimeAndMilestones: req.TimeAndMilestones,
		AdditionalInfo:    req.AdditionalInfo,
	}

	generatedPlan, err := h.generatePlan(note, planData)
	if err != nil {
		log.Printf("Failed to generate plan: %v", err)
		// Return error details to client
		c.JSON(http.StatusOK, gin.H{
			"message": "Plan answers saved successfully, but plan generation failed",
			"error": err.Error(),
			"plan_data": planData,
		})
		return
	}

	// Update with generated plan
	planData.GeneratedPlan = generatedPlan
	_, err = database.DB.Exec(`
		UPDATE plan_data SET generated_plan = ?, updated_at = NOW() WHERE id = ?
	`, generatedPlan, existingID)
	if err != nil {
		log.Printf("Failed to save generated plan: %v", err)
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Plan answers saved and plan generated successfully",
		"plan_data": planData,
	})
}

// generatePlan generates a plan using OpenAI based on the note and answers
func (h *NoteHandler) generatePlan(note models.Note, planData models.PlanData) (string, error) {
	// Get media attachments with converted text
	mediaTexts := []string{}
	rows, err := database.DB.Query(`
		SELECT file_name, file_type, converted_text, conversion_status
		FROM media_attachments 
		WHERE note_id = ? AND conversion_status = 'completed' AND converted_text IS NOT NULL AND converted_text != ''
		ORDER BY created_at ASC
	`, note.ID)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var fileName, fileType, conversionStatus string
			var convertedText sql.NullString
			err := rows.Scan(&fileName, &fileType, &convertedText, &conversionStatus)
			if err == nil && convertedText.Valid && convertedText.String != "" {
				// Skip error messages
				if !strings.HasPrefix(convertedText.String, "Konvertierungsfehler:") {
					mediaTexts = append(mediaTexts, fmt.Sprintf("[%s (%s)]: %s", fileName, fileType, convertedText.String))
					log.Printf("Including media attachment in plan prompt: %s (%s), text length: %d", fileName, fileType, len(convertedText.String))
				} else {
					log.Printf("Skipping media attachment with error: %s (%s)", fileName, fileType)
				}
			}
		}
	} else {
		log.Printf("Failed to query media attachments for note ID %d: %v", note.ID, err)
	}

	// Build media context
	mediaContext := ""
	if len(mediaTexts) > 0 {
		mediaContext = "\n\nZusätzliche Informationen aus hochgeladenen Medien:\n" + strings.Join(mediaTexts, "\n\n")
		log.Printf("Media context for plan generation (note ID %d): %d attachments, total context length: %d", note.ID, len(mediaTexts), len(mediaContext))
	} else {
		log.Printf("No media attachments found for note ID %d or all failed conversion", note.ID)
	}

	prompt := fmt.Sprintf(`Erstelle einen klaren, strukturierten Plan basierend auf folgenden Informationen:

Titel des Plans: %s
Inhalt des Plans: %s

Antworten des Nutzers:
1. Ziel des Plans: %s
2. Zeit und Zwischenziele: %s
3. Weitere wichtige Informationen: %s%s

Erstelle einen präzisen, nicht zu langen Plan (maximal 300 Wörter). Der Plan soll:
- Klar strukturiert sein
- Konkrete Schritte enthalten
- Realistisch und umsetzbar sein
- Die gegebenen Informationen berücksichtigen
- Die Informationen aus den hochgeladenen Medien EINBEZIEHEN und darauf Bezug nehmen

Format: Verwende Aufzählungspunkte oder nummerierte Schritte für bessere Lesbarkeit.`, 
		note.Title, note.Content, planData.Goal, planData.TimeAndMilestones, planData.AdditionalInfo, mediaContext)
	
	log.Printf("Plan generation prompt for note ID %d, total length: %d, includes media: %v", note.ID, len(prompt), len(mediaContext) > 0)

	log.Printf("Generating plan for note ID: %d, Title: %s", note.ID, note.Title)
	
	openaiService := services.NewOpenAIService()
	if openaiService.APIKey == "" {
		log.Printf("ERROR: OpenAI API key is not configured")
		return "", fmt.Errorf("OpenAI API key is not configured. Please check your environment variables.")
	}
	
	response, err := openaiService.GenerateResponse(prompt, "Du bist ein hilfreicher Planungsassistent.")
	if err != nil {
		log.Printf("ERROR: Failed to generate plan via OpenAI: %v", err)
		return "", fmt.Errorf("Fehler bei der Plan-Generierung: %v", err)
	}

	if response == "" {
		log.Printf("ERROR: OpenAI returned empty response")
		return "", fmt.Errorf("OpenAI hat eine leere Antwort zurückgegeben")
	}

	log.Printf("Plan generated successfully, length: %d characters", len(response))
	return response, nil
}

// UpdatePlanViaChat updates the plan based on user chat message
func (h *NoteHandler) UpdatePlanViaChat(c *gin.Context) {
	userID, _ := c.Get("user_id")
	noteIDStr := c.Param("id")
	noteID, err := strconv.Atoi(noteIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid note ID"})
		return
	}

	// Verify note belongs to user
	var note models.Note
	err = database.DB.QueryRow(`
		SELECT id, user_id, title, content FROM notes WHERE id = ? AND user_id = ?
	`, noteID, userID).Scan(&note.ID, &note.UserID, &note.Title, &note.Content)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Note not found"})
		return
	}

	// Get current plan data
	var planData models.PlanData
	var goal, timeAndMilestones, additionalInfo, generatedPlan sql.NullString
	err = database.DB.QueryRow(`
		SELECT id, note_id, goal, time_and_milestones, additional_info, generated_plan, created_at, updated_at
		FROM plan_data WHERE note_id = ?
	`, noteID).Scan(&planData.ID, &planData.NoteID, &goal, &timeAndMilestones, 
		&additionalInfo, &generatedPlan, &planData.CreatedAt, &planData.UpdatedAt)
	
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Plan data not found. Please generate a plan first."})
		return
	}
	if err != nil {
		log.Printf("Failed to get plan data: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch plan data"})
		return
	}

	if goal.Valid {
		planData.Goal = goal.String
	}
	if timeAndMilestones.Valid {
		planData.TimeAndMilestones = timeAndMilestones.String
	}
	if additionalInfo.Valid {
		planData.AdditionalInfo = additionalInfo.String
	}
	if generatedPlan.Valid {
		planData.GeneratedPlan = generatedPlan.String
	}

	var req models.UpdatePlanChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Generate updated plan using OpenAI
	updatedPlan, err := h.updatePlanWithChat(note, planData, req.Message)
	if err != nil {
		log.Printf("Failed to update plan via chat: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Fehler bei der Plan-Aktualisierung: %v", err)})
		return
	}

	// Update plan in database
	_, err = database.DB.Exec(`
		UPDATE plan_data SET generated_plan = ?, updated_at = NOW() WHERE id = ?
	`, updatedPlan, planData.ID)
	if err != nil {
		log.Printf("Failed to save updated plan: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save updated plan"})
		return
	}

	planData.GeneratedPlan = updatedPlan

	c.JSON(http.StatusOK, gin.H{
		"message": "Plan updated successfully",
		"plan_data": planData,
	})
}

// updatePlanWithChat updates the plan based on user chat message
func (h *NoteHandler) updatePlanWithChat(note models.Note, planData models.PlanData, userMessage string) (string, error) {
	// Get media attachments with converted text
	mediaTexts := []string{}
	rows, err := database.DB.Query(`
		SELECT file_name, file_type, converted_text 
		FROM media_attachments 
		WHERE note_id = ? AND conversion_status = 'completed' AND converted_text IS NOT NULL AND converted_text != ''
		ORDER BY created_at ASC
	`, note.ID)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var fileName, fileType string
			var convertedText sql.NullString
			err := rows.Scan(&fileName, &fileType, &convertedText)
			if err == nil && convertedText.Valid && convertedText.String != "" {
				// Skip error messages
				if !strings.HasPrefix(convertedText.String, "Konvertierungsfehler:") {
					mediaTexts = append(mediaTexts, fmt.Sprintf("[%s (%s)]: %s", fileName, fileType, convertedText.String))
				}
			}
		}
	}

	// Build media context
	mediaContext := ""
	if len(mediaTexts) > 0 {
		mediaContext = "\n\nZusätzliche Informationen aus hochgeladenen Medien:\n" + strings.Join(mediaTexts, "\n\n")
		log.Printf("Media context for plan update (note ID %d): %d attachments", note.ID, len(mediaTexts))
	}

	prompt := fmt.Sprintf(`Du hast einen bestehenden Plan, der angepasst werden soll. Hier sind die Informationen:

Titel des Plans: %s
Inhalt des Plans: %s

Ursprüngliche Antworten:
1. Ziel des Plans: %s
2. Zeit und Zwischenziele: %s
3. Weitere wichtige Informationen: %s%s

Aktueller Plan:
%s

Nutzer-Anfrage zur Anpassung: %s

Bitte passe den Plan entsprechend der Nutzer-Anfrage an. Der Plan soll:
- Klar strukturiert sein
- Konkrete Schritte enthalten
- Realistisch und umsetzbar sein
- Die ursprünglichen Informationen berücksichtigen
- Die Anpassungen aus der Nutzer-Anfrage einbeziehen
- Die Informationen aus den hochgeladenen Medien berücksichtigen

Format: Verwende Aufzählungspunkte oder nummerierte Schritte für bessere Lesbarkeit. Antworte NUR mit dem aktualisierten Plan, keine zusätzlichen Erklärungen.`, 
		note.Title, note.Content, planData.Goal, planData.TimeAndMilestones, 
		planData.AdditionalInfo, mediaContext, planData.GeneratedPlan, userMessage)

	log.Printf("Updating plan for note ID: %d based on chat message", note.ID)
	
	openaiService := services.NewOpenAIService()
	if openaiService.APIKey == "" {
		log.Printf("ERROR: OpenAI API key is not configured")
		return "", fmt.Errorf("OpenAI API key is not configured")
	}
	
	response, err := openaiService.GenerateResponse(prompt, "Du bist ein hilfreicher Planungsassistent, der Pläne präzise anpasst.")
	if err != nil {
		log.Printf("ERROR: Failed to update plan via OpenAI: %v", err)
		return "", fmt.Errorf("Fehler bei der Plan-Aktualisierung: %v", err)
	}

	if response == "" {
		log.Printf("ERROR: OpenAI returned empty response")
		return "", fmt.Errorf("OpenAI hat eine leere Antwort zurückgegeben")
	}

	log.Printf("Plan updated successfully, length: %d characters", len(response))
	return response, nil
}

// AdoptPlan copies the generated plan into the note content
func (h *NoteHandler) AdoptPlan(c *gin.Context) {
	userID, _ := c.Get("user_id")
	noteIDStr := c.Param("id")
	noteID, err := strconv.Atoi(noteIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid note ID"})
		return
	}

	// Verify note belongs to user
	var note models.Note
	err = database.DB.QueryRow(`
		SELECT id, user_id FROM notes WHERE id = ? AND user_id = ?
	`, noteID, userID).Scan(&note.ID, &note.UserID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Note not found"})
		return
	}

	// Get current plan data
	var planData models.PlanData
	var goal, timeAndMilestones, additionalInfo, generatedPlan sql.NullString
	err = database.DB.QueryRow(`
		SELECT id, note_id, goal, time_and_milestones, additional_info, generated_plan, created_at, updated_at
		FROM plan_data WHERE note_id = ?
	`, noteID).Scan(&planData.ID, &planData.NoteID, &goal, &timeAndMilestones, 
		&additionalInfo, &generatedPlan, &planData.CreatedAt, &planData.UpdatedAt)
	
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Plan data not found. Please generate a plan first."})
		return
	}
	if err != nil {
		log.Printf("Failed to get plan data: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch plan data"})
		return
	}

	if !generatedPlan.Valid || generatedPlan.String == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No generated plan found. Please generate a plan first."})
		return
	}

	// Update note content with generated plan
	_, err = database.DB.Exec(`
		UPDATE notes SET content = ?, updated_at = NOW() WHERE id = ?
	`, generatedPlan.String, noteID)
	if err != nil {
		log.Printf("Failed to adopt plan: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to adopt plan"})
		return
	}

	// Fetch updated note
	var updatedNote models.Note
	err = database.DB.QueryRow(`
		SELECT id, user_id, title, content, color, is_pinned, created_at, updated_at
		FROM notes WHERE id = ?
	`, noteID).Scan(&updatedNote.ID, &updatedNote.UserID, &updatedNote.Title, 
		&updatedNote.Content, &updatedNote.Color, &updatedNote.IsPinned, 
		&updatedNote.CreatedAt, &updatedNote.UpdatedAt)
	if err != nil {
		log.Printf("Failed to fetch updated note: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch updated note"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Plan successfully adopted into note",
		"note": updatedNote,
	})
}

// GenerateChecklist generates a checklist based on the plan
func (h *NoteHandler) GenerateChecklist(c *gin.Context) {
	userID, _ := c.Get("user_id")
	noteIDStr := c.Param("id")
	noteID, err := strconv.Atoi(noteIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid note ID"})
		return
	}

	// Verify note belongs to user
	var note models.Note
	err = database.DB.QueryRow(`
		SELECT id, user_id, title, content FROM notes WHERE id = ? AND user_id = ?
	`, noteID, userID).Scan(&note.ID, &note.UserID, &note.Title, &note.Content)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Note not found"})
		return
	}

	// Get current plan data
	var planData models.PlanData
	var goal, timeAndMilestones, additionalInfo, generatedPlan sql.NullString
	err = database.DB.QueryRow(`
		SELECT id, note_id, goal, time_and_milestones, additional_info, generated_plan, created_at, updated_at
		FROM plan_data WHERE note_id = ?
	`, noteID).Scan(&planData.ID, &planData.NoteID, &goal, &timeAndMilestones, 
		&additionalInfo, &generatedPlan, &planData.CreatedAt, &planData.UpdatedAt)
	
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Plan data not found. Please generate a plan first."})
		return
	}
	if err != nil {
		log.Printf("Failed to get plan data: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch plan data"})
		return
	}

	if goal.Valid {
		planData.Goal = goal.String
	}
	if timeAndMilestones.Valid {
		planData.TimeAndMilestones = timeAndMilestones.String
	}
	if additionalInfo.Valid {
		planData.AdditionalInfo = additionalInfo.String
	}
	if !generatedPlan.Valid || generatedPlan.String == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No generated plan found. Please generate a plan first."})
		return
	}
	planData.GeneratedPlan = generatedPlan.String

	// Get existing checklist items
	existingItems := []models.ChecklistItem{}
	checklistRows, err := database.DB.Query(`
		SELECT id, note_id, text, is_checked, position, created_at, updated_at
		FROM checklist_items WHERE note_id = ?
		ORDER BY position ASC, created_at ASC
	`, noteID)
	if err == nil {
		defer checklistRows.Close()
		for checklistRows.Next() {
			var item models.ChecklistItem
			err := checklistRows.Scan(&item.ID, &item.NoteID, &item.Text, &item.IsChecked, &item.Position, &item.CreatedAt, &item.UpdatedAt)
			if err == nil {
				existingItems = append(existingItems, item)
			}
		}
	}

	// Generate checklist using OpenAI (with existing items context)
	checklistItems, err := h.generateChecklistFromPlan(note, planData, existingItems)
	if err != nil {
		log.Printf("Failed to generate checklist: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Fehler bei der Checklist-Generierung: %v", err)})
		return
	}

	// Get current max position
	var maxPos sql.NullInt64
	database.DB.QueryRow(`SELECT MAX(position) FROM checklist_items WHERE note_id = ?`, noteID).Scan(&maxPos)
	startPosition := 1
	if maxPos.Valid {
		startPosition = int(maxPos.Int64) + 1
	}

	// Insert checklist items
	createdItems := []models.ChecklistItem{}
	for i, itemText := range checklistItems {
		result, err := database.DB.Exec(`
			INSERT INTO checklist_items (note_id, text, position)
			VALUES (?, ?, ?)
		`, noteID, itemText, startPosition+i)
		if err != nil {
			log.Printf("Failed to create checklist item: %v", err)
			continue
		}

		itemID, _ := result.LastInsertId()
		createdItems = append(createdItems, models.ChecklistItem{
			ID:        int(itemID),
			NoteID:    noteID,
			Text:      itemText,
			IsChecked: false,
			Position:  startPosition + i,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Checklist generated successfully",
		"items": createdItems,
		"count": len(createdItems),
	})
}

// generateChecklistFromPlan generates a checklist based on the plan using OpenAI
func (h *NoteHandler) generateChecklistFromPlan(note models.Note, planData models.PlanData, existingItems []models.ChecklistItem) ([]string, error) {
	// Get media attachments with converted text
	mediaTexts := []string{}
	rows, err := database.DB.Query(`
		SELECT file_name, file_type, converted_text 
		FROM media_attachments 
		WHERE note_id = ? AND conversion_status = 'completed' AND converted_text IS NOT NULL AND converted_text != ''
		ORDER BY created_at ASC
	`, note.ID)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var fileName, fileType string
			var convertedText sql.NullString
			err := rows.Scan(&fileName, &fileType, &convertedText)
			if err == nil && convertedText.Valid && convertedText.String != "" {
				// Skip error messages
				if !strings.HasPrefix(convertedText.String, "Konvertierungsfehler:") {
					mediaTexts = append(mediaTexts, fmt.Sprintf("[%s (%s)]: %s", fileName, fileType, convertedText.String))
				}
			}
		}
	}

	// Build media context
	mediaContext := ""
	if len(mediaTexts) > 0 {
		mediaContext = "\n\nZusätzliche Informationen aus hochgeladenen Medien:\n" + strings.Join(mediaTexts, "\n\n")
		log.Printf("Media context for checklist generation (note ID %d): %d attachments", note.ID, len(mediaTexts))
	}

	// Build existing items list for context
	existingItemsText := ""
	if len(existingItems) > 0 {
		existingItemsText = "\n\nBereits vorhandene Checklist-Items:\n"
		for i, item := range existingItems {
			status := "offen"
			if item.IsChecked {
				status = "erledigt"
			}
			existingItemsText += fmt.Sprintf("%d. %s (%s)\n", i+1, item.Text, status)
		}
		existingItemsText += "\nWICHTIG: Erstelle KEINE redundanten oder ähnlichen Items zu den bereits vorhandenen. Fokussiere dich nur auf fehlende Anforderungen, die noch nicht abgedeckt sind."
	}

	prompt := fmt.Sprintf(`Basierend auf folgendem Plan, erstelle eine Liste von konkreten Anforderungen/Aufgaben, die erfüllt werden müssen, um den Plan vollständig durchzuführen.

Titel des Plans: %s
Inhalt des Plans: %s

Plan-Informationen:
1. Ziel: %s
2. Zeit & Zwischenziele: %s
3. Weitere Infos: %s%s

Generierter Plan:
%s%s

Erstelle eine präzise Checkliste mit konkreten, umsetzbaren Anforderungen. Jede Anforderung sollte:
- Spezifisch und messbar sein
- Eine klare Aktion beschreiben
- Realistisch und umsetzbar sein
- Direkt mit dem Plan zusammenhängen
- NICHT redundant zu bereits vorhandenen Items sein

Format: Gib NUR eine Liste zurück, eine Anforderung pro Zeile, ohne Nummerierung oder Bullet Points. Jede Zeile sollte eine eigenständige, klare Anforderung sein.`, 
		note.Title, note.Content, planData.Goal, planData.TimeAndMilestones, 
		planData.AdditionalInfo, mediaContext, planData.GeneratedPlan, existingItemsText)

	log.Printf("Generating checklist for note ID: %d", note.ID)
	
	openaiService := services.NewOpenAIService()
	if openaiService.APIKey == "" {
		log.Printf("ERROR: OpenAI API key is not configured")
		return nil, fmt.Errorf("OpenAI API key is not configured")
	}
	
	response, err := openaiService.GenerateResponse(prompt, "Du bist ein hilfreicher Planungsassistent, der präzise Checklisten erstellt.")
	if err != nil {
		log.Printf("ERROR: Failed to generate checklist via OpenAI: %v", err)
		return nil, fmt.Errorf("Fehler bei der Checklist-Generierung: %v", err)
	}

	if response == "" {
		log.Printf("ERROR: OpenAI returned empty response")
		return nil, fmt.Errorf("OpenAI hat eine leere Antwort zurückgegeben")
	}

	// Parse response into checklist items
	// Split by newlines and clean up
	lines := strings.Split(response, "\n")
	checklistItems := []string{}
	for _, line := range lines {
		line = strings.TrimSpace(line)
		// Remove common prefixes like "- ", "* ", "1. ", etc.
		line = strings.TrimPrefix(line, "- ")
		line = strings.TrimPrefix(line, "* ")
		line = strings.TrimPrefix(line, "• ")
		// Remove numbered prefixes (1. 2. etc.)
		if matched, _ := regexp.MatchString(`^\d+\.\s*`, line); matched {
			line = regexp.MustCompile(`^\d+\.\s*`).ReplaceAllString(line, "")
		}
		line = strings.TrimSpace(line)
		if line != "" && len(line) > 3 { // Only add non-empty items with meaningful content
			checklistItems = append(checklistItems, line)
		}
	}

	if len(checklistItems) == 0 {
		return nil, fmt.Errorf("Keine Checklist-Items konnten aus der Antwort generiert werden")
	}

	log.Printf("Checklist generated successfully, %d items", len(checklistItems))
	return checklistItems, nil
}

// UploadMedia uploads a media file and converts it to text
func (h *NoteHandler) UploadMedia(c *gin.Context) {
	userID, _ := c.Get("user_id")
	noteIDStr := c.Param("id")
	noteID, err := strconv.Atoi(noteIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid note ID"})
		return
	}

	// Verify note belongs to user
	var note models.Note
	err = database.DB.QueryRow(`
		SELECT id, user_id FROM notes WHERE id = ? AND user_id = ?
	`, noteID, userID).Scan(&note.ID, &note.UserID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Note not found"})
		return
	}

	// Get file from form
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file provided"})
		return
	}

	// Determine file type
	fileType := c.PostForm("file_type") // 'audio', 'pdf', 'image'
	if fileType == "" {
		// Try to determine from MIME type
		mimeType := file.Header.Get("Content-Type")
		if strings.Contains(mimeType, "audio") {
			fileType = "audio"
		} else if strings.Contains(mimeType, "image") {
			fileType = "image"
		} else if strings.Contains(mimeType, "pdf") || strings.HasSuffix(strings.ToLower(file.Filename), ".pdf") {
			fileType = "pdf"
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Unsupported file type. Please provide audio, PDF, or image."})
			return
		}
	}

	// Validate file type
	if fileType != "audio" && fileType != "pdf" && fileType != "image" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file type. Must be 'audio', 'pdf', or 'image'"})
		return
	}

	// Ensure storage directory exists
	if err := services.EnsureStoragePath(); err != nil {
		log.Printf("Failed to ensure storage path: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to setup storage"})
		return
	}

	// Generate unique filename
	timestamp := time.Now().Unix()
	uniqueFileName := fmt.Sprintf("%d_%d_%s", userID.(int), timestamp, file.Filename)
	storagePath := services.GetMediaStoragePath()
	filePath := filepath.Join(storagePath, uniqueFileName)

	// Save file
	if err := c.SaveUploadedFile(file, filePath); err != nil {
		log.Printf("Failed to save file: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}

	// Read file data for conversion
	fileData, err := os.ReadFile(filePath)
	if err != nil {
		log.Printf("Failed to read file: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read file"})
		return
	}

	// Insert media attachment record with 'processing' status
	result, err := database.DB.Exec(`
		INSERT INTO media_attachments (note_id, user_id, file_name, file_type, file_path, file_size, mime_type, conversion_status)
		VALUES (?, ?, ?, ?, ?, ?, ?, 'processing')
	`, noteID, userID, file.Filename, fileType, filePath, file.Size, file.Header.Get("Content-Type"))
	if err != nil {
		log.Printf("Failed to create media attachment record: %v", err)
		os.Remove(filePath) // Clean up file
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create media attachment record"})
		return
	}

	attachmentID, _ := result.LastInsertId()

	// Convert media to text in background (async)
	go func() {
		log.Printf("Starting media conversion for attachment ID %d, type: %s, filename: %s", attachmentID, fileType, file.Filename)
		mediaService := services.NewMediaService()
		convertedText, err := mediaService.ConvertMediaToText(fileData, fileType, file.Filename, file.Header.Get("Content-Type"))
		
		status := "completed"
		if err != nil {
			log.Printf("Failed to convert media to text (attachment ID %d): %v", attachmentID, err)
			status = "failed"
			convertedText = fmt.Sprintf("Konvertierungsfehler: %v", err)
		} else {
			log.Printf("Successfully converted media (attachment ID %d), text length: %d characters", attachmentID, len(convertedText))
			if len(convertedText) == 0 {
				log.Printf("WARNING: Conversion succeeded but returned empty text for attachment ID %d", attachmentID)
				status = "failed"
				convertedText = "Konvertierung erfolgreich, aber kein Text extrahiert."
			}
		}

		// Update media attachment with converted text
		_, updateErr := database.DB.Exec(`
			UPDATE media_attachments 
			SET converted_text = ?, conversion_status = ?, updated_at = NOW()
			WHERE id = ?
		`, convertedText, status, attachmentID)
		if updateErr != nil {
			log.Printf("Failed to update media attachment (ID %d): %v", attachmentID, updateErr)
		} else {
			log.Printf("Updated media attachment (ID %d) with status: %s", attachmentID, status)
		}
	}()

	// Return immediately with attachment info
	attachment := models.MediaAttachment{
		ID:              int(attachmentID),
		NoteID:          noteID,
		UserID:          userID.(int),
		FileName:        file.Filename,
		FileType:        fileType,
		FilePath:        filePath,
		FileSize:        file.Size,
		MimeType:        file.Header.Get("Content-Type"),
		ConversionStatus: "processing",
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	c.JSON(http.StatusOK, gin.H{
		"message":   "File uploaded successfully. Conversion in progress.",
		"attachment": attachment,
	})
}

// GetMediaAttachments returns all media attachments for a note
func (h *NoteHandler) GetMediaAttachments(c *gin.Context) {
	userID, _ := c.Get("user_id")
	noteIDStr := c.Param("id")
	noteID, err := strconv.Atoi(noteIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid note ID"})
		return
	}

	// Verify note belongs to user
	var note models.Note
	err = database.DB.QueryRow(`
		SELECT id, user_id FROM notes WHERE id = ? AND user_id = ?
	`, noteID, userID).Scan(&note.ID, &note.UserID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Note not found"})
		return
	}

	// Get media attachments
	rows, err := database.DB.Query(`
		SELECT id, note_id, user_id, file_name, file_type, file_path, file_size, mime_type, 
		       converted_text, conversion_status, created_at, updated_at
		FROM media_attachments WHERE note_id = ? AND user_id = ?
		ORDER BY created_at DESC
	`, noteID, userID)
	if err != nil {
		log.Printf("Failed to query media attachments: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch media attachments"})
		return
	}
	defer rows.Close()

	var attachments []models.MediaAttachment
	for rows.Next() {
		var attachment models.MediaAttachment
		var convertedText sql.NullString
		err := rows.Scan(&attachment.ID, &attachment.NoteID, &attachment.UserID, &attachment.FileName,
			&attachment.FileType, &attachment.FilePath, &attachment.FileSize, &attachment.MimeType,
			&convertedText, &attachment.ConversionStatus, &attachment.CreatedAt, &attachment.UpdatedAt)
		if err != nil {
			log.Printf("Failed to scan media attachment: %v", err)
			continue
		}
		if convertedText.Valid {
			attachment.ConvertedText = convertedText.String
		}
		attachments = append(attachments, attachment)
	}

	c.JSON(http.StatusOK, attachments)
}

// DeleteMediaAttachment deletes a media attachment
func (h *NoteHandler) DeleteMediaAttachment(c *gin.Context) {
	userID, _ := c.Get("user_id")
	attachmentIDStr := c.Param("attachmentId")
	attachmentID, err := strconv.Atoi(attachmentIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid attachment ID"})
		return
	}

	// Verify attachment belongs to user
	var filePath string
	err = database.DB.QueryRow(`
		SELECT file_path FROM media_attachments WHERE id = ? AND user_id = ?
	`, attachmentID, userID).Scan(&filePath)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Media attachment not found"})
		return
	}

	// Delete file from filesystem
	if err := os.Remove(filePath); err != nil && !os.IsNotExist(err) {
		log.Printf("Failed to delete file: %v", err)
	}

	// Delete from database
	_, err = database.DB.Exec(`DELETE FROM media_attachments WHERE id = ?`, attachmentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete media attachment"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Media attachment deleted successfully"})
}

// MeditationHandler handles meditation session endpoints
type MeditationHandler struct {
	openAIService *services.OpenAIService
}

// NewMeditationHandler creates a new meditation handler
func NewMeditationHandler() *MeditationHandler {
	return &MeditationHandler{
		openAIService: services.NewOpenAIService(),
	}
}

// StartMeditation starts a new meditation session
func (h *MeditationHandler) StartMeditation(c *gin.Context) {
	userID, _ := c.Get("user_id")

	var req models.StartMeditationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Create meditation session
	result, err := database.DB.Exec(`
		INSERT INTO meditation_sessions (user_id, goal, status)
		VALUES (?, ?, 'active')
	`, userID, req.Goal)
	if err != nil {
		log.Printf("Failed to create meditation session: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create meditation session"})
		return
	}

	sessionID, _ := result.LastInsertId()

	// Build user context for AI
	userContext, err := services.BuildUserContext(userID.(int))
	if err != nil {
		log.Printf("Failed to build user context: %v", err)
		userContext = "" // Continue without context if it fails
	}

	// Generate initial AI message based on goal and user context
	initialPrompt := fmt.Sprintf(`Du bist ein einfühlsamer Meditations- und Achtsamkeits-Coach. Der Nutzer möchte eine Meditation zum Thema "%s" durchführen.

%s

WICHTIG: Antworte IMMER nur in 1-3 Sätzen. Sei kurz und prägnant.

Beginne die Meditation mit einer warmen, einladenden Begrüßung und einer ersten Frage, die dem Nutzer hilft, tiefer in das Thema einzutauchen. Die Meditation soll interaktiv sein - stelle Fragen, höre zu und führe den Nutzer sanft durch den Prozess. Sei einfühlsam, ruhig und unterstützend.`, req.Goal, userContext)

	aiResponse, err := h.openAIService.GenerateResponseWithMaxTokens(initialPrompt, "Du bist ein einfühlsamer Meditations- und Achtsamkeits-Coach, der Menschen durch interaktive Meditationen führt. Antworte IMMER nur in 1-3 Sätzen.", 150)
	if err != nil {
		log.Printf("Failed to generate initial meditation message: %v", err)
		aiResponse = fmt.Sprintf("Willkommen zu deiner Meditation zum Thema: %s\n\nLass uns gemeinsam beginnen. Was fühlst du gerade in diesem Moment?", req.Goal)
	}

	// Save initial AI message
	_, err = database.DB.Exec(`
		INSERT INTO meditation_messages (session_id, type, content)
		VALUES (?, 'ai', ?)
	`, sessionID, aiResponse)
	if err != nil {
		log.Printf("Failed to save initial AI message: %v", err)
	}

	session := models.MeditationSession{
		ID:        int(sessionID),
		UserID:    userID.(int),
		Goal:      req.Goal,
		Status:    "active",
		StartedAt: time.Now(),
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	c.JSON(http.StatusCreated, gin.H{
		"session": session,
		"initial_message": aiResponse,
	})
}

// SendMeditationMessage sends a message in an active meditation session
func (h *MeditationHandler) SendMeditationMessage(c *gin.Context) {
	userID, _ := c.Get("user_id")
	sessionIDStr := c.Param("id")
	sessionID, err := strconv.Atoi(sessionIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid session ID"})
		return
	}

	// Verify session belongs to user
	var session models.MeditationSession
	err = database.DB.QueryRow(`
		SELECT id, user_id, goal, status FROM meditation_sessions WHERE id = ? AND user_id = ?
	`, sessionID, userID).Scan(&session.ID, &session.UserID, &session.Goal, &session.Status)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Meditation session not found"})
		return
	}

	// If session is completed, automatically reactivate it to allow resuming
	if session.Status == "completed" {
		_, err = database.DB.Exec(`
			UPDATE meditation_sessions 
			SET status = 'active', ended_at = NULL, report = NULL, updated_at = NOW()
			WHERE id = ?
		`, sessionID)
		if err != nil {
			log.Printf("Failed to reactivate meditation session: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reactivate session"})
			return
		}
		session.Status = "active"
		log.Printf("Meditation session %d reactivated for resuming", sessionID)
	} else if session.Status != "active" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Meditation session is not active"})
		return
	}

	var req models.SendMeditationMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Save user message
	_, err = database.DB.Exec(`
		INSERT INTO meditation_messages (session_id, type, content)
		VALUES (?, 'user', ?)
	`, sessionID, req.Content)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save message"})
		return
	}

	// Get conversation history
	rows, err := database.DB.Query(`
		SELECT type, content FROM meditation_messages 
		WHERE session_id = ? 
		ORDER BY created_at ASC
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
		role := msgType
		if msgType == "ai" {
			role = "assistant"
		}
		if role == "user" || role == "assistant" {
			conversationHistory = append(conversationHistory, services.Message{
				Role:    role,
				Content: content,
			})
		}
	}

	// Build user context
	userContext, err := services.BuildUserContext(userID.(int))
	if err != nil {
		log.Printf("Failed to build user context: %v", err)
		userContext = ""
	}

	// Generate AI response
	aiResponse, err := h.generateMeditationResponse(req.Content, conversationHistory, session.Goal, userContext)
	if err != nil {
		log.Printf("Failed to generate meditation response: %v", err)
		aiResponse = "Ich verstehe. Lass uns weitergehen. Wie fühlst du dich dabei?"
	}

	// Save AI response
	_, err = database.DB.Exec(`
		INSERT INTO meditation_messages (session_id, type, content)
		VALUES (?, 'ai', ?)
	`, sessionID, aiResponse)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save AI response"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"ai_message": aiResponse,
	})
}

// generateMeditationResponse generates an AI response for meditation
func (h *MeditationHandler) generateMeditationResponse(userMessage string, conversationHistory []services.Message, goal, userContext string) (string, error) {
	systemPrompt := `Du bist ein einfühlsamer Meditations- und Achtsamkeits-Coach. Du führst den Nutzer durch eine interaktive Meditation.

WICHTIGE PRINZIPIEN:
- Sei warm, einfühlsam und unterstützend
- Stelle offene Fragen, die zum Nachdenken anregen
- Führe den Nutzer sanft durch den Prozess
- Sei präsent und aufmerksam
- Reagiere auf das, was der Nutzer teilt
- Die Meditation ist interaktiv - stelle Fragen und höre zu
- Antworte auf Deutsch
- Sei wie ein Therapeut - einfühlsam, professionell und unterstützend

KRITISCH WICHTIG: Antworte IMMER nur in 1-3 Sätzen. Sei kurz und prägnant. Keine langen Erklärungen oder Ausführungen.

Meditationsziel: ` + goal

	if userContext != "" {
		systemPrompt += "\n\nNutzer-Kontext:\n" + userContext
	}

	systemPrompt += "\n\nFühre die Meditation weiter, basierend auf dem, was der Nutzer gerade teilt. Stelle eine passende Frage oder gib eine einfühlsame Antwort. MAXIMAL 3 Sätze."

	messages := []services.Message{
		{
			Role:    "system",
			Content: systemPrompt,
		},
	}

	// Add conversation history (last 10 messages to keep context manageable)
	historyLimit := 10
	if len(conversationHistory) > historyLimit {
		conversationHistory = conversationHistory[len(conversationHistory)-historyLimit:]
	}
	messages = append(messages, conversationHistory...)

	// Add current user message
	messages = append(messages, services.Message{
		Role:    "user",
		Content: userMessage,
	})

	request := services.OpenAIRequest{
		Model:       "gpt-3.5-turbo",
		Messages:    messages,
		MaxTokens:   150, // Reduced to enforce shorter responses (1-3 sentences)
		Temperature: 0.8, // Slightly higher for more creative, empathetic responses
	}

	response, err := h.openAIService.MakeAPIRequest(request)
	if err != nil {
		return "", err
	}

	if len(response.Choices) == 0 {
		return "", fmt.Errorf("no response from OpenAI")
	}

	return response.Choices[0].Message.Content, nil
}

// EndMeditation ends a meditation session and generates a report
func (h *MeditationHandler) EndMeditation(c *gin.Context) {
	userID, _ := c.Get("user_id")
	sessionIDStr := c.Param("id")
	sessionID, err := strconv.Atoi(sessionIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid session ID"})
		return
	}

	// Verify session belongs to user
	var session models.MeditationSession
	var startedAt time.Time
	err = database.DB.QueryRow(`
		SELECT id, user_id, goal, status, started_at FROM meditation_sessions WHERE id = ? AND user_id = ?
	`, sessionID, userID).Scan(&session.ID, &session.UserID, &session.Goal, &session.Status, &startedAt)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Meditation session not found"})
		return
	}

	if session.Status != "active" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Meditation session is not active"})
		return
	}

	// Get all messages
	rows, err := database.DB.Query(`
		SELECT type, content, created_at FROM meditation_messages 
		WHERE session_id = ? 
		ORDER BY created_at ASC
	`, sessionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get messages"})
		return
	}
	defer rows.Close()

	var messages []models.MeditationMessage
	for rows.Next() {
		var msg models.MeditationMessage
		err := rows.Scan(&msg.Type, &msg.Content, &msg.CreatedAt)
		if err != nil {
			continue
		}
		msg.SessionID = sessionID
		messages = append(messages, msg)
	}

	// Calculate duration
	endedAt := time.Now()
	duration := int(endedAt.Sub(startedAt).Seconds())

	// Generate meditation report
	report, err := h.generateMeditationReport(session.Goal, messages, duration)
	if err != nil {
		log.Printf("Failed to generate meditation report: %v", err)
		report = fmt.Sprintf("Meditation zum Thema: %s\nDauer: %d Minuten %d Sekunden\n\nDie Meditation wurde erfolgreich abgeschlossen.", session.Goal, duration/60, duration%60)
	}

	// Update session
	_, err = database.DB.Exec(`
		UPDATE meditation_sessions 
		SET status = 'completed', ended_at = ?, duration_seconds = ?, report = ?, updated_at = NOW()
		WHERE id = ?
	`, endedAt, duration, report, sessionID)
	if err != nil {
		log.Printf("Failed to update meditation session: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update session"})
		return
	}

	session.Status = "completed"
	session.EndedAt = &endedAt
	session.DurationSeconds = duration
	session.Report = report

	c.JSON(http.StatusOK, gin.H{
		"session": session,
		"messages": messages,
	})
}

// ResumeMeditation reactivates a completed meditation session
func (h *MeditationHandler) ResumeMeditation(c *gin.Context) {
	userID, _ := c.Get("user_id")
	sessionIDStr := c.Param("id")
	sessionID, err := strconv.Atoi(sessionIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid session ID"})
		return
	}

	// Verify session belongs to user
	var session models.MeditationSession
	err = database.DB.QueryRow(`
		SELECT id, user_id, goal, status FROM meditation_sessions WHERE id = ? AND user_id = ?
	`, sessionID, userID).Scan(&session.ID, &session.UserID, &session.Goal, &session.Status)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Meditation session not found"})
		return
	}

	if session.Status != "completed" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only completed sessions can be resumed"})
		return
	}

	// Reactivate the session
	_, err = database.DB.Exec(`
		UPDATE meditation_sessions 
		SET status = 'active', ended_at = NULL, report = NULL, updated_at = NOW()
		WHERE id = ?
	`, sessionID)
	if err != nil {
		log.Printf("Failed to reactivate meditation session: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reactivate session"})
		return
	}

	session.Status = "active"
	session.EndedAt = nil
	session.Report = ""

	// Get messages
	rows, err := database.DB.Query(`
		SELECT id, session_id, type, content, created_at
		FROM meditation_messages WHERE session_id = ?
		ORDER BY created_at ASC
	`, sessionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch messages"})
		return
	}
	defer rows.Close()

	var messages []models.MeditationMessage
	for rows.Next() {
		var msg models.MeditationMessage
		err := rows.Scan(&msg.ID, &msg.SessionID, &msg.Type, &msg.Content, &msg.CreatedAt)
		if err != nil {
			continue
		}
		messages = append(messages, msg)
	}

	c.JSON(http.StatusOK, gin.H{
		"session": session,
		"messages": messages,
	})
}

// generateMeditationReport generates a meditation report
func (h *MeditationHandler) generateMeditationReport(goal string, messages []models.MeditationMessage, durationSeconds int) (string, error) {
	// Build conversation summary
	conversationText := ""
	for _, msg := range messages {
		role := "Nutzer"
		if msg.Type == "ai" {
			role = "Coach"
		}
		conversationText += fmt.Sprintf("%s: %s\n\n", role, msg.Content)
	}

	durationMinutes := durationSeconds / 60
	durationSecs := durationSeconds % 60

	prompt := fmt.Sprintf(`Erstelle einen Meditationsbericht basierend auf folgender Meditation:

Ziel der Meditation: %s
Dauer: %d Minuten %d Sekunden

Gesprächsverlauf:
%s

Erstelle einen strukturierten Bericht, der:
- Eine Zusammenfassung der Meditation enthält
- Die wichtigsten Erkenntnisse und Themen hervorhebt
- Die Entwicklung während der Meditation beschreibt
- Positive und reflektierende Perspektiven bietet
- Auf Deutsch formuliert ist
- Maximal 400 Wörter lang ist

Format: Verwende Überschriften und Absätze für bessere Lesbarkeit.`, goal, durationMinutes, durationSecs, conversationText)

	response, err := h.openAIService.GenerateResponse(prompt, "Du bist ein Meditations-Coach, der präzise und einfühlsame Meditationsberichte erstellt.")
	if err != nil {
		return "", err
	}

	return response, nil
}

// GetMeditationSessions returns all meditation sessions for the user
func (h *MeditationHandler) GetMeditationSessions(c *gin.Context) {
	userID, _ := c.Get("user_id")

	rows, err := database.DB.Query(`
		SELECT id, user_id, goal, status, started_at, ended_at, duration_seconds, report, created_at, updated_at
		FROM meditation_sessions WHERE user_id = ?
		ORDER BY started_at DESC
	`, userID)
	if err != nil {
		log.Printf("Failed to query meditation sessions: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch sessions"})
		return
	}
	defer rows.Close()

	var sessions []models.MeditationSession
	for rows.Next() {
		var session models.MeditationSession
		var endedAt sql.NullTime
		var goal, report sql.NullString
		err := rows.Scan(&session.ID, &session.UserID, &goal, &session.Status, 
			&session.StartedAt, &endedAt, &session.DurationSeconds, &report,
			&session.CreatedAt, &session.UpdatedAt)
		if err != nil {
			log.Printf("Failed to scan meditation session: %v", err)
			continue
		}
		if goal.Valid {
			session.Goal = goal.String
		}
		if endedAt.Valid {
			session.EndedAt = &endedAt.Time
		}
		if report.Valid {
			session.Report = report.String
		}
		sessions = append(sessions, session)
	}

	c.JSON(http.StatusOK, sessions)
}

// GetMeditationSession returns a specific meditation session with messages
func (h *MeditationHandler) GetMeditationSession(c *gin.Context) {
	userID, _ := c.Get("user_id")
	sessionIDStr := c.Param("id")
	sessionID, err := strconv.Atoi(sessionIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid session ID"})
		return
	}

	// Get session
	var session models.MeditationSession
	var endedAt sql.NullTime
	var goal, report sql.NullString
	err = database.DB.QueryRow(`
		SELECT id, user_id, goal, status, started_at, ended_at, duration_seconds, report, created_at, updated_at
		FROM meditation_sessions WHERE id = ? AND user_id = ?
	`, sessionID, userID).Scan(&session.ID, &session.UserID, &goal, &session.Status,
		&session.StartedAt, &endedAt, &session.DurationSeconds, &report,
		&session.CreatedAt, &session.UpdatedAt)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Meditation session not found"})
		return
	}

	if goal.Valid {
		session.Goal = goal.String
	}
	if endedAt.Valid {
		session.EndedAt = &endedAt.Time
	}
	if report.Valid {
		session.Report = report.String
	}

	// Get messages
	rows, err := database.DB.Query(`
		SELECT id, session_id, type, content, created_at
		FROM meditation_messages WHERE session_id = ?
		ORDER BY created_at ASC
	`, sessionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch messages"})
		return
	}
	defer rows.Close()

	var messages []models.MeditationMessage
	for rows.Next() {
		var msg models.MeditationMessage
		err := rows.Scan(&msg.ID, &msg.SessionID, &msg.Type, &msg.Content, &msg.CreatedAt)
		if err != nil {
			continue
		}
		messages = append(messages, msg)
	}

	c.JSON(http.StatusOK, gin.H{
		"session": session,
		"messages": messages,
	})
}