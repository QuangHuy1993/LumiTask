-- CreateEnum
CREATE TYPE "FinanceCategoryKind" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "FinanceEntryKind" AS ENUM ('INCOME', 'EXPENSE', 'TRANSFER_OUT', 'TRANSFER_IN');

-- CreateEnum
CREATE TYPE "FinanceEntryLifecycle" AS ENUM ('PLANNED', 'POSTED', 'VOIDED');

-- CreateEnum
CREATE TYPE "FinanceRecurringFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "FinanceImportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "FinanceLoanStatus" AS ENUM ('ACTIVE', 'CLOSED');

-- AlterEnum
ALTER TYPE "AttachmentOwnerType" ADD VALUE 'FINANCE_ENTRY';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'FINANCE_WALLET_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'FINANCE_WALLET_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'FINANCE_WALLET_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'FINANCE_CATEGORY_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'FINANCE_CATEGORY_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'FINANCE_CATEGORY_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'FINANCE_ENTRY_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'FINANCE_ENTRY_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'FINANCE_ENTRY_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'FINANCE_TAG_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'FINANCE_TAG_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'FINANCE_TAG_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'FINANCE_BUDGET_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'FINANCE_BUDGET_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'FINANCE_BUDGET_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'FINANCE_GOAL_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'FINANCE_GOAL_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'FINANCE_GOAL_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'FINANCE_RECURRING_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'FINANCE_RECURRING_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'FINANCE_RECURRING_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'FINANCE_IMPORT_STARTED';
ALTER TYPE "AuditAction" ADD VALUE 'FINANCE_IMPORT_COMPLETED';
ALTER TYPE "AuditAction" ADD VALUE 'FINANCE_IMPORT_FAILED';
ALTER TYPE "AuditAction" ADD VALUE 'FINANCE_LOAN_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'FINANCE_LOAN_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'FINANCE_LOAN_DELETED';

-- AlterTable
ALTER TABLE "Attachment" ADD COLUMN     "financeEntryId" INTEGER;

