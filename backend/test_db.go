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

	fmt.Printf("Attempting to connect to database...\n")
	fmt.Printf("DSN: %s:%s@tcp(%s:%s)/%s\n", user, "***", host, port, dbname)

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

	// Check if users table exists
	var tableExists string
	err = db.QueryRow("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'", dbname).Scan(&tableExists)
	if err != nil {
		log.Printf("⚠️  Users table not found: %v", err)
	} else {
		fmt.Println("✅ Users table exists")
	}

	// Try to query users
	rows, err := db.Query("SELECT id, email, name, preferences, settings FROM users LIMIT 5")
	if err != nil {
		log.Printf("⚠️  Error querying users: %v", err)
	} else {
		defer rows.Close()
		fmt.Println("\n📋 Existing users in database:")
		count := 0
		for rows.Next() {
			var id int
			var email, name string
			var preferences, settings sql.NullString
			
			err := rows.Scan(&id, &email, &name, &preferences, &settings)
			if err != nil {
				log.Printf("⚠️  Error scanning user: %v", err)
				continue
			}
			count++
			prefVal := "NULL"
			setVal := "NULL"
			if preferences.Valid {
				prefVal = preferences.String
			}
			if settings.Valid {
				setVal = settings.String
			}
			fmt.Printf("  User %d: %s (%s) - Preferences: %s, Settings: %s\n", id, email, name, prefVal, setVal)
		}
		if count == 0 {
			fmt.Println("  (No users found)")
		}
	}

	// Try to find a specific user by email
	testEmail := "test@example.com"
	fmt.Printf("\n🔍 Testing query for email: %s\n", testEmail)
	
	var userID int
	var email, name string
	var preferences, settings sql.NullString
	
	err = db.QueryRow(`
		SELECT id, email, name, preferences, settings 
		FROM users WHERE email = ?
	`, testEmail).Scan(&userID, &email, &name, &preferences, &settings)
	
	if err == sql.ErrNoRows {
		fmt.Printf("❌ User with email %s not found\n", testEmail)
	} else if err != nil {
		log.Printf("❌ Error querying user: %v", err)
	} else {
		fmt.Printf("✅ User found: ID=%d, Email=%s, Name=%s\n", userID, email, name)
	}
}

