-- Stage A of moving the deal room onto the overlay (docs/data-model/README.md):
-- borrowers and booked facilities become links to an entity master and a
-- security master, and pre-booking terms move to versioned term sheets.
--
-- Additive only. The descriptive Borrower columns and the Facility term
-- columns stay until every read goes through src/lib/masters; a later
-- migration drops them. Existing rows are backfilled below so a database
-- migrated in place reads exactly what it read before.

-- AlterTable
ALTER TABLE "Borrower" ADD COLUMN     "masterRef" TEXT;

-- AlterTable
ALTER TABLE "Facility" ADD COLUMN     "masterRef" TEXT;

-- CreateTable
CREATE TABLE "TermSheet" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "versionNo" INTEGER NOT NULL,
    "terms" JSONB NOT NULL,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TermSheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MockEntityRecord" (
    "ref" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "description" TEXT,
    "hqCity" TEXT,
    "website" TEXT,
    "ceo" TEXT,
    "founded" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MockEntityRecord_pkey" PRIMARY KEY ("ref")
);

-- CreateTable
CREATE TABLE "MockInstrument" (
    "ref" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "type" TEXT NOT NULL,
    "seniority" TEXT NOT NULL,
    "commitment" DOUBLE PRECISION NOT NULL,
    "funded" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "spreadBps" INTEGER NOT NULL,
    "floorBps" INTEGER NOT NULL DEFAULT 100,
    "oidPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pikBps" INTEGER NOT NULL DEFAULT 0,
    "upfrontFeeBps" INTEGER NOT NULL DEFAULT 0,
    "maturity" TIMESTAMP(3),
    "bookedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MockInstrument_pkey" PRIMARY KEY ("ref")
);

-- CreateIndex
CREATE UNIQUE INDEX "TermSheet_dealId_versionNo_key" ON "TermSheet"("dealId", "versionNo");

-- CreateIndex
CREATE UNIQUE INDEX "Borrower_masterRef_key" ON "Borrower"("masterRef");

-- CreateIndex
CREATE INDEX "Facility_masterRef_idx" ON "Facility"("masterRef");

-- AddForeignKey
ALTER TABLE "TermSheet" ADD CONSTRAINT "TermSheet_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TermSheet" ADD CONSTRAINT "TermSheet_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ── Backfill ────────────────────────────────────────────────────────────
-- Each borrower's details move into the entity master's stand-in table,
-- and the borrower keeps only the link.
INSERT INTO "MockEntityRecord" ("ref", "name", "sector", "description", "hqCity", "website", "ceo", "founded")
SELECT 'EM-' || upper(substr(md5(b."id"), 1, 8)), b."name", b."sector", b."description", b."hqCity", b."website", b."ceo", b."founded"
FROM "Borrower" b
WHERE b."masterRef" IS NULL;

UPDATE "Borrower" SET "masterRef" = 'EM-' || upper(substr(md5("id"), 1, 8)) WHERE "masterRef" IS NULL;

-- Facilities of closed deals are booked: their terms move into the security
-- master's stand-in table, and the facility keeps only the link.
INSERT INTO "MockInstrument" ("ref", "name", "type", "seniority", "commitment", "funded", "spreadBps",
                              "floorBps", "oidPct", "pikBps", "upfrontFeeBps", "maturity")
SELECT 'SM-LN-' || upper(substr(md5(f."id"), 1, 8)), f."name", f."type", f."seniority", f."commitment", f."funded",
       f."spreadBps", f."floorBps", f."oidPct", f."pikBps", f."upfrontFeeBps", f."maturity"
FROM "Facility" f
JOIN "Deal" d ON d."id" = f."dealId"
WHERE d."stage" = 'Closed' AND f."masterRef" IS NULL;

UPDATE "Facility" f SET "masterRef" = 'SM-LN-' || upper(substr(md5(f."id"), 1, 8))
FROM "Deal" d
WHERE d."id" = f."dealId" AND d."stage" = 'Closed' AND f."masterRef" IS NULL;

-- Every deal gets version 1 of its term sheet from the terms it holds today:
-- the source of terms for tranches not yet booked, and the record of what
-- was approved for those that are.
INSERT INTO "TermSheet" ("id", "dealId", "versionNo", "terms")
SELECT gen_random_uuid()::text, f."dealId", 1,
       jsonb_build_object('tranches', jsonb_agg(jsonb_build_object(
         'facilityId',    f."id",
         'type',          f."type",
         'seniority',     f."seniority",
         'commitment',    f."commitment",
         'spreadBps',     f."spreadBps",
         'floorBps',      f."floorBps",
         'oidPct',        f."oidPct",
         'pikBps',        f."pikBps",
         'upfrontFeeBps', f."upfrontFeeBps",
         'maturity',      to_char(f."maturity", 'YYYY-MM-DD')
       ) ORDER BY f."order"))
FROM "Facility" f
WHERE NOT EXISTS (SELECT 1 FROM "TermSheet" t WHERE t."dealId" = f."dealId")
GROUP BY f."dealId";
