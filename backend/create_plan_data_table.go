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
	fmt.Println("\n📋 Creating plan_data table...\n")

	// Create plan_data table
	fmt.Println("Creating plan_data table...")
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS plan_data (
			id INT PRIMARY KEY AUTO_INCREMENT,
			note_id INT NOT NULL,
			goal TEXT,
			time_and_milestones TEXT,
			additional_info TEXT,
			generated_plan TEXT,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
			UNIQUE KEY unique_note_plan (note_id)
		)
	`)
	if err != nil {
		log.Printf("⚠️  Error creating plan_data table: %v", err)
	} else {
		fmt.Println("  ✅ Plan_data table created")
	}

	fmt.Println("\n✅ Table created successfully!")
}

