import { PrismaClient } from "@prisma/client";

// Single PrismaClient across hot reloads in dev (App Router gotcha: each
// reload would otherwise open a new pool and exhaust Postgres connections).
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
