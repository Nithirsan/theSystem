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
	migrationFile := "migrations/003_add_notes.sql"
	fmt.Printf("Reading migration file: %s\n", migrationFile)
	
	migrationSQL, err := ioutil.ReadFile(migrationFile)
	if err != nil {
		log.Fatalf("Failed to read migration file: %v", err)
	}

	fmt.Println("\n📋 Executing migration 003_add_notes.sql...")
	
	// Split by semicolons and execute each statement
	statements := strings.Split(string(migrationSQL), ";")
	
	for i, stmt := range statements {
		stmt = strings.TrimSpace(stmt)
		if stmt == "" || strings.HasPrefix(stmt, "--") {
			continue
		}
		
		// Remove comments from each line
		lines := strings.Split(stmt, "\n")
		var cleanStmt strings.Builder
		for _, line := range lines {
			trimmed := strings.TrimSpace(line)
			if trimmed == "" || strings.HasPrefix(trimmed, "--") {
				continue
			}
			cleanStmt.WriteString(trimmed)
			cleanStmt.WriteString(" ")
		}
		
		finalStmt := strings.TrimSpace(cleanStmt.String())
		if finalStmt == "" {
			continue
		}
		
		fmt.Printf("\n📝 Executing statement %d...\n", i+1)
		fmt.Printf("   %s\n", finalStmt)
		
		_, err := db.Exec(finalStmt)
		if err != nil {
			// Check if it's a duplicate table/key error
			if strings.Contains(err.Error(), "Duplicate") || 
			   strings.Contains(err.Error(), "already exists") {
				fmt.Printf("⚠️  Warning: %s (table/key may already exist, continuing...)\n", err.Error())
				continue
			}
			log.Fatalf("❌ Failed to execute statement: %v\nStatement: %s", err, finalStmt)
		}
		
		fmt.Printf("✅ Statement %d executed successfully\n", i+1)
	}

	fmt.Println("\n✅ Migration completed successfully!")
}

