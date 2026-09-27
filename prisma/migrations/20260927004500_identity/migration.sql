-- Identity & access: introduce Organization / User / OrgMembership and replace
-- the free-text actor columns with real foreign keys.
--
-- This migration BACKFILLS rather than truncating: users are derived from the
-- names already stored in the actor columns, FKs are matched by name, and only
-- then are the old string columns dropped. External parties (sponsors, counsel,
-- advisors) are not users, so their names are preserved in *External columns.

-- ─── 1. Identity tables ──────────────────────────────────────────────────
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "initials" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrgMembership" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrgMembership_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "OrgMembership_userId_idx" ON "OrgMembership"("userId");
CREATE UNIQUE INDEX "OrgMembership_orgId_userId_key" ON "OrgMembership"("orgId", "userId");

ALTER TABLE "OrgMembership" ADD CONSTRAINT "OrgMembership_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrgMembership" ADD CONSTRAINT "OrgMembership_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── 2. The managing organization ────────────────────────────────────────
INSERT INTO "Organization" ("id", "name", "slug")
VALUES ('org_lumen', 'Lumen Credit Partners', 'lumen')
ON CONFLICT ("slug") DO NOTHING;

-- ─── 3. Derive internal users from the existing actor columns ────────────
-- Internal staff are the names that appear in columns only our own people
-- occupy. Document uploaders and diligence assignees may be third parties, so
-- they are deliberately excluded from this set.
INSERT INTO "User" ("id", "email", "name", "title", "initials")
WITH staff AS (
  SELECT DISTINCT n AS name FROM (
    SELECT "name"              AS n FROM "DealTeamMember"
    UNION SELECT "leadName"    AS n FROM "Deal"
    UNION SELECT "voter"       AS n FROM "ICVote"
    UNION SELECT "actor"       AS n FROM "ActivityLog"
    UNION SELECT "author"      AS n FROM "Note"
    UNION SELECT "relationshipOwner" AS n FROM "Sponsor"
  ) src
  WHERE n IS NOT NULL AND btrim(n) <> ''
)
SELECT
  'usr_' || md5(s.name),
  lower(regexp_replace(btrim(s.name), '[^a-zA-Z0-9]+', '.', 'g')) || '@lumencredit.example',
  s.name,
  (SELECT d."title" FROM "DealTeamMember" d
     WHERE d."name" = s.name AND d."title" IS NOT NULL LIMIT 1),
  upper(left(split_part(btrim(s.name), ' ', 1), 1) ||
        coalesce(nullif(left(split_part(btrim(s.name), ' ', 2), 1), ''), ''))
FROM staff s
ON CONFLICT ("email") DO NOTHING;

-- ─── 4. Org membership, role inferred from the deal-team role held ───────
INSERT INTO "OrgMembership" ("id", "orgId", "userId", "role")
SELECT
  'mem_' || md5(u."name"),
  'org_lumen',
  u."id",
  COALESCE(
    (SELECT d."role" FROM "DealTeamMember" d WHERE d."name" = u."name" LIMIT 1),
    CASE WHEN EXISTS (SELECT 1 FROM "ICVote" v WHERE v."voter" = u."name")
         THEN 'IC Member' ELSE 'Analyst' END
  )
FROM "User" u
ON CONFLICT ("orgId", "userId") DO NOTHING;

-- ─── 5. Add FK columns (nullable first so they can be backfilled) ────────
ALTER TABLE "DealTeamMember" ADD COLUMN "userId" TEXT;
ALTER TABLE "Deal"           ADD COLUMN "leadId" TEXT;
ALTER TABLE "Sponsor"        ADD COLUMN "relationshipOwnerId" TEXT;
ALTER TABLE "ICVote"         ADD COLUMN "voterId" TEXT;
ALTER TABLE "Note"           ADD COLUMN "authorId" TEXT;
ALTER TABLE "ActivityLog"    ADD COLUMN "actorId" TEXT;
ALTER TABLE "LifecycleEvent" ADD COLUMN "createdById" TEXT;
ALTER TABLE "Document"       ADD COLUMN "uploadedById" TEXT, ADD COLUMN "uploadedByExternal" TEXT;
ALTER TABLE "DDQItem"        ADD COLUMN "assigneeId" TEXT,   ADD COLUMN "assigneeExternal" TEXT;
ALTER TABLE "Task"           ADD COLUMN "assigneeId" TEXT,   ADD COLUMN "assigneeExternal" TEXT;

