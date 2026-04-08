# ImmoAssist

Générateur d'annonces immobilières propulsé par l'IA. Renseigne les caractéristiques d'un bien, choisis un ton (luxe, familial, investisseur, étudiant), et obtiens une annonce professionnelle générée par Google Gemini.

## Stack technique

| Couche     | Technologie                                              |
|------------|----------------------------------------------------------|
| Backend    | PHP 8.4 · Symfony 7.4 · API Platform 4 · Doctrine ORM 3 |
| Frontend   | React 19 · Vite · TypeScript · Tailwind CSS 3           |
| UI Kit     | shadcn/ui (Radix) · Lucide · Geist · Framer Motion      |
| Forms      | react-hook-form · zod                                   |
| Base       | PostgreSQL 16                                           |
| Temps réel | Mercure (SSE) — *prévu pour la v2*                      |
| IA         | API Google Gemini (`gemini-2.5-flash`)                  |
| Infra      | Docker Compose · GitHub Actions CI/CD                   |

## Fonctionnalités

- ✅ Formulaire complet avec validation stricte (zod)
- ✅ Liste dynamique de points forts (1 à 5)
- ✅ Autocomplete d'adresses via la [Base Adresse Nationale](https://adresse.data.gouv.fr/) (gratuit, sans clé)
- ✅ 4 tons d'annonce (luxe, familial, investisseur, étudiant)
- ✅ Mode clair / sombre avec persistance
- ✅ Génération via Google Gemini avec prompt calibré
- ✅ Bouton « copier l'annonce »
- 🔜 Streaming temps réel via Mercure (v2)
- 🔜 Historique des annonces générées (v2)

## Prérequis

- Docker et Docker Compose
- Une clé API Google Gemini gratuite ([aistudio.google.com/apikey](https://aistudio.google.com/apikey))

## Installation

```bash
# 1. Cloner le dépôt
git clone git@github.com:alex64dev/immoassist.git
cd immoassist

# 2. Configurer les variables d'environnement
cp .env.example .env
# Édite .env et renseigne ta clé API Gemini

# 3. Lancer le projet
make install
```

L'application est accessible sur :

| Service  | URL                                              |
|----------|--------------------------------------------------|
| Frontend | [localhost:5173](http://localhost:5173)          |
| API      | [localhost:8088/api](http://localhost:8088/api)  |
| Mercure  | [localhost:3002](http://localhost:3002)          |

> ℹ️ Les ports sont décalés (8088, 5433, 3002) pour cohabiter avec d'autres services Docker.

## Commandes utiles

```bash
make start          # Démarrer les conteneurs
make stop           # Arrêter les conteneurs
make logs           # Voir les logs
make shell          # Shell dans le conteneur PHP
make lint           # Linting PHP CS Fixer + PHPStan + ESLint
make fix            # Correction automatique du style PHP
make test           # Lancer les tests PHPUnit
make db-migrate     # Exécuter les migrations
make db-diff        # Générer une migration depuis les entités
make db-reset       # Drop + recreate + migrate (destructif)
```

### Workflow Git & Pull Requests

Deux cibles `make` automatisent le cycle complet d'une PR (nécessite [`gh`](https://cli.github.com/) authentifié) :

```bash
make pr             # Crée une pull request (interactif)
make pr-merge       # Merge en squash + cleanup local
```

#### `make pr` — interactif

1. **Refuse de tourner** si tu es sur `main` ou `master`
2. Affiche la **branche détectée**
3. Demande le **titre** de la PR (`read title`)
4. **Si `.pr-body.md` existe** → propose :
   - `Y` (défaut) → utiliser le fichier tel quel
   - `e` → ouvrir dans `$EDITOR` pour l'éditer avant
   - `n` → ignorer le fichier et créer la PR avec un body vide
5. **Sinon** → propose :
   - `e` → ouvrir `$EDITOR` pour rédiger maintenant (le fichier est gardé)
   - `v` → créer la PR avec un body vide
   - `s` → utiliser `gh pr create --fill` (auto-fill depuis les messages de commit)
6. **Push** la branche avec `-u origin <branche>`
7. **Crée la PR** avec `gh pr create --title ... --body-file ...` (ou `--fill` selon le choix)

> 💡 Le fichier `.pr-body.md` est ajouté au `.gitignore` pour ne jamais être commité par accident. Il sert juste de brouillon local pour préparer le body sans galérer avec les sauts de ligne du terminal.

#### `make pr-merge` — non-interactif

1. **Refuse** si tu es sur `main`/`master`
2. `gh pr merge --squash --delete-branch` (squash + supprime la branche distante)
3. `git checkout main && git pull && git branch -d <branche>` (cleanup local)

## Architecture

```
POST /api/annonces
  → API Platform reçoit le payload (JSON-LD)
  → AnnonceProcessor (state processor) prend la main
  → GeminiService construit le prompt selon le ton choisi
  → Appel HTTP à l'API Google Gemini
  → Le contenu généré est persisté dans l'entité Annonce
  → Réponse JSON-LD renvoyée au front
  → Le front affiche l'annonce avec animation Framer Motion
```

### Structure du frontend

```
front/src/
├── components/
│   ├── annonce/
│   │   ├── AnnonceForm.tsx          # Formulaire react-hook-form + zod
│   │   ├── AnnonceResult.tsx        # Affichage skeleton/success
│   │   ├── AddressAutocomplete.tsx  # Autocomplete BAN
│   │   └── property-types.ts
│   ├── ui/                          # Composants shadcn/ui
│   ├── theme-provider.tsx           # Light/dark + persistance
│   └── mode-toggle.tsx
├── services/api.ts                  # Client HTTP typé
├── types/
│   ├── annonce.ts                   # Types métier
│   └── annonce-schema.ts            # Schéma zod
└── App.tsx                          # Layout split-view
```

## CI/CD

Le pipeline GitHub Actions exécute à chaque push :

1. **PHP Quality** — PHP CS Fixer (`@Symfony` + `@Symfony:risky`) + PHPStan niveau 6
2. **PHP Tests** — PHPUnit avec base PostgreSQL réelle
3. **Front Build** — ESLint + `tsc -b` + `vite build`
4. **Docker Build** — Images API et Front (sur `main` uniquement)

## Licence

MIT
