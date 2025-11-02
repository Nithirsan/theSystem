package main

import (
	"database/sql"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"strings"

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

	// Read migration file
	migrationFile := "migrations/001_init_schema.sql"
	fmt.Printf("Reading migration file: %s\n", migrationFile)
	
	migrationSQL, err := ioutil.ReadFile(migrationFile)
	if err != nil {
		log.Fatalf("Failed to read migration file: %v", err)
	}

	// Execute the entire migration file at once
	// MySQL can handle CREATE TABLE IF NOT EXISTS statements
	fmt.Println("\n📋 Executing migrations...")
	
	// Remove comments and split by statements more intelligently
	// First, split by lines and filter comments
	lines := strings.Split(string(migrationSQL), "\n")
	var cleanSQL strings.Builder
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		// Skip empty lines and comment-only lines
		if trimmed == "" || strings.HasPrefix(trimmed, "--") {
			continue
		}
		// Add line with newline if it's not empty
		cleanSQL.WriteString(trimmed)
		cleanSQL.WriteString("\n")
	}
	
	// Execute the cleaned SQL
	fullSQL := cleanSQL.String()
	
	// Split by semicolon but keep multi-line statements together
	statements := strings.Split(fullSQL, ";")
	
	for i, statement := range statements {
		statement = strings.TrimSpace(statement)
		// Skip empty statements
		if statement == "" {
			continue
		}

		// Skip INSERT statements if tables don't exist yet - we'll run them separately
		if strings.Contains(strings.ToUpper(statement), "INSERT") {
			continue
		}

		fmt.Printf("Executing statement %d...\n", i+1)
		_, err := db.Exec(statement)
		if err != nil {
			// Ignore "table already exists" errors for CREATE TABLE IF NOT EXISTS
			if strings.Contains(err.Error(), "already exists") || strings.Contains(err.Error(), "Duplicate") {
				fmt.Printf("  ⚠️  Already exists (skipping)\n")
				continue
			}
			log.Printf("  ❌ Error: %v\n", err)
			log.Printf("  First 200 chars: %s\n", statement[:min(200, len(statement))])
		} else {
			fmt.Printf("  ✅ Success\n")
		}
	}
	
	// Now try INSERT statements
	fmt.Println("\n📋 Inserting sample data...")
	for _, statement := range statements {
		statement = strings.TrimSpace(statement)
		if statement == "" || !strings.Contains(strings.ToUpper(statement), "INSERT") {
			continue
		}
		fmt.Printf("Executing INSERT...\n")
		_, err := db.Exec(statement)
		if err != nil {
			// Ignore duplicate key errors
			if strings.Contains(err.Error(), "Duplicate") || strings.Contains(err.Error(), "IGNORE") {
				fmt.Printf("  ⚠️  Data already exists (skipping)\n")
				continue
			}
			log.Printf("  ⚠️  Error (may be expected if table doesn't exist yet): %v\n", err)
		} else {
			fmt.Printf("  ✅ Success\n")
		}
	}

	fmt.Println("\n✅ Migration completed!")

	// Verify tables were created
	fmt.Println("\n📊 Verifying tables...")
	tables := []string{"users", "habits", "tasks", "journal_entries", "chat_sessions", "chat_messages"}
	for _, table := range tables {
		var exists string
		err := db.QueryRow("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?", dbname, table).Scan(&exists)
		if err == nil {
			fmt.Printf("  ✅ Table '%s' exists\n", table)
		} else {
			fmt.Printf("  ❌ Table '%s' not found\n", table)
		}
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

