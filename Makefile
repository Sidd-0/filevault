.PHONY: help build up down restart logs clean test

help: ## Show this help message
	@echo "File Vault - Available Commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

build: ## Build all Docker containers
	docker-compose build

up: ## Start all services
	docker-compose up -d

down: ## Stop all services
	docker-compose down

restart: down up ## Restart all services

logs: ## View logs from all services
	docker-compose logs -f

logs-backend: ## View backend logs only
	docker-compose logs -f backend

logs-frontend: ## View frontend logs only
	docker-compose logs -f frontend

logs-db: ## View database logs only
	docker-compose logs -f postgres

clean: ## Stop services and remove volumes
	docker-compose down -v
	rm -rf uploads/*

test: ## Run tests
	./test.sh

status: ## Show status of all services
	docker-compose ps

shell-backend: ## Open shell in backend container
	docker-compose exec backend sh

shell-db: ## Open PostgreSQL shell
	docker-compose exec postgres psql -U admin -d filevault

backup-db: ## Backup database
	docker-compose exec postgres pg_dump -U admin filevault > backup_$(shell date +%Y%m%d_%H%M%S).sql

restore-db: ## Restore database (Usage: make restore-db FILE=backup.sql)
	docker-compose exec -T postgres psql -U admin filevault < $(FILE)

dev: ## Start in development mode with live reload
	docker-compose up

prod: ## Start in production mode
	docker-compose -f docker-compose.prod.yml up -d

install-backend: ## Install backend dependencies
	cd backend && go mod download

install-frontend: ## Install frontend dependencies
	cd frontend && npm install

format-backend: ## Format Go code
	cd backend && go fmt ./...

format-frontend: ## Format frontend code
	cd frontend && npm run format

lint-backend: ## Lint Go code
	cd backend && golangci-lint run

lint-frontend: ## Lint frontend code
	cd frontend && npm run lint
