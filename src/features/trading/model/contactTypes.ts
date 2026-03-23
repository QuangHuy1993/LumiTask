export type ContactMethod = "ZALO" | "FACEBOOK";
export type ContactStatus = "ACTIVE" | "PAUSED" | "DORMANT";

export type SaleContactListQuery = {
  limit: number;
  search?: string;
  contactMethod?: ContactMethod | "ALL";
  status?: ContactStatus | "ALL";
};

export type SaleContactListItemDTO = {
  id: number;
  name: string;
  contactMethod: ContactMethod;
  identification: string;
  zalo?: string | null;
  facebookUrl?: string | null;
  email?: string | null;
  note?: string | null;
  status: ContactStatus;
};

