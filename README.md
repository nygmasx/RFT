# Ronin Fight Team

Application mobile et web du club Ronin Fight Team. Elle centralise les membres, annonces, calendriers, compétitions, salons de discussion, grades, palmarès et covoiturages.

Le produit est actuellement en phase bêta. Le backend de production est hébergé sur Fly.io et utilise Neon PostgreSQL.

## Architecture

- Application : Expo SDK 56, React Native 0.85, Expo Router et TypeScript.
- API : Hono sous Node.js.
- Authentification : Better Auth avec jetons Bearer.
- Base de données : Neon PostgreSQL avec Drizzle ORM.
- Notifications : Expo Push API.
- Déploiements : EAS pour l’application, Fly.io pour l’API.

La référence à utiliser pour toute évolution Expo est la [documentation exacte de SDK 56](https://docs.expo.dev/versions/v56.0.0/).

## Installation locale

Prérequis : Node.js 20.19 ou supérieur et npm.

```bash
npm install
npm --prefix server install
```

Créer un fichier `.env` à la racine :

```dotenv
EXPO_PUBLIC_API_URL=http://localhost:3001
```

Copier `server/.env.example` vers `server/.env`, puis renseigner une base Neon et un secret Better Auth.

Lancer l’API et l’application dans deux terminaux :

```bash
npm --prefix server run dev
npm start
```

## Contrôles

```bash
# TypeScript, ESLint, backend TypeScript et tests backend
npm run check

# Vérification des versions compatibles Expo 56
npx expo install --check

# Export web de production
npx expo export --platform web
```

Les tests backend utilisent le runner natif de Node via `tsx --test`.

## Migration fonctionnelle 2026-08-12

Les réactions et réponses aux annonces, les états lu/non-lu, les préférences et les contraintes d’idempotence nécessitent la migration suivante :

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f server/migrations/20260812_functional_completeness.sql
```

Avant toute exécution en production : effectuer une sauvegarde Neon, vérifier la cible de `DATABASE_URL`, puis relire le plan de migration. La migration supprime uniquement les doublons de réservations et de jetons push avant de créer leurs index uniques.

## Structure principale

```text
src/app/                 écrans et routes Expo Router
src/hooks/               chargement des données et logique applicative
src/context/             authentification et thème
src/lib/                 client API et contrats TypeScript
server/src/routes/       routes HTTP
server/src/db/           schéma Drizzle et connexion Neon
server/src/middleware/   contrôles de session et de rôle
server/test/             tests backend
```

## Éléments restant avant une sortie publique

- Ajouter des tests d’intégration API avec une base isolée.
- Choisir et configurer un fournisseur d’envoi d’emails avant d’activer la vérification d’adresse et la récupération de mot de passe.
- Vérifier les builds EAS signés iOS/Android avec les comptes de distribution du club.
- Traiter les alertes `npm audit` restantes uniquement avec des mises à jour compatibles Expo 56 ; ne pas utiliser `npm audit fix --force`.

Ne jamais exécuter `db:push` contre la production sans revue préalable du schéma et sauvegarde vérifiée.
