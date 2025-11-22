package main

import (
	"log"
	"os"

	"habit-tracker-backend/internal/auth"
	"habit-tracker-backend/internal/database"
	"habit-tracker-backend/internal/handlers"
	"habit-tracker-backend/internal/middleware"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables from backend directory
	// Try multiple paths: current dir, parent dir (backend), and two levels up
	envPaths := []string{"config.env", "../config.env", "../../config.env"}
	var envLoaded bool
	for _, path := range envPaths {
		if err := godotenv.Load(path); err == nil {
			log.Printf("Loaded config.env from: %s", path)
			envLoaded = true
			break
		}
	}
	if !envLoaded {
		log.Println("No config.env file found, using system environment variables")
	}

	// Initialize JWT
	auth.InitJWT()

	// Initialize database
	if err := database.InitDB(); err != nil {
		log.Fatal("Failed to initialize database:", err)
	}
	defer database.CloseDB()

	// Set Gin mode
	ginMode := os.Getenv("GIN_MODE")
	if ginMode == "" {
		ginMode = "debug"
	}
	gin.SetMode(ginMode)

	// Create Gin router
	r := gin.Default()

	// Add CORS middleware
	r.Use(middleware.CORSMiddleware())

	// Initialize handlers
	authHandler := &handlers.AuthHandler{}
	habitHandler := &handlers.HabitHandler{}
	taskHandler := &handlers.TaskHandler{}
		journalHandler := handlers.NewJournalHandler()
		chatHandler := handlers.NewChatHandler()
		noteHandler := handlers.NewNoteHandler()
		meditationHandler := handlers.NewMeditationHandler()

	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "ok",
			"message": "Habit Tracker API is running",
		})
	})

	// API routes
	api := r.Group("/api")
	{
		// Authentication routes
		auth := api.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
			auth.GET("/me", middleware.AuthMiddleware(), authHandler.GetMe)
		}

		// Habit routes
		habits := api.Group("/habits")
		habits.Use(middleware.AuthMiddleware())
		{
		habits.GET("", habitHandler.GetHabits)
		habits.POST("", habitHandler.CreateHabit)
		habits.POST("/:id/complete", habitHandler.CompleteHabit)
		habits.GET("/completions", habitHandler.GetHabitCompletions)
		}

		// Task routes
		tasks := api.Group("/tasks")
		tasks.Use(middleware.AuthMiddleware())
		{
			tasks.GET("", taskHandler.GetTasks)
			tasks.POST("", taskHandler.CreateTask)
			tasks.POST("/:id/complete", taskHandler.CompleteTask)
		}

		// Journal routes
		journal := api.Group("/journal")
		journal.Use(middleware.AuthMiddleware())
		{
			journal.GET("", journalHandler.GetJournalEntries)
			journal.POST("/generate-questions", journalHandler.GenerateJournalQuestions)
			journal.POST("/summarize", journalHandler.SummarizeJournalEntries)
			journal.POST("", journalHandler.CreateOrUpdateJournalEntry)
			journal.GET("/:date", journalHandler.GetJournalEntryByDate)
			journal.PUT("/:id", journalHandler.UpdateJournalEntry)
			journal.DELETE("/:id", journalHandler.DeleteJournalEntry)
		}

		// Chat routes (AI Coach)
		chat := api.Group("/chat")
		chat.Use(middleware.AuthMiddleware())
		{
			chat.GET("/sessions", chatHandler.GetChatSessions)
			chat.POST("/sessions", chatHandler.CreateChatSession)
			chat.GET("/sessions/:id/messages", chatHandler.GetChatMessages)
			chat.POST("/sessions/:id/messages", chatHandler.SendMessage)
		}

		// Notes/Plans routes
		notes := api.Group("/notes")
		notes.Use(middleware.AuthMiddleware())
		{
			notes.GET("", noteHandler.GetNotes)
			notes.POST("", noteHandler.CreateNote)
			notes.PUT("/:id", noteHandler.UpdateNote)
			notes.DELETE("/:id", noteHandler.DeleteNote)
			notes.POST("/:id/checklist", noteHandler.CreateChecklistItem)
			notes.PUT("/:id/checklist/:itemId", noteHandler.UpdateChecklistItem)
			notes.DELETE("/:id/checklist/:itemId", noteHandler.DeleteChecklistItem)
			notes.GET("/:id/plan", noteHandler.GetPlanData)
			notes.POST("/:id/plan/answers", noteHandler.SavePlanAnswers)
			notes.POST("/:id/plan/chat", noteHandler.UpdatePlanViaChat)
			notes.POST("/:id/plan/adopt", noteHandler.AdoptPlan)
			notes.POST("/:id/plan/generate-checklist", noteHandler.GenerateChecklist)
			notes.POST("/:id/media", noteHandler.UploadMedia)
			notes.GET("/:id/media", noteHandler.GetMediaAttachments)
			notes.DELETE("/:id/media/:attachmentId", noteHandler.DeleteMediaAttachment)
		}

		// Meditation/Reflection routes
		meditation := api.Group("/meditation")
		meditation.Use(middleware.AuthMiddleware())
		{
			meditation.GET("", meditationHandler.GetMeditationSessions)
			meditation.POST("", meditationHandler.StartMeditation)
			meditation.GET("/:id", meditationHandler.GetMeditationSession)
			meditation.POST("/:id/message", meditationHandler.SendMeditationMessage)
			meditation.POST("/:id/resume", meditationHandler.ResumeMeditation)
			meditation.POST("/:id/end", meditationHandler.EndMeditation)
		}
	}

	// Get port from environment
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	log.Fatal(r.Run(":" + port))
}
