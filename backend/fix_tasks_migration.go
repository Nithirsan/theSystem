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
	fmt.Println("\n📋 Adding missing columns to tasks table...\n")

	// List of ALTER TABLE statements
	statements := []struct {
		name string
		sql  string
	}{
		{
			name: "parent_task_id",
			sql:  "ALTER TABLE tasks ADD COLUMN parent_task_id INT NULL",
		},
		{
			name: "is_recurring_template",
			sql:  "ALTER TABLE tasks ADD COLUMN is_recurring_template BOOLEAN DEFAULT FALSE",
		},
		{
			name: "recurrence_interval_weeks",
			sql:  "ALTER TABLE tasks ADD COLUMN recurrence_interval_weeks INT NULL",
		},
		{
			name: "recurrence_end_date",
			sql:  "ALTER TABLE tasks ADD COLUMN recurrence_end_date TIMESTAMP NULL",
		},
	}

	// Execute each statement
	for _, stmt := range statements {
		fmt.Printf("Adding column: %s...\n", stmt.name)
		_, err := db.Exec(stmt.sql)
		if err != nil {
			// Check if column already exists
			if contains(err.Error(), "Duplicate column name") || contains(err.Error(), "already exists") {
				fmt.Printf("  ⚠️  Column '%s' already exists (skipping)\n", stmt.name)
			} else {
				log.Printf("  ❌ Error: %v\n", err)
			}
		} else {
			fmt.Printf("  ✅ Column '%s' added successfully\n", stmt.name)
		}
	}

	// Add foreign key constraint
	fmt.Println("\nAdding foreign key constraint...")
	fkSQL := "ALTER TABLE tasks ADD CONSTRAINT fk_parent_task FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE"
	_, err = db.Exec(fkSQL)
	if err != nil {
		if contains(err.Error(), "Duplicate key name") || contains(err.Error(), "already exists") {
			fmt.Printf("  ⚠️  Foreign key constraint already exists (skipping)\n")
		} else {
			log.Printf("  ⚠️  Warning (may already exist): %v\n", err)
		}
	} else {
		fmt.Printf("  ✅ Foreign key constraint added successfully\n")
	}

	fmt.Println("\n✅ Migration completed!")
	
	// Verify columns exist
	fmt.Println("\n📊 Verifying columns...")
	columns := []string{"parent_task_id", "is_recurring_template", "recurrence_interval_weeks", "recurrence_end_date"}
	for _, colName := range columns {
		var exists string
		err := db.QueryRow(`
			SELECT COLUMN_NAME 
			FROM INFORMATION_SCHEMA.COLUMNS 
			WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'tasks' AND COLUMN_NAME = ?
		`, dbname, colName).Scan(&exists)
		
		if err == nil {
			fmt.Printf("  ✅ Column '%s' exists\n", colName)
		} else {
			fmt.Printf("  ❌ Column '%s' does NOT exist\n", colName)
		}
	}
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && 
		   (s == substr || 
		    len(s) > len(substr) && 
		    (s[:len(substr)] == substr || 
		     s[len(s)-len(substr):] == substr || 
		     containsSubstring(s, substr)))
}

func containsSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

