package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/go-sql-driver/mysql"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
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

	// Get database connection details
	dbHost := os.Getenv("DB_HOST")
	if dbHost == "" {
		dbHost = "localhost"
	}
	dbPort := os.Getenv("DB_PORT")
	if dbPort == "" {
		dbPort = "3306"
	}
	dbUser := os.Getenv("DB_USER")
	if dbUser == "" {
		dbUser = "root"
	}
	dbPassword := os.Getenv("DB_PASSWORD")
	if dbPassword == "" {
		dbPassword = ""
	}
	dbName := os.Getenv("DB_NAME")
	if dbName == "" {
		dbName = "habit_tracker"
	}

	// Connect to database
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		dbUser, dbPassword, dbHost, dbPort, dbName)

	db, err := sql.Open("mysql", dsn)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Test connection
	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}

	log.Println("Connected to database successfully")

	// Execute migration statements individually
	log.Println("Running migration 006: Add meditation sessions...")

	// Create meditation_sessions table
	createSessionsTable := `
	CREATE TABLE IF NOT EXISTS meditation_sessions (
		id INT AUTO_INCREMENT PRIMARY KEY,
		user_id INT NOT NULL,
		goal TEXT,
		status VARCHAR(50) DEFAULT 'active',
		started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		ended_at TIMESTAMP NULL,
		duration_seconds INT DEFAULT 0,
		report TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
		INDEX idx_user_id (user_id),
		INDEX idx_status (status),
		INDEX idx_started_at (started_at)
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
	`

	_, err = db.Exec(createSessionsTable)
	if err != nil {
		log.Fatalf("Failed to create meditation_sessions table: %v", err)
	}
	log.Println("✓ Created meditation_sessions table")

	// Create meditation_messages table
	createMessagesTable := `
	CREATE TABLE IF NOT EXISTS meditation_messages (
		id INT AUTO_INCREMENT PRIMARY KEY,
		session_id INT NOT NULL,
		type VARCHAR(20) NOT NULL,
		content TEXT NOT NULL,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (session_id) REFERENCES meditation_sessions(id) ON DELETE CASCADE,
		INDEX idx_session_id (session_id),
		INDEX idx_created_at (created_at)
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
	`

	_, err = db.Exec(createMessagesTable)
	if err != nil {
		log.Fatalf("Failed to create meditation_messages table: %v", err)
	}
	log.Println("✓ Created meditation_messages table")

	log.Println("Migration 006 completed successfully!")
}

