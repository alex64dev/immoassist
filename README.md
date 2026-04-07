# ImmoAssist

Générateur d'annonces immobilières propulsé par l'IA. Renseignez les caractéristiques d'un bien, choisissez un ton, et obtenez une annonce professionnelle en quelques secondes — avec affichage en temps réel grâce au streaming.

## Stack technique

| Couche     | Technologie                              |
|------------|------------------------------------------|
| Backend    | PHP 8.3 · Symfony 7 · API Platform 3    |
| Frontend   | React (ou Vue) · Vite · Tailwind CSS    |
| Base       | PostgreSQL 16                            |
| Temps réel | Mercure (SSE)                            |
| IA         | API Anthropic (Claude)                   |
| Infra      | Docker Compose · GitHub Actions CI/CD    |

## Prérequis

- Docker et Docker Compose
- Une clé API Anthropic ([console.anthropic.com](https://console.anthropic.com/))

## Installation

```bash
# 1. Cloner le dépôt
git clone git@github.com:votre-user/immoassist.git
cd immoassist

# 2. Configurer les variables d'environnement
cp .env.example .env
# Éditez .env avec votre clé API Anthropic

# 3. Lancer le projet
make install
```

L'application est accessible sur :

| Service  | URL                                              |
|----------|--------------------------------------------------|
| Frontend | [localhost:5173](http://localhost:5173)           |
| API      | [localhost:8080/api](http://localhost:8080/api)   |
| Mercure  | [localhost:3001](http://localhost:3001)           |

## Commandes utiles

```bash
make start          # Démarrer les conteneurs
make stop           # Arrêter les conteneurs
make logs           # Voir les logs
make shell          # Shell dans le conteneur PHP
make lint           # Linting PHP + JS
make fix            # Correction automatique du style PHP
make test           # Lancer les tests
make db-migrate     # Exécuter les migrations
make db-diff        # Générer une migration
```

## Architecture

```
POST /api/annonces
  → Controller reçoit les données du bien
  → Service construit le prompt avec le ton choisi
  → Appel streaming à l'API Claude (anthropic-php)
  → Chaque token est publié sur Mercure
  → Le frontend souscrit au topic et affiche en temps réel
  → L'annonce complète est sauvegardée en base
```

## CI/CD

Le pipeline GitHub Actions exécute à chaque push :

1. **Lint** — PHP CS Fixer + ESLint
2. **Analyse statique** — PHPStan niveau 6
3. **Tests** — PHPUnit avec base PostgreSQL
4. **Build** — Frontend + images Docker (sur `main`)

## Licence

MIT
