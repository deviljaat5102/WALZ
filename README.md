# WALZ

WALZ is a monorepo for a shared platform with a public website, an admin dashboard, and an Android app.

## Apps

- `apps/web` — Next.js website and admin dashboard (`/admin`)
- `apps/mobile` — Expo / React Native Android app
- `supabase` — database migrations and local Supabase configuration

## Stack

- TypeScript
- Next.js
- Expo Router
- Supabase (Postgres, Auth, Storage)
- Vercel (web deployment)
- EAS Build (Android builds)

## Getting started

Requirements: Node.js 22+, pnpm 10+, and Expo / Supabase accounts.

```bash
corepack enable
pnpm install
pnpm --filter @walz/web dev
```

For the mobile app:

```bash
pnpm --filter @walz/mobile start
```

## Environment variables

Create `apps/web/.env.local` and `apps/mobile/.env` from their respective `.env.example` files.

Use only Supabase publishable/anon keys in client apps. Never commit a service-role key.

## Project status

Initial monorepo scaffold. Product requirements, screens, database schema, and production configuration will be added incrementally.
