# Lumen — Private Credit Deal Room

A modern deal room & workflow for **middle-market direct lending**: pipeline,
due-diligence data room, IC memos, structuring with simulated Bloomberg
analytics, covenant monitoring, valuation, cash-flow modeling, and lifecycle
events. Includes a simulated "privileged deal team" / information-barrier model.

> Proof-of-concept. Simulated data and Bloomberg analytics — not investment advice.

## Stack
Next.js (App Router) · TypeScript · Tailwind v4 · shadcn-style UI · Prisma + Postgres · Recharts

## Getting started
```bash
npm run setup     # install, generate client, apply migrations, seed
npm run dev       # http://localhost:3000
```

Other scripts: `npm run db:migrate`, `npm run db:seed`, `npm run db:reset`, `npm run db:studio`.

## Database

Postgres (Prisma). Local development expects a Postgres instance; point
`DATABASE_URL` at it (see `.env.example`):

```bash
DATABASE_URL="postgresql://user:pw@127.0.0.1:5432/lumen_dev?schema=public"
npm run db:deploy   # apply migrations
npm run db:seed     # load the demo portfolio
```

Schema changes go through migrations (`npm run db:migrate`), which are committed
under `prisma/migrations/`. `npm run db:reset` drops, re-migrates and re-seeds.

> Enums are still modeled as `String` (validated in TS) and money as `Float`.
> Moving them to native Postgres enums and `Decimal` is a deliberate follow-up —
> it requires a typed DTO boundary across the queries and pages, since Prisma
> returns `Decimal` objects whose arithmetic does not behave like `number`. The
> canonical target model in `docs/data-model/` shows the intended end state.

## Deploying to Vercel

The repo ships a `vercel.json`; the build runs
`prisma generate && prisma migrate deploy && next build`.

1. Provision Postgres (Neon, Vercel Postgres, RDS — anything Postgres).
2. Set `DATABASE_URL` in the Vercel project's environment variables.
3. Deploy. Migrations are applied at build time.
4. Seed once, manually, against that database: `npm run db:seed`.

The build deliberately does **not** seed — seeding is destructive (it truncates
and reloads), so it must never run automatically against a real database.
Writes are now durable and shared across all serverless instances.

## Architecture
- `src/app/(app)/*` — dashboard, pipeline, deal workspace, portfolio, covenants, sponsors, compliance
- `src/lib/bloomberg/*` — simulated Bloomberg adapter (DLEN / PORT / DRSK / CRPR / structuring), swappable for BLPAPI
- `src/lib/copilot/*` — mocked, real-ready AI copilot (doc Q&A, memo drafting, covenant extraction)
- `src/lib/auth/*` — simulated role-based access & information barriers
- `src/server/{queries,actions}/*` — typed reads & server-action mutations
