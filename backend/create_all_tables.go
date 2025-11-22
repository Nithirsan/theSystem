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
	godotenv.Load("config.env")

	// Database connection
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true",
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_HOST"),
		os.Getenv("DB_PORT"),
		os.Getenv("DB_NAME"),
	)

	db, err := sql.Open("mysql", dsn)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	// Test connection
	if err := db.Ping(); err != nil {
		log.Fatal("Failed to ping database:", err)
	}

	fmt.Println("Connected to database successfully!")

	// Create tables
	tables := []string{
		`CREATE TABLE IF NOT EXISTS tasks (
			id INT PRIMARY KEY AUTO_INCREMENT,
			user_id INT NOT NULL,
			title VARCHAR(200) NOT NULL,
			description TEXT,
			priority ENUM('high', 'medium', 'low') DEFAULT 'medium',
			due_date TIMESTAMP NULL,
			completed_at TIMESTAMP NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		)`,
		`CREATE TABLE IF NOT EXISTS habit_completions (
			id INT PRIMARY KEY AUTO_INCREMENT,
			habit_id INT NOT NULL,
			user_id INT NOT NULL,
			completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			streak_count INT DEFAULT 1,
			FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		)`,
		`CREATE TABLE IF NOT EXISTS journal_entries (
			id INT PRIMARY KEY AUTO_INCREMENT,
			user_id INT NOT NULL,
			entry_date DATE NOT NULL,
			mood VARCHAR(50),
			content TEXT,
			tags JSON,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
			UNIQUE KEY unique_daily_entry (user_id, entry_date)
		)`,
		`CREATE TABLE IF NOT EXISTS chat_sessions (
			id INT PRIMARY KEY AUTO_INCREMENT,
			user_id INT NOT NULL,
			title VARCHAR(200),
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		)`,
		`CREATE TABLE IF NOT EXISTS chat_messages (
			id INT PRIMARY KEY AUTO_INCREMENT,
			session_id INT NOT NULL,
			type ENUM('user', 'ai') NOT NULL,
			content TEXT NOT NULL,
			suggestions JSON,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
		)`,
	}

	for i, tableSQL := range tables {
		tableNames := []string{"tasks", "habit_completions", "journal_entries", "chat_sessions", "chat_messages"}
		fmt.Printf("Creating table %s...\n", tableNames[i])
		_, err := db.Exec(tableSQL)
		if err != nil {
			log.Printf("Error creating table %s: %v\n", tableNames[i], err)
		} else {
			fmt.Printf("✓ Table %s created successfully!\n", tableNames[i])
		}
	}

	// Verify tables exist
	fmt.Println("\nVerifying tables...")
	rows, err := db.Query("SHOW TABLES")
	if err != nil {
		log.Fatal("Failed to query tables:", err)
	}
	defer rows.Close()

	fmt.Println("Existing tables:")
	for rows.Next() {
		var tableName string
		if err := rows.Scan(&tableName); err != nil {
			log.Fatal("Failed to scan table name:", err)
		}
		fmt.Printf("  - %s\n", tableName)
	}

	fmt.Println("\nDone!")
}

