# ImmoAssist

Générateur d'annonces immobilières propulsé par l'IA. Renseigne les caractéristiques d'un bien, choisis un ton (luxe, familial, investisseur, étudiant), et regarde l'annonce s'écrire en temps réel — comme avec ChatGPT — grâce au **streaming Mercure**.

## Démo

https://github.com/user-attachments/assets/cf45b7a3-ae85-4c20-93df-a7d81a36e683

## Stack technique

| Couche     | Technologie                                              |
|------------|----------------------------------------------------------|
| Backend    | PHP 8.4 · Symfony 7.4 · API Platform 4 · Doctrine ORM 3 |
| Frontend   | React 19 · Vite · TypeScript · Tailwind CSS 3           |
| UI Kit     | shadcn/ui (Radix) · Lucide · Geist · Framer Motion      |
| Forms      | react-hook-form · zod                                   |
| Base       | PostgreSQL 16                                           |
| Temps réel | Mercure (SSE) — streaming token-par-token               |
| IA         | API Google Gemini (`gemini-2.5-flash` + fallback `flash-lite`) |
| Infra      | Docker Compose · GitHub Actions CI/CD                   |

## Fonctionnalités

- ✅ Formulaire complet avec validation stricte (zod) et liste dynamique de points forts (1 à 5)
- ✅ Autocomplete d'adresses via la [Base Adresse Nationale](https://adresse.data.gouv.fr/) (gratuit, sans clé)
- ✅ 4 tons d'annonce (luxe, familial, investisseur, étudiant)
- ✅ Mode clair / sombre avec persistance localStorage
- ✅ **Streaming token-par-token** via Mercure : effet « machine à écrire » fluide avec buffer de typing à cadence adaptative côté front
- ✅ **Gestion d'erreurs résiliente** : exceptions domaine `GeminiQuotaExceededException` / `GeminiUnavailableException` avec fallback automatique sur un modèle secondaire, messages utilisateur clairs (via `Sonner` toasts)
- ✅ **Historique des annonces** dans un drawer latéral, réutilisation au clic (formulaire rempli + résultat affiché)
- ✅ **Régénérer / Copier / Supprimer** une annonce, avec modale de confirmation shadcn pour la suppression

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
make hooks          # Active les hooks git versionnés (.githooks/)
```

### Hooks git

Le dépôt versionne un hook `pre-commit` dans `.githooks/` qui **bloque les commits directs sur `main`/`master`**, pour forcer le workflow par branche dédiée + PR. Activé automatiquement par `make install`, ou à la main avec `make hooks`. Bypass exceptionnel : `git commit --no-verify`.

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

### Flux de génération en streaming

```
1. Front génère un streamId (uuid) et ouvre une EventSource
   sur Mercure : http://localhost:3002/.well-known/mercure?topic=annonce/<streamId>

2. Front POST /api/annonces avec { ...payload, streamId }

3. API Platform → AnnonceProcessor → GeminiService::streamAnnonce()
   → appelle l'endpoint SSE de Gemini :streamGenerateContent?alt=sse
   → parse les events ligne par ligne
   → publie chaque chunk de texte sur le topic Mercure dédié

4. Pendant ce temps, le hook useAnnonceGeneration côté front
   reçoit les chunks via l'EventSource et les empile dans une queue

5. Un setInterval dépile la queue caractère par caractère et alimente
   le state React → effet typewriter fluide. Si Gemini va plus vite que
   l'affichage, la cadence accélère (1 → 5 chars par tick) pour rattraper.

6. Quand Gemini a fini, le back persiste l'Annonce en BDD et publie
   un message { type: 'done', id } sur Mercure. Le front draine la queue
   restante puis bascule en état 'success' et expose les boutons
   Régénérer / Copier.
```

### Résilience Gemini

`GeminiService::generateAnnonce()` (mode bloquant utilisé en fallback) tente le modèle primaire, et si l'appel échoue avec une `GeminiException`, retente automatiquement avec un modèle secondaire configurable. Les exceptions HTTP sont mappées en exceptions domaine (`GeminiQuotaExceededException` sur 429/`RESOURCE_EXHAUSTED`, `GeminiUnavailableException` sur les autres erreurs), interceptées par un `ExceptionListener` qui renvoie un payload JSON propre `{ code, detail, status }` que le front utilise pour afficher un message toast contextuel.

### Structure du frontend

```
front/src/
├── components/
│   ├── annonce/
│   │   ├── AnnonceForm.tsx          # Formulaire react-hook-form + zod
│   │   ├── AnnonceResult.tsx        # Affichage idle/streaming/success + boutons
│   │   ├── AnnonceHistory.tsx       # Drawer Sheet avec liste + suppression
│   │   ├── AddressAutocomplete.tsx  # Autocomplete BAN (fetch sur saisie clavier)
│   │   └── property-types.ts
│   ├── ui/                          # Composants shadcn/ui (sheet, alert-dialog, ...)
│   ├── theme-provider.tsx           # Light/dark + persistance
│   └── mode-toggle.tsx
├── hooks/
│   └── useAnnonceGeneration.ts      # Streaming Mercure + buffer typing
├── services/api.ts                  # Client HTTP typé (create / list / delete)
├── types/
│   ├── annonce.ts                   # Types métier
│   └── annonce-schema.ts            # Schéma zod + helpers de conversion
└── App.tsx                          # Layout split-view + header
```

## CI/CD

Le pipeline GitHub Actions exécute à chaque push :

1. **PHP Quality** — PHP CS Fixer (`@Symfony` + `@Symfony:risky`) + PHPStan niveau 6
2. **PHP Tests** — PHPUnit avec base PostgreSQL réelle
3. **Front Build** — ESLint + `tsc -b` + `vite build`
4. **Docker Build** — Images API et Front (sur `main` uniquement)

## Licence

MIT
