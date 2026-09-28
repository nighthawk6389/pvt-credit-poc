-- CreateTable
CREATE TABLE "Sponsor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "aum" DOUBLE PRECISION,
    "hqCity" TEXT,
    "relationshipOwner" TEXT,
    "vintage" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sponsor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Borrower" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "description" TEXT,
    "hqCity" TEXT,
    "website" TEXT,
    "ceo" TEXT,
    "founded" INTEGER,
    "sponsorId" TEXT,
    "riskRating" TEXT,
    "riskTrend" TEXT,
    "watchlist" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Borrower_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "codeName" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "sponsorId" TEXT,
    "stage" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "facilityType" TEXT NOT NULL,
    "dealSize" DOUBLE PRECISION NOT NULL,
    "useOfProceeds" TEXT,
    "targetClose" TIMESTAMP(3),
    "leadName" TEXT,
    "probability" INTEGER DEFAULT 50,
    "isPrivileged" BOOLEAN NOT NULL DEFAULT true,
    "thesis" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Facility" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "borrowerId" TEXT,
    "name" TEXT NOT NULL,
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
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Facility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealTeamMember" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "role" TEXT NOT NULL,
    "wallCrossed" BOOLEAN NOT NULL DEFAULT true,
    "crossedAt" TIMESTAMP(3),

    CONSTRAINT "DealTeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Folder" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Folder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "folderId" TEXT,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "fileType" TEXT NOT NULL DEFAULT 'pdf',
    "sizeKb" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "privilege" TEXT NOT NULL DEFAULT 'Deal Team',
    "bodyText" TEXT,
    "uploadedBy" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DDQItem" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Open',
    "answer" TEXT,
    "assignee" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DDQItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditMemo" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "sections" TEXT NOT NULL,
    "recommendation" TEXT,
    "proposedRating" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditMemo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Covenant" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'Quarterly',

    CONSTRAINT "Covenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CovenantTest" (
    "id" TEXT NOT NULL,
    "covenantId" TEXT NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "testDate" TIMESTAMP(3) NOT NULL,
    "actual" DOUBLE PRECISION,
    "headroomPct" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'Upcoming',
    "note" TEXT,

    CONSTRAINT "CovenantTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialStatement" (
    "id" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "periodLabel" TEXT NOT NULL,
    "periodType" TEXT NOT NULL,
    "revenue" DOUBLE PRECISION NOT NULL,
    "ebitda" DOUBLE PRECISION NOT NULL,
    "ebitdaMargin" DOUBLE PRECISION,
    "netLeverage" DOUBLE PRECISION NOT NULL,
    "interestCoverage" DOUBLE PRECISION NOT NULL,
    "liquidity" DOUBLE PRECISION NOT NULL,
    "capex" DOUBLE PRECISION,
    "fcf" DOUBLE PRECISION,
    "isActual" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "FinancialStatement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Valuation" (
    "id" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "asOf" TIMESTAMP(3) NOT NULL,
    "method" TEXT NOT NULL,
    "fairValuePct" DOUBLE PRECISION NOT NULL,
    "fairValueAmt" DOUBLE PRECISION NOT NULL,
    "costBasis" DOUBLE PRECISION NOT NULL,
    "discountRate" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "note" TEXT,

    CONSTRAINT "Valuation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashFlowSchedule" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "periodLabel" TEXT NOT NULL,
    "beginningBal" DOUBLE PRECISION NOT NULL,
    "drawdown" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paydown" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pikAccrued" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "interest" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "endingBal" DOUBLE PRECISION NOT NULL,
    "isProjected" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CashFlowSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LifecycleEvent" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "amount" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'Completed',
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LifecycleEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ICVote" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "voter" TEXT NOT NULL,
    "vote" TEXT NOT NULL,
    "comment" TEXT,
    "votedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ICVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Todo',
    "priority" TEXT NOT NULL DEFAULT 'Medium',
    "assignee" TEXT,
    "dueDate" TIMESTAMP(3),

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'MgmtCall',
    "title" TEXT,
    "author" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "dealId" TEXT,
    "actor" TEXT NOT NULL,
    "role" TEXT,
    "action" TEXT NOT NULL,
    "target" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CovenantDefinition" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "legacyCovenantId" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "formula" TEXT NOT NULL,
    "formulaAst" TEXT NOT NULL,
    "fieldRefs" TEXT NOT NULL,
    "ebitdaBasis" TEXT NOT NULL DEFAULT 'EBITDA_ADJ',
    "operator" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "thresholdSchedule" TEXT,
    "frequency" TEXT NOT NULL DEFAULT 'Quarterly',
    "springingCondition" TEXT,
    "basketConfig" TEXT,
    "source" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CovenantDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CovenantDefTest" (
    "id" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "testDate" TIMESTAMP(3) NOT NULL,
    "recomputedValue" DOUBLE PRECISION,
    "reportedValue" DOUBLE PRECISION,
    "reconDelta" DOUBLE PRECISION,
    "thresholdApplied" DOUBLE PRECISION,
    "formulaSnapshot" TEXT,
    "headroomPct" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'Upcoming',
    "note" TEXT,

    CONSTRAINT "CovenantDefTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundamentalFact" (
    "id" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "periodType" TEXT NOT NULL DEFAULT 'LTM',
    "fieldCode" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'BBG',
    "isOverride" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,

    CONSTRAINT "FundamentalFact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EbitdaAdjustment" (
    "id" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "label" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "category" TEXT NOT NULL,
    "capped" BOOLEAN NOT NULL DEFAULT false,
    "aggressiveFlag" BOOLEAN NOT NULL DEFAULT false,
    "uncapped" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT,

    CONSTRAINT "EbitdaAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportingObligation" (
    "id" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "dueDaysAfter" INTEGER NOT NULL,
    "fiscalYearEndMonth" INTEGER NOT NULL DEFAULT 12,

    CONSTRAINT "ReportingObligation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportingDelivery" (
    "id" TEXT NOT NULL,
    "obligationId" TEXT NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "deliveredDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "documentId" TEXT,

    CONSTRAINT "ReportingDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Deal_codeName_key" ON "Deal"("codeName");

-- CreateIndex
CREATE UNIQUE INDEX "CreditMemo_dealId_key" ON "CreditMemo"("dealId");

-- CreateIndex
CREATE UNIQUE INDEX "CovenantDefTest_definitionId_periodEnd_key" ON "CovenantDefTest"("definitionId", "periodEnd");

-- CreateIndex
CREATE INDEX "FundamentalFact_borrowerId_periodEnd_fieldCode_idx" ON "FundamentalFact"("borrowerId", "periodEnd", "fieldCode");

-- CreateIndex
CREATE UNIQUE INDEX "ReportingObligation_definitionId_key" ON "ReportingObligation"("definitionId");

-- AddForeignKey
ALTER TABLE "Borrower" ADD CONSTRAINT "Borrower_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "Sponsor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "Borrower"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "Sponsor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facility" ADD CONSTRAINT "Facility_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facility" ADD CONSTRAINT "Facility_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "Borrower"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealTeamMember" ADD CONSTRAINT "DealTeamMember_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DDQItem" ADD CONSTRAINT "DDQItem_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditMemo" ADD CONSTRAINT "CreditMemo_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Covenant" ADD CONSTRAINT "Covenant_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CovenantTest" ADD CONSTRAINT "CovenantTest_covenantId_fkey" FOREIGN KEY ("covenantId") REFERENCES "Covenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialStatement" ADD CONSTRAINT "FinancialStatement_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "Borrower"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Valuation" ADD CONSTRAINT "Valuation_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "Borrower"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashFlowSchedule" ADD CONSTRAINT "CashFlowSchedule_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LifecycleEvent" ADD CONSTRAINT "LifecycleEvent_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ICVote" ADD CONSTRAINT "ICVote_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CovenantDefinition" ADD CONSTRAINT "CovenantDefinition_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CovenantDefTest" ADD CONSTRAINT "CovenantDefTest_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "CovenantDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundamentalFact" ADD CONSTRAINT "FundamentalFact_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "Borrower"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EbitdaAdjustment" ADD CONSTRAINT "EbitdaAdjustment_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "Borrower"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportingObligation" ADD CONSTRAINT "ReportingObligation_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "CovenantDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportingDelivery" ADD CONSTRAINT "ReportingDelivery_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "ReportingObligation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
