# GND Formation Commerciaux

Plateforme web interne de formation et de suivi pour les commerciaux freelances
de **GND Consulting**. Version **v1 simplifiée** — plateforme autonome, non
intégrée à l'écosystème Raykoo / N8N / agents existants.

## Fonctionnalités

- Connexion **Google OAuth** via Supabase
- Parcours de formation en **6 modules MDX** avec gating séquentiel frontend
- Quiz externes via **Tally** (lien ouvert dans un nouvel onglet, validation manuelle)
- **CRM personnel** de prospects par commercial (CRUD complet, filtres, notes)
- **Espace admin** en lecture seule : suivi formation + pipeline global
- Pages **Ressources** rendues depuis un fichier MDX versionné

## Stack

- **Next.js 15** (App Router, TypeScript)
- **Tailwind CSS**
- **Supabase** (PostgreSQL + Auth + RLS)
- **MDX** (`next-mdx-remote`, `gray-matter`)
- **Vercel** pour le déploiement

## Structure du projet

```
gnd-formation-commerciaux/
├── src/
│   ├── app/
│   │   ├── page.tsx                 redirige vers /dashboard ou /login
│   │   ├── layout.tsx
│   │   ├── login/                   page login + LoginButton client
│   │   ├── auth/callback/route.ts   exchange du code OAuth -> session
│   │   └── (app)/
│   │       ├── layout.tsx           layout protégé (Navbar + auth)
│   │       ├── dashboard/page.tsx
│   │       ├── formation/
│   │       │   ├── page.tsx         grille des 6 modules
│   │       │   └── [slug]/page.tsx  module individuel + QuizSection
│   │       ├── ressources/page.tsx
│   │       ├── prospects/page.tsx   CRUD via ProspectTable
│   │       └── admin/page.tsx       lecture seule, check rôle
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── ModuleCard.tsx
│   │   ├── QuizSection.tsx
│   │   ├── ProspectTable.tsx
│   │   └── ProspectModal.tsx
│   ├── content/                     MDX : 6 modules + ressources
│   ├── lib/
│   │   ├── supabase-client.ts
│   │   ├── supabase-server.ts
│   │   ├── supabase-middleware.ts
│   │   ├── modules-registry.ts
│   │   └── prospects.ts
│   └── middleware.ts                protection des routes
├── supabase/
│   └── migrations/
│       └── 0001_init.sql            schéma + triggers + RLS
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
- Ouvrir `SQL Editor` et coller l'intégralité de
  `supabase/migrations/0001_init.sql`, puis `Run`. Cela crée les 3 tables,
  les triggers et les politiques RLS.
- Configurer le provider **Google** dans
  `Authentication → Providers → Google` (récupérer un Client ID / Secret
  Google Cloud au préalable).
- URL de callback Supabase :
  `https://<projet>.supabase.co/auth/v1/callback`
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
- `SUPABASE_SERVICE_ROLE_KEY` (réservé aux actions admin éventuelles)
- `NEXT_PUBLIC_APP_URL` (ex. `http://localhost:3000` en dev)

### 4. Lancer le dev server

```bash
npm run dev
```

La première personne qui se connecte via Google est créée automatiquement en
base (trigger `handle_new_user`) avec le rôle `commercial`. Pour promouvoir
l'admin, exécuter dans le SQL Editor :

```sql
UPDATE public.users SET role = 'admin' WHERE email = 'roodnyp@gmail.com';
```

## Contenu des modules

Les 6 modules sont des fichiers MDX dans `src/content/`. Chaque fichier a
un frontmatter :

```mdx
---
slug: module-01-bienvenue-gnd
order: 1
title: Bienvenue chez GND
duration: 10
tally_url: https://tally.so/r/XXXX
---

# Bienvenue chez GND Consulting

Contenu markdown…
```

Pour **mettre à jour un module** : éditer le `.mdx` → commit → push →
redéploiement Vercel automatique.

Pour **changer l'ordre, le titre ou l'URL Tally** d'un module : éditer
le registre `src/lib/modules-registry.ts`.

## Quiz Tally

Pour chaque module, créer dans Tally (plan gratuit) un formulaire avec
5 questions et la page de remerciement affichant le score. Coller l'URL
publique dans le frontmatter `tally_url` du module correspondant.

Aucun webhook, aucune intégration technique. Les commerciaux valident le
module eux-mêmes après le quiz en cliquant `J'ai terminé mon quiz`. Les vrais
scores sont visibles depuis le dashboard Tally.

## Déploiement sur Vercel

1. Créer un projet Vercel lié au repo GitHub
2. Renseigner les variables d'env (même liste que `.env.local`)
3. Ajouter le domaine `formation.gndconsulting.fr` (CNAME vers Vercel)
4. `git push origin main` → Vercel déploie automatiquement

## Sécurité

- Toutes les tables ont la **RLS activée**
- Les commerciaux voient **uniquement leurs propres données** (RLS `owner_all`)
- Les admins ont des **politiques `admin_read` dédiées**
- Le middleware Next.js protège toutes les routes sauf `/`, `/login` et
  `/auth/callback`
- Pas de secrets dans le repo, les `.env*` sont dans `.gitignore`

## Hors scope v1

Voir §11 du cahier des charges. En résumé : pas de webhook Tally, pas de N8N,
pas de CMS, pas de vidéos, pas d'emails auto, pas d'import CSV, pas d'app
mobile native.
