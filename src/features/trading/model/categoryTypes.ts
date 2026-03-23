export type ServiceCategoryListQuery = {
  limit: number;
  search?: string;
  isActive?: boolean | "ALL";
};

export type ServiceCategoryListItemDTO = {
  id: number;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
};

