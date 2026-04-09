.PHONY: help install start stop restart logs shell db-shell lint test clean pr pr-merge hooks

# ──────────────────────────────────────────────
# Couleurs
# ──────────────────────────────────────────────
GREEN  := \033[0;32m
YELLOW := \033[0;33m
RESET  := \033[0m

help: ## Affiche cette aide
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "$(GREEN)%-15s$(RESET) %s\n", $$1, $$2}'

# ──────────────────────────────────────────────
# Docker
# ──────────────────────────────────────────────
install: ## Première installation complète
	@echo "$(YELLOW)Construction des images...$(RESET)"
	docker compose build
	@echo "$(YELLOW)Démarrage des conteneurs...$(RESET)"
	docker compose up -d
	@echo "$(YELLOW)Installation des dépendances PHP...$(RESET)"
	docker compose exec php composer install
	@echo "$(YELLOW)Création de la base de données...$(RESET)"
	docker compose exec php php bin/console doctrine:database:create --if-not-exists
	docker compose exec php php bin/console doctrine:migrations:migrate --no-interaction --allow-no-migration
	@$(MAKE) hooks
	@echo "$(GREEN)ImmoAssist est prêt !$(RESET)"
	@echo "  API      → http://localhost:8088/api"
	@echo "  Frontend → http://localhost:5173"
	@echo "  Mercure  → http://localhost:3002/.well-known/mercure"

hooks: ## Active les hooks git versionnés (.githooks)
	@git config core.hooksPath .githooks
	@chmod +x .githooks/* 2>/dev/null || true
	@echo "$(GREEN)✓ Hooks git activés (.githooks)$(RESET)"

start: ## Démarre les conteneurs
	docker compose up -d

stop: ## Stoppe les conteneurs
	docker compose down

restart: ## Redémarre les conteneurs
	docker compose down && docker compose up -d

logs: ## Affiche les logs (tous les services)
	docker compose logs -f

logs-php: ## Logs du conteneur PHP uniquement
	docker compose logs -f php

logs-front: ## Logs du frontend uniquement
	docker compose logs -f front

# ──────────────────────────────────────────────
# Shell & Debug
# ──────────────────────────────────────────────
shell: ## Ouvre un shell dans le conteneur PHP
	docker compose exec php sh

db-shell: ## Ouvre un shell PostgreSQL
	docker compose exec db psql -U immoassist

# ──────────────────────────────────────────────
# Qualité de code
# ──────────────────────────────────────────────
lint: ## Lance le linting PHP + JS
	@echo "$(YELLOW)PHP CS Fixer...$(RESET)"
	docker compose exec php vendor/bin/php-cs-fixer fix --dry-run --diff
	@echo "$(YELLOW)PHPStan...$(RESET)"
	docker compose exec php vendor/bin/phpstan analyse src --level=6
	@echo "$(YELLOW)ESLint...$(RESET)"
	docker compose exec front npm run lint

fix: ## Corrige automatiquement le style PHP
	docker compose exec php vendor/bin/php-cs-fixer fix

test: ## Lance les tests PHPUnit
	docker compose exec php vendor/bin/phpunit --testdox

test-coverage: ## Tests avec couverture de code
	docker compose exec php vendor/bin/phpunit --coverage-html var/coverage

# ──────────────────────────────────────────────
# Base de données
# ──────────────────────────────────────────────
db-migrate: ## Exécute les migrations
	docker compose exec php php bin/console doctrine:migrations:migrate --no-interaction --allow-no-migration

db-diff: ## Génère une migration à partir des changements d'entité
	docker compose exec php php bin/console doctrine:migrations:diff

db-reset: ## Recrée la base de données (ATTENTION: perte de données)
	docker compose exec php php bin/console doctrine:database:drop --force --if-exists
	docker compose exec php php bin/console doctrine:database:create
	docker compose exec php php bin/console doctrine:migrations:migrate --no-interaction --allow-no-migration

# ──────────────────────────────────────────────
# Git & Pull Requests
# ──────────────────────────────────────────────
pr: ## Crée une pull request (interactif : titre + body)
	@branch=$$(git branch --show-current); \
	if [ "$$branch" = "main" ] || [ "$$branch" = "master" ]; then \
		echo "$(YELLOW)Tu es sur $$branch, change de branche d'abord.$(RESET)"; \
		exit 1; \
	fi; \
	echo "$(GREEN)→ Branche détectée :$(RESET) $$branch"; \
	echo ""; \
	printf "$(GREEN)📝 Titre de la PR :$(RESET) "; \
	read title; \
	if [ -z "$$title" ]; then \
		echo "$(YELLOW)Titre vide, abandon.$(RESET)"; \
		exit 1; \
	fi; \
	echo ""; \
	if [ -f .pr-body.md ]; then \
		lines=$$(wc -l < .pr-body.md | tr -d ' '); \
		echo "$(GREEN)📄 Fichier .pr-body.md trouvé ($$lines lignes)$(RESET)"; \
		printf "Utiliser ce fichier ? [Y/e/n] "; \
		read ans; \
		case "$$ans" in \
			e|E) $${EDITOR:-vi} .pr-body.md ;; \
			n|N) body_opt="" ;; \
			*) body_opt="--body-file .pr-body.md" ;; \
		esac; \
		[ "$$ans" != "n" ] && [ "$$ans" != "N" ] && body_opt="--body-file .pr-body.md"; \
	else \
		echo "$(YELLOW)📄 Aucun fichier .pr-body.md$(RESET)"; \
		printf "Que faire ? [e=éditeur / v=vide / s=auto-fill commits] "; \
		read ans; \
		case "$$ans" in \
			e|E) $${EDITOR:-vi} .pr-body.md; body_opt="--body-file .pr-body.md" ;; \
			s|S) body_opt="--fill" ;; \
			*) body_opt="--body \"\"" ;; \
		esac; \
	fi; \
	echo ""; \
	echo "$(YELLOW)🚀 Push de la branche...$(RESET)"; \
	git push -u origin "$$branch"; \
	echo "$(YELLOW)📬 Création de la PR...$(RESET)"; \
	eval gh pr create --base main --head "$$branch" --title \"$$title\" $$body_opt

pr-merge: ## Merge la PR de la branche courante en squash + cleanup local
	@branch=$$(git branch --show-current); \
	if [ "$$branch" = "main" ] || [ "$$branch" = "master" ]; then \
		echo "$(YELLOW)Tu es sur $$branch, rien à merger.$(RESET)"; \
		exit 1; \
	fi; \
	echo "$(GREEN)→ Merge en squash de :$(RESET) $$branch"; \
	gh pr merge --squash --delete-branch; \
	echo "$(YELLOW)Cleanup local...$(RESET)"; \
	git checkout main; \
	git pull; \
	git branch -d "$$branch" 2>/dev/null || true; \
	echo "$(GREEN)✓ Branche $$branch mergée et supprimée localement$(RESET)"

# ──────────────────────────────────────────────
# Nettoyage
# ──────────────────────────────────────────────
clean: ## Supprime les conteneurs, volumes et cache
	docker compose down -v --remove-orphans
	docker compose exec php php bin/console cache:clear 2>/dev/null || true
