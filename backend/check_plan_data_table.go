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
	fmt.Println("\n📋 Checking plan_data table...\n")

	// Check if plan_data table exists
	var tableExists string
	err = db.QueryRow(`
		SELECT TABLE_NAME 
		FROM INFORMATION_SCHEMA.TABLES 
		WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'plan_data'
	`, dbname).Scan(&tableExists)
	
	if err != nil {
		fmt.Printf("❌ Plan_data table does NOT exist\n")
		fmt.Println("\nPlease run migration 004...")
		return
	}
	
	fmt.Printf("✅ Plan_data table exists\n")
	
	// Check columns
	columns := []string{"id", "note_id", "goal", "time_and_milestones", "additional_info", "generated_plan", "created_at", "updated_at"}
	for _, colName := range columns {
		var exists string
		err := db.QueryRow(`
			SELECT COLUMN_NAME 
			FROM INFORMATION_SCHEMA.COLUMNS 
			WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'plan_data' AND COLUMN_NAME = ?
		`, dbname, colName).Scan(&exists)
		
		if err == nil {
			fmt.Printf("  ✅ Column '%s' exists\n", colName)
		} else {
			fmt.Printf("  ❌ Column '%s' does NOT exist\n", colName)
		}
	}
	
	fmt.Println("\n✅ Check completed!")
}

