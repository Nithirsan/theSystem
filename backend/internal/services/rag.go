package services

import (
	"database/sql"
	"fmt"
	"strings"
	"time"
	"habit-tracker-backend/internal/database"
)

// UserContext represents all user data for RAG
type UserContext struct {
	Habits        []HabitInfo
	Tasks         []TaskInfo
	JournalEntries []JournalInfo
	Stats         UserStats
}

type HabitInfo struct {
	Name            string
	Category        string
	Description     string
	IsCompletedToday bool
	StreakCount     int
}

type TaskInfo struct {
	Title       string
	Description string
	Priority    string
	DueDate     *time.Time
	IsCompleted bool
}

type JournalInfo struct {
	Date    time.Time
	Mood    string
	Content string
	Tags    string
}

type UserStats struct {
	TotalHabits        int
	CompletedHabitsToday int
	TotalTasks         int
	CompletedTasks     int
	CurrentStreak     int
	BestStreak        int
}

// BuildUserContext retrieves all user data for RAG
func BuildUserContext(userID int) (string, error) {
	context := UserContext{}
	
	// Get habits
	habits, err := getUserHabits(userID)
	if err != nil {
		return "", fmt.Errorf("failed to get habits: %v", err)
	}
	context.Habits = habits
	
	// Get tasks
	tasks, err := getUserTasks(userID)
	if err != nil {
		return "", fmt.Errorf("failed to get tasks: %v", err)
	}
	context.Tasks = tasks
	
	// Get recent journal entries (last 30 days for better context)
	journalEntries, err := getUserJournalEntries(userID, 30)
	if err != nil {
		return "", fmt.Errorf("failed to get journal entries: %v", err)
	}
	context.JournalEntries = journalEntries
	
	// Get statistics
	stats, err := getUserStats(userID)
	if err != nil {
		return "", fmt.Errorf("failed to get stats: %v", err)
	}
	context.Stats = stats
	
	// Format context as text for LLM
	return formatContext(context), nil
}

