package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	_ "github.com/go-sql-driver/mysql"
)

func main() {
	// Load environment variables
	if err := godotenv.Load("config.env"); err != nil {
		log.Println("No config.env file found, using system environment variables")
	}

	host := os.Getenv("DB_HOST")
	port := os.Getenv("DB_PORT")
	user := os.Getenv("DB_USER")
	password := os.Getenv("DB_PASSWORD")
	dbname := os.Getenv("DB_NAME")

	if host == "" {
		host = "localhost"
	}
	if port == "" {
		port = "3306"
	}

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		user, password, host, port, dbname)

	fmt.Printf("Connecting to database...\n")
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		log.Fatalf("Failed to open database: %v", err)
	}
	defer db.Close()

	// Test the connection
	if err = db.Ping(); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}

	fmt.Println("✅ Database connection successful!")

	fmt.Println("\n📋 Creating habit_completions table...")

	// Create the table with a simpler unique constraint
	createTableSQL := `
	CREATE TABLE IF NOT EXISTS habit_completions (
		id INT PRIMARY KEY AUTO_INCREMENT,
		habit_id INT NOT NULL,
		user_id INT NOT NULL,
		completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		streak_count INT DEFAULT 1,
		FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE,
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
		UNIQUE KEY unique_daily_completion (habit_id, completed_at)
	)`

	_, err = db.Exec(createTableSQL)
	if err != nil {
		log.Printf("❌ Failed to create table: %v\n", err)
		// Try alternative without unique constraint on date
		fmt.Println("\n⚠️  Trying alternative table creation without complex unique constraint...")
		
		createTableAltSQL := `
		CREATE TABLE IF NOT EXISTS habit_completions (
			id INT PRIMARY KEY AUTO_INCREMENT,
			habit_id INT NOT NULL,
			user_id INT NOT NULL,
			completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			streak_count INT DEFAULT 1,
			FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		)`
		
		_, err = db.Exec(createTableAltSQL)
		if err != nil {
			log.Fatalf("❌ Failed to create table with alternative method: %v\n", err)
		}
		fmt.Println("✅ Table created with alternative method (no unique constraint on date)")
	} else {
		fmt.Println("✅ Table created successfully!")
	}

	// Verify table exists
	var tableName string
	err = db.QueryRow(`
		SELECT TABLE_NAME 
		FROM INFORMATION_SCHEMA.TABLES 
		WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'habit_completions'
	`, dbname).Scan(&tableName)
	
	if err == nil {
		fmt.Printf("✅ Verified: Table 'habit_completions' exists\n")
	} else {
		fmt.Printf("⚠️  Warning: Could not verify table existence\n")
	}

	fmt.Println("\n✅ Done!")
}

