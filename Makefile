# Makefile for Habit Tracker Application

.PHONY: help build up down logs clean restart dev prod

# Default target
help:
	@echo "Available commands:"
	@echo "  build     - Build all Docker images"
	@echo "  up        - Start all services"
	@echo "  down      - Stop all services"
	@echo "  logs      - Show logs from all services"
	@echo "  clean     - Remove all containers and volumes"
	@echo "  restart   - Restart all services"
	@echo "  dev       - Start development environment"
	@echo "  prod      - Start production environment"
	@echo "  frontend  - Start only frontend"
	@echo "  backend   - Start only backend"
	@echo "  mysql     - Start only MySQL"

# Build all images
build:
	docker-compose build

# Start all services
up:
	docker-compose up -d

# Stop all services
down:
	docker-compose down

# Show logs
logs:
	docker-compose logs -f

# Clean everything
clean:
	docker-compose down -v --remove-orphans
	docker system prune -f

# Restart services
restart:
	docker-compose restart

# Development environment
dev:
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Production environment
prod:
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Individual services
frontend:
	docker-compose up -d frontend

backend:
	docker-compose up -d backend mysql

mysql:
	docker-compose up -d mysql

# Database operations
db-migrate:
	docker-compose exec backend ./main migrate

db-seed:
	docker-compose exec backend ./main seed

# Health checks
health:
	@echo "Checking service health..."
	@curl -f http://localhost:8080/health && echo "Backend: OK" || echo "Backend: FAILED"
	@curl -f http://localhost:3000 && echo "Frontend: OK" || echo "Frontend: FAILED"
	@curl -f http://localhost:80 && echo "Nginx: OK" || echo "Nginx: FAILED"

# Backup database
backup:
	docker-compose exec mysql mysqldump -u root -p$$MYSQL_ROOT_PASSWORD habit_tracker > backup_$$(date +%Y%m%d_%H%M%S).sql

# Restore database
restore:
	@echo "Usage: make restore FILE=backup_file.sql"
	docker-compose exec -T mysql mysql -u root -p$$MYSQL_ROOT_PASSWORD habit_tracker < $$FILE
