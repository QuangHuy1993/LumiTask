-- Finance loans CRUD sync with entries + budgets
-- Generated offline (no DB access from this environment).

-- Create loan direction enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FinanceLoanDirection') THEN
    CREATE TYPE "FinanceLoanDirection" AS ENUM ('BORROWED', 'LENT');
  END IF;
END $$;

-- FinanceLoan additions
ALTER TABLE "FinanceLoan"
  ADD COLUMN IF NOT EXISTS "icon" TEXT;

ALTER TABLE "FinanceLoan"
  ADD COLUMN IF NOT EXISTS "loanDirection" "FinanceLoanDirection" NOT NULL DEFAULT 'BORROWED';

ALTER TABLE "FinanceLoan"
  ADD COLUMN IF NOT EXISTS "dueDate" TIMESTAMP(3);

-- FinanceLoanPayment additions
ALTER TABLE "FinanceLoanPayment"
  ADD COLUMN IF NOT EXISTS "principalPaid" NUMERIC(14,2);

ALTER TABLE "FinanceLoanPayment"
  ADD COLUMN IF NOT EXISTS "interestPaid" NUMERIC(14,2);

ALTER TABLE "FinanceLoanPayment"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- Index for soft-delete filtering
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'FinanceLoanPayment'
      AND indexname = 'FinanceLoanPayment_loanId_deletedAt_idx'
  ) THEN
    CREATE INDEX "FinanceLoanPayment_loanId_deletedAt_idx"
      ON "FinanceLoanPayment"("loanId", "deletedAt");
  END IF;
END $$;

