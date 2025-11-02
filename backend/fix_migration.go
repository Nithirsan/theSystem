package main

import (
	"database/sql"
	"fmt"
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

	fmt.Println("\n📋 Adding recurring task columns...")

	// Add columns one by one to handle errors gracefully
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

	for _, stmt := range statements {
		fmt.Printf("\n📝 Adding column: %s...\n", stmt.name)
		_, err := db.Exec(stmt.sql)
		if err != nil {
			if strings.Contains(err.Error(), "Duplicate column name") {
				fmt.Printf("⚠️  Column '%s' already exists, skipping...\n", stmt.name)
			} else {
				log.Printf("❌ Error adding column %s: %v\n", stmt.name, err)
			}
		} else {
			fmt.Printf("✅ Column '%s' added successfully\n", stmt.name)
		}
	}

	// Add foreign key constraint
	fmt.Printf("\n📝 Adding foreign key constraint...\n")
	_, err = db.Exec("ALTER TABLE tasks ADD CONSTRAINT fk_parent_task FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE")
	if err != nil {
		if strings.Contains(err.Error(), "Duplicate key name") || strings.Contains(err.Error(), "already exists") {
			fmt.Printf("⚠️  Foreign key constraint already exists, skipping...\n")
		} else {
			log.Printf("⚠️  Warning adding foreign key: %v (may already exist)\n", err)
		}
	} else {
		fmt.Printf("✅ Foreign key constraint added successfully\n")
	}

	fmt.Println("\n✅ Migration fix completed!")
}

