# Variables
PORT ?= 8080
MODE ?= PROD

# Phony targets
.PHONY: build run up down clean logs

# Build Docker image
build:
	@docker compose build

# Run Docker container
run:
	@docker compose up

# Build and run Docker container
up: build run

# Stop Docker container
down:
	@docker compose down

# Stop and remove all Docker containers and volumes
clean:
	@docker compose down -v

# Show Docker container logs
logs:
	@docker compose logs -f