-- CreateTable
CREATE TABLE "FinanceWallet" (
    "id" SERIAL NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FinanceWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceCategory" (
    "id" SERIAL NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "kind" "FinanceCategoryKind" NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "color" TEXT,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FinanceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceTag" (
    "id" SERIAL NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FinanceTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceEntry" (
    "id" SERIAL NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "walletId" INTEGER NOT NULL,
    "categoryId" INTEGER,
    "entryKind" "FinanceEntryKind" NOT NULL,
    "lifecycleStatus" "FinanceEntryLifecycle" NOT NULL DEFAULT 'POSTED',
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "amountBase" DECIMAL(14,2),
    "fxRate" DECIMAL(18,8),
    "fxAsOf" TIMESTAMP(3),
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "splitGroupId" UUID,
    "transferPairId" UUID,
    "parentEntryId" INTEGER,
    "recurringRuleId" INTEGER,
    "importBatchId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FinanceEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceEntryTag" (
    "entryId" INTEGER NOT NULL,
    "tagId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinanceEntryTag_pkey" PRIMARY KEY ("entryId","tagId")
);

-- CreateTable
CREATE TABLE "FinanceBudgetPeriod" (
    "id" SERIAL NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "periodKey" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "overallLimitAmount" DECIMAL(14,2),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceBudgetPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceBudgetCategoryLine" (
    "id" SERIAL NOT NULL,
    "budgetPeriodId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "limitAmount" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "FinanceBudgetCategoryLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceSavingsGoal" (
    "id" SERIAL NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "targetAmount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "targetDate" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FinanceSavingsGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceGoalContribution" (
    "id" SERIAL NOT NULL,
    "goalId" INTEGER NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "contributedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entryId" INTEGER,
    "note" TEXT,

    CONSTRAINT "FinanceGoalContribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceRecurringRule" (
    "id" SERIAL NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "walletId" INTEGER NOT NULL,
    "categoryId" INTEGER,
    "entryKind" "FinanceEntryKind" NOT NULL,
    "frequency" "FinanceRecurringFrequency" NOT NULL,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "nextRunAt" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "note" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastGeneratedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FinanceRecurringRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceImportBatch" (
    "id" SERIAL NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "status" "FinanceImportStatus" NOT NULL DEFAULT 'PENDING',
    "rowCount" INTEGER,
    "errorSummary" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceLoan" (
    "id" SERIAL NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "principalAmount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "startDate" TIMESTAMP(3) NOT NULL,
    "interestRateApr" DECIMAL(8,4),
    "status" "FinanceLoanStatus" NOT NULL DEFAULT 'ACTIVE',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FinanceLoan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceLoanPayment" (
    "id" SERIAL NOT NULL,
    "loanId" INTEGER NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "entryId" INTEGER,
    "note" TEXT,

    CONSTRAINT "FinanceLoanPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinanceWallet_ownerId_deletedAt_idx" ON "FinanceWallet"("ownerId", "deletedAt");

-- CreateIndex
CREATE INDEX "FinanceCategory_ownerId_deletedAt_kind_idx" ON "FinanceCategory"("ownerId", "deletedAt", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceCategory_ownerId_slug_key" ON "FinanceCategory"("ownerId", "slug");

-- CreateIndex
CREATE INDEX "FinanceTag_ownerId_deletedAt_idx" ON "FinanceTag"("ownerId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceTag_ownerId_name_key" ON "FinanceTag"("ownerId", "name");

-- CreateIndex
CREATE INDEX "FinanceEntry_ownerId_deletedAt_occurredAt_idx" ON "FinanceEntry"("ownerId", "deletedAt", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "FinanceEntry_ownerId_categoryId_occurredAt_idx" ON "FinanceEntry"("ownerId", "categoryId", "occurredAt");

-- CreateIndex
CREATE INDEX "FinanceEntry_splitGroupId_idx" ON "FinanceEntry"("splitGroupId");

-- CreateIndex
CREATE INDEX "FinanceEntry_transferPairId_idx" ON "FinanceEntry"("transferPairId");

-- CreateIndex
CREATE INDEX "FinanceEntry_ownerId_entryKind_lifecycleStatus_occurredAt_idx" ON "FinanceEntry"("ownerId", "entryKind", "lifecycleStatus", "occurredAt");

-- CreateIndex
CREATE INDEX "FinanceEntryTag_tagId_idx" ON "FinanceEntryTag"("tagId");

-- CreateIndex
CREATE INDEX "FinanceBudgetPeriod_ownerId_idx" ON "FinanceBudgetPeriod"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceBudgetPeriod_ownerId_periodKey_key" ON "FinanceBudgetPeriod"("ownerId", "periodKey");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceBudgetCategoryLine_budgetPeriodId_categoryId_key" ON "FinanceBudgetCategoryLine"("budgetPeriodId", "categoryId");

-- CreateIndex
CREATE INDEX "FinanceSavingsGoal_ownerId_deletedAt_idx" ON "FinanceSavingsGoal"("ownerId", "deletedAt");

-- CreateIndex
CREATE INDEX "FinanceGoalContribution_goalId_contributedAt_idx" ON "FinanceGoalContribution"("goalId", "contributedAt");

-- CreateIndex
CREATE INDEX "FinanceRecurringRule_ownerId_deletedAt_isActive_nextRunAt_idx" ON "FinanceRecurringRule"("ownerId", "deletedAt", "isActive", "nextRunAt");

-- CreateIndex
CREATE INDEX "FinanceImportBatch_ownerId_createdAt_idx" ON "FinanceImportBatch"("ownerId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "FinanceLoan_ownerId_deletedAt_idx" ON "FinanceLoan"("ownerId", "deletedAt");

-- CreateIndex
CREATE INDEX "FinanceLoanPayment_loanId_paidAt_idx" ON "FinanceLoanPayment"("loanId", "paidAt");

-- CreateIndex
CREATE INDEX "Attachment_financeEntryId_idx" ON "Attachment"("financeEntryId");

-- AddForeignKey
ALTER TABLE "FinanceWallet" ADD CONSTRAINT "FinanceWallet_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceCategory" ADD CONSTRAINT "FinanceCategory_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceTag" ADD CONSTRAINT "FinanceTag_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceEntry" ADD CONSTRAINT "FinanceEntry_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceEntry" ADD CONSTRAINT "FinanceEntry_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "FinanceWallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceEntry" ADD CONSTRAINT "FinanceEntry_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FinanceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceEntry" ADD CONSTRAINT "FinanceEntry_parentEntryId_fkey" FOREIGN KEY ("parentEntryId") REFERENCES "FinanceEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceEntry" ADD CONSTRAINT "FinanceEntry_recurringRuleId_fkey" FOREIGN KEY ("recurringRuleId") REFERENCES "FinanceRecurringRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceEntry" ADD CONSTRAINT "FinanceEntry_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "FinanceImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceEntryTag" ADD CONSTRAINT "FinanceEntryTag_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "FinanceEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceEntryTag" ADD CONSTRAINT "FinanceEntryTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "FinanceTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceBudgetPeriod" ADD CONSTRAINT "FinanceBudgetPeriod_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceBudgetCategoryLine" ADD CONSTRAINT "FinanceBudgetCategoryLine_budgetPeriodId_fkey" FOREIGN KEY ("budgetPeriodId") REFERENCES "FinanceBudgetPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceBudgetCategoryLine" ADD CONSTRAINT "FinanceBudgetCategoryLine_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FinanceCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceSavingsGoal" ADD CONSTRAINT "FinanceSavingsGoal_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceGoalContribution" ADD CONSTRAINT "FinanceGoalContribution_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "FinanceSavingsGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceGoalContribution" ADD CONSTRAINT "FinanceGoalContribution_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "FinanceEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceRecurringRule" ADD CONSTRAINT "FinanceRecurringRule_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceRecurringRule" ADD CONSTRAINT "FinanceRecurringRule_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "FinanceWallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceRecurringRule" ADD CONSTRAINT "FinanceRecurringRule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FinanceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceImportBatch" ADD CONSTRAINT "FinanceImportBatch_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceLoan" ADD CONSTRAINT "FinanceLoan_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceLoanPayment" ADD CONSTRAINT "FinanceLoanPayment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "FinanceLoan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceLoanPayment" ADD CONSTRAINT "FinanceLoanPayment_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "FinanceEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_financeEntryId_fkey" FOREIGN KEY ("financeEntryId") REFERENCES "FinanceEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
