.PHONY: help dev build up down restart logs logs-server logs-client logs-db \
        db-push db-migrate db-seed db-studio db-reset \
        clean clean-volumes install shell-server shell-client shell-db

# Colors
GREEN  := \033[0;32m
YELLOW := \033[0;33m
NC     := \033[0m

help: ## Show this help
	@echo "$(GREEN)PersianPages App$(NC) - Available commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-15s$(NC) %s\n", $$1, $$2}'

# ============================================
# Development
# ============================================

dev: ## Start all services in development mode
	docker-compose up --build

up: ## Start all services in background
	docker-compose up -d --build

down: ## Stop all services
	docker-compose down

restart: ## Restart all services
	docker-compose restart

build: ## Build all containers without starting
	docker-compose build

# ============================================
# Logs
# ============================================

logs: ## Show logs from all services
	docker-compose logs -f

logs-server: ## Show server logs
	docker-compose logs -f server

logs-client: ## Show client logs
	docker-compose logs -f client

logs-db: ## Show database logs
	docker-compose logs -f postgres

# ============================================
# Database
# ============================================

db-push: ## Push schema to database
	docker-compose exec server npx prisma db push

db-migrate: ## Run database migrations
	docker-compose exec server npx prisma migrate dev

db-seed: ## Seed the database
	docker-compose exec server npm run db:seed

db-studio: ## Open Prisma Studio
	docker-compose exec server npx prisma studio

db-reset: ## Reset database (drop all data)
	docker-compose exec server npx prisma db push --force-reset
	docker-compose exec server npm run db:seed

# ============================================
# Shell Access
# ============================================

shell-server: ## Open shell in server container
	docker-compose exec server sh

shell-client: ## Open shell in client container
	docker-compose exec client sh

shell-db: ## Open psql in database container
	docker-compose exec postgres psql -U postgres -d persianpages

# ============================================
# Installation & Setup
# ============================================

install: ## Install dependencies locally (for IDE support)
	cd client && npm install
	cd server && npm install

setup: ## First-time setup (copy env, install, build)
	@if [ ! -f .env ]; then cp .env.example .env; echo "Created .env file"; fi
	$(MAKE) install
	$(MAKE) build

# ============================================
# Cleanup
# ============================================

clean: ## Stop and remove containers
	docker-compose down --rmi local

clean-volumes: ## Stop and remove containers + volumes (deletes DB data)
	docker-compose down -v --rmi local

clean-all: ## Full cleanup (containers, volumes, node_modules)
	docker-compose down -v --rmi local
	rm -rf client/node_modules server/node_modules

# ============================================
# Production
# ============================================

prod-build: ## Build for production
	docker-compose -f docker-compose.yml build

# ============================================
# Quick shortcuts
# ============================================

s: dev ## Alias for 'dev'
u: up ## Alias for 'up'
d: down ## Alias for 'down'
l: logs ## Alias for 'logs'
