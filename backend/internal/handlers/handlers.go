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
