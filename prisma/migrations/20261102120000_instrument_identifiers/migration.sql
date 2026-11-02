-- Instrument identifiers: CUSIP, ISIN, LoanX, FIGI, LEI, Bloomberg company ID,
-- agent references. Effective-dated rows rather than nullable columns, because
-- identifiers are optional, plural and change over a tranche's life.
--
-- The table and its foreign keys are as Prisma generates them. The constraints
-- after that are hand-written: Prisma's schema language cannot express a CHECK
-- or a partial unique index, and these are what make the table trustworthy.

-- CreateTable
CREATE TABLE "InstrumentIdentifier" (
    "id" TEXT NOT NULL,
    "borrowerId" TEXT,
    "facilityId" TEXT,
    "scheme" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "namespace" TEXT NOT NULL DEFAULT '',
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTo" TIMESTAMP(3),
    "source" TEXT NOT NULL,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstrumentIdentifier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InstrumentIdentifier_scheme_value_idx" ON "InstrumentIdentifier"("scheme", "value");

-- CreateIndex
CREATE INDEX "InstrumentIdentifier_borrowerId_idx" ON "InstrumentIdentifier"("borrowerId");

-- CreateIndex
CREATE INDEX "InstrumentIdentifier_facilityId_idx" ON "InstrumentIdentifier"("facilityId");

-- AddForeignKey
ALTER TABLE "InstrumentIdentifier" ADD CONSTRAINT "InstrumentIdentifier_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "Borrower"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstrumentIdentifier" ADD CONSTRAINT "InstrumentIdentifier_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstrumentIdentifier" ADD CONSTRAINT "InstrumentIdentifier_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ── Rules Prisma cannot express ─────────────────────────────────────────

-- An identifier names exactly one thing: a borrower or a facility, never both
-- and never neither.
ALTER TABLE "InstrumentIdentifier" ADD CONSTRAINT "InstrumentIdentifier_one_target_check"
  CHECK (num_nonnulls("borrowerId", "facilityId") = 1);

-- A retirement date, when set, comes after the start date.
ALTER TABLE "InstrumentIdentifier" ADD CONSTRAINT "InstrumentIdentifier_valid_range_check"
  CHECK ("validTo" IS NULL OR "validTo" > "validFrom");

-- Values are stored normalised, so the uniqueness rules below cannot be
-- side-stepped by case or surrounding whitespace. (src/lib/identifiers does
-- the full normalisation; this is the backstop for writes that bypass it.)
ALTER TABLE "InstrumentIdentifier" ADD CONSTRAINT "InstrumentIdentifier_normalised_check"
  CHECK (
    "value" <> ''
    AND "value" = upper(btrim("value"))
    AND "namespace" = upper(btrim("namespace"))
  );

-- A live identifier names one thing only: the same CUSIP cannot point at two
-- facilities. Retired rows (validTo set) are history and are exempt, so an
-- amend-and-extend can retire a LoanX ID without deleting it.
CREATE UNIQUE INDEX "InstrumentIdentifier_live_identity_key"
  ON "InstrumentIdentifier"("scheme", "namespace", "value")
  WHERE "validTo" IS NULL;

-- A borrower or facility holds at most one live value per scheme: one live
-- CUSIP, one live LEI. Namespaced schemes allow one per issuer.
CREATE UNIQUE INDEX "InstrumentIdentifier_live_borrower_scheme_key"
  ON "InstrumentIdentifier"("borrowerId", "scheme", "namespace")
  WHERE "validTo" IS NULL AND "borrowerId" IS NOT NULL;

CREATE UNIQUE INDEX "InstrumentIdentifier_live_facility_scheme_key"
  ON "InstrumentIdentifier"("facilityId", "scheme", "namespace")
  WHERE "validTo" IS NULL AND "facilityId" IS NOT NULL;

-- Not enforced here: overlapping *closed* date ranges for the same value. That
-- needs an exclusion constraint over a range type (btree_gist), which not every
-- hosted Postgres allows; the write path retires the old row before it opens
-- the new one instead.
