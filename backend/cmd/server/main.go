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
	// Load environment variables
	if err := godotenv.Load("config.env"); err != nil {
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
			journal.GET("/:date", journalHandler.GetJournalEntryByDate)
			journal.POST("", journalHandler.CreateOrUpdateJournalEntry)
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
	}

	// Get port from environment
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	log.Fatal(r.Run(":" + port))
}
