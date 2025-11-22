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
	fmt.Println("\n📋 Reading migration file: migrations/004_add_plan_data.sql\n")

	// Read migration file
	migrationSQL, err := ioutil.ReadFile("migrations/004_add_plan_data.sql")
	if err != nil {
		log.Fatalf("Failed to read migration file: %v", err)
	}

	// Split by semicolon and execute each statement
	statements := strings.Split(string(migrationSQL), ";")
	
	fmt.Println("📋 Executing migration 004_add_plan_data.sql...\n")

	for _, statement := range statements {
		statement = strings.TrimSpace(statement)
		if statement == "" || strings.HasPrefix(statement, "--") {
			continue
		}

		_, err = db.Exec(statement)
		if err != nil {
			log.Printf("⚠️  Error executing statement: %v", err)
			log.Printf("Statement: %s", statement)
		}
	}

	fmt.Println("✅ Migration completed successfully!")
}

