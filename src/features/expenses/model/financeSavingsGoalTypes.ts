export type SavingsGoalListItemDTO = {
  id: number;
  title: string;
  icon: string | null;
  targetAmount: number;
  currency: string;
  targetDate: string | null;
  savedAmount: number;
  contributionCount: number;
  sortOrder: number;
};

export type ContributionItemDTO = {
  id: number;
  amount: number;
  contributedAt: string;
  note: string | null;
  entryId: number | null;
};

export type SavingsGoalDetailDTO = SavingsGoalListItemDTO & {
  contributions: ContributionItemDTO[];
};
