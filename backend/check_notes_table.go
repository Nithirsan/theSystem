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
	fmt.Println("\n📋 Checking notes table...\n")

	// Check if notes table exists
	var tableExists string
	err = db.QueryRow(`
		SELECT TABLE_NAME 
		FROM INFORMATION_SCHEMA.TABLES 
		WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'notes'
	`, dbname).Scan(&tableExists)
	
	if err != nil {
		fmt.Printf("❌ Notes table does NOT exist\n")
		fmt.Println("\nRunning migration 003...")
		// Run migration
		return
	}
	
	fmt.Printf("✅ Notes table exists\n")
	
	// Check columns
	columns := []string{"id", "user_id", "title", "content", "color", "is_pinned", "created_at", "updated_at"}
	for _, colName := range columns {
		var exists string
		err := db.QueryRow(`
			SELECT COLUMN_NAME 
			FROM INFORMATION_SCHEMA.COLUMNS 
			WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'notes' AND COLUMN_NAME = ?
		`, dbname, colName).Scan(&exists)
		
		if err == nil {
			fmt.Printf("  ✅ Column '%s' exists\n", colName)
		} else {
			fmt.Printf("  ❌ Column '%s' does NOT exist\n", colName)
		}
	}
	
	// Check checklist_items table
	fmt.Println("\n📋 Checking checklist_items table...\n")
	err = db.QueryRow(`
		SELECT TABLE_NAME 
		FROM INFORMATION_SCHEMA.TABLES 
		WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'checklist_items'
	`, dbname).Scan(&tableExists)
	
	if err != nil {
		fmt.Printf("❌ Checklist_items table does NOT exist\n")
	} else {
		fmt.Printf("✅ Checklist_items table exists\n")
	}
	
	fmt.Println("\n✅ Check completed!")
}

