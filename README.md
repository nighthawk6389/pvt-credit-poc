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

## Architecture
- `src/app/(app)/*` — dashboard, pipeline, deal workspace, portfolio, covenants, sponsors, compliance
- `src/lib/bloomberg/*` — simulated Bloomberg adapter (DLEN / PORT / DRSK / CRPR / structuring), swappable for BLPAPI
- `src/lib/copilot/*` — mocked, real-ready AI copilot (doc Q&A, memo drafting, covenant extraction)
- `src/lib/auth/*` — simulated role-based access & information barriers
- `src/server/{queries,actions}/*` — typed reads & server-action mutations
