-- Stage B: the deal room stops storing data its systems of record own.
-- Borrower keeps only its link to the entity master; Facility keeps only its
-- label, order and (once booked) its link to the security master. Since
-- 20261103120000 every read goes through src/lib/masters.

-- Refuse to drop anything that exists nowhere else.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Borrower" WHERE "masterRef" IS NULL) THEN
    RAISE EXCEPTION 'A borrower has no entity-master link; its details would be lost. Backfill masterRef first.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "Facility" f
    WHERE f."masterRef" IS NULL
      AND NOT EXISTS (
        SELECT 1
        FROM "TermSheet" t, jsonb_array_elements(t."terms" -> 'tranches') AS tr
        WHERE t."dealId" = f."dealId" AND tr ->> 'facilityId' = f."id"
      )
  ) THEN
    RAISE EXCEPTION 'An unbooked facility is on no term sheet; its terms would be lost. Write a term sheet first.';
  END IF;
END $$;

-- AlterTable
ALTER TABLE "Borrower" DROP COLUMN "ceo",
DROP COLUMN "description",
DROP COLUMN "founded",
DROP COLUMN "hqCity",
DROP COLUMN "name",
DROP COLUMN "sector",
DROP COLUMN "website",
ALTER COLUMN "masterRef" SET NOT NULL;

-- AlterTable
ALTER TABLE "Facility" DROP COLUMN "commitment",
DROP COLUMN "floorBps",
DROP COLUMN "funded",
DROP COLUMN "maturity",
DROP COLUMN "oidPct",
DROP COLUMN "pikBps",
DROP COLUMN "seniority",
DROP COLUMN "spreadBps",
DROP COLUMN "type",
DROP COLUMN "upfrontFeeBps";

