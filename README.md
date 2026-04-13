# GND Formation Commerciaux

Plateforme web interne de formation et de suivi pour les commerciaux freelances
de **GND Consulting**. Plateforme autonome, non intégrée à l'écosystème
Raykoo / N8N / agents existants.

## Fonctionnalités

- Connexion **Google OAuth** via Supabase
- Parcours de formation en **7 modules MDX** avec gating séquentiel frontend
- **Quiz natifs** par module, scorés côté serveur (seuil 70%)
- **CRM personnel** de prospects par commercial (CRUD complet, filtres, notes)
- **Espace admin** en lecture seule : suivi formation + pipeline global
- Pages **Ressources** rendues depuis un fichier MDX versionné

## Stack

- **Next.js 15** (App Router, TypeScript)
- **Tailwind CSS**
- **Supabase** (PostgreSQL + Auth + RLS)
- **MDX** (`next-mdx-remote`, `gray-matter`)
- **Zod** (validation des routes API)
- **Vercel** pour le déploiement

## Structure du projet

```
gnd-formation-commerciaux/
├── src/
│   ├── app/
│   │   ├── page.tsx                          redirige vers /dashboard ou /login
│   │   ├── layout.tsx
│   │   ├── login/                            page login + LoginButton client
│   │   ├── auth/callback/route.ts            exchange du code OAuth → session
│   │   ├── api/quiz/
│   │   │   ├── [module_slug]/questions/      GET questions sans correct_ids
│   │   │   └── submit/                       POST scoring serveur
│   │   └── (app)/
│   │       ├── layout.tsx                    layout protégé (Navbar + auth)
│   │       ├── dashboard/page.tsx
│   │       ├── formation/
│   │       │   ├── page.tsx                  grille des 7 modules
│   │       │   └── [slug]/page.tsx           module individuel + Quiz natif
│   │       ├── ressources/page.tsx
│   │       ├── prospects/page.tsx            CRUD via ProspectTable
│   │       └── admin/page.tsx                lecture seule, check rôle
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── ModuleCard.tsx
│   │   ├── Quiz.tsx                          composant quiz natif (client)
│   │   ├── ProspectTable.tsx
│   │   └── ProspectModal.tsx
│   ├── content/                              MDX : 7 modules + ressources
│   ├── lib/
│   │   ├── supabase-client.ts
│   │   ├── supabase-server.ts
│   │   ├── supabase-middleware.ts
│   │   ├── supabase-admin.ts                 service role key (server-only)
│   │   ├── modules-registry.ts
│   │   ├── prospects.ts
│   │   └── quiz/constants.ts                 QUIZ_PASS_THRESHOLD = 70
│   └── middleware.ts                         protection des routes
├── supabase/
│   └── migrations/
│       ├── 0001_init.sql                     schéma initial + triggers + RLS
│       ├── 0002_quiz_native_v1.sql           tables quiz + ALTER progressions
│       └── 0003_quiz_seed.sql                seed des 72 questions
├── .env.example
└── package.json
```

## Mise en route

### 1. Installer les dépendances

```bash
npm install
```

### 2. Créer le projet Supabase

- Créer un **nouveau projet Supabase dédié** (ne pas réutiliser la base GND
  existante).
- Ouvrir `SQL Editor` et exécuter dans l'ordre :
  1. `supabase/migrations/0001_init.sql` — schéma initial
  2. `supabase/migrations/0002_quiz_native_v1.sql` — tables quiz + RLS + ALTER
  3. `supabase/migrations/0003_quiz_seed.sql` — seed des 72 questions
- Configurer le provider **Google** dans `Authentication → Providers → Google`.
- URL de callback Supabase : `https://<projet>.supabase.co/auth/v1/callback`
- Dans `Authentication → URL Configuration`, ajouter l'URL de l'app
  (`http://localhost:3000` en dev, `https://formation.gndconsulting.fr` en
  prod) dans les redirect URLs autorisés.

### 3. Configurer les variables d'environnement

Copier `.env.example` en `.env.local` et remplir avec les clés Supabase :

```bash
cp .env.example .env.local
```

Variables requises :

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — **obligatoire** côté serveur, utilisée par la
  route `/api/quiz/submit` pour bypass la RLS et lire les `correct_ids`.
- `NEXT_PUBLIC_APP_URL` (ex. `http://localhost:3000` en dev)

### 4. Lancer le dev server

```bash
npm run dev
```

La première personne qui se connecte via Google est créée automatiquement en
base (trigger `handle_new_user`) avec le rôle `commercial`. Pour promouvoir
l'admin, exécuter dans le SQL Editor :

```sql
UPDATE public.users SET role = 'admin' WHERE email = '<ton-email-google>';
```

## Contenu des modules

Les 7 modules sont des fichiers MDX dans `src/content/`. Chaque fichier a
un frontmatter :

```mdx
---
slug: module-01-decouverte-gnd
order: 1
title: Découverte GND
duration: 12
---

# Découverte GND Consulting

Contenu markdown…
```

Le rendu MDX est fait via `next-mdx-remote/rsc` avec `remark-gfm` activé
(tables, task lists, strikethrough). Le quiz est sur une **page dédiée**
`/formation/[slug]/quiz`, pas dans le MDX — le composant `<Quiz />` n'a
pas besoin d'être exposé au scope MDX.

Pour **mettre à jour un module** : éditer le `.mdx` → commit → push →
redéploiement Vercel automatique.

Pour **changer l'ordre, le titre ou la durée** d'un module : éditer
le registre `src/lib/modules-registry.ts`.

## Quiz natif

- Format : QCM **single** (radio, 1 bonne réponse) ou **multiple** (checkbox,
  ensemble strictement égal). Inspiré OpenClassrooms.
- Stockage : tables `quiz_questions` et `quiz_attempts`.
- **Scoring serveur** uniquement : la route `/api/quiz/submit` recalcule tout,
  jamais de score envoyé par le client. Les `correct_ids` ne sont jamais
  exposés dans le DOM.
- **Seuil de validation** : 70%. Constante partagée
  `src/lib/quiz/constants.ts`.
- Validation `progressions` : déclenchée uniquement si `percentage >= 70`. Le
  `completed_at` initial n'est jamais écrasé en cas de re-tentative.

Pour ajouter / modifier des questions : éditer `0003_quiz_seed.sql` et
ré-exécuter dans le SQL Editor (l'INSERT est idempotent via
`ON CONFLICT (module_slug, position) DO NOTHING`).

## Déploiement sur Vercel

1. Créer un projet Vercel lié au repo GitHub
2. Renseigner les variables d'env (même liste que `.env.local`)
3. Ajouter le domaine `formation.gndconsulting.fr` (CNAME vers Vercel)
4. `git push origin main` → Vercel déploie automatiquement

## Sécurité

- Toutes les tables ont la **RLS activée**
- Les commerciaux voient **uniquement leurs propres données**
- Les admins ont des **politiques `admin_read` dédiées**
- Les `correct_ids` ne sont accessibles que via la route serveur
  `/api/quiz/submit` avec la **service role key**. Aucun accès client.
- Le middleware Next.js protège toutes les routes sauf `/`, `/login` et
  `/auth/callback`
- Pas de secrets dans le repo, les `.env*` sont dans `.gitignore`

## Hors scope v1

- Randomisation des questions / des options
- Pool de questions > N (tirer 10 parmi 20)
- Timer / chrono sur les quiz
- UI admin pour éditer les questions (la migration est la source de vérité)
- Export PDF du résultat / attestation
- Email automatique après validation
- Leaderboard / classement entre commerciaux
- Webhooks externes, N8N, CMS, vidéos, app mobile native
