-- Dashboard: GROUP BY walletId + range on occurredAt
CREATE INDEX "FinanceEntry_ownerId_deletedAt_walletId_occurredAt_idx" ON "FinanceEntry" ("ownerId", "deletedAt", "walletId", "occurredAt" DESC);
