import fs from "node:fs";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

// On Vercel the deployed filesystem is read-only; only /tmp is writable.
// We seed prisma/dev.db at build time, bundle it with the functions
// (next.config.ts → outputFileTracingIncludes), and copy it to /tmp on cold
// start so the demo's write-back features work. Writes are ephemeral per
// serverless instance — swap to Postgres for real persistence.
function resolveDatasourceUrl(): string | undefined {
  if (!process.env.VERCEL) return undefined; // local: use .env DATABASE_URL
  const tmpDb = "/tmp/pcdr.db";
  try {
    if (!fs.existsSync(tmpDb)) {
      const bundled = path.join(process.cwd(), "prisma", "dev.db");
      fs.copyFileSync(bundled, tmpDb);
    }
  } catch (err) {
    console.error("Failed to bootstrap SQLite into /tmp:", err);
  }
  return `file:${tmpDb}`;
}

// Single PrismaClient across hot reloads in dev (App Router gotcha).
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function makeClient() {
  const datasourceUrl = resolveDatasourceUrl();
  return new PrismaClient({
    ...(datasourceUrl ? { datasourceUrl } : {}),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const db = globalForPrisma.prisma ?? makeClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
