import type { SubscriptionReminderStage } from "@/features/trading/model/subscriptionTypes";

export type ReminderRecipientAudience = "ADMIN" | "BUYER";

export type ReminderPreviewSkipReason =
  | "ALREADY_SENT"
  | "MISSING_RECIPIENTS"
  | "NOT_DUE"
  | "INVALID_STAGE";

export type ReminderPreviewItemDTO = {
  subscriptionId: number;
  title: string;
  categoryName: string;
  renewalOrExpiryAtISO: string;
  nextReminderAtISO: string;
  stage: SubscriptionReminderStage;
  recipients: Array<{ email: string; audience: ReminderRecipientAudience }>;
  canSend: boolean;
  skipReason?: ReminderPreviewSkipReason;
};

export type ReminderPreviewResponseDTO = {
  items: ReminderPreviewItemDTO[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export type ManualReminderSendRequestDTO = {
  selectedSubscriptionIds: number[];
  nowISO?: string;
  windowMinutes?: number;
};

export type ManualReminderSendAcceptedDTO = {
  ok: true;
  jobRunId: number;
  selectedCount: number;
  status: "QUEUED" | "RUNNING";
};

export type ManualReminderJobStatus = "QUEUED" | "RUNNING" | "SUCCESS" | "PARTIAL_SUCCESS" | "FAILED";

export type ManualReminderJobStatusDTO = {
  ok: true;
  jobRunId: number;
  status: ManualReminderJobStatus;
  progressPercent: number;
  totals: {
    selected: number;
    processed: number;
    succeeded: number;
    failed: number;
    skipped: number;
  };
  recentErrors: Array<{
    subscriptionId: number;
    audience?: ReminderRecipientAudience;
    code: string;
    message: string;
  }>;
  startedAtISO: string;
  finishedAtISO?: string;
};