func getUserHabits(userID int) ([]HabitInfo, error) {
	rows, err := database.DB.Query(`
		SELECT h.name, h.category, h.description,
		       CASE WHEN hc.id IS NOT NULL THEN true ELSE false END as completed_today,
		       COALESCE(MAX(hc.streak_count), 0) as streak_count
		FROM habits h
		LEFT JOIN habit_completions hc ON h.id = hc.habit_id AND DATE(hc.completed_at) = CURDATE()
		WHERE h.user_id = ? AND h.is_active = true
		GROUP BY h.id, h.name, h.category, h.description, hc.id
		ORDER BY h.category, h.name
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var habits []HabitInfo
	for rows.Next() {
		var habit HabitInfo
		var streakCount int
		err := rows.Scan(&habit.Name, &habit.Category, &habit.Description, &habit.IsCompletedToday, &streakCount)
		if err != nil {
			continue
		}
		habit.StreakCount = streakCount
		habits = append(habits, habit)
	}
	
	return habits, nil
}

func getUserTasks(userID int) ([]TaskInfo, error) {
	rows, err := database.DB.Query(`
		SELECT title, description, priority, due_date, 
		       CASE WHEN completed_at IS NOT NULL THEN true ELSE false END as is_completed
		FROM tasks 
		WHERE user_id = ?
		ORDER BY 
			CASE WHEN completed_at IS NULL THEN 0 ELSE 1 END,
			CASE priority 
				WHEN 'high' THEN 1 
				WHEN 'medium' THEN 2 
				WHEN 'low' THEN 3 
			END,
			due_date ASC
		LIMIT 20
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var tasks []TaskInfo
	for rows.Next() {
		var task TaskInfo
		var dueDate sql.NullTime
		err := rows.Scan(&task.Title, &task.Description, &task.Priority, &dueDate, &task.IsCompleted)
		if err != nil {
			continue
		}
		if dueDate.Valid {
			task.DueDate = &dueDate.Time
		}
		tasks = append(tasks, task)
	}
	
	return tasks, nil
}

func getUserJournalEntries(userID int, days int) ([]JournalInfo, error) {
	rows, err := database.DB.Query(`
		SELECT entry_date, mood, content, tags
		FROM journal_entries 
		WHERE user_id = ? 
		AND entry_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
		ORDER BY entry_date DESC
		LIMIT 50
	`, userID, days)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var entries []JournalInfo
	for rows.Next() {
		var entry JournalInfo
		var tags sql.NullString
		var content sql.NullString
		var mood sql.NullString
		err := rows.Scan(&entry.Date, &mood, &content, &tags)
		if err != nil {
			continue
		}
		if mood.Valid {
			entry.Mood = mood.String
		}
		if content.Valid {
			entry.Content = content.String
		}
		if tags.Valid {
			entry.Tags = tags.String
		}
		entries = append(entries, entry)
	}
	
	return entries, nil
}

func getUserStats(userID int) (UserStats, error) {
	stats := UserStats{}
	
	// Total habits
	err := database.DB.QueryRow(`
		SELECT COUNT(*) FROM habits WHERE user_id = ? AND is_active = true
	`, userID).Scan(&stats.TotalHabits)
	if err != nil {
		return stats, err
	}
	
	// Completed habits today
	err = database.DB.QueryRow(`
		SELECT COUNT(DISTINCT hc.habit_id)
		FROM habit_completions hc
		INNER JOIN habits h ON hc.habit_id = h.id
		WHERE hc.user_id = ? AND h.user_id = ? AND DATE(hc.completed_at) = CURDATE()
	`, userID, userID).Scan(&stats.CompletedHabitsToday)
	if err != nil && err != sql.ErrNoRows {
		return stats, err
	}
	
	// Total tasks
	err = database.DB.QueryRow(`
		SELECT COUNT(*) FROM tasks WHERE user_id = ?
	`, userID).Scan(&stats.TotalTasks)
	if err != nil {
		return stats, err
	}
	
	// Completed tasks
	err = database.DB.QueryRow(`
		SELECT COUNT(*) FROM tasks WHERE user_id = ? AND completed_at IS NOT NULL
	`, userID).Scan(&stats.CompletedTasks)
	if err != nil && err != sql.ErrNoRows {
		return stats, err
	}
	
	// Calculate streaks (simplified - using overall streak)
	rows, err := database.DB.Query(`
		SELECT DATE(completed_at) as completion_date, COUNT(DISTINCT habit_id) as habit_count
		FROM habit_completions hc
		INNER JOIN habits h ON hc.habit_id = h.id
		WHERE hc.user_id = ? AND h.user_id = ? AND h.is_active = true
		GROUP BY DATE(completed_at)
		HAVING habit_count >= (SELECT COUNT(*) FROM habits WHERE user_id = ? AND is_active = true)
		ORDER BY completion_date DESC
	`, userID, userID, userID)
	if err == nil {
		defer rows.Close()
		var dates []time.Time
		for rows.Next() {
			var date time.Time
			var count int
			if err := rows.Scan(&date, &count); err == nil {
				dates = append(dates, date.Truncate(24 * time.Hour))
			}
		}
		
		if len(dates) > 0 {
			today := time.Now().Truncate(24 * time.Hour)
			expectedDate := today
			for i := 0; i < len(dates); i++ {
				if dates[i].Equal(expectedDate) {
					stats.CurrentStreak++
					expectedDate = expectedDate.AddDate(0, 0, -1)
				} else if dates[i].Before(expectedDate) {
					break
				}
			}
		}
	}
	
	return stats, nil
}

func formatContext(context UserContext) string {
	var sb strings.Builder
	
	sb.WriteString("=== NUTZER KONTEXT ===\n\n")
	
	// Statistics
	sb.WriteString("## Statistik\n")
	sb.WriteString(fmt.Sprintf("- Aktive Gewohnheiten: %d\n", context.Stats.TotalHabits))
	sb.WriteString(fmt.Sprintf("- Heute abgeschlossene Gewohnheiten: %d\n", context.Stats.CompletedHabitsToday))
	sb.WriteString(fmt.Sprintf("- Aktuelle Serie: %d Tage\n", context.Stats.CurrentStreak))
	sb.WriteString(fmt.Sprintf("- Gesamt Aufgaben: %d\n", context.Stats.TotalTasks))
	sb.WriteString(fmt.Sprintf("- Abgeschlossene Aufgaben: %d\n\n", context.Stats.CompletedTasks))
	
	// Habits
	if len(context.Habits) > 0 {
		sb.WriteString("## Gewohnheiten\n")
		for _, habit := range context.Habits {
			status := "nicht erledigt"
			if habit.IsCompletedToday {
				status = "erledigt"
			}
			sb.WriteString(fmt.Sprintf("- %s (%s): %s [Heute: %s, Serie: %d Tage]\n", 
				habit.Name, habit.Category, habit.Description, status, habit.StreakCount))
		}
		sb.WriteString("\n")
	}
	
	// Tasks
	if len(context.Tasks) > 0 {
		sb.WriteString("## Aufgaben\n")
		openTasks := []TaskInfo{}
		completedTasks := []TaskInfo{}
		for _, task := range context.Tasks {
			if task.IsCompleted {
				completedTasks = append(completedTasks, task)
			} else {
				openTasks = append(openTasks, task)
			}
		}
		
		if len(openTasks) > 0 {
			sb.WriteString("Offene Aufgaben:\n")
			for _, task := range openTasks {
				dueStr := "kein Fälligkeitsdatum"
				if task.DueDate != nil {
					dueStr = task.DueDate.Format("02.01.2006")
				}
				sb.WriteString(fmt.Sprintf("- %s [Priorität: %s, Fällig: %s]\n", 
					task.Title, task.Priority, dueStr))
				if task.Description != "" {
					sb.WriteString(fmt.Sprintf("  Beschreibung: %s\n", task.Description))
				}
			}
		}
		
		if len(completedTasks) > 0 {
			sb.WriteString("Abgeschlossene Aufgaben:\n")
			for _, task := range completedTasks {
				sb.WriteString(fmt.Sprintf("- %s [Abgeschlossen]\n", task.Title))
			}
		}
		sb.WriteString("\n")
	}
	
	// Journal entries
	if len(context.JournalEntries) > 0 {
		sb.WriteString("## Tagebuch-Einträge (letzte 30 Tage)\n")
		for _, entry := range context.JournalEntries {
			sb.WriteString(fmt.Sprintf("### %s\n", entry.Date.Format("02.01.2006")))
			if entry.Mood != "" {
				moodLabels := map[string]string{
					"excellent": "Ausgezeichnet 😄",
					"good":     "Gut 😊",
					"okay":     "Okay 😐",
					"bad":      "Schlecht 😔",
					"terrible": "Schrecklich 😢",
				}
				moodLabel := entry.Mood
				if label, ok := moodLabels[entry.Mood]; ok {
					moodLabel = label
				}
				sb.WriteString(fmt.Sprintf("Stimmung: %s\n", moodLabel))
			}
			if entry.Content != "" {
				// Format content with better readability
				content := strings.TrimSpace(entry.Content)
				// Split by double newlines for better formatting
				contentLines := strings.Split(content, "\n\n")
				for _, line := range contentLines {
					if strings.TrimSpace(line) != "" {
						sb.WriteString(fmt.Sprintf("%s\n", strings.TrimSpace(line)))
					}
				}
			}
			if entry.Tags != "" && entry.Tags != "[]" {
				// Parse JSON tags if needed
				tagsStr := entry.Tags
				if strings.HasPrefix(tagsStr, "[") {
					// It's JSON, try to extract tags
					tagsStr = strings.Trim(tagsStr, "[]\"")
					tagsStr = strings.ReplaceAll(tagsStr, "\"", "")
				}
				if tagsStr != "" && tagsStr != "[]" {
					sb.WriteString(fmt.Sprintf("Tags: %s\n", tagsStr))
				}
			}
			sb.WriteString("\n")
		}
		sb.WriteString("\n")
	}
	
	sb.WriteString("=== ENDE KONTEXT ===\n")
	
	return sb.String()
}

