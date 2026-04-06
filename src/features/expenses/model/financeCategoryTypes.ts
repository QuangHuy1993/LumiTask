export type FinanceCategoryKind = "INCOME" | "EXPENSE";

export type FinanceCategoryListQuery = {
  limit: number;
  search?: string;
  kind?: FinanceCategoryKind | "ALL";
  isActive?: boolean | "ALL";
};

export type FinanceCategoryListItemDTO = {
  id: number;
  kind: FinanceCategoryKind;
  name: string;
  slug: string;
  color: string | null;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
  _count?: { entries: number };
};
