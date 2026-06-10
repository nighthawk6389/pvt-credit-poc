# Lumen — Private Credit Deal Room

A modern deal room & workflow for **middle-market direct lending**: pipeline,
due-diligence data room, IC memos, structuring with simulated Bloomberg
analytics, covenant monitoring, valuation, cash-flow modeling, and lifecycle
events. Includes a simulated "privileged deal team" / information-barrier model.

> Proof-of-concept. Simulated data and Bloomberg analytics — not investment advice.

## Stack
Next.js (App Router) · TypeScript · Tailwind v4 · shadcn-style UI · Prisma + SQLite · Recharts

## Getting started
```bash
npm run setup     # install, generate client, push schema, seed
npm run dev       # http://localhost:3000
```

Other scripts: `npm run db:seed`, `npm run db:reset`, `npm run db:studio`.

## Deploying to Vercel
The repo ships a `vercel.json` — import the repo in Vercel and deploy; no extra
configuration needed. How it works:

1. **Build**: `prisma db push` + the seed run during the build, producing a
   fully-seeded SQLite file (`prisma/dev.db`).
2. **Bundle**: `next.config.ts` (`outputFileTracingIncludes`) ships that file
   inside every serverless function.
3. **Runtime**: `src/lib/db.ts` copies it to `/tmp` on cold start so the demo's
   write-back features (DDQ, votes, memos, events, marks) work.

> ⚠️ Writes are **ephemeral per serverless instance** — each cold start begins
> from the seeded snapshot. That's intentional for a self-resetting demo. For
> real persistence, switch the Prisma datasource to Postgres (e.g. Neon /
> Vercel Postgres) and set `DATABASE_URL`; no application code changes needed.

## Architecture
- `src/app/(app)/*` — dashboard, pipeline, deal workspace, portfolio, covenants, sponsors, compliance
- `src/lib/bloomberg/*` — simulated Bloomberg adapter (DLEN / PORT / DRSK / CRPR / structuring), swappable for BLPAPI
- `src/lib/copilot/*` — mocked, real-ready AI copilot (doc Q&A, memo drafting, covenant extraction)
- `src/lib/auth/*` — simulated role-based access & information barriers
- `src/server/{queries,actions}/*` — typed reads & server-action mutations