-- ─── 6. Backfill by name match ───────────────────────────────────────────
UPDATE "DealTeamMember" t SET "userId"      = u."id" FROM "User" u WHERE u."name" = t."name";
UPDATE "Deal"           d SET "leadId"      = u."id" FROM "User" u WHERE u."name" = d."leadName";
UPDATE "Sponsor"        s SET "relationshipOwnerId" = u."id" FROM "User" u WHERE u."name" = s."relationshipOwner";
UPDATE "ICVote"         v SET "voterId"     = u."id" FROM "User" u WHERE u."name" = v."voter";
UPDATE "Note"           n SET "authorId"    = u."id" FROM "User" u WHERE u."name" = n."author";
UPDATE "ActivityLog"    a SET "actorId"     = u."id" FROM "User" u WHERE u."name" = a."actor";
UPDATE "LifecycleEvent" e SET "createdById" = u."id" FROM "User" u WHERE u."name" = e."createdBy";
UPDATE "Document"       c SET "uploadedById" = u."id" FROM "User" u WHERE u."name" = c."uploadedBy";
UPDATE "DDQItem"        q SET "assigneeId"  = u."id" FROM "User" u WHERE u."name" = q."assignee";
UPDATE "Task"           k SET "assigneeId"  = u."id" FROM "User" u WHERE u."name" = k."assignee";

-- Anything left unmatched was an external party — keep the name verbatim.
UPDATE "Document" SET "uploadedByExternal" = "uploadedBy"
  WHERE "uploadedById" IS NULL AND "uploadedBy" IS NOT NULL;
UPDATE "DDQItem"  SET "assigneeExternal"   = "assignee"
  WHERE "assigneeId"   IS NULL AND "assignee"   IS NOT NULL;
UPDATE "Task"     SET "assigneeExternal"   = "assignee"
  WHERE "assigneeId"   IS NULL AND "assignee"   IS NOT NULL;

-- ─── 7. Drop rows that cannot satisfy the new NOT NULL constraints ───────
-- (none expected: these columns were sourced from the staff set above)
DELETE FROM "DealTeamMember" WHERE "userId"  IS NULL;
DELETE FROM "ICVote"         WHERE "voterId" IS NULL;
DELETE FROM "Note"           WHERE "authorId" IS NULL;

ALTER TABLE "DealTeamMember" ALTER COLUMN "userId"   SET NOT NULL;
ALTER TABLE "ICVote"         ALTER COLUMN "voterId"  SET NOT NULL;
ALTER TABLE "Note"           ALTER COLUMN "authorId" SET NOT NULL;

-- ─── 8. Retire the string columns ────────────────────────────────────────
ALTER TABLE "DealTeamMember" DROP COLUMN "name", DROP COLUMN "title";
ALTER TABLE "Deal"           DROP COLUMN "leadName";
ALTER TABLE "Sponsor"        DROP COLUMN "relationshipOwner";
ALTER TABLE "ICVote"         DROP COLUMN "voter";
ALTER TABLE "Note"           DROP COLUMN "author";
ALTER TABLE "ActivityLog"    DROP COLUMN "actor";
ALTER TABLE "LifecycleEvent" DROP COLUMN "createdBy";
ALTER TABLE "Document"       DROP COLUMN "uploadedBy";
ALTER TABLE "DDQItem"        DROP COLUMN "assignee";
ALTER TABLE "Task"           DROP COLUMN "assignee";

-- ─── 9. Constraints & indexes ────────────────────────────────────────────
CREATE INDEX "DealTeamMember_userId_idx" ON "DealTeamMember"("userId");
CREATE UNIQUE INDEX "DealTeamMember_dealId_userId_key" ON "DealTeamMember"("dealId", "userId");
CREATE UNIQUE INDEX "ICVote_dealId_voterId_key" ON "ICVote"("dealId", "voterId");

ALTER TABLE "Sponsor" ADD CONSTRAINT "Sponsor_relationshipOwnerId_fkey"
  FOREIGN KEY ("relationshipOwnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DealTeamMember" ADD CONSTRAINT "DealTeamMember_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedById_fkey"
  FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DDQItem" ADD CONSTRAINT "DDQItem_assigneeId_fkey"
  FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LifecycleEvent" ADD CONSTRAINT "LifecycleEvent_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ICVote" ADD CONSTRAINT "ICVote_voterId_fkey"
  FOREIGN KEY ("voterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeId_fkey"
  FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Note" ADD CONSTRAINT "Note_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
